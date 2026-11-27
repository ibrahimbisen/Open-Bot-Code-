import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { copyFile, mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, posix, resolve } from "node:path";
import { createCodeBotLogger } from "@codebot/logging";
import { stringify } from "yaml";
import { z } from "zod";
import { validUpdateFeedUrl } from "../../src/main/app-update/update-feed";
import { readScriptArguments } from "../script-arguments";
import { readUpdateManifest, setStagingPercentage, type UpdateManifest } from "../update-rollout";

const USAGE = `Usage:
  bun run release:codebot -- <destination> [options]

Builds the installer for this computer, makes the update metadata and copies everything to the
update folder on your server. Give one destination:
  --target-dir <folder>       copy to a folder (a mounted share, or the web folder on the server)
  --webdav <url>              upload with WebDAV (Nextcloud: https://host/remote.php/dav/files/<user>/<folder>/)
                              user and password: CODEBOT_WEBDAV_USER and CODEBOT_WEBDAV_PASSWORD
  --scp <user@host:/folder>   upload with scp (uses your ssh keys)

Options:
  --update-url <url>          the public URL of the update folder; built into the app (CODEBOT_UPDATE_URL)
  --skip-build                use the installers that already are in the dist folder
  --dist-dir <folder>         where the installers are (default: dist)
  --mac-arch <arm64|x64|both> macOS architectures to build (default: both)
  --staging <0-100>           staged rollout percentage written to the metadata (default: 100)
  --dry-run                   check and print the plan; change nothing`;

export const METADATA_FILES = ["latest.yml", "latest-mac.yml", "latest-linux.yml", "latest-linux-arm64.yml"] as const;
const HISTORY_FOLDER = "history";
const BUILD_COMMAND: Partial<Record<NodeJS.Platform, string>> = {
  win32: "dist:win",
  darwin: "dist:mac",
  linux: "dist:linux",
};

export interface ReleaseFile {
  name: string;
  path: string;
  size: number;
}

export interface ReleasePlan {
  version: string;
  installers: ReleaseFile[];
  metadata: { name: string; text: string }[];
}

export interface Transport {
  describe(): string;
  put(relativePath: string, source: string): Promise<void>;
  putText(relativePath: string, text: string): Promise<void>;
  getText(relativePath: string): Promise<string | null>;
}

export async function sha512Base64(path: string): Promise<string> {
  const hash = createHash("sha512");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("base64");
}

export async function planRelease(distDir: string, version: string, staging: number): Promise<ReleasePlan> {
  const entries = await readdir(distDir);
  const names = METADATA_FILES.filter((name) => entries.includes(name));
  if (names.length === 0) throw new Error(`No ${METADATA_FILES.join(", ")} in ${distDir}. Build the installers first.`);
  const installers = new Map<string, ReleaseFile>();
  const metadata: { name: string; text: string }[] = [];
  for (const name of names) {
    const source = await readFile(join(distDir, name), "utf8");
    const manifest = readUpdateManifest(source);
    if (manifest.version !== version) {
      throw new Error(`${name} names version ${manifest.version}, but package.json has ${version}. Build again.`);
    }
    for (const file of manifest.files) {
      const path = join(distDir, file.url);
      const info = await stat(path).catch(() => null);
      if (info === null) throw new Error(`${name} lists ${file.url}, but ${path} does not exist.`);
      if (info.size !== file.size) throw new Error(`${file.url} has ${info.size} bytes; ${name} says ${file.size}.`);
      if ((await sha512Base64(path)) !== file.sha512) {
        throw new Error(`${file.url} does not match its sha512 in ${name}.`);
      }
      installers.set(file.url, { name: file.url, path, size: info.size });
      const blockMap = `${file.url}.blockmap`;
      if (entries.includes(blockMap)) {
        const blockMapPath = join(distDir, blockMap);
        installers.set(blockMap, { name: blockMap, path: blockMapPath, size: (await stat(blockMapPath)).size });
      }
    }
    metadata.push({ name, text: staging < 100 ? setStagingPercentage(source, staging) : source });
  }
  return { version, installers: [...installers.values()], metadata };
}

function architectureOf(manifest: UpdateManifest): "arm64" | "x64" | "both" {
  const arm64 = manifest.files.some(({ url }) => url.includes("arm64"));
  const other = manifest.files.some(({ url }) => !url.includes("arm64"));
  if (arm64 && other) return "both";
  return arm64 ? "arm64" : "x64";
}

