import { Effect, Result, Schema } from "effect";
import { authEventStatement } from "../../server/remote-control-plane";
import type { Logger } from "../logging";
import { type IdentityRecord, type IdentityStore, tokenContext } from "./identity-store";
import { type IdentityProvider, ProviderRejected, type ProviderRejection } from "./provider";
import type { SecretBox } from "./secret-box";

const CHECK_CONCURRENCY = 4;
const PROVIDER_RETRY_SECONDS = 60;

export class AccountAccessError extends Schema.TaggedError<AccountAccessError>()("AccountAccessError", {
  status: Schema.Number,
  code: Schema.Literals(["unauthorized", "account_disabled", "identity_provider_unreachable"]),
  message: Schema.String,
  retryAfterSeconds: Schema.optional(Schema.Number),
}) {}

class GuardStoreError extends Schema.TaggedError<GuardStoreError>()("GuardStoreError", {}) {}

type CheckOutcome =
  | { kind: "active"; checkedAt: number }
  | { kind: "blocked"; reason: string }
  | { kind: "unknown"; checkedAt: number };

export interface RevalidationSummary {
  checked: number;
  active: number;
  blocked: number;
  unknown: number;
}

function storeCall<A>(operation: () => Promise<A>): Effect.Effect<A, GuardStoreError> {
  return Effect.tryPromise({ try: operation, catch: () => new GuardStoreError({}) });
}

function sessionEnded(): AccountAccessError {
  return new AccountAccessError({ status: 401, code: "unauthorized", message: "The session is invalid." });
}

function accountDisabled(): AccountAccessError {
  return new AccountAccessError({
    status: 403,
    code: "account_disabled",
    message: "This account is disabled at the identity provider.",
  });
}

function providerUnreachable(): AccountAccessError {
  return new AccountAccessError({
    status: 503,
    code: "identity_provider_unreachable",
    message: "The identity provider did not confirm this account for too long. Try again later.",
    retryAfterSeconds: PROVIDER_RETRY_SECONDS,
  });
}

export class AccountGuard {
  readonly #database: D1Database;
  readonly #provider: IdentityProvider;
  readonly #identities: IdentityStore;
  readonly #box: SecretBox;
  readonly #graceMs: number;
  readonly #freshnessMs: number;
  readonly #logger: Logger;
  readonly #now: () => number;
  readonly #accessRevoked: () => void;
  readonly #running = new Map<string, Promise<CheckOutcome>>();

  constructor(input: {
    database: D1Database;
    provider: IdentityProvider;
    identities: IdentityStore;
    box: SecretBox;
    graceSeconds: number;
    freshnessSeconds: number;
    logger: Logger;
    accessRevoked: () => void;
    now?: () => number;
  }) {
    this.#database = input.database;
    this.#provider = input.provider;
    this.#identities = input.identities;
    this.#box = input.box;
    this.#graceMs = input.graceSeconds * 1_000;
    this.#freshnessMs = input.freshnessSeconds * 1_000;
    this.#logger = input.logger;
    this.#accessRevoked = input.accessRevoked;
    this.#now = input.now ?? Date.now;
  }

  readonly requireFreshUser = Effect.fn("AccountGuard.requireFreshUser")(function* (
    this: AccountGuard,
    userId: string,
  ): Effect.fn.Return<void, AccountAccessError> {
    const outcome = yield* this.#fresh(userId);
    if (outcome.kind === "blocked") return yield* sessionEnded();
    if (outcome.kind === "unknown" && this.#now() - outcome.checkedAt > this.#graceMs) {
      return yield* providerUnreachable();
    }
  });

  readonly requireFreshHostOwner = Effect.fn("AccountGuard.requireFreshHostOwner")(function* (
    this: AccountGuard,
    hostId: string,
  ): Effect.fn.Return<void, AccountAccessError> {
    const host = yield* storeCall(() =>
      this.#database
        .prepare("SELECT owner_user_id FROM remote_hosts WHERE host_id = ? LIMIT 1")
        .bind(hostId)
        .first<{ owner_user_id: string }>(),
    ).pipe(Effect.mapError(() => providerUnreachable()));
    if (!host) return;
    const outcome = yield* this.#fresh(host.owner_user_id);
    if (outcome.kind === "blocked") return yield* accountDisabled();
    if (outcome.kind === "unknown" && this.#now() - outcome.checkedAt > this.#graceMs) {
      return yield* providerUnreachable();
    }
  });

