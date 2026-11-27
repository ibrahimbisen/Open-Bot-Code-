import {
  AGENT_TASK_OUTCOMES,
  AGENT_WELCOME_ITEM_TYPE,
  type AgentTaskOutcome,
  CHANNEL_RESUME_ITEM_TYPE,
  HOSTED_SITE_EVENT_ITEM_TYPE_PREFIX,
  MARKETPLACE_SUGGESTION_ITEM_TYPE_PREFIX,
  PROJECT_LIMITS,
  type ProjectChatArchiveFilter,
  type ProjectChatMatchKind,
  ROUTINE_EVENT_ITEM_TYPE_PREFIX,
  ROUTINE_QUIET_ANSWER_ITEM_TYPE,
  ROUTINE_RUN_EVENT_ITEM_TYPE_PREFIX,
  SETTING_LINK_ITEM_TYPE_PREFIX,
  SKILL_EVENT_ITEM_TYPE_PREFIX,
} from "@codebot/contracts/ipc";
import { type DynamicRecord, isDynamicRecord, isNumber, isOneOf, isString } from "@codebot/contracts/runtime-values";
import { sourceText } from "@codebot/i18n/source";
import type { CodeBotDatabase } from "../codebot-database";
import { COLLAPSE_WHITESPACE_FUNCTION, LOWERCASE_FUNCTION } from "../database/database-core";
import {
  databaseRow,
  databaseRows,
  optionalStringColumn,
  requiredNumberColumn,
  requiredStringColumn,
} from "../database/database-rows";
import { decodeProjectChatSettings, type ProjectChatSettings, type ProjectUnseenOutcome } from "./project-store";

export interface ProjectChatRow {
  threadId: string;
  taskId: string;
  agentId: string;
  title: string;
  outcome: AgentTaskOutcome | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  settings: ProjectChatSettings;
}

export interface ProjectChatRowPage {
  rows: ProjectChatRow[];
  nextCursor: string | null;
}

interface ProjectChatMatchRow {
  row: ProjectChatRow;
  kind: ProjectChatMatchKind;
  messageId: string | null;
  text: string;
  at: string;
}

export interface ProjectChatMatchPage {
  matches: ProjectChatMatchRow[];
  nextCursor: string | null;
}

export interface ProjectUnseenChat {
  threadId: string;
  agentId: string;
  outcome: ProjectUnseenOutcome;
}

export interface ProjectChatQueriesOptions {
  database: CodeBotDatabase;
}

const CHAT_COLUMNS = `thread.thread_id, COALESCE(thread.legacy_task_id, thread.thread_id) AS task_id, thread.agent_id,
  thread.title, thread.outcome, thread.error, thread.created_at, thread.updated_at, thread.archived_at,
  COALESCE(chat.user_archived, 0) AS user_archived, COALESCE(chat.pinned, 0) AS pinned,
  chat.unseen_outcome, chat.runtime_json`;

const CHAT_SOURCE = `projection_agent_threads thread
  LEFT JOIN cb_project_chats chat ON chat.thread_id = thread.thread_id`;

const PROJECT_CHAT = "thread.routine_id IS NULL AND thread.agent_id IN (SELECT value FROM json_each(?))";

const SEARCHED_MESSAGE = `COALESCE(json_extract(message.message_json, '$.delivery.status'), '') NOT IN ('queued', 'cancelled')
  AND message.author IN ('user', 'assistant')
  AND COALESCE(message.item_type, '') NOT IN ('commentary', '${ROUTINE_QUIET_ANSWER_ITEM_TYPE}', '${AGENT_WELCOME_ITEM_TYPE}', '${CHANNEL_RESUME_ITEM_TYPE}')
  AND COALESCE(message.item_type, '') NOT LIKE '${SKILL_EVENT_ITEM_TYPE_PREFIX}%'
  AND COALESCE(message.item_type, '') NOT LIKE '${ROUTINE_EVENT_ITEM_TYPE_PREFIX}%'
  AND COALESCE(message.item_type, '') NOT LIKE '${ROUTINE_RUN_EVENT_ITEM_TYPE_PREFIX}%'
  AND COALESCE(message.item_type, '') NOT LIKE '${HOSTED_SITE_EVENT_ITEM_TYPE_PREFIX}%'
  AND COALESCE(message.item_type, '') NOT LIKE '${MARKETPLACE_SUGGESTION_ITEM_TYPE_PREFIX}%'
  AND COALESCE(message.item_type, '') NOT LIKE '${SETTING_LINK_ITEM_TYPE_PREFIX}%'`;

interface ListCursor {
  pinned: number;
  updatedAt: string;
  threadId: string;
}

export class ProjectChatQueries {
  readonly #database: CodeBotDatabase;

  constructor(options: ProjectChatQueriesOptions) {
    this.#database = options.database;
  }

