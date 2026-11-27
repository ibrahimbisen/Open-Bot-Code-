import { SLASH_COMMAND_LIMITS } from "@codebot/contracts/ipc";
import { isDynamicRecord, isString } from "@codebot/contracts/runtime-values";

export interface EngineSlashCommand {
  readonly name: string;
  readonly description: string;
  readonly argumentHint: string;
  readonly aliases: readonly string[];
  readonly builtin: boolean;
  readonly terminalOnly: boolean;
  readonly skill: boolean;
}

export const SLASH_COMMANDS_UPDATED_METHOD = "codebot/slashCommands/updated";
export const SLASH_COMMANDS_PROBE_METHOD = "codebot/slashCommands/probe";
export const SLASH_COMMANDS_CUSTOM_METHOD = "codebot/slashCommands/custom";

function bounded(value: unknown, limit: number): string {
  if (!isString(value)) return "";
  const text = value.trim();
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

function commandName(value: unknown): string | null {
  if (!isString(value)) return null;
  const name = value.trim().replace(/^\/+/u, "");
  return name && name.length <= SLASH_COMMAND_LIMITS.name && !/[\p{Cc}\p{Zl}\p{Zp}]/u.test(name) ? name : null;
}

function aliasNames(value: unknown, name: string): string[] {
  if (!Array.isArray(value)) return [];
  const aliases = new Set<string>();
  for (const item of value) {
    const alias = commandName(item);
    if (alias && alias !== name) aliases.add(alias);
    if (aliases.size === SLASH_COMMAND_LIMITS.aliases) break;
  }
  return [...aliases];
}

function uniqueRows(rows: readonly EngineSlashCommand[]): EngineSlashCommand[] {
  const byName = new Map<string, EngineSlashCommand>();
  for (const row of rows) {
    const known = byName.get(row.name);
    if (!known || (row.builtin && !known.builtin)) byName.set(row.name, row);
    if (byName.size === SLASH_COMMAND_LIMITS.commands) break;
  }
  return [...byName.values()];
}

export function decodeClaudeSlashCommands(value: unknown): EngineSlashCommand[] {
  if (!Array.isArray(value)) return [];
  return uniqueRows(
    value.flatMap((row): EngineSlashCommand[] => {
      if (!isDynamicRecord(row)) return [];
      const name = commandName(row.name);
      if (!name) return [];
      return [
        {
          name,
          description: bounded(row.description, SLASH_COMMAND_LIMITS.description),
          argumentHint: bounded(row.argumentHint, SLASH_COMMAND_LIMITS.argumentHint),
          aliases: aliasNames(row.aliases, name),
          builtin: row.builtin === true,
          terminalOnly: false,
          skill: false,
        },
      ];
    }),
  );
}

export function claudeSlashCommandNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.flatMap((item) => commandName(item) ?? []))];
}

export function decodeAcpAvailableCommands(value: unknown): EngineSlashCommand[] {
  if (!Array.isArray(value)) return [];
  return uniqueRows(
    value.flatMap((row): EngineSlashCommand[] => {
      if (!isDynamicRecord(row)) return [];
      const name = commandName(row.name);
      if (!name) return [];
      const input = isDynamicRecord(row.input) ? row.input : null;
      return [
        {
          name,
          description: bounded(row.description, SLASH_COMMAND_LIMITS.description),
          argumentHint: bounded(input?.hint, SLASH_COMMAND_LIMITS.argumentHint),
          aliases: [],
          builtin: false,
          terminalOnly: false,
          skill: false,
        },
      ];
    }),
  );
}

export function isEngineSlashCommand(value: unknown): value is EngineSlashCommand {
  return (
    isDynamicRecord(value) &&
    commandName(value.name) === value.name &&
    isString(value.description) &&
    value.description.length <= SLASH_COMMAND_LIMITS.description &&
    isString(value.argumentHint) &&
    value.argumentHint.length <= SLASH_COMMAND_LIMITS.argumentHint &&
    Array.isArray(value.aliases) &&
    value.aliases.length <= SLASH_COMMAND_LIMITS.aliases &&
    value.aliases.every((alias) => commandName(alias) === alias) &&
    typeof value.builtin === "boolean" &&
    typeof value.terminalOnly === "boolean" &&
    typeof value.skill === "boolean"
  );
}

export function sameEngineSlashCommands(left: readonly EngineSlashCommand[], right: readonly EngineSlashCommand[]) {
  return JSON.stringify(left) === JSON.stringify(right);
}
