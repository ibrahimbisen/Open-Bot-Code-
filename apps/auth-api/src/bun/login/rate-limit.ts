import { Effect, Schema } from "effect";
import { sha256 } from "../../server/crypto";

const RATE_WINDOW_MS = 15 * 60_000;

export class RateLimited extends Schema.TaggedError<RateLimited>()("RateLimited", {
  retryAfterSeconds: Schema.Number,
}) {}

class RateLimitStoreError extends Schema.TaggedError<RateLimitStoreError>()("RateLimitStoreError", {}) {}

export const enforceRateLimit = Effect.fn("AccountRateLimit.enforce")(function* (
  database: D1Database,
  key: string,
  limit: number,
  now: number,
) {
  const windowStart = Math.floor(now / RATE_WINDOW_MS) * RATE_WINDOW_MS;
  const keyHash = yield* sha256(key).pipe(Effect.mapError(() => new RateLimitStoreError({})));
  const row = yield* Effect.tryPromise({
    try: () =>
      database
        .prepare(
          `INSERT INTO auth_rate_limits(key_hash, window_start, attempts) VALUES (?, ?, 1)
           ON CONFLICT(key_hash, window_start) DO UPDATE SET attempts = attempts + 1
           RETURNING attempts`,
        )
        .bind(keyHash, windowStart)
        .first<{ attempts: number }>(),
    catch: () => new RateLimitStoreError({}),
  });
  if ((row?.attempts ?? limit + 1) > limit) {
    return yield* new RateLimited({
      retryAfterSeconds: Math.max(1, Math.ceil((windowStart + RATE_WINDOW_MS - now) / 1_000)),
    });
  }
});
