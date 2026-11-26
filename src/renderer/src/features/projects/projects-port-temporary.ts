import { isKnownAgentProvider } from "@codebot/contracts/agent-providers";
import {
  type AgentTask,
  type ClientAgentSummary,
  DEFAULT_PROJECT_ACCESS_LEVEL,
  emptyProjectActivity,
  isAvatarColor,
  isProjectAccessLevel,
  isProjectRuntime,
  PROJECT_LIMITS,
  type ProjectActivity,
  type ProjectActivityState,
  type ProjectAgent,
  type ProjectAgentInput,
  type ProjectChat,
  type ProjectChatRef,
  type ProjectDetail,
  type ProjectRuntime,
  type ProjectSummary,
  projectActivityState,
  projectFolders,
  SIDEBAR_UNASSIGNED_SECTION_ID,
  type SidebarLayoutSnapshot,
  type UpdateAgentInput,
} from "@codebot/contracts/ipc";
import { isDynamicRecord, isString } from "@codebot/contracts/runtime-values";
import type { AgentProfile } from "@codebot/ui/data";
import { createEffect, createMemo, createSignal, untrack } from "solid-js";
import type { AgentTasks } from "../agent-tasks/agent-tasks-state";
import { chatActivityOf } from "./project-activity";
import type { EngineProjectsPort } from "./projects-port";

const STORAGE_KEY = "codebot:projects-temporary:v2";
const DERIVED_CREATED_AT = new Date(Date.UTC(2000, 0, 1)).toISOString();
const FALLBACK_RUNTIME: ProjectRuntime = { provider: "codex", model: "", reasoningEffort: "medium" };

type ProjectSource = "created" | "section" | "agent";

interface StoredProject extends ProjectSummary {
  source: ProjectSource;
  sourceId: string | null;
}

interface StoredState {
  projects: StoredProject[];
  pinned: string[];
  seen: Record<string, string>;
}

const EMPTY_STATE: StoredState = { projects: [], pinned: [], seen: {} };

export interface TemporaryProjectsDeps {
  serverId: string;
  agents: () => readonly AgentProfile[];
  agentsSettled: () => boolean;
  sidebarLayout: () => SidebarLayoutSnapshot;
  tasks: AgentTasks;
  reloadKey: () => unknown;
  waitsForInput: (task: AgentTask) => boolean;
  addAgent: (agent: ClientAgentSummary) => void;
  updateAgent: (agentId: string, updates: Omit<UpdateAgentInput, "agentId">) => Promise<void>;
  deleteAgent: (agentId: string) => Promise<void>;
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

function storedProject(value: unknown): StoredProject | null {
  if (!isDynamicRecord(value) || !isString(value.id) || !isString(value.name) || !isString(value.mainFolder))
    return null;
  const now = new Date().toISOString();
  return {
    id: value.id,
    source: value.source === "section" || value.source === "agent" ? value.source : "created",
    sourceId: isString(value.sourceId) ? value.sourceId : null,
    name: value.name,
    color: isAvatarColor(value.color) ? value.color : null,
    mainFolder: value.mainFolder,
    additionalFolders: isStringList(value.additionalFolders) ? value.additionalFolders : [],
    accessLevel: isProjectAccessLevel(value.accessLevel) ? value.accessLevel : DEFAULT_PROJECT_ACCESS_LEVEL,
    defaultRuntime: isProjectRuntime(value.defaultRuntime) ? value.defaultRuntime : null,
    replyRule: isString(value.replyRule) ? value.replyRule : null,
    instructions: isString(value.instructions) ? value.instructions : "",
    agentIds: isStringList(value.agentIds) ? value.agentIds : [],
    ownerId: null,
    createdAt: isString(value.createdAt) ? value.createdAt : now,
    updatedAt: isString(value.updatedAt) ? value.updatedAt : now,
    archivedAt: isString(value.archivedAt) ? value.archivedAt : null,
  };
}

function storedStateOf(all: unknown, serverId: string): StoredState {
  const stored = isDynamicRecord(all) ? all[serverId] : undefined;
  if (!isDynamicRecord(stored)) return EMPTY_STATE;
  const projects = Array.isArray(stored.projects)
    ? stored.projects.flatMap((entry) => {
        const project = storedProject(entry);
        return project ? [project] : [];
      })
    : [];
  const seen = isDynamicRecord(stored.seen)
    ? Object.fromEntries(Object.entries(stored.seen).flatMap(([key, value]) => (isString(value) ? [[key, value]] : [])))
    : {};
  return { projects, pinned: isStringList(stored.pinned) ? stored.pinned : [], seen };
}

function readStoredState(serverId: string): StoredState {
  try {
    return storedStateOf(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}"), serverId);
  } catch {
    return EMPTY_STATE;
  }
}

function withServerState(all: unknown, serverId: string, state: StoredState): string {
  return JSON.stringify({ ...(isDynamicRecord(all) ? all : {}), [serverId]: state });
}

function writeStoredState(serverId: string, state: StoredState): void {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY) ?? "{}";
    window.localStorage.setItem(STORAGE_KEY, withServerState(JSON.parse(stored), serverId, state));
  } catch {}
}

