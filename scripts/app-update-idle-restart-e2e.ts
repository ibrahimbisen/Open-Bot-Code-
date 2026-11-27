import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { UpdatePreference, UpdateStatus } from "@codebot/contracts/ipc";
import { translateFor } from "@codebot/i18n";
import { createCodeBotLogger } from "@codebot/logging";
import { Effect } from "effect";
import { RequestedUpdate } from "../src/main/requested-update";
import {
  readUpdatePreference,
  UPDATE_PREFERENCE_FILE,
  writeUpdatePreference,
} from "../src/main/update-preference-store";
import { checkRestartReadiness } from "../src/main/update-readiness";
import { UpdateService } from "../src/main/update-service";
import { FeedProbeUpdater, INSTALLER, manifest } from "./app-update-feed-probe";

const logger = createCodeBotLogger("app-update-idle-restart-e2e");
const OUT = resolve(import.meta.dirname, "../.codebot-build/app-update-idle-restart");
const WAIT_MS = 20_000;
const checks: { name: string; passed: boolean; detail?: string }[] = [];

async function check(name: string, action: () => Promise<void>): Promise<void> {
  try {
    await action();
    checks.push({ name, passed: true });
    logger.info(`ok: ${name}`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    checks.push({ name, passed: false, detail });
    logger.error(`FAILED: ${name}: ${detail}`);
  }
}

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const served = new Map<string, string>([
  ["/feed/latest.yml", manifest("0.2.0")],
  ["/feed/CodeBot-0.2.0-x64.exe", INSTALLER.toString()],
]);
const server = Bun.serve({
  port: 0,
  hostname: "127.0.0.1",
  fetch(request) {
    const body = served.get(new URL(request.url).pathname);
    return body === undefined ? new Response("not found", { status: 404 }) : new Response(body);
  },
});
const feedUrl = `http://127.0.0.1:${server.port}/feed/`;
const preferenceFile = join(OUT, UPDATE_PREFERENCE_FILE);

async function until<T>(label: string, read: () => T, ready: (value: T) => boolean): Promise<T> {
  const deadline = Date.now() + WAIT_MS;
  for (;;) {
    const value = read();
    if (ready(value)) return value;
    if (Date.now() > deadline) throw new Error(`Timed out: ${label}. Last value: ${JSON.stringify(value)}`);
    await new Promise((next) => setTimeout(next, 10));
  }
}

interface Host {
  updater: FeedProbeUpdater;
  service: UpdateService;
  requested: RequestedUpdate;
  agentTurns: string[];
  readinessChecks: () => number;
  stop: () => Promise<void>;
}

async function startHost(folder: string): Promise<Host> {
  const updater = new FeedProbeUpdater(join(OUT, folder), "0.1.0", OUT);
  updater.setFeedURL({ provider: "generic", url: feedUrl });
  const service = new UpdateService(updater, {
    currentVersion: "0.1.0",
    enabled: true,
    feedConfigured: true,
    autoDownload: true,
    beforeInstall: async () => undefined,
    platform: "win32",
    initialCheckDelayMs: 0,
  });
  const agentTurns: string[] = [];
  let readinessChecks = 0;
  const preference: UpdatePreference = await Effect.runPromise(readUpdatePreference(preferenceFile));
  const requested = new RequestedUpdate({
    updater: service,
    describeReadiness: () => {
      readinessChecks += 1;
      return checkRestartReadiness({
        agentWork: [...agentTurns],
        hostBlockers: [],
        activeBrowserControls: 0,
        activeFileTransfers: false,
        updaterBusy: false,
        initializationPending: false,
      });
    },
    preference,
    savePreference: (change) => writeUpdatePreference(preferenceFile, change),
    log: (message) => logger.info(message),
    pollMs: 20,
    graceMs: 0,
    random: () => 0,
  });
  return {
    updater,
    service,
    requested,
    agentTurns,
    readinessChecks: () => readinessChecks,
    stop: async () => {
      await Effect.runPromise(requested.dispose());
      await Effect.runPromise(service.stop());
    },
  };
}

const ready = (status: UpdateStatus) => status.phase === "ready";

try {
  await check("the settings row has its English text", async () => {
    const t = translateFor("en");
    assert.equal(t("appUpdate.autoRestart.title"), "Restart automatically when idle");
  });

  await check("with the option off, a downloaded update waits for the user and never restarts by itself", async () => {
    const preference = await Effect.runPromise(readUpdatePreference(preferenceFile));
    assert.equal(preference.autoInstall, false, "the option is off by default");
    const host = await startHost("off");
    try {
      host.service.start();
      const status = await until("ready", () => host.service.getStatus(), ready);
      assert.equal(status.availableVersion, "0.2.0");
      assert.deepEqual(host.updater.downloaded, ["CodeBot-0.2.0-x64.exe"], "downloaded in the background");
      const settle = Date.now() + 500;
      await until(
        "a quiet half second",
        () => Date.now(),
        (now) => now >= settle,
      );
      assert.equal(host.updater.installs, 0, "no restart");
      assert.equal(host.service.getStatus().scheduledRestart, undefined, "no restart is scheduled");
      assert.equal(host.requested.snapshot().autoInstall, false);
    } finally {
      await host.stop();
    }
  });

  await check("switching the option on saves it and schedules a restart that waits while an agent works", async () => {
    const host = await startHost("on");
    try {
      host.agentTurns.push("agent-turn");
      host.service.start();
      await until("ready", () => host.service.getStatus(), ready);
      const saved = await Effect.runPromise(host.requested.setPreference({ autoInstall: true }));
      assert.equal(saved.autoInstall, true);
      const file = await Effect.runPromise(readUpdatePreference(preferenceFile));
      assert.equal(file.autoInstall, true, "the option is saved to disk");
      const waiting = await until(
        "the restart waits for the agent",
        () => host.service.getStatus().scheduledRestart,
        (restart) => restart?.waitingFor.includes("agent-turn") === true,
      );
      assert.equal(waiting?.mode, "when-idle");
      assert.equal(waiting?.requestedBy, null, "the automatic install asked for it");
      const polls = host.readinessChecks();
      await until(
        "more idle checks",
        () => host.readinessChecks(),
        (count) => count >= polls + 5,
      );
      assert.equal(host.updater.installs, 0, "no restart while the agent works");
      host.agentTurns.length = 0;
      await until(
        "the restart",
        () => host.updater.installs,
        (count) => count === 1,
      );
      assert.equal(host.service.getStatus().phase, "installing");
    } finally {
      await host.stop();
    }
  });

  await check(
    "after an app restart the saved option restarts into the next update as soon as the app is idle",
    async () => {
      const host = await startHost("restarted");
      try {
        assert.equal(host.requested.snapshot().autoInstall, true, "the option is read back from disk");
        host.service.start();
        await until(
          "the restart",
          () => host.updater.installs,
          (count) => count === 1,
        );
      } finally {
        await host.stop();
      }
    },
  );

  await check("cancelling the automatic restart keeps that version until the user restarts", async () => {
    const host = await startHost("cancel");
    try {
      host.agentTurns.push("agent-turn");
      host.service.start();
      await until(
        "a waiting restart",
        () => host.service.getStatus().scheduledRestart,
        (restart) => restart !== undefined,
      );
      host.requested.cancel();
      assert.equal(host.service.getStatus().scheduledRestart, undefined, "the schedule is gone");
      host.agentTurns.length = 0;
      const settle = Date.now() + 500;
      await until(
        "a quiet half second",
        () => Date.now(),
        (now) => now >= settle,
      );
      assert.equal(host.updater.installs, 0, "the declined version is not installed by itself");
      assert.equal(host.service.getStatus().phase, "ready", "Restart to update stays offered");
    } finally {
      await host.stop();
    }
  });

  await check("switching the option off again clears a waiting automatic restart", async () => {
    const host = await startHost("off-again");
    try {
      host.agentTurns.push("agent-turn");
      host.service.start();
      await until(
        "a waiting restart",
        () => host.service.getStatus().scheduledRestart,
        (restart) => restart !== undefined,
      );
      await Effect.runPromise(host.requested.setPreference({ autoInstall: false }));
      await until(
        "the schedule is cleared",
        () => host.service.getStatus().scheduledRestart,
        (restart) => restart === undefined,
      );
      host.agentTurns.length = 0;
      const settle = Date.now() + 500;
      await until(
        "a quiet half second",
        () => Date.now(),
        (now) => now >= settle,
      );
      assert.equal(host.updater.installs, 0);
    } finally {
      await host.stop();
    }
  });
} finally {
  server.stop(true);
}

const passed = checks.length === 6 && checks.every((entry) => entry.passed);
const reportPath = join(OUT, "report.json");
await writeFile(reportPath, `${JSON.stringify({ passed, feedUrl, checks }, null, 2)}\n`);
logger.info(`${passed ? "All" : "Not all"} checks passed. Report: ${reportPath}`);
process.exit(passed ? 0 : 1);
