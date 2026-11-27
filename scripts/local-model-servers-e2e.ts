import assert from "node:assert/strict";
import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import {
  DEFAULT_MODEL_SERVERS,
  type DetectedModel,
  isAgentModel,
  isLocalModelServerCandidates,
  isLocalModelServerStatuses,
  isLocalModelServerTestResult,
  isLocalNetworkAddress,
  isProjectRuntime,
  type LocalModelServerSettings,
  type LocalModelServerStatus,
  savedCustomModelId,
} from "@codebot/contracts/ipc";
import { sourceText } from "@codebot/i18n/source";
import { Effect } from "effect";
import { runCauseEffect } from "../src/backend/effect-boundary";
import { customProvidersOn, OPENCODE_AGENT_CONFIG, openCodeConfigEnv } from "../src/backend/opencode-config";
import { createPiCustomEndpointExtension } from "../src/backend/pi-custom-endpoints";
import { type CustomProviderCipher, CustomProviderStore } from "../src/main/custom-provider-store";
import { parseSaveCustomProvider } from "../src/main/ipc/custom-provider-inputs";
import { hostScanTargets, LocalModelServerMonitor } from "../src/main/local-model-servers/monitor";
import { requestHeaders, serverCredentials } from "../src/main/local-model-servers/server-read";

const OUT = resolve(import.meta.dirname, "../.codebot-build/local-model-servers-e2e");
const HELPER = resolve(import.meta.dirname, "codebot/gpu-status-server.ts");
const KEY = "sk-e2e-keyed-machine";
const REDIRECT_KEY = "sk-e2e-redirect-machine";
const CROSS_KEY = "sk-e2e-cross-machine";
const HEADER = { name: "X-Team", value: "e2e-team-header" };
const SECRETS = [KEY, REDIRECT_KEY, CROSS_KEY, HEADER.value];
const MEBIBYTE = 1024 * 1024;
const TIMING = {
  visibleMs: 10_000,
  hiddenMs: 60_000,
  requestTimeoutMs: 400,
  testTimeoutMs: 6_000,
  scanTimeoutMs: 1_000,
  backoffLimit: 6,
};
const SLOW_ANSWER_MS = 1_200;
const WAIT_MS = 15_000;

interface Seen {
  path: string;
  authorization: string | null;
  team: string | null;
}

type Route = (request: IncomingMessage, response: ServerResponse, path: string) => boolean | undefined;

interface FakeServer {
  name: string;
  origin: string;
  baseUrl: string;
  seen: Seen[];
  close: () => Promise<void>;
}

interface Check {
  name: string;
  passed: boolean;
  detail?: unknown;
  error?: string;
}

const checks: Check[] = [];
const servers: FakeServer[] = [];
const children: ChildProcess[] = [];

async function check(name: string, run: () => unknown): Promise<void> {
  try {
    const detail = await run();
    checks.push(detail === undefined ? { name, passed: true } : { name, passed: true, detail });
  } catch (error) {
    checks.push({ name, passed: false, error: error instanceof Error ? error.message : String(error) });
  }
}

function json(response: ServerResponse, status: number, body: unknown): boolean {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
  return true;
}

function text(response: ServerResponse, body: string): boolean {
  response.writeHead(200, { "content-type": "text/plain; version=0.0.4" });
  response.end(body);
  return true;
}

function modelList(ids: readonly string[], ownedBy: string, extra: Record<string, number> = {}) {
  return { object: "list", data: ids.map((id) => ({ id, object: "model", owned_by: ownedBy, ...extra })) };
}

