import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createCodeBotLogger } from "@codebot/logging";
import { stringify } from "yaml";
import { directoryTransport, mergeMacManifests, planRelease, publishRelease, webdavTransport } from "./codebot/release";
import { readUpdateManifest } from "./update-rollout";

const logger = createCodeBotLogger("release-script-e2e");
const ROOT = resolve(import.meta.dirname, "..");
const OUT = join(ROOT, ".codebot-build/release-script");
const DIST = join(OUT, "dist");
const VERSION = "9.9.9";
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

function describeFile(name: string, bytes: Buffer) {
  return { url: name, sha512: createHash("sha512").update(bytes).digest("base64"), size: bytes.length };
}

async function makeBuild(): Promise<void> {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });
  const files = {
    win: Buffer.from("windows installer"),
    mac: Buffer.from("mac arm64 zip"),
    macDmg: Buffer.from("mac arm64 dmg"),
    linux: Buffer.from("linux appimage"),
  };
  const names = {
    win: `CodeBot-${VERSION}-x64.exe`,
    mac: `CodeBot-${VERSION}-arm64.zip`,
    macDmg: `CodeBot-${VERSION}-arm64.dmg`,
    linux: `CodeBot-${VERSION}-x86_64.AppImage`,
  };
  await writeFile(join(DIST, names.win), files.win);
  await writeFile(join(DIST, names.mac), files.mac);
  await writeFile(join(DIST, names.macDmg), files.macDmg);
  await writeFile(join(DIST, names.linux), files.linux);
  await writeFile(join(DIST, `${names.win}.blockmap`), "blockmap");
  const manifest = (list: ReturnType<typeof describeFile>[], path: string) =>
    stringify({
      version: VERSION,
      files: list,
      path,
      sha512: list[0]?.sha512,
      releaseDate: "2026-01-01T00:00:00.000Z",
    });
  await writeFile(join(DIST, "latest.yml"), manifest([describeFile(names.win, files.win)], names.win));
  await writeFile(
    join(DIST, "latest-mac.yml"),
    manifest([describeFile(names.mac, files.mac), describeFile(names.macDmg, files.macDmg)], names.mac),
  );
  await writeFile(join(DIST, "latest-linux.yml"), manifest([describeFile(names.linux, files.linux)], names.linux));
}

await makeBuild();
const published: string[] = [];

await check("the plan lists installers, block maps and metadata, and verifies sha512", async () => {
  const plan = await planRelease(DIST, VERSION, 100);
  assert.equal(plan.installers.length, 5);
  assert.deepEqual(plan.metadata.map((entry) => entry.name).sort(), [
    "latest-linux.yml",
    "latest-mac.yml",
    "latest.yml",
  ]);
  await assert.rejects(planRelease(DIST, "1.0.0", 100), /names version/u);
});

await check("a damaged installer stops the release before any upload", async () => {
  const path = join(DIST, `CodeBot-${VERSION}-x64.exe`);
  const good = await readFile(path);
  await writeFile(path, Buffer.from("windows INSTALLER"));
  await assert.rejects(planRelease(DIST, VERSION, 100), /sha512/u);
  await writeFile(path, good);
});

await check("the folder transport copies installers first, metadata last, and keeps a history copy", async () => {
  const target = join(OUT, "folder");
  const order: string[] = [];
  const inner = directoryTransport(target);
  const transport = {
    ...inner,
    put: async (name: string, source: string) => {
      order.push(name);
      await inner.put(name, source);
    },
    putText: async (name: string, text: string) => {
      order.push(name);
      await inner.putText(name, text);
    },
  };
  await publishRelease(await planRelease(DIST, VERSION, 100), transport, () => undefined);
  const firstMetadata = order.findIndex((name) => name.endsWith(".yml"));
  assert.ok(
    order.slice(0, firstMetadata).every((name) => !name.endsWith(".yml")),
    "installers come first",
  );
  assert.ok(
    order.slice(-3).every((name) => /^latest.*\.yml$/u.test(name)),
    "latest files come last",
  );
  const history = await readFile(join(target, "history", VERSION, "latest.yml"), "utf8");
  assert.equal(history, await readFile(join(target, "latest.yml"), "utf8"));
  assert.equal(await readFile(join(target, `CodeBot-${VERSION}-x64.exe`), "utf8"), "windows installer");
});

