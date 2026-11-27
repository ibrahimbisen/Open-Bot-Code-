import { readFileSync } from "node:fs";
import type { AppUpdateFeed, AppUpdateFeedSource } from "@codebot/contracts/ipc";

export const UPDATE_URL_ENVIRONMENT_VARIABLE = "CODEBOT_UPDATE_URL";
export const UPDATE_FEED_FILE = "codebot-update-feed-v1.json";
export const MINIMUM_VERSION_FILE = "codebot-minimum-version.json";
export const PROVIDER_BLOCKLIST_FILE = "provider-runtime-blocklist.json";

const URL_MAX_LENGTH = 2_048;
const PRIVATE_NAME_SUFFIXES = [".localhost", ".local", ".lan", ".home", ".home.arpa", ".internal", ".localdomain"];

export type UpdateFeedUrlProblem = "empty" | "invalid" | "credentials" | "insecure";

export type UpdateFeedUrlResult =
  | { readonly ok: true; readonly url: string }
  | { readonly ok: false; readonly problem: UpdateFeedUrlProblem };

export function parseUpdateFeedUrl(input: string): UpdateFeedUrlResult {
  const text = input.trim();
  if (text === "") return { ok: false, problem: "empty" };
  if (text.length > URL_MAX_LENGTH || !URL.canParse(text)) return { ok: false, problem: "invalid" };
  const url = new URL(text);
  if ((url.protocol !== "https:" && url.protocol !== "http:") || url.hostname === "") {
    return { ok: false, problem: "invalid" };
  }
  if (url.username !== "" || url.password !== "") return { ok: false, problem: "credentials" };
  if (url.protocol === "http:" && !isPrivateNetworkHost(url.hostname)) return { ok: false, problem: "insecure" };
  url.hash = "";
  if (!url.pathname.endsWith("/")) url.pathname += "/";
  return { ok: true, url: url.toString() };
}

export function validUpdateFeedUrl(input: string | null | undefined): string | null {
  if (input === null || input === undefined) return null;
  const parsed = parseUpdateFeedUrl(input);
  return parsed.ok ? parsed.url : null;
}

function isPrivateNetworkHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/u, "");
  if (host.startsWith("[") && host.endsWith("]")) return isPrivateIpv6(host.slice(1, -1));
  const octets = ipv4Octets(host);
  if (octets) return isPrivateIpv4(octets);
  if (host === "localhost" || !host.includes(".")) return host !== "";
  return PRIVATE_NAME_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

function ipv4Octets(host: string): readonly number[] | null {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/u.exec(host);
  if (!match) return null;
  const octets = match.slice(1).map(Number);
  return octets.every((octet) => octet <= 255) ? octets : null;
}

function isPrivateIpv4(octets: readonly number[]): boolean {
  const first = octets[0] ?? -1;
  const second = octets[1] ?? -1;
  return (
    first === 127 ||
    first === 10 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 169 && second === 254) ||
    (first === 100 && second >= 64 && second <= 127)
  );
}

function isPrivateIpv6(address: string): boolean {
  if (address === "::1") return true;
  const mapped = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/u.exec(address);
  if (mapped) {
    const high = Number.parseInt(mapped[1] ?? "", 16);
    const low = Number.parseInt(mapped[2] ?? "", 16);
    return isPrivateIpv4([high >> 8, high & 0xff, low >> 8, low & 0xff]);
  }
  const first = Number.parseInt(address.split(":")[0] ?? "", 16);
  if (Number.isNaN(first)) return false;
  return (first & 0xfe00) === 0xfc00 || (first & 0xffc0) === 0xfe80;
}

export interface UpdateFeedCandidates {
  savedUrl: string | null;
  environmentUrl: string | null | undefined;
  buildUrl: string | null;
}

export function resolveUpdateFeed(candidates: UpdateFeedCandidates): AppUpdateFeed {
  const savedUrl = validUpdateFeedUrl(candidates.savedUrl);
  const ordered: readonly (readonly [AppUpdateFeedSource, string | null])[] = [
    ["settings", savedUrl],
    ["environment", validUpdateFeedUrl(candidates.environmentUrl)],
    ["build", validUpdateFeedUrl(candidates.buildUrl)],
  ];
  const selected = ordered.find(([, url]) => url !== null);
  return { url: selected?.[1] ?? null, source: selected?.[0] ?? null, savedUrl };
}

export function updateFeedFileUrl(feedUrl: string, fileName: string): string {
  const base = new URL(feedUrl);
  const file = new URL(fileName, base);
  file.search = base.search;
  return file.toString();
}

export function redactUpdateFeedUrl(text: string, feedUrl: string): string {
  const { origin, pathname, search } = new URL(feedUrl);
  const folder = `${origin}${pathname}`;
  const withoutFolder = text.replaceAll(folder, "<update server>/").replaceAll(folder.slice(0, -1), "<update server>");
  return search.length > 1 ? withoutFolder.replaceAll(search, "?<redacted>") : withoutFolder;
}

function buildUpdateUrl(appUpdateConfig: string): string | null {
  if (yamlScalar(appUpdateConfig, "provider") !== "generic") return null;
  return validUpdateFeedUrl(yamlScalar(appUpdateConfig, "url"));
}

export function readBuildUpdateUrl(configPath: string | null): string | null {
  if (configPath === null) return null;
  try {
    return buildUpdateUrl(readFileSync(configPath, "utf8"));
  } catch {
    return null;
  }
}

function yamlScalar(text: string, key: string): string | null {
  const raw = new RegExp(`^${key}:[ \\t]*(.*)$`, "mu").exec(text)?.[1]?.trim();
  if (raw === undefined) return null;
  if (raw.length >= 2 && raw.startsWith("'") && raw.endsWith("'")) return raw.slice(1, -1).replaceAll("''", "'");
  if (raw.length >= 2 && raw.startsWith('"') && raw.endsWith('"')) {
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === "string" ? parsed : null;
    } catch {
      return null;
    }
  }
  return raw;
}

export function savedUpdateFeedUrl(stored: unknown): string | null {
  if (typeof stored !== "object" || stored === null || !("url" in stored)) return null;
  return typeof stored.url === "string" ? validUpdateFeedUrl(stored.url) : null;
}

function readSavedUpdateFeedUrl(storePath: string): string | null {
  try {
    return savedUpdateFeedUrl(JSON.parse(readFileSync(storePath, "utf8")));
  } catch {
    return null;
  }
}

export interface InstalledUpdateFeedInput {
  storePath: string;
  environment: NodeJS.ProcessEnv;
  buildConfigPath: string | null;
}

export function resolveInstalledUpdateFeed(input: InstalledUpdateFeedInput): AppUpdateFeed {
  return resolveUpdateFeed({
    savedUrl: readSavedUpdateFeedUrl(input.storePath),
    environmentUrl: input.environment[UPDATE_URL_ENVIRONMENT_VARIABLE],
    buildUrl: readBuildUpdateUrl(input.buildConfigPath),
  });
}
