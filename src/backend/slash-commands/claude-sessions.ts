import { open, readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { listSessions } from "@anthropic-ai/claude-agent-sdk";
import { SLASH_COMMAND_LIMITS } from "@codebot/contracts/ipc";
import { type DynamicRecord, isDynamicRecord, isNumber, isString } from "@codebot/contracts/runtime-values";
import { Effect } from "effect";
import { sanitizeProjectPath } from "../claude-history";
import { isClaudeLocalCommand } from "../conversation-snapshots";
import { providerCall } from "../provider-client-effects";

export const CLAUDE_SESSIONS_LIST_METHOD = "codebot/claudeSessions/list";

export interface ClaudeSessionSummary {
  readonly sessionId: string;
  readonly title: string;
  readonly firstPrompt: string | null;
  readonly updatedAt: number;
  readonly createdAt: number | null;
  readonly gitBranch: string | null;
}

const SESSION_FILE = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl$/iu;
const EDGE_BYTES = 64 * 1024;

function shortText(value: unknown): string | null {
  if (!isString(value)) return null;
  const text = value.replace(/\s+/gu, " ").trim();
  if (!text) return null;
  return text.length > SLASH_COMMAND_LIMITS.sessionTitle
    ? `${text.slice(0, SLASH_COMMAND_LIMITS.sessionTitle - 1)}…`
    : text;
}

function summary(value: unknown): ClaudeSessionSummary[] {
  if (!isDynamicRecord(value) || !isString(value.sessionId) || !isNumber(value.lastModified)) return [];
  const firstPrompt = shortText(value.firstPrompt);
  return [
    {
      sessionId: value.sessionId,
      title: shortText(value.customTitle) ?? shortText(value.summary) ?? firstPrompt ?? "",
      firstPrompt,
      updatedAt: value.lastModified,
      createdAt: isNumber(value.createdAt) ? value.createdAt : null,
      gitBranch: shortText(value.gitBranch),
    },
  ];
}

function samePath(left: string, right: string): boolean {
  const normal = (path: string) => (process.platform === "win32" ? resolve(path).toLowerCase() : resolve(path));
  return normal(left) === normal(right);
}

async function readEdges(path: string, size: number): Promise<string[]> {
  const file = await open(path, "r");
  try {
    const head = Buffer.allocUnsafe(Math.min(size, EDGE_BYTES));
    await file.read(head, 0, head.length, 0);
    if (size <= EDGE_BYTES) return head.toString("utf8").split("\n");
    const tail = Buffer.allocUnsafe(EDGE_BYTES);
    await file.read(tail, 0, EDGE_BYTES, size - EDGE_BYTES);
    return [...head.toString("utf8").split("\n").slice(0, -1), ...tail.toString("utf8").split("\n").slice(1)];
  } finally {
    await file.close();
  }
}

function userPrompt(record: DynamicRecord): string | null {
  if (record.type !== "user" || record.isMeta === true || record.isSidechain === true) return null;
  const message = isDynamicRecord(record.message) ? record.message : null;
  const content = message?.content;
  const text = isString(content)
    ? content
    : Array.isArray(content)
      ? content.flatMap((part) =>
          isDynamicRecord(part) && part.type === "text" && isString(part.text) ? [part.text] : [],
        )[0]
      : undefined;
  return text === undefined || isClaudeLocalCommand(text) || text.trimStart().startsWith("<") ? null : shortText(text);
}

async function readSessionFile(folder: string, name: string): Promise<ClaudeSessionSummary[]> {
  const sessionId = SESSION_FILE.exec(name)?.[1];
  if (!sessionId) return [];
  const path = join(folder, name);
  const info = await stat(path);
  let title: string | null = null;
  let firstPrompt: string | null = null;
  let createdAt: number | null = null;
  let gitBranch: string | null = null;
  for (const line of await readEdges(path, info.size)) {
    let record: unknown;
    try {
      record = JSON.parse(line);
    } catch {
      continue;
    }
    if (!isDynamicRecord(record)) continue;
    if (record.isSidechain === true) return [];
    if (record.type === "custom-title") title = shortText(record.customTitle) ?? title;
    else if (record.type === "summary" || record.type === "ai-title")
      title ??= shortText(record.summary ?? record.aiTitle);
    firstPrompt ??= userPrompt(record);
    gitBranch = shortText(record.gitBranch) ?? gitBranch;
    if (createdAt === null && isString(record.timestamp)) {
      const time = Date.parse(record.timestamp);
      if (Number.isFinite(time)) createdAt = time;
    }
  }
  if (title === null && firstPrompt === null) return [];
  return [{ sessionId, title: title ?? firstPrompt ?? "", firstPrompt, updatedAt: info.mtimeMs, createdAt, gitBranch }];
}

async function readSessionFolder(configDirectory: string, cwd: string, limit: number): Promise<ClaudeSessionSummary[]> {
  const folder = join(configDirectory, "projects", sanitizeProjectPath(resolve(cwd)));
  let names: string[];
  try {
    names = await readdir(folder);
  } catch {
    return [];
  }
  const sessions: ClaudeSessionSummary[] = [];
  for (const name of names) sessions.push(...(await readSessionFile(folder, name).catch(() => [])));
  return sessions.sort((left, right) => right.updatedAt - left.updatedAt).slice(0, limit);
}

export const listClaudeSessions = Effect.fn("SlashCommands.listClaudeSessions")(function* (input: {
  cwd: string;
  configDirectory: string;
  limit: number;
}) {
  const sdkDirectory = process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude");
  if (!samePath(input.configDirectory, sdkDirectory))
    return yield* providerCall(() => readSessionFolder(input.configDirectory, input.cwd, input.limit));
  const listed = yield* providerCall(() =>
    listSessions({ dir: input.cwd, limit: input.limit, includeWorktrees: false }),
  );
  return listed.flatMap(summary);
});

export function decodeClaudeSessionSummaries(value: unknown): ClaudeSessionSummary[] {
  if (!Array.isArray(value)) throw new Error("Invalid Claude session list.");
  return value.map((row) => {
    if (
      !isDynamicRecord(row) ||
      !isString(row.sessionId) ||
      !isString(row.title) ||
      !(row.firstPrompt === null || isString(row.firstPrompt)) ||
      !isNumber(row.updatedAt) ||
      !(row.createdAt === null || isNumber(row.createdAt)) ||
      !(row.gitBranch === null || isString(row.gitBranch))
    )
      throw new Error("Invalid Claude session row.");
    return {
      sessionId: row.sessionId,
      title: row.title,
      firstPrompt: row.firstPrompt,
      updatedAt: row.updatedAt,
      createdAt: row.createdAt,
      gitBranch: row.gitBranch,
    };
  });
}
