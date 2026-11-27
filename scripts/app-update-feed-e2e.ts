import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { UpdateStatus } from "@codebot/contracts/ipc";
import { createCodeBotLogger } from "@codebot/logging";
import { Effect } from "effect";
import { UpdateFeedService } from "../src/main/app-update/update-feed-service";
import { UpdateService } from "../src/main/update-service";
import { FeedProbeUpdater, INSTALLER, manifest } from "./app-update-feed-probe";

const logger = createCodeBotLogger("app-update-feed-e2e");
const ROOT = resolve(import.meta.dirname, "..");
const OUT = join(ROOT, ".codebot-build/app-update");
const checks: { name: string; passed: boolean; detail?: string }[] = [];

async function check(name: string, action: () => Promise<void> | void): Promise<void> {
  try {
    await action();
    checks.push({ name, passed: true });
    logger.info(`ok: ${name}`);
  } catch (error) {
    checks.push({ name, passed: false, detail: error instanceof Error ? error.message : String(error) });
    logger.error(`FAILED: ${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const served = new Map<string, string>();
const requests: string[] = [];
const serve = (port: number, prefix: string) =>
  Bun.serve({
    port,
    hostname: "127.0.0.1",
    fetch(request) {
      const path = new URL(request.url).pathname;
      requests.push(`${prefix}${path}`);
      const body = served.get(`${prefix}${path}`);
      return body === undefined ? new Response("not found", { status: 404 }) : new Response(body);
    },
  });
const server = serve(0, "");
const base = (folder: string) => `http://127.0.0.1:${server.port}/${folder}/`;
served.set("/feed-a/latest.yml", manifest("0.2.0"));
served.set("/feed-a/CodeBot-0.2.0-x64.exe", INSTALLER.toString());
served.set("/feed-b/latest.yml", manifest("0.3.0"));
served.set("/feed-b/CodeBot-0.3.0-x64.exe", INSTALLER.toString());

function waitFor(service: UpdateService, wanted: (status: UpdateStatus) => boolean): Promise<UpdateStatus> {
  return new Promise((resolvePhase) => {
    const current = service.getStatus();
    if (wanted(current)) return resolvePhase(current);
    const listener = (status: UpdateStatus) => {
      if (!wanted(status)) return;
      service.off("status", listener);
      resolvePhase(status);
    };
    service.on("status", listener);
  });
}

function createService(updater: FeedProbeUpdater, configured: boolean, autoDownload: boolean) {
  const timers: { delayMs: number; run: () => void; cleared: boolean }[] = [];
  const service = new UpdateService(updater, {
    currentVersion: "0.1.0",
    enabled: true,
    feedConfigured: configured,
    autoDownload,
    beforeInstall: async () => undefined,
    platform: "win32",
    initialCheckDelayMs: 0,
    checkTimers: {
      set: (run, delayMs) => {
        const timer = { delayMs, run, cleared: false };
        timers.push(timer);
        if (delayMs === 0) setTimeout(() => !timer.cleared && run(), 0);
        return timer;
      },
      clear: (timer) => {
        for (const candidate of timers) if (candidate === timer) candidate.cleared = true;
      },
    },
  });
  return { service, timers };
}

try {
  await check("feed order is settings, then environment, then build, and the URL is saved to disk", async () => {
    const storePath = join(OUT, "feed-order.json");
    const feed = new UpdateFeedService({
      storePath,
      environmentUrl: "https://env.example.com/updates",
      buildUrl: "https://build.example.com/updates/",
      log: () => undefined,
    });
    await Effect.runPromise(feed.load());
    assert.deepEqual([feed.current().source, feed.current().url], ["environment", "https://env.example.com/updates/"]);
    await Effect.runPromise(feed.setSavedUrl("https://saved.example.com/folder"));
    assert.deepEqual([feed.current().source, feed.current().url], ["settings", "https://saved.example.com/folder/"]);
    const reloaded = new UpdateFeedService({
      storePath,
      environmentUrl: undefined,
      buildUrl: null,
      log: () => undefined,
    });
    await Effect.runPromise(reloaded.load());
    assert.equal(reloaded.current().url, "https://saved.example.com/folder/");
    await Effect.runPromise(feed.setSavedUrl(null));
    assert.equal(feed.current().source, "environment");
    for (const bad of [
      "not a url",
      "ftp://example.com/",
      "http://example.com/updates/",
      "https://user:pw@example.com/",
    ]) {
      const failed = await Effect.runPromise(Effect.flip(feed.setSavedUrl(bad)));
      assert.ok(failed, `${bad} is refused`);
    }
    assert.equal(feed.current().source, "environment", "a refused URL changes nothing");
    const local = await Effect.runPromise(feed.setSavedUrl("http://192.168.1.20:8080/updates"));
    assert.equal(local.url, "http://192.168.1.20:8080/updates/", "http on a private network is accepted");
  });

  await check("no update server: the service reports it and sends no request", async () => {
    const before = requests.length;
    const updater = new FeedProbeUpdater(join(OUT, "none"), "0.1.0", OUT);
    const { service } = createService(updater, false, true);
    service.start();
    const status = await waitFor(service, (value) => value.phase === "unsupported");
    assert.ok(status.message?.includes("No update server"), `message: ${status.message}`);
    assert.equal(requests.length, before, "no request was sent");
    await Effect.runPromise(service.stop());
  });

  await check("checks at start and every hour, downloads in the background and offers Restart to update", async () => {
    const updater = new FeedProbeUpdater(join(OUT, "client"), "0.1.0", OUT);
    const feed = new UpdateFeedService({
      storePath: join(OUT, "client-feed.json"),
      environmentUrl: base("feed-a"),
      buildUrl: null,
      log: () => undefined,
    });
    await Effect.runPromise(feed.load());
    const { service, timers } = createService(updater, false, true);
    const disconnect = feed.connect(updater, service);
    assert.equal(updater.feedUrl, base("feed-a"), "the updater uses the update folder");
    service.start();
    const ready = await waitFor(service, (value) => value.phase === "ready");
    assert.equal(ready.availableVersion, "0.2.0");
    assert.deepEqual(updater.downloaded, ["CodeBot-0.2.0-x64.exe"]);
    assert.ok(requests.includes("/feed-a/latest.yml"), "latest.yml was requested from the folder");
    assert.equal(timers[0]?.delayMs, 0, "the first check runs at start");
    const hourly = timers.filter((timer) => !timer.cleared).at(-1);
    assert.equal(hourly?.delayMs, 3_600_000, "the next check is one hour later");
    disconnect();
    await Effect.runPromise(service.stop());
  });

  await check("a new URL in settings switches the feed at run time", async () => {
    const updater = new FeedProbeUpdater(join(OUT, "switch"), "0.1.0", OUT);
    const feed = new UpdateFeedService({
      storePath: join(OUT, "switch-feed.json"),
      environmentUrl: base("feed-a"),
      buildUrl: null,
      log: () => undefined,
    });
    await Effect.runPromise(feed.load());
    const { service } = createService(updater, false, false);
    const disconnect = feed.connect(updater, service);
    service.start();
    const first = await waitFor(service, (value) => value.phase === "available");
    assert.equal(first.availableVersion, "0.2.0");
    await Effect.runPromise(feed.setSavedUrl(base("feed-b")));
    assert.equal(updater.feedUrl, base("feed-b"));
    const second = await waitFor(service, (value) => value.phase === "available" && value.availableVersion === "0.3.0");
    assert.equal(second.availableVersion, "0.3.0");
    disconnect();
    await Effect.runPromise(service.stop());
  });

  await check("a download with a wrong sha512 is refused", async () => {
    served.set("/feed-bad/latest.yml", manifest("0.4.0"));
    served.set("/feed-bad/CodeBot-0.4.0-x64.exe", "tampered");
    const updater = new FeedProbeUpdater(join(OUT, "bad"), "0.1.0", OUT);
    updater.setFeedURL({ provider: "generic", url: base("feed-bad") });
    const { service } = createService(updater, true, true);
    service.start();
    const status = await waitFor(service, (value) => value.phase === "error" || value.phase === "ready");
    assert.equal(status.phase, "error", "the tampered file is not installed");
    await Effect.runPromise(service.stop());
  });

  await check("the build uses the generic provider and the wrapper refuses a bad URL", async () => {
    const config = await readFile(join(ROOT, "electron-builder.yml"), "utf8");
    assert.match(config, /^publish:\s*\n\s+provider: generic\s*\n\s+url: \$\{env\.CODEBOT_UPDATE_URL\}/mu);
    assert.ok(!/provider: github/u.test(config), "no GitHub provider");
    const result = spawnSync(process.execPath, [join(ROOT, "scripts/codebot/electron-builder.ts"), "--help"], {
      env: { ...process.env, CODEBOT_UPDATE_URL: "http://example.com/updates/" },
      encoding: "utf8",
    });
    assert.notEqual(result.status, 0, "an http URL on the internet is refused");
    assert.match(result.stderr, /not a valid update server URL/u);
  });
} finally {
  server.stop(true);
}

const passed = checks.every((entry) => entry.passed);
await writeFile(join(OUT, "report.json"), `${JSON.stringify({ passed, checks }, null, 2)}\n`);
logger.info(`${passed ? "All" : "Not all"} checks passed. Report: ${join(OUT, "report.json")}`);
process.exit(passed ? 0 : 1);