await check("a staged rollout percentage is written to the metadata", async () => {
  const target = join(OUT, "staged");
  await publishRelease(await planRelease(DIST, VERSION, 25), directoryTransport(target), () => undefined);
  const manifest = readUpdateManifest(await readFile(join(target, "latest.yml"), "utf8"));
  assert.equal(manifest.stagingPercentage, 25);
});

await check("two macOS architectures merge into one latest-mac.yml", async () => {
  const arm = stringify({
    version: VERSION,
    files: [{ url: "CodeBot-9.9.9-arm64.zip", sha512: "a", size: 1 }],
    path: "CodeBot-9.9.9-arm64.zip",
    sha512: "a",
  });
  const intel = stringify({
    version: VERSION,
    files: [{ url: "CodeBot-9.9.9-x64.zip", sha512: "b", size: 2 }],
    path: "CodeBot-9.9.9-x64.zip",
    sha512: "b",
  });
  const merged = readUpdateManifest(mergeMacManifests(arm, intel));
  assert.deepEqual(merged.files.map((file) => file.url).sort(), ["CodeBot-9.9.9-arm64.zip", "CodeBot-9.9.9-x64.zip"]);
  const other = readUpdateManifest(mergeMacManifests(intel, arm));
  assert.equal(other.files.length, 2);
  assert.equal(other.path, "CodeBot-9.9.9-arm64.zip");
});

await check("WebDAV upload (Nextcloud style) creates folders and uploads to a mock server", async () => {
  const store = new Map<string, string>();
  const folders = new Set<string>();
  const server = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    async fetch(request) {
      const authorized =
        request.headers.get("authorization") === `Basic ${Buffer.from("owner:secret").toString("base64")}`;
      if (!authorized) return new Response("no", { status: 401 });
      const path = new URL(request.url).pathname;
      if (request.method === "MKCOL") {
        if (folders.has(path)) return new Response("exists", { status: 405 });
        folders.add(path);
        return new Response("", { status: 201 });
      }
      if (request.method === "PUT") {
        const parent = path.slice(0, path.lastIndexOf("/") + 1);
        if (parent !== "/dav/" && !folders.has(parent.slice(0, -1)) && !folders.has(parent)) {
          return new Response("conflict", { status: 409 });
        }
        store.set(path, await request.text());
        return new Response("", { status: 201 });
      }
      const body = store.get(path);
      return body === undefined ? new Response("", { status: 404 }) : new Response(body);
    },
  });
  try {
    const transport = webdavTransport(`http://127.0.0.1:${server.port}/dav/`, "owner", "secret");
    await publishRelease(await planRelease(DIST, VERSION, 100), transport, (line) => published.push(line));
    assert.equal(store.get(`/dav/CodeBot-${VERSION}-x64.exe`), "windows installer");
    assert.ok(store.has(`/dav/history/${VERSION}/latest.yml`));
    assert.ok(store.has("/dav/latest.yml"));
    const rejected = webdavTransport(`http://127.0.0.1:${server.port}/dav/`, "owner", "wrong");
    await assert.rejects(rejected.putText("latest.yml", "x"), /failed with 401/u);
  } finally {
    server.stop(true);
  }
});

await check("the command line runs once, checks its arguments and does a dry run", async () => {
  const run = (...args: string[]) =>
    spawnSync(process.execPath, [join(ROOT, "scripts/codebot/release.ts"), ...args], { cwd: ROOT, encoding: "utf8" });
  const noDestination = run();
  assert.equal(noDestination.status, 2);
  const dry = run("--target-dir", join(OUT, "dry"), "--dry-run");
  assert.equal(dry.status, 0, dry.stderr);
  const badStaging = run("--target-dir", join(OUT, "dry"), "--staging", "300", "--dry-run");
  assert.notEqual(badStaging.status, 0);
  const real = run("--target-dir", join(OUT, "cli"), "--skip-build", "--dist-dir", DIST);
  assert.notEqual(real.status, 0, "package.json has another version than the fake build");
  assert.match(`${real.stdout}${real.stderr}`, /names version 9\.9\.9/u);
});

const passed = checks.every((entry) => entry.passed);
await writeFile(join(OUT, "report.json"), `${JSON.stringify({ passed, checks }, null, 2)}\n`);
logger.info(`${passed ? "All" : "Not all"} checks passed. Report: ${join(OUT, "report.json")}`);
process.exit(passed ? 0 : 1);
