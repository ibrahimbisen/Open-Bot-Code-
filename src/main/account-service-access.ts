import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { sourceText } from "@codebot/i18n/source";
import { app, net } from "electron";
import { ACCOUNT_SERVICE_FILE, AccountServiceSettingsStore } from "./account-service-settings";
import { CentralAuthManager } from "./central-auth-manager";
import type { CompanySignInBrowser } from "./company-sign-in-browser";
import {
  createSecretStorage,
  SECRET_STORAGE_KEY_FILE,
  type SecretStorage,
  type SecretStorageCipher,
} from "./secret-storage-cipher";

const CENTRAL_AUTH_FILE = "codebot-central-auth-v1.bin";

let userDataSecretStorage: SecretStorage | null = null;

function secretStorage(): SecretStorage {
  userDataSecretStorage ??= createSecretStorage({
    keyPath: join(app.getPath("userData"), SECRET_STORAGE_KEY_FILE),
  });
  return userDataSecretStorage;
}

export function safeStorageCipher(
  unavailableKey: "error.app.secretStorageUnavailable" | "error.app.macSecureStorageUnavailable",
): SecretStorageCipher {
  return secretStorage().cipher(() => sourceText(unavailableKey));
}

async function accountServiceFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  try {
    return await net.fetch(input instanceof URL ? input.href : input, {
      ...init,
      credentials: "omit",
      cache: "no-store",
    });
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    const code = /^net::(ERR_[A-Z0-9_]+)$/u.exec(error.message)?.[1];
    if (code === undefined) throw error;
    throw new TypeError("fetch failed", { cause: Object.assign(error, { code }) });
  }
}

export const ACCOUNT_SERVICE_PLACEHOLDER_URL = "http://account-service.invalid";

let accountServiceSettings: AccountServiceSettingsStore | null = null;

export function accountServiceSettingsStore(): AccountServiceSettingsStore {
  accountServiceSettings ??= new AccountServiceSettingsStore(
    join(app.getPath("userData"), ACCOUNT_SERVICE_FILE),
    process.env.CODEBOT_AUTH_API_URL,
  );
  return accountServiceSettings;
}

export function configuredAccountServiceUrl(): string | null {
  return accountServiceSettingsStore().read().url;
}

export function centralAuthApiUrl(): string {
  return configuredAccountServiceUrl() ?? ACCOUNT_SERVICE_PLACEHOLDER_URL;
}

export function signInPageOpener(
  open: (url: string) => Promise<void>,
  environment: NodeJS.ProcessEnv = process.env,
  packaged: boolean = app.isPackaged,
): (url: string) => Promise<void> {
  const file = environment.CODEBOT_E2E_SIGN_IN_PAGE_FILE;
  delete environment.CODEBOT_E2E_SIGN_IN_PAGE_FILE;
  if (!file || packaged) return open;
  return (url) => writeFile(file, url, "utf8");
}

export function createCentralAuthManager(options: {
  companySignInBrowser?: CompanySignInBrowser;
  confirmSessionAtStart: boolean;
}): CentralAuthManager {
  return new CentralAuthManager({
    apiUrl: configuredAccountServiceUrl(),
    storagePath: join(app.getPath("userData"), CENTRAL_AUTH_FILE),
    fetch: accountServiceFetch,
    ...safeStorageCipher("error.app.macSecureStorageUnavailable"),
    keyringChanged: () => secretStorage().madeKeyFile(),
    ...(options.companySignInBrowser ? { companySignInBrowser: options.companySignInBrowser } : {}),
    confirmSessionAtStart: options.confirmSessionAtStart,
  });
}
