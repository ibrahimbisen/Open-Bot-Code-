import { agentProviderDescriptor } from "@codebot/contracts/agent-providers";
import { olderVersion } from "@codebot/contracts/cli-version";
import {
  type AgentStatus,
  type AgentSummary,
  type SlashCommandChatInput,
  type SlashCommandList,
  type SlashCommandsChanged,
  workspaceAccessEnforced,
} from "@codebot/contracts/ipc";
import { sourceText } from "@codebot/i18n/source";
import { createCodeBotLogger, redactText } from "@codebot/logging";
import { Effect, Schema } from "effect";
import { sessionSettingsIdentity } from "../agent/session-settings";
import type { AgentClient } from "../agent-client";
import type { AppServerNotification } from "../protocol";
import { providerFailure } from "../provider-client-effects";
import {
  CLAUDE_COMMAND_PROBE_TIMEOUT_MS,
  type ClaudeCustomListing,
  decodeClaudeCommandProbe,
  decodeClaudeCustomListing,
} from "./claude-command-probe";
import { decodeSlashCommandSessionReport, type SlashCommandSessionReport } from "./claude-session-commands";
import type { SavedEngineCommands, SlashCommandCatalog } from "./slash-command-catalog";
import { claudeSavedEntries, claudeSessionEntries, providerEntries } from "./slash-command-entries";
import {
  type EngineSlashCommand,
  SLASH_COMMANDS_CUSTOM_METHOD,
  SLASH_COMMANDS_PROBE_METHOD,
  SLASH_COMMANDS_UPDATED_METHOD,
  sameEngineSlashCommands,
} from "./slash-command-rows";

const logger = createCodeBotLogger("slash-commands");
const CLAUDE_ENGINE = "claude";
const CUSTOM_LISTING_TIMEOUT_MS = 5_000;
const PENDING_REPORT_LIMIT = 50;
const NO_CUSTOM_COMMANDS: ClaudeCustomListing = { custom: [], naming: { projectPlugin: false, userPlugin: false } };

export class SlashCommandsFailed extends Schema.TaggedError<SlashCommandsFailed>()("SlashCommandsFailed", {
  cause: Schema.Defect(),
}) {}

export interface SlashCommandChat {
  readonly agentId: string;
  readonly taskId: string | null;
}

export interface SlashCommandsOptions {
  catalog: SlashCommandCatalog;
  agent(agentId: string): AgentSummary | undefined;
  hasTask(agentId: string, taskId: string): boolean;
  chatOfThread(externalThreadId: string): SlashCommandChat | null;
  clientOfAgent(agent: AgentSummary): AgentClient | null;
  claudeClient(): AgentClient | null;
  changed(change: SlashCommandsChanged): void;
  fork(work: Effect.Effect<void>): void;
}

function chatKey(chat: SlashCommandChat): string {
  return chat.taskId === null ? chat.agentId : `${chat.agentId}\u0000${chat.taskId}`;
}

function builtinRows(rows: readonly EngineSlashCommand[]): EngineSlashCommand[] {
  return rows.filter((row) => row.builtin);
}

function withKnownFlags(
  rows: readonly EngineSlashCommand[],
  known: readonly EngineSlashCommand[],
): EngineSlashCommand[] {
  const flags = new Map(known.map((row) => [row.name, row]));
  return rows.map((row) => {
    const flagged = flags.get(row.name);
    return flagged ? { ...row, terminalOnly: flagged.terminalOnly, skill: flagged.skill } : row;
  });
}

export class SlashCommands {
  readonly #probed = new Set<string>();
  #probing = false;
  #queued: string | null = null;
  readonly #pending = new Map<string, { client: AgentClient; notification: AppServerNotification }>();

  constructor(private readonly options: SlashCommandsOptions) {}

  load(): Effect.Effect<void> {
    return this.options.catalog.load();
  }

