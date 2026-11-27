import type { MobileDevicePlatform } from "@codebot/contracts/mobile-connect";
import { type DynamicRecord, isDynamicRecord } from "@codebot/contracts/runtime-values";

export const ACCOUNT_SIGN_IN_RETURN = "codebot://auth";

const REQUEST_TIMEOUT_MS = 15_000;

export type AccountSignInCode =
  | "service_unreachable"
  | "not_account_service"
  | "start_failed"
  | "login_failed"
  | "state_mismatch"
  | "exchange_failed"
  | "rate_limited"
  | "provider_unreachable"
  | "login_refused";

export class AccountSignInError extends Error {
  constructor(
    readonly code: AccountSignInCode,
    readonly retryAfterSeconds?: number,
  ) {
    super(code);
  }
}

export interface AccountSignInDevice {
  id: string;
  name: string;
  platform: MobileDevicePlatform;
}

export type AuthBrowserResult = { type: "success"; url: string } | { type: "cancel" | "dismiss" | "locked" | "opened" };

export interface AccountSignInDependencies {
  fetch: typeof fetch;
  randomBytes: (length: number) => Uint8Array;
  sha256Base64: (value: string) => Promise<string>;
  openAuth: (authorizationUrl: string, returnUrl: string) => Promise<AuthBrowserResult>;
  device: () => Promise<AccountSignInDevice>;
}

export interface AccountSignInResult {
  sessionToken: string;
  user: unknown;
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/gu, "-").replace(/\//gu, "_").replace(/=+$/u, "");
}

function pkceChallenge(base64: string): string {
  return base64.replace(/\+/gu, "-").replace(/\//gu, "_").replace(/=+$/u, "");
}

function asObject(value: unknown): DynamicRecord | null {
  return isDynamicRecord(value) ? value : null;
}

async function post(
  fetcher: typeof fetch,
  origin: string,
  path: string,
  body: DynamicRecord,
): Promise<{ response: Response; body: DynamicRecord | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetcher(new URL(path, origin).toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    return { response, body: asObject(await response.json().catch(() => null)) };
  } catch {
    throw new AccountSignInError("service_unreachable");
  } finally {
    clearTimeout(timer);
  }
}

function errorCode(body: DynamicRecord | null): string {
  const code = asObject(body?.error)?.code;
  return typeof code === "string" ? code : "";
}

function retryAfter(response: Response | undefined): number | undefined {
  const value = Number(response?.headers.get("Retry-After"));
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function failureFor(code: string, response?: Response): AccountSignInError {
  if (code === "rate_limited") return new AccountSignInError("rate_limited", retryAfter(response));
  if (code === "provider_unreachable") return new AccountSignInError("provider_unreachable");
  if (code === "login_refused" || code === "account_blocked" || code === "login_disabled") {
    return new AccountSignInError("login_refused");
  }
  return new AccountSignInError("login_failed");
}

export async function checkAccountService(fetcher: typeof fetch, origin: string): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetcher(new URL("/v1/auth/config", origin).toString(), { signal: controller.signal });
  } catch {
    throw new AccountSignInError("service_unreachable");
  } finally {
    clearTimeout(timer);
  }
  const body = asObject(await response.json().catch(() => null));
  if (!response.ok || asObject(body?.login)?.kind !== "oidc") throw new AccountSignInError("not_account_service");
}

function returnParameters(url: string): URLSearchParams | null {
  if (url !== ACCOUNT_SIGN_IN_RETURN && !url.startsWith(`${ACCOUNT_SIGN_IN_RETURN}?`)) return null;
  const query = url.indexOf("?");
  return query < 0 ? null : new URLSearchParams(url.slice(query + 1).split("#")[0]);
}

export async function signInWithAccountService(
  origin: string,
  deps: AccountSignInDependencies,
): Promise<AccountSignInResult | null> {
  await checkAccountService(deps.fetch, origin);
  const verifier = base64Url(deps.randomBytes(32));
  const state = base64Url(deps.randomBytes(32));
  const challenge = pkceChallenge(await deps.sha256Base64(verifier));
  const start = await post(deps.fetch, origin, "/v1/auth/oidc/start", {
    redirectUri: ACCOUNT_SIGN_IN_RETURN,
    codeChallenge: challenge,
    state,
  });
  const authorizationUrl = start.body?.authorizationUrl;
  if (!start.response.ok || typeof authorizationUrl !== "string" || !/^https?:\/\//u.test(authorizationUrl)) {
    throw errorCode(start.body) === "rate_limited"
      ? failureFor("rate_limited", start.response)
      : new AccountSignInError("start_failed");
  }
  const result = await deps.openAuth(authorizationUrl, ACCOUNT_SIGN_IN_RETURN);
  if (result.type !== "success") return null;
  const returned = returnParameters(result.url);
  if (!returned || returned.get("state") !== state) throw new AccountSignInError("state_mismatch");
  const failure = returned.get("error");
  if (failure) throw failureFor(failure);
  const code = returned.get("code");
  if (!code) throw new AccountSignInError("login_failed");
  const device = await deps.device();
  const exchange = await post(deps.fetch, origin, "/v1/auth/oidc/exchange", {
    code,
    codeVerifier: verifier,
    deviceId: device.id,
    deviceName: device.name,
    platform: device.platform,
  });
  const token = exchange.body?.sessionToken;
  if (!exchange.response.ok || typeof token !== "string" || !token) {
    throw errorCode(exchange.body) === "rate_limited"
      ? failureFor("rate_limited", exchange.response)
      : new AccountSignInError("exchange_failed");
  }
  return { sessionToken: token, user: exchange.body?.user };
}

export function isAccountSignInReturn(path: string): boolean {
  return (
    path === ACCOUNT_SIGN_IN_RETURN ||
    path.startsWith(`${ACCOUNT_SIGN_IN_RETURN}?`) ||
    path.startsWith(`${ACCOUNT_SIGN_IN_RETURN}/`)
  );
}
