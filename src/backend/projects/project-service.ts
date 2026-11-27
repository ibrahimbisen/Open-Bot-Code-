import { randomUUID } from "node:crypto";
import { realpath, stat } from "node:fs/promises";
import {
  type AgentEvent,
  type AgentSummary,
  type AgentTask,
  type ConversationMessageSender,
  type CreateProjectAgentInput,
  type CreateProjectInput,
  DEFAULT_PROJECT_ACCESS_LEVEL,
  emptyProjectActivity,
  folderInside,
  type ListProjectChatsInput,
  PROJECT_LIMITS,
  type ProjectActivity,
  type ProjectActivityState,
  type ProjectAgent,
  type ProjectAgentRef,
  type ProjectChat,
  type ProjectChatMatch,
  type ProjectChatRef,
  type ProjectChatSearchPage,
  type ProjectChatsPage,
  type ProjectDetail,
  type ProjectFolderChange,
  type ProjectFolderChoice,
  type ProjectFolderInput,
  type ProjectRuntime,
  type ProjectSummary,
  projectActivityState,
  projectFolders,
  type SearchProjectChatsInput,
  type SetProjectChatArchivedInput,
  type SetProjectChatPinnedInput,
  type SetProjectChatRuntimeInput,
  type StartProjectChatInput,
  type UpdateProjectAgentInput,
  type UpdateProjectInput,
} from "@codebot/contracts/ipc";
import { sourceText } from "@codebot/i18n/source";
import { createCodeBotLogger, toLogValue } from "@codebot/logging";
import { Effect } from "effect";
import { providerForAgent } from "../agent/thread-items";
import { readAgentInstructionsFile, saveAgentInstructionsFile } from "../agent/workspace-instructions";
import type { AgentService } from "../agent-service";
import type { CodeBotDatabase } from "../codebot-database";
import { runCauseEffect } from "../effect-boundary";
import { ProjectChatQueries, type ProjectChatRow, searchExcerpt } from "./project-chat-queries";
import { setAgentProjectContextSource, setChatRuntimeSource } from "./project-context";
import {
  type ProjectOperations,
  type ProjectServiceEvent,
  projectIo,
  projectStep,
  toProjectFailed,
} from "./project-operations";
import { ProjectStore } from "./project-store";

type ProjectAgentHost = Pick<
  AgentService,
  | "listAgents"
  | "createProjectAgent"
  | "updateAgent"
  | "deleteAgent"
  | "agentProjectChanged"
  | "startTask"
  | "listTasks"
  | "closeTask"
  | "reopenTask"
  | "taskReadStates"
  | "attentionThreadIds"
  | "on"
  | "off"
>;

export interface ProjectServiceOptions {
  database: CodeBotDatabase;
  agents: ProjectAgentHost;
  readerId: () => string | null;
  isProtectedFolder: (path: string) => Promise<boolean>;
}

const logger = createCodeBotLogger("project-service");

const DEFAULT_PAGE = 50;

const WATCHED_EVENTS = new Set([
  "agent-tasks-changed",
  "thread-turn-completed",
  "prompt",
  "agent-input-resolved",
  "approval",
  "browser-takeover-requested",
  "browser-takeover-resolved",
  "agents-changed",
]);

interface OpenChat {
  agentId: string;
  threadId: string;
  state: AgentTask["state"];
}

async function isDirectory(path: string): Promise<boolean> {
  return (await stat(path).catch(() => null))?.isDirectory() === true;
}

async function realFolder(path: string): Promise<string> {
  return realpath(path).catch(() => path);
}

function accessFor(level: ProjectSummary["accessLevel"]): "full" | "workspace" {
  return level === "open" ? "full" : "workspace";
}

function runtimeOf(agent: AgentSummary): ProjectRuntime {
  return {
    provider: providerForAgent(agent),
    model: agent.model,
    reasoningEffort: agent.reasoningEffort,
    ...(agent.providerAccountId === undefined ? {} : { providerAccountId: agent.providerAccountId }),
  };
}

function fail(
  key:
    | "error.project.notFound"
    | "error.project.archived"
    | "error.project.nameRequired"
    | "error.project.agentRequired"
    | "error.project.agentNotFound"
    | "error.project.agentNameRequired"
    | "error.project.chatNotFound"
    | "error.project.runtimeProviderMismatch"
    | "error.project.folderMissing"
    | "error.project.folderProtected",
): never {
  throw new Error(sourceText(key));
}

export class ProjectService implements ProjectOperations {
  readonly #store: ProjectStore;
  readonly #queries: ProjectChatQueries;
  readonly #options: ProjectServiceOptions;
  readonly #projects = new Map<string, ProjectSummary>();
  readonly #listeners = new Set<(event: ProjectServiceEvent) => void>();
  readonly #open = new Map<string, OpenChat>();
  readonly #unseen = new Map<string, { agentId: string; outcome: "completed" | "failed" }>();
  readonly #lastChats = new Map<string, string>();
  #lastActivity = "[]";
  #attention = new Set<string>();
  readonly #settling = new Set<string>();
  #started = false;
  readonly #onEvent = (event: AgentEvent) => this.#handleEvent(event);
  readonly #onRead = (agentId: string, taskId: string, unreadCount: number) =>
    this.#handleRead(agentId, taskId, unreadCount);

