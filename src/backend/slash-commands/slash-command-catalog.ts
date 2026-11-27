import { createCodeBotLogger } from "@codebot/logging";
import { Effect, Schema, Semaphore } from "effect";
import { writeJsonFileAtomically } from "../atomic-json-file";
import { readVersionedJsonFile, type VersionedJsonFormat } from "../versioned-json-store";
import type { ClaudeHostPlugins } from "./claude-session-commands";
import type { EngineSlashCommand } from "./slash-command-rows";

const logger = createCodeBotLogger("slash-commands");

export const SLASH_COMMAND_CATALOG_FILE = "slash-commands.json";

const StoredCommand = Schema.Struct({
  name: Schema.String,
  description: Schema.String,
  argumentHint: Schema.String,
  aliases: Schema.Array(Schema.String),
  builtin: Schema.Boolean,
  terminalOnly: Schema.Boolean,
  skill: Schema.Boolean,
});

const StoredEngine = Schema.Struct({
  engine: Schema.String,
  cliVersion: Schema.NullOr(Schema.String),
  engineVersion: Schema.NullOr(Schema.String),
  origin: Schema.Literals(["probe", "session"]),
  savedAt: Schema.String,
  commands: Schema.Array(StoredCommand),
});

const StoredSlashCommandCatalog = Schema.Struct({
  version: Schema.Literal(1),
  engines: Schema.Array(StoredEngine),
});
type StoredSlashCommandCatalog = typeof StoredSlashCommandCatalog.Type;

const SLASH_COMMAND_CATALOG_FORMAT: VersionedJsonFormat<StoredSlashCommandCatalog> = {
  current: 1,
  releases: { 1: Schema.decodeUnknownSync(StoredSlashCommandCatalog) },
};

export interface SavedEngineCommands {
  readonly engine: string;
  readonly cliVersion: string | null;
  readonly engineVersion: string | null;
  readonly origin: "probe" | "session";
  readonly savedAt: string;
  readonly commands: readonly EngineSlashCommand[];
}

export interface LiveSlashCommands {
  readonly engine: string;
  readonly engineVersion: string | null;
  readonly commands: readonly EngineSlashCommand[];
  readonly plugins: readonly string[];
  readonly hostPlugins: ClaudeHostPlugins;
}

export class SlashCommandCatalog {
  readonly #path: string;
  #writePath: string;
  readonly #saved = new Map<string, SavedEngineCommands>();
  readonly #live = new Map<string, LiveSlashCommands>();
  readonly #writes = Semaphore.makeUnsafe(1);
  #loaded = false;

  constructor(path: string) {
    this.#path = path;
    this.#writePath = path;
  }

  load(): Effect.Effect<void> {
    return this.#loaded ? Effect.void : this.#writes.withPermit(this.#read());
  }

  readonly #read = Effect.fn("SlashCommandCatalog.read")(function* (this: SlashCommandCatalog) {
    if (this.#loaded) return;
    this.#loaded = true;
    const loaded = yield* readVersionedJsonFile(this.#path, SLASH_COMMAND_CATALOG_FORMAT);
    this.#writePath = loaded.writePath;
    if (loaded.state === "damaged")
      logger.warn("The saved slash command lists are damaged. CodeBot reads them from the engines again.");
    else if (loaded.state === "unreadable") logger.warn("Could not read the saved slash command lists.");
    else if (loaded.state === "kept")
      logger.warn("A newer version wrote the slash command lists file. It stays unchanged.");
    for (const engine of loaded.value?.engines ?? []) this.#saved.set(engine.engine, engine);
  }).bind(this);

  saved(engine: string): SavedEngineCommands | null {
    return this.#saved.get(engine) ?? null;
  }

  save(entry: SavedEngineCommands): Effect.Effect<void> {
    return this.load().pipe(
      Effect.andThen(
        Effect.suspend(() => {
          this.#saved.set(entry.engine, entry);
          return this.#write();
        }),
      ),
    );
  }

  live(chat: string): LiveSlashCommands | null {
    return this.#live.get(chat) ?? null;
  }

  setLive(chat: string, value: LiveSlashCommands): boolean {
    const known = this.#live.get(chat);
    if (known && JSON.stringify(known) === JSON.stringify(value)) return false;
    this.#live.set(chat, value);
    return true;
  }

  forgetLive(chat: string): boolean {
    return this.#live.delete(chat);
  }

  liveChats(): string[] {
    return [...this.#live.keys()];
  }

  #write(): Effect.Effect<void> {
    return this.#writes
      .withPermit(
        Effect.uninterruptible(
          Effect.suspend(() => {
            const stored: StoredSlashCommandCatalog = {
              version: 1,
              engines: [...this.#saved.values()].map((entry) => ({
                ...entry,
                commands: entry.commands.map((command) => ({ ...command, aliases: [...command.aliases] })),
              })),
            };
            return writeJsonFileAtomically(this.#writePath, stored, { createDirectory: true });
          }),
        ),
      )
      .pipe(
        Effect.catch((failure) =>
          Effect.sync(() => logger.warn("Could not save the slash command lists.", { error: failure.cause })),
        ),
      );
  }
}
