import type { AgentProviderId, SlashCommandEntry, SlashCommandSource } from "@codebot/contracts/ipc";
import { SLASH_COMMAND_LIMITS } from "@codebot/contracts/ipc";
import { CLAUDE_PROJECT_PLUGIN, CLAUDE_USER_PLUGIN } from "./claude-command-plugins";
import type { ClaudeCustomCommand } from "./claude-custom-commands";
import type { ClaudeHostPlugins } from "./claude-session-commands";
import type { EngineSlashCommand } from "./slash-command-rows";
import { HOST_RESUME_COMMAND, providerListsSessions, slashCommandScreen } from "./slash-command-screens";

const MCP_PREFIX = "mcp__";
const HIDDEN_PREFIX = "__";
const FOLDER_SOURCES = ["project", "user"] as const;

interface Attribution {
  readonly source: SlashCommandSource;
  readonly plugin: string | null;
  readonly description: string;
}

interface ClaudeSessionContext {
  readonly plugins: readonly string[];
  readonly hostPlugins: ClaudeHostPlugins;
  readonly custom: readonly ClaudeCustomCommand[];
}

function withoutMarker(description: string, marker: string): string | null {
  if (description.endsWith(` (${marker})`)) return description.slice(0, -marker.length - 3);
  if (description.startsWith(`(${marker}) `)) return description.slice(marker.length + 3);
  if (description === `(${marker})`) return "";
  return null;
}

function hostPluginSource(prefix: string, hostPlugins: ClaudeHostPlugins): "project" | "user" | null {
  if (prefix === CLAUDE_PROJECT_PLUGIN && hostPlugins.project) return "project";
  if (prefix === CLAUDE_USER_PLUGIN && hostPlugins.user) return "user";
  return null;
}

function attribution(row: EngineSlashCommand, context: ClaudeSessionContext): Attribution {
  if (row.builtin) return { source: "builtin", plugin: null, description: row.description };
  const separator = row.name.indexOf(":");
  const prefix = separator > 0 ? row.name.slice(0, separator) : null;
  const hostSource = prefix === null ? null : hostPluginSource(prefix, context.hostPlugins);
  if (hostSource !== null)
    return {
      source: hostSource,
      plugin: null,
      description: withoutMarker(row.description, hostSource) ?? row.description,
    };
  if (row.name.startsWith(MCP_PREFIX)) {
    const server = row.name.slice(MCP_PREFIX.length).split("__", 1)[0] || null;
    return { source: "mcp", plugin: server, description: withoutMarker(row.description, "MCP") ?? row.description };
  }
  if (prefix !== null && context.plugins.includes(prefix))
    return { source: "plugin", plugin: prefix, description: withoutMarker(row.description, prefix) ?? row.description };
  for (const source of FOLDER_SOURCES) {
    const description = withoutMarker(row.description, source);
    if (description !== null) return { source, plugin: null, description };
  }
  const scanned = context.custom.find((custom) => custom.name === row.name);
  if (scanned) return { source: scanned.source, plugin: null, description: row.description };
  return { source: "unknown", plugin: null, description: row.description };
}

function entry(
  provider: AgentProviderId,
  row: EngineSlashCommand,
  attributed: Attribution,
  custom: boolean,
): SlashCommandEntry {
  const screens = custom ? [] : [row.name, ...row.aliases].flatMap((name) => slashCommandScreen(provider, name) ?? []);
  return {
    name: row.name,
    description: attributed.description.slice(0, SLASH_COMMAND_LIMITS.description),
    argumentHint: row.argumentHint,
    aliases: [...row.aliases],
    source: attributed.source,
    plugin: attributed.plugin,
    kind: row.skill ? "skill" : "command",
    terminalOnly: row.terminalOnly,
    screen: screens[0] ?? null,
  };
}

function visible(row: { readonly name: string }): boolean {
  return !row.name.startsWith(HIDDEN_PREFIX);
}

function withHostCommands(provider: AgentProviderId, entries: SlashCommandEntry[]): SlashCommandEntry[] {
  if (!providerListsSessions(provider) || entries.some((command) => command.screen === "resume")) return entries;
  const taken = entries.some(
    (command) => command.name === HOST_RESUME_COMMAND || command.aliases.includes(HOST_RESUME_COMMAND),
  );
  if (taken) return entries;
  return [
    ...entries,
    {
      name: HOST_RESUME_COMMAND,
      description: "",
      argumentHint: "",
      aliases: [],
      source: "host",
      plugin: null,
      kind: "command",
      terminalOnly: false,
      screen: "resume",
    },
  ];
}

export function claudeSessionEntries(
  rows: readonly EngineSlashCommand[],
  context: ClaudeSessionContext,
): SlashCommandEntry[] {
  return withHostCommands(
    "claude",
    rows.filter(visible).map((row) => {
      const attributed = attribution(row, context);
      return entry("claude", row, attributed, attributed.source !== "builtin");
    }),
  );
}

export interface ClaudeCustomNaming {
  readonly projectPlugin: boolean;
  readonly userPlugin: boolean;
}

function customRow(command: ClaudeCustomCommand, naming: ClaudeCustomNaming): EngineSlashCommand {
  const viaPlugin = command.source === "project" ? naming.projectPlugin : naming.userPlugin;
  const prefix = command.source === "project" ? CLAUDE_PROJECT_PLUGIN : CLAUDE_USER_PLUGIN;
  return {
    name: viaPlugin ? `${prefix}:${command.name}` : command.name,
    description: command.description.slice(0, SLASH_COMMAND_LIMITS.description),
    argumentHint: command.argumentHint.slice(0, SLASH_COMMAND_LIMITS.argumentHint),
    aliases:
      viaPlugin && command.kind === "skill"
        ? [command.name, ...command.aliases.map((alias) => `${prefix}:${alias}`)]
        : [...command.aliases],
    builtin: false,
    terminalOnly: false,
    skill: command.kind === "skill",
  };
}

export function claudeSavedEntries(
  saved: readonly EngineSlashCommand[],
  custom: readonly ClaudeCustomCommand[],
  naming: ClaudeCustomNaming,
): SlashCommandEntry[] {
  const builtin = saved
    .filter(visible)
    .map((row) => entry("claude", row, { source: "builtin", plugin: null, description: row.description }, false));
  const names = new Set(builtin.map((command) => command.name));
  const own: SlashCommandEntry[] = [];
  for (const command of custom) {
    const row = customRow(command, naming);
    if (names.has(row.name) || row.name.length > SLASH_COMMAND_LIMITS.name) continue;
    names.add(row.name);
    own.push(entry("claude", row, { source: command.source, plugin: null, description: row.description }, true));
  }
  return withHostCommands("claude", [...own, ...builtin]);
}

export function providerEntries(provider: AgentProviderId, rows: readonly EngineSlashCommand[]): SlashCommandEntry[] {
  return withHostCommands(
    provider,
    rows
      .filter(visible)
      .map((row) => entry(provider, row, { source: "unknown", plugin: null, description: row.description }, false)),
  );
}
