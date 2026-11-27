import type {
  AgentSummary,
  AgentTask,
  ConversationMessage,
  ResumableSession,
  ResumableSessionList,
  ResumeSessionResult,
} from "@codebot/contracts/ipc";
import { sourceText } from "@codebot/i18n/source";
import { Effect } from "effect";
import type { AgentClient } from "../agent-client";
import type { AgentThreadRecord } from "../agent-threads/agent-thread-store";
import type { CodeBotDatabase } from "../codebot-database";
import { databaseRows, requiredStringColumn } from "../database/database-rows";
import type { ThreadItem } from "../protocol";
import { providerSync } from "../provider-client-effects";
import {
  CLAUDE_SESSIONS_LIST_METHOD,
  type ClaudeSessionSummary,
  decodeClaudeSessionSummaries,
} from "./claude-sessions";
import { providerListsSessions } from "./slash-command-screens";
import { SlashCommandsFailed } from "./slash-commands";

const RESUME_HISTORY_EVENT = "thread.session-resumed";
const SESSION_LIMIT = 100;
const IMPORTED_MESSAGE_LIMIT = 400;
const TITLE_LIMIT = 120;

export interface ClaudeSessionResumeOptions {
  database: CodeBotDatabase;
  agent(agentId: string): AgentSummary | undefined;
  client(agent: AgentSummary): AgentClient | null;
  tasks(agentId: string): readonly AgentTask[];
  createTask(agentId: string, title: string): AgentThreadRecord;
  closeTask(task: AgentThreadRecord): void;
  publicTask(task: AgentThreadRecord): AgentTask;
  changed(agentId: string): void;
}

function failure(key: "error.slash.sessionInUse" | "error.slash.sessionNotFound"): SlashCommandsFailed {
  return new SlashCommandsFailed({ cause: new Error(sourceText(key)) });
}

function iso(milliseconds: number | null): string | null {
  return milliseconds === null || !Number.isFinite(milliseconds) ? null : new Date(milliseconds).toISOString();
}

export class ClaudeSessionResume {
  constructor(private readonly options: ClaudeSessionResumeOptions) {}

