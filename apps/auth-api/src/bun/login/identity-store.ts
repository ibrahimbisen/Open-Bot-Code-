import { isAvatarColor } from "@codebot/contracts/ipc";
import { validateProfileName } from "@codebot/contracts/validation";
import { Effect, Schema } from "effect";
import type { AuthUser } from "../../server/types";
import { accountAddress } from "./account-address";
import type { ProviderIdentity } from "./provider";
import type { SecretBox } from "./secret-box";

export class IdentityStoreError extends Schema.TaggedError<IdentityStoreError>()("IdentityStoreError", {}) {}

export interface IdentityRecord {
  issuer: string;
  subject: string;
  userId: string;
  status: "active" | "blocked";
  blockedReason: string | null;
  refreshTokenCiphertext: string | null;
  checkedAt: number;
  attemptedAt: number;
}

interface IdentityRow {
  issuer: string;
  subject: string;
  user_id: string;
  status: "active" | "blocked";
  blocked_reason: string | null;
  refresh_token_ciphertext: string | null;
  checked_at: number;
  attempted_at: number;
}

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  analytics_enabled: number | null;
  chat_color: string | null;
}

const IDENTITY_COLUMNS =
  "issuer, subject, user_id, status, blocked_reason, refresh_token_ciphertext, checked_at, attempted_at";
const USER_COLUMNS = "id, email, name, avatar_url, analytics_enabled, chat_color";

function storeCall<A>(operation: () => Promise<A>): Effect.Effect<A, IdentityStoreError> {
  return Effect.tryPromise({ try: operation, catch: () => new IdentityStoreError({}) });
}

function identityRecord(row: IdentityRow): IdentityRecord {
  return {
    issuer: row.issuer,
    subject: row.subject,
    userId: row.user_id,
    status: row.status,
    blockedReason: row.blocked_reason,
    refreshTokenCiphertext: row.refresh_token_ciphertext,
    checkedAt: row.checked_at,
    attemptedAt: row.attempted_at,
  };
}

export function accountUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url,
    analyticsEnabled: row.analytics_enabled === null ? null : row.analytics_enabled === 1,
    chatColor: isAvatarColor(row.chat_color) ? row.chat_color : null,
  };
}

export function tokenContext(issuer: string, subject: string): string {
  return `refresh-token\n${issuer}\n${subject}`;
}

function profileName(identity: ProviderIdentity): string | null {
  const candidate = identity.name ?? identity.username;
  if (!candidate) return null;
  const validation = validateProfileName(candidate);
  return validation.error ? null : validation.name;
}

export class IdentityStore {
  readonly #database: D1Database;
  readonly #box: SecretBox;

  constructor(database: D1Database, box: SecretBox) {
    this.#database = database;
    this.#box = box;
  }

  readonly find = Effect.fn("IdentityStore.find")(function* (this: IdentityStore, issuer: string, subject: string) {
    const row = yield* storeCall(() =>
      this.#database
        .prepare(`SELECT ${IDENTITY_COLUMNS} FROM account_identities WHERE issuer = ? AND subject = ?`)
        .bind(issuer, subject)
        .first<IdentityRow>(),
    );
    return row ? identityRecord(row) : null;
  });

  readonly findByUser = Effect.fn("IdentityStore.findByUser")(function* (this: IdentityStore, userId: string) {
    const row = yield* storeCall(() =>
      this.#database
        .prepare(`SELECT ${IDENTITY_COLUMNS} FROM account_identities WHERE user_id = ?`)
        .bind(userId)
        .first<IdentityRow>(),
    );
    return row ? identityRecord(row) : null;
  });

  readonly user = Effect.fn("IdentityStore.user")(function* (this: IdentityStore, userId: string) {
    const row = yield* storeCall(() =>
      this.#database.prepare(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`).bind(userId).first<UserRow>(),
    );
    return row ? accountUser(row) : null;
  });

  readonly signIn = Effect.fn("IdentityStore.signIn")(function* (
    this: IdentityStore,
    identity: ProviderIdentity,
    refreshToken: string,
    now: number,
  ): Effect.fn.Return<{ userId: string; created: boolean }, IdentityStoreError> {
    const ciphertext = yield* this.#box
      .seal(refreshToken, tokenContext(identity.issuer, identity.subject))
      .pipe(Effect.mapError(() => new IdentityStoreError({})));
    const known = yield* this.find(identity.issuer, identity.subject);
    if (known) {
      yield* this.#activate(identity, ciphertext, now);
      yield* this.#fillName(known.userId, identity, now);
      return { userId: known.userId, created: false };
    }
    const moved = yield* this.#adopt(identity, ciphertext, now);
    if (moved) {
      yield* this.#fillName(moved, identity, now);
      return { userId: moved, created: false };
    }
    for (const tagged of [false, true]) {
      const userId = yield* this.#create(identity, ciphertext, now, tagged);
      if (userId) return { userId, created: true };
      const raced = yield* this.find(identity.issuer, identity.subject);
      if (raced) return { userId: raced.userId, created: false };
    }
    return yield* new IdentityStoreError({});
  });

