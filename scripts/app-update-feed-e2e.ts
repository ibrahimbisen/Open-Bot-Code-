import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { UpdateStatus } from "@codebot/contracts/ipc";
import { isNewerRelease } from "@codebot/contracts/release-version";
import { createCodeBotLogger } from "@codebot/logging";
import { Effect } from "effect";
import { installsUpdatesInPlace, parseCodesignDetails } from "../src/main/app-update/mac-signature";
import { githubReleaseRepository, RELEASE_FEED_URL, releasePageUrl } from "../src/main/app-update/release-repository";
import { resolveUpdateFeed } from "../src/main/app-update/update-feed";
import { UpdateFeedService } from "../src/main/app-update/update-feed-service";
import { UpdateService } from "../src/main/update-service";
import { FeedProbeUpdater, INSTALLER, manifest } from "./app-update-feed-probe";
import { releaseVersion, withVersion } from "./codebot/ci-version";
import { builderEnvironment } from "./codebot/electron-builder";

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
const redirects = new Map<string, string>();
const requests: string[] = [];
const serve = (port: number, prefix: string) =>
  Bun.serve({
    port,
    hostname: "127.0.0.1",
    fetch(request) {
      const path = new URL(request.url).pathname;
      requests.push(`${prefix}${path}`);
      const target = redirects.get(`${prefix}${path}`);
      if (target !== undefined) return Response.redirect(new URL(target, request.url).toString(), 302);
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

interface ServiceOptions {
  currentVersion?: string;
  platform?: NodeJS.Platform;
  manualDownload?: (version: string) => Promise<void>;
}

function createService(
  updater: FeedProbeUpdater,
  configured: boolean,
  autoDownload: boolean,
  options: ServiceOptions = {},
) {
  const timers: { delayMs: number; run: () => void; cleared: boolean }[] = [];
  const service = new UpdateService(updater, {
    currentVersion: options.currentVersion ?? "0.1.0",
    enabled: true,
    feedConfigured: configured,
    autoDownload,
    beforeInstall: async () => undefined,
    platform: options.platform ?? "win32",
    manualDownload: options.manualDownload,
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

  await check(
    "the build uses the generic provider, GitHub Releases by default, and the wrapper refuses a bad URL",
    async () => {
      const config = await readFile(join(ROOT, "electron-builder.yml"), "utf8");
      assert.match(config, /^publish:\s*\n\s+provider: generic\s*\n\s+url: \$\{env\.CODEBOT_UPDATE_URL\}/mu);
      assert.ok(!/provider: github/u.test(config), "no GitHub API provider");
      assert.equal(
        RELEASE_FEED_URL,
        "https://github.com/ibrahimbisen/Open-Bot-Code-/releases/latest/download/",
        "the default feed is the latest GitHub release of the repository",
      );
      assert.equal(builderEnvironment({}).CODEBOT_UPDATE_URL, RELEASE_FEED_URL, "no URL gives the GitHub feed");
      assert.equal(
        builderEnvironment({ CODEBOT_UPDATE_URL: "https://updates.example.com/codebot" }).CODEBOT_UPDATE_URL,
        "https://updates.example.com/codebot/",
        "a home server URL replaces the GitHub feed",
      );
      const result = spawnSync(process.execPath, [join(ROOT, "scripts/codebot/electron-builder.ts"), "--help"], {
        env: { ...process.env, CODEBOT_UPDATE_URL: "http://example.com/updates/" },
        encoding: "utf8",
      });
      assert.notEqual(result.status, 0, "an http URL on the internet is refused");
      assert.match(result.stderr, /not a valid update server URL/u);
    },
  );

  await check(
    "GitHub feed: latest.yml and the installer come through the releases/latest/download redirect",
    async () => {
      const repository = "/owner/repo/releases";
      served.set(`${repository}/download/v0.79.12/latest.yml`, manifest("0.79.12"));
      served.set(`${repository}/download/v0.79.12/CodeBot-0.79.12-x64.exe`, INSTALLER.toString());
      redirects.set(`${repository}/latest/download/latest.yml`, `${repository}/download/v0.79.12/latest.yml`);
      redirects.set(
        `${repository}/latest/download/CodeBot-0.79.12-x64.exe`,
        `${repository}/download/v0.79.12/CodeBot-0.79.12-x64.exe`,
      );
      const feedUrl = `http://127.0.0.1:${server.port}${repository}/latest/download/`;
      const feed = resolveUpdateFeed({ savedUrl: null, environmentUrl: undefined, buildUrl: RELEASE_FEED_URL });
      assert.deepEqual([feed.source, feed.url], ["build", RELEASE_FEED_URL], "the build feed is the default");
      const home = resolveUpdateFeed({
        savedUrl: "https://updates.example.com/codebot/",
        environmentUrl: undefined,
        buildUrl: RELEASE_FEED_URL,
      });
      assert.deepEqual([home.source, home.url], ["settings", "https://updates.example.com/codebot/"]);
      const updater = new FeedProbeUpdater(join(OUT, "github"), "0.79.3", OUT);
      updater.setFeedURL({ provider: "generic", url: feedUrl });
      const { service } = createService(updater, true, true, { currentVersion: "0.79.3" });
      service.start();
      const ready = await waitFor(service, (value) => value.phase === "ready" || value.phase === "error");
      assert.equal(ready.phase, "ready", `phase ${ready.phase}: ${ready.message}`);
      assert.equal(ready.availableVersion, "0.79.12");
      assert.deepEqual(updater.downloaded, ["CodeBot-0.79.12-x64.exe"]);
      assert.ok(
        requests.includes(`${repository}/latest/download/latest.yml`),
        "latest.yml was read from the latest release",
      );
      assert.ok(requests.includes(`${repository}/download/v0.79.12/latest.yml`), "the redirect was followed");
      await Effect.runPromise(service.stop());
    },
  );

  await check("version: the build number is the patch, and a release wins only when it is newer", async () => {
    assert.equal(releaseVersion("0.79.0", "12"), "0.79.12");
    assert.equal(releaseVersion("1.4.9", "7"), "1.4.7");
    assert.throws(() => releaseVersion("0.79", "12"));
    assert.throws(() => releaseVersion("0.79.0", "0"));
    assert.throws(() => releaseVersion("0.79.0", "12a"));
    assert.equal(JSON.parse(withVersion('{"name":"codebot","version":"0.79.0"}', "0.79.12")).version, "0.79.12");
    assert.ok(isNewerRelease(releaseVersion("0.79.0", "10"), releaseVersion("0.79.0", "9")), "10 is newer than 9");
    assert.ok(isNewerRelease("0.80.11", "0.79.12"), "a minor bump is newer");
    assert.ok(!isNewerRelease("0.79.12", "0.79.12"), "the same version is not newer");
    const repository = "/owner/repo/releases";
    const feedUrl = `http://127.0.0.1:${server.port}${repository}/latest/download/`;
    for (const [current, expected] of [
      ["0.79.12", "up-to-date"],
      ["0.79.20", "up-to-date"],
      ["0.79.11", "available"],
    ] as const) {
      const updater = new FeedProbeUpdater(join(OUT, `compare-${current}`), current, OUT);
      updater.setFeedURL({ provider: "generic", url: feedUrl });
      const { service } = createService(updater, true, false, { currentVersion: current });
      service.start();
      const status = await waitFor(service, (value) => ["up-to-date", "available", "error"].includes(value.phase));
      assert.equal(status.phase, expected, `${current} against 0.79.12`);
      await Effect.runPromise(service.stop());
    }
  });

  await check("macOS without a Developer ID: no silent install, Download opens the release page", async () => {
    const developerId = [
      "Executable=/Applications/CodeBot.app/Contents/MacOS/CodeBot",
      "Authority=Developer ID Application: Example (ABCDE12345)",
      "Authority=Developer ID Certification Authority",
      "TeamIdentifier=ABCDE12345",
    ].join("\n");
    const adhoc = [
      "Executable=/Applications/CodeBot.app/Contents/MacOS/CodeBot",
      "Signature=adhoc",
      "TeamIdentifier=not set",
    ].join("\n");
    assert.equal(parseCodesignDetails(developerId), "developer-id");
    assert.equal(parseCodesignDetails(adhoc), "adhoc");
    assert.equal(parseCodesignDetails("code object is not signed at all"), "unsigned");
    assert.equal(parseCodesignDetails("Authority=Apple Development: me\nTeamIdentifier=ABCDE12345"), "unsigned");
    assert.ok(installsUpdatesInPlace("darwin", "developer-id"));
    assert.ok(!installsUpdatesInPlace("darwin", "adhoc"));
    assert.ok(!installsUpdatesInPlace("darwin", "unsigned"));
    assert.ok(installsUpdatesInPlace("win32", null) && installsUpdatesInPlace("linux", null));
    assert.equal(githubReleaseRepository(RELEASE_FEED_URL), "ibrahimbisen/Open-Bot-Code-");
    assert.equal(
      releasePageUrl(RELEASE_FEED_URL, "0.79.12"),
      "https://github.com/ibrahimbisen/Open-Bot-Code-/releases/tag/v0.79.12",
    );
    assert.equal(releasePageUrl(RELEASE_FEED_URL), "https://github.com/ibrahimbisen/Open-Bot-Code-/releases/latest");
    assert.equal(releasePageUrl("https://updates.example.com/codebot/", "0.79.12"), null, "a home server has no page");

    const repository = "/owner/repo/releases";
    served.set(`${repository}/download/v0.79.12/latest-mac.yml`, manifest("0.79.12", "CodeBot-0.79.12-arm64.zip"));
    redirects.set(`${repository}/latest/download/latest-mac.yml`, `${repository}/download/v0.79.12/latest-mac.yml`);
    const opened: string[] = [];
    const updater = new FeedProbeUpdater(join(OUT, "mac-unsigned"), "0.79.3", OUT, "darwin");
    updater.setFeedURL({ provider: "generic", url: `http://127.0.0.1:${server.port}${repository}/latest/download/` });
    const { service } = createService(updater, true, true, {
      currentVersion: "0.79.3",
      platform: "darwin",
      manualDownload: async (version) => {
        opened.push(version);
      },
    });
    service.start();
    const available = await waitFor(service, (value) => value.phase === "available" || value.phase === "error");
    assert.equal(available.phase, "available", `phase ${available.phase}: ${available.message}`);
    assert.equal(available.availableVersion, "0.79.12");
    assert.ok(available.message?.includes("not signed"), `message: ${available.message}`);
    assert.ok(requests.includes(`${repository}/latest/download/latest-mac.yml`), "latest-mac.yml was read");
    assert.deepEqual(updater.downloaded, [], "automatic download is off without a signature");
    await Effect.runPromise(service.setAutoDownload(true));
    assert.deepEqual(updater.downloaded, [], "turning automatic download on does not download");
    const after = await Effect.runPromise(service.downloadUpdate());
    assert.deepEqual(opened, ["0.79.12"], "Download opens the page of the new version");
    assert.equal(after.phase, "available", "the app stays on the available state");
    assert.deepEqual(updater.downloaded, [], "nothing was downloaded");
    const failed = await Effect.runPromise(Effect.flip(service.installUpdate()));
    assert.ok(failed, "install is refused");
    assert.equal(updater.installs, 0, "nothing was installed");
    await Effect.runPromise(service.stop());
  });
} finally {
  server.stop(true);
}

const passed = checks.every((entry) => entry.passed);
await writeFile(join(OUT, "report.json"), `${JSON.stringify({ passed, checks }, null, 2)}\n`);
logger.info(`${passed ? "All" : "Not all"} checks passed. Report: ${join(OUT, "report.json")}`);
process.exit(passed ? 0 : 1);
