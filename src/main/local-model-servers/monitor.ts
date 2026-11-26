import { INPUT_LIMITS } from "@codebot/contracts/input-limits";
import {
  customProviderEndpointKey,
  type DetectedModel,
  gpuStatusKeyAllowed,
  LOCAL_MODEL_SERVER_LIMITS,
  LOCAL_MODEL_SERVER_PORTS,
  LOCAL_MODEL_SERVER_PRODUCT_NAMES,
  type LocalModelServerCandidate,
  type LocalModelServerKind,
  type LocalModelServerReading,
  type LocalModelServerSettings,
  type LocalModelServerStatus,
  type LocalModelServerTestInput,
  type LocalModelServerTestResult,
  localModelServerDisplayUrl,
  localModelServerMonitored,
  sameCustomProviderOrigin,
} from "@codebot/contracts/ipc";
import { sourceText } from "@codebot/i18n/source";
import { Effect, Exit, Fiber, Schema, Scope } from "effect";
import type { LocalModelServerEntry } from "../custom-provider-store";
import type { ModelReleaseCatalog } from "../model-visibility";
import { suggestServerId } from "../provider-detection";
import { type Measurement, type MeasureTarget, measureServer } from "./server-measure";
import { serverCredentials } from "./server-read";

export class LocalModelServerFailure extends Schema.TaggedError<LocalModelServerFailure>()("LocalModelServerFailure", {
  cause: Schema.Defect(),
}) {}

export interface MonitorTiming {
  readonly visibleMs: number;
  readonly hiddenMs: number;
  readonly requestTimeoutMs: number;
  readonly testTimeoutMs: number;
  readonly scanTimeoutMs: number;
  readonly backoffLimit: number;
}

export const DEFAULT_MONITOR_TIMING: MonitorTiming = {
  visibleMs: 10_000,
  hiddenMs: 60_000,
  requestTimeoutMs: 3_000,
  testTimeoutMs: 8_000,
  scanTimeoutMs: 1_500,
  backoffLimit: 6,
};

export type MonitorSchedule = (run: () => void, delayMs: number) => () => void;
export type MonitorVisibility = "visible" | "hidden";

export interface LocalModelServerMonitorOptions {
  readonly entries: () => readonly LocalModelServerEntry[];
  readonly catalog?: ModelReleaseCatalog | undefined;
  readonly timing?: Partial<MonitorTiming> | undefined;
  readonly now?: (() => number) | undefined;
  readonly schedule?: MonitorSchedule | undefined;
}

export interface MonitorSubscription {
  setVisibility(visibility: MonitorVisibility): void;
  close(): void;
}

interface Subscriber {
  readonly listener: (statuses: LocalModelServerStatus[]) => void;
  visibility: MonitorVisibility;
}

interface EntryState {
  readonly fingerprint: string;
  kind: LocalModelServerKind | null;
  version: string | null;
  kindConfirmed: boolean;
  reading: LocalModelServerReading | null;
  online: boolean | null;
  checkedAt: number | null;
  lastOnlineAt: number | null;
  failures: number;
}

const POLL_CONCURRENCY = 8;

const NO_READING: LocalModelServerReading = {
  kind: null,
  version: null,
  error: null,
  responseMs: null,
  availableModels: null,
  loadedModels: null,
  gpus: null,
  gpuFormat: null,
  gpuError: null,
  modelMemoryBytes: null,
  metrics: [],
};

const timerSchedule: MonitorSchedule = (run, delayMs) => {
  const timer = setTimeout(run, delayMs);
  timer.unref?.();
  return () => clearTimeout(timer);
};

function fingerprintOf(entry: LocalModelServerEntry): string {
  return JSON.stringify([
    entry.baseUrl,
    entry.settings.gpuStatusUrl ?? null,
    entry.settings.gpuStatusUsesKey === true,
    entry.apiKey !== null,
  ]);
}