  readonly revalidateAll = Effect.fn("AccountGuard.revalidateAll")(function* (
    this: AccountGuard,
  ): Effect.fn.Return<RevalidationSummary> {
    const summary: RevalidationSummary = { checked: 0, active: 0, blocked: 0, unknown: 0 };
    const now = this.#now();
    const due = yield* Effect.result(
      storeCall(() =>
        this.#database
          .prepare(
            `SELECT user_id FROM account_identities
             WHERE status = 'active'
               AND (
                 EXISTS (
                   SELECT 1 FROM auth_sessions
                   WHERE auth_sessions.user_id = account_identities.user_id
                     AND auth_sessions.revoked_at IS NULL AND auth_sessions.expires_at > ?
                 )
                 OR EXISTS (
                   SELECT 1 FROM remote_hosts
                   WHERE remote_hosts.owner_user_id = account_identities.user_id
                     AND remote_hosts.machine_token_hash IS NOT NULL
                 )
               )
             ORDER BY attempted_at`,
          )
          .bind(now)
          .all<{ user_id: string }>(),
      ),
    );
    if (Result.isFailure(due)) return summary;
    let providerDown = false;
    yield* Effect.forEach(
      due.success.results,
      (row) =>
        Effect.gen({ self: this }, function* () {
          if (providerDown) return;
          const outcome = yield* this.#check(row.user_id);
          summary.checked += 1;
          summary[outcome.kind] += 1;
          if (outcome.kind === "unknown") providerDown = true;
        }),
      { concurrency: CHECK_CONCURRENCY, discard: true },
    );
    return summary;
  });