async function fakeServer(name: string, route: Route): Promise<FakeServer> {
  const seen: Seen[] = [];
  const server: Server = createServer((request, response) => {
    const path = (request.url ?? "").split("?")[0] ?? "";
    seen.push({
      path,
      authorization: request.headers.authorization ?? null,
      team: typeof request.headers["x-team"] === "string" ? request.headers["x-team"] : null,
    });
    if (route(request, response, path) !== true) json(response, 404, { error: "not found" });
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const address = server.address();
  assert.ok(address && typeof address === "object", "The fake server listens on a port.");
  const origin = `http://127.0.0.1:${address.port}`;
  const fake: FakeServer = {
    name,
    origin,
    baseUrl: `${origin}/v1`,
    seen,
    close: () =>
      new Promise((done) => {
        server.closeAllConnections();
        server.close(() => done());
      }),
  };
  servers.push(fake);
  return fake;
}

async function closedPort(): Promise<string> {
  const server = createServer();
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  await new Promise<void>((done) => server.close(() => done()));
  return `http://127.0.0.1:${address.port}`;
}

const NVIDIA_SMI_EXPORTER = `# HELP nvidia_smi_utilization_gpu_ratio Percent of time over the past sample period during which one or more kernels was executing on the GPU
# TYPE nvidia_smi_utilization_gpu_ratio gauge
nvidia_smi_utilization_gpu_ratio{uuid="GPU-aaaa"} 0.25
nvidia_smi_utilization_gpu_ratio{uuid="GPU-bbbb"} 0.5
nvidia_smi_memory_used_bytes{uuid="GPU-aaaa"} 8589934592
nvidia_smi_memory_used_bytes{uuid="GPU-bbbb"} 2147483648
nvidia_smi_memory_total_bytes{uuid="GPU-aaaa"} 25769803776
nvidia_smi_memory_total_bytes{uuid="GPU-bbbb"} 25769803776
nvidia_smi_index{uuid="GPU-bbbb"} 1
nvidia_smi_index{uuid="GPU-aaaa"} 0
nvidia_smi_gpu_info{uuid="GPU-aaaa",name="NVIDIA GeForce RTX 3090",driver_model_current="WDDM, \\"quoted\\""} 1
nvidia_smi_gpu_info{uuid="GPU-bbbb",name="NVIDIA GeForce RTX 3090"} 1
nvidia_smi_temperature_gpu{uuid="GPU-aaaa"} 61
`;

const DCGM_EXPORTER = `# HELP DCGM_FI_DEV_GPU_UTIL GPU utilization (in %).
# TYPE DCGM_FI_DEV_GPU_UTIL gauge
DCGM_FI_DEV_GPU_UTIL{gpu="0",UUID="GPU-cccc",device="nvidia0",modelName="NVIDIA GB10",Hostname="spark-1"} 91
DCGM_FI_DEV_FB_USED{gpu="0",UUID="GPU-cccc",device="nvidia0",modelName="NVIDIA GB10",Hostname="spark-1"} 30000
DCGM_FI_DEV_FB_FREE{gpu="0",UUID="GPU-cccc",device="nvidia0",modelName="NVIDIA GB10",Hostname="spark-1"} 10000
DCGM_FI_DEV_GPU_TEMP{gpu="0",UUID="GPU-cccc",device="nvidia0",modelName="NVIDIA GB10",Hostname="spark-1"} 55
`;

const VLLM_METRICS = `# HELP vllm:num_requests_running Number of requests currently running on GPU.
# TYPE vllm:num_requests_running gauge
vllm:num_requests_running{model_name="Qwen/Qwen2.5-Coder-32B-Instruct"} 2.0
# TYPE vllm:num_requests_waiting gauge
vllm:num_requests_waiting{model_name="Qwen/Qwen2.5-Coder-32B-Instruct"} 1.0
# TYPE vllm:gpu_cache_usage_perc gauge
vllm:gpu_cache_usage_perc{model_name="Qwen/Qwen2.5-Coder-32B-Instruct"} 0.42
python_gc_objects_collected_total{generation="0"} 1234.0
`;

const NVIDIA_SMI_ROWS = ["0, NVIDIA RTX A6000, 37, 12000, 48000", "1, NVIDIA RTX A6000, [N/A], 512, 48000"];
const NVIDIA_SMI_ROWS_LATER = ["0, NVIDIA RTX A6000, 88, 40000, 48000", "1, NVIDIA RTX A6000, [N/A], 512, 48000"];
const NVIDIA_SMI_ARGUMENTS = [
  "--query-gpu=index,name,utilization.gpu,memory.used,memory.total",
  "--format=csv,noheader,nounits",
];

async function installFakeNvidiaSmi(bin: string): Promise<void> {
  await mkdir(bin, { recursive: true });
  await writeFile(join(bin, "rows.txt"), `${NVIDIA_SMI_ROWS.join("\n")}\n`);
  await writeFile(
    join(bin, "nvidia-smi-stand-in.cjs"),
    [
      'const fs = require("node:fs");',
      'const path = require("node:path");',
      'fs.writeFileSync(path.join(__dirname, "argv.json"), JSON.stringify(process.argv.slice(2)));',
      'process.stdout.write(fs.readFileSync(path.join(__dirname, "rows.txt"), "utf8"));',
      "",
    ].join("\n"),
  );
  if (process.platform === "win32") {
    await writeFile(join(bin, "nvidia-smi.cmd"), `@"${process.execPath}" "%~dp0nvidia-smi-stand-in.cjs" %*\r\n`);
    return;
  }
  const program = join(bin, "nvidia-smi");
  await writeFile(program, `#!/bin/sh\nexec "${process.execPath}" "$(dirname "$0")/nvidia-smi-stand-in.cjs" "$@"\n`);
  await chmod(program, 0o755);
}

function environmentWithPath(first: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  let path = "";
  for (const [name, value] of Object.entries(process.env)) {
    if (name.toLowerCase() === "path") path = value ?? path;
    else env[name] = value;
  }
  env.PATH = `${first}${delimiter}${path}`;
  return env;
}

async function startHelper(runtime: string, bin: string): Promise<{ url: string; child: ChildProcess }> {
  const child = spawn(runtime, [HELPER, "--host", "127.0.0.1", "--port", "0", "--interval", "1"], {
    env: environmentWithPath(bin),
    stdio: ["ignore", "pipe", "pipe"],
  });
  children.push(child);
  let output = "";
  let errors = "";
  child.stdout?.setEncoding("utf8").on("data", (chunk: string) => {
    output += chunk;
  });
  child.stderr?.setEncoding("utf8").on("data", (chunk: string) => {
    errors += chunk;
  });
  const url = await waitFor(`The helper prints its address (${errors.trim() || "no error text"}).`, () => {
    if (child.exitCode !== null) throw new Error(`The helper stopped with the code ${child.exitCode}: ${errors}`);
    return /listening on (http:\/\/\S+)/u.exec(output)?.[1] ?? null;
  });
  return { url, child };
}

async function waitFor<T>(what: string, read: () => T | null | Promise<T | null>): Promise<T> {
  const deadline = Date.now() + WAIT_MS;
  for (;;) {
    const value = await read();
    if (value !== null) return value;
    if (Date.now() > deadline) throw new Error(what);
    await new Promise((done) => setTimeout(done, 25));
  }
}

function stopChild(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return new Promise((done) => {
    child.once("exit", () => done());
    child.kill();
  });
}

const cipher: CustomProviderCipher = {
  canPersist: () => true,
  encrypt: (value) => Buffer.from(Buffer.from(value, "utf8").map((byte) => byte ^ 0x5a)),
  decrypt: (value) => Buffer.from(value.map((byte) => byte ^ 0x5a)).toString("utf8"),
};

const clock = { now: 1_800_000_000_000 };
interface Timer {
  at: number;
  run: () => void;
  state: "pending" | "cancelled" | "ran";
}
const timers: Timer[] = [];
function pendingTimers(): Timer[] {
  return timers.filter((timer) => timer.state === "pending");
}

const root = await mkdtemp(join(tmpdir(), "codebot-local-model-servers-e2e-"));
const storePath = join(root, "codebot-custom-providers-v1.json");
const store = new CustomProviderStore({ path: storePath, cipher });
await runCauseEffect(store.load());
const monitor = new LocalModelServerMonitor({
  entries: () => store.localServers(),
  timing: TIMING,
  now: () => clock.now,
  schedule: (run, delayMs) => {
    const timer: Timer = { at: clock.now + delayMs, run, state: "pending" };
    timers.push(timer);
    return () => {
      if (timer.state === "pending") timer.state = "cancelled";
    };
  },
});

async function settle(): Promise<void> {
  await Effect.runPromise(monitor.settled());
}

async function advance(ms: number): Promise<void> {
  clock.now += ms;
  for (;;) {
    const due = pendingTimers()
      .filter((timer) => timer.at <= clock.now)
      .sort((left, right) => left.at - right.at)[0];
    if (!due) break;
    due.state = "ran";
    due.run();
    await settle();
  }
  await settle();
}

function requestCount(): number {
  return servers.reduce((sum, server) => sum + server.seen.length, 0);
}

function statusOf(statuses: readonly LocalModelServerStatus[], id: string): LocalModelServerStatus {
  const status = statuses.find((entry) => entry.id === id);
  assert.ok(status, `The status list has ${id}.`);
  return status;
}

async function addMachine(input: {
  id: string;
  name: string;
  baseUrl: string;
  models: readonly string[];
  apiKey?: string;
  headers?: { name: string; value: string }[];
  harness?: "opencode" | "pi";
  settings?: LocalModelServerSettings;
}): Promise<void> {
  const parsed = parseSaveCustomProvider({
    id: input.id,
    name: input.name,
    baseUrl: input.baseUrl,
    apiKey: input.apiKey ?? null,
    headers: input.headers ?? [],
    models: input.models.map((id) => ({ id, name: id })),
    ...(input.harness ? { harness: input.harness } : {}),
  });
  await runCauseEffect(store.save(parsed));
  if (input.settings) await runCauseEffect(store.setLocalServerSettings(input.id, input.settings));
}

let passed = false;
try {
  const subscription = monitor.subscribe(() => undefined, "visible");
  await check("No entry: no timer and no request", async () => {
    await advance(10 * TIMING.hiddenMs);
    assert.equal(timers.length, 0, "No timer starts with no entry.");
    assert.equal(monitor.timerArmed(), false);
    assert.deepEqual(monitor.statuses(), []);
    assert.equal(requestCount(), 0);
  });
  subscription.close();

  const bin = join(root, "bin");
  await installFakeNvidiaSmi(bin);
  const helper = await startHelper(process.execPath, bin);

  const ollama = await fakeServer("ollama", (_request, response, path) => {
    if (path === "/v1/models")
      return json(response, 200, modelList(["llama3.2:latest", "qwen2.5-coder:7b"], "library"));
    if (path === "/api/version") return json(response, 200, { version: "0.5.7" });
    if (path === "/api/tags")
      return json(response, 200, {
        models: [{ name: "llama3.2:latest", size: 2_019_393_189 }, { name: "qwen2.5-coder:7b" }],
      });
    if (path === "/api/ps")
      return json(response, 200, {
        models: [
          {
            name: "llama3.2:latest",
            model: "llama3.2:latest",
            size: 3_825_819_519,
            size_vram: 3_500_000_000,
            expires_at: "2026-11-26T12:30:00Z",
          },
        ],
      });
    return false;
  });
  const lmStudio = await fakeServer("lmstudio", (_request, response, path) => {
    if (path === "/v1/models")
      return json(response, 200, modelList(["qwen2.5-coder-14b", "nomic-embed-text"], "organization_owner"));
    if (path === "/api/v0/models")
      return json(response, 200, {
        object: "list",
        data: [
          { id: "qwen2.5-coder-14b", object: "model", type: "llm", state: "loaded", max_context_length: 32_768 },
          { id: "nomic-embed-text", object: "model", type: "embeddings", state: "not-loaded" },
        ],
      });
    return false;
  });
  const vllm = await fakeServer("vllm", (_request, response, path) => {
    if (path === "/v1/models")
      return json(response, 200, modelList(["Qwen/Qwen2.5-Coder-32B-Instruct"], "vllm", { max_model_len: 32_768 }));
    if (path === "/version") return json(response, 200, { version: "0.6.3" });
    if (path === "/metrics") return text(response, VLLM_METRICS);
    return false;
  });
  const keyed = await fakeServer("keyed", (request, response, path) => {
    if (request.headers.authorization !== `Bearer ${KEY}`) return json(response, 401, { error: "unauthorized" });
    if (path === "/v1/models") return json(response, 200, modelList(["keyed-model"], "owner"));
    if (path === "/gpu")
      return json(response, 200, {
        gpus: [{ index: 0, name: "Keyed GPU", utilization: 12, memoryUsedMb: 1024, memoryTotalMb: 8192 }],
      });
    return false;
  });
  const plain = await fakeServer("plain", (_request, response, path) =>
    path === "/v1/models" ? json(response, 200, modelList(["plain-model"], "owner")) : false,
  );
  const exporter = await fakeServer("exporter", (_request, response, path) => {
    if (path === "/metrics/nvidia") return text(response, NVIDIA_SMI_EXPORTER);
    if (path === "/metrics/dcgm") return text(response, DCGM_EXPORTER);
    return false;
  });
  const slow = await fakeServer("slow", (_request, response, path) => {
    if (path !== "/v1/models") return false;
    const timer = setTimeout(() => {
      if (!response.destroyed) json(response, 200, modelList(["slow-model"], "owner"));
    }, SLOW_ANSWER_MS);
    response.on("close", () => clearTimeout(timer));
    return true;
  });
  const redirectTarget = await fakeServer("redirect-target", (_request, response, path) =>
    path === "/v1/models" ? json(response, 200, modelList(["stolen-model"], "owner")) : false,
  );
  const redirecting = await fakeServer("redirecting", (_request, response, path) => {
    response.writeHead(302, { location: `${redirectTarget.origin}${path}` }).end();
    return true;
  });
  const offlineOrigin = await closedPort();

  const MACHINES = {
    ollama: "spark-ollama",
    lmStudio: "desk-lmstudio",
    vllm: "spark-vllm",
    keyed: "keyed-box",
    plain: "plain-box",
    cross: "cross-box",
    offline: "offline-box",
    slow: "slow-box",
    redirect: "redirect-box",
    cloud: "cloud-endpoint",
  } as const;

  await addMachine({
    id: MACHINES.ollama,
    name: "Spark 1 (Ollama)",
    baseUrl: ollama.baseUrl,
    models: ["llama3.2:latest", "qwen2.5-coder:7b"],
    settings: { gpuStatusUrl: helper.url },
  });
  await addMachine({
    id: MACHINES.lmStudio,
    name: "Desk (LM Studio)",
    baseUrl: lmStudio.baseUrl,
    models: ["qwen2.5-coder-14b"],
    harness: "pi",
    settings: { gpuStatusUrl: `${exporter.origin}/metrics/nvidia` },
  });
  await addMachine({
    id: MACHINES.vllm,
    name: "Spark 2 (vLLM)",
    baseUrl: vllm.baseUrl,
    models: ["Qwen/Qwen2.5-Coder-32B-Instruct"],
    settings: { gpuStatusUrl: `${exporter.origin}/metrics/dcgm` },
  });
  await addMachine({
    id: MACHINES.keyed,
    name: "Keyed box",
    baseUrl: keyed.baseUrl,
    models: ["keyed-model"],
    apiKey: KEY,
    headers: [HEADER],
    settings: { gpuStatusUrl: `${keyed.origin}/gpu`, gpuStatusUsesKey: true },
  });
  await addMachine({ id: MACHINES.plain, name: "Plain box", baseUrl: plain.baseUrl, models: ["plain-model"] });
  await addMachine({
    id: MACHINES.cross,
    name: "Cross box",
    baseUrl: `${plain.origin}/v1/`,
    models: ["plain-model"],
    apiKey: CROSS_KEY,
    settings: { gpuStatusUrl: `${exporter.origin}/metrics/nvidia`, gpuStatusUsesKey: true },
  });
  await addMachine({ id: MACHINES.offline, name: "Offline box", baseUrl: `${offlineOrigin}/v1`, models: ["m"] });
  await addMachine({ id: MACHINES.slow, name: "Slow box", baseUrl: slow.baseUrl, models: ["slow-model"] });
  await addMachine({
    id: MACHINES.redirect,
    name: "Redirect box",
    baseUrl: redirecting.baseUrl,
    models: ["m"],
    apiKey: REDIRECT_KEY,
    settings: { gpuStatusUrl: `${redirecting.origin}/gpu` },
  });
  await addMachine({
    id: MACHINES.cloud,
    name: "Cloud endpoint",
    baseUrl: "https://models.example.com/v1",
    models: ["cloud-model"],
  });

  const statuses = await Effect.runPromise(monitor.refresh(null));
  const of = (id: string) => statusOf(statuses, id);
  const host = (origin: string) => new URL(origin).host;

  await check("The status list passes the IPC guard and holds no secret", () => {
    assert.ok(isLocalModelServerStatuses(statuses), "The preload decoder accepts the list.");
    const serialized = JSON.stringify(statuses);
    for (const secret of SECRETS) assert.ok(!serialized.includes(secret), "A status holds no key and no header value.");
    return { machines: statuses.length };
  });

  await check("Kind detection: Ollama, LM Studio, vLLM, OpenAI-compatible", () => {
    assert.equal(of(MACHINES.ollama).kind, "ollama");
    assert.equal(of(MACHINES.ollama).version, "0.5.7");
    assert.equal(of(MACHINES.lmStudio).kind, "lmstudio");
    assert.equal(of(MACHINES.vllm).kind, "vllm");
    assert.equal(of(MACHINES.vllm).version, "0.6.3");
    assert.equal(of(MACHINES.keyed).kind, "openai");
    assert.equal(of(MACHINES.plain).kind, "openai");
    assert.deepEqual(
      ollama.seen.map((entry) => entry.path).sort(),
      ["/api/ps", "/api/tags", "/api/v0/models", "/api/version", "/v1/models", "/version"],
      "The first reading asks the model list and the kind endpoints one time each.",
    );
    return Object.fromEntries(statuses.map((status) => [status.id, status.kind]));
  });

  await check("Online and offline, with the error in plain words and the response time", () => {
    for (const id of [MACHINES.ollama, MACHINES.lmStudio, MACHINES.vllm, MACHINES.keyed, MACHINES.plain]) {
      assert.equal(of(id).state, "online", `${id} is online.`);
      assert.equal(of(id).error, null);
      assert.ok((of(id).responseMs ?? -1) >= 0, `${id} has a response time.`);
      assert.equal(of(id).checkedAt, clock.now);
      assert.equal(of(id).lastOnlineAt, clock.now);
    }
    const offline = of(MACHINES.offline);
    assert.equal(offline.state, "offline");
    assert.ok(
      [
        sourceText("error.localServer.refused", { host: host(offlineOrigin) }),
        sourceText("error.localServer.unreachable", { host: host(offlineOrigin) }),
      ].includes(offline.error ?? ""),
      `The offline machine has a plain error: ${offline.error}`,
    );
    assert.equal(offline.responseMs, null);
    assert.equal(offline.lastOnlineAt, null);
    assert.equal(of(MACHINES.slow).state, "offline");
    assert.equal(
      of(MACHINES.slow).error,
      sourceText("error.localServer.timeout", { host: host(slow.origin), seconds: TIMING.requestTimeoutMs / 1000 }),
    );
    return { offline: offline.error, slow: of(MACHINES.slow).error };
  });

  await check("An address outside the local network gets no status reading", () => {
    assert.equal(isLocalNetworkAddress("https://models.example.com/v1"), false);
    assert.equal(isLocalNetworkAddress(ollama.baseUrl), true);
    for (const address of ["http://dgx1:8000/v1", "http://192.168.1.20:11434/v1", "http://spark.local:1234/v1"])
      assert.equal(isLocalNetworkAddress(address), true, address);
    const cloud = of(MACHINES.cloud);
    assert.equal(cloud.monitored, false);
    assert.equal(cloud.state, "off");
    assert.equal(cloud.checkedAt, null);
  });

  await check("Loaded models for each server kind", () => {
    assert.deepEqual(of(MACHINES.ollama).loadedModels, [
      {
        name: "llama3.2:latest",
        sizeBytes: 3_825_819_519,
        vramBytes: 3_500_000_000,
        expiresAt: Date.parse("2026-11-26T12:30:00Z"),
      },
    ]);
    assert.equal(of(MACHINES.ollama).availableModels, 2);
    assert.equal(of(MACHINES.ollama).modelMemoryBytes, 3_500_000_000);
    assert.deepEqual(
      of(MACHINES.lmStudio).loadedModels?.map((model) => model.name),
      ["qwen2.5-coder-14b"],
    );
    assert.equal(of(MACHINES.lmStudio).availableModels, 2);
    assert.deepEqual(
      of(MACHINES.vllm).loadedModels?.map((model) => model.name),
      ["Qwen/Qwen2.5-Coder-32B-Instruct"],
    );
    assert.equal(of(MACHINES.keyed).loadedModels, null, "A generic server does not tell which models are loaded.");
    assert.equal(of(MACHINES.keyed).availableModels, 1);
  });

  await check("GPU values from the helper with a fake nvidia-smi", async () => {
    const status = of(MACHINES.ollama);
    assert.equal(status.gpuFormat, "json");
    assert.deepEqual(status.gpus, [
      {
        index: 0,
        name: "NVIDIA RTX A6000",
        utilizationPercent: 37,
        memoryUsedBytes: 12_000 * MEBIBYTE,
        memoryTotalBytes: 48_000 * MEBIBYTE,
      },
      {
        index: 1,
        name: "NVIDIA RTX A6000",
        utilizationPercent: null,
        memoryUsedBytes: 512 * MEBIBYTE,
        memoryTotalBytes: 48_000 * MEBIBYTE,
      },
    ]);
    assert.deepEqual(JSON.parse(await readFile(join(bin, "argv.json"), "utf8")), NVIDIA_SMI_ARGUMENTS);
    return status.gpus;
  });

  await check("GPU values from a Prometheus exporter, both metric families", () => {
    const nvidiaSmi = of(MACHINES.lmStudio);
    assert.equal(nvidiaSmi.gpuFormat, "nvidia-smi");
    assert.deepEqual(nvidiaSmi.gpus, [
      {
        index: 0,
        name: "NVIDIA GeForce RTX 3090",
        utilizationPercent: 25,
        memoryUsedBytes: 8_589_934_592,
        memoryTotalBytes: 25_769_803_776,
      },
      {
        index: 1,
        name: "NVIDIA GeForce RTX 3090",
        utilizationPercent: 50,
        memoryUsedBytes: 2_147_483_648,
        memoryTotalBytes: 25_769_803_776,
      },
    ]);
    const dcgm = of(MACHINES.vllm);
    assert.equal(dcgm.gpuFormat, "dcgm");
    assert.deepEqual(dcgm.gpus, [
      {
        index: 0,
        name: "NVIDIA GB10",
        utilizationPercent: 91,
        memoryUsedBytes: 30_000 * MEBIBYTE,
        memoryTotalBytes: 40_000 * MEBIBYTE,
      },
    ]);
    return { nvidiaSmi: nvidiaSmi.gpus, dcgm: dcgm.gpus };
  });

  await check("vLLM values keep their own names and are not GPU load", () => {
    const status = of(MACHINES.vllm);
    assert.deepEqual(status.metrics, [
      { id: "kvCacheUsage", source: "vllm:gpu_cache_usage_perc", value: 42 },
      { id: "requestsRunning", source: "vllm:num_requests_running", value: 2 },
      { id: "requestsWaiting", source: "vllm:num_requests_waiting", value: 1 },
    ]);
    return status.metrics;
  });

  await check("No GPU source: not reported, and no invented number", () => {
    const status = of(MACHINES.plain);
    assert.equal(status.gpus, null);
    assert.equal(status.gpuFormat, null);
    assert.equal(status.gpuError, null);
    assert.equal(status.modelMemoryBytes, null);
    assert.deepEqual(status.metrics, []);
    assert.equal(of(MACHINES.offline).gpus, null);
  });

  await check("A redirect is refused, for the model list and for the GPU status", () => {
    const status = of(MACHINES.redirect);
    assert.equal(status.state, "offline");
    assert.equal(status.error, sourceText("error.localServer.redirect", { host: host(redirecting.origin) }));
    assert.equal(status.gpus, null);
    assert.equal(status.gpuError, sourceText("error.localServer.gpuRedirect", { host: host(redirecting.origin) }));
    assert.equal(redirectTarget.seen.length, 0, "The redirect target gets no request.");
    return { error: status.error, gpuError: status.gpuError };
  });

  await check("A key and a header reach only their own origin", () => {
    assert.ok(keyed.seen.length > 0);
    for (const entry of keyed.seen) {
      assert.equal(entry.authorization, `Bearer ${KEY}`, `The keyed machine gets its key at ${entry.path}.`);
      assert.equal(entry.team, HEADER.value);
    }
    assert.ok(
      redirecting.seen.some((entry) => entry.authorization === `Bearer ${REDIRECT_KEY}`),
      "The redirecting machine gets its own key.",
    );
    assert.ok(plain.seen.some((entry) => entry.authorization === `Bearer ${CROSS_KEY}`));
    const owners: Record<string, FakeServer> = { [KEY]: keyed, [REDIRECT_KEY]: redirecting, [CROSS_KEY]: plain };
    for (const server of servers) {
      for (const entry of server.seen) {
        const sent = entry.authorization?.replace(/^Bearer /u, "") ?? null;
        if (sent !== null) assert.equal(owners[sent], server, `${server.name} got a key of another machine.`);
        if (entry.team !== null) assert.equal(server, keyed, `${server.name} got a header of another machine.`);
      }
    }
    assert.ok(exporter.seen.length >= 3, "The exporter was read.");
    assert.ok(
      exporter.seen.every((entry) => entry.authorization === null),
      "The GPU status URL of another origin gets no key, also with the key switch on.",
    );
    assert.equal(of(MACHINES.cross).gpuFormat, "nvidia-smi");
    assert.equal(
      store.localServers().find((server) => server.id === MACHINES.cross)?.settings.gpuStatusUsesKey,
      true,
      "The key switch of the machine with the other GPU origin is on.",
    );
    return { keyedRequests: keyed.seen.length, exporterRequests: exporter.seen.length };
  });

  await check("The request builder gives no key and no header to another origin", () => {
    const credentials = serverCredentials(keyed.baseUrl, KEY, [HEADER]);
    assert.ok(credentials);
    const own = requestHeaders(new URL(`${keyed.origin}/gpu`), credentials, "application/json");
    assert.equal(own.get("authorization"), `Bearer ${KEY}`);
    assert.equal(own.get("x-team"), HEADER.value);
    for (const other of [`${exporter.origin}/metrics/nvidia`, `http://localhost:${new URL(keyed.origin).port}/gpu`]) {
      const headers = requestHeaders(new URL(other), credentials, "application/json");
      assert.equal(headers.get("authorization"), null, `${other} gets no key.`);
      assert.equal(headers.get("x-team"), null, `${other} gets no header.`);
    }
  });

  await check("The GPU status URL gets the key only with the switch on and the same origin", async () => {
    const withKey = of(MACHINES.keyed);
    assert.equal(withKey.gpuError, null);
    assert.equal(withKey.gpus?.[0]?.name, "Keyed GPU");
    assert.equal(withKey.gpus?.[0]?.memoryTotalBytes, 8192 * MEBIBYTE);
    await runCauseEffect(store.setLocalServerSettings(MACHINES.keyed, { gpuStatusUrl: `${keyed.origin}/gpu` }));
    const before = keyed.seen.length;
    const next = statusOf(await Effect.runPromise(monitor.refresh(MACHINES.keyed)), MACHINES.keyed);
    const gpuRequests = keyed.seen.slice(before).filter((entry) => entry.path === "/gpu");
    assert.equal(gpuRequests.length, 1);
    assert.equal(gpuRequests[0]?.authorization, null, "With the switch off the GPU status URL gets no key.");
    assert.equal(gpuRequests[0]?.team, null);
    assert.equal(next.state, "online");
    assert.equal(next.gpus, null);
    assert.equal(next.gpuError, sourceText("error.localServer.gpuHttp", { host: host(keyed.origin), status: 401 }));
    return { gpuError: next.gpuError };
  });

  await check("The machine settings stay in the entry of the endpoint store", async () => {
    const file = await readFile(storePath, "utf8");
    for (const secret of SECRETS) assert.ok(!file.includes(secret), "The file holds no plain key or header.");
    const saved = store.list().find((summary) => summary.id === MACHINES.vllm);
    assert.ok(saved);
    await runCauseEffect(store.update({ id: saved.id, name: "Spark 2", baseUrl: saved.baseUrl, models: saved.models }));
    const reopened = new CustomProviderStore({ path: storePath, cipher });
    await runCauseEffect(reopened.load());
    const entry = reopened.localServers().find((server) => server.id === MACHINES.vllm);
    assert.equal(entry?.name, "Spark 2");
    assert.deepEqual(
      entry?.settings,
      { gpuStatusUrl: `${exporter.origin}/metrics/dcgm` },
      "An edit keeps the settings.",
    );
    assert.ok(!("machine" in (saved satisfies object)), "The summary that peers get has no machine settings.");
    assert.equal(reopened.localServers().find((server) => server.id === MACHINES.keyed)?.apiKey, KEY);
  });

  await check("Test connection: a slow machine answers in the longer time limit", async () => {
    const result = await Effect.runPromise(
      monitor.test({
        name: "Slow box",
        baseUrl: slow.baseUrl,
        apiKey: null,
        gpuStatusUrl: null,
        gpuStatusUsesKey: false,
      }),
    );
    assert.ok(isLocalModelServerTestResult(result), "The preload decoder accepts the result.");
    assert.equal(result.online, true);
    assert.equal(result.kind, "openai");
    assert.ok((result.responseMs ?? 0) >= SLOW_ANSWER_MS - 100, `The response time is real: ${result.responseMs} ms.`);
    assert.deepEqual(result.models, [{ id: "slow-model" }] satisfies DetectedModel[]);
    assert.ok(!store.list().some((summary) => summary.id === result.suggestedId));
    return { responseMs: result.responseMs, suggestedId: result.suggestedId };
  });

  await check("Test connection: a kept key goes only to the saved origin", async () => {
    const same = await Effect.runPromise(
      monitor.test({
        name: "",
        baseUrl: keyed.baseUrl,
        apiKey: null,
        savedProviderId: MACHINES.keyed,
        gpuStatusUrl: null,
        gpuStatusUsesKey: false,
      }),
    );
    assert.equal(same.online, true);
    const before = plain.seen.length;
    const other = await Effect.runPromise(
      monitor.test({
        name: "",
        baseUrl: plain.baseUrl,
        apiKey: null,
        savedProviderId: MACHINES.keyed,
        gpuStatusUrl: null,
        gpuStatusUsesKey: false,
      }),
    );
    assert.equal(other.online, true);
    assert.ok(
      plain.seen.slice(before).every((entry) => entry.authorization === null && entry.team === null),
      "Another origin gets no stored key and no stored header.",
    );
    const noKey = await Effect.runPromise(
      monitor.test({ name: "", baseUrl: keyed.baseUrl, apiKey: null, gpuStatusUrl: null, gpuStatusUsesKey: false }),
    );
    assert.equal(noKey.online, false);
    assert.equal(noKey.error, sourceText("error.localServer.keyNeeded", { host: host(keyed.origin) }));
    const wrongKey = await Effect.runPromise(
      monitor.test({
        name: "",
        baseUrl: keyed.baseUrl,
        apiKey: "sk-wrong",
        gpuStatusUrl: null,
        gpuStatusUsesKey: false,
      }),
    );
    assert.equal(wrongKey.error, sourceText("error.localServer.keyRefused", { host: host(keyed.origin) }));
  });

  await check("A host scan tries the three default ports and the typed port, with no key", async () => {
    assert.deepEqual(hostScanTargets("dgx1"), ["http://dgx1:11434/v1", "http://dgx1:1234/v1", "http://dgx1:8000/v1"]);
    assert.deepEqual(hostScanTargets("https://llm.example.com")?.[0], "https://llm.example.com/v1");
    assert.equal(hostScanTargets("user:secret@dgx1"), null);
    assert.equal(hostScanTargets("ftp://dgx1"), null);
    assert.equal(DEFAULT_MODEL_SERVERS.vllm.baseUrl, "http://127.0.0.1:8000/v1");
    const before = keyed.seen.length;
    const found = await Effect.runPromise(monitor.scanHost(`127.0.0.1:${new URL(vllm.origin).port}`));
    assert.ok(isLocalModelServerCandidates(found), "The preload decoder accepts the candidates.");
    const candidate = found.find((entry) => entry.baseUrl === vllm.baseUrl);
    assert.ok(candidate, "The typed port is found.");
    assert.equal(candidate.kind, "vllm");
    assert.equal(candidate.name, "vLLM (127.0.0.1)");
    assert.deepEqual(candidate.models, [{ id: "Qwen/Qwen2.5-Coder-32B-Instruct", contextWindow: 32_768 }]);
    assert.ok(!store.list().some((summary) => summary.id === candidate.id), "The suggested ID is free.");
    const locked = await Effect.runPromise(monitor.scanHost(`127.0.0.1:${new URL(keyed.origin).port}`));
    const needsKey = locked.find((entry) => entry.baseUrl === keyed.baseUrl);
    assert.equal(needsKey?.needsKey, true, "A server that needs a key is reported as found.");
    assert.ok(
      keyed.seen.slice(before).every((entry) => entry.authorization === null),
      "A scan sends no key.",
    );
    await assert.rejects(runCauseEffect(monitor.scanHost("not a host")), {
      message: sourceText("error.localServer.scanHostInvalid"),
    });
    return { candidate: { id: candidate.id, name: candidate.name, kind: candidate.kind } };
  });

  await check("The models of each machine are offered to agents, projects and chats", async () => {
    const offered: Record<string, string[]> = {};
    const openCode = JSON.parse(
      openCodeConfigEnv(
        OPENCODE_AGENT_CONFIG,
        customProvidersOn(() => store.configs(), "opencode"),
        null,
      ).OPENCODE_CONFIG_CONTENT ?? "{}",
    );
    const piEndpoints = customProvidersOn(() => store.configs(), "pi")();
    const pi = await runCauseEffect(createPiCustomEndpointExtension(piEndpoints, join(root, "pi")));
    assert.ok(pi, "Pi gets an endpoint extension.");
    const piPayload = Object.values(pi.environment).join("\n");
    await runCauseEffect(pi.close());
    for (const summary of store.list()) {
      const harness = summary.harness ?? "opencode";
      const ids = summary.models.map((model) => savedCustomModelId(summary.id, summary.harness, model.id));
      for (const [index, id] of ids.entries()) {
        assert.ok(isAgentModel(id), `${id} is a valid agent model.`);
        assert.ok(
          isProjectRuntime({ provider: harness, model: id, reasoningEffort: "medium" }),
          `${id} is a valid project default and chat model.`,
        );
        const modelId = summary.models[index]?.id ?? "";
        if (harness === "pi") {
          assert.ok(piPayload.includes(JSON.stringify(modelId)), `Pi gets ${modelId} of ${summary.id}.`);
          continue;
        }
        const provider = openCode.provider?.[summary.id];
        assert.equal(provider?.options?.baseURL, summary.baseUrl, `OpenCode gets the address of ${summary.id}.`);
        assert.ok(
          Object.entries(provider.models).some(([key, entry]) => `${summary.id}/${key}` === id || entry === modelId),
          `OpenCode gets ${modelId} of ${summary.id}.`,
        );
      }
      offered[summary.id] = ids;
    }
    assert.deepEqual(offered[MACHINES.ollama], ["spark-ollama/llama3.2:latest", "spark-ollama/qwen2.5-coder:7b"]);
    assert.deepEqual(offered[MACHINES.vllm], ["spark-vllm/Qwen/Qwen2.5-Coder-32B-Instruct"]);
    assert.equal(openCode.provider[MACHINES.keyed].options.apiKey, KEY, "The harness gets the key of its own machine.");
    assert.ok(piPayload.includes(lmStudio.baseUrl), "Pi gets the address of its machine.");
    return offered;
  });

  await check("The helper has one endpoint and is read-only", async () => {
    const answer = await fetch(helper.url);
    assert.equal(answer.status, 200);
    const body = await answer.json();
    assert.equal(body.gpus.length, 2);
    assert.equal(typeof body.checkedAt, "string");
    assert.equal((await fetch(`${helper.url}other`)).status, 404);
    assert.equal((await fetch(`${helper.url}metrics`)).status, 404);
    const post = await fetch(helper.url, { method: "POST", body: "{}" });
    assert.equal(post.status, 405);
    assert.equal(post.headers.get("allow"), "GET, HEAD");
    assert.equal((await fetch(helper.url, { method: "DELETE" })).status, 405);
  });

  await check("The helper reads nvidia-smi again on its interval", async () => {
    await writeFile(join(bin, "rows.txt"), `${NVIDIA_SMI_ROWS_LATER.join("\n")}\n`);
    await waitFor("The helper serves the new reading.", async () => {
      const body = await (await fetch(helper.url)).json();
      return body.gpus?.[0]?.utilization === 88 ? true : null;
    });
    const next = statusOf(await Effect.runPromise(monitor.refresh(MACHINES.ollama)), MACHINES.ollama);
    assert.equal(next.gpus?.[0]?.utilizationPercent, 88);
    assert.equal(next.gpus?.[0]?.memoryUsedBytes, 40_000 * MEBIBYTE);
  });

  await check("The helper runs with Node", async () => {
    const node = spawnSync("node", ["--version"], { encoding: "utf8" });
    if (node.status !== 0) return { skipped: "Node is not on the PATH." };
    const started = await startHelper("node", bin);
    try {
      const body = await (await fetch(started.url)).json();
      assert.equal(body.gpus.length, 2);
      return { node: node.stdout.trim() };
    } finally {
      await stopChild(started.child);
    }
  });

  await check("A known kind needs two requests for one reading", async () => {
    const before = ollama.seen.length;
    await Effect.runPromise(monitor.refresh(MACHINES.ollama));
    assert.deepEqual(
      ollama.seen
        .slice(before)
        .map((entry) => entry.path)
        .sort(),
      ["/api/ps", "/v1/models"],
    );
  });

  await check("Polling runs while a subscriber is visible, and is slower when hidden", async () => {
    timers.length = 0;
    const events: number[] = [];
    const watching = monitor.subscribe((list) => events.push(list.length), "visible");
    assert.equal(monitor.timerArmed(), true);
    const beforeVisible = ollama.seen.filter((entry) => entry.path === "/v1/models").length;
    await advance(TIMING.visibleMs);
    await advance(TIMING.visibleMs);
    const afterVisible = ollama.seen.filter((entry) => entry.path === "/v1/models").length;
    assert.equal(afterVisible - beforeVisible, 2, "One reading for each visible interval.");
    assert.ok(events.length > 0, "A subscriber gets the status event.");
    watching.setVisibility("hidden");
    const hiddenTimer = pendingTimers();
    assert.equal(hiddenTimer.length, 1, "One timer is pending.");
    await advance(TIMING.visibleMs * 3);
    assert.equal(
      ollama.seen.filter((entry) => entry.path === "/v1/models").length,
      afterVisible,
      "A hidden window does not use the visible interval.",
    );
    await advance(TIMING.hiddenMs);
    const afterHidden = ollama.seen.filter((entry) => entry.path === "/v1/models").length;
    assert.equal(afterHidden - afterVisible, 1, "One reading in the hidden interval.");
    watching.setVisibility("visible");
    watching.close();
    return { visibleReadings: afterVisible - beforeVisible, hiddenReadings: afterHidden - afterVisible };
  });

  await check("Polling stops when no subscriber is left", async () => {
    await settle();
    assert.equal(monitor.subscriberCount(), 0);
    assert.equal(monitor.timerArmed(), false);
    assert.equal(pendingTimers().length, 0, "No timer is pending.");
    const before = requestCount();
    await advance(20 * TIMING.hiddenMs);
    assert.equal(requestCount(), before, "No request is sent with no subscriber.");
    assert.equal(pendingTimers().length, 0);
  });

  await check("A machine that stays offline is read less often", async () => {
    const mainRequests = () => redirecting.seen.filter((entry) => entry.path === "/v1/models").length;
    const watching = monitor.subscribe(() => undefined, "visible");
    await Effect.runPromise(monitor.refresh(MACHINES.redirect));
    const before = mainRequests();
    const onlineBefore = plain.seen.length;
    for (let interval = 0; interval < 12; interval += 1) await advance(TIMING.visibleMs);
    watching.close();
    const offlineReadings = mainRequests() - before;
    assert.ok(offlineReadings >= 2 && offlineReadings <= 5, `The offline machine had ${offlineReadings} readings.`);
    assert.ok(plain.seen.length - onlineBefore >= 12, "An online machine keeps the normal interval.");
    return { intervals: 12, offlineReadings };
  });

  passed = checks.every((entry) => entry.passed);
} catch (error) {
  checks.push({
    name: "The test ran to its end",
    passed: false,
    error: error instanceof Error ? error.message : String(error),
  });
} finally {
  await Effect.runPromise(monitor.close());
  await Promise.all(children.map(stopChild));
  await Promise.all(servers.map((server) => server.close()));
  await rm(root, { recursive: true, force: true });
  const report = { passed: passed && checks.every((entry) => entry.passed), checks };
  await mkdir(OUT, { recursive: true });
  await writeFile(join(OUT, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = report.passed ? 0 : 1;
}