function agentRuntime(agent: AgentProfile): ProjectRuntime {
  return {
    provider: isKnownAgentProvider(agent.provider) ? agent.provider : FALLBACK_RUNTIME.provider,
    model: agent.model,
    reasoningEffort: agent.reasoningEffort,
    ...(agent.providerAccountId ? { providerAccountId: agent.providerAccountId } : {}),
  };
}

function runtimeFields(runtime: ProjectRuntime) {
  return {
    provider: runtime.provider,
    model: runtime.model,
    reasoningEffort: runtime.reasoningEffort,
    ...(runtime.providerAccountId ? { providerAccountId: runtime.providerAccountId } : {}),
  };
}

function summaryOf(project: StoredProject): ProjectSummary {
  const { source: _source, sourceId: _sourceId, ...summary } = project;
  return { ...summary, additionalFolders: [...summary.additionalFolders], agentIds: [...summary.agentIds] };
}

function newestFirst(left: ProjectChat, right: ProjectChat): number {
  return right.updatedAt.localeCompare(left.updatedAt) || left.taskId.localeCompare(right.taskId);
}

function cursorOffset(cursor: string | undefined): number {
  const offset = cursor?.startsWith("offset:") ? Number(cursor.slice(7)) : 0;
  return Number.isSafeInteger(offset) && offset >= 0 ? offset : 0;
}

