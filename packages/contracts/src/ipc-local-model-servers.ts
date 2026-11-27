import { INPUT_LIMITS } from "./input-limits";
import { integerInRange, isBoundedString, isFiniteNumber, isNullableBoundedString } from "./ipc-bounded-values";
import { CUSTOM_PROVIDER_LIMITS, isCustomProviderId, isNewCustomProviderId } from "./ipc-custom-providers";
import { type DetectedModel, isDiscoverModelsResult, sameCustomProviderOrigin } from "./ipc-provider-detection";
import { isBoolean, isDynamicRecord, isOneOf } from "./runtime-values";

export const LOCAL_MODEL_SERVERS_CAPABILITY = "local-model-servers-v1";

export const LOCAL_MODEL_SERVER_KINDS = ["ollama", "lmstudio", "vllm", "openai"] as const;
export type LocalModelServerKind = (typeof LOCAL_MODEL_SERVER_KINDS)[number];

export const LOCAL_MODEL_SERVER_PRODUCT_NAMES: Readonly<Partial<Record<LocalModelServerKind, string>>> = {
  ollama: "Ollama",
  lmstudio: "LM Studio",
  vllm: "vLLM",
};

export const LOCAL_MODEL_SERVER_PORTS = { ollama: 11_434, lmstudio: 1_234, vllm: 8_000 } as const satisfies Partial<
  Record<LocalModelServerKind, number>
>;

export const LOCAL_MODEL_SERVER_STATES = ["online", "offline", "unknown", "off"] as const;
export type LocalModelServerState = (typeof LOCAL_MODEL_SERVER_STATES)[number];

export const LOCAL_MODEL_GPU_FORMATS = ["json", "nvidia-smi", "dcgm"] as const;
export type LocalModelGpuFormat = (typeof LOCAL_MODEL_GPU_FORMATS)[number];

export const LOCAL_MODEL_SERVER_METRIC_IDS = ["kvCacheUsage", "requestsRunning", "requestsWaiting"] as const;
export type LocalModelServerMetricId = (typeof LOCAL_MODEL_SERVER_METRIC_IDS)[number];

export const LOCAL_MODEL_SERVER_WATCH_MODES = ["visible", "hidden", "off"] as const;
export type LocalModelServerWatchMode = (typeof LOCAL_MODEL_SERVER_WATCH_MODES)[number];

export const LOCAL_MODEL_SERVER_LIMITS = {
  servers: 256,
  gpus: 32,
  loadedModels: 64,
  metrics: 8,
  text: 400,
  name: 160,
  host: 255,
  candidates: 8,
  watches: 16,
} as const;

export interface LocalModelServerSettings {
  monitored?: boolean;
  gpuStatusUrl?: string;
  gpuStatusUsesKey?: boolean;
}

export interface LocalModelServerGpu {
  index: number;
  name: string | null;
  utilizationPercent: number | null;
  memoryUsedBytes: number | null;
  memoryTotalBytes: number | null;
}

export interface LocalModelLoadedModel {
  name: string;
  sizeBytes: number | null;
  vramBytes: number | null;
  expiresAt: number | null;
}

export interface LocalModelServerMetric {
  id: LocalModelServerMetricId;
  source: string;
  value: number;
}

export interface LocalModelServerReading {
  kind: LocalModelServerKind | null;
  version: string | null;
  error: string | null;
  responseMs: number | null;
  availableModels: number | null;
  loadedModels: LocalModelLoadedModel[] | null;
  gpus: LocalModelServerGpu[] | null;
  gpuFormat: LocalModelGpuFormat | null;
  gpuError: string | null;
  modelMemoryBytes: number | null;
  metrics: LocalModelServerMetric[];
}

export interface LocalModelServerStatus extends LocalModelServerReading {
  id: string;
  name: string;
  baseUrl: string;
  hasApiKey: boolean;
  monitored: boolean;
  settings: LocalModelServerSettings;
  state: LocalModelServerState;
  checkedAt: number | null;
  lastOnlineAt: number | null;
}

export interface ScopedLocalModelServerStatus {
  serverId: string;
  statuses: LocalModelServerStatus[];
}

export interface LocalModelServerWatchInput {
  watchId: string;
  mode: LocalModelServerWatchMode;
}

export interface LocalModelServerRefreshInput {
  id: string | null;
}

export interface LocalModelServerTestInput {
  name: string;
  baseUrl: string;
  apiKey: string | null;
  savedProviderId?: string;
  gpuStatusUrl: string | null;
  gpuStatusUsesKey: boolean;
}

export interface LocalModelServerTestResult extends LocalModelServerReading {
  online: boolean;
  models: DetectedModel[];
  suggestedId: string;
}

export interface LocalModelServerScanInput {
  host: string;
}

export interface LocalModelServerCandidate {
  id: string;
  name: string;
  baseUrl: string;
  kind: LocalModelServerKind | null;
  version: string | null;
  needsKey: boolean;
  responseMs: number | null;
  models: DetectedModel[];
}

export interface SaveLocalModelServerSettingsInput {
  id: string;
  settings: LocalModelServerSettings;
}

