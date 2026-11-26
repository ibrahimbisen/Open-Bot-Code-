import { type AgentProviderRef, isAgentProviderRef } from "./agent-providers";
import { INPUT_LIMITS } from "./input-limits";
import { type AgentTask, isAgentTask } from "./ipc-agent-tasks";
import { isBoundedString, isIdentifier, isNullableBoundedString } from "./ipc-bounded-values";
import { isDynamicRecord, isOneOf } from "./runtime-values";

export const SLASH_COMMAND_LIMITS = {
  commands: 2_000,
  name: 200,
  description: 2_000,
  argumentHint: 400,
  aliases: 16,
  plugin: 200,
  engineVersion: 80,
  sessions: 200,
  sessionTitle: 400,
} as const;

export const SLASH_COMMAND_SOURCES = ["builtin", "project", "user", "plugin", "mcp", "host", "unknown"] as const;
export type SlashCommandSource = (typeof SLASH_COMMAND_SOURCES)[number];

export const SLASH_COMMAND_KINDS = ["command", "skill"] as const;
export type SlashCommandKind = (typeof SLASH_COMMAND_KINDS)[number];

export const SLASH_COMMAND_SCREENS = ["model", "effort", "resume"] as const;
export type SlashCommandScreen = (typeof SLASH_COMMAND_SCREENS)[number];

export const SLASH_COMMAND_LIST_ORIGINS = ["session", "saved", "none"] as const;
export type SlashCommandListOrigin = (typeof SLASH_COMMAND_LIST_ORIGINS)[number];

export interface SlashCommandEntry {
  name: string;
  description: string;
  argumentHint: string;
  aliases: string[];
  source: SlashCommandSource;
  plugin: string | null;
  kind: SlashCommandKind;
  terminalOnly: boolean;
  screen: SlashCommandScreen | null;
}

export interface SlashCommandList {
  agentId: string;
  taskId: string | null;
  provider: AgentProviderRef;
  origin: SlashCommandListOrigin;
  engineVersion: string | null;
  commands: SlashCommandEntry[];
}

export interface SlashCommandChatInput {
  agentId: string;
  taskId?: string | undefined;
}

export interface SlashCommandsChanged {
  agentId: string | null;
  taskId: string | null;
}

export interface ResumableSession {
  sessionId: string;
  title: string;
  firstPrompt: string | null;
  updatedAt: string;
  createdAt: string | null;
  gitBranch: string | null;
  taskId: string | null;
  current: boolean;
}

export interface ResumableSessionList {
  agentId: string;
  folder: string;
  sessions: ResumableSession[];
}

export interface ResumeSessionInput {
  agentId: string;
  sessionId: string;
}

export interface ResumeSessionResult {
  task: AgentTask;
  importedMessages: number;
}

export function isSlashCommandScreen(value: unknown): value is SlashCommandScreen {
  return isOneOf(SLASH_COMMAND_SCREENS, value);
}

export function isSlashCommandEntry(value: unknown): value is SlashCommandEntry {
  return (
    isDynamicRecord(value) &&
    isBoundedString(value.name, SLASH_COMMAND_LIMITS.name) &&
    value.name.length > 0 &&
    isBoundedString(value.description, SLASH_COMMAND_LIMITS.description) &&
    isBoundedString(value.argumentHint, SLASH_COMMAND_LIMITS.argumentHint) &&
    Array.isArray(value.aliases) &&
    value.aliases.length <= SLASH_COMMAND_LIMITS.aliases &&
    value.aliases.every((alias) => isBoundedString(alias, SLASH_COMMAND_LIMITS.name) && alias.length > 0) &&
    isOneOf(SLASH_COMMAND_SOURCES, value.source) &&
    isNullableBoundedString(value.plugin, SLASH_COMMAND_LIMITS.plugin) &&
    isOneOf(SLASH_COMMAND_KINDS, value.kind) &&
    typeof value.terminalOnly === "boolean" &&
    (value.screen === null || isSlashCommandScreen(value.screen))
  );
}