function targetOf(
  baseUrl: string,
  apiKey: string | null,
  headers: LocalModelServerEntry["headers"],
  settings: LocalModelServerSettings,
): MeasureTarget {
  const credentials = serverCredentials(baseUrl, apiKey, headers);
  return {
    baseUrl,
    credentials,
    gpuStatusUrl: settings.gpuStatusUrl ?? null,
    gpuCredentials: gpuStatusKeyAllowed(settings, baseUrl) ? credentials : null,
  };
}

function readingOf(measurement: Measurement): LocalModelServerReading {
  return {
    kind: measurement.kind,
    version: measurement.version,
    error: measurement.error,
    responseMs: measurement.responseMs,
    availableModels: measurement.availableModels,
    loadedModels: measurement.loadedModels,
    gpus: measurement.gpus,
    gpuFormat: measurement.gpuFormat,
    gpuError: measurement.gpuError,
    modelMemoryBytes: measurement.modelMemoryBytes,
    metrics: measurement.metrics,
  };
}

export function hostScanTargets(input: string): string[] | null {
  const typed = input.trim();
  if (!typed || typed.length > LOCAL_MODEL_SERVER_LIMITS.host || /\s/u.test(typed)) return null;
  const explicitScheme = /^[a-z][a-z0-9+.-]*:\/\//iu.test(typed);
  let url: URL;
  try {
    url = new URL(explicitScheme ? typed : `http://${typed}`);
  } catch {
    return null;
  }
  if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password || !url.hostname)
    return null;
  const path = url.pathname.replace(/\/+$/u, "");
  const targets: string[] = [];
  const keys = new Set<string>();
  const add = (baseUrl: string) => {
    const key = customProviderEndpointKey(baseUrl);
    if (!key || keys.has(key)) return;
    keys.add(key);
    targets.push(baseUrl);
  };
  if (url.port || path || url.protocol === "https:") add(`${url.protocol}//${url.host}${path || "/v1"}`);
  for (const port of Object.values(LOCAL_MODEL_SERVER_PORTS)) add(`${url.protocol}//${url.hostname}:${port}/v1`);
  return targets.slice(0, LOCAL_MODEL_SERVER_LIMITS.candidates);
}

function candidateName(kind: LocalModelServerKind | null, baseUrl: string): string {
  const url = new URL(baseUrl);
  const product = kind ? LOCAL_MODEL_SERVER_PRODUCT_NAMES[kind] : undefined;
  return (product ? `${product} (${url.hostname})` : url.host).slice(0, INPUT_LIMITS.agentName);
}

export class LocalModelServerMonitor {
  readonly #entries: () => readonly LocalModelServerEntry[];
  readonly #catalog: ModelReleaseCatalog | undefined;
  readonly #timing: MonitorTiming;
  readonly #now: () => number;
  readonly #schedule: MonitorSchedule;
  readonly #scope = Scope.makeUnsafe();
  readonly #states = new Map<string, EntryState>();
  readonly #polls = new Map<string, Fiber.Fiber<void>>();
  readonly #subscribers = new Map<symbol, Subscriber>();
  readonly #stop = new AbortController();
  #cancelTimer: (() => void) | null = null;
  #tickFiber: Fiber.Fiber<void> | null = null;
  #ticking = false;
  #closed = false;

  constructor(options: LocalModelServerMonitorOptions) {
    this.#entries = options.entries;
    this.#catalog = options.catalog;
    this.#timing = { ...DEFAULT_MONITOR_TIMING, ...options.timing };
    this.#now = options.now ?? Date.now;
    this.#schedule = options.schedule ?? timerSchedule;
  }

