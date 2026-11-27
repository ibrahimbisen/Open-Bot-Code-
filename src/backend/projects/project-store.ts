import { randomUUID } from "node:crypto";
import { INPUT_LIMITS } from "@codebot/contracts/input-limits";
import {
  isAgentAdditionalFolders,
  isAvatarColor,
  isProjectAccessLevel,
  isProjectRuntime,
  isProjectSummary,
  PROJECT_LIMITS,
  type ProjectRuntime,
  type ProjectSummary,
} from "@codebot/contracts/ipc";
import { type DynamicRecord, isDynamicRecord, isString } from "@codebot/contracts/runtime-values";
import { sourceText } from "@codebot/i18n/source";
import type { CodeBotDatabase } from "../codebot-database";
import { deleteAggregateHistory } from "../database/database-core";
import {
  databaseRow,
  databaseRows,
  optionalStringColumn,
  requiredNumberColumn,
  requiredStringColumn,
} from "../database/database-rows";

export type ProjectUnseenOutcome = "completed" | "failed";

export interface ProjectChatSettings {
  threadId: string;
  runtime: ProjectRuntime | null;
  archived: boolean;
  pinned: boolean;
  unseenOutcome: ProjectUnseenOutcome | null;
}

export type ProjectChatSettingsChange = Partial<Omit<ProjectChatSettings, "threadId">>;

export type ProjectRecordChange = Partial<
  Pick<
    ProjectSummary,
    | "name"
    | "color"
    | "mainFolder"
    | "additionalFolders"
    | "accessLevel"
    | "defaultRuntime"
    | "replyRule"
    | "instructions"
    | "agentIds"
    | "archivedAt"
  >
>;

export interface ProjectStoreOptions {
  database: CodeBotDatabase;
}

const PROJECT_AGGREGATE = "project";
const PROJECT_LIST_AGGREGATE = "projects";
const PROJECT_CHAT_AGGREGATE = "project-chat";

const SELECT_PROJECT = "SELECT * FROM cb_projects";

function emptyProjectChatSettings(threadId: string): ProjectChatSettings {
  return { threadId, runtime: null, archived: false, pinned: false, unseenOutcome: null };
}

export class ProjectStore {
  readonly #database: CodeBotDatabase;

  constructor(options: ProjectStoreOptions) {
    this.#database = options.database;
  }

  list(): ProjectSummary[] {
    return databaseRows(
      this.#database.connection.prepare(`${SELECT_PROJECT} ORDER BY created_at, project_id`).all(),
    ).map(decodeProject);
  }