export function mergeMacManifests(published: string | null, fresh: string): string {
  if (published === null) return fresh;
  let before: UpdateManifest;
  try {
    before = readUpdateManifest(published);
  } catch {
    return fresh;
  }
  const next = readUpdateManifest(fresh);
  if (before.version !== next.version) return fresh;
  const kinds = [architectureOf(before), architectureOf(next)];
  if (kinds.includes("both") || kinds[0] === kinds[1]) return fresh;
  const keep = before.files.filter(({ url }) => !next.files.some((file) => file.url === url));
  const head = kinds[1] === "arm64" ? next : before;
  const files = kinds[1] === "arm64" ? [...next.files, ...keep] : [...keep, ...next.files];
  return stringify({ ...head, files, stagingPercentage: next.stagingPercentage }, { version: "1.1" });
}

export async function publishRelease(
  plan: ReleasePlan,
  transport: Transport,
  log: (line: string) => void,
): Promise<void> {
  for (const file of plan.installers) {
    log(`Uploading ${file.name} (${(file.size / 1_048_576).toFixed(1)} MB)`);
    await transport.put(file.name, file.path);
  }
  const finals: { name: string; text: string }[] = [];
  for (const { name, text } of plan.metadata) {
    const merged = name === "latest-mac.yml" ? mergeMacManifests(await transport.getText(name), text) : text;
    finals.push({ name, text: merged });
    await transport.putText(posix.join(HISTORY_FOLDER, plan.version, name), merged);
    log(`Saved ${HISTORY_FOLDER}/${plan.version}/${name}`);
  }
  for (const { name, text } of finals) {
    await transport.putText(name, text);
    log(`Published ${name}`);
  }
}

export function directoryTransport(root: string): Transport {
  const target = (relativePath: string) => join(root, ...relativePath.split("/"));
  return {
    describe: () => root,
    async put(relativePath, source) {
      await mkdir(dirname(target(relativePath)), { recursive: true });
      await copyFile(source, target(relativePath));
    },
    async putText(relativePath, text) {
      await mkdir(dirname(target(relativePath)), { recursive: true });
      await writeFile(target(relativePath), text);
    },
    async getText(relativePath) {
      return readFile(target(relativePath), "utf8").catch(() => null);
    },
  };
}

export function webdavTransport(baseUrl: string, user: string | undefined, password: string | undefined): Transport {
  const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const headers: Record<string, string> =
    user === undefined ? {} : { authorization: `Basic ${Buffer.from(`${user}:${password ?? ""}`).toString("base64")}` };
  const made = new Set<string>();
  async function ensureFolders(relativePath: string): Promise<void> {
    const parts = posix
      .dirname(relativePath)
      .split("/")
      .filter((part) => part !== "" && part !== ".");
    let current = "";
    for (const part of parts) {
      current = posix.join(current, part);
      if (made.has(current)) continue;
      const response = await fetch(new URL(`${current}/`, base), { method: "MKCOL", headers });
      if (!response.ok && response.status !== 405) throw new Error(`MKCOL ${current} failed with ${response.status}.`);
      made.add(current);
    }
  }
  async function send(relativePath: string, body: Blob | string): Promise<void> {
    await ensureFolders(relativePath);
    const response = await fetch(new URL(relativePath, base), { method: "PUT", headers, body });
    if (!response.ok) throw new Error(`Upload of ${relativePath} failed with ${response.status}.`);
  }
  return {
    describe: () => base,
    put: (relativePath, source) => send(relativePath, Bun.file(source)),
    putText: send,
    async getText(relativePath) {
      const response = await fetch(new URL(relativePath, base), { headers });
      return response.ok ? response.text() : null;
    },
  };
}