  readonly list = Effect.fn("SlashCommands.list")(function* (
    this: SlashCommands,
    input: SlashCommandChatInput,
  ): Effect.fn.Return<SlashCommandList, SlashCommandsFailed> {
    const agent = this.options.agent(input.agentId);
    if (!agent) return yield* new SlashCommandsFailed({ cause: new Error(sourceText("error.agent.selectedGone")) });
    const taskId = input.taskId ?? null;
    if (taskId !== null && !this.options.hasTask(agent.id, taskId))
      return yield* new SlashCommandsFailed({ cause: new Error(sourceText("error.backend.threadNotFound")) });
    yield* this.options.catalog.load();
    const engine = sessionSettingsIdentity(agent);
    const chat = { agentId: agent.id, taskId };
    const live = this.options.catalog.live(chatKey(chat));
    if (live && live.engine === engine)
      return {
        ...chat,
        provider: agent.provider,
        origin: "session",
        engineVersion: live.engineVersion,
        commands:
          agent.provider === "claude"
            ? claudeSessionEntries(live.commands, { plugins: live.plugins, hostPlugins: live.hostPlugins, custom: [] })
            : providerEntries(agent.provider, live.commands),
      };
    const saved = this.options.catalog.saved(engine);
    const commands =
      agent.provider === "claude"
        ? yield* this.#claudeCustom(agent).pipe(
            Effect.map((listing) => claudeSavedEntries(saved?.commands ?? [], listing.custom, listing.naming)),
          )
        : providerEntries(agent.provider, saved?.commands ?? []);
    return {
      ...chat,
      provider: agent.provider,
      origin: saved ? "saved" : "none",
      engineVersion: saved?.engineVersion ?? null,
      commands,
    };
  });

  #claudeCustom(agent: AgentSummary): Effect.Effect<ClaudeCustomListing> {
    const client = this.options.clientOfAgent(agent) ?? this.options.claudeClient();
    if (!client?.running) return Effect.succeed(NO_CUSTOM_COMMANDS);
    const workspaceOnly =
      agentProviderDescriptor("claude").workspaceEnforcement === "tool-sandbox" && workspaceAccessEnforced(agent);
    return client
      .request(
        SLASH_COMMANDS_CUSTOM_METHOD,
        { cwd: agent.workspacePath, workspaceOnly },
        decodeClaudeCustomListing,
        CUSTOM_LISTING_TIMEOUT_MS,
      )
      .pipe(Effect.orElseSucceed(() => NO_CUSTOM_COMMANDS));
  }

  handleNotification(client: AgentClient, notification: AppServerNotification): boolean {
    if (notification.method !== SLASH_COMMANDS_UPDATED_METHOD) return false;
    const report = decodeSlashCommandSessionReport(notification.params);
    const chat = report ? this.options.chatOfThread(report.threadId) : null;
    const agent = chat ? this.options.agent(chat.agentId) : undefined;
    if (!report) return true;
    if (!chat || !agent) {
      this.#pending.delete(report.threadId);
      this.#pending.set(report.threadId, { client, notification });
      for (const oldest of this.#pending.keys()) {
        if (this.#pending.size <= PENDING_REPORT_LIMIT) break;
        this.#pending.delete(oldest);
      }
      return true;
    }
    if (agent.provider !== client.provider) return true;
    const engine = sessionSettingsIdentity(agent);
    const changed = this.options.catalog.setLive(chatKey(chat), {
      engine,
      engineVersion: report.engineVersion,
      commands: report.commands,
      plugins: report.plugins,
      hostPlugins: report.hostPlugins,
    });
    if (changed) this.options.changed(chat);
    this.options.fork(this.#keepSaved(engine, report));
    return true;
  }

  threadBound(externalThreadId: string): void {
    const pending = this.#pending.get(externalThreadId);
    if (!pending) return;
    this.#pending.delete(externalThreadId);
    this.handleNotification(pending.client, pending.notification);
  }

  forgetChat(chat: SlashCommandChat): void {
    this.options.catalog.forgetLive(chatKey(chat));
  }

  forgetAgent(agentId: string): void {
    for (const key of this.options.catalog.liveChats())
      if (key === agentId || key.startsWith(`${agentId}\u0000`)) this.options.catalog.forgetLive(key);
  }

  readonly #keepSaved = Effect.fn("SlashCommands.keepSaved")(function* (
    this: SlashCommands,
    engine: string,
    report: SlashCommandSessionReport,
  ) {
    yield* this.options.catalog.load();
    const saved = this.options.catalog.saved(engine);
    const next =
      engine === CLAUDE_ENGINE ? claudeSavedFromSession(saved, report) : providerSavedFromSession(saved, report);
    if (!next) return;
    yield* this.options.catalog.save({ ...next, engine, savedAt: new Date().toISOString() });
    this.options.changed({ agentId: null, taskId: null });
  });

  providerStatus(status: Pick<AgentStatus, "providers">): void {
    const claude = status.providers?.find((provider) => provider.id === "claude");
    if (claude?.state !== "available" || !claude.version) return;
    const version = claude.version;
    this.options.fork(this.options.catalog.load().pipe(Effect.andThen(Effect.sync(() => this.#probeClaude(version)))));
  }

  #probeClaude(cliVersion: string): void {
    if (this.options.catalog.saved(CLAUDE_ENGINE)?.cliVersion === cliVersion || this.#probed.has(cliVersion)) return;
    if (this.#probing) {
      this.#queued = cliVersion;
      return;
    }
    const client = this.options.claudeClient();
    if (!client?.running) return;
    this.#probing = true;
    this.#probed.add(cliVersion);
    this.options.fork(
      client.request(SLASH_COMMANDS_PROBE_METHOD, {}, decodeClaudeCommandProbe, CLAUDE_COMMAND_PROBE_TIMEOUT_MS).pipe(
        Effect.flatMap((result) => {
          if (result.commands.length === 0)
            return Effect.fail(providerFailure(new Error("The engine reported no commands.")));
          const saved = this.options.catalog.saved(CLAUDE_ENGINE);
          return this.options.catalog.save({
            engine: CLAUDE_ENGINE,
            cliVersion,
            engineVersion: result.engineVersion,
            origin: "probe",
            savedAt: new Date().toISOString(),
            commands: withKnownFlags(result.commands, saved?.commands ?? []),
          });
        }),
        Effect.tap(() =>
          Effect.sync(() => {
            logger.info("Saved the Claude Code command list.", { cliVersion });
            this.options.changed({ agentId: null, taskId: null });
          }),
        ),
        Effect.catch((failure) =>
          Effect.sync(() =>
            logger.warn("Could not read the Claude Code command list. CodeBot keeps the saved list.", {
              cliVersion,
              error: redactText(failure.cause instanceof Error ? failure.cause.message : String(failure.cause)),
            }),
          ),
        ),
        Effect.ensuring(
          Effect.sync(() => {
            this.#probing = false;
            const queued = this.#queued;
            this.#queued = null;
            if (queued !== null) this.#probeClaude(queued);
          }),
        ),
      ),
    );
  }
}

type SavedChange = Omit<SavedEngineCommands, "engine" | "savedAt">;

function claudeSavedFromSession(
  saved: SavedEngineCommands | null,
  report: SlashCommandSessionReport,
): SavedChange | null {
  const builtin = builtinRows(report.commands);
  if (builtin.length === 0) return null;
  const newer =
    saved === null ||
    (report.engineVersion !== null &&
      saved.engineVersion !== null &&
      olderVersion(saved.engineVersion, report.engineVersion));
  if (newer)
    return {
      cliVersion: saved?.cliVersion ?? null,
      engineVersion: report.engineVersion,
      origin: "session",
      commands: report.flags ? builtin : withKnownFlags(builtin, saved?.commands ?? []),
    };
  if (!report.flags || saved.engineVersion !== report.engineVersion) return null;
  const flagged = withKnownFlags(saved.commands, builtin);
  return sameEngineSlashCommands(flagged, saved.commands)
    ? null
    : { cliVersion: saved.cliVersion, engineVersion: saved.engineVersion, origin: saved.origin, commands: flagged };
}

function providerSavedFromSession(
  saved: SavedEngineCommands | null,
  report: SlashCommandSessionReport,
): SavedChange | null {
  if (saved ? sameEngineSlashCommands(saved.commands, report.commands) : report.commands.length === 0) return null;
  return {
    cliVersion: saved?.cliVersion ?? null,
    engineVersion: report.engineVersion,
    origin: "session",
    commands: report.commands,
  };
}
