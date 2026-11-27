import { normalizeOneTimeCode, ONE_TIME_CODE_ALPHABET, ONE_TIME_CODE_LENGTH } from "@codebot/contracts/validation";
import { Effect, Schema } from "effect";
import { normalizeMobileDevice } from "../../server/auth-service";
import { randomToken, sha256 } from "../../server/crypto";
import { mobileSessionStatements } from "../../server/d1-auth-repository";
import { PERSISTENT_SESSION_EXPIRES_AT } from "../../server/session-policy";
import type { AuthUser, MobileAuthDeviceIdentity } from "../../server/types";
import type { AccountConfig } from "../config";
import type { Logger } from "../logging";
import type { IdentityStore } from "./identity-store";
import { type IdentityProvider, type ProviderFailure, ProviderLoginRefused, ProviderUnavailable } from "./provider";
import { enforceRateLimit, RateLimited } from "./rate-limit";

export const CALLBACK_PATH = "/v1/auth/oidc/callback";
export const DEVICE_PATH = "/device";
export const APP_LINK_REDIRECT = "codebot://auth";

const CODE_TTL_MS = 2 * 60_000;
const DEVICE_POLL_INTERVAL_SECONDS = 5;
const CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{43}$/u;
const VERIFIER_PATTERN = /^[A-Za-z0-9._~-]{43,128}$/u;
const STATE_PATTERN = /^[A-Za-z0-9._~-]{16,128}$/u;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,128}$/u;
const LOOPBACK_REDIRECT_PATTERN = /^http:\/\/127\.0\.0\.1:([0-9]{1,5})(\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]*)?$/u;
const DEVICE_NAME_LIMIT = 80;

export class LoginError extends Schema.TaggedError<LoginError>()("LoginError", {
  status: Schema.Number,
  code: Schema.String,
  message: Schema.String,
  retryAfterSeconds: Schema.optional(Schema.Number),
}) {
  constructor(status: number, code: string, message: string, retryAfterSeconds?: number) {
    super({ status, code, message, retryAfterSeconds });
  }
}

class LoginOperationError extends Schema.TaggedError<LoginOperationError>()("LoginOperationError", {}) {}

export type LoginFailure = LoginError | LoginOperationError;

export interface LoginSession {
  sessionToken: string;
  user: AuthUser;
}

export interface DeviceLoginStart {
  deviceCode: string;
  userCode: string;
  verificationUrl: string;
  verificationUrlComplete: string;
  interval: number;
  expiresAt: number;
}

export type CallbackResult =
  | { kind: "redirect"; location: string }
  | { kind: "approval"; approval: string; userCode: string; userName: string; deviceName: string | null }
  | { kind: "failed"; code: string };

type SignInOutcome = { userId: string; error: null } | { userId: null; error: string };

interface FlowRow {
  nonce: string;
  provider_verifier: string;
  redirect_uri: string | null;
  client_state: string | null;
  client_challenge: string | null;
  device_code_hash: string | null;
  expires_at: number;
}

interface DeviceRow {
  status: "pending" | "waiting" | "approved" | "denied" | "redeemed";
  expires_at: number;
  polled_at: number | null;
}

function storeCall<A>(operation: () => Promise<A>): Effect.Effect<A, LoginOperationError> {
  return Effect.tryPromise({ try: operation, catch: () => new LoginOperationError({}) });
}

function hash(value: string): Effect.Effect<string, LoginOperationError> {
  return sha256(value).pipe(Effect.mapError(() => new LoginOperationError({})));
}

function invalidRequest(message: string): LoginError {
  return new LoginError(400, "invalid_login_request", message);
}

export function isAllowedClientRedirect(value: string): boolean {
  if (value === APP_LINK_REDIRECT) return true;
  const match = LOOPBACK_REDIRECT_PATTERN.exec(value);
  if (!match) return false;
  const port = Number(match[1]);
  return port >= 1 && port <= 65_535 && URL.canParse(value);
}

function newUserCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(ONE_TIME_CODE_LENGTH));
  return [...bytes].map((byte) => ONE_TIME_CODE_ALPHABET[byte & 31]).join("");
}

function shownUserCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