  page(
    agentIds: readonly string[],
    archived: ProjectChatArchiveFilter,
    cursor: string | undefined,
    limit: number,
  ): ProjectChatRowPage {
    if (agentIds.length === 0) return { rows: [], nextCursor: null };
    const after = cursor === undefined ? null : decodeListCursor(cursor);
    const rows = databaseRows(
      this.#database.connection
        .prepare(
          `SELECT ${CHAT_COLUMNS} FROM ${CHAT_SOURCE}
           WHERE ${PROJECT_CHAT}
             AND (? = 'include' OR COALESCE(chat.user_archived, 0) = ?)
             AND (? IS NULL
               OR COALESCE(chat.pinned, 0) < ?
               OR (COALESCE(chat.pinned, 0) = ?
                 AND (thread.updated_at < ? OR (thread.updated_at = ? AND thread.thread_id > ?))))
           ORDER BY COALESCE(chat.pinned, 0) DESC, thread.updated_at DESC, thread.thread_id
           LIMIT ?`,
        )
        .all(
          JSON.stringify(agentIds),
          archived,
          archived === "only" ? 1 : 0,
          after?.threadId ?? null,
          after?.pinned ?? 0,
          after?.pinned ?? 0,
          after?.updatedAt ?? "",
          after?.updatedAt ?? "",
          after?.threadId ?? "",
          limit + 1,
        ),
    ).map(decodeChatRow);
    const shown = rows.slice(0, limit);
    const last = shown.at(-1);
    return {
      rows: shown,
      nextCursor:
        rows.length > limit && last
          ? encodeCursor({
              pinned: last.settings.pinned ? 1 : 0,
              updatedAt: last.updatedAt,
              threadId: last.threadId,
            })
          : null,
    };
  }

  chat(agentId: string, taskId: string): ProjectChatRow | null {
    const row = databaseRow(
      this.#database.connection
        .prepare(
          `SELECT ${CHAT_COLUMNS} FROM ${CHAT_SOURCE}
           WHERE thread.agent_id = ? AND thread.routine_id IS NULL
             AND (thread.legacy_task_id = ? OR (thread.legacy_task_id IS NULL AND thread.thread_id = ?))`,
        )
        .get(agentId, taskId, taskId),
    );
    return row ? decodeChatRow(row) : null;
  }

  chatsOfThreads(threadIds: readonly string[]): ProjectChatRow[] {
    if (threadIds.length === 0) return [];
    return databaseRows(
      this.#database.connection
        .prepare(
          `SELECT ${CHAT_COLUMNS} FROM ${CHAT_SOURCE}
           WHERE thread.routine_id IS NULL AND thread.thread_id IN (SELECT value FROM json_each(?))`,
        )
        .all(JSON.stringify(threadIds)),
    ).map(decodeChatRow);
  }

  counts(agentIds: readonly string[]): Map<string, number> {
    if (agentIds.length === 0) return new Map();
    return new Map(
      databaseRows(
        this.#database.connection
          .prepare(
            `SELECT thread.agent_id, COUNT(*) AS count FROM projection_agent_threads thread
             WHERE ${PROJECT_CHAT} GROUP BY thread.agent_id`,
          )
          .all(JSON.stringify(agentIds)),
      ).map((row) => [requiredStringColumn(row, "agent_id"), requiredNumberColumn(row, "count")]),
    );
  }

  threadIds(agentIds: readonly string[]): string[] {
    if (agentIds.length === 0) return [];
    return databaseRows(
      this.#database.connection
        .prepare("SELECT thread_id FROM projection_agent_threads WHERE agent_id IN (SELECT value FROM json_each(?))")
        .all(JSON.stringify(agentIds)),
    ).map((row) => requiredStringColumn(row, "thread_id"));
  }

  unseen(): ProjectUnseenChat[] {
    return databaseRows(
      this.#database.connection
        .prepare(
          `SELECT chat.thread_id, thread.agent_id, chat.unseen_outcome
           FROM cb_project_chats chat
           JOIN projection_agent_threads thread ON thread.thread_id = chat.thread_id
           WHERE chat.unseen_outcome IS NOT NULL AND chat.user_archived = 0 AND thread.routine_id IS NULL`,
        )
        .all(),
    ).flatMap((row) => {
      const outcome = requiredStringColumn(row, "unseen_outcome");
      if (outcome !== "completed" && outcome !== "failed") return [];
      return [
        {
          threadId: requiredStringColumn(row, "thread_id"),
          agentId: requiredStringColumn(row, "agent_id"),
          outcome,
        },
      ];
    });
  }