export function scpTransport(destination: string): Transport {
  const match = /^(.+?):(.+)$/u.exec(destination);
  if (!match) throw new Error("Use --scp <user@host:/folder>.");
  const host = match[1] ?? "";
  const folder = (match[2] ?? "").replace(/\/$/u, "");
  const run = (command: string, args: string[]) => {
    const result = spawnSync(command, args, { encoding: "utf8" });
    if (result.error) throw new Error(`${command} could not start: ${result.error.message}`);
    return result;
  };
  async function put(relativePath: string, source: string): Promise<void> {
    const made = run("ssh", [host, "mkdir", "-p", posix.join(folder, posix.dirname(relativePath))]);
    if (made.status !== 0) throw new Error(`ssh mkdir failed: ${made.stderr}`);
    const result = run("scp", ["-q", source, `${host}:${posix.join(folder, relativePath)}`]);
    if (result.status !== 0) throw new Error(`scp of ${relativePath} failed: ${result.stderr}`);
  }
  return {
    describe: () => destination,
    put,
    async putText(relativePath, text) {
      const dir = await mkdtemp(join(tmpdir(), "codebot-release-"));
      try {
        const file = join(dir, basename(relativePath));
        await writeFile(file, text);
        await put(relativePath, file);
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
    async getText(relativePath) {
      const result = run("ssh", [host, "cat", posix.join(folder, relativePath)]);
      return result.status === 0 ? result.stdout : null;
    },
  };
}

function runInherit(command: string, args: string[], env: NodeJS.ProcessEnv): void {
  const result = spawnSync(command, args, { stdio: "inherit", env });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed with status ${result.status}.`);
}

function macFlags(macArch: string): string[] {
  if (macArch === "both") return ["--arm64", "--x64"];
  if (macArch === "arm64" || macArch === "x64") return [`--${macArch}`];
  throw new Error("--mac-arch must be arm64, x64 or both.");
}

function buildInstallers(env: NodeJS.ProcessEnv, macArch: string, log: (line: string) => void): void {
  const script = BUILD_COMMAND[process.platform];
  if (script === undefined) throw new Error(`There is no build for ${process.platform}.`);
  const flags = process.platform === "darwin" ? macFlags(macArch) : [];
  log(`Building with bun run ${script}`);
  runInherit(process.execPath, ["run", script, ...(flags.length > 0 ? ["--", ...flags] : [])], env);
}

interface DestinationOptions {
  "target-dir"?: string | undefined;
  webdav?: string | undefined;
  scp?: string | undefined;
}

function transportFor(values: DestinationOptions): Transport | null {
  const chosen = [values["target-dir"], values.webdav, values.scp].filter((value) => value !== undefined);
  if (chosen.length !== 1) return null;
  if (values["target-dir"] !== undefined) return directoryTransport(resolve(values["target-dir"]));
  if (values.webdav !== undefined) {
    return webdavTransport(values.webdav, process.env.CODEBOT_WEBDAV_USER, process.env.CODEBOT_WEBDAV_PASSWORD);
  }
  return scpTransport(values.scp ?? "");
}

async function packageVersion(): Promise<string> {
  const { version } = z.object({ version: z.string() }).parse(JSON.parse(await readFile("package.json", "utf8")));
  if (!/^\d+\.\d+\.\d+$/u.test(version)) throw new Error("package.json has no valid version.");
  return version;
}

if (import.meta.main) {
  const logger = createCodeBotLogger("release-codebot");
  const log = (line: string) => logger.info(line);
  const parsed = readScriptArguments({
    usage: USAGE,
    options: {
      "target-dir": { type: "string" },
      webdav: { type: "string" },
      scp: { type: "string" },
      "update-url": { type: "string" },
      "skip-build": { type: "boolean" },
      "dist-dir": { type: "string" },
      "mac-arch": { type: "string" },
      staging: { type: "string" },
      "dry-run": { type: "boolean" },
    },
  });
  if (parsed) {
    const { values } = parsed;
    const transport = transportFor(values);
    if (transport === null) {
      process.stderr.write(`Give exactly one of --target-dir, --webdav and --scp.\n\n${USAGE}\n`);
      process.exit(2);
    }
    const staging = values.staging === undefined ? 100 : Number(values.staging);
    if (!Number.isInteger(staging) || staging < 0 || staging > 100) {
      throw new Error("--staging must be a whole number from 0 to 100.");
    }
    const feed = values["update-url"] ?? process.env.CODEBOT_UPDATE_URL;
    if (feed !== undefined && feed.trim() !== "" && validUpdateFeedUrl(feed) === null) {
      throw new Error("The update URL is not valid. Use the https:// URL of the update folder.");
    }
    const version = await packageVersion();
    const env = { ...process.env, ...(feed ? { CODEBOT_UPDATE_URL: feed } : {}) };
    if (!feed) logger.warn("No update URL is built into this build. Users must enter it in Settings > Updates.");
    if (values["dry-run"]) {
      log(`Dry run: would build ${version} and upload to ${transport.describe()}.`);
    } else {
      if (!values["skip-build"]) buildInstallers(env, values["mac-arch"] ?? "both", log);
      const plan = await planRelease(resolve(values["dist-dir"] ?? "dist"), version, staging);
      log(`Release ${version}: ${plan.installers.length} files, ${plan.metadata.length} metadata files.`);
      await publishRelease(plan, transport, log);
      log(`Done. Clients that use ${feed ?? "your update URL"} get CodeBot ${version}.`);
    }
  }
}
