import { type ChildProcess, spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { Logger } from "@codebot/logging";
import type { Page } from "playwright-core";
import { withoutElectronRuntimeFlags } from "../electron-spawn-env";
import { isSameWorktree, readDevStackRecords, removeDevStackRecord } from "./stack-registry";
import { stopWindowsProcessTree } from "./windows-process-table";

const API_READY_TIMEOUT_MS = 180_000;
const API_STOP_TIMEOUT_MS = 20_000;
export const BENCH_ACCOUNT_EMAIL = "codebot-bench@example.com";

export interface BenchAuthApi {
  url: string;
  stop: () => Promise<void>;
}

const wait = (milliseconds: number) => new Promise<void>((resolveWait) => setTimeout(resolveWait, milliseconds));

async function isLive(port: number): Promise<boolean> {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/health/live`, { signal: AbortSignal.timeout(1_000) });
    return response.ok;
  } catch {
    return false;
  }
}

function worktreeApiPort(projectRoot: string, supervisorPid?: number): number | null {
  for (const record of readDevStackRecords()) {
    if (!isSameWorktree(record, projectRoot) || !record.services.includes("api")) continue;
    if (supervisorPid !== undefined && record.supervisorPid !== supervisorPid) continue;
    const port = record.ports.find((entry) => entry.name === "api")?.port;
    if (port !== undefined) return port;
  }
  return null;
}

async function stopWindowsSupervisor(child: ChildProcess, logger: Logger): Promise<void> {
  const supervisorPid = child.pid;
  const running = await stopWindowsProcessTree(child, API_STOP_TIMEOUT_MS);
  if (running.length > 0) {
    logger.warn(`the Auth API left these processes running: ${running.join(", ")}. Run \`bun run dev:stop\`.`);
    return;
  }
  if (supervisorPid !== undefined) removeDevStackRecord({ supervisorPid });
}

function stopStarted(child: ChildProcess, logger: Logger): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  if (process.platform === "win32") return stopWindowsSupervisor(child, logger);
  return new Promise((resolveStop) => {
    const timer = setTimeout(() => {
      if (child.pid !== undefined) {
        try {
          process.kill(-child.pid, "SIGKILL");
        } catch {}
      }
      resolveStop();
    }, API_STOP_TIMEOUT_MS);
    child.once("exit", () => {
      clearTimeout(timer);
      resolveStop();
    });
    child.kill("SIGTERM");
  });
}

const API_START_ATTEMPTS = 3;

/** The first start after a build can stop on slow caches; a second start works. */
export async function ensureBenchAuthApi(
  projectRoot: string,
  logDirectory: string,
  logger: Logger,
): Promise<BenchAuthApi> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await startBenchAuthApi(projectRoot, logDirectory, logger);
    } catch (error) {
      if (attempt >= API_START_ATTEMPTS) throw error;
      logger.warn(`Auth API start ${attempt} failed (${error instanceof Error ? error.message : error}); trying again`);
    }
  }
}

async function startBenchAuthApi(projectRoot: string, logDirectory: string, logger: Logger): Promise<BenchAuthApi> {
  const running = worktreeApiPort(projectRoot);
  if (running !== null && (await isLive(running))) {
    logger.info(`using this worktree's Auth API on :${running}`);
    return { url: `http://127.0.0.1:${running}`, stop: async () => undefined };
  }
  await mkdir(logDirectory, { recursive: true });
  const logPath = join(logDirectory, "auth-api.log");
  const log = createWriteStream(logPath, { flags: "a", mode: 0o600 });
  logger.info(`starting the Auth API (log: ${logPath})`);
  const child = spawn("bun", ["scripts/dev-services.ts", "api"], {
    cwd: projectRoot,
    detached: process.platform !== "win32",
    stdio: ["ignore", "pipe", "pipe"],
    env: withoutElectronRuntimeFlags(process.env),
  });
  child.stdout?.pipe(log);
  child.stderr?.pipe(log);
  const supervisorPid = child.pid;
  if (supervisorPid === undefined) throw new Error("The Auth API supervisor did not start.");
  const deadline = Date.now() + API_READY_TIMEOUT_MS;
  for (;;) {
    if (child.exitCode !== null) throw new Error(`The Auth API stopped during startup. See ${logPath}.`);
    const port = worktreeApiPort(projectRoot, supervisorPid);
    if (port !== null && (await isLive(port))) {
      logger.info(`Auth API ready on :${port}`);
      return { url: `http://127.0.0.1:${port}`, stop: () => stopStarted(child, logger) };
    }
    if (Date.now() > deadline) {
      await stopStarted(child, logger);
      throw new Error(`The Auth API did not become ready in ${API_READY_TIMEOUT_MS} ms. See ${logPath}.`);
    }
    await wait(500);
  }
}

interface SignInResult {
  status: string;
  issue: string | null;
  signedInNow: boolean;
}

const SIGN_IN_EXPRESSION = `(async () => {
  const auth = window.codebot.auth;
  const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  let state = await auth.getState();
  for (let tries = 0; tries < 240 && (state.status === "loading" || state.status === "signing_in"); tries += 1) {
    await pause(250);
    state = await auth.getState();
  }
  if (state.status === "error") state = await auth.retry();
  return { status: state.status === "error" ? "signed_out" : state.status, issue: null, signedInNow: false };
})()`;

export async function signInBenchAccount(page: Page, logger: Logger): Promise<void> {
  const result = await page.evaluate<SignInResult>(SIGN_IN_EXPRESSION);
  logger.info(`account state: ${result.status}`);
}
