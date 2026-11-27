import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isDynamicRecord, isString } from "@codebot/contracts/runtime-values";
import { createCodeBotLogger } from "@codebot/logging";
import { Effect, Semaphore } from "effect";
import { writeJsonFileAtomically } from "../atomic-json-file";

const logger = createCodeBotLogger("slash-commands");
const FILE = "claude-session-aliases.json";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const MAX_ALIASES = 5_000;

export class ClaudeSessionAliases {
  readonly #path: string | null;
  readonly #sessions = new Map<string, string>();
  readonly #writes = Semaphore.makeUnsafe(1);

  constructor(stateDirectory: string | undefined) {
    this.#path = stateDirectory === undefined ? null : join(stateDirectory, FILE);
    if (this.#path === null) return;
    let stored: unknown;
    try {
      stored = JSON.parse(readFileSync(this.#path, "utf8"));
    } catch {
      return;
    }
    try {
      const sessions = isDynamicRecord(stored) && stored.version === 1 ? stored.sessions : null;
      if (!isDynamicRecord(sessions)) return;
      for (const [threadId, sessionId] of Object.entries(sessions))
        if (UUID.test(threadId) && isString(sessionId) && UUID.test(sessionId)) this.#sessions.set(threadId, sessionId);
    } catch {
      this.#sessions.clear();
    }
  }

  sessionOf(threadId: string): string {
    return this.#sessions.get(threadId) ?? threadId;
  }

  set(threadId: string, sessionId: string): Effect.Effect<void> {
    if (!UUID.test(sessionId) || this.sessionOf(threadId) === sessionId) return Effect.void;
    if (sessionId === threadId) this.#sessions.delete(threadId);
    else {
      this.#sessions.delete(threadId);
      this.#sessions.set(threadId, sessionId);
      for (const oldest of this.#sessions.keys()) {
        if (this.#sessions.size <= MAX_ALIASES) break;
        this.#sessions.delete(oldest);
      }
    }
    return this.#write();
  }

  forget(threadId: string): Effect.Effect<void> {
    return this.#sessions.delete(threadId) ? this.#write() : Effect.void;
  }

  #write(): Effect.Effect<void> {
    const path = this.#path;
    if (path === null) return Effect.void;
    return this.#writes
      .withPermit(
        Effect.suspend(() =>
          writeJsonFileAtomically(
            path,
            { version: 1, sessions: Object.fromEntries(this.#sessions) },
            { createDirectory: true },
          ),
        ),
      )
      .pipe(
        Effect.catch((failure) =>
          Effect.sync(() => logger.warn("Could not save the Claude session aliases.", { error: failure.cause })),
        ),
      );
  }
}

const stores = new Map<string, ClaudeSessionAliases>();

export function claudeSessionAliases(stateDirectory: string | undefined): ClaudeSessionAliases {
  const key = stateDirectory ?? "";
  const known = stores.get(key);
  if (known) return known;
  const created = new ClaudeSessionAliases(stateDirectory);
  if (stateDirectory !== undefined) stores.set(key, created);
  return created;
}
