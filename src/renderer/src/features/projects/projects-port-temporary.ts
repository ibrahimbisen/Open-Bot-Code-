import { isKnownAgentProvider } from "@codebot/contracts/agent-providers";
import {
  type AgentTask,
  type ClientAgentSummary,
  DEFAULT_PROJECT_ACCESS_LEVEL,
  isAvatarColor,
  isProjectAccessLevel,
  isProjectRuntime,
  type ProjectRuntime,
  type ProjectSummary,
  SIDEBAR_UNASSIGNED_SECTION_ID,
  type SidebarLayoutSnapshot,
  type UpdateAgentInput,
} from "@codebot/contracts/ipc";
import { isDynamicRecord, isString } from "@codebot/contracts/runtime-values";
import type { AgentProfile } from "@codebot/ui/data";
import { createEffect, createMemo, createSignal, untrack } from "solid-js";
import type { AgentTasks } from "../agent-tasks/agent-tasks-state";
import { projectActivityOf } from "./project-activity";
import {
  type ProjectActivity,
  type ProjectAgent,
  type ProjectAgentDraft,
  type ProjectChat,
  type ProjectChatRef,
  type ProjectsChangeEvent,
  type ProjectsPort,
  projectChatKey,
} from "./projects-port";

const STORAGE_KEY = "codebot:projects-temporary:v1";
const DERIVED_CREATED_AT = Date.UTC(2000, 0, 1);

type ProjectSource = "created" | "section" | "agent";

interface StoredProject extends ProjectSummary {
  source: ProjectSource;
  sourceId: string | null;
}

interface StoredChatFlags {
  pinned?: boolean;
  runtime?: ProjectRuntime;
}

interface StoredState {
  projects: StoredProject[];
  chats: Record<string, StoredChatFlags>;
}

export interface TemporaryProjectsDeps {
  serverId: string;
  agents: () => readonly AgentProfile[];
  agentsSettled: () => boolean;
  sidebarLayout: () => SidebarLayoutSnapshot;
  tasks: AgentTasks;
  hiddenChatIds: () => ReadonlySet<string>;
  reloadKey: () => unknown;
  waitsForInput: (task: AgentTask) => boolean;
  seen: (task: AgentTask) => boolean;
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
  const source = value.source === "section" || value.source === "agent" ? value.source : "created";
  return {
    id: value.id,
    source,
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
    createdAt: isString(value.createdAt) ? value.createdAt : new Date().toISOString(),
    updatedAt: isString(value.updatedAt) ? value.updatedAt : new Date().toISOString(),
    archivedAt: isString(value.archivedAt) ? value.archivedAt : null,
  };
}

function storedChatFlags(value: unknown): StoredChatFlags | null {
  if (!isDynamicRecord(value)) return null;
  const flags: StoredChatFlags = {};
  if (value.pinned === true) flags.pinned = true;
  if (isProjectRuntime(value.runtime)) flags.runtime = value.runtime;
  return flags.pinned || flags.runtime ? flags : null;
}

function storedStateOf(all: unknown, serverId: string): StoredState {
  const stored = isDynamicRecord(all) ? all[serverId] : undefined;
  if (!isDynamicRecord(stored)) return { projects: [], chats: {} };
  const projects = Array.isArray(stored.projects)
    ? stored.projects.flatMap((entry) => {
        const project = storedProject(entry);
        return project ? [project] : [];
      })
    : [];
  const chats: Record<string, StoredChatFlags> = {};
  if (isDynamicRecord(stored.chats))
    for (const [key, value] of Object.entries(stored.chats)) {
      const flags = storedChatFlags(value);
      if (flags) chats[key] = flags;
    }
  return { projects, chats };
}