  readonly #fresh = Effect.fn("AccountGuard.fresh")(function* (
    this: AccountGuard,
    userId: string,
  ): Effect.fn.Return<CheckOutcome> {
    const identity = yield* Effect.result(this.#identities.findByUser(userId));
    if (Result.isFailure(identity)) return { kind: "unknown", checkedAt: 0 };
    const record = identity.success;
    if (!record) return { kind: "blocked", reason: "no_identity" };
    if (record.status === "blocked") return { kind: "blocked", reason: record.blockedReason ?? "blocked" };
    if (this.#now() - record.checkedAt <= this.#freshnessMs) return { kind: "active", checkedAt: record.checkedAt };
    return yield* this.#check(userId);
  });

  #check(userId: string): Effect.Effect<CheckOutcome> {
    return Effect.promise(() => {
      const running = this.#running.get(userId);
      if (running) return running;
      const started = Effect.runPromise(this.#revalidate(userId)).finally(() => this.#running.delete(userId));
      this.#running.set(userId, started);
      return started;
    });
  }

  readonly #revalidate = Effect.fn("AccountGuard.revalidate")(function* (
    this: AccountGuard,
    userId: string,
  ): Effect.fn.Return<CheckOutcome> {
    const found = yield* Effect.result(this.#identities.findByUser(userId));
    if (Result.isFailure(found)) return { kind: "unknown", checkedAt: 0 };
    const identity = found.success;
    if (!identity) return { kind: "blocked", reason: "no_identity" };
    if (identity.status === "blocked") return { kind: "blocked", reason: identity.blockedReason ?? "blocked" };
    const checked = yield* Effect.result(this.#askProvider(identity));
    if (Result.isSuccess(checked)) return { kind: "active", checkedAt: checked.success };
    const failure = checked.failure;
    if (failure instanceof ProviderRejected) {
      const blocked = yield* Effect.result(this.#block(identity, failure.reason));
      if (Result.isSuccess(blocked)) return { kind: "blocked", reason: failure.reason };
      this.#logger.error("An account could not be blocked.", { userId });
      return { kind: "blocked", reason: failure.reason };
    }
    yield* Effect.result(this.#identities.recordAttempt(identity, this.#now()));
    this.#logger.warn("The identity provider did not confirm an account. The sessions stay valid.", {
      userId,
      failure: failure._tag,
      ...("step" in failure ? { step: failure.step, detail: failure.detail } : {}),
      lastConfirmedSecondsAgo: Math.round((this.#now() - identity.checkedAt) / 1_000),
    });
    return { kind: "unknown", checkedAt: identity.checkedAt };
  });

  readonly #askProvider = Effect.fn("AccountGuard.askProvider")(function* (
    this: AccountGuard,
    identity: IdentityRecord,
  ) {
    if (!identity.refreshTokenCiphertext) return yield* new GuardStoreError({});
    const context = tokenContext(identity.issuer, identity.subject);
    const refreshToken = yield* this.#box.open(identity.refreshTokenCiphertext, context);
    const tokens = yield* this.#provider.refreshGrant(refreshToken);
    if (tokens.refreshToken && tokens.refreshToken !== refreshToken) {
      yield* this.#identities.storeRefreshToken(identity, tokens.refreshToken, this.#now());
    }
    yield* this.#provider.identify(tokens, identity.subject);
    const checkedAt = this.#now();
    yield* this.#identities.recordConfirmed(identity, checkedAt);
    return checkedAt;
  });

  readonly #block = Effect.fn("AccountGuard.block")(function* (
    this: AccountGuard,
    identity: IdentityRecord,
    reason: ProviderRejection,
  ) {
    const now = this.#now();
    const { userId } = identity;
    const database = this.#database;
    yield* storeCall(() =>
      database.batch([
        database
          .prepare(
            `UPDATE account_identities
             SET status = 'blocked', blocked_reason = ?, refresh_token_ciphertext = NULL, attempted_at = ?, updated_at = ?
             WHERE user_id = ?`,
          )
          .bind(reason, now, now, userId),
        database
          .prepare("UPDATE auth_sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL")
          .bind(now, userId),
        database
          .prepare(
            `INSERT INTO remote_auth_events(event_id, payload, created_at, attempts, next_attempt_at)
             SELECT lower(hex(randomblob(16))),
                    json_object('type', 'remote-session-ended', 'hostId', host_id, 'sessionId', session_id),
                    ?, 0, ?
               FROM remote_sessions WHERE user_id = ? AND ended_at IS NULL`,
          )
          .bind(now, now, userId),
        database
          .prepare("UPDATE remote_sessions SET ended_at = ? WHERE user_id = ? AND ended_at IS NULL")
          .bind(now, userId),
        database
          .prepare(
            "UPDATE remote_hosts SET auth_epoch = auth_epoch + 1, updated_at = ? WHERE owner_user_id = ? AND machine_token_hash IS NOT NULL",
          )
          .bind(now, userId),
        database
          .prepare(
            `INSERT INTO remote_auth_events(event_id, payload, created_at, attempts, next_attempt_at)
             SELECT lower(hex(randomblob(16))),
                    json_object('type', 'remote-auth-changed', 'hostId', host_id, 'authEpoch', auth_epoch),
                    ?, 0, ?
               FROM remote_hosts WHERE owner_user_id = ? AND machine_token_hash IS NOT NULL`,
          )
          .bind(now, now, userId),
        database
          .prepare("UPDATE account_login_codes SET redeemed_at = ? WHERE user_id = ? AND redeemed_at IS NULL")
          .bind(now, userId),
        database
          .prepare(
            "UPDATE account_device_logins SET status = 'denied', approval_hash = NULL WHERE user_id = ? AND status IN ('waiting', 'approved')",
          )
          .bind(userId),
        database
          .prepare("UPDATE team_auth_tickets SET consumed_at = ? WHERE user_id = ? AND consumed_at IS NULL")
          .bind(now, userId),
        database
          .prepare("UPDATE mobile_connect_links SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL")
          .bind(now, userId),
        authEventStatement(database, { type: "account-servers-changed", userId }, now),
      ]),
    );
    this.#logger.warn("An account lost access because the identity provider refused it.", { userId, reason });
    this.#accessRevoked();
  });
}
