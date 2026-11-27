import type { Logger } from "@codebot/logging";
import type { Effect } from "effect";
import { runApiEffect } from "../../server/effect-runtime";

export class BackgroundTasks {
  readonly #pending = new Set<Promise<void>>();
  readonly #logger: Logger;
  #closed = false;

  constructor(logger: Logger) {
    this.#logger = logger;
  }

  get size(): number {
    return this.#pending.size;
  }

  readonly waitUntil = (work: Promise<unknown>): void => {
    const tracked: Promise<void> = work.then(
      () => undefined,
      (error: unknown) => {
        this.#logger.warn("A background task failed.", { error: errorName(error) });
      },
    );
    this.#pending.add(tracked);
    void tracked.finally(() => this.#pending.delete(tracked));
  };

  readonly schedule = <E>(work: Effect.Effect<void, E>): void => {
    if (this.#closed) return;
    this.waitUntil(runApiEffect(work));
  };

  async drain(timeoutMs: number): Promise<number> {
    this.#closed = true;
    const deadline = Date.now() + timeoutMs;
    while (this.#pending.size > 0) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) break;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<void>((resolve) => {
        timer = setTimeout(resolve, remaining);
      });
      await Promise.race([Promise.allSettled([...this.#pending]), timeout]);
      clearTimeout(timer);
    }
    return this.#pending.size;
  }
}

function errorName(error: unknown): string {
  if (typeof error === "object" && error !== null && "_tag" in error && typeof error._tag === "string") {
    return error._tag;
  }
  return error instanceof Error ? error.name : typeof error;
}
