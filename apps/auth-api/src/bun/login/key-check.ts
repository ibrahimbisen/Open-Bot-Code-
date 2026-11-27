import { Effect, Schema } from "effect";
import { deriveSecret } from "../../server/crypto";

const STATE_NAME = "secret_key_check";
const CHECK_LABEL = "codebot/account-service/key-check/v1";

export class SecretKeyMismatch extends Schema.TaggedError<SecretKeyMismatch>()("SecretKeyMismatch", {}) {}

class KeyCheckError extends Schema.TaggedError<KeyCheckError>()("KeyCheckError", {}) {}

function storeCall<A>(operation: () => Promise<A>): Effect.Effect<A, KeyCheckError> {
  return Effect.tryPromise({ try: operation, catch: () => new KeyCheckError({}) });
}

export const checkSecretKey = Effect.fn("AccountKeyCheck.check")(function* (
  database: D1Database,
  secret: string,
  options: { replace: boolean; now: number },
) {
  const check = yield* deriveSecret(secret, CHECK_LABEL).pipe(Effect.mapError(() => new KeyCheckError({})));
  const stored = yield* storeCall(() =>
    database
      .prepare("SELECT value FROM account_service_state WHERE name = ?")
      .bind(STATE_NAME)
      .first<{ value: string }>(),
  );
  if (stored?.value === check) return "current" as const;
  const save = database
    .prepare(
      `INSERT INTO account_service_state(name, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(name) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .bind(STATE_NAME, check, options.now);
  if (!stored) {
    yield* storeCall(() => save.run());
    return "first" as const;
  }
  if (!options.replace) return yield* new SecretKeyMismatch({});
  yield* storeCall(() =>
    database.batch([
      save,
      database
        .prepare(
          `UPDATE auth_sessions SET revoked_at = ?
           WHERE revoked_at IS NULL AND user_id IN (SELECT user_id FROM account_identities)`,
        )
        .bind(options.now),
      database
        .prepare(
          `UPDATE account_identities
           SET status = 'blocked', blocked_reason = 'key_replaced', refresh_token_ciphertext = NULL, updated_at = ?`,
        )
        .bind(options.now),
    ]),
  );
  return "replaced" as const;
});