  readonly #activate = Effect.fn("IdentityStore.activate")(function* (
    this: IdentityStore,
    identity: ProviderIdentity,
    ciphertext: string,
    now: number,
  ) {
    yield* storeCall(() =>
      this.#database
        .prepare(
          `UPDATE account_identities
           SET username = ?, status = 'active', blocked_reason = NULL, refresh_token_ciphertext = ?,
               checked_at = ?, attempted_at = ?, updated_at = ?
           WHERE issuer = ? AND subject = ?`,
        )
        .bind(identity.username, ciphertext, now, now, now, identity.issuer, identity.subject)
        .run(),
    );
  });

  readonly #adopt = Effect.fn("IdentityStore.adopt")(function* (
    this: IdentityStore,
    identity: ProviderIdentity,
    ciphertext: string,
    now: number,
  ) {
    const address = accountAddress(identity.issuer, identity.subject, { tagged: false });
    const holder = yield* storeCall(() =>
      this.#database
        .prepare(
          `SELECT users.id AS user_id, account_identities.issuer, account_identities.subject
           FROM users LEFT JOIN account_identities ON account_identities.user_id = users.id
           WHERE users.email = ?`,
        )
        .bind(address)
        .first<{ user_id: string; issuer: string | null; subject: string | null }>(),
    );
    if (!holder) return null;
    if (holder.issuer !== null && holder.subject !== identity.subject) return null;
    const moved = yield* storeCall(() =>
      this.#database
        .prepare(
          `INSERT INTO account_identities(
             issuer, subject, user_id, username, status, refresh_token_ciphertext, checked_at, attempted_at,
             created_at, updated_at
           ) VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)
           ON CONFLICT(user_id) DO UPDATE SET issuer = excluded.issuer, subject = excluded.subject,
             username = excluded.username, status = 'active', blocked_reason = NULL,
             refresh_token_ciphertext = excluded.refresh_token_ciphertext, checked_at = excluded.checked_at,
             attempted_at = excluded.attempted_at, updated_at = excluded.updated_at`,
        )
        .bind(identity.issuer, identity.subject, holder.user_id, identity.username, ciphertext, now, now, now, now)
        .run(),
    );
    return moved.meta.changes === 1 ? holder.user_id : null;
  });

  readonly #create = Effect.fn("IdentityStore.create")(function* (
    this: IdentityStore,
    identity: ProviderIdentity,
    ciphertext: string,
    now: number,
    tagged: boolean,
  ) {
    const userId = crypto.randomUUID();
    const identityKey = `identity:${identity.issuer}#${identity.subject}`;
    const address = accountAddress(identity.issuer, identity.subject, { tagged });
    const [createdUser, createdIdentity] = yield* storeCall(() =>
      this.#database.batch([
        this.#database
          .prepare(
            `INSERT INTO users(id, identity_key, email, name, avatar_url, created_at, updated_at)
             VALUES (?, ?, ?, ?, NULL, ?, ?) ON CONFLICT DO NOTHING`,
          )
          .bind(userId, identityKey, address, profileName(identity), now, now),
        this.#database
          .prepare(
            `INSERT INTO account_identities(
               issuer, subject, user_id, username, status, refresh_token_ciphertext, checked_at, attempted_at,
               created_at, updated_at
             )
             SELECT ?, ?, id, ?, 'active', ?, ?, ?, ?, ? FROM users WHERE id = ?
             ON CONFLICT DO NOTHING`,
          )
          .bind(identity.issuer, identity.subject, identity.username, ciphertext, now, now, now, now, userId),
      ]),
    );
    return createdUser?.meta.changes === 1 && createdIdentity?.meta.changes === 1 ? userId : null;
  });

  readonly #fillName = Effect.fn("IdentityStore.fillName")(function* (
    this: IdentityStore,
    userId: string,
    identity: ProviderIdentity,
    now: number,
  ) {
    const name = profileName(identity);
    if (!name) return;
    yield* storeCall(() =>
      this.#database
        .prepare("UPDATE users SET name = ?, updated_at = ? WHERE id = ? AND name IS NULL")
        .bind(name, now, userId)
        .run(),
    );
  });
}
