import {
  type DetectedModel,
  LOCAL_MODEL_SERVER_LIMITS,
  type LocalModelLoadedModel,
  type LocalModelServerKind,
  type LocalModelServerMetric,
  type LocalModelServerReading,
} from "@codebot/contracts/ipc";
import { isDynamicRecord, isNumber, isString } from "@codebot/contracts/runtime-values";
import { sourceText } from "@codebot/i18n/source";
import { Effect, Result } from "effect";
import { parseModelList } from "../model-server-probe";
import { parseGpuStatus } from "./gpu-status";
import { hasPrometheusSeries, parsePrometheusText } from "./prometheus-text";
import { parseJsonRecord, readServer, type ServerCredentials, type ServerReadFailure } from "./server-read";

const JSON_BODY_LIMIT = 1024 * 1024;
const METRICS_BODY_LIMIT = 4 * 1024 * 1024;
const METRICS_ACCEPT = "text/plain, application/json";

export interface MeasureTarget {
  readonly baseUrl: string;
  readonly credentials: ServerCredentials | null;
  readonly gpuStatusUrl: string | null;
  readonly gpuCredentials: ServerCredentials | null;
}

export interface MeasureOptions {
  readonly timeoutMs: number;
  readonly knownKind: LocalModelServerKind | null;
  readonly knownVersion: string | null;
}

export interface Measurement extends LocalModelServerReading {
  readonly online: boolean;
  readonly unauthorized: boolean;
  readonly models: DetectedModel[];
}

interface ServerUrls {
  readonly host: string;
  readonly models: URL;
  readonly root: URL;
}

function serverUrls(baseUrl: string): ServerUrls | null {
  let base: URL;
  try {
    base = new URL(baseUrl);
  } catch {
    return null;
  }
  if (base.protocol !== "http:" && base.protocol !== "https:") return null;
  const path = base.pathname.replace(/\/+$/u, "");
  const models = new URL(base);
  models.pathname = `${path}/models`;
  const root = new URL(base);
  root.pathname = path.replace(/\/v1$/u, "");
  return { host: base.host, models, root };
}

function under(root: URL, path: string): URL {
  const url = new URL(root);
  url.pathname = `${root.pathname.replace(/\/+$/u, "")}${path}`;
  return url;
}

function seconds(timeoutMs: number): number {
  return Math.round(timeoutMs / 100) / 10;
}

function serverFailureText(failure: ServerReadFailure, host: string, timeoutMs: number, keySent: boolean): string {
  switch (failure.reason) {
    case "refused":
      return sourceText("error.localServer.refused", { host });
    case "not-found":
      return sourceText("error.localServer.hostNotFound", { host });
    case "timeout":
      return sourceText("error.localServer.timeout", { host, seconds: seconds(timeoutMs) });
    case "redirect":
      return sourceText("error.localServer.redirect", { host });
    case "unauthorized":
      return keySent
        ? sourceText("error.localServer.keyRefused", { host })
        : sourceText("error.localServer.keyNeeded", { host });
    case "http":
      return sourceText("error.localServer.http", { host, status: failure.status ?? 0 });
    case "invalid":
      return sourceText("error.localServer.invalidAnswer", { host });
    case "too-large":
      return sourceText("error.localServer.tooLarge", { host });
    default:
      return sourceText("error.localServer.unreachable", { host });
  }
}

function gpuFailureText(failure: ServerReadFailure, host: string, timeoutMs: number): string {
  switch (failure.reason) {
    case "timeout":
      return sourceText("error.localServer.gpuTimeout", { host, seconds: seconds(timeoutMs) });
    case "redirect":
      return sourceText("error.localServer.gpuRedirect", { host });
    case "unauthorized":
    case "http":
      return sourceText("error.localServer.gpuHttp", { host, status: failure.status ?? 0 });
    case "invalid":
      return sourceText("error.localServer.gpuInvalid", { host });
    case "too-large":
      return sourceText("error.localServer.gpuTooLarge", { host });
    default:
      return sourceText("error.localServer.gpuUnreachable", { host });
  }
}

