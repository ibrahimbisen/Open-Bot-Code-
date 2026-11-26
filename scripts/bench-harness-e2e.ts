import { type ChildProcess, spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { isDynamicRecord, isNumber } from "@codebot/contracts/runtime-values";
import { cliSpawnTarget } from "../src/backend/cli";
import { writeFakeCodex } from "./dev-automation/bench-fake-codex";
import {
  type ChromiumProcessType,
  classifyChromiumProcess,
  classifyMemoryProcess,
  type MemoryProcessKind,
  type ProcessTableRow,
  summarizeMemory,
} from "./dev-automation/cpu-sampling";
import { readProcessTree } from "./dev-automation/process-table";
import { stopWindowsProcessTree } from "./dev-automation/windows-process-table";
import { resolvePackageBin } from "./package-bin";

const SCRIPT = fileURLToPath(import.meta.url);
const PROJECT_ROOT = resolve(import.meta.dirname, "..");
const OUT = join(PROJECT_ROOT, ".codebot-build", "bench-harness-e2e");
const RUNTIME = process.versions.bun === undefined ? "node" : "bun";
const OTHER_RUNTIME_FLAG = "--process-table-only";

const BYTES_PER_KB = 1_024;
const BYTES_PER_MB = 1_024 * 1_024;
const WORKER_MARKER = "bench-harness-worker";
const WORKER_FILE = `${WORKER_MARKER}.cjs`;
const TEMPORARY_PREFIX = process.platform === "win32" ? "codebot bench harness e2e " : "codebot-bench-harness-e2e-";
const GRANDCHILD_MARKER = "bench-harness-grandchild";
const WORKER_HELD_BYTES = 96 * BYTES_PER_MB;
const WORKER_BURN_SECONDS = 1.5;
const CPU_CLOCK_STEP_SECONDS = 1.1;
const CPU_READ_LAG_SECONDS = 0.6;
const MEMORY_TOLERANCE = 0.35;
const MAX_PLAUSIBLE_RSS_BYTES = 8 * 1_024 * BYTES_PER_MB;
const SAMPLE_COUNT = 10;
const MAX_SAMPLE_MS = 250;
const STEP_TIMEOUT_MS = 60_000;

interface Check {
  name: string;
  passed: boolean;
  detail: string;
}

const checks: Check[] = [];

function check(name: string, passed: boolean, detail: string): void {
  checks.push({ name, passed, detail });
}

function withTimeout<T>(what: string, work: Promise<T>): Promise<T> {
  return new Promise((resolveWork, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${what}.`)), STEP_TIMEOUT_MS);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolveWork(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

const WORKER_SOURCE = `
const { spawn } = require("node:child_process");
const held = Buffer.alloc(${WORKER_HELD_BYTES}, 1);
const grandchild = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)", "${GRANDCHILD_MARKER}"], { stdio: "ignore" });
const burn = () => {
  const start = process.cpuUsage();
  for (;;) {
    const used = process.cpuUsage(start);
    if ((used.user + used.system) / 1e6 >= ${WORKER_BURN_SECONDS}) return;
  }
};
const report = () => {
  const cpu = process.cpuUsage();
  const state = { grandchild: grandchild.pid, cpuSeconds: (cpu.user + cpu.system) / 1e6, rssBytes: process.memoryUsage().rss, held: held.length };
  process.stdout.write(JSON.stringify(state) + "\\n");
};
burn();
report();
process.stdin.on("data", () => {
  burn();
  report();
});
`;

interface WorkerState {
  grandchild: number;
  cpuSeconds: number;
  rssBytes: number;
}

function parseWorkerState(line: string): WorkerState {
  const value = JSON.parse(line);
  if (!isDynamicRecord(value)) throw new Error("The worker did not report its state.");
  const { grandchild, cpuSeconds, rssBytes } = value;
  if (!isNumber(grandchild) || !isNumber(cpuSeconds) || !isNumber(rssBytes)) {
    throw new Error("The worker state is incomplete.");
  }
  return { grandchild, cpuSeconds, rssBytes };
}

interface Worker {
  child: ChildProcess;
  nextState: () => Promise<WorkerState>;
}

async function startWorker(directory: string): Promise<Worker> {
  const file = join(directory, WORKER_FILE);
  await writeFile(file, WORKER_SOURCE);
  const child = spawn(process.execPath, [file], {
    stdio: ["pipe", "pipe", "inherit"],
    detached: process.platform !== "win32",
  });
  const lines = createInterface({ input: child.stdout ?? process.stdin })[Symbol.asyncIterator]();
  return {
    child,
    nextState: async () => {
      const line = await withTimeout("the worker state", lines.next());
      if (line.done) throw new Error("The worker stopped before it reported its state.");
      return parseWorkerState(line.value);
    },
  };
}

function isRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function waitUntilStopped(pids: number[]): Promise<boolean> {
  const deadline = Date.now() + STEP_TIMEOUT_MS;
  while (pids.some(isRunning)) {
    if (Date.now() > deadline) return false;
    await new Promise((resolveWait) => setTimeout(resolveWait, 25));
  }
  return true;
}

async function stopWorker(worker: Worker, grandchild: number): Promise<void> {
  const pid = worker.child.pid ?? 0;
  if (process.platform === "win32") {
    const left = await stopWindowsProcessTree(worker.child, STEP_TIMEOUT_MS);
    const stopped = left.length === 0 && (await waitUntilStopped([pid, grandchild]));
    check("stop: the process tree of a child stops on Windows", stopped, `left running: ${left.join(", ") || "none"}`);
    return;
  }
  process.kill(-pid, "SIGKILL");
  const stopped = await waitUntilStopped([pid, grandchild]);
  check("stop: the process group of a child stops", stopped, `worker ${pid}, grandchild ${grandchild}`);
}

function megabytes(bytes: number): string {
  return `${(bytes / BYTES_PER_MB).toFixed(1)} MB`;
}

function ownCpuSeconds(): number {
  const usage = process.cpuUsage();
  return (usage.user + usage.system) / 1e6;
}

function cpuMatches(read: number, reported: number): boolean {
  return read >= reported - CPU_CLOCK_STEP_SECONDS && read <= reported + CPU_READ_LAG_SECONDS;
}

function memoryMatches(readBytes: number, reportedBytes: number): boolean {
  return Math.abs(readBytes - reportedBytes) <= reportedBytes * MEMORY_TOLERANCE;
}

function checkOwnRow(rows: ProcessTableRow[]): void {
  const own = rows.find((row) => row.pid === process.pid);
  const rssBytes = (own?.rssKb ?? 0) * BYTES_PER_KB;
  const reported = process.memoryUsage().rss;
  check(
    "process table: the current process has plausible memory",
    own !== undefined && memoryMatches(rssBytes, reported) && rssBytes < MAX_PLAUSIBLE_RSS_BYTES,
    `read ${megabytes(rssBytes)}, the runtime reports ${megabytes(reported)}`,
  );
  const cpuSeconds = own?.cpuSeconds ?? -1;
  check(
    "process table: the current process has plausible CPU time",
    cpuMatches(cpuSeconds, ownCpuSeconds()),
    `read ${cpuSeconds.toFixed(2)} s, the runtime reports ${ownCpuSeconds().toFixed(2)} s`,
  );
  if (process.platform === "win32") {
    check(
      "process table: Windows rows have private memory",
      (own?.privateKb ?? 0) > 0,
      `private ${megabytes((own?.privateKb ?? 0) * BYTES_PER_KB)}`,
    );
  }
}

function checkWorkerRow(rows: ProcessTableRow[], workerPid: number, state: WorkerState): ProcessTableRow | undefined {
  const worker = rows.find((row) => row.pid === workerPid);
  check(
    "process table: a spawned child is a child of the current process",
    worker?.ppid === process.pid && worker.command.includes(WORKER_MARKER),
    `ppid ${worker?.ppid ?? "none"}, expected ${process.pid}`,
  );
  const rssBytes = (worker?.rssKb ?? 0) * BYTES_PER_KB;
  check(
    "process table: the child has plausible memory",
    rssBytes >= WORKER_HELD_BYTES && memoryMatches(rssBytes, state.rssBytes),
    `read ${megabytes(rssBytes)}, the child holds ${megabytes(WORKER_HELD_BYTES)} and reports ${megabytes(state.rssBytes)}`,
  );
  check(
    "process table: the child has plausible CPU time",
    cpuMatches(worker?.cpuSeconds ?? -1, state.cpuSeconds),
    `read ${(worker?.cpuSeconds ?? -1).toFixed(2)} s, the child reports ${state.cpuSeconds.toFixed(2)} s`,
  );
  const grandchild = rows.find((row) => row.pid === state.grandchild);
  check(
    "process table: a grandchild is in the tree",
    grandchild?.ppid === workerPid && grandchild.command.includes(GRANDCHILD_MARKER),
    `ppid ${grandchild?.ppid ?? "none"}, expected ${workerPid}`,
  );
  return worker;
}

async function checkSampleCost(): Promise<void> {
  const started = performance.now();
  let rows = 0;
  for (let index = 0; index < SAMPLE_COUNT; index += 1) rows = (await readProcessTree(process.pid)).length;
  const each = (performance.now() - started) / SAMPLE_COUNT;
  check(
    "process table: one sample is cheap",
    each < MAX_SAMPLE_MS,
    `${each.toFixed(1)} ms for each sample of ${rows} processes`,
  );
}

async function checkProcessTable(): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), TEMPORARY_PREFIX));
  const worker = await startWorker(directory);
  const workerPid = worker.child.pid ?? 0;
  let grandchild = 0;
  try {
    const first = await worker.nextState();
    grandchild = first.grandchild;
    const rows = await readProcessTree(process.pid);
    checkOwnRow(rows);
    const before = checkWorkerRow(rows, workerPid, first);
    worker.child.stdin?.write("burn\n");
    const second = await worker.nextState();
    const after = (await readProcessTree(process.pid)).find((row) => row.pid === workerPid);
    const used = (after?.cpuSeconds ?? 0) - (before?.cpuSeconds ?? 0);
    const reported = second.cpuSeconds - first.cpuSeconds;
    check(
      "process table: CPU time grows in seconds",
      used >= reported - CPU_CLOCK_STEP_SECONDS && used <= reported + CPU_CLOCK_STEP_SECONDS,
      `read ${used.toFixed(2)} s more, the child reports ${reported.toFixed(2)} s more`,
    );
    await checkSampleCost();
  } finally {
    await stopWorker(worker, grandchild);
    await rm(directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  }
}

type SamplePlatform = "win32" | "darwin" | "linux";

interface CommandSample {
  platform: SamplePlatform;
  command: string;
  chromium: ChromiumProcessType;
  memory: MemoryProcessKind;
}

const WINDOWS_ELECTRON = '"C:\\Users\\A B\\app\\node_modules\\electron\\dist\\electron.exe"';
const MAC_ELECTRON = "/Users/a/app/node_modules/electron/dist/Electron.app/Contents";
const LINUX_ELECTRON = "/home/a/app/node_modules/electron/dist/electron";

const COMMAND_SAMPLES: CommandSample[] = [
  {
    platform: "win32",
    command: `${WINDOWS_ELECTRON} --inspect=127.0.0.1:9449 "C:\\Users\\A B\\app"`,
    chromium: "main",
    memory: "main",
  },
  {
    platform: "win32",
    command: `${WINDOWS_ELECTRON} --type=renderer --user-data-dir="C:\\Users\\A B\\AppData\\Roaming\\CodeBot Dev" --app-path="C:\\Users\\A B\\app" --lang=en-US /prefetch:1`,
    chromium: "renderer",
    memory: "renderer",
  },
  {
    platform: "win32",
    command: `${WINDOWS_ELECTRON} --type=gpu-process --user-data-dir="C:\\Users\\A B\\AppData\\Roaming\\CodeBot Dev" /prefetch:2`,
    chromium: "gpu",
    memory: "gpu",
  },
  {
    platform: "win32",
    command: `${WINDOWS_ELECTRON} --type=utility --utility-sub-type=network.mojom.NetworkService --lang=en-US /prefetch:11`,
    chromium: "network",
    memory: "network",
  },
  {
    platform: "win32",
    command: `${WINDOWS_ELECTRON} --type=utility --utility-sub-type=node.mojom.NodeService --lang=en-US`,
    chromium: "utility",
    memory: "utility",
  },
  {
    platform: "win32",
    command: `${WINDOWS_ELECTRON} --type=crashpad-handler --user-data-dir="C:\\Users\\A B\\AppData\\Roaming\\CodeBot Dev" /prefetch:4`,
    chromium: "crashpad",
    memory: "crashpad",
  },
  {
    platform: "win32",
    command:
      '"C:\\Users\\A B\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Anthropic.ClaudeCode\\claude.exe" --output-format stream-json',
    chromium: "other",
    memory: "provider",
  },
  {
    platform: "win32",
    command:
      "C:\\Users\\AB\\AppData\\Roaming\\npm\\node_modules\\@openai\\codex\\vendor\\x86_64-pc-windows-msvc\\codex\\CODEX.EXE app-server",
    chromium: "other",
    memory: "provider",
  },
  {
    platform: "win32",
    command: 'C:\\WINDOWS\\system32\\cmd.exe /d /s /c ""C:\\Users\\A B\\bench\\fake-codex\\codex.cmd" app-server"',
    chromium: "other",
    memory: "provider",
  },
  {
    platform: "win32",
    command: '"C:\\Program Files\\nodejs\\node.exe"  "C:\\Users\\A B\\bench\\fake-codex\\codex" app-server',
    chromium: "other",
    memory: "provider",
  },
  {
    platform: "win32",
    command:
      '"C:\\Program Files\\nodejs\\node.exe" "C:\\Users\\A B\\AppData\\Roaming\\npm\\node_modules\\@openai\\codex\\bin\\codex.js" app-server',
    chromium: "other",
    memory: "provider",
  },
  {
    platform: "win32",
    command: 'C:\\WINDOWS\\system32\\cmd.exe /d /s /c ""C:\\Users\\A B\\tools\\backup.cmd" codex"',
    chromium: "other",
    memory: "other",
  },
  {
    platform: "win32",
    command: "\\??\\C:\\WINDOWS\\system32\\conhost.exe 0x4",
    chromium: "other",
    memory: "other",
  },
  {
    platform: "win32",
    command: '"C:\\Users\\A B\\app\\node_modules\\@esbuild\\win32-x64\\esbuild.exe" --service=0.25.0 --ping',
    chromium: "other",
    memory: "dev-tooling",
  },
  {
    platform: "win32",
    command: '"C:\\Program Files\\nodejs\\node.exe" "C:\\Users\\A B\\app\\node_modules\\vite\\bin\\vite.js" dev',
    chromium: "other",
    memory: "dev-tooling",
  },
  {
    platform: "win32",
    command: '"C:\\Users\\A B\\app\\node_modules\\workerd\\bin\\workerd.exe" serve --binary --experimental',
    chromium: "other",
    memory: "dev-tooling",
  },
  {
    platform: "win32",
    command: '"C:\\Users\\A B\\tools\\bun.exe" scripts/dev-services.ts api',
    chromium: "other",
    memory: "dev-tooling",
  },
  { platform: "win32", command: "C:\\WINDOWS\\system32\\notepad.exe", chromium: "other", memory: "other" },
  {
    platform: "darwin",
    command: `${MAC_ELECTRON}/MacOS/Electron --inspect=127.0.0.1:9449 /Users/a/app`,
    chromium: "main",
    memory: "main",
  },
  {
    platform: "darwin",
    command: `${MAC_ELECTRON}/Frameworks/Electron Helper (Renderer).app/Contents/MacOS/Electron Helper (Renderer) --type=renderer --user-data-dir=/Users/a/Library/Application Support/CodeBot Dev --lang=en-US`,
    chromium: "renderer",
    memory: "renderer",
  },
  {
    platform: "darwin",
    command: `${MAC_ELECTRON}/Frameworks/Electron Helper (GPU).app/Contents/MacOS/Electron Helper (GPU) --type=gpu-process --gpu-preferences=UAAAAAAAAAAg`,
    chromium: "gpu",
    memory: "gpu",
  },
  {
    platform: "darwin",
    command: `${MAC_ELECTRON}/Frameworks/Electron Helper.app/Contents/MacOS/Electron Helper --type=utility --utility-sub-type=network.mojom.NetworkService --lang=en-US`,
    chromium: "network",
    memory: "network",
  },
  {
    platform: "darwin",
    command: "/Users/a/.local/bin/claude --output-format stream-json",
    chromium: "other",
    memory: "provider",
  },
  { platform: "darwin", command: "node /opt/homebrew/bin/codex app-server", chromium: "other", memory: "provider" },
  {
    platform: "darwin",
    command: "/Users/a/app/node_modules/@esbuild/darwin-arm64/bin/esbuild --service=0.25.0 --ping",
    chromium: "other",
    memory: "dev-tooling",
  },
  { platform: "darwin", command: "/usr/sbin/cfprefsd agent", chromium: "other", memory: "other" },
  {
    platform: "linux",
    command: `${LINUX_ELECTRON} --inspect=127.0.0.1:9449 /home/a/app`,
    chromium: "main",
    memory: "main",
  },
  {
    platform: "linux",
    command: `${LINUX_ELECTRON} --type=zygote --no-zygote-sandbox`,
    chromium: "other",
    memory: "other",
  },
  {
    platform: "linux",
    command: `${LINUX_ELECTRON} --type=renderer --crashpad-handler-pid=4242 --enable-crash-reporter --lang=en-US`,
    chromium: "renderer",
    memory: "renderer",
  },
  {
    platform: "linux",
    command: `${LINUX_ELECTRON} --type=utility --utility-sub-type=audio.mojom.AudioService --lang=en-US`,
    chromium: "utility",
    memory: "utility",
  },
  { platform: "linux", command: "/home/a/.opencode/bin/opencode serve", chromium: "other", memory: "provider" },
  { platform: "linux", command: "bun /home/a/.bun/bin/grok --print", chromium: "other", memory: "provider" },
  {
    platform: "linux",
    command: "node /home/a/app/node_modules/.bin/vite dev",
    chromium: "other",
    memory: "dev-tooling",
  },
  { platform: "linux", command: "bun --watch src/index.ts", chromium: "other", memory: "dev-tooling" },
  { platform: "linux", command: "/usr/bin/dbus-daemon --session", chromium: "other", memory: "other" },
];

function checkCommandSamples(): void {
  for (const platform of ["win32", "darwin", "linux"] as const) {
    const samples = COMMAND_SAMPLES.filter((sample) => sample.platform === platform);
    const wrong = samples.filter(
      (sample) =>
        classifyChromiumProcess(sample.command, platform) !== sample.chromium ||
        classifyMemoryProcess(sample.command, platform) !== sample.memory,
    );
    check(
      `classification: ${platform} command lines`,
      wrong.length === 0,
      wrong.length === 0
        ? `${samples.length} command lines`
        : wrong
            .map(
              (sample) =>
                `${sample.command} gave ${classifyChromiumProcess(sample.command, platform)}/${classifyMemoryProcess(sample.command, platform)}, expected ${sample.chromium}/${sample.memory}`,
            )
            .join("; "),
    );
  }
}

function row(pid: number, ppid: number, rssKb: number, command: string): ProcessTableRow {
  return { pid, ppid, rssKb, cpuSeconds: 0, command };
}

function describeTree(rows: ProcessTableRow[], platform: SamplePlatform): string {
  return summarizeMemory(rows, "sample", platform)
    .processes.map((process) => `${process.name}=${process.kind}`)
    .join(" ");
}

function checkTreeSamples(): void {
  const windows = describeTree(
    [
      row(100, 1, 4_000, `${WINDOWS_ELECTRON} "C:\\Users\\A B\\app"`),
      row(110, 100, 3_000, 'C:\\WINDOWS\\system32\\cmd.exe /d /s /c ""C:\\Users\\A B\\bench\\codex.cmd" app-server"'),
      row(111, 110, 2_000, "\\??\\C:\\WINDOWS\\system32\\conhost.exe 0x4"),
      row(112, 110, 1_000, '"C:\\Program Files\\nodejs\\node.exe"  "C:\\Users\\A B\\bench\\codex" app-server'),
    ],
    "win32",
  );
  check(
    "classification: a Windows provider tree",
    windows === "electron=main cmd=provider conhost=provider node=provider",
    windows,
  );
  const linux = describeTree(
    [
      row(100, 1, 4_000, `${LINUX_ELECTRON} /home/a/app`),
      row(110, 100, 3_000, "node /home/a/.local/bin/codex app-server"),
      row(111, 110, 2_000, "/usr/bin/rg --files"),
    ],
    "linux",
  );
  check("classification: a Linux provider tree", linux === "electron=main node=provider rg=provider", linux);
}

function nextLine(lines: AsyncIterator<string>, what: string): Promise<string> {
  return withTimeout(
    what,
    lines.next().then((line) => {
      if (line.done) throw new Error(`The fake Codex stopped before ${what}.`);
      return line.value;
    }),
  );
}

async function readVersion(executable: string): Promise<string> {
  const target = cliSpawnTarget(executable, ["--version"]);
  const child = spawn(target.command, target.args, {
    stdio: ["ignore", "pipe", "inherit"],
    windowsHide: true,
    windowsVerbatimArguments: target.windowsVerbatimArguments,
  });
  let output = "";
  child.stdout?.on("data", (chunk: Buffer) => {
    output += chunk.toString("utf8");
  });
  await withTimeout("the fake Codex version", new Promise((resolveExit) => child.once("exit", resolveExit)));
  return output.trim();
}

async function checkFakeCodex(): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), TEMPORARY_PREFIX));
  const codex = await writeFakeCodex(join(directory, "fake-codex"), { deltaMs: 5, deltas: 6 });
  const executable = codex.environment.CODEBOT_CODEX_PATH ?? "";
  try {
    const version = await readVersion(executable);
    check("fake Codex: it reports a version", version === "codex-cli 0.160.1", version);
    const target = cliSpawnTarget(executable, ["app-server"]);
    const child = spawn(target.command, target.args, {
      env: { ...process.env, ...codex.environment },
      stdio: ["pipe", "pipe", "inherit"],
      windowsHide: true,
      windowsVerbatimArguments: target.windowsVerbatimArguments,
    });
    const exited = new Promise((resolveExit) => child.once("exit", resolveExit));
    const lines = createInterface({ input: child.stdout ?? process.stdin })[Symbol.asyncIterator]();
    const send = (message: unknown): void => {
      child.stdin?.write(`${JSON.stringify(message)}\n`);
    };
    send({ id: 1, method: "initialize", params: { clientInfo: { name: "bench-harness-e2e" } } });
    await nextLine(lines, "the answer to initialize");
    send({ id: 2, method: "turn/start", params: { threadId: "thread-1" } });
    let completed = "";
    while (!completed.includes('"turn/completed"')) completed = await nextLine(lines, "the end of the turn");
    const rows = await readProcessTree(child.pid ?? 0);
    const kinds = summarizeMemory(rows, "fake-codex").processes.map((process) => `${process.name}=${process.kind}`);
    check(
      "fake Codex: its processes count as provider processes",
      kinds.length > 0 && kinds.every((kind) => kind.endsWith("=provider")),
      kinds.join(" ") || "no process",
    );
    child.stdin?.end();
    await withTimeout("the fake Codex to stop", exited);
    const log = await readFile(codex.logPath, "utf8");
    check(
      "fake Codex: it streams a turn and stops when its input ends",
      completed.includes('"status":"completed"') && log.includes('"turnEnded"') && log.includes('"deltas":6'),
      `exit code ${child.exitCode}`,
    );
  } finally {
    await rm(directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  }
}

interface RuntimeReport {
  runtime: string;
  checks: Check[];
}

function parseRuntimeReport(output: string): RuntimeReport {
  const value = JSON.parse(output);
  if (!isDynamicRecord(value) || typeof value.runtime !== "string" || !Array.isArray(value.checks)) {
    throw new Error("The other runtime did not print a report.");
  }
  const parsed: Check[] = [];
  for (const entry of value.checks) {
    if (!isDynamicRecord(entry)) continue;
    const { name, passed, detail } = entry;
    if (typeof name === "string" && typeof passed === "boolean" && typeof detail === "string") {
      parsed.push({ name, passed, detail });
    }
  }
  return { runtime: value.runtime, checks: parsed };
}

async function checkOtherRuntime(): Promise<void> {
  const [command, args] =
    RUNTIME === "bun"
      ? [resolvePackageBin(PROJECT_ROOT, "tsx"), [SCRIPT, OTHER_RUNTIME_FLAG]]
      : ["bun", [SCRIPT, OTHER_RUNTIME_FLAG]];
  const target = cliSpawnTarget(command, args);
  const child = spawn(target.command, target.args, {
    cwd: PROJECT_ROOT,
    stdio: ["ignore", "pipe", "inherit"],
    windowsHide: true,
    windowsVerbatimArguments: target.windowsVerbatimArguments,
  });
  let output = "";
  child.stdout?.on("data", (chunk: Buffer) => {
    output += chunk.toString("utf8");
  });
  await withTimeout("the other runtime", new Promise((resolveExit) => child.once("exit", resolveExit)));
  const report = parseRuntimeReport(output);
  check(
    `process table: it also runs under ${report.runtime}`,
    report.runtime !== RUNTIME && report.checks.length > 0,
    `${report.checks.length} checks`,
  );
  for (const entry of report.checks) checks.push({ ...entry, name: `${report.runtime}: ${entry.name}` });
}

async function guarded(name: string, work: () => Promise<void>): Promise<void> {
  try {
    await work();
  } catch (error) {
    check(name, false, error instanceof Error ? error.message : String(error));
  }
}

if (process.argv.includes(OTHER_RUNTIME_FLAG)) {
  await guarded("process table: the checks ran", checkProcessTable);
  process.stdout.write(`${JSON.stringify({ runtime: RUNTIME, checks })}\n`);
  process.exit(0);
}

await guarded("process table: the checks ran", checkProcessTable);
checkCommandSamples();
checkTreeSamples();
await guarded("fake Codex: the checks ran", checkFakeCodex);
await guarded("process table: the other runtime ran", checkOtherRuntime);

const report = {
  passed: checks.every((entry) => entry.passed),
  platform: process.platform,
  runtime: RUNTIME,
  checks,
};
await mkdir(OUT, { recursive: true });
await writeFile(join(OUT, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
process.exit(report.passed ? 0 : 1);