function providerErrorCode(error: ProviderFailure): string {
  if (error instanceof ProviderUnavailable) return "provider_unreachable";
  if (error instanceof ProviderLoginRefused) return error.code;
  return error.reason === "user_disabled" || error.reason === "user_missing" ? "account_disabled" : "provider_rejected";
}

export class LoginService {
  readonly #database: D1Database;
  readonly #provider: IdentityProvider;
  readonly #identities: IdentityStore;
  readonly #publicUrl: string;
  readonly #providerName: string;
  readonly #flowTtlMs: number;
  readonly #logger: Logger;
  readonly #now: () => number;
  readonly #sessionsRevoked: () => void;

  constructor(input: {
    database: D1Database;
    provider: IdentityProvider;
    identities: IdentityStore;
    config: AccountConfig;
    logger: Logger;
    now?: () => number;
    sessionsRevoked?: () => void;
  }) {
    this.#database = input.database;
    this.#provider = input.provider;
    this.#identities = input.identities;
    this.#publicUrl = input.config.publicUrl;
    this.#providerName = input.config.login.providerName;
    this.#flowTtlMs = input.config.login.flowSeconds * 1_000;
    this.#logger = input.logger;
    this.#now = input.now ?? Date.now;
    this.#sessionsRevoked = input.sessionsRevoked ?? (() => undefined);
  }

  get providerName(): string {
    return this.#providerName;
  }

  get callbackUrl(): string {
    return `${this.#publicUrl}${CALLBACK_PATH}`;
  }

  get deviceUrl(): string {
    return `${this.#publicUrl}${DEVICE_PATH}`;
  }

  readonly providerOrigin = Effect.fn("LoginService.providerOrigin")(function* (this: LoginService) {
    return yield* this.#provider.authorizationOrigin().pipe(Effect.catch(() => Effect.succeed(null)));
  });

