import { spawn, spawnSync } from "node:child_process";
import { closeSync, openSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { connectChannelE2e } from "./channel-e2e-support";
import { writeFakeCodex } from "./dev-automation/bench-fake-codex";
import { readDevInstanceRecords } from "./dev-automation/instance-registry";

const ROOT = resolve(import.meta.dirname, "..");
const [script, ...scriptArguments] = process.argv.slice(2);
if (!script) throw new Error("Usage: bun scripts/fake-codex-app-run.ts <script> [arguments]");
const OUT = resolve(ROOT, ".codebot-build/fake-codex-app");

async function finishFirstRun(): Promise<void> {
  process.argv.push("--allow-mutations");
  const session = await connectChannelE2e("fake-codex-app-run");
  try {
    await session.page.evaluate(() => {
      window.localStorage.setItem("codebot:language-step-done", "true");
      return window.codebot.saveSetup({ preferredProvider: "codex", preferredModel: null });
    });
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
const fake = await writeFakeCodex(resolve(OUT, "fake-codex"), { deltaMs: 20, deltas: 12 });
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
  await finishFirstRun();
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