  constructor(options: ProjectServiceOptions) {
    this.#options = options;
    this.#store = new ProjectStore({ database: options.database });
    this.#queries = new ProjectChatQueries({ database: options.database });
    for (const project of this.#store.list()) this.#projects.set(project.id, project);
    setAgentProjectContextSource((agentId) => this.#contextOf(agentId));
    setChatRuntimeSource((agentId, taskId) => this.#queries.chat(agentId, taskId)?.settings.runtime ?? null);
  }

  start(): Effect.Effect<void, never> {
    return Effect.promise(() => this.reconcile()).pipe(
      Effect.tap(() =>
        Effect.sync(() => {
          if (this.#started) return;
          this.#started = true;
          this.#options.agents.on("event", this.#onEvent);
          this.#options.agents.on("taskRead", this.#onRead);
          this.#lastActivity = JSON.stringify(this.listActivity());
        }),
      ),
    );
  }

  stop(): void {
    if (!this.#started) return;
    this.#started = false;
    this.#options.agents.off("event", this.#onEvent);
    this.#options.agents.off("taskRead", this.#onRead);
    setAgentProjectContextSource(() => null);
    setChatRuntimeSource(() => null);
  }

  async reconcile(): Promise<void> {
    const agents = this.#options.agents.listAgents();
    const known = new Set(agents.map((agent) => agent.id));
    for (const project of this.#store.list()) {
      const present = project.agentIds.filter((id) => known.has(id));
      if (present.length !== project.agentIds.length)
        this.#projects.set(project.id, this.#store.update(project.id, { agentIds: present }));
    }
    const owners = new Set([...this.#projects.values()].flatMap((project) => project.agentIds));
    for (const agent of agents) {
      if (agent.projectId === undefined || owners.has(agent.id)) continue;
      const project = this.#projects.get(agent.projectId);
      if (project) {
        this.#projects.set(
          project.id,
          this.#store.update(project.id, { agentIds: [...project.agentIds, agent.id].slice(0, PROJECT_LIMITS.agents) }),
        );
        continue;
      }
      await Effect.runPromise(Effect.result(this.#options.agents.deleteAgent(agent.id)));
    }
    this.#store.forgetChats(this.#store.chatsWithoutThread());
    this.#unseen.clear();
    for (const chat of this.#queries.unseen()) this.#unseen.set(chat.threadId, chat);
    this.#open.clear();
    for (const project of this.#projects.values())
      for (const agentId of project.agentIds) this.#absorbTasks(agentId, this.#options.agents.listTasks(agentId).tasks);
    this.#attention = this.#options.agents.attentionThreadIds();
  }

  list(): ProjectSummary[] {
    return [...this.#projects.values()].sort(
      (left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id),
    );
  }

  find(projectId: string): ProjectSummary | null {
    return this.#projects.get(projectId) ?? null;
  }

  subscribe(listener: (event: ProjectServiceEvent) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #emit(event: ProjectServiceEvent): void {
    for (const listener of this.#listeners) {
      try {
        listener(event);
      } catch {
        this.#listeners.delete(listener);
      }
    }
  }

  #require(projectId: string): ProjectSummary {
    const project = this.#projects.get(projectId);
    if (!project) fail("error.project.notFound");
    return project;
  }

  #requireActive(projectId: string): ProjectSummary {
    const project = this.#require(projectId);
    if (project.archivedAt !== null) fail("error.project.archived");
    return project;
  }

  #contextOf(agentId: string) {
    for (const project of this.#projects.values()) {
      if (!project.agentIds.includes(agentId)) continue;
      return {
        projectId: project.id,
        projectName: project.name,
        mainFolder: project.mainFolder,
        folders: projectFolders(project),
        accessLevel: project.accessLevel,
        replyRule: project.replyRule,
        instructions: project.instructions,
      };
    }
    return null;
  }

  #changed(project: ProjectSummary | null, agentIds: readonly string[] = project?.agentIds ?? []): void {
    if (project) this.#projects.set(project.id, project);
    this.#options.agents.agentProjectChanged(agentIds);
    this.#emit({ type: "projects-changed", projectId: project?.id ?? null, projects: this.list() });
    this.#emitActivity();
  }

  #update(projectId: string, change: Parameters<ProjectStore["update"]>[1], notifyAgents = true): ProjectSummary {
    const next = this.#store.update(projectId, change);
    this.#projects.set(projectId, next);
    if (notifyAgents) this.#options.agents.agentProjectChanged(next.agentIds);
    return next;
  }

  async #folderState(project: ProjectSummary): Promise<ProjectDetail["folders"]> {
    return Promise.all(
      projectFolders(project).map(async (path) => ({
        path,
        main: path === project.mainFolder,
        found: await isDirectory(path),
      })),
    );
  }

  async #agentInstructions(agent: AgentSummary): Promise<string> {
    const file = await Effect.runPromise(Effect.result(readAgentInstructionsFile(agent.workspacePath)));
    return file._tag === "Success" ? file.success.text : "";
  }

  async #detail(project: ProjectSummary): Promise<ProjectDetail> {
    const agents = this.#options.agents.listAgents();
    const counts = this.#queries.counts(project.agentIds);
    const projectAgents: ProjectAgent[] = [];
    for (const agentId of project.agentIds) {
      const agent = agents.find((candidate) => candidate.id === agentId);
      if (!agent) continue;
      projectAgents.push({
        id: agent.id,
        projectId: project.id,
        name: agent.name,
        role: agent.title,
        instructions: await this.#agentInstructions(agent),
        runtime: runtimeOf(agent),
        avatarSeed: agent.avatarSeed,
        avatarHue: agent.avatarHue,
        avatarColor: agent.avatarColor ?? null,
        chatCount: counts.get(agent.id) ?? 0,
      });
    }
    return { project, agents: projectAgents, folders: await this.#folderState(project) };
  }

  get(projectId: string) {
    return projectIo(() => this.#detail(this.#require(projectId)));
  }

  async #checkedFolder(
    picked: string,
  ): Promise<{ ok: true; path: string } | { ok: false; path: string; refusal: "missing" | "protected" }> {
    if (!(await isDirectory(picked))) return { ok: false, path: picked, refusal: "missing" };
    const path = await realFolder(picked);
    if (await this.#options.isProtectedFolder(path)) return { ok: false, path, refusal: "protected" };
    return { ok: true, path };
  }

  checkFolder(path: string) {
    return projectIo(async (): Promise<ProjectFolderChoice> => {
      const checked = await this.#checkedFolder(path);
      return checked.ok
        ? { outcome: "chosen", path: checked.path }
        : { outcome: "refused", path: checked.path, refusal: checked.refusal };
    });
  }

  create(input: CreateProjectInput, ownerId: string | null) {
    return projectIo(async () => {
      if (input.operationId !== undefined) {
        const existing = this.#store.createdBy(input.operationId);
        if (existing) return this.#detail(this.#projects.get(existing.id) ?? existing);
      }
      const name = input.name.trim();
      if (!name) fail("error.project.nameRequired");
      if (this.#projects.size >= PROJECT_LIMITS.projects)
        throw new Error(sourceText("error.project.limit", { limit: PROJECT_LIMITS.projects }));
      const agentInputs = input.agents?.length ? input.agents : [{ name, role: "" }];
      if (agentInputs.length > PROJECT_LIMITS.agents)
        throw new Error(sourceText("error.project.agentLimit", { limit: PROJECT_LIMITS.agents }));
      const main = await this.#checkedFolder(input.mainFolder);
      if (!main.ok) fail(main.refusal === "missing" ? "error.project.folderMissing" : "error.project.folderProtected");
      const extra: string[] = [];
      for (const picked of input.additionalFolders ?? []) {
        const checked = await this.#checkedFolder(picked);
        if (!checked.ok) continue;
        if (folderInside(main.path, checked.path) || extra.some((folder) => folderInside(folder, checked.path)))
          continue;
        for (let index = extra.length - 1; index >= 0; index -= 1)
          if (folderInside(checked.path, extra[index] ?? "")) extra.splice(index, 1);
        if (extra.length < PROJECT_LIMITS.folders) extra.push(checked.path);
      }
      const now = new Date().toISOString();
      const record: ProjectSummary = {
        id: `project-${randomUUID()}`,
        name,
        color: input.color ?? null,
        mainFolder: main.path,
        additionalFolders: extra,
        accessLevel: input.accessLevel ?? DEFAULT_PROJECT_ACCESS_LEVEL,
        defaultRuntime: input.defaultRuntime ?? null,
        replyRule: input.replyRule?.trim() ? input.replyRule : null,
        instructions: input.instructions ?? "",
        agentIds: [],
        ownerId,
        createdAt: now,
        updatedAt: now,
        archivedAt: null,
      };
      let project = this.#store.create(record, input.operationId);
      this.#projects.set(project.id, project);
      try {
        for (const agent of agentInputs) project = await this.#addAgent(project, agent);
      } catch (error) {
        await this.#discard(project);
        throw error;
      }
      this.#changed(project);
      return this.#detail(project);
    });
  }

  async #discard(project: ProjectSummary): Promise<void> {
    this.#projects.delete(project.id);
    this.#store.delete(project.id);
    for (const agentId of project.agentIds)
      await Effect.runPromise(Effect.result(this.#options.agents.deleteAgent(agentId)));
  }

  async #addAgent(
    project: ProjectSummary,
    input: { name: string; role: string; instructions?: string; runtime?: ProjectRuntime | null },
  ): Promise<ProjectSummary> {
    if (project.agentIds.length >= PROJECT_LIMITS.agents)
      throw new Error(sourceText("error.project.agentLimit", { limit: PROJECT_LIMITS.agents }));
    const runtime = input.runtime ?? project.defaultRuntime;
    const agent = await runCauseEffect(
      this.#options.agents.createProjectAgent({
        projectId: project.id,
        name: input.name.trim(),
        role: input.role.trim(),
        avatarSeed: randomUUID(),
        ...(runtime
          ? {
              provider: runtime.provider,
              model: runtime.model,
              reasoningEffort: runtime.reasoningEffort,
              ...(runtime.providerAccountId === undefined ? {} : { providerAccountId: runtime.providerAccountId }),
            }
          : {}),
      }),
    );
    const next = this.#update(project.id, { agentIds: [...project.agentIds, agent.id] }, false);
    try {
      await runCauseEffect(
        this.#options.agents.updateAgent({ agentId: agent.id, access: accessFor(project.accessLevel) }),
      );
      if (input.instructions?.trim()) await runCauseEffect(this.#writeInstructions(agent, input.instructions));
    } catch (error) {
      await Effect.runPromise(Effect.result(this.#options.agents.deleteAgent(agent.id)));
      this.#update(project.id, { agentIds: project.agentIds }, false);
      throw error;
    }
    return next;
  }

  #writeInstructions(agent: AgentSummary, text: string) {
    return Effect.gen(function* () {
      const current = yield* readAgentInstructionsFile(agent.workspacePath);
      yield* saveAgentInstructionsFile(agent.workspacePath, text, current.text);
    }).pipe(
      Effect.mapError((failure) => ({
        cause:
          failure._tag === "AgentInstructionsFileFailed"
            ? failure.cause
            : new Error(sourceText("error.agent.instructionsSaveFailed")),
      })),
    );
  }

  update(input: UpdateProjectInput) {
    return projectIo(async () => {
      const project = this.#requireActive(input.projectId);
      const change: Parameters<ProjectStore["update"]>[1] = {};
      if (input.name !== undefined) {
        if (!input.name.trim()) fail("error.project.nameRequired");
        change.name = input.name.trim();
      }
      if (input.color !== undefined) change.color = input.color;
      if (input.defaultRuntime !== undefined) change.defaultRuntime = input.defaultRuntime;
      if (input.replyRule !== undefined) change.replyRule = input.replyRule?.trim() ? input.replyRule : null;
      if (input.instructions !== undefined) change.instructions = input.instructions;
      if (input.accessLevel !== undefined) change.accessLevel = input.accessLevel;
      if (input.mainFolder !== undefined && input.mainFolder !== project.mainFolder) {
        const main = await this.#checkedFolder(input.mainFolder);
        if (!main.ok)
          fail(main.refusal === "missing" ? "error.project.folderMissing" : "error.project.folderProtected");
        change.mainFolder = main.path;
        change.additionalFolders = project.additionalFolders.filter((folder) => !folderInside(main.path, folder));
      }
      const next = this.#update(project.id, change);
      if (input.accessLevel !== undefined && input.accessLevel !== project.accessLevel)
        for (const agentId of next.agentIds)
          await runCauseEffect(this.#options.agents.updateAgent({ agentId, access: accessFor(next.accessLevel) }));
      this.#changed(next);
      return this.#detail(next);
    });
  }

  archive(projectId: string) {
    return projectStep(() => {
      const project = this.#require(projectId);
      if (project.archivedAt !== null) return project;
      const next = this.#update(projectId, { archivedAt: new Date().toISOString() }, false);
      this.#changed(next, []);
      return next;
    });
  }

  restore(projectId: string) {
    return projectStep(() => {
      const project = this.#require(projectId);
      if (project.archivedAt === null) return project;
      const next = this.#update(projectId, { archivedAt: null }, false);
      this.#changed(next, []);
      return next;
    });
  }

  delete(projectId: string) {
    return projectIo(async () => {
      const project = this.#projects.get(projectId);
      if (!project) return;
      const threadIds = this.#queries.threadIds(project.agentIds);
      this.#projects.delete(projectId);
      this.#store.delete(projectId);
      for (const agentId of project.agentIds) await runCauseEffect(this.#options.agents.deleteAgent(agentId));
      this.#store.forgetChats(threadIds);
      for (const threadId of threadIds) this.#unseen.delete(threadId);
      for (const [taskId, chat] of this.#open) if (project.agentIds.includes(chat.agentId)) this.#open.delete(taskId);
      this.#changed(null, []);
    });
  }

  addFolder(input: ProjectFolderInput) {
    return projectIo(async (): Promise<ProjectFolderChange> => {
      const project = this.#requireActive(input.projectId);
      const detail = () => this.#detail(this.#projects.get(project.id) ?? project);
      const checked = await this.#checkedFolder(input.path);
      if (!checked.ok)
        return { outcome: "refused", path: checked.path, refusal: checked.refusal, detail: await detail() };
      const path = checked.path;
      const listed = projectFolders(project);
      const covering = listed.find((folder) => folderInside(folder, path));
      if (covering) return { outcome: "covered", path, folder: covering, detail: await detail() };
      if (folderInside(path, project.mainFolder))
        return { outcome: "refused", path, refusal: "contains-main", detail: await detail() };
      const kept = project.additionalFolders.filter((folder) => !folderInside(path, folder));
      if (kept.length >= PROJECT_LIMITS.folders)
        return { outcome: "refused", path, refusal: "limit", detail: await detail() };
      const replaced = project.additionalFolders.filter((folder) => !kept.includes(folder));
      const next = this.#update(project.id, { additionalFolders: [...kept, path] });
      this.#changed(next);
      return { outcome: "added", path, replaced, detail: await this.#detail(next) };
    });
  }

  removeFolder(input: ProjectFolderInput) {
    return projectIo(async (): Promise<ProjectFolderChange> => {
      const project = this.#require(input.projectId);
      if (input.path === project.mainFolder)
        return { outcome: "refused", path: input.path, refusal: "main", detail: await this.#detail(project) };
      if (!project.additionalFolders.includes(input.path))
        return { outcome: "removed", path: input.path, detail: await this.#detail(project) };
      const next = this.#update(project.id, {
        additionalFolders: project.additionalFolders.filter((folder) => folder !== input.path),
      });
      this.#changed(next);
      return { outcome: "removed", path: input.path, detail: await this.#detail(next) };
    });
  }

  createAgent(input: CreateProjectAgentInput) {
    return projectIo(async () => {
      const project = this.#requireActive(input.projectId);
      if (!input.name.trim()) fail("error.project.agentNameRequired");
      const next = await this.#addAgent(project, input);
      this.#changed(next);
      return this.#detail(next);
    });
  }

  #requireAgent(ref: ProjectAgentRef): { project: ProjectSummary; agent: AgentSummary } {
    const project = this.#require(ref.projectId);
    const agent = this.#options.agents.listAgents().find((candidate) => candidate.id === ref.agentId);
    if (!agent || !project.agentIds.includes(ref.agentId)) fail("error.project.agentNotFound");
    return { project, agent };
  }

  updateAgent(input: UpdateProjectAgentInput) {
    return projectIo(async () => {
      const { project, agent } = this.#requireAgent(input);
      if (input.name !== undefined && !input.name.trim()) fail("error.project.agentNameRequired");
      const update = {
        agentId: agent.id,
        ...(input.name === undefined ? {} : { name: input.name.trim() }),
        ...(input.role === undefined ? {} : { title: input.role.trim() }),
        ...(input.runtime === undefined
          ? {}
          : {
              provider: input.runtime.provider,
              model: input.runtime.model,
              reasoningEffort: input.runtime.reasoningEffort,
              ...(input.runtime.providerAccountId === undefined
                ? {}
                : { providerAccountId: input.runtime.providerAccountId }),
            }),
      };
      if (Object.keys(update).length > 1) await runCauseEffect(this.#options.agents.updateAgent(update));
      if (input.instructions !== undefined) await runCauseEffect(this.#writeInstructions(agent, input.instructions));
      const next = this.#update(project.id, {}, false);
      this.#changed(next, [agent.id]);
      return this.#detail(next);
    });
  }

  removeAgent(input: ProjectAgentRef) {
    return projectIo(async () => {
      const { project, agent } = this.#requireAgent(input);
      if (project.agentIds.length <= 1) fail("error.project.agentRequired");
      const threadIds = this.#queries.threadIds([agent.id]);
      const taskIds = [...this.#open].filter(([, chat]) => chat.agentId === agent.id).map(([taskId]) => taskId);
      const next = this.#update(project.id, { agentIds: project.agentIds.filter((id) => id !== agent.id) }, false);
      await runCauseEffect(this.#options.agents.deleteAgent(agent.id));
      this.#store.forgetChats(threadIds);
      for (const threadId of threadIds) this.#unseen.delete(threadId);
      for (const taskId of taskIds) this.#open.delete(taskId);
      this.#changed(next);
      this.#emit({
        type: "chats-changed",
        projectId: project.id,
        chats: [],
        removedTaskIds: taskIds.slice(0, PROJECT_LIMITS.chatsPage),
      });
      return this.#detail(next);
    });
  }

  #projectOfAgent(agentId: string): ProjectSummary | null {
    for (const project of this.#projects.values()) if (project.agentIds.includes(agentId)) return project;
    return null;
  }

  #chatViews(rows: readonly ProjectChatRow[]): ProjectChat[] {
    if (rows.length === 0) return [];
    const readerId = this.#options.readerId();
    const unread =
      readerId === null
        ? new Map()
        : this.#options.agents.taskReadStates(
            readerId,
            rows.map((row) => row.threadId),
          );
    const live = new Map<string, AgentTask>();
    for (const agentId of new Set(rows.map((row) => row.agentId)))
      for (const task of this.#options.agents.listTasks(agentId).tasks) live.set(task.id, task);
    return rows.flatMap((row) => {
      const project = this.#projectOfAgent(row.agentId);
      if (!project) return [];
      return [this.#chatView(project, row, live.get(row.taskId), unread.get(row.threadId)?.unreadCount ?? 0)];
    });
  }

  #chatView(project: ProjectSummary, row: ProjectChatRow, task: AgentTask | undefined, unread: number): ProjectChat {
    const state = task && task.closedAt === null ? (task.state === "closed" ? "idle" : task.state) : "idle";
    const hold = state === "queued" ? (task?.hold ?? null) : null;
    const unseen = row.settings.unseenOutcome;
    let activity: ProjectActivityState = "idle";
    if (row.closedAt === null && this.#attention.has(row.threadId)) activity = "needs-input";
    else if (unseen === "failed") activity = "error";
    else if (state === "running" || state === "queued") activity = "working";
    else if (unseen === "completed" || unread > 0) activity = "done";
    const error = row.outcome === "failed" ? row.error : null;
    return {
      projectId: project.id,
      agentId: row.agentId,
      taskId: row.taskId,
      threadId: row.threadId,
      title: row.title,
      state,
      activity,
      hold,
      error: error === null ? null : error.slice(0, 2000),
      unreadCount: unread,
      archived: row.settings.archived,
      pinned: row.settings.pinned,
      runtime: row.settings.runtime,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  listChats(input: ListProjectChatsInput): ProjectChatsPage {
    const project = this.#require(input.projectId);
    const page = this.#queries.page(
      project.agentIds,
      input.archived ?? "exclude",
      input.cursor,
      Math.min(input.limit ?? DEFAULT_PAGE, PROJECT_LIMITS.chatsPage),
    );
    return { chats: this.#chatViews(page.rows), nextCursor: page.nextCursor };
  }

  #requireChatRow(ref: ProjectChatRef): { project: ProjectSummary; row: ProjectChatRow } {
    const project = this.#projectOfAgent(ref.agentId);
    const row = project ? this.#queries.chat(ref.agentId, ref.taskId) : null;
    if (!project || !row) fail("error.project.chatNotFound");
    return { project, row };
  }

  getChat(input: ProjectChatRef): ProjectChat {
    const { row } = this.#requireChatRow(input);
    const [chat] = this.#chatViews([row]);
    if (!chat) fail("error.project.chatNotFound");
    return chat;
  }

  searchChats(input: SearchProjectChatsInput): ProjectChatSearchPage {
    const projects = input.projectId === undefined ? [...this.#projects.values()] : [this.#require(input.projectId)];
    const page = this.#queries.search(
      projects.flatMap((project) => project.agentIds),
      input.query,
      input.cursor,
      Math.min(input.limit ?? DEFAULT_PAGE, PROJECT_LIMITS.chatsPage),
    );
    const views = new Map(this.#chatViews(page.matches.map((match) => match.row)).map((chat) => [chat.threadId, chat]));
    const matches = page.matches.flatMap((match): ProjectChatMatch[] => {
      const chat = views.get(match.row.threadId);
      if (!chat) return [];
      return [
        {
          chat,
          kind: match.kind,
          messageId: match.messageId,
          excerpt: searchExcerpt(match.text, input.query),
          createdAt: match.at,
        },
      ];
    });
    return { matches, nextCursor: page.nextCursor };
  }

  startChat(input: StartProjectChatInput, sender: ConversationMessageSender | undefined) {
    return Effect.gen({ self: this }, function* () {
      const project = yield* projectStep(() => this.#requireActive(input.projectId));
      const { agent } = yield* projectStep(() => this.#requireAgent({ projectId: project.id, agentId: input.agentId }));
      if (input.runtime) yield* projectStep(() => this.#requireSameProvider(agent, input.runtime ?? null));
      yield* projectIo(async () => {
        if (!(await isDirectory(project.mainFolder)))
          throw new Error(sourceText("error.project.mainFolderMissing", { path: project.mainFolder }));
      });
      const task = yield* toProjectFailed(
        this.#options.agents.startTask(
          {
            agentId: input.agentId,
            text: input.text,
            ...(input.attachmentDraftIds ? { attachmentDraftIds: input.attachmentDraftIds } : {}),
            ...(input.clientMessageId ? { clientMessageId: input.clientMessageId } : {}),
          },
          sender,
        ),
      );
      if (input.runtime) {
        const runtime = input.runtime;
        yield* projectStep(() => this.#store.setChat(task.threadId, { runtime }));
      }
      return yield* projectStep(() => this.getChat({ agentId: task.agentId, taskId: task.id }));
    });
  }

  #requireSameProvider(agent: AgentSummary, runtime: ProjectRuntime | null): void {
    if (runtime && runtime.provider !== providerForAgent(agent)) fail("error.project.runtimeProviderMismatch");
  }

  setChatRuntime(input: SetProjectChatRuntimeInput) {
    return Effect.gen({ self: this }, function* () {
      const { project, row } = yield* projectStep(() => this.#requireChatRow(input));
      const { agent } = yield* projectStep(() => this.#requireAgent({ projectId: project.id, agentId: input.agentId }));
      yield* projectStep(() => this.#requireSameProvider(agent, input.runtime));
      return yield* projectStep(() => {
        this.#setChat(row, { runtime: input.runtime });
        this.#emitChat(project, row.threadId);
        return this.getChat(input);
      });
    });
  }

  #setChat(row: ProjectChatRow, change: Parameters<ProjectStore["setChat"]>[1]): void {
    const next = this.#store.setChat(row.threadId, change);
    if (next.unseenOutcome === null) this.#unseen.delete(row.threadId);
    else this.#unseen.set(row.threadId, { agentId: row.agentId, outcome: next.unseenOutcome });
  }

  #emitChat(project: ProjectSummary, threadId: string): void {
    const [row] = this.#queries.chatsOfThreads([threadId]);
    if (!row) return;
    const chats = this.#chatViews([row]);
    this.#publishChats(project.id, chats, []);
    this.#emitActivity();
  }

  setChatArchived(input: SetProjectChatArchivedInput) {
    return Effect.gen({ self: this }, function* () {
      const { project, row } = yield* projectStep(() => this.#requireChatRow(input));
      if (input.archived) {
        if (row.closedAt === null)
          yield* toProjectFailed(this.#options.agents.closeTask({ agentId: input.agentId, taskId: input.taskId }));
        yield* projectStep(() => this.#setChat(row, { archived: true }));
      } else {
        yield* projectStep(() => {
          this.#setChat(row, { archived: false });
          if (row.closedAt !== null) this.#options.agents.reopenTask({ agentId: input.agentId, taskId: input.taskId });
        });
      }
      return yield* projectStep(() => {
        this.#emitChat(project, row.threadId);
        return this.getChat(input);
      });
    });
  }

  setChatPinned(input: SetProjectChatPinnedInput): ProjectChat {
    const { project, row } = this.#requireChatRow(input);
    this.#setChat(row, { pinned: input.pinned });
    this.#emitChat(project, row.threadId);
    return this.getChat(input);
  }

  listActivity(): ProjectActivity[] {
    const perProject = new Map<string, ProjectActivity>();
    for (const project of this.#projects.values()) perProject.set(project.id, emptyProjectActivity(project.id));
    const counted = new Set<string>();
    for (const chat of this.#open.values()) {
      const project = this.#projectOfAgent(chat.agentId);
      const entry = project ? perProject.get(project.id) : undefined;
      if (!entry) continue;
      counted.add(chat.threadId);
      const unseen = this.#unseen.get(chat.threadId)?.outcome;
      if (this.#attention.has(chat.threadId)) entry.needsInput += 1;
      else if (unseen === "failed") entry.error += 1;
      else if (chat.state === "running" || chat.state === "queued") entry.working += 1;
      else if (unseen === "completed") entry.done += 1;
    }
    for (const [threadId, unseen] of this.#unseen) {
      if (counted.has(threadId)) continue;
      const project = this.#projectOfAgent(unseen.agentId);
      const entry = project ? perProject.get(project.id) : undefined;
      if (!entry) continue;
      if (unseen.outcome === "failed") entry.error += 1;
      else entry.done += 1;
    }
    return [...perProject.values()].map((entry) => ({
      ...entry,
      state: projectActivityState(
        [
          entry.needsInput > 0 ? ("needs-input" as const) : null,
          entry.error > 0 ? ("error" as const) : null,
          entry.working > 0 ? ("working" as const) : null,
          entry.done > 0 ? ("done" as const) : null,
        ].filter((state) => state !== null),
      ),
    }));
  }

  #emitActivity(): void {
    const activity = this.listActivity();
    const key = JSON.stringify(activity);
    if (key === this.#lastActivity) return;
    this.#lastActivity = key;
    this.#emit({ type: "activity-changed", activity });
  }

  #publishChats(projectId: string, chats: readonly ProjectChat[], removedTaskIds: string[]): void {
    const changed = chats.filter((chat) => {
      const key = JSON.stringify(chat);
      if (this.#lastChats.get(chat.threadId) === key) return false;
      this.#lastChats.set(chat.threadId, key);
      return true;
    });
    for (const taskId of removedTaskIds) this.#lastChats.delete(taskId);
    if (changed.length + removedTaskIds.length === 0) return;
    for (let at = 0; at < Math.max(changed.length, 1); at += PROJECT_LIMITS.chatsPage)
      this.#emit({
        type: "chats-changed",
        projectId,
        chats: changed.slice(at, at + PROJECT_LIMITS.chatsPage),
        removedTaskIds: at === 0 ? removedTaskIds.slice(0, PROJECT_LIMITS.chatsPage) : [],
      });
  }

  #absorbTasks(agentId: string, tasks: readonly AgentTask[]): string[] {
    const seen = new Set<string>();
    for (const task of tasks) {
      seen.add(task.id);
      if (task.routineId) continue;
      this.#open.set(task.id, { agentId, threadId: task.threadId, state: task.state });
    }
    const gone: string[] = [];
    for (const [taskId, chat] of this.#open) {
      if (chat.agentId !== agentId || seen.has(taskId)) continue;
      if (this.#queries.chat(agentId, taskId) !== null) continue;
      this.#open.delete(taskId);
      this.#unseen.delete(chat.threadId);
      this.#store.forgetChats([chat.threadId]);
      this.#lastChats.delete(chat.threadId);
      gone.push(taskId);
    }
    return gone;
  }

  #handleEvent(event: AgentEvent): void {
    if (!WATCHED_EVENTS.has(event.type)) return;
    try {
      this.#attention = this.#options.agents.attentionThreadIds();
      if (event.type === "agent-tasks-changed") this.#tasksChanged(event.snapshot);
      else if (event.type === "thread-turn-completed") this.#turnCompleted(event.taskId, event.turn.status);
      else if (event.type === "agents-changed") this.#emitActivity();
      else this.#refreshAttention();
    } catch (error) {
      logger.warn("Could not update the project chats after an agent event.", toLogValue(error));
    }
  }

  #tasksChanged(snapshot: { agentId: string; tasks: AgentTask[] }): void {
    const project = this.#projectOfAgent(snapshot.agentId);
    if (!project) return;
    const gone = this.#absorbTasks(snapshot.agentId, snapshot.tasks);
    const threadIds = snapshot.tasks.filter((task) => !task.routineId).map((task) => task.threadId);
    const rows = this.#queries.chatsOfThreads(threadIds);
    for (const row of rows) {
      if (!row.settings.archived || row.closedAt !== null) continue;
      this.#setChat(row, { archived: false });
      row.settings.archived = false;
    }
    this.#publishChats(project.id, this.#chatViews(rows), gone);
    this.#emitActivity();
  }

  #turnCompleted(taskId: string, status: string): void {
    const chat = this.#open.get(taskId);
    if (!chat) return;
    const [row] = this.#queries.chatsOfThreads([chat.threadId]);
    if (!row) return;
    if (status === "completed") this.#setChat(row, { unseenOutcome: "completed" });
    else if (status === "failed") this.#setChat(row, { unseenOutcome: "failed" });
    const project = this.#projectOfAgent(chat.agentId);
    if (project) this.#emitChat(project, chat.threadId);
    this.#emitActivity();
    this.#settle(chat.agentId);
  }

  #settle(agentId: string): void {
    if (this.#settling.has(agentId)) return;
    this.#settling.add(agentId);
    setImmediate(() => {
      this.#settling.delete(agentId);
      if (!this.#started) return;
      try {
        this.#attention = this.#options.agents.attentionThreadIds();
        this.#tasksChanged({ agentId, tasks: this.#options.agents.listTasks(agentId).tasks });
      } catch (error) {
        logger.warn("Could not settle the project chats of an agent.", toLogValue(error));
      }
    });
  }

  #handleRead(agentId: string, taskId: string, unreadCount: number): void {
    try {
      const project = this.#projectOfAgent(agentId);
      if (!project) return;
      const row = this.#queries.chat(agentId, taskId);
      if (!row) return;
      if (unreadCount === 0 && row.settings.unseenOutcome !== null) this.#setChat(row, { unseenOutcome: null });
      this.#emitChat(project, row.threadId);
    } catch {
      return;
    }
  }

  #refreshAttention(): void {
    const byProject = new Map<string, string[]>();
    for (const chat of this.#open.values()) {
      const project = this.#projectOfAgent(chat.agentId);
      if (project && (this.#lastChats.has(chat.threadId) || this.#attention.has(chat.threadId)))
        byProject.set(project.id, [...(byProject.get(project.id) ?? []), chat.threadId]);
    }
    for (const [projectId, threadIds] of byProject)
      this.#publishChats(projectId, this.#chatViews(this.#queries.chatsOfThreads(threadIds)), []);
    this.#emitActivity();
  }
}
