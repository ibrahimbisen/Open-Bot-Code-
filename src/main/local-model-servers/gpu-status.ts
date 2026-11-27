import { LOCAL_MODEL_SERVER_LIMITS, type LocalModelGpuFormat, type LocalModelServerGpu } from "@codebot/contracts/ipc";
import { isDynamicRecord, isNumber, isString } from "@codebot/contracts/runtime-values";
import { type PrometheusSample, parsePrometheusText } from "./prometheus-text";
import { parseJsonRecord } from "./server-read";

export interface GpuStatusReading {
  readonly format: LocalModelGpuFormat;
  readonly gpus: LocalModelServerGpu[];
}

const MEBIBYTE = 1024 * 1024;
const MAX_GPU_INDEX = 4_096;

function percent(value: unknown): number | null {
  return isNumber(value) && Number.isFinite(value) && value >= 0 && value <= 100 ? Math.round(value * 10) / 10 : null;
}

function bytes(value: unknown, unit = 1): number | null {
  if (!isNumber(value) || !Number.isFinite(value) || value < 0) return null;
  const size = Math.round(value * unit);
  return Number.isSafeInteger(size) ? size : null;
}

function gpuName(value: unknown): string | null {
  if (!isString(value)) return null;
  const name = value.trim().slice(0, LOCAL_MODEL_SERVER_LIMITS.name);
  return name || null;
}

function gpuIndex(value: unknown, fallback: number): number {
  const index = isString(value) && /^\d+$/u.test(value) ? Number(value) : value;
  return isNumber(index) && Number.isInteger(index) && index >= 0 && index <= MAX_GPU_INDEX ? index : fallback;
}

function ordered(gpus: LocalModelServerGpu[]): LocalModelServerGpu[] {
  return gpus.sort((left, right) => left.index - right.index).slice(0, LOCAL_MODEL_SERVER_LIMITS.gpus);
}

function fromJson(body: string): GpuStatusReading | null {
  const record = parseJsonRecord(body);
  if (!record || !Array.isArray(record.gpus)) return null;
  const gpus = record.gpus.flatMap((entry: unknown, position): LocalModelServerGpu[] =>
    isDynamicRecord(entry)
      ? [
          {
            index: gpuIndex(entry.index, position),
            name: gpuName(entry.name),
            utilizationPercent: percent(entry.utilization),
            memoryUsedBytes: bytes(entry.memoryUsedMb, MEBIBYTE),
            memoryTotalBytes: bytes(entry.memoryTotalMb, MEBIBYTE),
          },
        ]
      : [],
  );
  return { format: "json", gpus: ordered(gpus) };
}

interface GpuDraft {
  index: number | null;
  name: string | null;
  utilizationPercent: number | null;
  memoryUsedBytes: number | null;
  memoryFreeBytes: number | null;
  memoryReservedBytes: number | null;
  memoryTotalBytes: number | null;
}

function draftsOf(keyOf: (sample: PrometheusSample) => string) {
  const drafts = new Map<string, GpuDraft>();
  const draft = (sample: PrometheusSample): GpuDraft => {
    const key = keyOf(sample);
    let current = drafts.get(key);
    if (!current) {
      current = {
        index: null,
        name: null,
        utilizationPercent: null,
        memoryUsedBytes: null,
        memoryFreeBytes: null,
        memoryReservedBytes: null,
        memoryTotalBytes: null,
      };
      drafts.set(key, current);
    }
    return current;
  };
  return { drafts, draft };
}

function finished(drafts: ReadonlyMap<string, GpuDraft>): LocalModelServerGpu[] {
  return ordered(
    [...drafts.values()].map((draft, position) => ({
      index: draft.index ?? position,
      name: draft.name,
      utilizationPercent: draft.utilizationPercent,
      memoryUsedBytes: draft.memoryUsedBytes,
      memoryTotalBytes:
        draft.memoryTotalBytes ??
        (draft.memoryUsedBytes !== null && draft.memoryFreeBytes !== null
          ? draft.memoryUsedBytes + draft.memoryFreeBytes + (draft.memoryReservedBytes ?? 0)
          : null),
    })),
  );
}