export function createTemporaryProjectsPort(deps: TemporaryProjectsDeps): EngineProjectsPort {
  const { serverId, tasks } = deps;
  const agentApi = () => window.codebot.agent;
  const [state, setState] = createSignal<StoredState>(readStoredState(serverId));
  const [reserved, setReserved] = createSignal<ReadonlySet<string>>(new Set());
  const changedListeners = new Set<Parameters<EngineProjectsPort["onChanged"]>[0]>();
  const chatListeners = new Set<Parameters<EngineProjectsPort["onChatsChanged"]>[0]>();
  const activityListeners = new Set<Parameters<EngineProjectsPort["onActivityChanged"]>[0]>();

  function save(update: (current: StoredState) => StoredState): void {
    const next = update(untrack(state));
    writeStoredState(serverId, next);
    setState(next);
  }

  const projects = createMemo((): StoredProject[] => {
    const agents = deps.agents();
    const known = new Set(agents.map((agent) => agent.id));
    const layout = deps.sidebarLayout();
    const sections = new Set(layout.sections.map((section) => section.id));
    const sectionOf = (agentId: string): string | null => {
      const sectionId = layout.agentAssignments[agentId];
      return sectionId && sectionId !== SIDEBAR_UNASSIGNED_SECTION_ID && sections.has(sectionId) ? sectionId : null;
    };
    const stored = state().projects;
    const claimed = new Set([...stored.flatMap((project) => project.agentIds), ...reserved()]);
    const bySection = new Map<string, AgentProfile[]>();
    const single: AgentProfile[] = [];
    for (const agent of agents) {
      if (claimed.has(agent.id)) continue;
      const sectionId = sectionOf(agent.id);
      if (sectionId === null) single.push(agent);
      else bySection.set(sectionId, [...(bySection.get(sectionId) ?? []), agent]);
    }
    const result: StoredProject[] = stored.map((project) => {
      const adopted = project.source === "section" && project.sourceId ? (bySection.get(project.sourceId) ?? []) : [];
      if (project.source === "section" && project.sourceId) bySection.delete(project.sourceId);
      return {
        ...project,
        agentIds: [...project.agentIds.filter((id) => known.has(id)), ...adopted.map((agent) => agent.id)],
      };
    });
    const derived = (
      source: ProjectSource,
      sourceId: string,
      name: string,
      members: readonly AgentProfile[],
    ): StoredProject => {
      const first = members[0];
      return {
        id: `${source}-${sourceId}`,
        source,
        sourceId,
        name,
        color: first?.avatarColor ?? null,
        mainFolder: first?.workspacePath ?? "",
        additionalFolders: [...new Set(members.flatMap((agent) => agent.additionalFolders ?? []))],
        accessLevel: DEFAULT_PROJECT_ACCESS_LEVEL,
        defaultRuntime: first ? agentRuntime(first) : null,
        replyRule: null,
        instructions: "",
        agentIds: members.map((agent) => agent.id),
        ownerId: null,
        createdAt: DERIVED_CREATED_AT,
        updatedAt: DERIVED_CREATED_AT,
        archivedAt: null,
      };
    };
    for (const section of layout.sections) {
      const members = bySection.get(section.id);
      if (members?.length) result.push(derived("section", section.id, section.name, members));
    }
    for (const agent of single) result.push(derived("agent", agent.id, agent.name, [agent]));
    return result.sort(
      (left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id),
    );
  });

  function project(projectId: string): StoredProject {
    const found = untrack(projects).find((entry) => entry.id === projectId);
    if (!found) throw new Error(`Unknown project ${projectId}`);
    return found;
  }

  function change(projectId: string, update: (current: StoredProject) => StoredProject): StoredProject {
    const next = { ...update(project(projectId)), updatedAt: new Date().toISOString() };
    save((stored) => ({
      ...stored,
      projects: stored.projects.some((entry) => entry.id === projectId)
        ? stored.projects.map((entry) => (entry.id === projectId ? next : entry))
        : [...stored.projects, next],
    }));
    return next;
  }

  function projectOfAgent(agentId: string): StoredProject {
    const found = untrack(projects).find((entry) => entry.agentIds.includes(agentId));
    if (!found) throw new Error(`Unknown project agent ${agentId}`);
    return found;
  }

  function activityOf(task: AgentTask): ProjectActivityState {
    return chatActivityOf(task, {
      waitsForInput: deps.waitsForInput(task),
      unread: tasks.unreadCount(task),
      seen: state().seen[task.id] === task.updatedAt,
    });
  }

  function chatOf(projectId: string, task: AgentTask): ProjectChat {
    return {
      projectId,
      agentId: task.agentId,
      taskId: task.id,
      threadId: task.threadId,
      title: task.title,
      state: task.state === "closed" ? "idle" : task.state,
      activity: activityOf(task),
      hold: task.hold,
      error: task.outcome === "failed" ? task.error : null,
      unreadCount: tasks.unreadCount(task),
      archived: task.state === "closed",
      pinned: state().pinned.includes(task.id),
      runtime: null,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }

  function projectChats(entry: StoredProject): ProjectChat[] {
    return entry.agentIds.flatMap((agentId) =>
      (tasks.snapshot(agentId)?.tasks ?? []).map((task) => chatOf(entry.id, task)),
    );
  }

  function findTask(ref: ProjectChatRef): AgentTask {
    const task = untrack(() => tasks.snapshot(ref.agentId)?.tasks.find((entry) => entry.id === ref.taskId));
    if (!task) throw new Error(`Unknown chat ${ref.taskId}`);
    return task;
  }

  async function loadMissingTasks(agentIds: readonly string[]): Promise<void> {
    await Promise.all(
      agentIds.filter((agentId) => !tasks.snapshot(agentId)).map((agentId) => tasks.loadTasks(agentId)),
    );
  }

  async function agentOf(projectId: string, agent: AgentProfile): Promise<ProjectAgent> {
    const instructions = await agentApi()
      .readAgentInstructions(agent.id, serverId)
      .then(
        (file) => file.text,
        () => "",
      );
    return {
      id: agent.id,
      projectId,
      name: agent.name,
      role: agent.title,
      instructions: instructions.slice(0, PROJECT_LIMITS.agentInstructions),
      runtime: agentRuntime(agent),
      avatarSeed: agent.avatarSeed,
      avatarHue: agent.avatarHue,
      avatarColor: agent.avatarColor ?? null,
      chatCount: untrack(() => tasks.snapshot(agent.id)?.tasks.length ?? 0),
    };
  }

  async function detail(projectId: string): Promise<ProjectDetail> {
    const entry = project(projectId);
    const agents = untrack(deps.agents);
    return {
      project: summaryOf(entry),
      agents: await Promise.all(
        entry.agentIds.flatMap((agentId) => {
          const agent = agents.find((candidate) => candidate.id === agentId);
          return agent ? [agentOf(projectId, agent)] : [];
        }),
      ),
      folders: projectFolders(entry)
        .filter((path) => path !== "")
        .map((path) => ({ path, main: path === entry.mainFolder, found: true })),
    };
  }

  async function saveInstructions(agentId: string, text: string): Promise<void> {
    const current = await agentApi().readAgentInstructions(agentId, serverId);
    if (current.text === text) return;
    await agentApi().saveAgentInstructions({ agentId, text, expected: current.text }, serverId);
  }

  async function addFolders(agentId: string, folders: readonly string[]): Promise<void> {
    for (const path of folders) if (path) await agentApi().addAgentFolder({ agentId, path }, serverId);
  }

  async function createProjectAgent(
    entry: Pick<StoredProject, "name" | "defaultRuntime" | "color" | "mainFolder" | "additionalFolders">,
    input: ProjectAgentInput,
  ): Promise<string> {
    const role = input.role.trim();
    const runtime = input.runtime ?? entry.defaultRuntime;
    const created = await agentApi().createAgent(
      {
        name: input.name.trim() || role || entry.name,
        description: role,
        avatarSeed: crypto.randomUUID(),
        avatarHue: null,
        avatarColor: entry.color,
        initialMessage: `You are the ${role || "agent"} of the project "${entry.name}". Wait for the first chat.`,
        ...(runtime ? runtimeFields(runtime) : {}),
      },
      serverId,
    );
    setReserved((current) => new Set(current).add(created.id));
    deps.addAgent(created);
    if (role) await deps.updateAgent(created.id, { title: role });
    await addFolders(created.id, projectFolders(entry));
    if (input.instructions?.trim()) await saveInstructions(created.id, input.instructions);
    return created.id;
  }

  function release(agentId: string): void {
    setReserved((current) => {
      const next = new Set(current);
      next.delete(agentId);
      return next;
    });
  }

  const summaries = createMemo(() => projects().map(summaryOf));
  createEffect(
    () => JSON.stringify(summaries()),
    (_signature, previous) => {
      if (previous === undefined) return;
      const event = { serverId, projectId: null, projects: untrack(summaries) };
      for (const listener of [...changedListeners]) listener(event);
    },
  );

  createEffect(
    () => ({
      agentIds: deps.agentsSettled() ? projects().flatMap((entry) => entry.agentIds) : [],
      reload: deps.reloadKey(),
      available: tasks.available(),
    }),
    ({ agentIds, reload, available }, previous) => {
      if (!available) return;
      const reloaded = previous !== undefined && previous.reload !== reload;
      for (const agentId of new Set(agentIds))
        if (reloaded || !untrack(() => tasks.snapshot(agentId))) void tasks.loadTasks(agentId);
    },
  );

  const chatsByProject = createMemo(
    () =>
      new Map(
        projects().map((entry) => [
          entry.id,
          new Map(projectChats(entry).map((chat) => [chat.taskId, { chat, signature: JSON.stringify(chat) }])),
        ]),
      ),
  );
  createEffect(chatsByProject, (next, previous) => {
    if (!previous) return;
    for (const [projectId, chats] of next) {
      const before = previous.get(projectId);
      const changed = [...chats.values()].filter(
        (entry) => before?.get(entry.chat.taskId)?.signature !== entry.signature,
      );
      const removedTaskIds = [...(before?.keys() ?? [])].filter((taskId) => !chats.has(taskId));
      if (changed.length + removedTaskIds.length === 0) continue;
      const event = { serverId, projectId, chats: changed.map((entry) => entry.chat), removedTaskIds };
      for (const listener of [...chatListeners]) listener(event);
    }
  });

  const activity = createMemo((): ProjectActivity[] =>
    [...chatsByProject()].map(([projectId, chats]) => {
      const states = [...chats.values()].map((entry) => entry.chat.activity);
      const count = (kind: ProjectActivityState) => states.filter((candidate) => candidate === kind).length;
      return {
        ...emptyProjectActivity(projectId),
        state: projectActivityState(states),
        working: count("working"),
        done: count("done"),
        needsInput: count("needs-input"),
        error: count("error"),
      };
    }),
  );
  createEffect(
    () => JSON.stringify(activity()),
    (_signature, previous) => {
      if (previous === undefined) return;
      const event = { serverId, activity: untrack(activity) };
      for (const listener of [...activityListeners]) listener(event);
    },
  );

  return {
    list: async () => untrack(summaries),

    get: (projectId) => detail(projectId),

    create: async (input) => {
      const now = new Date().toISOString();
      const created: StoredProject = {
        id: `project-${crypto.randomUUID()}`,
        source: "created",
        sourceId: null,
        name: input.name.trim(),
        color: input.color ?? null,
        mainFolder: input.mainFolder,
        additionalFolders: (input.additionalFolders ?? []).filter((folder) => folder !== input.mainFolder),
        accessLevel: input.accessLevel ?? DEFAULT_PROJECT_ACCESS_LEVEL,
        defaultRuntime: input.defaultRuntime ?? null,
        replyRule: input.replyRule ?? null,
        instructions: input.instructions ?? "",
        agentIds: [],
        ownerId: null,
        createdAt: now,
        updatedAt: now,
        archivedAt: null,
      };
      const agents = input.agents?.length ? input.agents : [{ name: created.name, role: "" }];
      for (const agent of agents) created.agentIds.push(await createProjectAgent(created, agent));
      save((stored) => ({ ...stored, projects: [...stored.projects, created] }));
      for (const agentId of created.agentIds) release(agentId);
      return detail(created.id);
    },

    update: async (input) => {
      const current = project(input.projectId);
      if (input.mainFolder !== undefined && input.mainFolder !== current.mainFolder)
        for (const agentId of current.agentIds) await addFolders(agentId, [input.mainFolder]);
      change(input.projectId, (entry) => ({
        ...entry,
        ...(input.name === undefined ? {} : { name: input.name.trim() }),
        ...(input.color === undefined ? {} : { color: input.color }),
        ...(input.mainFolder === undefined ? {} : { mainFolder: input.mainFolder }),
        ...(input.accessLevel === undefined ? {} : { accessLevel: input.accessLevel }),
        ...(input.defaultRuntime === undefined ? {} : { defaultRuntime: input.defaultRuntime }),
        ...(input.replyRule === undefined ? {} : { replyRule: input.replyRule }),
        ...(input.instructions === undefined ? {} : { instructions: input.instructions }),
      }));
      return detail(input.projectId);
    },

    archive: async (projectId) =>
      summaryOf(change(projectId, (entry) => ({ ...entry, archivedAt: new Date().toISOString() }))),

    restore: async (projectId) => summaryOf(change(projectId, (entry) => ({ ...entry, archivedAt: null }))),

    delete: async (projectId) => {
      const current = project(projectId);
      for (const agentId of current.agentIds) await deps.deleteAgent(agentId);
      save((stored) => ({ ...stored, projects: stored.projects.filter((entry) => entry.id !== projectId) }));
    },

    chooseFolder: async () => {
      const path = await window.codebot.hostedSites.chooseDirectory();
      return path === null ? { outcome: "cancelled" } : { outcome: "chosen", path };
    },

    addFolder: async ({ projectId, path }) => {
      const current = project(projectId);
      const covered = projectFolders(current).find((folder) => folder === path);
      if (covered) return { outcome: "covered", path, folder: covered, detail: await detail(projectId) };
      for (const agentId of current.agentIds) await addFolders(agentId, [path]);
      change(projectId, (entry) => ({ ...entry, additionalFolders: [...entry.additionalFolders, path] }));
      return { outcome: "added", path, replaced: [], detail: await detail(projectId) };
    },

    removeFolder: async ({ projectId, path }) => {
      const current = project(projectId);
      if (path === current.mainFolder)
        return { outcome: "refused", path, refusal: "main", detail: await detail(projectId) };
      for (const agentId of current.agentIds) await agentApi().removeAgentFolder({ agentId, path }, serverId);
      change(projectId, (entry) => ({
        ...entry,
        additionalFolders: entry.additionalFolders.filter((folder) => folder !== path),
      }));
      return { outcome: "removed", path, detail: await detail(projectId) };
    },

    createAgent: async ({ projectId, ...input }) => {
      const agentId = await createProjectAgent(project(projectId), input);
      change(projectId, (entry) => ({ ...entry, agentIds: [...entry.agentIds, agentId] }));
      release(agentId);
      return detail(projectId);
    },

    updateAgent: async (input) => {
      const updates: Omit<UpdateAgentInput, "agentId"> = {
        ...(input.name === undefined ? {} : { name: input.name.trim() }),
        ...(input.role === undefined ? {} : { title: input.role.trim() }),
        ...(input.runtime ? runtimeFields(input.runtime) : {}),
      };
      if (Object.keys(updates).length > 0) await deps.updateAgent(input.agentId, updates);
      if (input.instructions !== undefined) await saveInstructions(input.agentId, input.instructions);
      return detail(input.projectId);
    },

    removeAgent: async ({ projectId, agentId }) => {
      await deps.deleteAgent(agentId);
      change(projectId, (entry) => ({ ...entry, agentIds: entry.agentIds.filter((id) => id !== agentId) }));
      return detail(projectId);
    },

    listChats: async (input) => {
      const current = project(input.projectId);
      await loadMissingTasks(current.agentIds);
      const filter = input.archived ?? "exclude";
      const all = untrack(() => projectChats(project(input.projectId)))
        .filter((chat) => filter === "include" || chat.archived === (filter === "only"))
        .sort(newestFirst);
      const offset = cursorOffset(input.cursor);
      const limit = input.limit ?? 50;
      let older = false;
      if (filter !== "exclude" && offset + limit >= all.length)
        for (const agentId of current.agentIds) {
          const more = untrack(() => tasks.olderArchived(agentId));
          if (!more) continue;
          older = true;
          if (!more.loading) tasks.loadArchivedPage(agentId);
        }
      const next = offset + limit;
      return {
        chats: all.slice(offset, next),
        nextCursor: next < all.length || older ? `offset:${Math.min(next, all.length)}` : null,
      };
    },

    getChat: async (ref) => untrack(() => chatOf(projectOfAgent(ref.agentId).id, findTask(ref))),

    searchChats: async (input) => {
      const text = input.query.trim().toLowerCase();
      const scope = untrack(projects).filter((entry) =>
        input.projectId === undefined ? entry.archivedAt === null : entry.id === input.projectId,
      );
      await loadMissingTasks(scope.flatMap((entry) => entry.agentIds));
      const matches = untrack(() => scope.flatMap(projectChats))
        .filter((chat) => chat.title.toLowerCase().includes(text))
        .sort(newestFirst);
      const offset = cursorOffset(input.cursor);
      const next = offset + (input.limit ?? 50);
      return {
        matches: matches.slice(offset, next).map((chat) => ({
          chat,
          kind: "title",
          messageId: null,
          excerpt: chat.title.slice(0, PROJECT_LIMITS.searchExcerpt),
          createdAt: chat.updatedAt,
        })),
        nextCursor: next < matches.length ? `offset:${next}` : null,
      };
    },

    startChat: async (input) => {
      project(input.projectId);
      const task = await agentApi().startTask(
        {
          agentId: input.agentId,
          text: input.text,
          ...(input.attachmentDraftIds?.length ? { attachmentDraftIds: input.attachmentDraftIds } : {}),
          clientMessageId: input.clientMessageId ?? crypto.randomUUID(),
        },
        serverId,
      );
      await tasks.loadTasks(input.agentId);
      return untrack(() => chatOf(input.projectId, task));
    },

    setChatArchived: async ({ agentId, taskId, archived }) => {
      if (archived) await agentApi().closeTask({ agentId, taskId }, serverId);
      else await agentApi().reopenTask({ agentId, taskId }, serverId);
      await tasks.loadTasks(agentId);
      return untrack(() => chatOf(projectOfAgent(agentId).id, findTask({ agentId, taskId })));
    },

    setChatPinned: async ({ agentId, taskId, pinned }) => {
      save((stored) => ({
        ...stored,
        pinned: pinned ? [...new Set([...stored.pinned, taskId])] : stored.pinned.filter((id) => id !== taskId),
      }));
      return untrack(() => chatOf(projectOfAgent(agentId).id, findTask({ agentId, taskId })));
    },

    markChatShown: async (input) => {
      const task = untrack(() => tasks.snapshot(input.agentId)?.tasks.find((entry) => entry.id === input.taskId));
      if (task && untrack(state).seen[task.id] !== task.updatedAt)
        save((stored) => ({ ...stored, seen: { ...stored.seen, [task.id]: task.updatedAt } }));
      tasks.markTaskRead(input.agentId, input.taskId, input.throughMessageId);
    },

    listActivity: async () => untrack(activity),

    onChanged: (listener) => {
      changedListeners.add(listener);
      return () => changedListeners.delete(listener);
    },
    onChatsChanged: (listener) => {
      chatListeners.add(listener);
      return () => chatListeners.delete(listener);
    },
    onActivityChanged: (listener) => {
      activityListeners.add(listener);
      return () => activityListeners.delete(listener);
    },
  };
}