  #claudeAgent(agentId: string): { agent: AgentSummary; client: AgentClient } {
    const agent = this.options.agent(agentId);
    if (!agent) throw new Error(sourceText("error.agent.selectedGone"));
    if (!providerListsSessions(agent.provider)) throw new Error(sourceText("error.slash.resumeUnsupported"));
    const client = this.options.client(agent);
    if (!client?.running) throw new Error(sourceText("error.slash.resumeEngineOff"));
    return { agent, client };
  }

  #chatsOfSessions(agent: AgentSummary): Map<string, string | null> {
    const chats = new Map<string, string | null>();
    const rows = databaseRows(
      this.options.database.connection
        .prepare(
          `SELECT session.external_session_id AS session_id, session.thread_id AS thread_id
           FROM projection_provider_sessions session
           JOIN projection_threads thread ON thread.thread_id = session.thread_id
           WHERE thread.agent_id = ? AND session.provider = ? AND session.state = 'active'`,
        )
        .all(agent.id, agent.provider),
    );
    const tasks = this.options.tasks(agent.id);
    for (const row of rows) {
      const threadId = requiredStringColumn(row, "thread_id");
      const task = tasks.find((candidate) => candidate.threadId === threadId);
      chats.set(requiredStringColumn(row, "session_id"), task?.id ?? null);
    }
    return chats;
  }

  readonly list = Effect.fn("ClaudeSessionResume.list")(function* (this: ClaudeSessionResume, agentId: string) {
    const { agent, client } = yield* Effect.try({
      try: () => this.#claudeAgent(agentId),
      catch: (cause) => new SlashCommandsFailed({ cause }),
    });
    const found = yield* client
      .request(
        CLAUDE_SESSIONS_LIST_METHOD,
        { cwd: agent.workspacePath, limit: SESSION_LIMIT },
        decodeClaudeSessionSummaries,
        30_000,
      )
      .pipe(Effect.mapError((cause) => new SlashCommandsFailed({ cause: cause.cause })));
    const used = this.#chatsOfSessions(agent);
    const sessions: ResumableSession[] = found.map((session) => ({
      sessionId: session.sessionId,
      title: session.title,
      firstPrompt: session.firstPrompt,
      updatedAt: iso(session.updatedAt) ?? new Date(0).toISOString(),
      createdAt: iso(session.createdAt),
      gitBranch: session.gitBranch,
      taskId: used.get(session.sessionId) ?? null,
      current: used.has(session.sessionId),
    }));
    const list: ResumableSessionList = { agentId: agent.id, folder: agent.workspacePath, sessions };
    return list;
  });

  readonly resume = Effect.fn("ClaudeSessionResume.resume")(function* (
    this: ClaudeSessionResume,
    agentId: string,
    sessionId: string,
  ) {
    const { agent, client } = yield* Effect.try({
      try: () => this.#claudeAgent(agentId),
      catch: (cause) => new SlashCommandsFailed({ cause }),
    });
    if (this.#chatsOfSessions(agent).has(sessionId)) return yield* failure("error.slash.sessionInUse");
    if (this.options.database.listProviderSessionIds(sessionId).length > 0)
      return yield* failure("error.slash.sessionInUse");
    const found = yield* client
      .request(
        CLAUDE_SESSIONS_LIST_METHOD,
        { cwd: agent.workspacePath, limit: 500 },
        decodeClaudeSessionSummaries,
        30_000,
      )
      .pipe(Effect.mapError((cause) => new SlashCommandsFailed({ cause: cause.cause })));
    const session = found.find((candidate) => candidate.sessionId === sessionId);
    if (!session) return yield* failure("error.slash.sessionNotFound");
    const messages = yield* this.#history(client, agent, session);
    return yield* Effect.try({
      try: () => this.#adopt(agent, session, messages),
      catch: (cause) => new SlashCommandsFailed({ cause }),
    });
  });

  #adopt(
    agent: AgentSummary,
    session: ClaudeSessionSummary,
    messages: readonly ConversationMessage[],
  ): ResumeSessionResult {
    const title = (session.title || session.firstPrompt || sessionTitleFallback(session)).slice(0, TITLE_LIMIT);
    const record = this.options.createTask(agent.id, title);
    try {
      this.options.database.bindProviderSession({
        threadId: record.threadId,
        provider: agent.provider,
        externalSessionId: session.sessionId,
        model: agent.model,
        effort: agent.reasoningEffort,
      });
      if (messages.length > 0)
        this.options.database.persistConversationChanges({
          agentId: agent.id,
          threadId: record.threadId,
          activeTurnId: null,
          changedMessages: messages,
          eventType: RESUME_HISTORY_EVENT,
        });
    } catch (error) {
      this.options.closeTask(record);
      throw error;
    }
    this.options.changed(agent.id);
    return { task: this.options.publicTask(record), importedMessages: messages.length };
  }

  readonly #history = Effect.fn("ClaudeSessionResume.history")(function* (
    this: ClaudeSessionResume,
    client: AgentClient,
    agent: AgentSummary,
    session: ClaudeSessionSummary,
  ) {
    const read = client.readHistory;
    if (!read) return [];
    const messages: ConversationMessage[] = [];
    let step = 0;
    const consume = (fragment: { turnId: string; startedAt?: number; items: ThreadItem[] }) =>
      providerSync(() => {
        const startedAt = fragment.startedAt ?? session.updatedAt;
        for (const item of fragment.items) {
          const message = historyMessage(item, fragment.turnId, startedAt, ++step);
          if (message) messages.push(message);
        }
        return messages.length < IMPORTED_MESSAGE_LIMIT;
      });
    yield* read({ threadId: session.sessionId, cwd: agent.workspacePath, items: "full" }, (fragment) =>
      consume(fragment),
    ).pipe(Effect.catch(() => Effect.void));
    return messages;
  });
}

function sessionTitleFallback(session: ClaudeSessionSummary): string {
  return iso(session.updatedAt)?.slice(0, 16).replace("T", " ") ?? session.sessionId.slice(0, 8);
}

function historyMessage(item: ThreadItem, turnId: string, startedAt: number, step: number): ConversationMessage | null {
  if (!item.id) return null;
  const createdAt = new Date(startedAt + step).toISOString();
  if (item.type === "userMessage") {
    const text = (item.content ?? [])
      .flatMap((part) => (part.type === "text" && part.text ? [part.text] : []))
      .join("\n")
      .trim();
    return text ? { id: item.id, turnId, author: "user", source: "user", text, createdAt, status: "completed" } : null;
  }
  if (item.type === "agentMessage" && item.phase !== "commentary") {
    const text = item.text?.trim();
    return text
      ? { id: item.id, turnId, author: "assistant", source: "assistant", text, createdAt, status: "completed" }
      : null;
  }
  return null;
}