function readStoredState(serverId: string): StoredState {
  try {
    return storedStateOf(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}"), serverId);
  } catch {
    return { projects: [], chats: {} };
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

function agentRuntime(agent: AgentProfile): ProjectRuntime | null {
  if (!isKnownAgentProvider(agent.provider)) return null;
  return {
    provider: agent.provider,
    model: agent.model,
    reasoningEffort: agent.reasoningEffort,
    ...(agent.providerAccountId ? { providerAccountId: agent.providerAccountId } : {}),
  };
}

function runtimeUpdate(runtime: ProjectRuntime): Omit<UpdateAgentInput, "agentId"> {
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

function newestFirst(left: AgentTask, right: AgentTask): number {
  return right.updatedAt.localeCompare(left.updatedAt) || left.id.localeCompare(right.id);
}

export function createTemporaryProjectsPort(deps: TemporaryProjectsDeps): ProjectsPort {
  const { serverId, tasks } = deps;
  const agentApi = () => window.codebot.agent;
  const [state, setState] = createSignal<StoredState>(readStoredState(serverId));
  const [reserved, setReserved] = createSignal<ReadonlySet<string>>(new Set());
  const listeners = new Set<(event: ProjectsChangeEvent) => void>();

  function emit(event: ProjectsChangeEvent): void {
    for (const listener of [...listeners]) listener(event);
  }

  function save(update: (current: StoredState) => StoredState): void {
    const next = update(untrack(state));
    writeStoredState(serverId, next);
    setState(next);
  }

  const projects = createMemo((): StoredProject[] => {
    const agents = deps.agents();
    const known = new Set(agents.map((agent) => agent.id));
    const layout = deps.sidebarLayout();
    const sections = new Map(layout.sections.map((section) => [section.id, section]));
    const sectionOf = (agentId: string): string | null => {
      const sectionId = layout.agentAssignments[agentId];
      return sectionId && sectionId !== SIDEBAR_UNASSIGNED_SECTION_ID && sections.has(sectionId) ? sectionId : null;
    };
    const stored = state().projects;
    const claimed = new Set([...stored.flatMap((project) => project.agentIds), ...reserved()]);
    const free = agents.filter((agent) => !claimed.has(agent.id));
    const bySection = new Map<string, AgentProfile[]>();
    const single: AgentProfile[] = [];
    for (const agent of free) {
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
    const derivedAt = new Date(DERIVED_CREATED_AT).toISOString();
    const derived = (
      source: ProjectSource,
      sourceId: string,
      name: string,
      members: readonly AgentProfile[],
    ): StoredProject => {
      const first = members[0];
      return {
        id: `${source}:${sourceId}`,
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
        createdAt: derivedAt,
        updatedAt: derivedAt,
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

  function change(projectId: string, update: (current: StoredProject) => StoredProject): ProjectSummary {
    const current = project(projectId);
    const next = { ...update(current), updatedAt: new Date().toISOString() };
    save((stored) => ({
      ...stored,
      projects: stored.projects.some((entry) => entry.id === projectId)
        ? stored.projects.map((entry) => (entry.id === projectId ? next : entry))
        : [...stored.projects, next],
    }));
    return summaryOf(next);
  }

  function projectTasks(entry: StoredProject): AgentTask[] {
    const hidden = deps.hiddenChatIds();
    return entry.agentIds.flatMap((agentId) =>
      (tasks.snapshot(agentId)?.tasks ?? []).filter((task) => !hidden.has(task.id)),
    );
  }

  function chatOf(entry: StoredProject, task: AgentTask): ProjectChat {
    const flags = state().chats[projectChatKey({ agentId: task.agentId, chatId: task.id })];
    return {
      projectId: entry.id,
      agentId: task.agentId,
      chatId: task.id,
      task,
      archived: task.state === "closed",
      pinned: flags?.pinned === true,
      runtime: flags?.runtime ?? null,
    };
  }

  function setChatFlags(ref: ProjectChatRef, update: (flags: StoredChatFlags) => StoredChatFlags): void {
    const key = projectChatKey(ref);
    save((stored) => {
      const next = update(stored.chats[key] ?? {});
      const chats = { ...stored.chats };
      if (next.pinned || next.runtime) chats[key] = next;
      else delete chats[key];
      return { ...stored, chats };
    });
    emit({ type: "chats-changed", projectId: ref.projectId });
  }

  async function loadMissingTasks(agentIds: readonly string[]): Promise<void> {
    await Promise.all(
      agentIds.filter((agentId) => !tasks.snapshot(agentId)).map((agentId) => tasks.loadTasks(agentId)),
    );
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
    projectName: string,
    draft: ProjectAgentDraft,
    fallback: ProjectRuntime | null,
    folders: readonly string[],
    color: ProjectSummary["color"],
  ): Promise<string> {
    const role = draft.role.trim();
    const runtime = draft.runtime ?? fallback;
    const created = await agentApi().createAgent(
      {
        name: draft.name.trim() || role,
        description: role,
        avatarSeed: crypto.randomUUID(),
        avatarHue: null,
        avatarColor: color,
        initialMessage: `You are the ${role} of the project "${projectName}". Wait for the first chat.`,
        ...(runtime
          ? {
              provider: runtime.provider,
              model: runtime.model,
              reasoningEffort: runtime.reasoningEffort,
              ...(runtime.providerAccountId ? { providerAccountId: runtime.providerAccountId } : {}),
            }
          : {}),
      },
      serverId,
    );
    setReserved((current) => new Set(current).add(created.id));
    deps.addAgent(created);
    await deps.updateAgent(created.id, { title: role });
    await addFolders(created.id, folders);
    if (draft.instructions.trim()) await saveInstructions(created.id, draft.instructions);
    return created.id;
  }

  function release(agentId: string): void {
    setReserved((current) => {
      const next = new Set(current);
      next.delete(agentId);
      return next;
    });
  }

  createEffect(
    () =>
      JSON.stringify(
        projects().map((entry) => [
          entry.id,
          entry.name,
          entry.color,
          entry.mainFolder,
          entry.additionalFolders,
          entry.accessLevel,
          entry.defaultRuntime,
          entry.replyRule,
          entry.instructions,
          entry.agentIds,
          entry.archivedAt,
        ]),
      ),
    (_signature, previous) => {
      if (previous !== undefined) emit({ type: "projects-changed" });
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

  const chatSignatures = createMemo(() => {
    const flags = state().chats;
    return new Map(
      projects().map((entry) => [
        entry.id,
        JSON.stringify(
          projectTasks(entry).map((task) => [
            task.id,
            task.title,
            task.state,
            task.outcome,
            task.updatedAt,
            flags[projectChatKey({ agentId: task.agentId, chatId: task.id })] ?? null,
          ]),
        ),
      ]),
    );
  });
  createEffect(chatSignatures, (next, previous) => {
    if (!previous) return;
    for (const [projectId, signature] of next)
      if (previous.get(projectId) !== signature) emit({ type: "chats-changed", projectId });
  });

  const activities = createMemo(
    (): Record<string, ProjectActivity> =>
      Object.fromEntries(
        projects().map((entry) => [
          entry.id,
          projectActivityOf({
            tasks: projectTasks(entry),
            waitsForInput: deps.waitsForInput,
            unread: tasks.unreadCount,
            seen: deps.seen,
          }),
        ]),
      ),
  );
  createEffect(
    () => JSON.stringify(activities()),
    (_signature, previous) => {
      if (previous !== undefined) emit({ type: "activity-changed" });
    },
  );

  return {
    list: async () => untrack(projects).map(summaryOf),

    create: async (input) => {
      const now = new Date().toISOString();
      const folders = [input.mainFolder, ...input.additionalFolders];
      const agentId = await createProjectAgent(
        input.name,
        input.firstAgent,
        input.defaultRuntime,
        folders,
        input.color,
      );
      const created: StoredProject = {
        id: `project:${crypto.randomUUID()}`,
        source: "created",
        sourceId: null,
        name: input.name.trim(),
        color: input.color,
        mainFolder: input.mainFolder,
        additionalFolders: input.additionalFolders.filter((folder) => folder !== input.mainFolder),
        accessLevel: input.accessLevel,
        defaultRuntime: input.defaultRuntime,
        replyRule: null,
        instructions: "",
        agentIds: [agentId],
        ownerId: null,
        createdAt: now,
        updatedAt: now,
        archivedAt: null,
      };
      save((stored) => ({ ...stored, projects: [...stored.projects, created] }));
      release(agentId);
      return summaryOf(created);
    },

    update: async (input) => {
      const current = project(input.projectId);
      if (input.mainFolder !== undefined && input.mainFolder !== current.mainFolder)
        for (const agentId of current.agentIds) await addFolders(agentId, [input.mainFolder]);
      return change(input.projectId, (entry) => ({
        ...entry,
        ...(input.name === undefined ? {} : { name: input.name.trim() }),
        ...(input.color === undefined ? {} : { color: input.color }),
        ...(input.mainFolder === undefined ? {} : { mainFolder: input.mainFolder }),
        ...(input.accessLevel === undefined ? {} : { accessLevel: input.accessLevel }),
        ...(input.defaultRuntime === undefined ? {} : { defaultRuntime: input.defaultRuntime }),
        ...(input.replyRule === undefined ? {} : { replyRule: input.replyRule }),
        ...(input.instructions === undefined ? {} : { instructions: input.instructions }),
      }));
    },

    setArchived: async ({ projectId, archived }) =>
      change(projectId, (entry) => ({ ...entry, archivedAt: archived ? new Date().toISOString() : null })),

    remove: async (projectId) => {
      const current = project(projectId);
      for (const agentId of current.agentIds) await deps.deleteAgent(agentId);
      save((stored) => ({
        projects: stored.projects.filter((entry) => entry.id !== projectId),
        chats: Object.fromEntries(
          Object.entries(stored.chats).filter(
            ([key]) => !current.agentIds.some((agentId) => key.startsWith(`${agentId}\u0000`)),
          ),
        ),
      }));
    },

    chooseFolder: () => window.codebot.hostedSites.chooseDirectory(),

    addFolder: async ({ projectId, folder }) => {
      const current = project(projectId);
      for (const agentId of current.agentIds) await addFolders(agentId, [folder]);
      return change(projectId, (entry) => ({
        ...entry,
        additionalFolders:
          folder === entry.mainFolder || entry.additionalFolders.includes(folder)
            ? entry.additionalFolders
            : [...entry.additionalFolders, folder],
      }));
    },

    removeFolder: async ({ projectId, folder }) => {
      const current = project(projectId);
      for (const agentId of current.agentIds) await agentApi().removeAgentFolder({ agentId, path: folder }, serverId);
      return change(projectId, (entry) => ({
        ...entry,
        additionalFolders: entry.additionalFolders.filter((path) => path !== folder),
      }));
    },

    listAgents: async (projectId) => {
      const current = project(projectId);
      const agents = untrack(deps.agents);
      return Promise.all(
        current.agentIds.flatMap((agentId) => {
          const agent = agents.find((entry) => entry.id === agentId);
          if (!agent) return [];
          return [
            agentApi()
              .readAgentInstructions(agentId, serverId)
              .then(
                (file) => file.text,
                () => "",
              )
              .then(
                (instructions): ProjectAgent => ({
                  id: agent.id,
                  projectId,
                  name: agent.name,
                  role: agent.title || agent.name,
                  instructions,
                  runtime: agentRuntime(agent),
                }),
              ),
          ];
        }),
      );
    },

    createAgent: async (input) => {
      const current = project(input.projectId);
      const agentId = await createProjectAgent(
        current.name,
        input,
        current.defaultRuntime,
        [current.mainFolder, ...current.additionalFolders],
        current.color,
      );
      const next = change(input.projectId, (entry) => ({ ...entry, agentIds: [...entry.agentIds, agentId] }));
      release(agentId);
      return next;
    },

    updateAgent: async (input) => {
      const updates: Omit<UpdateAgentInput, "agentId"> = {
        ...(input.name === undefined ? {} : { name: input.name.trim() }),
        ...(input.role === undefined ? {} : { title: input.role.trim() }),
        ...(input.runtime ? runtimeUpdate(input.runtime) : {}),
      };
      if (Object.keys(updates).length > 0) await deps.updateAgent(input.agentId, updates);
      if (input.instructions !== undefined) await saveInstructions(input.agentId, input.instructions);
    },

    removeAgent: async ({ projectId, agentId }) => {
      await deps.deleteAgent(agentId);
      return change(projectId, (entry) => ({ ...entry, agentIds: entry.agentIds.filter((id) => id !== agentId) }));
    },

    listChats: async ({ projectId, archived, limit }) => {
      const current = project(projectId);
      await loadMissingTasks(current.agentIds);
      const all = untrack(() => projectTasks(project(projectId)))
        .filter((task) => (task.state === "closed") === archived)
        .sort(newestFirst);
      let older = false;
      if (archived && all.length < limit)
        for (const agentId of current.agentIds) {
          const more = untrack(() => tasks.olderArchived(agentId));
          if (!more) continue;
          older = true;
          if (!more.loading) tasks.loadArchivedPage(agentId);
        }
      return {
        chats: untrack(() => all.slice(0, limit).map((task) => chatOf(current, task))),
        hasMore: older || all.length > limit,
      };
    },

    searchChats: async ({ projectId, query, limit }) => {
      const text = query.trim().toLowerCase();
      const scope = untrack(projects).filter((entry) =>
        projectId === null ? entry.archivedAt === null : entry.id === projectId,
      );
      await loadMissingTasks(scope.flatMap((entry) => entry.agentIds));
      return untrack(() =>
        scope
          .flatMap((entry) => projectTasks(entry).map((task) => chatOf(entry, task)))
          .filter((chat) => !text || chat.task.title.toLowerCase().includes(text))
          .sort((left, right) => newestFirst(left.task, right.task))
          .slice(0, limit),
      );
    },

    startChat: async (input) => {
      const current = project(input.projectId);
      const task = await agentApi().startTask(
        {
          agentId: input.agentId,
          text: input.text,
          ...(input.attachmentDraftIds.length ? { attachmentDraftIds: input.attachmentDraftIds } : {}),
          clientMessageId: crypto.randomUUID(),
        },
        serverId,
      );
      await tasks.loadTasks(input.agentId);
      const ref = { projectId: input.projectId, agentId: input.agentId, chatId: task.id };
      if (input.runtime)
        setChatFlags(ref, (flags) => ({ ...flags, ...(input.runtime ? { runtime: input.runtime } : {}) }));
      return untrack(() => chatOf(current, task));
    },

    setChatArchived: async ({ agentId, chatId, archived }) => {
      if (archived) await agentApi().closeTask({ agentId, taskId: chatId }, serverId);
      else await agentApi().reopenTask({ agentId, taskId: chatId }, serverId);
    },

    setChatPinned: async (input) => {
      setChatFlags(input, (flags) => {
        const { pinned: _pinned, ...rest } = flags;
        return input.pinned ? { ...rest, pinned: true } : rest;
      });
    },

    setChatRuntime: async (input) => {
      setChatFlags(input, (flags) => {
        const { runtime: _runtime, ...rest } = flags;
        return input.runtime ? { ...rest, runtime: input.runtime } : rest;
      });
    },

    activity: async () => untrack(activities),

    onChange: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
