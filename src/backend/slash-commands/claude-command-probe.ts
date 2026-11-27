import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Options } from "@anthropic-ai/claude-agent-sdk";
import { isDynamicRecord, isString } from "@codebot/contracts/runtime-values";
import { Effect } from "effect";
import { providerCall } from "../provider-client-effects";
import { type ClaudeCustomCommand, readClaudeCustomCommands } from "./claude-custom-commands";
import type { ClaudeCustomNaming } from "./slash-command-entries";
import { decodeClaudeSlashCommands, type EngineSlashCommand, isEngineSlashCommand } from "./slash-command-rows";

export const CLAUDE_COMMAND_PROBE_TIMEOUT_MS = 60_000;
const CLAUDE_COMMAND_PROBE_FOLDER_PREFIX = "codebot-slash-probe-";

export interface ClaudeCommandProbeResult {
  readonly engineVersion: string | null;
  readonly commands: readonly EngineSlashCommand[];
}

export interface ClaudeCustomListing {
  readonly custom: readonly ClaudeCustomCommand[];
  readonly naming: ClaudeCustomNaming;
}

export const claudeCommandProbeFolder = Effect.acquireRelease(
  providerCall(() => mkdtemp(join(tmpdir(), CLAUDE_COMMAND_PROBE_FOLDER_PREFIX))),
  (folder) => providerCall(() => rm(folder, { recursive: true, force: true, maxRetries: 5 })).pipe(Effect.ignore),
);

export function claudeCommandProbeOptions(base: Options, folder: string): Options {
  return {
    ...base,
    cwd: folder,
    settingSources: [],
    mcpServers: {},
    strictMcpConfig: true,
    persistSession: false,
  };
}

export function claudeCommandProbeResult(initialization: unknown, commands: unknown): ClaudeCommandProbeResult {
  const response = isDynamicRecord(initialization) ? initialization : {};
  const version = response.claude_code_version;
  return {
    engineVersion: isString(version) && version.trim() && version.length <= 80 ? version.trim() : null,
    commands: decodeClaudeSlashCommands(Array.isArray(commands) ? commands : response.commands),
  };
}

export function decodeClaudeCommandProbe(value: unknown): ClaudeCommandProbeResult {
  if (
    !isDynamicRecord(value) ||
    !(value.engineVersion === null || isString(value.engineVersion)) ||
    !Array.isArray(value.commands) ||
    !value.commands.every(isEngineSlashCommand)
  )
    throw new Error("Invalid slash command probe result.");
  return { engineVersion: value.engineVersion, commands: value.commands };
}

export const claudeCustomListing = Effect.fn("SlashCommands.claudeCustomListing")(function* (input: {
  cwd: string;
  configDirectory: string;
  workspaceOnly: boolean;
  userSetup: boolean;
  plugins: boolean;
}) {
  const project =
    !input.workspaceOnly || input.plugins ? yield* readClaudeCustomCommands(join(input.cwd, ".claude"), "project") : [];
  const user = input.userSetup || input.plugins ? yield* readClaudeCustomCommands(input.configDirectory, "user") : [];
  const listing: ClaudeCustomListing = {
    custom: [...project, ...user],
    naming: { projectPlugin: input.workspaceOnly, userPlugin: !input.userSetup },
  };
  return listing;
});

function isClaudeCustomCommand(value: unknown): value is ClaudeCustomCommand {
  return (
    isDynamicRecord(value) &&
    isString(value.name) &&
    isString(value.description) &&
    isString(value.argumentHint) &&
    Array.isArray(value.aliases) &&
    value.aliases.every(isString) &&
    (value.kind === "command" || value.kind === "skill") &&
    (value.source === "project" || value.source === "user")
  );
}

export function decodeClaudeCustomListing(value: unknown): ClaudeCustomListing {
  if (
    !isDynamicRecord(value) ||
    !Array.isArray(value.custom) ||
    !value.custom.every(isClaudeCustomCommand) ||
    !isDynamicRecord(value.naming) ||
    typeof value.naming.projectPlugin !== "boolean" ||
    typeof value.naming.userPlugin !== "boolean"
  )
    throw new Error("Invalid custom slash command listing.");
  return {
    custom: value.custom,
    naming: { projectPlugin: value.naming.projectPlugin, userPlugin: value.naming.userPlugin },
  };
}
