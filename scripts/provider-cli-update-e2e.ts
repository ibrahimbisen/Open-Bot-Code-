import assert from "node:assert/strict";
import { execFile, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import lockValue from "../native-runtime.lock.json";
import { runCauseEffect } from "../src/backend/effect-boundary";
import { tarExecutable } from "../src/main/provider-runtime-archive";
import { codexTag } from "../src/main/provider-runtime-descriptors";
import { ProviderRuntimeManager } from "../src/main/provider-runtime-manager";
import { latestRelease } from "../src/main/provider-runtime-releases";
import { type AgentRuntimeLock, parseAgentRuntimeLock } from "./agent-runtime-lock";

const execFileAsync = promisify(execFile);
const OUT = resolve(import.meta.dirname, "../.codebot-build/provider-cli-update");
const CODEX_PATH_ENV = "CODEBOT_CODEX_PATH";
const WAIT_MS = 120_000;

interface Check {
  name: string;
  passed: boolean;
  detail?: string;
}

const checks: Check[] = [];
const observations: string[] = [];
const requests: string[] = [];
const unexpected: string[] = [];

async function step(name: string, run: () => Promise<unknown>): Promise<void> {
  try {
    const result = await run();
    const detail = typeof result === "string" ? result : undefined;
    checks.push({ name, passed: true, ...(detail ? { detail } : {}) });
    process.stdout.write(`ok   ${name}${detail ? ` (${detail})` : ""}\n`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    checks.push({ name, passed: false, detail });
    process.stdout.write(`FAIL ${name}: ${detail}\n`);
  }
}

const sha256 = (data: Uint8Array | string) => createHash("sha256").update(data).digest("hex");
const sha512Base64 = (data: Uint8Array) => createHash("sha512").update(data).digest("base64");

function bumpPatch(version: string, by = 1): string {
  const [major, minor, patch] = version.split(".").map(Number);
  return `${major}.${minor}.${(patch ?? 0) + by}`;
}

function bumpMinorDown(version: string): string {
  const [major, minor] = version.split(".").map(Number);
  return `${major}.${Math.max(0, (minor ?? 1) - 1)}.0`;
}

const root = await mkdtemp(join(tmpdir(), "codebot-provider-cli-update-"));
const baseLock = parseAgentRuntimeLock(lockValue);
const pinned = baseLock.codex.version;
const newer = bumpPatch(pinned);
const LICENSE = "fake Codex license for the CodeBot update test\n";

const stubSource = join(root, "stub", "codex.ts");
await mkdir(dirname(stubSource), { recursive: true });
await writeFile(
  stubSource,
  [
    'import { readFileSync } from "node:fs";',
    'import { dirname, join } from "node:path";',
    'const manifest = JSON.parse(readFileSync(join(dirname(process.execPath), "..", "codex-package.json"), "utf8"));',
    'console.log("codex-cli " + manifest.version + " (codebot fake)");',
    "",
  ].join("\n"),
);

const probe = new ProviderRuntimeManager({ root: join(root, "probe"), isProviderOn: () => false });
const probeExecutable = probe.executablePath("codex");
assert.ok(probeExecutable, "this platform has a managed Codex");
const target = basename(dirname(dirname(dirname(probeExecutable))));
type CodexTarget = keyof AgentRuntimeLock["codex"]["artifacts"];
const isCodexTarget = (value: string): value is CodexTarget => Object.hasOwn(baseLock.codex.artifacts, value);
assert.ok(isCodexTarget(target), `unknown target ${target}`);
const codexTarget: CodexTarget = target;
const storeTail = dirname(dirname(dirname(probeExecutable))).slice(join(root, "probe").length + 1);
const windows = codexTarget === "win32-x64";
const executableName = basename(probeExecutable);
const compiled = join(root, "stub", executableName);
execFileSync("bun", ["build", "--compile", stubSource, "--outfile", compiled], {
  stdio: "ignore",
  shell: process.platform === "win32",
});

async function packageArchive(version: string): Promise<Buffer> {
  const folder = join(root, "packages", version);
  await mkdir(join(folder, "bin"), { recursive: true });
  await mkdir(join(folder, "codex-path"), { recursive: true });
  await cp(compiled, join(folder, "bin", executableName));
  await writeFile(join(folder, "bin", windows ? "codex-code-mode-host.exe" : "codex-code-mode-host"), "");
  await writeFile(join(folder, "codex-path", windows ? "rg.exe" : "rg"), "");
  await writeFile(join(folder, "codex-package.json"), JSON.stringify({ version }));
  const archive = join(root, "packages", `${version}.tar.gz`);
  await execFileAsync(tarExecutable(), ["-czf", archive, "-C", folder, "bin", "codex-path", "codex-package.json"]);
  return readFile(archive);
}

const pinnedArchive = await packageArchive(pinned);
const newerArchive = await packageArchive(newer);
const lock = structuredClone(baseLock);
lock.codex.licenseSha256 = sha256(LICENSE);
lock.codex.artifacts[codexTarget].assetSha256 = sha256(pinnedArchive);
lock.codex.artifacts[codexTarget].downloadBytes = pinnedArchive.byteLength;
lock.codex.artifacts[codexTarget].installedBytes = pinnedArchive.byteLength * 4;
const asset = lock.codex.artifacts[codexTarget].asset;
const repository = lock.codex.repository;
const releaseApi = `${repository.replace("https://github.com/", "https://api.github.com/repos/")}/releases/latest`;
const downloadUrl = (version: string) =>
  `${repository}/releases/download/${encodeURIComponent(codexTag(version))}/${asset}`;
const licenseUrl = (version: string) => `${repository}/raw/${encodeURIComponent(codexTag(version))}/LICENSE`;

interface Feed {
  latest: string | null;
  reachable: boolean;
}

function bytesResponse(body: Buffer, range: string | null): Response {
  const match = range ? /^bytes=(\d+)-(\d*)$/u.exec(range) : null;
  if (!match) return new Response(new Uint8Array(body), { headers: { "content-length": String(body.byteLength) } });
  const start = Number(match[1]);
  const end = match[2] ? Math.min(Number(match[2]), body.byteLength - 1) : body.byteLength - 1;
  const slice = body.subarray(start, end + 1);
  return new Response(new Uint8Array(slice), {
    status: 206,
    headers: {
      "content-length": String(slice.byteLength),
      "content-range": `bytes ${start}-${end}/${body.byteLength}`,
    },
  });
}

function localFeed(feed: Feed) {
  return async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = input instanceof Request ? input.url : String(input);
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    requests.push(url);
    if (!feed.reachable) throw new TypeError("fetch failed");
    if (url === releaseApi && !feed.latest) return new Response("Not found", { status: 404 });
    if (url === releaseApi && feed.latest) {
      const body = feed.latest === newer ? newerArchive : pinnedArchive;
      return Response.json({
        tag_name: codexTag(feed.latest),
        assets: [{ name: asset, digest: `sha256:${sha256(body)}`, size: body.byteLength }],
      });
    }
    if (url === downloadUrl(pinned)) return bytesResponse(pinnedArchive, headers.get("range"));
    if (url === downloadUrl(newer)) return bytesResponse(newerArchive, headers.get("range"));
    if (url === licenseUrl(pinned) || url === licenseUrl(newer)) return new Response(LICENSE);
    unexpected.push(url);
    throw new TypeError("fetch failed");
  };
}

const managers: ProviderRuntimeManager[] = [];

function createManager(name: string, feed: Feed, providerOn = true): ProviderRuntimeManager {
  const manager = new ProviderRuntimeManager({
    root: join(root, name),
    isProviderOn: (provider) => providerOn && provider === "codex",
    lock,
    fetchImpl: localFeed(feed),
    availableDiskBytes: async () => Number.MAX_SAFE_INTEGER,
    blocklist: { bundledPath: null, remoteUrl: () => null },
  });
  managers.push(manager);
  return manager;
}

async function installPinned(name: string, feed: Feed, providerOn = true): Promise<ProviderRuntimeManager> {
  const manager = createManager(name, feed, true);
  await runCauseEffect(manager.initialize());
  await runCauseEffect(manager.downloadAndWait("codex"));
  await runCauseEffect(manager.stop());
  const reopened = createManager(name, feed, providerOn);
  await runCauseEffect(reopened.initialize());
  return reopened;
}

const codexStatus = (manager: ProviderRuntimeManager) => manager.getStatus().providers.codex;

async function waitForStatus(
  manager: ProviderRuntimeManager,
  label: string,
  ready: (status: ReturnType<typeof codexStatus>) => boolean,
): Promise<void> {
  if (ready(codexStatus(manager))) return;
  await new Promise<void>((done, fail) => {
    const timer = setTimeout(() => {
      manager.off("status", listener);
      fail(new Error(`Timed out waiting for ${label}. Last: ${JSON.stringify(codexStatus(manager))}`));
    }, WAIT_MS);
    const listener = () => {
      if (!ready(codexStatus(manager))) return;
      clearTimeout(timer);
      manager.off("status", listener);
      done();
    };
    manager.on("status", listener);
  });
}

async function runExecutable(manager: ProviderRuntimeManager): Promise<string> {
  const executable = manager.executablePath("codex");
  assert.ok(executable, "no executable path");
  const { stdout } = await execFileAsync(executable, ["--version"], { encoding: "utf8", windowsHide: true });
  return stdout.trim();
}

async function versionsOnDisk(name: string): Promise<string[]> {
  const folder = join(root, name, storeTail);
  return (await readdir(folder).catch(() => [])).filter((entry) => !entry.startsWith(".")).sort();
}

async function settledCheck(manager: ProviderRuntimeManager): Promise<string> {
  try {
    await runCauseEffect(manager.checkForUpdates());
    return "ok";
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

const previousCodexPath = process.env[CODEX_PATH_ENV];
delete process.env[CODEX_PATH_ENV];
interface ScenarioRecord {
  status: ReturnType<typeof codexStatus>;
  output: string;
  onDisk?: string[];
}
const scenarios: {
  target: CodexTarget;
  pinned: string;
  newer: string;
  install?: ScenarioRecord;
  auto?: ScenarioRecord;
} = { target: codexTarget, pinned, newer };

try {
  await step("12.7 the managed Codex installs from the local feed at the pinned version", async () => {
    const manager = await installPinned("install", { latest: null, reachable: true });
    const status = codexStatus(manager);
    assert.equal(status.phase, "ready");
    assert.equal(status.version, pinned);
    const output = await runExecutable(manager);
    assert.match(output, new RegExp(`codex-cli ${pinned.replaceAll(".", "\\.")}`));
    scenarios.install = { status, output };
    return output;
  });

  await step("12.7 a newer version in the feed is downloaded and switched to without a click", async () => {
    const feed = { latest: newer, reachable: true };
    const manager = await installPinned("auto", feed);
    assert.equal(codexStatus(manager).version, pinned, "start on the pinned copy");
    const before = requests.filter((url) => url === releaseApi).length;
    manager.startUpdateChecks({ intervalMs: 60 * 60 * 1000 });
    await waitForStatus(manager, "the newer Codex", (status) => status.phase === "ready" && status.version === newer);
    const output = await runExecutable(manager);
    assert.match(output, new RegExp(`codex-cli ${newer.replaceAll(".", "\\.")}`));
    const onDisk = await versionsOnDisk("auto");
    assert.ok(onDisk.includes(newer), `the newer copy is on disk: ${onDisk.join(", ")}`);
    assert.ok(requests.filter((url) => url === releaseApi).length > before, "the feed was asked");
    assert.ok(requests.includes(downloadUrl(newer)), "the newer archive was downloaded");
    assert.equal(codexStatus(manager).availableVersion, null, "no manual offer after the update");
    scenarios.auto = { status: codexStatus(manager), output, onDisk };
    await runCauseEffect(manager.stop());
    const restarted = createManager("auto", feed);
    await runCauseEffect(restarted.initialize());
    assert.equal(codexStatus(restarted).version, newer, "the newer copy stays after a restart");
    return `${pinned} -> ${newer}, on disk: ${onDisk.join(", ")}`;
  });

  await step("12.7 the check repeats on its interval", async () => {
    const manager = await installPinned("interval", { latest: pinned, reachable: true });
    const count = () => requests.filter((url) => url === releaseApi).length;
    const before = count();
    manager.startUpdateChecks({ intervalMs: 300 });
    const deadline = Date.now() + WAIT_MS;
    while (count() < before + 3) {
      if (Date.now() > deadline) throw new Error(`only ${count() - before} checks`);
      await new Promise((done) => setTimeout(done, 100));
    }
    assert.equal(codexStatus(manager).version, pinned, "no update when the feed has the same version");
    return `${count() - before} checks`;
  });

  await step("12.7 an older or equal version in the feed changes nothing", async () => {
    const manager = await installPinned("older", { latest: bumpMinorDown(pinned), reachable: true });
    manager.startUpdateChecks();
    const result = await settledCheck(manager);
    const status = codexStatus(manager);
    assert.equal(status.version, pinned);
    assert.equal(status.availableVersion, null);
    assert.deepEqual(await versionsOnDisk("older"), [pinned]);
    return `check ${result}`;
  });

  await step("12.7 next to the user's own Codex CLI, CodeBot only offers the update", async () => {
    const manager = await installPinned("system", { latest: newer, reachable: true });
    manager.setSystemVersion("codex", pinned);
    manager.startUpdateChecks();
    await settledCheck(manager);
    const status = codexStatus(manager);
    assert.equal(status.version, pinned, "no automatic download");
    assert.equal(status.availableVersion, newer, "the newer version is offered");
    assert.deepEqual(await versionsOnDisk("system"), [pinned]);
    await runCauseEffect(manager.downloadAndWait("codex"));
    assert.equal(codexStatus(manager).version, newer, "the offered update installs on request");
    return `offered ${status.availableVersion}, then installed on request`;
  });

  await step("12.7 a provider that is off is not updated", async () => {
    const manager = await installPinned("off", { latest: newer, reachable: true }, false);
    manager.startUpdateChecks();
    await settledCheck(manager);
    const status = codexStatus(manager);
    assert.equal(status.version, pinned);
    assert.equal(status.availableVersion, null);
    assert.deepEqual(await versionsOnDisk("off"), [pinned]);
  });

  await step("12.7 a CLI path set by the user is never updated", async () => {
    const manager = await installPinned("configured", { latest: newer, reachable: true });
    process.env[CODEX_PATH_ENV] = join(root, "user-codex", executableName);
    try {
      manager.startUpdateChecks();
      await settledCheck(manager);
      const status = codexStatus(manager);
      assert.equal(status.version, pinned);
      assert.equal(status.availableVersion, null);
      assert.deepEqual(await versionsOnDisk("configured"), [pinned]);
    } finally {
      delete process.env[CODEX_PATH_ENV];
    }
  });

  await step("12.7 an unreachable feed keeps the working copy", async () => {
    const manager = await installPinned("offline", { latest: newer, reachable: true });
    const offline = createManager("offline", { latest: newer, reachable: false });
    await runCauseEffect(manager.stop());
    await runCauseEffect(offline.initialize());
    offline.startUpdateChecks();
    const result = await settledCheck(offline);
    const status = codexStatus(offline);
    assert.equal(status.phase, "ready");
    assert.equal(status.version, pinned);
    assert.notEqual(result, "ok", "the check reports the failure");
    assert.match(await runExecutable(offline), new RegExp(pinned.replaceAll(".", "\\.")));
    return result;
  });

  await step("12.7 the Claude Code version check reads the npm feed and refuses a bad answer", async () => {
    const claudeTarget = codexTarget;
    const packageName = lock.claude.artifacts[claudeTarget].package;
    const sdkVersion = bumpPatch(lock.claude.sdkVersion, 2);
    const cliVersion = bumpPatch(lock.claude.version, 2);
    const tarball = Buffer.from("fake claude package");
    const tarballUrl = `${lock.claude.registry}/${packageName}/-/fake-${sdkVersion}.tgz`;
    const claudeFetch = (shape: "good" | "bad") => async (input: string | URL | Request) => {
      const url = input instanceof Request ? input.url : String(input);
      requests.push(url);
      if (url === `${lock.claude.registry}/@anthropic-ai/claude-agent-sdk/latest`)
        return Response.json(shape === "good" ? { version: sdkVersion, claudeCodeVersion: cliVersion } : {});
      if (url === `${lock.claude.registry}/${packageName}/${sdkVersion}`)
        return Response.json({
          version: sdkVersion,
          dist: { tarball: tarballUrl, integrity: `sha512-${sha512Base64(tarball)}` },
        });
      if (url === tarballUrl) return bytesResponse(tarball, "bytes=0-0");
      unexpected.push(url);
      throw new TypeError("fetch failed");
    };
    const release = await runCauseEffect(
      latestRelease("claude", { target: claudeTarget, lock, fetch: claudeFetch("good") }),
    );
    assert.equal(release.version, cliVersion);
    assert.equal(release.packageVersion, sdkVersion);
    assert.equal(release.source, "latest");
    assert.equal(release.url, tarballUrl);
    assert.equal(release.downloadBytes, tarball.byteLength);
    const refused = await runCauseEffect(
      latestRelease("claude", { target: claudeTarget, lock, fetch: claudeFetch("bad") }),
    ).then(
      () => null,
      (error: unknown) => (error instanceof Error ? error.message : String(error)),
    );
    assert.ok(refused, "a feed answer without versions is refused");
    return `latest ${cliVersion}; bad answer: ${refused}`;
  });

  await step("12.7 every request went to the local feed and each Codex request was answered", async () => {
    const codexMisses = unexpected.filter((url) => url.startsWith(repository) || url === releaseApi);
    assert.deepEqual(codexMisses, []);
    const others = new Set(unexpected.map((url) => new URL(url).host));
    if (others.size > 0)
      observations.push(
        `The release checks of the other providers asked the stand-in feed too and got a network error: ${[...others].join(", ")}`,
      );
    return `${requests.length} requests, ${unexpected.length} refused for other providers`;
  });
} finally {
  for (const manager of managers) await runCauseEffect(manager.stop()).catch(() => undefined);
  if (previousCodexPath === undefined) delete process.env[CODEX_PATH_ENV];
  else process.env[CODEX_PATH_ENV] = previousCodexPath;
  await rm(root, { recursive: true, force: true, maxRetries: 5 }).catch((error: unknown) => {
    observations.push(`temporary folder not removed: ${error instanceof Error ? error.message : String(error)}`);
  });
}

const passed = checks.length > 0 && checks.every((entry) => entry.passed);
await mkdir(OUT, { recursive: true });
const reportPath = join(OUT, "report.json");
await writeFile(
  reportPath,
  `${JSON.stringify({ passed, checks, observations, scenarios, unexpectedRequests: unexpected }, null, 2)}\n`,
);
process.stdout.write(`report: ${reportPath}\n`);
process.exit(passed ? 0 : 1);
