import { isBelowMinimumVersion, parseAppMinimumVersion } from "@codebot/contracts/app-minimum-version";
import type { UpdateStatus } from "@codebot/contracts/ipc";
import { isDynamicRecord } from "@codebot/contracts/runtime-values";
import { Effect, Exit, Result, Schema, Scope } from "effect";
import { MINIMUM_VERSION_FILE, updateFeedFileUrl } from "./app-update/update-feed";

const INITIAL_DELAY_MS = 15_000;
const INTERVAL_MS = 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_FILE_BYTES = 16_384;

class RequiredUpdateCheckError extends Schema.TaggedError<RequiredUpdateCheckError>()("RequiredUpdateCheckError", {
  cause: Schema.Defect(),
}) {}

export type RequiredUpdateFetch = (url: URL, init: RequestInit) => Promise<Response>;

type RequiredUpdateSurface = "desktop" | "host";

export interface RequiredUpdateOptions {
  surface: RequiredUpdateSurface;
  currentVersion: string;
  feedUrl: () => string | null;
  updater: { getStatus(): UpdateStatus; setRequiredVersion(version: string | null): void };
  setRequired: (required: boolean) => void;
  log: (message: string) => void;
  fetch?: RequiredUpdateFetch;
}

type RequiredUpdateOutcome = "supported" | "required" | "unknown";

type MinimumVersionAnswer =
  | { readonly found: true; readonly minimumVersion: string | null }
  | { readonly found: false };

function parseMinimumVersionFile(value: unknown, surface: RequiredUpdateSurface): string | null {
  return isDynamicRecord(value) ? parseAppMinimumVersion({ minimumVersion: value[surface] }) : null;
}

export class RequiredUpdate {
  readonly #options: RequiredUpdateOptions;
  readonly #fetch: RequiredUpdateFetch;
  readonly #workScope = Scope.makeUnsafe();
  #timer: ReturnType<typeof setTimeout> | null = null;
  #required: string | null = null;
  #checking = false;
  #refreshPending = false;
  #disposed = false;

  constructor(options: RequiredUpdateOptions) {
    this.#options = options;
    this.#fetch = options.fetch ?? fetch;
  }

  start(): void {
    this.#schedule(INITIAL_DELAY_MS);
  }

  refresh(): void {
    if (this.#disposed) return;
    if (this.#checking) this.#refreshPending = true;
    else this.#schedule(0);
  }

  readonly check = Effect.fn("RequiredUpdate.check")(function* (this: RequiredUpdate) {
    const feedUrl = this.#options.feedUrl();
    if (feedUrl === null) {
      this.#apply(null);
      return "supported" satisfies RequiredUpdateOutcome;
    }
    const url = new URL(updateFeedFileUrl(feedUrl, MINIMUM_VERSION_FILE));
    const answer = yield* Effect.result(
      Effect.tryPromise({
        try: async (signal): Promise<MinimumVersionAnswer> => {
          const response = await this.#fetch(url, {
            headers: { Accept: "application/json" },
            cache: "no-store",
            signal: AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]),
          });
          if (response.status === 404 || response.status === 410) {
            await response.body?.cancel();
            return { found: false };
          }
          if (!response.ok) {
            await response.body?.cancel();
            throw new Error(`The update server answered ${response.status}.`);
          }
          const text = await response.text();
          if (text.length > MAX_FILE_BYTES) throw new Error(`${MINIMUM_VERSION_FILE} is too large.`);
          return { found: true, minimumVersion: minimumVersionInFile(text, this.#options.surface) };
        },
        catch: (cause) => new RequiredUpdateCheckError({ cause }),
      }),
    );
    if (Result.isFailure(answer)) {
      const { cause } = answer.failure;
      this.#options.log(`The minimum version check failed: ${cause instanceof Error ? cause.message : String(cause)}`);
      return "unknown" satisfies RequiredUpdateOutcome;
    }
    const minimumVersion = answer.success.found ? answer.success.minimumVersion : null;
    const required =
      !this.#options.updater.getStatus().managedByHost &&
      isBelowMinimumVersion(this.#options.currentVersion, minimumVersion);
    this.#apply(required ? minimumVersion : null);
    return (required ? "required" : "supported") satisfies RequiredUpdateOutcome;
  }).bind(this);

  readonly dispose = Effect.fn("RequiredUpdate.dispose")(function* (this: RequiredUpdate) {
    this.#disposed = true;
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = null;
    yield* Scope.close(this.#workScope, Exit.void);
  }).bind(this);

  #apply(minimumVersion: string | null): void {
    if (this.#required === minimumVersion) return;
    this.#required = minimumVersion;
    this.#options.log(
      minimumVersion
        ? `CodeBot ${this.#options.currentVersion} is below the minimum version ${minimumVersion}.`
        : "CodeBot is at or above the minimum version.",
    );
    this.#options.updater.setRequiredVersion(minimumVersion);
    this.#options.setRequired(minimumVersion !== null);
  }

  #schedule(delayMs: number): void {
    if (this.#disposed) return;
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = setTimeout(() => {
      this.#timer = null;
      this.#checking = true;
      const next = Effect.sync(() => {
        const soon = this.#refreshPending;
        this.#checking = false;
        this.#refreshPending = false;
        this.#schedule(soon ? 0 : INTERVAL_MS);
      });
      Effect.runFork(
        Effect.forkIn(this.check().pipe(Effect.ensuring(next)), this.#workScope, { startImmediately: true }),
      );
    }, delayMs);
    this.#timer.unref?.();
  }
}

function minimumVersionInFile(text: string, surface: RequiredUpdateSurface): string | null {
  try {
    return parseMinimumVersionFile(JSON.parse(text), surface);
  } catch {
    return null;
  }
}
