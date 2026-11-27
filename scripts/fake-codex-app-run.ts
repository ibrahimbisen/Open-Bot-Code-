import { spawn, spawnSync } from "node:child_process";
import { closeSync, openSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { connectChannelE2e } from "./channel-e2e-support";
import { FAKE_CODEX_MODEL, writeFakeCodex } from "./dev-automation/bench-fake-codex";
import { readDevInstanceRecords } from "./dev-automation/instance-registry";

const ROOT = resolve(import.meta.dirname, "..");
const RUNNER_FLAGS = ["--keep-first-run", "--markdown", "--steps", "--slash-commands"] as const;
type RunnerFlag = (typeof RUNNER_FLAGS)[number];
const isRunnerFlag = (value: string): value is RunnerFlag => RUNNER_FLAGS.some((flag) => flag === value);
const allArguments = process.argv.slice(2);
const scriptIndex = allArguments.findIndex((value) => !isRunnerFlag(value));
const runnerFlags = new Set(allArguments.slice(0, Math.max(0, scriptIndex)));
const [script, ...scriptArguments] = scriptIndex < 0 ? [] : allArguments.slice(scriptIndex);
if (!script)
  throw new Error(`Usage: bun scripts/fake-codex-app-run.ts [${RUNNER_FLAGS.join("] [")}] <script> [arguments]`);
const OUT = resolve(ROOT, ".codebot-build/fake-codex-app");

async function finishFirstRun(): Promise<void> {
  process.argv.push("--allow-mutations");
  const session = await connectChannelE2e("fake-codex-app-run");
  try {
    await session.page.evaluate((model) => {
      window.localStorage.setItem("codebot:language-step-done", "true");
      return window.codebot.saveSetup({ preferredProvider: "codex", preferredModel: model });
    }, FAKE_CODEX_MODEL);
  } finally {
    await session.close();
  }
}
const START_TIMEOUT_MS = 240_000;

function appInstances() {
  return readDevInstanceRecords().filter((record) => record.service === "app" && resolve(record.projectRoot) === ROOT);
}

async function waitForApp(isExited: () => boolean): Promise<void> {
  const deadline = Date.now() + START_TIMEOUT_MS;
  while (appInstances().length !== 1) {
    if (isExited()) throw new Error("The dev app exited before it registered.");
    if (Date.now() > deadline) throw new Error("Timed out while the dev app started.");
    await new Promise((done) => setTimeout(done, 500));
  }
  const port = appInstances()[0]?.remoteDebuggingPort;
  while (!(await debuggerAnswers(port))) {
    if (isExited()) throw new Error("The dev app exited before its debugger answered.");
    if (Date.now() > deadline) throw new Error("Timed out while the debugger started.");
    await new Promise((done) => setTimeout(done, 500));
  }
  await new Promise((done) => setTimeout(done, 5_000));
}

async function debuggerAnswers(port: number | undefined): Promise<boolean> {
  if (port === undefined) return false;
  try {
    return (await fetch(`http://127.0.0.1:${port}/json/version`)).ok;
  } catch {
    return false;
  }
}

function stopDevStack(): void {
  spawnSync("bun", ["run", "dev:stop"], { cwd: ROOT, stdio: "inherit", shell: process.platform === "win32" });
}

await mkdir(OUT, { recursive: true });
const fake = await writeFakeCodex(
  resolve(OUT, "fake-codex"),
  runnerFlags.has("--markdown")
    ? {
        deltaMs: 40,
        deltas: 70,
        corpus: "markdown",
        reasoning: runnerFlags.has("--steps"),
        commands: runnerFlags.has("--steps"),
        slashCommands: runnerFlags.has("--slash-commands"),
      }
    : {
        deltaMs: 250,
        deltas: 12,
        reasoning: runnerFlags.has("--steps"),
        commands: runnerFlags.has("--steps"),
        slashCommands: runnerFlags.has("--slash-commands"),
      },
);
const log = openSync(resolve(OUT, "dev.log"), "w");
let exited = false;
const dev = spawn("bun", ["run", "dev"], {
  cwd: ROOT,
  env: { ...process.env, ...fake.environment, CODEBOT_DEV_REMOTE_ROLE: "none" },
  stdio: ["ignore", log, log],
  shell: process.platform === "win32",
});
dev.on("exit", () => {
  exited = true;
});

let code = 1;
try {
  await waitForApp(() => exited);
  if (!runnerFlags.has("--keep-first-run")) await finishFirstRun();
  const result = spawnSync("bun", [script, "--allow-mutations", ...scriptArguments], {
    cwd: ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  code = result.status ?? 1;
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
} finally {
  stopDevStack();
  closeSync(log);
}
process.exit(code);