const LOCAL_NAME_SUFFIXES = [
  ".local",
  ".lan",
  ".home",
  ".internal",
  ".home.arpa",
  ".localdomain",
  ".localhost",
  ".ts.net",
] as const;

function parseHttpUrl(value: string): URL | null {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function localIpv4(host: string): boolean | null {
  const parts = host.split(".");
  if (parts.length !== 4 || !parts.every((part) => /^\d{1,3}$/u.test(part))) return null;
  const [first = 0, second = 0] = parts.map(Number);
  return (
    first === 127 ||
    first === 10 ||
    first === 0 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 169 && second === 254) ||
    (first === 100 && second >= 64 && second <= 127)
  );
}

function localIpv6(address: string): boolean {
  return address === "::1" || /^f[cd]/u.test(address) || /^fe[89ab]/u.test(address);
}

export function isLocalNetworkAddress(baseUrl: string): boolean {
  const url = parseHttpUrl(baseUrl);
  if (!url) return false;
  const host = url.hostname.toLowerCase();
  if (host.startsWith("[")) return localIpv6(host.slice(1, -1));
  const ipv4 = localIpv4(host);
  if (ipv4 !== null) return ipv4;
  return !host.includes(".") || LOCAL_NAME_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

export function localModelServerMonitored(settings: LocalModelServerSettings, baseUrl: string): boolean {
  return settings.monitored ?? isLocalNetworkAddress(baseUrl);
}

export function isGpuStatusUrl(value: unknown): value is string {
  if (!isBoundedString(value, CUSTOM_PROVIDER_LIMITS.baseUrl)) return false;
  const url = parseHttpUrl(value);
  return url !== null && !url.username && !url.password;
}

export function gpuStatusKeyAllowed(settings: LocalModelServerSettings, baseUrl: string): boolean {
  return (
    settings.gpuStatusUsesKey === true &&
    settings.gpuStatusUrl !== undefined &&
    sameCustomProviderOrigin(settings.gpuStatusUrl, baseUrl)
  );
}

export function localModelServerDisplayUrl(value: string): string {
  const url = parseHttpUrl(value);
  if (!url) return value;
  return `${url.origin}${url.pathname.replace(/\/+$/u, "")}`;
}

export function isLocalModelServerSettings(value: unknown): value is LocalModelServerSettings {
  return (
    isDynamicRecord(value) &&
    (value.monitored === undefined || isBoolean(value.monitored)) &&
    (value.gpuStatusUrl === undefined || isGpuStatusUrl(value.gpuStatusUrl)) &&
    (value.gpuStatusUsesKey === undefined || isBoolean(value.gpuStatusUsesKey))
  );
}

function isNullableCount(value: unknown): value is number | null {
  return value === null || (isFiniteNumber(value) && Number.isSafeInteger(value) && value >= 0);
}

function isNullableText(value: unknown): value is string | null {
  return isNullableBoundedString(value, LOCAL_MODEL_SERVER_LIMITS.text);
}

function isLocalModelServerGpu(value: unknown): value is LocalModelServerGpu {
  return (
    isDynamicRecord(value) &&
    integerInRange(value.index, 0, 4_096) &&
    isNullableBoundedString(value.name, LOCAL_MODEL_SERVER_LIMITS.name) &&
    (value.utilizationPercent === null ||
      (isFiniteNumber(value.utilizationPercent) && value.utilizationPercent >= 0 && value.utilizationPercent <= 100)) &&
    isNullableCount(value.memoryUsedBytes) &&
    isNullableCount(value.memoryTotalBytes)
  );
}

function isLocalModelLoadedModel(value: unknown): value is LocalModelLoadedModel {
  return (
    isDynamicRecord(value) &&
    isBoundedString(value.name, LOCAL_MODEL_SERVER_LIMITS.name) &&
    value.name.length > 0 &&
    isNullableCount(value.sizeBytes) &&
    isNullableCount(value.vramBytes) &&
    (value.expiresAt === null || isFiniteNumber(value.expiresAt))
  );
}

function isLocalModelServerMetric(value: unknown): value is LocalModelServerMetric {
  return (
    isDynamicRecord(value) &&
    isOneOf(LOCAL_MODEL_SERVER_METRIC_IDS, value.id) &&
    isBoundedString(value.source, LOCAL_MODEL_SERVER_LIMITS.name) &&
    isFiniteNumber(value.value) &&
    value.value >= 0
  );
}

function isBoundedList<T>(value: unknown, limit: number, check: (entry: unknown) => entry is T): value is T[] {
  return Array.isArray(value) && value.length <= limit && value.every(check);
}

function isLocalModelServerReading(value: unknown): value is LocalModelServerReading {
  return (
    isDynamicRecord(value) &&
    (value.kind === null || isOneOf(LOCAL_MODEL_SERVER_KINDS, value.kind)) &&
    isNullableText(value.version) &&
    isNullableText(value.error) &&
    (value.responseMs === null || (isFiniteNumber(value.responseMs) && value.responseMs >= 0)) &&
    isNullableCount(value.availableModels) &&
    (value.loadedModels === null ||
      isBoundedList(value.loadedModels, LOCAL_MODEL_SERVER_LIMITS.loadedModels, isLocalModelLoadedModel)) &&
    (value.gpus === null || isBoundedList(value.gpus, LOCAL_MODEL_SERVER_LIMITS.gpus, isLocalModelServerGpu)) &&
    (value.gpuFormat === null || isOneOf(LOCAL_MODEL_GPU_FORMATS, value.gpuFormat)) &&
    isNullableText(value.gpuError) &&
    isNullableCount(value.modelMemoryBytes) &&
    isBoundedList(value.metrics, LOCAL_MODEL_SERVER_LIMITS.metrics, isLocalModelServerMetric)
  );
}

export function isLocalModelServerStatus(value: unknown): value is LocalModelServerStatus {
  return (
    isLocalModelServerReading(value) &&
    isDynamicRecord(value) &&
    !("apiKey" in value) &&
    !("headers" in value) &&
    isCustomProviderId(value.id) &&
    isBoundedString(value.name, INPUT_LIMITS.agentName) &&
    isBoundedString(value.baseUrl, CUSTOM_PROVIDER_LIMITS.baseUrl) &&
    isBoolean(value.hasApiKey) &&
    isBoolean(value.monitored) &&
    isLocalModelServerSettings(value.settings) &&
    isOneOf(LOCAL_MODEL_SERVER_STATES, value.state) &&
    (value.checkedAt === null || isFiniteNumber(value.checkedAt)) &&
    (value.lastOnlineAt === null || isFiniteNumber(value.lastOnlineAt))
  );
}

export function isLocalModelServerStatuses(value: unknown): value is LocalModelServerStatus[] {
  return isBoundedList(value, LOCAL_MODEL_SERVER_LIMITS.servers, isLocalModelServerStatus);
}

export function isScopedLocalModelServerStatus(value: unknown): value is ScopedLocalModelServerStatus {
  return (
    isDynamicRecord(value) &&
    isBoundedString(value.serverId, INPUT_LIMITS.identifier) &&
    isLocalModelServerStatuses(value.statuses)
  );
}

export function isLocalModelServerTestResult(value: unknown): value is LocalModelServerTestResult {
  return (
    isLocalModelServerReading(value) &&
    isDynamicRecord(value) &&
    !("apiKey" in value) &&
    isBoolean(value.online) &&
    isDiscoverModelsResult({ models: value.models }) &&
    isNewCustomProviderId(value.suggestedId)
  );
}

function isLocalModelServerCandidate(value: unknown): value is LocalModelServerCandidate {
  return (
    isDynamicRecord(value) &&
    !("apiKey" in value) &&
    isNewCustomProviderId(value.id) &&
    isBoundedString(value.name, INPUT_LIMITS.agentName) &&
    isBoundedString(value.baseUrl, CUSTOM_PROVIDER_LIMITS.baseUrl) &&
    (value.kind === null || isOneOf(LOCAL_MODEL_SERVER_KINDS, value.kind)) &&
    isNullableText(value.version) &&
    isBoolean(value.needsKey) &&
    (value.responseMs === null || (isFiniteNumber(value.responseMs) && value.responseMs >= 0)) &&
    isDiscoverModelsResult({ models: value.models })
  );
}

export function isLocalModelServerCandidates(value: unknown): value is LocalModelServerCandidate[] {
  return isBoundedList(value, LOCAL_MODEL_SERVER_LIMITS.candidates, isLocalModelServerCandidate);
}

export function gpuMemoryRatio(gpu: Pick<LocalModelServerGpu, "memoryUsedBytes" | "memoryTotalBytes">): number | null {
  const { memoryUsedBytes: used, memoryTotalBytes: total } = gpu;
  if (used === null || total === null || total <= 0) return null;
  return Math.min(1, Math.max(0, used / total));
}

export interface LocalModelServerGpuSummary {
  count: number;
  utilizationPercent: number | null;
  memoryUsedBytes: number | null;
  memoryTotalBytes: number | null;
}

export function localModelServerGpuSummary(gpus: readonly LocalModelServerGpu[] | null): LocalModelServerGpuSummary {
  const loads = (gpus ?? []).flatMap((gpu) => (gpu.utilizationPercent === null ? [] : [gpu.utilizationPercent]));
  const memory = (gpus ?? []).filter((gpu) => gpu.memoryUsedBytes !== null && gpu.memoryTotalBytes !== null);
  return {
    count: gpus?.length ?? 0,
    utilizationPercent: loads.length > 0 ? Math.round(loads.reduce((sum, load) => sum + load, 0) / loads.length) : null,
    memoryUsedBytes: memory.length > 0 ? memory.reduce((sum, gpu) => sum + (gpu.memoryUsedBytes ?? 0), 0) : null,
    memoryTotalBytes: memory.length > 0 ? memory.reduce((sum, gpu) => sum + (gpu.memoryTotalBytes ?? 0), 0) : null,
  };
}

export function isLocalModelServerMachine(status: Pick<LocalModelServerStatus, "settings" | "baseUrl">): boolean {
  return status.settings.monitored !== undefined || isLocalNetworkAddress(status.baseUrl);
}