function fromNvidiaSmiExporter(samples: readonly PrometheusSample[]): LocalModelServerGpu[] {
  const { drafts, draft } = draftsOf((sample) => sample.labels.uuid ?? sample.labels.gpu ?? sample.labels.index ?? "0");
  for (const sample of samples) {
    const gpu = draft(sample);
    if (sample.name === "nvidia_smi_utilization_gpu_ratio") gpu.utilizationPercent = percent(sample.value * 100);
    else if (sample.name === "nvidia_smi_memory_used_bytes") gpu.memoryUsedBytes = bytes(sample.value);
    else if (sample.name === "nvidia_smi_memory_total_bytes") gpu.memoryTotalBytes = bytes(sample.value);
    else if (sample.name === "nvidia_smi_index") gpu.index = gpuIndex(sample.value, 0);
    else if (sample.name === "nvidia_smi_gpu_info") gpu.name = gpuName(sample.labels.name);
  }
  return finished(drafts);
}

function fromDcgm(samples: readonly PrometheusSample[]): LocalModelServerGpu[] {
  const { drafts, draft } = draftsOf((sample) => sample.labels.gpu ?? sample.labels.UUID ?? "0");
  for (const sample of samples) {
    const gpu = draft(sample);
    gpu.index ??= sample.labels.gpu === undefined ? null : gpuIndex(sample.labels.gpu, 0);
    gpu.name ??= gpuName(sample.labels.modelName);
    if (sample.name === "DCGM_FI_DEV_GPU_UTIL") gpu.utilizationPercent = percent(sample.value);
    else if (sample.name === "DCGM_FI_DEV_FB_USED") gpu.memoryUsedBytes = bytes(sample.value, MEBIBYTE);
    else if (sample.name === "DCGM_FI_DEV_FB_FREE") gpu.memoryFreeBytes = bytes(sample.value, MEBIBYTE);
    else if (sample.name === "DCGM_FI_DEV_FB_RESERVED") gpu.memoryReservedBytes = bytes(sample.value, MEBIBYTE);
    else if (sample.name === "DCGM_FI_DEV_FB_TOTAL") gpu.memoryTotalBytes = bytes(sample.value, MEBIBYTE);
  }
  return finished(drafts);
}

const NVIDIA_SMI_SERIES: ReadonlySet<string> = new Set([
  "nvidia_smi_utilization_gpu_ratio",
  "nvidia_smi_memory_used_bytes",
  "nvidia_smi_memory_total_bytes",
  "nvidia_smi_index",
  "nvidia_smi_gpu_info",
]);
const NVIDIA_SMI_VALUES: ReadonlySet<string> = new Set([
  "nvidia_smi_utilization_gpu_ratio",
  "nvidia_smi_memory_used_bytes",
  "nvidia_smi_memory_total_bytes",
]);
const DCGM_SERIES: ReadonlySet<string> = new Set([
  "DCGM_FI_DEV_GPU_UTIL",
  "DCGM_FI_DEV_FB_USED",
  "DCGM_FI_DEV_FB_FREE",
  "DCGM_FI_DEV_FB_RESERVED",
  "DCGM_FI_DEV_FB_TOTAL",
]);

function fromPrometheus(body: string): GpuStatusReading | null {
  const samples = parsePrometheusText(body, (name) => NVIDIA_SMI_SERIES.has(name) || DCGM_SERIES.has(name));
  const nvidiaSmi = samples.filter((sample) => NVIDIA_SMI_SERIES.has(sample.name));
  if (nvidiaSmi.some((sample) => NVIDIA_SMI_VALUES.has(sample.name)))
    return { format: "nvidia-smi", gpus: fromNvidiaSmiExporter(nvidiaSmi) };
  const dcgm = samples.filter((sample) => DCGM_SERIES.has(sample.name));
  return dcgm.length > 0 ? { format: "dcgm", gpus: fromDcgm(dcgm) } : null;
}

export function parseGpuStatus(body: string): GpuStatusReading | null {
  return body.trimStart().startsWith("{") ? fromJson(body) : fromPrometheus(body);
}
