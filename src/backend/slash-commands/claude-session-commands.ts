import { isDynamicRecord, isString } from "@codebot/contracts/runtime-values";
import {
  claudeSlashCommandNames,
  decodeClaudeSlashCommands,
  type EngineSlashCommand,
  isEngineSlashCommand,
  SLASH_COMMANDS_UPDATED_METHOD,
} from "./slash-command-rows";

export interface ClaudeHostPlugins {
  readonly project: boolean;
  readonly user: boolean;
}

export interface SlashCommandSessionReport {
  readonly threadId: string;
  readonly engineVersion: string | null;
  readonly commands: readonly EngineSlashCommand[];
  readonly flags: boolean;
  readonly plugins: readonly string[];
  readonly hostPlugins: ClaudeHostPlugins;
}

export function decodeSlashCommandSessionReport(value: unknown): SlashCommandSessionReport | null {
  if (
    !isDynamicRecord(value) ||
    !isString(value.threadId) ||
    !(value.engineVersion === null || isString(value.engineVersion)) ||
    !Array.isArray(value.commands) ||
    !value.commands.every(isEngineSlashCommand) ||
    typeof value.flags !== "boolean" ||
    !Array.isArray(value.plugins) ||
    !value.plugins.every(isString) ||
    !isDynamicRecord(value.hostPlugins)
  )
    return null;
  return {
    threadId: value.threadId,
    engineVersion: value.engineVersion,
    commands: value.commands,
    flags: value.flags,
    plugins: value.plugins,
    hostPlugins: { project: value.hostPlugins.project === true, user: value.hostPlugins.user === true },
  };
}

export interface ClaudeSessionCommands {
  engineVersion: string | null;
  rows: EngineSlashCommand[] | null;
  names: string[] | null;
  terminal: string[] | null;
  skills: string[] | null;
  plugins: string[];
  emitted: string | null;
}

export function newClaudeSessionCommands(): ClaudeSessionCommands {
  return { engineVersion: null, rows: null, names: null, terminal: null, skills: null, plugins: [], emitted: null };
}

function engineVersion(value: unknown): string | null {
  return isString(value) && value.trim() && value.length <= 80 ? value.trim() : null;
}

export function foldClaudeInitialization(state: ClaudeSessionCommands, response: unknown): void {
  if (!isDynamicRecord(response)) return;
  if (Array.isArray(response.commands)) state.rows = decodeClaudeSlashCommands(response.commands);
  state.engineVersion = engineVersion(response.claude_code_version) ?? state.engineVersion;
}

export function foldClaudeCommandList(state: ClaudeSessionCommands, commands: unknown): void {
  if (!Array.isArray(commands)) return;
  state.rows = decodeClaudeSlashCommands(commands);
  state.names = null;
}

export function foldClaudeInitMessage(state: ClaudeSessionCommands, message: unknown): { refetch: boolean } {
  if (!isDynamicRecord(message)) return { refetch: false };
  state.engineVersion = engineVersion(message.claude_code_version) ?? state.engineVersion;
  if (Array.isArray(message.slash_commands)) state.names = claudeSlashCommandNames(message.slash_commands);
  state.terminal = claudeSlashCommandNames(message.terminal_slash_commands);
  if (Array.isArray(message.skills)) state.skills = claudeSlashCommandNames(message.skills);
  if (Array.isArray(message.plugins))
    state.plugins = message.plugins.flatMap((plugin) =>
      isDynamicRecord(plugin) && isString(plugin.name) && plugin.name.length <= 200 ? [plugin.name] : [],
    );
  const known = new Set(state.rows?.map((row) => row.name));
  return { refetch: state.names?.some((name) => !known.has(name)) === true };
}

function sessionRows(state: ClaudeSessionCommands): EngineSlashCommand[] {
  const terminal = new Set(state.terminal ?? []);
  const skills = new Set(state.skills ?? []);
  const listed = state.names === null ? null : new Set(state.names);
  const rows = (state.rows ?? []).filter(
    (row) => listed === null || listed.has(row.name) || row.aliases.some((alias) => listed.has(alias)),
  );
  const known = new Set(rows.map((row) => row.name));
  const unnamed = (state.names ?? [])
    .filter((name) => !known.has(name))
    .map(
      (name): EngineSlashCommand => ({
        name,
        description: "",
        argumentHint: "",
        aliases: [],
        builtin: false,
        terminalOnly: false,
        skill: false,
      }),
    );
  return [...rows, ...unnamed].map((row) => ({
    ...row,
    terminalOnly: terminal.has(row.name),
    skill: skills.has(row.name) || row.aliases.some((alias) => skills.has(alias)),
  }));
}

export function claudeSessionReport(
  state: ClaudeSessionCommands,
  threadId: string,
  hostPlugins: ClaudeHostPlugins,
): { method: typeof SLASH_COMMANDS_UPDATED_METHOD; params: SlashCommandSessionReport } | null {
  if (state.rows === null && state.names === null) return null;
  const params: SlashCommandSessionReport = {
    threadId,
    engineVersion: state.engineVersion,
    commands: sessionRows(state),
    flags: state.skills !== null,
    plugins: state.plugins,
    hostPlugins,
  };
  const signature = JSON.stringify(params);
  if (signature === state.emitted) return null;
  state.emitted = signature;
  return { method: SLASH_COMMANDS_UPDATED_METHOD, params };
}
