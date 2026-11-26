import type { CodeBotDesktopApi, LocalModelServerReading, LocalModelServerStatus } from "@codebot/contracts/ipc";

const BYTES_PER_GIB = 1024 ** 3;
const CHECKED_AT = 1_790_000_000_000;

function baseReading(): LocalModelServerReading {
  return {
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
}

export const LOCAL_MODEL_SERVER_FIXTURES: readonly LocalModelServerStatus[] = [
  {
    ...baseReading(),
    id: "spark-1",
    name: "DGX Spark 1",
    baseUrl: "http://192.168.1.41:8000/v1",
    hasApiKey: true,
    monitored: true,
    settings: { gpuStatusUrl: "http://192.168.1.41:9101/gpu", gpuStatusUsesKey: false },
    state: "online",
    checkedAt: CHECKED_AT,
    lastOnlineAt: CHECKED_AT,
    kind: "vllm",
    version: "0.11.0",
    responseMs: 38,
    availableModels: 2,
    loadedModels: [
      { name: "Qwen3-Coder-30B-A3B", sizeBytes: 31 * BYTES_PER_GIB, vramBytes: 31 * BYTES_PER_GIB, expiresAt: null },
      { name: "gpt-oss-120b", sizeBytes: 64 * BYTES_PER_GIB, vramBytes: 64 * BYTES_PER_GIB, expiresAt: null },
    ],
    gpus: [
      {
        index: 0,
        name: "NVIDIA GB10",
        utilizationPercent: 72,
        memoryUsedBytes: 96 * BYTES_PER_GIB,
        memoryTotalBytes: 128 * BYTES_PER_GIB,
      },
    ],
    gpuFormat: "json",
    modelMemoryBytes: 95 * BYTES_PER_GIB,
    metrics: [
      { id: "kvCacheUsage", source: "vllm", value: 41 },
      { id: "requestsRunning", source: "vllm", value: 3 },
      { id: "requestsWaiting", source: "vllm", value: 0 },
    ],
  },
  {
    ...baseReading(),
    id: "spark-2",
    name: "DGX Spark 2",
    baseUrl: "http://192.168.1.42:8000/v1",
    hasApiKey: false,
    monitored: true,
    settings: {},
    state: "offline",
    checkedAt: CHECKED_AT,
    lastOnlineAt: CHECKED_AT - 42 * 60_000,
    kind: "vllm",
    error: "The model server at 192.168.1.42 is not reachable. Make sure that the machine is on and on your network.",
  },
  {
    ...baseReading(),
    id: "studio-mac",
    name: "LM Studio (studio-mac)",
    baseUrl: "http://studio-mac.local:1234/v1",
    hasApiKey: false,
    monitored: true,
    settings: {},
    state: "online",
    checkedAt: CHECKED_AT,
    lastOnlineAt: CHECKED_AT,
    kind: "lmstudio",
    responseMs: 112,
    availableModels: 6,
    loadedModels: [{ name: "qwen2.5-coder-14b", sizeBytes: 9 * BYTES_PER_GIB, vramBytes: null, expiresAt: null }],
  },
];

export function createMockLocalModelServers(): CodeBotDesktopApi["localModelServers"] {
  const listeners = new Set<(statuses: LocalModelServerStatus[]) => void>();
  let statuses: LocalModelServerStatus[] = structuredClone([...LOCAL_MODEL_SERVER_FIXTURES]);
  const emit = () => {
    for (const listener of listeners) listener(structuredClone(statuses));
  };
  return {
    list: async () => structuredClone(statuses),
    refresh: async () => {
      statuses = statuses.map((status) => ({ ...status, checkedAt: Date.now() }));
      emit();
      return structuredClone(statuses);
    },
    watch: async () => undefined,
    test: async ({ baseUrl }) => ({
      ...baseReading(),
      online: true,
      models: [{ id: "preview-model", name: "preview-model" }],
      suggestedId: `server-${new URL(baseUrl).hostname.replace(/[^a-z0-9]+/giu, "-").toLowerCase()}`,
      kind: "openai",
      responseMs: 40,
      availableModels: 1,
    }),
    scanHost: async () => [],
    saveSettings: async ({ id, settings }) => {
      statuses = statuses.map((status) => (status.id === id ? { ...status, settings } : status));
      emit();
      return structuredClone(statuses);
    },
    onStatuses: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
