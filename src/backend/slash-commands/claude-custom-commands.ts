import { open, readdir } from "node:fs/promises";
import { join } from "node:path";
import { type DynamicRecord, isDynamicRecord, isString } from "@codebot/contracts/runtime-values";
import { Effect } from "effect";
import { parse as parseYaml } from "yaml";

export type ClaudeCustomSource = "project" | "user";

export interface ClaudeCustomCommand {
  readonly name: string;
  readonly description: string;
  readonly argumentHint: string;
  readonly aliases: readonly string[];
  readonly kind: "command" | "skill";
  readonly source: ClaudeCustomSource;
}

const MAX_ENTRIES = 500;
const MAX_COMMAND_DEPTH = 6;
const HEAD_BYTES = 64 * 1024;
const COMMAND_EXTENSION = ".md";
const SKILL_FILE = "SKILL.md";
const FRONT_MATTER = /^﻿?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u;

interface FrontMatter {
  readonly values: DynamicRecord;
  readonly block: string;
  readonly body: string;
}

async function readHead(path: string): Promise<string | null> {
  try {
    const file = await open(path, "r");
    try {
      const buffer = Buffer.allocUnsafe(HEAD_BYTES);
      const { bytesRead } = await file.read(buffer, 0, HEAD_BYTES, 0);
      return buffer.subarray(0, bytesRead).toString("utf8");
    } finally {
      await file.close();
    }
  } catch {
    return null;
  }
}

function readFrontMatter(text: string): FrontMatter {
  const match = FRONT_MATTER.exec(text);
  const block = match?.[1];
  if (match === null || block === undefined) return { values: {}, block: "", body: text.replace(/^﻿/u, "") };
  let values: DynamicRecord = {};
  try {
    const parsed = parseYaml(block);
    if (isDynamicRecord(parsed)) values = parsed;
  } catch {
    values = {};
  }
  return { values, block, body: text.slice(match[0].length) };
}

function unquoted(value: string): string {
  const trimmed = value.trim();
  const quote = trimmed[0];
  return trimmed.length >= 2 && (quote === '"' || quote === "'") && trimmed.at(-1) === quote
    ? trimmed.slice(1, -1)
    : trimmed;
}

function rawValue(block: string, key: string): string {
  const escaped = key.replace(/[/\\^$*+?.()|[\]{}]/gu, "\\$&");
  const line = new RegExp(`^${escaped}[ \\t]*:[ \\t]*(.*)$`, "mu").exec(block)?.[1];
  return line === undefined ? "" : unquoted(line);
}

function textValue(matter: FrontMatter, key: string): string {
  const value = matter.values[key];
  if (isString(value)) return value.replace(/\s+/gu, " ").trim();
  const raw = rawValue(matter.block, key);
  return raw === ">" || raw === "|" || raw.startsWith(">-") || raw.startsWith("|-") ? "" : raw;
}

function firstBodyLine(body: string): string {
  for (const line of body.split(/\r?\n/u)) {
    const text = line.replace(/^#+\s*/u, "").trim();
    if (text) return text;
  }
  return "";
}

function isHiddenFromUser(matter: FrontMatter): boolean {
  return matter.values["user-invocable"] === false || rawValue(matter.block, "user-invocable") === "false";
}

async function listFolder(folder: string): Promise<{ name: string; directory: boolean }[]> {
  try {
    const entries = await readdir(folder, { withFileTypes: true });
    return entries
      .filter((entry) => !entry.name.startsWith("."))
      .map((entry) => ({ name: entry.name, directory: entry.isDirectory() || entry.isSymbolicLink() }))
      .sort((left, right) => left.name.localeCompare(right.name));
  } catch {
    return [];
  }
}

async function readCommandFiles(
  folder: string,
  source: ClaudeCustomSource,
  namespace: readonly string[],
  found: ClaudeCustomCommand[],
): Promise<void> {
  if (namespace.length > MAX_COMMAND_DEPTH) return;
  for (const entry of await listFolder(folder)) {
    if (found.length >= MAX_ENTRIES) return;
    const path = join(folder, entry.name);
    if (!entry.name.toLowerCase().endsWith(COMMAND_EXTENSION)) {
      if (entry.directory) await readCommandFiles(path, source, [...namespace, entry.name], found);
      continue;
    }
    const text = await readHead(path);
    if (text === null) continue;
    const matter = readFrontMatter(text);
    found.push({
      name: [...namespace, entry.name.slice(0, -COMMAND_EXTENSION.length)].join(":"),
      description: textValue(matter, "description") || firstBodyLine(matter.body),
      argumentHint: rawValue(matter.block, "argument-hint"),
      aliases: [],
      kind: "command",
      source,
    });
  }
}

async function readSkillFolders(
  folder: string,
  source: ClaudeCustomSource,
  found: ClaudeCustomCommand[],
): Promise<void> {
  for (const entry of await listFolder(folder)) {
    if (found.length >= MAX_ENTRIES) return;
    if (!entry.directory) continue;
    const text = await readHead(join(folder, entry.name, SKILL_FILE));
    if (text === null) continue;
    const matter = readFrontMatter(text);
    if (isHiddenFromUser(matter)) continue;
    const name = textValue(matter, "name") || entry.name;
    found.push({
      name,
      description: textValue(matter, "description") || firstBodyLine(matter.body),
      argumentHint: rawValue(matter.block, "argument-hint"),
      aliases: name === entry.name ? [] : [entry.name],
      kind: "skill",
      source,
    });
  }
}

export const readClaudeCustomCommands = Effect.fn("SlashCommands.readClaudeCustomCommands")(function* (
  folder: string,
  source: ClaudeCustomSource,
) {
  return yield* Effect.promise(async () => {
    const found: ClaudeCustomCommand[] = [];
    await readSkillFolders(join(folder, "skills"), source, found);
    await readCommandFiles(join(folder, "commands"), source, [], found);
    return found;
  });
});
