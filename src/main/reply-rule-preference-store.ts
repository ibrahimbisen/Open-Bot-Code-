import { isReplyRuleSettings, PROJECT_LIMITS, type ReplyRuleSettings } from "@codebot/contracts/ipc";
import { isDynamicRecord } from "@codebot/contracts/runtime-values";
import { Effect, Result, Semaphore } from "effect";
import { isMissingFileError } from "../backend/file-errors";
import { type PreferenceFileFailure, readPreferenceFile, writePreferenceFile } from "./preference-file";

export const REPLY_RULE_PREFERENCE_FILE = "codebot-reply-rule-v1.json";

export class ReplyRulePreferenceStore {
  readonly #path: string;
  #rule: string | null = null;
  #writes = Semaphore.makeUnsafe(1);
  readonly #listeners = new Set<(settings: ReplyRuleSettings) => void>();

  constructor(path: string) {
    this.#path = path;
  }

  load(): Effect.Effect<void, PreferenceFileFailure> {
    return Effect.gen({ self: this }, function* () {
      const loaded = yield* Effect.result(
        readPreferenceFile(this.#path, (parsed): string | null =>
          isDynamicRecord(parsed) && parsed.version === 1 && isReplyRuleSettings(parsed) ? parsed.rule : null,
        ),
      );
      if (Result.isSuccess(loaded)) this.#rule = loaded.success;
      else if (!isMissingFileError(loaded.failure.cause) && !(loaded.failure.cause instanceof SyntaxError))
        return yield* loaded.failure;
    });
  }

  get(): ReplyRuleSettings {
    return { rule: this.#rule };
  }

  rule(): string | null {
    return this.#rule;
  }

  onChange(listener: (settings: ReplyRuleSettings) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  readonly set = Effect.fn("ReplyRulePreference.set")((settings: ReplyRuleSettings) =>
    this.#writes.withPermit(
      Effect.uninterruptible(
        writePreferenceFile(this.#path, { version: 1, rule: settings.rule }).pipe(
          Effect.map(() => {
            const changed = this.#rule !== settings.rule;
            this.#rule = settings.rule;
            const current = this.get();
            if (changed) for (const listener of this.#listeners) listener(current);
            return current;
          }),
        ),
      ),
    ),
  );
}

export function parseReplyRuleSettings(value: unknown): ReplyRuleSettings {
  if (!isReplyRuleSettings(value)) throw new Error("A reply rule is a text or null.");
  const rule = value.rule === null ? null : value.rule.trim().slice(0, PROJECT_LIMITS.replyRule);
  return { rule };
}