export function isSlashCommandList(value: unknown): value is SlashCommandList {
  return (
    isDynamicRecord(value) &&
    isIdentifier(value.agentId) &&
    (value.taskId === null || isIdentifier(value.taskId)) &&
    isAgentProviderRef(value.provider) &&
    isOneOf(SLASH_COMMAND_LIST_ORIGINS, value.origin) &&
    isNullableBoundedString(value.engineVersion, SLASH_COMMAND_LIMITS.engineVersion) &&
    Array.isArray(value.commands) &&
    value.commands.length <= SLASH_COMMAND_LIMITS.commands &&
    value.commands.every(isSlashCommandEntry)
  );
}

export function isSlashCommandsChanged(value: unknown): value is SlashCommandsChanged {
  return (
    isDynamicRecord(value) &&
    (value.agentId === null || isIdentifier(value.agentId)) &&
    (value.taskId === null || isIdentifier(value.taskId))
  );
}

export function isResumableSession(value: unknown): value is ResumableSession {
  return (
    isDynamicRecord(value) &&
    isIdentifier(value.sessionId) &&
    isBoundedString(value.title, SLASH_COMMAND_LIMITS.sessionTitle) &&
    isNullableBoundedString(value.firstPrompt, SLASH_COMMAND_LIMITS.sessionTitle) &&
    isBoundedString(value.updatedAt, 160) &&
    isNullableBoundedString(value.createdAt, 160) &&
    isNullableBoundedString(value.gitBranch, 400) &&
    (value.taskId === null || isIdentifier(value.taskId)) &&
    typeof value.current === "boolean"
  );
}

export function isResumableSessionList(value: unknown): value is ResumableSessionList {
  return (
    isDynamicRecord(value) &&
    isIdentifier(value.agentId) &&
    isBoundedString(value.folder, INPUT_LIMITS.path) &&
    Array.isArray(value.sessions) &&
    value.sessions.length <= SLASH_COMMAND_LIMITS.sessions &&
    value.sessions.every(isResumableSession)
  );
}

export function isResumeSessionResult(value: unknown): value is ResumeSessionResult {
  return (
    isDynamicRecord(value) &&
    isAgentTask(value.task) &&
    typeof value.importedMessages === "number" &&
    Number.isInteger(value.importedMessages) &&
    value.importedMessages >= 0
  );
}

export function parseSlashCommandChatInput(value: unknown): SlashCommandChatInput {
  if (
    !isDynamicRecord(value) ||
    Object.keys(value).some((key) => key !== "agentId" && key !== "taskId") ||
    !isIdentifier(value.agentId) ||
    (value.taskId !== undefined && !isIdentifier(value.taskId))
  )
    throw new Error("Invalid slash command request.");
  return value.taskId === undefined ? { agentId: value.agentId } : { agentId: value.agentId, taskId: value.taskId };
}

export function parseResumeSessionInput(value: unknown): ResumeSessionInput {
  if (
    !isDynamicRecord(value) ||
    Object.keys(value).some((key) => key !== "agentId" && key !== "sessionId") ||
    !isIdentifier(value.agentId) ||
    !isIdentifier(value.sessionId)
  )
    throw new Error("Invalid resume request.");
  return { agentId: value.agentId, sessionId: value.sessionId };
}

export function slashCommandInvocation(text: string): { name: string; argumentText: string } | null {
  const match = /^\/([^\s/]+)(?:\s+([\s\S]*))?$/u.exec(text.trim());
  const name = match?.[1];
  return name === undefined ? null : { name, argumentText: match?.[2]?.trim() ?? "" };
}

export function findSlashCommand<Entry extends Pick<SlashCommandEntry, "name" | "aliases">>(
  commands: readonly Entry[],
  name: string,
): Entry | undefined {
  return (
    commands.find((command) => command.name === name) ?? commands.find((command) => command.aliases.includes(name))
  );
}
