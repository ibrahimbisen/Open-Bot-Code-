import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { AccountServiceSettings } from "@codebot/contracts/ipc";
import { isDynamicRecord, isString } from "@codebot/contracts/runtime-values";
import { sourceText } from "@codebot/i18n/source";

export const ACCOUNT_SERVICE_FILE = "codebot-account-service-v1.json";

export function normalizeAccountServiceUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error(sourceText("error.auth.accountServiceUrlInvalid"));
  }
  const loopback = url.hostname === "127.0.0.1" || url.hostname === "localhost" || url.hostname === "[::1]";
  const secure = url.protocol === "https:" || (url.protocol === "http:" && loopback);
  if (!secure || url.pathname !== "/" || url.search !== "" || url.hash !== "" || url.username !== "") {
    throw new Error(sourceText("error.auth.accountServiceUrlInvalid"));
  }
  return url.origin;
}

function readStoredUrl(path: string): string | null {
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    if (!isDynamicRecord(parsed) || !isString(parsed.url)) return null;
    return normalizeAccountServiceUrl(parsed.url);
  } catch {
    return null;
  }
}

export class AccountServiceSettingsStore {
  readonly #path: string;
  readonly #environmentUrl: string | null;

  constructor(path: string, environmentValue: string | undefined) {
    this.#path = path;
    const trimmed = environmentValue?.trim();
    this.#environmentUrl = trimmed ? normalizeAccountServiceUrl(trimmed) : null;
  }

  read(): AccountServiceSettings {
    if (this.#environmentUrl !== null) return { url: this.#environmentUrl, fixedByEnvironment: true };
    return { url: readStoredUrl(this.#path), fixedByEnvironment: false };
  }

  write(value: string | null): AccountServiceSettings {
    if (this.#environmentUrl !== null) throw new Error(sourceText("error.auth.accountServiceFixed"));
    const url = value === null || value.trim() === "" ? null : normalizeAccountServiceUrl(value);
    mkdirSync(dirname(this.#path), { recursive: true });
    const temporary = `${this.#path}.tmp`;
    writeFileSync(temporary, JSON.stringify({ url }), "utf8");
    renameSync(temporary, this.#path);
    return { url, fixedByEnvironment: false };
  }
}