  statuses(): LocalModelServerStatus[] {
    const entries = this.#entries();
    this.#forgetRemoved(entries);
    return entries.slice(0, LOCAL_MODEL_SERVER_LIMITS.servers).map((entry) => this.#status(entry));
  }

  subscribe(
    listener: (statuses: LocalModelServerStatus[]) => void,
    visibility: MonitorVisibility = "visible",
  ): MonitorSubscription {
    const key = Symbol("local-model-server-subscriber");
    const subscriber: Subscriber = { listener, visibility };
    this.#subscribers.set(key, subscriber);
    this.#arm();
    return {
      setVisibility: (next) => {
        if (subscriber.visibility === next || !this.#subscribers.has(key)) return;
        subscriber.visibility = next;
        this.#arm();
      },
      close: () => {
        if (this.#subscribers.delete(key)) this.#arm();
      },
    };
  }

  subscriberCount(): number {
    return this.#subscribers.size;
  }

  timerArmed(): boolean {
    return this.#cancelTimer !== null;
  }

  readonly refresh = Effect.fn("LocalModelServerMonitor.refresh")(function* (
    this: LocalModelServerMonitor,
    id: string | null,
  ) {
    const targets = this.#monitored().filter((entry) => id === null || entry.id === id);
    for (const entry of targets) this.#stateOf(entry).failures = 0;
    yield* Effect.forEach(targets, (entry) => this.#poll(entry), { concurrency: POLL_CONCURRENCY, discard: true });
    this.#arm();
    return this.statuses();
  });

  readonly settled = Effect.fn("LocalModelServerMonitor.settled")(function* (this: LocalModelServerMonitor) {
    for (;;) {
      const tick = this.#tickFiber;
      if (tick) {
        yield* Fiber.await(tick);
        continue;
      }
      if (this.#polls.size === 0) return;
      yield* Fiber.awaitAll([...this.#polls.values()]);
    }
  });

  readonly test = Effect.fn("LocalModelServerMonitor.test")(function* (
    this: LocalModelServerMonitor,
    input: LocalModelServerTestInput,
  ) {
    const entries = this.#entries();
    const saved = input.savedProviderId ? entries.find((entry) => entry.id === input.savedProviderId) : undefined;
    const kept = saved && sameCustomProviderOrigin(saved.baseUrl, input.baseUrl) ? saved : undefined;
    const settings: LocalModelServerSettings = {
      ...(input.gpuStatusUrl ? { gpuStatusUrl: input.gpuStatusUrl } : {}),
      ...(input.gpuStatusUsesKey ? { gpuStatusUsesKey: true } : {}),
    };
    const target = targetOf(input.baseUrl, input.apiKey ?? kept?.apiKey ?? null, kept?.headers ?? [], settings);
    const measurement = yield* measureServer(target, {
      timeoutMs: this.#timing.testTimeoutMs,
      knownKind: null,
      knownVersion: null,
    });
    const taken = new Set(entries.map((entry) => entry.id));
    const product = measurement.kind ? LOCAL_MODEL_SERVER_PRODUCT_NAMES[measurement.kind] : undefined;
    const result: LocalModelServerTestResult = {
      ...readingOf(measurement),
      online: measurement.online,
      models: yield* this.#withLimits(measurement.models),
      suggestedId: suggestServerId(input.name || product || new URL(input.baseUrl).hostname, taken),
    };
    return result;
  });

  readonly scanHost = Effect.fn("LocalModelServerMonitor.scanHost")(function* (
    this: LocalModelServerMonitor,
    host: string,
  ) {
    const targets = hostScanTargets(host);
    if (!targets)
      return yield* new LocalModelServerFailure({ cause: new Error(sourceText("error.localServer.scanHostInvalid")) });
    const measured = yield* Effect.forEach(
      targets,
      (baseUrl) =>
        measureServer(
          { baseUrl, credentials: null, gpuStatusUrl: null, gpuCredentials: null },
          { timeoutMs: this.#timing.scanTimeoutMs, knownKind: null, knownVersion: null },
        ).pipe(Effect.map((measurement) => ({ baseUrl, measurement }))),
      { concurrency: "unbounded" },
    );
    const taken = new Set(this.#entries().map((entry) => entry.id));
    const candidates: LocalModelServerCandidate[] = [];
    for (const { baseUrl, measurement } of measured) {
      if (!measurement.online && !measurement.unauthorized) continue;
      const kind = measurement.online ? measurement.kind : null;
      const id = suggestServerId(`${kind ?? "server"}-${new URL(baseUrl).hostname}`, taken);
      taken.add(id);
      candidates.push({
        id,
        name: candidateName(kind, baseUrl),
        baseUrl,
        kind,
        version: measurement.online ? measurement.version : null,
        needsKey: measurement.unauthorized,
        responseMs: measurement.responseMs,
        models: yield* this.#withLimits(measurement.models),
      });
    }
    return candidates;
  });

  readonly close = Effect.fn("LocalModelServerMonitor.close")(function* (this: LocalModelServerMonitor) {
    if (this.#closed) return;
    this.#closed = true;
    this.#disarm();
    this.#subscribers.clear();
    this.#stop.abort();
    yield* Scope.close(this.#scope, Exit.void);
  });

  readonly #withLimits = Effect.fn("LocalModelServerMonitor.withLimits")(function* (
    this: LocalModelServerMonitor,
    models: readonly DetectedModel[],
  ) {
    if (!this.#catalog || models.length === 0) return [...models];
    const lookup = yield* this.#catalog.lookup();
    return models.map((model) =>
      model.contextWindow === undefined ? { ...model, ...lookup.limits(model.id) } : model,
    );
  });

  readonly #poll = Effect.fn("LocalModelServerMonitor.poll")(function* (
    this: LocalModelServerMonitor,
    entry: LocalModelServerEntry,
  ) {
    this.#stateOf(entry);
    const running = this.#polls.get(entry.id);
    if (running) {
      yield* Fiber.await(running);
      return;
    }
    const fiber = yield* Effect.forkIn(this.#measure(entry), this.#scope, { startImmediately: true });
    this.#polls.set(entry.id, fiber);
    fiber.addObserver(() => {
      if (this.#polls.get(entry.id) === fiber) this.#polls.delete(entry.id);
    });
    yield* Fiber.await(fiber);
  });

  readonly #measure = Effect.fn("LocalModelServerMonitor.measure")(function* (
    this: LocalModelServerMonitor,
    entry: LocalModelServerEntry,
  ) {
    const state = this.#stateOf(entry);
    const measurement = yield* measureServer(targetOf(entry.baseUrl, entry.apiKey, entry.headers, entry.settings), {
      timeoutMs: this.#timing.requestTimeoutMs,
      knownKind: state.kindConfirmed ? state.kind : null,
      knownVersion: state.kindConfirmed ? state.version : null,
    });
    if (this.#closed || this.#states.get(entry.id) !== state) return;
    const now = this.#now();
    state.checkedAt = now;
    state.online = measurement.online;
    if (measurement.online) {
      state.lastOnlineAt = now;
      state.failures = 0;
      state.kind = measurement.kind;
      state.version = measurement.version;
      state.kindConfirmed = true;
    } else {
      state.failures += 1;
      state.kindConfirmed = false;
    }
    state.reading = { ...readingOf(measurement), kind: state.kind, version: state.version };
    this.#emit();
  });

  readonly #tick = Effect.fn("LocalModelServerMonitor.tick")(function* (this: LocalModelServerMonitor) {
    const visibility = this.#visibility();
    if (visibility === null) return;
    const now = this.#now();
    const due = this.#monitored().filter((entry) => this.#dueAt(entry, visibility, now) <= now);
    yield* Effect.forEach(due, (entry) => this.#poll(entry), { concurrency: POLL_CONCURRENCY, discard: true });
  });

  #runTick(): void {
    if (this.#closed || this.#ticking) return;
    this.#ticking = true;
    const fiber = Effect.runFork(
      this.#tick().pipe(
        Effect.ignoreCause,
        Effect.ensuring(
          Effect.sync(() => {
            this.#ticking = false;
            this.#arm();
          }),
        ),
      ),
      { signal: this.#stop.signal },
    );
    this.#tickFiber = fiber;
    fiber.addObserver(() => {
      if (this.#tickFiber === fiber) this.#tickFiber = null;
    });
  }

  #arm(): void {
    this.#disarm();
    if (this.#closed || this.#ticking) return;
    const visibility = this.#visibility();
    if (visibility === null) return;
    const monitored = this.#monitored();
    if (monitored.length === 0) return;
    const now = this.#now();
    const next = Math.min(...monitored.map((entry) => this.#dueAt(entry, visibility, now)));
    this.#cancelTimer = this.#schedule(
      () => {
        this.#cancelTimer = null;
        this.#runTick();
      },
      Math.max(0, next - now),
    );
  }

  #disarm(): void {
    this.#cancelTimer?.();
    this.#cancelTimer = null;
  }

  #visibility(): MonitorVisibility | null {
    if (this.#subscribers.size === 0) return null;
    for (const subscriber of this.#subscribers.values()) if (subscriber.visibility === "visible") return "visible";
    return "hidden";
  }

  #dueAt(entry: LocalModelServerEntry, visibility: MonitorVisibility, now: number): number {
    const state = this.#stateOf(entry);
    if (state.checkedAt === null) return now;
    const interval = visibility === "visible" ? this.#timing.visibleMs : this.#timing.hiddenMs;
    const factor = Math.min(this.#timing.backoffLimit, 2 ** Math.max(0, state.failures - 1));
    return state.checkedAt + interval * factor;
  }

  #monitored(): LocalModelServerEntry[] {
    const entries = this.#entries();
    this.#forgetRemoved(entries);
    return entries
      .slice(0, LOCAL_MODEL_SERVER_LIMITS.servers)
      .filter((entry) => localModelServerMonitored(entry.settings, entry.baseUrl));
  }

  #forgetRemoved(entries: readonly LocalModelServerEntry[]): void {
    if (this.#states.size === 0) return;
    const ids = new Set(entries.map((entry) => entry.id));
    for (const id of this.#states.keys()) {
      if (ids.has(id)) continue;
      this.#states.delete(id);
      this.#polls.delete(id);
    }
  }

  #stateOf(entry: LocalModelServerEntry): EntryState {
    const fingerprint = fingerprintOf(entry);
    const current = this.#states.get(entry.id);
    if (current?.fingerprint === fingerprint) return current;
    const state: EntryState = {
      fingerprint,
      kind: null,
      version: null,
      kindConfirmed: false,
      reading: null,
      online: null,
      checkedAt: null,
      lastOnlineAt: null,
      failures: 0,
    };
    this.#states.set(entry.id, state);
    this.#polls.delete(entry.id);
    return state;
  }

  #status(entry: LocalModelServerEntry): LocalModelServerStatus {
    const monitored = localModelServerMonitored(entry.settings, entry.baseUrl);
    const state = monitored ? this.#stateOf(entry) : null;
    return {
      ...(state?.reading ?? NO_READING),
      id: entry.id,
      name: entry.name,
      baseUrl: localModelServerDisplayUrl(entry.baseUrl),
      hasApiKey: entry.apiKey !== null,
      monitored,
      settings: { ...entry.settings },
      state: !state ? "off" : state.online === null ? "unknown" : state.online ? "online" : "offline",
      checkedAt: state?.checkedAt ?? null,
      lastOnlineAt: state?.lastOnlineAt ?? null,
    };
  }

  #emit(): void {
    if (this.#subscribers.size === 0) return;
    const statuses = this.statuses();
    for (const subscriber of [...this.#subscribers.values()]) {
      try {
        subscriber.listener(statuses);
      } catch {}
    }
  }
}