function text(value: unknown): string | null {
  if (!isString(value)) return null;
  const trimmed = value.trim().slice(0, LOCAL_MODEL_SERVER_LIMITS.text);
  return trimmed || null;
}

function count(value: unknown): number | null {
  return isNumber(value) && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function modelName(value: unknown): string | null {
  if (!isString(value)) return null;
  const name = value.trim().slice(0, LOCAL_MODEL_SERVER_LIMITS.name);
  return name || null;
}

function time(value: unknown): number | null {
  if (!isString(value)) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function ollamaLoaded(body: string): LocalModelLoadedModel[] | null {
  const record = parseJsonRecord(body);
  if (!record || !Array.isArray(record.models)) return null;
  return record.models
    .flatMap((entry: unknown): LocalModelLoadedModel[] => {
      if (!isDynamicRecord(entry)) return [];
      const name = modelName(entry.name) ?? modelName(entry.model);
      return name
        ? [{ name, sizeBytes: count(entry.size), vramBytes: count(entry.size_vram), expiresAt: time(entry.expires_at) }]
        : [];
    })
    .slice(0, LOCAL_MODEL_SERVER_LIMITS.loadedModels);
}

interface LmStudioModels {
  readonly available: number;
  readonly loaded: LocalModelLoadedModel[];
}

function lmStudioModels(body: string): LmStudioModels | null {
  const record = parseJsonRecord(body);
  if (!record || !Array.isArray(record.data)) return null;
  const entries = record.data.filter(isDynamicRecord);
  if (entries.length > 0 && !entries.some((entry) => isString(entry.state))) return null;
  const loaded = entries.flatMap((entry): LocalModelLoadedModel[] => {
    const name = modelName(entry.id);
    return entry.state === "loaded" && name ? [{ name, sizeBytes: null, vramBytes: null, expiresAt: null }] : [];
  });
  return { available: entries.length, loaded: loaded.slice(0, LOCAL_MODEL_SERVER_LIMITS.loadedModels) };
}

const VLLM_SERIES = {
  kvCacheUsage: ["vllm:kv_cache_usage_perc", "vllm:gpu_cache_usage_perc"],
  requestsRunning: ["vllm:num_requests_running"],
  requestsWaiting: ["vllm:num_requests_waiting"],
} as const;

function vllmMetrics(body: string): LocalModelServerMetric[] {
  const wanted: ReadonlySet<string> = new Set(Object.values(VLLM_SERIES).flat());
  const samples = parsePrometheusText(body, (name) => wanted.has(name));
  const metrics: LocalModelServerMetric[] = [];
  for (const id of ["kvCacheUsage", "requestsRunning", "requestsWaiting"] as const) {
    const source = VLLM_SERIES[id].find((name) => samples.some((sample) => sample.name === name));
    if (!source) continue;
    const values = samples.filter((sample) => sample.name === source).map((sample) => sample.value);
    const value =
      id === "kvCacheUsage"
        ? Math.round(Math.min(1, Math.max(0, Math.max(...values))) * 1000) / 10
        : values.reduce((sum, entry) => sum + Math.max(0, entry), 0);
    metrics.push({ id, source, value });
  }
  return metrics;
}

function versionOf(body: string): string | null {
  return text(parseJsonRecord(body)?.version);
}

interface KindReading {
  readonly kind: LocalModelServerKind;
  readonly version: string | null;
  readonly loadedModels: LocalModelLoadedModel[] | null;
  readonly availableModels: number | null;
  readonly modelMemoryBytes: number | null;
  readonly metrics: LocalModelServerMetric[];
}

const GENERIC: KindReading = {
  kind: "openai",
  version: null,
  loadedModels: null,
  availableModels: null,
  modelMemoryBytes: null,
  metrics: [],
};

function servedModels(models: readonly DetectedModel[]): LocalModelLoadedModel[] {
  return models
    .slice(0, LOCAL_MODEL_SERVER_LIMITS.loadedModels)
    .map((model) => ({ name: model.id, sizeBytes: null, vramBytes: null, expiresAt: null }));
}

function memoryOf(loaded: readonly LocalModelLoadedModel[] | null): number | null {
  const sizes = (loaded ?? []).flatMap((model) => (model.vramBytes === null ? [] : [model.vramBytes]));
  return sizes.length > 0 ? sizes.reduce((sum, size) => sum + size, 0) : null;
}

type ServerReading = Omit<Measurement, "gpus" | "gpuFormat" | "gpuError">;

const measureModels = Effect.fn("LocalModelServers.measureModels")(function* (
  target: MeasureTarget,
  options: MeasureOptions,
) {
  const urls = serverUrls(target.baseUrl);
  const offline = (error: string, unauthorized = false): ServerReading => ({
    online: false,
    unauthorized,
    models: [],
    kind: options.knownKind,
    version: options.knownVersion,
    error,
    responseMs: null,
    availableModels: null,
    loadedModels: null,
    modelMemoryBytes: null,
    metrics: [],
  });
  if (!urls) return offline(sourceText("error.localServer.unreachable", { host: target.baseUrl }));
  const read = (url: URL, bodyLimit = JSON_BODY_LIMIT, accept?: string) =>
    Effect.result(
      readServer({
        url,
        credentials: target.credentials,
        timeoutMs: options.timeoutMs,
        bodyLimit,
        ...(accept ? { accept } : {}),
      }),
    );
  const keySent = target.credentials !== null && target.credentials.origin === urls.models.origin;
  const main = yield* read(urls.models);
  if (Result.isFailure(main)) {
    return offline(
      serverFailureText(main.failure, urls.host, options.timeoutMs, keySent),
      main.failure.reason === "unauthorized",
    );
  }
  const list = parseJsonRecord(main.success.body);
  if (!list || !Array.isArray(list.data))
    return offline(sourceText("error.localServer.invalidAnswer", { host: urls.host }));
  const models = parseModelList(list.data);

  const ollama = Effect.fn("LocalModelServers.ollama")(function* (version: string | null) {
    const running = yield* read(under(urls.root, "/api/ps"));
    const loaded = Result.isSuccess(running) ? ollamaLoaded(running.success.body) : null;
    if (loaded === null) return null;
    const reading: KindReading = {
      kind: "ollama",
      version,
      loadedModels: loaded,
      availableModels: models.length,
      modelMemoryBytes: memoryOf(loaded),
      metrics: [],
    };
    return reading;
  });
  const lmStudio = Effect.fn("LocalModelServers.lmStudio")(function* () {
    const native = yield* read(under(urls.root, "/api/v0/models"));
    const listed = Result.isSuccess(native) ? lmStudioModels(native.success.body) : null;
    if (listed === null) return null;
    const reading: KindReading = {
      kind: "lmstudio",
      version: null,
      loadedModels: listed.loaded,
      availableModels: listed.available,
      modelMemoryBytes: null,
      metrics: [],
    };
    return reading;
  });
  const vllm = Effect.fn("LocalModelServers.vllm")(function* (version: string | null) {
    const exported = yield* read(under(urls.root, "/metrics"), METRICS_BODY_LIMIT, METRICS_ACCEPT);
    if (Result.isFailure(exported) || !hasPrometheusSeries(exported.success.body, "vllm:")) return null;
    const reading: KindReading = {
      kind: "vllm",
      version,
      loadedModels: servedModels(models),
      availableModels: models.length,
      modelMemoryBytes: null,
      metrics: vllmMetrics(exported.success.body),
    };
    return reading;
  });
  const detect = Effect.fn("LocalModelServers.detect")(function* () {
    const [ollamaVersion, ollamaTags, lmStudioReading, vllmVersion] = yield* Effect.all(
      [
        read(under(urls.root, "/api/version")),
        read(under(urls.root, "/api/tags")),
        lmStudio(),
        read(under(urls.root, "/version")),
      ],
      { concurrency: "unbounded" },
    );
    const isOllama =
      (Result.isSuccess(ollamaVersion) && versionOf(ollamaVersion.success.body) !== null) ||
      (Result.isSuccess(ollamaTags) && Array.isArray(parseJsonRecord(ollamaTags.success.body)?.models));
    if (isOllama) {
      const version = Result.isSuccess(ollamaVersion) ? versionOf(ollamaVersion.success.body) : null;
      const reading: KindReading = (yield* ollama(version)) ?? {
        ...GENERIC,
        kind: "ollama",
        version,
        availableModels: models.length,
      };
      return reading;
    }
    if (lmStudioReading) return lmStudioReading;
    const served = yield* vllm(Result.isSuccess(vllmVersion) ? versionOf(vllmVersion.success.body) : null);
    const reading: KindReading = served ?? { ...GENERIC, availableModels: models.length };
    return reading;
  });
  const known = Effect.fn("LocalModelServers.known")(function* (kind: LocalModelServerKind) {
    if (kind === "ollama") return yield* ollama(options.knownVersion);
    if (kind === "lmstudio") return yield* lmStudio();
    if (kind === "vllm") return yield* vllm(options.knownVersion);
    const reading: KindReading = { ...GENERIC, availableModels: models.length };
    return reading;
  });

  const reading = (options.knownKind ? yield* known(options.knownKind) : null) ?? (yield* detect());
  const measured: ServerReading = {
    online: true,
    unauthorized: false,
    models,
    kind: reading.kind,
    version: reading.version,
    error: null,
    responseMs: main.success.ms,
    availableModels: reading.availableModels,
    loadedModels: reading.loadedModels,
    modelMemoryBytes: reading.modelMemoryBytes,
    metrics: reading.metrics,
  };
  return measured;
});

export const measureServer = Effect.fn("LocalModelServers.measure")(function* (
  target: MeasureTarget,
  options: MeasureOptions,
) {
  const [server, gpu] = yield* Effect.all([measureModels(target, options), readGpuStatus(target, options.timeoutMs)], {
    concurrency: "unbounded",
  });
  const measurement: Measurement = { ...server, ...gpu };
  return measurement;
});

export function recognizeServerKind(baseUrl: string, timeoutMs: number): Effect.Effect<LocalModelServerKind | null> {
  return measureModels(
    { baseUrl, credentials: null, gpuStatusUrl: null, gpuCredentials: null },
    { timeoutMs, knownKind: null, knownVersion: null },
  ).pipe(Effect.map((reading) => (reading.online ? reading.kind : null)));
}

type GpuReading = Pick<LocalModelServerReading, "gpus" | "gpuFormat" | "gpuError">;

const NO_GPU: GpuReading = { gpus: null, gpuFormat: null, gpuError: null };

const readGpuStatus = Effect.fn("LocalModelServers.gpuStatus")(function* (target: MeasureTarget, timeoutMs: number) {
  if (!target.gpuStatusUrl) return NO_GPU;
  let url: URL;
  try {
    url = new URL(target.gpuStatusUrl);
  } catch {
    return { ...NO_GPU, gpuError: sourceText("error.localServer.gpuUrlInvalid") };
  }
  const answer = yield* Effect.result(
    readServer({
      url,
      credentials: target.gpuCredentials,
      timeoutMs,
      bodyLimit: METRICS_BODY_LIMIT,
      accept: METRICS_ACCEPT,
    }),
  );
  if (Result.isFailure(answer)) return { ...NO_GPU, gpuError: gpuFailureText(answer.failure, url.host, timeoutMs) };
  const parsed = parseGpuStatus(answer.success.body);
  if (!parsed) return { ...NO_GPU, gpuError: sourceText("error.localServer.gpuInvalid", { host: url.host }) };
  const reading: GpuReading = { gpus: parsed.gpus, gpuFormat: parsed.format, gpuError: null };
  return reading;
});
