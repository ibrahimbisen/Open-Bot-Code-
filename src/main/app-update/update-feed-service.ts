import { EventEmitter } from "node:events";
import type { AppUpdateFeed } from "@codebot/contracts/ipc";
import { isDynamicRecord } from "@codebot/contracts/runtime-values";
import { sourceText } from "@codebot/i18n/source";
import { Effect, Schema } from "effect";
import { PreferenceStore } from "../preference-file";
import {
  parseUpdateFeedUrl,
  redactUpdateFeedUrl,
  resolveUpdateFeed,
  savedUpdateFeedUrl,
  type UpdateFeedUrlProblem,
  updateFeedFileUrl,
  validUpdateFeedUrl,
} from "./update-feed";

export class UpdateFeedFailure extends Schema.TaggedError<UpdateFeedFailure>()("UpdateFeedFailure", {
  cause: Schema.Defect(),
}) {}

export interface GenericUpdateFeedOptions {
  provider: "generic";
  url: string;
}

export interface UpdateFeedAdapter {
  setFeedURL?: ((options: GenericUpdateFeedOptions) => void) | undefined;
}

export interface UpdateFeedConsumer {
  setFeed(configured: boolean): void;
}

interface StoredUpdateFeed {
  url: string | null;
}

interface UpdateFeedServiceOptions {
  storePath: string;
  environmentUrl: string | undefined;
  buildUrl: string | null;
  log: (message: string) => void;
}

const PROBLEM_MESSAGES = {
  empty: "error.appUpdate.urlInvalid",
  invalid: "error.appUpdate.urlInvalid",
  credentials: "error.appUpdate.urlCredentials",
  insecure: "error.appUpdate.urlInsecure",
} as const satisfies Record<UpdateFeedUrlProblem, string>;

export function updateFeedUrlProblemMessage(problem: UpdateFeedUrlProblem): string {
  return sourceText(PROBLEM_MESSAGES[problem]);
}

export class UpdateFeedService extends EventEmitter<{ change: [feed: AppUpdateFeed] }> {
  readonly #store: PreferenceStore<StoredUpdateFeed>;
  readonly #environmentUrl: string | undefined;
  readonly #buildUrl: string | null;
  readonly #log: (message: string) => void;

  constructor(options: UpdateFeedServiceOptions) {
    super();
    this.#environmentUrl = options.environmentUrl;
    this.#buildUrl = options.buildUrl;
    this.#log = options.log;
    this.#store = new PreferenceStore<StoredUpdateFeed>({
      path: options.storePath,
      defaultValue: { url: null },
      decode: (parsed) => (isDynamicRecord(parsed) ? { url: savedUpdateFeedUrl(parsed) } : null),
    });
    const environmentUrl = options.environmentUrl?.trim();
    if (environmentUrl && validUpdateFeedUrl(environmentUrl) === null) {
      options.log("CODEBOT_UPDATE_URL is not a valid update server URL. CodeBot does not use it.");
    }
  }

  readonly load = Effect.fn("UpdateFeedService.load")(function* (this: UpdateFeedService) {
    yield* this.#store.load().pipe(
      Effect.catch((failure) =>
        Effect.sync(() => {
          const { cause } = failure;
          this.#log(
            `The saved update server URL could not be read: ${cause instanceof Error ? cause.message : String(cause)}`,
          );
        }),
      ),
    );
    const feed = this.current();
    this.#log(feed.url === null ? "No update server URL is set." : `The update server URL comes from ${feed.source}.`);
  }).bind(this);

  current(): AppUpdateFeed {
    return resolveUpdateFeed({
      savedUrl: this.#store.get().url,
      environmentUrl: this.#environmentUrl,
      buildUrl: this.#buildUrl,
    });
  }

  url(): string | null {
    return this.current().url;
  }

  fileUrl(fileName: string): string | null {
    const url = this.url();
    return url === null ? null : updateFeedFileUrl(url, fileName);
  }

  redact(text: string): string {
    const url = this.url();
    return url === null ? text : redactUpdateFeedUrl(text, url);
  }

  readonly setSavedUrl = Effect.fn("UpdateFeedService.setSavedUrl")(function* (
    this: UpdateFeedService,
    input: string | null,
  ) {
    let url: string | null = null;
    if (input !== null && input.trim() !== "") {
      const parsed = parseUpdateFeedUrl(input);
      if (!parsed.ok) {
        return yield* new UpdateFeedFailure({ cause: new Error(updateFeedUrlProblemMessage(parsed.problem)) });
      }
      url = parsed.url;
    }
    const before = this.current();
    yield* this.#store
      .set({ url })
      .pipe(
        Effect.mapError(() => new UpdateFeedFailure({ cause: new Error(sourceText("error.appUpdate.urlNotSaved")) })),
      );
    const feed = this.current();
    if (feed.url !== before.url) {
      this.#log(
        feed.url === null ? "No update server URL is set." : `The update server URL comes from ${feed.source}.`,
      );
      this.emit("change", feed);
    }
    return feed;
  }).bind(this);

  connect(adapter: UpdateFeedAdapter | null, consumer: UpdateFeedConsumer): () => void {
    const apply = (feed: AppUpdateFeed) => {
      if (feed.url !== null) adapter?.setFeedURL?.({ provider: "generic", url: feed.url });
      consumer.setFeed(feed.url !== null);
    };
    apply(this.current());
    this.on("change", apply);
    return () => this.off("change", apply);
  }
}