  readonly start = Effect.fn("LoginService.start")(function* (
    this: LoginService,
    input: { redirectUri: string; codeChallenge: string; state: string; sourceIp: string },
  ): Effect.fn.Return<{ authorizationUrl: string; expiresAt: number }, LoginFailure> {
    if (!isAllowedClientRedirect(input.redirectUri)) {
      return yield* new LoginError(
        400,
        "invalid_redirect_uri",
        "The redirect address must be a loopback address of this computer or the CodeBot app link.",
      );
    }
    if (!CHALLENGE_PATTERN.test(input.codeChallenge)) return yield* invalidRequest("The code challenge is not valid.");
    if (!STATE_PATTERN.test(input.state)) return yield* invalidRequest("The state is not valid.");
    yield* this.#limit(`login:start:ip:${input.sourceIp}`, 30);
    return yield* this.#startFlow({
      redirectUri: input.redirectUri,
      clientState: input.state,
      clientChallenge: input.codeChallenge,
      deviceCodeHash: null,
    });
  });

  readonly finish = Effect.fn("LoginService.finish")(function* (
    this: LoginService,
    params: URLSearchParams,
  ): Effect.fn.Return<CallbackResult> {
    return yield* this.#finish(params).pipe(
      Effect.catch(() => Effect.succeed<CallbackResult>({ kind: "failed", code: "login_failed" })),
    );
  });

  readonly #finish = Effect.fn("LoginService.finishFlow")(function* (
    this: LoginService,
    params: URLSearchParams,
  ): Effect.fn.Return<CallbackResult, LoginFailure> {
    const state = params.get("state");
    if (!state || !TOKEN_PATTERN.test(state)) return { kind: "failed", code: "login_expired" };
    const stateHash = yield* hash(state);
    const flow = yield* storeCall(() =>
      this.#database
        .prepare("DELETE FROM account_login_flows WHERE state_hash = ? RETURNING *")
        .bind(stateHash)
        .first<FlowRow>(),
    );
    if (!flow) return { kind: "failed", code: "login_expired" };
    const outcome: SignInOutcome =
      flow.expires_at <= this.#now()
        ? { userId: null, error: "login_expired" }
        : yield* this.#signIn(flow, params).pipe(
            Effect.map((userId): SignInOutcome => ({ userId, error: null })),
            Effect.catch((error) =>
              Effect.succeed<SignInOutcome>({
                userId: null,
                error: error instanceof LoginError ? error.code : "login_failed",
              }),
            ),
          );
    if (flow.device_code_hash !== null) return yield* this.#deviceCallback(flow.device_code_hash, outcome);
    if (flow.redirect_uri === null || flow.client_state === null || flow.client_challenge === null) {
      return { kind: "failed", code: "login_failed" };
    }
    const location = new URL(flow.redirect_uri);
    location.searchParams.set("state", flow.client_state);
    if (outcome.userId === null) location.searchParams.set("error", outcome.error);
    else location.searchParams.set("code", yield* this.#issueCode(outcome.userId, flow.client_challenge));
    return { kind: "redirect", location: location.toString() };
  });

  readonly #signIn = Effect.fn("LoginService.signIn")(function* (
    this: LoginService,
    flow: FlowRow,
    params: URLSearchParams,
  ): Effect.fn.Return<string, LoginFailure> {
    if (params.get("error")) return yield* new LoginError(400, "provider_refused", "The sign-in was cancelled.");
    const code = params.get("code");
    if (!code || code.length > 4096) return yield* new LoginError(400, "provider_refused", "The answer is not valid.");
    const grant = yield* this.#provider
      .redeemCode({ code, redirectUri: this.callbackUrl, codeVerifier: flow.provider_verifier, nonce: flow.nonce })
      .pipe(
        Effect.mapError((error) => {
          this.#logger.warn("The identity provider did not complete a sign-in.", {
            failure: error._tag,
            ...(error instanceof ProviderUnavailable ? { step: error.step, detail: error.detail } : {}),
          });
          return new LoginError(502, providerErrorCode(error), "The identity provider did not complete the sign-in.");
        }),
      );
    if (!grant.refreshToken) {
      this.#logger.error(
        "The identity provider gave no refresh token. The account service needs one to check that a user is still active.",
      );
      return yield* new LoginError(502, "refresh_token_missing", "The identity provider gave no refresh token.");
    }
    const account = yield* this.#identities
      .signIn(grant.identity, grant.refreshToken, this.#now())
      .pipe(Effect.mapError(() => new LoginOperationError({})));
    if (account.created) this.#logger.info("An account was created.", { userId: account.userId });
    return account.userId;
  });

  readonly exchange = Effect.fn("LoginService.exchange")(function* (
    this: LoginService,
    input: { code: string; codeVerifier: string; device?: MobileAuthDeviceIdentity; sourceIp: string },
  ): Effect.fn.Return<LoginSession, LoginFailure> {
    const failed = new LoginError(400, "invalid_login_code", "The sign-in did not finish. Start again.");
    yield* this.#limit(`login:exchange:ip:${input.sourceIp}`, 60);
    if (!TOKEN_PATTERN.test(input.code) || !VERIFIER_PATTERN.test(input.codeVerifier)) return yield* failed;
    const givenDevice = input.device;
    const device = givenDevice
      ? yield* Effect.try({
          try: () => normalizeMobileDevice(givenDevice),
          catch: () => new LoginError(400, "invalid_mobile_device", "The mobile device is not valid."),
        })
      : null;
    const codeHash = yield* hash(input.code);
    const challenge = yield* hash(input.codeVerifier);
    const now = this.#now();
    const session = { id: crypto.randomUUID(), token: randomToken() };
    const tokenHash = yield* hash(session.token);
    const [spent, , registered] = yield* storeCall(() =>
      this.#database.batch([
        this.#database
          .prepare(
            `UPDATE account_login_codes SET redeemed_at = ?, session_id = ?
             WHERE code_hash = ? AND client_challenge = ? AND redeemed_at IS NULL AND expires_at > ?
               AND EXISTS (
                 SELECT 1 FROM account_identities
                 WHERE account_identities.user_id = account_login_codes.user_id AND status = 'active'
               )`,
          )
          .bind(now, session.id, codeHash, challenge, now),
        this.#database
          .prepare(
            `INSERT INTO auth_sessions(id, user_id, token_hash, expires_at, created_at, last_used_at)
             SELECT ?, user_id, ?, ?, ?, ? FROM account_login_codes WHERE code_hash = ? AND session_id = ?`,
          )
          .bind(session.id, tokenHash, PERSISTENT_SESSION_EXPIRES_AT, now, now, codeHash, session.id),
        ...(device ? mobileSessionStatements(this.#database, { now, session, device }, null) : []),
      ]),
    );
    if (spent?.meta.changes !== 1) return yield* failed;
    if (device) {
      if (registered?.meta.changes !== 1) return yield* new LoginOperationError({});
      this.#sessionsRevoked();
    }
    return yield* this.#sessionBody(session);
  });

  readonly deviceStart = Effect.fn("LoginService.deviceStart")(function* (
    this: LoginService,
    input: { deviceName: string | null; sourceIp: string },
  ): Effect.fn.Return<DeviceLoginStart, LoginFailure> {
    yield* this.#limit(`login:device-start:ip:${input.sourceIp}`, 20);
    const name = input.deviceName?.normalize("NFC").trim().replace(/\s+/gu, " ") || null;
    if (name && (name.length > DEVICE_NAME_LIMIT || /[\p{Cc}\p{Cf}]/u.test(name))) {
      return yield* invalidRequest("The device name is not valid.");
    }
    const now = this.#now();
    const expiresAt = now + this.#flowTtlMs;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const deviceCode = randomToken(32);
      const userCode = newUserCode();
      const deviceCodeHash = yield* hash(deviceCode);
      const created = yield* storeCall(() =>
        this.#database
          .prepare(
            `INSERT INTO account_device_logins(device_code_hash, user_code, device_name, status, created_at, expires_at)
             VALUES (?, ?, ?, 'pending', ?, ?) ON CONFLICT DO NOTHING`,
          )
          .bind(deviceCodeHash, userCode, name, now, expiresAt)
          .run(),
      );
      if (created.meta.changes !== 1) continue;
      const complete = new URL(this.deviceUrl);
      complete.searchParams.set("code", shownUserCode(userCode));
      return {
        deviceCode,
        userCode: shownUserCode(userCode),
        verificationUrl: this.deviceUrl,
        verificationUrlComplete: complete.toString(),
        interval: DEVICE_POLL_INTERVAL_SECONDS,
        expiresAt,
      };
    }
    return yield* new LoginOperationError({});
  });

  readonly deviceBegin = Effect.fn("LoginService.deviceBegin")(function* (
    this: LoginService,
    input: { userCode: string; sourceIp: string },
  ): Effect.fn.Return<{ authorizationUrl: string }, LoginFailure> {
    const wrong = new LoginError(400, "device_code_invalid", "This code is not valid.");
    yield* this.#limit(`login:device-code:ip:${input.sourceIp}`, 20);
    const normalized = normalizeOneTimeCode(input.userCode);
    if (!normalized) return yield* wrong;
    const device = yield* storeCall(() =>
      this.#database
        .prepare(
          `UPDATE account_device_logins SET status = 'waiting', user_id = NULL, approval_hash = NULL
           WHERE user_code = ? AND status IN ('pending', 'waiting') AND expires_at > ?
           RETURNING device_code_hash`,
        )
        .bind(normalized, this.#now())
        .first<{ device_code_hash: string }>(),
    );
    if (!device) return yield* wrong;
    const flow = yield* this.#startFlow({
      redirectUri: null,
      clientState: null,
      clientChallenge: null,
      deviceCodeHash: device.device_code_hash,
    });
    return { authorizationUrl: flow.authorizationUrl };
  });

  readonly #deviceCallback = Effect.fn("LoginService.deviceCallback")(function* (
    this: LoginService,
    deviceCodeHash: string,
    outcome: SignInOutcome,
  ): Effect.fn.Return<CallbackResult, LoginFailure> {
    if (outcome.userId === null) return { kind: "failed", code: outcome.error };
    const user = yield* this.#identities.user(outcome.userId).pipe(Effect.mapError(() => new LoginOperationError({})));
    if (!user) return { kind: "failed", code: "login_failed" };
    const approval = randomToken(32);
    const approvalHash = yield* hash(approval);
    const device = yield* storeCall(() =>
      this.#database
        .prepare(
          `UPDATE account_device_logins SET user_id = ?, approval_hash = ?
           WHERE device_code_hash = ? AND status = 'waiting' AND expires_at > ?
           RETURNING device_name, user_code`,
        )
        .bind(outcome.userId, approvalHash, deviceCodeHash, this.#now())
        .first<{ device_name: string | null; user_code: string }>(),
    );
    if (!device) return { kind: "failed", code: "login_expired" };
    return {
      kind: "approval",
      approval,
      userCode: shownUserCode(device.user_code),
      userName: user.name ?? user.email,
      deviceName: device.device_name,
    };
  });

  readonly deviceDecide = Effect.fn("LoginService.deviceDecide")(function* (
    this: LoginService,
    input: { approval: string; approve: boolean },
  ): Effect.fn.Return<"approved" | "denied", LoginFailure> {
    const expired = new LoginError(400, "login_expired", "This sign-in is not valid any more. Start again.");
    if (!TOKEN_PATTERN.test(input.approval)) return yield* expired;
    const approvalHash = yield* hash(input.approval);
    const decided = yield* storeCall(() =>
      this.#database
        .prepare(
          `UPDATE account_device_logins SET status = ?, approval_hash = NULL
           WHERE approval_hash = ? AND status = 'waiting' AND user_id IS NOT NULL AND expires_at > ?`,
        )
        .bind(input.approve ? "approved" : "denied", approvalHash, this.#now())
        .run(),
    );
    if (decided.meta.changes !== 1) return yield* expired;
    return input.approve ? "approved" : "denied";
  });

  readonly devicePoll = Effect.fn("LoginService.devicePoll")(function* (
    this: LoginService,
    input: { deviceCode: string; sourceIp: string },
  ): Effect.fn.Return<{ status: "pending" } | LoginSession, LoginFailure> {
    const unknown = new LoginError(400, "device_login_invalid", "This device sign-in is not valid. Start again.");
    yield* this.#limit(`login:device-poll:ip:${input.sourceIp}`, 600);
    if (!TOKEN_PATTERN.test(input.deviceCode)) return yield* unknown;
    const deviceCodeHash = yield* hash(input.deviceCode);
    const now = this.#now();
    const device = yield* storeCall(() =>
      this.#database
        .prepare("SELECT status, expires_at, polled_at FROM account_device_logins WHERE device_code_hash = ?")
        .bind(deviceCodeHash)
        .first<DeviceRow>(),
    );
    if (!device || device.status === "redeemed") return yield* unknown;
    if (device.status === "denied") {
      return yield* new LoginError(403, "device_login_denied", "The sign-in of this device was refused.");
    }
    if (device.expires_at <= now) {
      return yield* new LoginError(410, "device_login_expired", "This device sign-in expired. Start again.");
    }
    if (device.status !== "approved") {
      const minimumGapMs = (DEVICE_POLL_INTERVAL_SECONDS - 1) * 1_000;
      if (device.polled_at !== null && now - device.polled_at < minimumGapMs) {
        return yield* new LoginError(429, "slow_down", "Ask again after the interval.", DEVICE_POLL_INTERVAL_SECONDS);
      }
      yield* storeCall(() =>
        this.#database
          .prepare("UPDATE account_device_logins SET polled_at = ? WHERE device_code_hash = ?")
          .bind(now, deviceCodeHash)
          .run(),
      );
      return { status: "pending" };
    }
    const session = { id: crypto.randomUUID(), token: randomToken() };
    const tokenHash = yield* hash(session.token);
    const [redeemed] = yield* storeCall(() =>
      this.#database.batch([
        this.#database
          .prepare(
            `UPDATE account_device_logins SET status = 'redeemed', session_id = ?
             WHERE device_code_hash = ? AND status = 'approved' AND expires_at > ?
               AND EXISTS (
                 SELECT 1 FROM account_identities
                 WHERE account_identities.user_id = account_device_logins.user_id AND status = 'active'
               )`,
          )
          .bind(session.id, deviceCodeHash, now),
        this.#database
          .prepare(
            `INSERT INTO auth_sessions(id, user_id, token_hash, expires_at, created_at, last_used_at)
             SELECT ?, user_id, ?, ?, ?, ? FROM account_device_logins
             WHERE device_code_hash = ? AND session_id = ?`,
          )
          .bind(session.id, tokenHash, PERSISTENT_SESSION_EXPIRES_AT, now, now, deviceCodeHash, session.id),
      ]),
    );
    if (redeemed?.meta.changes !== 1) return yield* unknown;
    return yield* this.#sessionBody(session);
  });

  readonly prune = Effect.fn("LoginService.prune")(function* (this: LoginService) {
    const now = this.#now();
    yield* storeCall(() =>
      this.#database.batch([
        this.#database.prepare("DELETE FROM account_login_flows WHERE expires_at <= ?").bind(now),
        this.#database
          .prepare("DELETE FROM account_login_codes WHERE expires_at <= ? OR redeemed_at IS NOT NULL")
          .bind(now),
        this.#database.prepare("DELETE FROM account_device_logins WHERE expires_at <= ?").bind(now),
      ]),
    );
  });

  readonly #startFlow = Effect.fn("LoginService.startFlow")(function* (
    this: LoginService,
    input: {
      redirectUri: string | null;
      clientState: string | null;
      clientChallenge: string | null;
      deviceCodeHash: string | null;
    },
  ): Effect.fn.Return<{ authorizationUrl: string; expiresAt: number }, LoginFailure> {
    const state = randomToken(32);
    const nonce = randomToken(24);
    const providerVerifier = randomToken(48);
    const stateHash = yield* hash(state);
    const providerChallenge = yield* hash(providerVerifier);
    const authorizationUrl = yield* this.#provider
      .authorizationUrl({ redirectUri: this.callbackUrl, state, nonce, codeChallenge: providerChallenge })
      .pipe(
        Effect.mapError((error) => {
          this.#logger.warn("The identity provider is not available.", { step: error.step, detail: error.detail });
          return new LoginError(502, "provider_unreachable", "The identity provider does not answer.");
        }),
      );
    const now = this.#now();
    const expiresAt = now + this.#flowTtlMs;
    yield* storeCall(() =>
      this.#database
        .prepare(
          `INSERT INTO account_login_flows(
             state_hash, nonce, provider_verifier, redirect_uri, client_state, client_challenge, device_code_hash,
             created_at, expires_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          stateHash,
          nonce,
          providerVerifier,
          input.redirectUri,
          input.clientState,
          input.clientChallenge,
          input.deviceCodeHash,
          now,
          expiresAt,
        )
        .run(),
    );
    return { authorizationUrl, expiresAt };
  });

  readonly #issueCode = Effect.fn("LoginService.issueCode")(function* (
    this: LoginService,
    userId: string,
    clientChallenge: string,
  ) {
    const code = randomToken(32);
    const codeHash = yield* hash(code);
    const now = this.#now();
    yield* storeCall(() =>
      this.#database
        .prepare(
          `INSERT INTO account_login_codes(code_hash, user_id, client_challenge, created_at, expires_at)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .bind(codeHash, userId, clientChallenge, now, now + CODE_TTL_MS)
        .run(),
    );
    return code;
  });

  readonly #sessionBody = Effect.fn("LoginService.sessionBody")(function* (
    this: LoginService,
    session: { id: string; token: string },
  ): Effect.fn.Return<LoginSession, LoginFailure> {
    const row = yield* storeCall(() =>
      this.#database
        .prepare("SELECT user_id FROM auth_sessions WHERE id = ? AND revoked_at IS NULL")
        .bind(session.id)
        .first<{ user_id: string }>(),
    );
    const user = row
      ? yield* this.#identities.user(row.user_id).pipe(Effect.mapError(() => new LoginOperationError({})))
      : null;
    if (!user) return yield* new LoginOperationError({});
    return { sessionToken: session.token, user };
  });

  readonly #limit = Effect.fn("LoginService.limit")(function* (this: LoginService, key: string, limit: number) {
    yield* enforceRateLimit(this.#database, key, limit, this.#now()).pipe(
      Effect.mapError((error) =>
        error instanceof RateLimited
          ? new LoginError(429, "rate_limited", "Too many sign-in attempts. Try again later.", error.retryAfterSeconds)
          : new LoginOperationError({}),
      ),
    );
  });
}