  get(projectId: string): ProjectSummary | null {
    const row = databaseRow(this.#database.connection.prepare(`${SELECT_PROJECT} WHERE project_id = ?`).get(projectId));
    return row ? decodeProject(row) : null;
  }

  count(): number {
    const row = databaseRow(this.#database.connection.prepare("SELECT COUNT(*) AS count FROM cb_projects").get());
    return row ? requiredNumberColumn(row, "count") : 0;
  }

  createdBy(operationId: string): ProjectSummary | null {
    const result = this.#database.commandResult(createCommandId(operationId));
    return isDynamicRecord(result) && isString(result.projectId) ? this.get(result.projectId) : null;
  }

  create(project: ProjectSummary, operationId?: string): ProjectSummary {
    if (!isProjectSummary(project)) throw new Error("Invalid project record.");
    const result = this.#database.dispatch(
      operationId === undefined ? `project-created:${project.id}` : createCommandId(operationId),
      [
        {
          aggregateType: PROJECT_AGGREGATE,
          aggregateId: project.id,
          eventType: "project.created",
          payload: { project },
          occurredAt: project.createdAt,
        },
      ],
      (db, sequences) => {
        db.prepare(
          `INSERT INTO cb_projects
             (project_id, name, color, main_folder, additional_folders_json, access_level, default_runtime_json,
              reply_rule, instructions, agent_ids_json, owner_id, created_at, updated_at, archived_at,
              last_event_sequence)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          project.id,
          project.name,
          project.color,
          project.mainFolder,
          JSON.stringify(project.additionalFolders),
          project.accessLevel,
          project.defaultRuntime === null ? null : JSON.stringify(project.defaultRuntime),
          project.replyRule,
          project.instructions,
          JSON.stringify(project.agentIds),
          project.ownerId,
          project.createdAt,
          project.updatedAt,
          project.archivedAt,
          sequences[0] ?? 0,
        );
        return { projectId: project.id };
      },
    );
    return this.#require(result.projectId);
  }

  update(projectId: string, change: ProjectRecordChange, eventType = "project.updated"): ProjectSummary {
    const current = this.#require(projectId);
    const next: ProjectSummary = { ...current, ...change, updatedAt: new Date().toISOString() };
    if (!isProjectSummary(next)) throw new Error("Invalid project record.");
    this.#database.dispatch(
      `${eventType}:${projectId}:${randomUUID()}`,
      [
        {
          aggregateType: PROJECT_AGGREGATE,
          aggregateId: projectId,
          eventType,
          payload: { change },
          occurredAt: next.updatedAt,
        },
      ],
      (db, sequences) => {
        db.prepare(
          `UPDATE cb_projects
           SET name = ?, color = ?, main_folder = ?, additional_folders_json = ?, access_level = ?,
               default_runtime_json = ?, reply_rule = ?, instructions = ?, agent_ids_json = ?, updated_at = ?,
               archived_at = ?, last_event_sequence = ?
           WHERE project_id = ?`,
        ).run(
          next.name,
          next.color,
          next.mainFolder,
          JSON.stringify(next.additionalFolders),
          next.accessLevel,
          next.defaultRuntime === null ? null : JSON.stringify(next.defaultRuntime),
          next.replyRule,
          next.instructions,
          JSON.stringify(next.agentIds),
          next.updatedAt,
          next.archivedAt,
          sequences[0] ?? 0,
          projectId,
        );
        return null;
      },
    );
    return this.#require(projectId);
  }

  delete(projectId: string): void {
    if (!this.get(projectId)) return;
    this.#database.dispatch(
      `project-deleted:${projectId}:${randomUUID()}`,
      [
        {
          aggregateType: PROJECT_LIST_AGGREGATE,
          aggregateId: PROJECT_LIST_AGGREGATE,
          eventType: "project.deleted",
          payload: { projectId },
        },
      ],
      (db) => {
        deleteAggregateHistory(db, PROJECT_AGGREGATE, [projectId]);
        db.prepare("DELETE FROM cb_projects WHERE project_id = ?").run(projectId);
        return null;
      },
    );
  }

  chat(threadId: string): ProjectChatSettings {
    const row = databaseRow(
      this.#database.connection.prepare("SELECT * FROM cb_project_chats WHERE thread_id = ?").get(threadId),
    );
    return row ? decodeChat(row) : emptyProjectChatSettings(threadId);
  }

  setChat(threadId: string, change: ProjectChatSettingsChange): ProjectChatSettings {
    const current = this.chat(threadId);
    const next: ProjectChatSettings = { ...current, ...change };
    if (sameChatSettings(current, next)) return current;
    const now = new Date().toISOString();
    this.#database.dispatch(
      `project-chat-changed:${threadId}:${randomUUID()}`,
      [
        {
          aggregateType: PROJECT_CHAT_AGGREGATE,
          aggregateId: threadId,
          eventType: "project-chat.changed",
          payload: { change },
          occurredAt: now,
        },
      ],
      (db, sequences) => {
        db.prepare(
          `INSERT INTO cb_project_chats
             (thread_id, runtime_json, user_archived, pinned, unseen_outcome, updated_at, last_event_sequence)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(thread_id) DO UPDATE SET
             runtime_json = excluded.runtime_json,
             user_archived = excluded.user_archived,
             pinned = excluded.pinned,
             unseen_outcome = excluded.unseen_outcome,
             updated_at = excluded.updated_at,
             last_event_sequence = excluded.last_event_sequence`,
        ).run(
          threadId,
          next.runtime === null ? null : JSON.stringify(next.runtime),
          next.archived ? 1 : 0,
          next.pinned ? 1 : 0,
          next.unseenOutcome,
          now,
          sequences[0] ?? 0,
        );
        return null;
      },
    );
    return next;
  }

  forgetChats(threadIds: readonly string[]): void {
    if (threadIds.length === 0) return;
    this.#database.dispatch(
      `project-chats-forgotten:${randomUUID()}`,
      [
        {
          aggregateType: PROJECT_LIST_AGGREGATE,
          aggregateId: PROJECT_LIST_AGGREGATE,
          eventType: "project-chat.forgotten",
          payload: { threadIds },
        },
      ],
      (db) => {
        deleteAggregateHistory(db, PROJECT_CHAT_AGGREGATE, threadIds);
        const remove = db.prepare("DELETE FROM cb_project_chats WHERE thread_id = ?");
        for (const threadId of threadIds) remove.run(threadId);
        return null;
      },
    );
  }

  chatsWithoutThread(): string[] {
    return databaseRows(
      this.#database.connection
        .prepare(
          `SELECT thread_id FROM cb_project_chats
           WHERE thread_id NOT IN (SELECT thread_id FROM projection_agent_threads)
           ORDER BY thread_id LIMIT 500`,
        )
        .all(),
    ).map((row) => requiredStringColumn(row, "thread_id"));
  }

  #require(projectId: string): ProjectSummary {
    const project = this.get(projectId);
    if (!project) throw new Error(sourceText("error.project.notFound"));
    return project;
  }
}

function createCommandId(operationId: string): string {
  return `project-create:${operationId}`;
}

function sameChatSettings(left: ProjectChatSettings, right: ProjectChatSettings): boolean {
  return (
    left.archived === right.archived &&
    left.pinned === right.pinned &&
    left.unseenOutcome === right.unseenOutcome &&
    JSON.stringify(left.runtime) === JSON.stringify(right.runtime)
  );
}

function parsedColumn<T>(row: DynamicRecord, key: string, guard: (value: unknown) => value is T): T | null {
  const text = optionalStringColumn(row, key);
  if (text === null) return null;
  try {
    const value = JSON.parse(text);
    return guard(value) ? value : null;
  } catch {
    return null;
  }
}

function isIdentifierList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= PROJECT_LIMITS.agents &&
    value.every((id) => isString(id) && id.length > 0 && id.length <= INPUT_LIMITS.identifier)
  );
}

function decodeProject(row: DynamicRecord): ProjectSummary {
  const color = optionalStringColumn(row, "color");
  const accessLevel = requiredStringColumn(row, "access_level");
  if (!isProjectAccessLevel(accessLevel)) throw new Error(`Unknown project access level: ${accessLevel}`);
  return {
    id: requiredStringColumn(row, "project_id"),
    name: requiredStringColumn(row, "name"),
    color: isAvatarColor(color) ? color : null,
    mainFolder: requiredStringColumn(row, "main_folder"),
    additionalFolders: parsedColumn(row, "additional_folders_json", isAgentAdditionalFolders) ?? [],
    accessLevel,
    defaultRuntime: parsedColumn(row, "default_runtime_json", isProjectRuntime),
    replyRule: optionalStringColumn(row, "reply_rule"),
    instructions: requiredStringColumn(row, "instructions"),
    agentIds: parsedColumn(row, "agent_ids_json", isIdentifierList) ?? [],
    ownerId: optionalStringColumn(row, "owner_id"),
    createdAt: requiredStringColumn(row, "created_at"),
    updatedAt: requiredStringColumn(row, "updated_at"),
    archivedAt: optionalStringColumn(row, "archived_at"),
  };
}

export function decodeProjectChatSettings(row: DynamicRecord, threadId: string): ProjectChatSettings {
  const unseen = optionalStringColumn(row, "unseen_outcome");
  return {
    threadId,
    runtime: parsedColumn(row, "runtime_json", isProjectRuntime),
    archived: row.user_archived === 1,
    pinned: row.pinned === 1,
    unseenOutcome: unseen === "completed" || unseen === "failed" ? unseen : null,
  };
}

function decodeChat(row: DynamicRecord): ProjectChatSettings {
  return decodeProjectChatSettings(row, requiredStringColumn(row, "thread_id"));
}
