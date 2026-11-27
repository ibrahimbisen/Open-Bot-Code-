import { updateFeedFileUrl } from "./update-feed";

const MANIFEST_TIMEOUT_MS = 8_000;
const MANIFEST_MAX_BYTES = 65_536;
const STABLE_VERSION = /^\d+\.\d+\.\d+$/u;

export function updateManifestName(platform: NodeJS.Platform, arch: string): string | null {
  if (platform === "win32") return arch === "x64" ? "latest.yml" : null;
  if (platform === "darwin") return arch === "x64" || arch === "arm64" ? "latest-mac.yml" : null;
  if (platform !== "linux") return null;
  if (arch === "x64") return "latest-linux.yml";
  return arch === "arm64" ? "latest-linux-arm64.yml" : null;
}

export function installerFileName(version: string, platform: NodeJS.Platform, arch: string): string | null {
  if (!STABLE_VERSION.test(version) || updateManifestName(platform, arch) === null) return null;
  if (platform === "win32") return `CodeBot-${version}-x64.exe`;
  if (platform === "darwin") return `CodeBot-${version}-${arch}.dmg`;
  return `CodeBot-${version}-${arch === "x64" ? "x86_64" : "arm64"}.AppImage`;
}

export function updateFileName(version: string, platform: NodeJS.Platform, arch: string): string | null {
  const installer = installerFileName(version, platform, arch);
  if (installer === null) return null;
  return platform === "darwin" ? `CodeBot-${version}-${arch}.zip` : installer;
}

export function manifestVersion(manifest: string): string | null {
  const version = /^version:[ \t]*['"]?([^'"\s]+)['"]?[ \t]*$/mu.exec(manifest)?.[1];
  return version !== undefined && STABLE_VERSION.test(version) ? version : null;
}

export async function readUpdateManifest(
  feedUrl: string,
  manifestName: string,
  request: typeof fetch,
  signal?: AbortSignal,
): Promise<string> {
  const timeout = AbortSignal.timeout(MANIFEST_TIMEOUT_MS);
  const response = await request(updateFeedFileUrl(feedUrl, manifestName), {
    cache: "no-store",
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  if (!response.ok || !response.body) {
    await response.body?.cancel();
    throw new Error(`The update server answered ${response.status} for ${manifestName}.`);
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > MANIFEST_MAX_BYTES) throw new Error(`${manifestName} is too large.`);
      chunks.push(next.value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function installerDownloadUrl(input: {
  feedUrl: string;
  version?: string | null | undefined;
  platform: NodeJS.Platform;
  arch: string;
  request?: typeof fetch;
}): Promise<string> {
  const manifestName = updateManifestName(input.platform, input.arch);
  if (manifestName === null) return input.feedUrl;
  let version = input.version ?? null;
  if (version === null) {
    try {
      version = manifestVersion(await readUpdateManifest(input.feedUrl, manifestName, input.request ?? fetch));
    } catch {
      version = null;
    }
  }
  const fileName = version === null ? null : installerFileName(version, input.platform, input.arch);
  return fileName === null ? input.feedUrl : updateFeedFileUrl(input.feedUrl, fileName);
}