  search(agentIds: readonly string[], query: string, cursor: string | undefined, limit: number): ProjectChatMatchPage {
    const normalized = query.trim().replace(/\s+/g, " ").toLocaleLowerCase();
    if (!normalized || agentIds.length === 0) return { matches: [], nextCursor: null };
    const offset = cursor === undefined ? 0 : decodeOffsetCursor(cursor);
    const pattern = `%${escapeLike(normalized)}%`;
    const agents = JSON.stringify(agentIds);
    const text = "json_extract(message.message_json, '$.text')";
    const terms = normalized.split(" ");
    const longestTerm = terms.reduce((longest, term) => (term.length > longest.length ? term : longest));
    const textMatch = `LOWER(${text}) LIKE ? ESCAPE '\\'`;
    const textFilter =
      terms.length > 1
        ? `${textMatch} AND LOWER(${COLLAPSE_WHITESPACE_FUNCTION}(${text})) LIKE ? ESCAPE '\\'`
        : textMatch;
    const textParameters = terms.length > 1 ? [`%${escapeLike(longestTerm)}%`, pattern] : [pattern];
    const rows = databaseRows(
      this.#database.connection
        .prepare(
          `WITH matches AS MATERIALIZED (
             SELECT thread.thread_id AS match_thread_id, 'title' AS kind, NULL AS message_id, thread.title AS text,
               thread.updated_at AS at, 0 AS ordinal
             FROM projection_agent_threads thread
             WHERE ${PROJECT_CHAT}
               AND ${LOWERCASE_FUNCTION}(${COLLAPSE_WHITESPACE_FUNCTION}(thread.title)) LIKE ? ESCAPE '\\'
             UNION ALL
             SELECT thread.thread_id, 'message', message.message_id, ${text}, message.created_at, message.ordinal
             FROM projection_thread_messages message
             JOIN projection_agent_threads thread ON thread.thread_id = message.thread_id
             WHERE ${PROJECT_CHAT}
               AND ${textFilter}
               AND ${SEARCHED_MESSAGE}
           )
           SELECT found.kind, found.message_id, found.text, found.at, ${CHAT_COLUMNS}
           FROM (
             SELECT * FROM matches
             ORDER BY at DESC, kind DESC, ordinal DESC, match_thread_id, message_id
             LIMIT ? OFFSET ?
           ) found
           JOIN projection_agent_threads thread ON thread.thread_id = found.match_thread_id
           LEFT JOIN cb_project_chats chat ON chat.thread_id = thread.thread_id
           ORDER BY found.at DESC, found.kind DESC, found.ordinal DESC, found.match_thread_id, found.message_id`,
        )
        .all(agents, pattern, agents, ...textParameters, limit + 1, offset),
    );
    const matches = rows.slice(0, limit).map((row): ProjectChatMatchRow => {
      const kind = requiredStringColumn(row, "kind");
      return {
        row: decodeChatRow(row),
        kind: kind === "title" ? "title" : "message",
        messageId: optionalStringColumn(row, "message_id"),
        text: optionalStringColumn(row, "text") ?? "",
        at: requiredStringColumn(row, "at"),
      };
    });
    return { matches, nextCursor: rows.length > limit ? encodeCursor({ offset: offset + limit }) : null };
  }
}

export function searchExcerpt(text: string, query: string): string {
  const limit = PROJECT_LIMITS.searchExcerpt;
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= limit) return flat;
  const at = flat.toLocaleLowerCase().indexOf(query.trim().replace(/\s+/g, " ").toLocaleLowerCase());
  const start = Math.max(0, Math.min(at < 0 ? 0 : at - Math.floor(limit / 4), flat.length - (limit - 2)));
  const end = Math.min(flat.length, start + limit - 2);
  return `${start > 0 ? "…" : ""}${flat.slice(start, end)}${end < flat.length ? "…" : ""}`;
}

function decodeChatRow(row: DynamicRecord): ProjectChatRow {
  const threadId = requiredStringColumn(row, "thread_id");
  const outcome = optionalStringColumn(row, "outcome");
  return {
    threadId,
    taskId: requiredStringColumn(row, "task_id"),
    agentId: requiredStringColumn(row, "agent_id"),
    title: requiredStringColumn(row, "title"),
    outcome: isOneOf(AGENT_TASK_OUTCOMES, outcome) ? outcome : null,
    error: optionalStringColumn(row, "error"),
    createdAt: requiredStringColumn(row, "created_at"),
    updatedAt: requiredStringColumn(row, "updated_at"),
    closedAt: optionalStringColumn(row, "archived_at"),
    settings: decodeProjectChatSettings(row, threadId),
  };
}

function encodeCursor(value: ListCursor | { offset: number }): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function decodeCursorRecord(cursor: string): DynamicRecord {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (isDynamicRecord(parsed)) return parsed;
  } catch {
    throw new Error(sourceText("error.project.cursorInvalid"));
  }
  throw new Error(sourceText("error.project.cursorInvalid"));
}

function decodeListCursor(cursor: string): ListCursor {
  const value = decodeCursorRecord(cursor);
  if ((value.pinned !== 0 && value.pinned !== 1) || !isString(value.updatedAt) || !isString(value.threadId))
    throw new Error(sourceText("error.project.cursorInvalid"));
  return { pinned: value.pinned, updatedAt: value.updatedAt, threadId: value.threadId };
}

function decodeOffsetCursor(cursor: string): number {
  const value = decodeCursorRecord(cursor);
  if (!isNumber(value.offset) || !Number.isSafeInteger(value.offset) || value.offset < 0)
    throw new Error(sourceText("error.project.cursorInvalid"));
  return value.offset;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}
