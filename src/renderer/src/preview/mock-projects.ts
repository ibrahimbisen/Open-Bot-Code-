import { INPUT_LIMITS } from "@codebot/contracts/input-limits";
import {
  type AgentTask,
  type AvatarColor,
  type ClientAgentSummary,
  type CodeBotDesktopApi,
  type ConversationSnapshot,
  DEFAULT_PROJECT_ACCESS_LEVEL,
  emptyProjectActivity,
  folderInside,
  isAgentProvider,
  LOCAL_SERVER_ID,
  PROJECT_LIMITS,
  type ProjectAccessLevel,
  type ProjectActivity,
  type ProjectActivityChangedEvent,
  type ProjectActivityState,
  type ProjectAgent,
  type ProjectAgentInput,
  type ProjectChat,
  type ProjectChatMatch,
  type ProjectChatsChangedEvent,
  type ProjectDetail,
  type ProjectFolderChange,
  type ProjectRuntime,
  type ProjectSummary,
  type ProjectsChangedEvent,
  projectActivityState,
  projectFolders,
} from "@codebot/contracts/ipc";
import { type SourceMessages, sourceText } from "@codebot/i18n/source";
import { clone, type Listener, type MockRuntime } from "./mock-support";

export interface MockProjectAgentSeed {
  id: string;
  name: string;
  role: string;
  instructions?: string;
}

export interface MockProjectChatSeed {
  agentId: string;
  title: string;
  minutesAgo: number;
  messages?: { author: "user" | "assistant"; text: string }[];
  running?: boolean;
  unread?: number;
  failed?: string;
  needsInput?: boolean;
  archived?: boolean;
  pinned?: boolean;
}

export interface MockProjectSeed {
  id: string;
  name: string;
  color?: AvatarColor | null;
  mainFolder: string;
  additionalFolders?: string[];
  accessLevel?: ProjectAccessLevel;
  instructions?: string;
  replyRule?: string | null;
  archived?: boolean;
  agents: MockProjectAgentSeed[];
  chats?: MockProjectChatSeed[];
}

export const MOCK_PROJECT_SEEDS: MockProjectSeed[] = [
  {
    id: "mock-project-shop",
    name: "Web shop",
    color: "#3b82f6",
    mainFolder: "/Users/demo/Projects/web-shop",
    additionalFolders: ["/Users/demo/Projects/design-tokens"],
    instructions: "Use TypeScript. Run the tests before you report a change.",
    agents: [
      { id: "mock-project-shop-frontend", name: "Ada", role: "Frontend", instructions: "You own src/web." },
      { id: "mock-project-shop-backend", name: "Linus", role: "Backend", instructions: "You own src/api." },
      { id: "mock-project-shop-review", name: "Grace", role: "Reviewer" },
    ],
    chats: [
      {
        agentId: "mock-project-shop-frontend",
        title: "Fix the cart badge count",
        minutesAgo: 4,
        running: true,
        messages: [{ author: "user", text: "Fix the cart badge count" }],
      },
      {
        agentId: "mock-project-shop-backend",
        title: "Add the order export endpoint",
        minutesAgo: 35,
        unread: 1,
        pinned: true,
        messages: [
          { author: "user", text: "Add the order export endpoint" },
          { author: "assistant", text: "Done. GET /orders/export returns CSV. 4 tests added." },
        ],
      },
      {
        agentId: "mock-project-shop-review",
        title: "Review the checkout refactor",
        minutesAgo: 190,
        needsInput: true,
        messages: [{ author: "user", text: "Review the checkout refactor" }],
      },
      {
        agentId: "mock-project-shop-frontend",
        title: "Rename the theme variables",
        minutesAgo: 2_900,
        archived: true,
        messages: [
          { author: "user", text: "Rename the theme variables" },
          { author: "assistant", text: "Renamed 42 variables in 9 files." },
        ],
      },
    ],
  },
  {
    id: "mock-project-firmware",
    name: "Sensor firmware",
    color: "#f59e0b",
    mainFolder: "/Users/demo/Projects/sensor-firmware",
    accessLevel: "strict",
    agents: [{ id: "mock-project-firmware-dev", name: "Dennis", role: "Firmware" }],
    chats: [
      {
        agentId: "mock-project-firmware-dev",
        title: "Find the I2C timeout",
        minutesAgo: 12,
        failed: "The provider stopped before it answered.",
        messages: [{ author: "user", text: "Find the I2C timeout" }],
      },
    ],
  },
  {
    id: "mock-project-docs",
    name: "Product documents",
    color: "#10b981",
    mainFolder: "/Users/demo/Documents/product-docs",
    accessLevel: "open",
    agents: [{ id: "mock-project-docs-writer", name: "Mary", role: "Writer" }],
  },
];

interface ChatFlags {
  archived: boolean;
  pinned: boolean;
  needsInput: boolean;
  failureUnseen: boolean;
}

export interface MockProjectsHost {
  runtime: MockRuntime;
  agents: () => ClientAgentSummary[];
  setAgents: (agents: ClientAgentSummary[]) => void;
  newAgent: (fields: Partial<ClientAgentSummary>) => ClientAgentSummary;
  tasks: (agentId: string) => AgentTask[];
  setTasks: (agentId: string, tasks: AgentTask[]) => void;
  newTask: (agentId: string, title: string) => AgentTask;
  runTurn: (task: AgentTask, text: string) => void;
  conversation: (task: AgentTask) => ConversationSnapshot;
  unread: (taskId: string) => number;
  setUnread: (taskId: string, count: number) => void;
  emitTasks: (agentId: string) => void;
  onTasksChanged: (listener: (agentId: string) => void) => void;
}

export interface MockProjects {
  api: CodeBotDesktopApi["projects"];
  beforeSend: (agentId: string, taskId: string) => void;
  taskRead: (agentId: string, taskId: string) => void;
}

type ProjectErrorKey = Exclude<
  Extract<keyof SourceMessages, `error.project.${string}`>,
  "error.project.limit" | "error.project.agentLimit"
>;

function fail(key: ProjectErrorKey): never {
  throw new Error(sourceText(key));
}

function encodeCursor(offset: number): string {
  return `offset:${offset}`;
}

function decodeCursor(cursor: string | undefined): number {
  const offset = cursor?.startsWith("offset:") ? Number(cursor.slice(7)) : 0;
  return Number.isSafeInteger(offset) && offset >= 0 ? offset : 0;
}

export function createMockProjects(seeds: readonly MockProjectSeed[], host: MockProjectsHost): MockProjects {
  const projects = new Map<string, ProjectSummary>();
  const agentInstructions = new Map<string, string>();
  const flags = new Map<string, ChatFlags>();
  const known = new Map<string, { agentId: string; state: AgentTask["state"] }>();
  const changedListeners = new Set<Listener<ProjectsChangedEvent>>();
  const chatListeners = new Set<Listener<ProjectChatsChangedEvent>>();
  const activityListeners = new Set<Listener<ProjectActivityChangedEvent>>();
  let lastActivity = "";
  let counter = 0;

  const flagsOf = (taskId: string): ChatFlags => {
    const existing = flags.get(taskId);
    if (existing) return existing;
    const created = { archived: false, pinned: false, needsInput: false, failureUnseen: false };
    flags.set(taskId, created);
    return created;
  };

  const requireProject = (projectId: string): ProjectSummary =>
    projects.get(projectId) ?? fail("error.project.notFound");

  const projectOfAgent = (agentId: string): ProjectSummary | null =>
    [...projects.values()].find((project) => project.agentIds.includes(agentId)) ?? null;

  const runtimeOf = (agent: ClientAgentSummary): ProjectRuntime => ({
    provider: isAgentProvider(agent.provider) ? agent.provider : "codex",
    model: agent.model,
    reasoningEffort: agent.reasoningEffort,
    ...(agent.providerAccountId === undefined ? {} : { providerAccountId: agent.providerAccountId }),
  });

  function chatActivity(task: AgentTask): ProjectActivityState {
    const chat = flagsOf(task.id);
    if (chat.archived) return "idle";
    if (chat.needsInput) return "needs-input";
    if (task.state === "running" || task.state === "queued") return "working";
    if (task.outcome === "failed" && chat.failureUnseen) return "error";
    return host.unread(task.id) > 0 ? "done" : "idle";
  }

  function chatOf(project: ProjectSummary, task: AgentTask): ProjectChat {
    const chat = flagsOf(task.id);
    return {
      projectId: project.id,
      agentId: task.agentId,
      taskId: task.id,
      threadId: task.threadId,
      title: task.title,
      state: task.state === "closed" ? "idle" : task.state,
      activity: chatActivity(task),
      hold: task.hold,
      error: task.outcome === "failed" ? task.error : null,
      unreadCount: host.unread(task.id),
      archived: chat.archived,
      pinned: chat.pinned,
      runtime: null,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }

  function chatsOf(project: ProjectSummary): ProjectChat[] {
    return project.agentIds
      .flatMap((agentId) => host.tasks(agentId))
      .map((task) => chatOf(project, task))
      .sort(
        (left, right) =>
          Number(right.pinned) - Number(left.pinned) ||
          right.updatedAt.localeCompare(left.updatedAt) ||
          left.threadId.localeCompare(right.threadId),
      );
  }

  function findChat(agentId: string, taskId: string): { project: ProjectSummary; task: AgentTask } {
    const project = projectOfAgent(agentId);
    const task = host.tasks(agentId).find((candidate) => candidate.id === taskId);
    if (!project || !task) return fail("error.project.chatNotFound");
    return { project, task };
  }

  function activity(): ProjectActivity[] {
    return [...projects.values()].map((project) => {
      const states = chatsOf(project).map((chat) => chat.activity);
      const count = (state: ProjectActivityState) => states.filter((candidate) => candidate === state).length;
      return {
        ...emptyProjectActivity(project.id),
        state: projectActivityState(states),
        working: count("working"),
        done: count("done"),
        needsInput: count("needs-input"),
        error: count("error"),
      };
    });
  }

  function emitActivity(): void {
    const next = activity();
    const key = JSON.stringify(next);
    if (key === lastActivity) return;
    lastActivity = key;
    host.runtime.emit(activityListeners, { serverId: LOCAL_SERVER_ID, activity: next });
  }

  function emitProjects(projectId: string | null): void {
    host.runtime.emit(changedListeners, {
      serverId: LOCAL_SERVER_ID,
      projectId,
      projects: [...projects.values()],
    });
    emitActivity();
  }

  function emitChats(project: ProjectSummary, tasks: readonly AgentTask[], removedTaskIds: string[] = []): void {
    if (tasks.length + removedTaskIds.length > 0)
      host.runtime.emit(chatListeners, {
        serverId: LOCAL_SERVER_ID,
        projectId: project.id,
        chats: tasks.slice(0, PROJECT_LIMITS.chatsPage).map((task) => chatOf(project, task)),
        removedTaskIds: removedTaskIds.slice(0, PROJECT_LIMITS.chatsPage),
      });
    emitActivity();
  }

  function detail(project: ProjectSummary): ProjectDetail {
    const agents = host.agents();
    return clone({
      project,
      agents: project.agentIds.flatMap((agentId): ProjectAgent[] => {
        const agent = agents.find((candidate) => candidate.id === agentId);
        if (!agent) return [];
        return [
          {
            id: agent.id,
            projectId: project.id,
            name: agent.name,
            role: agent.title,
            instructions: agentInstructions.get(agent.id) ?? "",
            runtime: runtimeOf(agent),
            avatarSeed: agent.avatarSeed,
            avatarHue: agent.avatarHue,
            avatarColor: agent.avatarColor ?? null,
            chatCount: host.tasks(agent.id).length,
          },
        ];
      }),
      folders: projectFolders(project).map((path) => ({ path, main: path === project.mainFolder, found: true })),
    });
  }

  function touch(project: ProjectSummary, change: Partial<ProjectSummary>): ProjectSummary {
    const next = { ...project, ...change, updatedAt: new Date().toISOString() };
    projects.set(project.id, next);
    return next;
  }

  function addAgent(project: ProjectSummary, input: ProjectAgentInput, id?: string): ProjectSummary {
    if (project.agentIds.length >= PROJECT_LIMITS.agents)
      throw new Error(sourceText("error.project.agentLimit", { limit: PROJECT_LIMITS.agents }));
    const runtime = input.runtime ?? project.defaultRuntime;
    const agent = host.newAgent({
      ...(id === undefined ? {} : { id }),
      name: input.name,
      title: input.role,
      description: "",
      ...(runtime
        ? { provider: runtime.provider, model: runtime.model, reasoningEffort: runtime.reasoningEffort }
        : {}),
      ...(runtime?.providerAccountId === undefined ? {} : { providerAccountId: runtime.providerAccountId }),
      access: project.accessLevel === "open" ? "full" : "workspace",
      projectId: project.id,
    });
    agentInstructions.set(agent.id, input.instructions ?? "");
    host.setAgents([...host.agents(), agent]);
    return touch(project, { agentIds: [...project.agentIds, agent.id] });
  }

  function removeAgents(agentIds: readonly string[]): void {
    const removed = new Set(agentIds);
    for (const agentId of agentIds) {
      for (const task of host.tasks(agentId)) {
        flags.delete(task.id);
        known.delete(task.id);
      }
      host.setTasks(agentId, []);
      agentInstructions.delete(agentId);
    }
    host.setAgents(host.agents().filter((agent) => !removed.has(agent.id)));
  }

  function folderChange(project: ProjectSummary, path: string): ProjectFolderChange {
    const listed = projectFolders(project);
    const covering = listed.find((folder) => folderInside(folder, path));
    if (covering) return { outcome: "covered", path, folder: covering, detail: detail(project) };
    if (folderInside(path, project.mainFolder))
      return { outcome: "refused", path, refusal: "contains-main", detail: detail(project) };
    if (/^([a-zA-Z]:)?[\\/]?$/u.test(path))
      return { outcome: "refused", path, refusal: "protected", detail: detail(project) };
    const kept = project.additionalFolders.filter((folder) => !folderInside(path, folder));
    if (kept.length >= PROJECT_LIMITS.folders)
      return { outcome: "refused", path, refusal: "limit", detail: detail(project) };
    const replaced = project.additionalFolders.filter((folder) => !kept.includes(folder));
    const next = touch(project, { additionalFolders: [...kept, path] });
    emitProjects(next.id);
    return { outcome: "added", path, replaced, detail: detail(next) };
  }

  for (const seed of seeds) {
    const now = new Date().toISOString();
    let project: ProjectSummary = {
      id: seed.id,
      name: seed.name,
      color: seed.color ?? null,
      mainFolder: seed.mainFolder,
      additionalFolders: [...(seed.additionalFolders ?? [])],
      accessLevel: seed.accessLevel ?? DEFAULT_PROJECT_ACCESS_LEVEL,
      defaultRuntime: null,
      replyRule: seed.replyRule ?? null,
      instructions: seed.instructions ?? "",
      agentIds: [],
      ownerId: null,
      createdAt: now,
      updatedAt: now,
      archivedAt: seed.archived ? now : null,
    };
    projects.set(project.id, project);
    for (const agent of seed.agents)
      project = addAgent(
        project,
        { name: agent.name, role: agent.role, ...(agent.instructions ? { instructions: agent.instructions } : {}) },
        agent.id,
      );
    for (const chat of seed.chats ?? []) {
      const at = new Date(Date.now() - chat.minutesAgo * 60_000).toISOString();
      const task = host.newTask(chat.agentId, chat.title);
      const conversation = host.conversation(task);
      conversation.messages = (chat.messages ?? []).map((message, index) => ({
        id: `${task.id}-seed-${index}`,
        author: message.author,
        source: message.author,
        text: message.text,
        createdAt: at,
        status: "completed",
      }));
      Object.assign(task, {
        createdAt: at,
        updatedAt: at,
        state: chat.archived ? "closed" : chat.running ? "running" : "idle",
        closedAt: chat.archived ? at : null,
        activeTurnId: chat.running ? `${task.id}-turn` : null,
        outcome: chat.failed ? "failed" : chat.running ? null : "completed",
        error: chat.failed ?? null,
      });
      if (chat.running) conversation.activeTurnId = `${task.id}-turn`;
      if (chat.unread) host.setUnread(task.id, chat.unread);
      Object.assign(flagsOf(task.id), {
        archived: chat.archived === true,
        pinned: chat.pinned === true,
        needsInput: chat.needsInput === true,
        failureUnseen: chat.failed !== undefined,
      });
      known.set(task.id, { agentId: task.agentId, state: task.state });
    }
  }
  lastActivity = JSON.stringify(activity());

  host.onTasksChanged((agentId) => {
    const project = projectOfAgent(agentId);
    if (!project) return;
    const tasks = host.tasks(agentId);
    const present = new Set(tasks.map((task) => task.id));
    const removed = [...known]
      .filter(([taskId, entry]) => entry.agentId === agentId && !present.has(taskId))
      .map(([taskId]) => taskId);
    for (const task of tasks) {
      const before = known.get(task.id)?.state;
      const chat = flagsOf(task.id);
      if (before === "running" && task.state === "idle") {
        chat.needsInput = false;
        if (task.outcome === "completed") host.setUnread(task.id, host.unread(task.id) + 1);
        chat.failureUnseen = task.outcome === "failed";
      }
      if (task.state !== "closed" && before === "closed") chat.archived = false;
      known.set(task.id, { agentId, state: task.state });
    }
    for (const taskId of removed) {
      flags.delete(taskId);
      known.delete(taskId);
    }
    emitChats(project, tasks, removed);
  });

  const api: CodeBotDesktopApi["projects"] = {
    list: async () => clone([...projects.values()]),
    get: async (projectId) => detail(requireProject(projectId)),
    create: async (input) => {
      if (projects.size >= PROJECT_LIMITS.projects)
        throw new Error(sourceText("error.project.limit", { limit: PROJECT_LIMITS.projects }));
      if (!input.name.trim()) fail("error.project.nameRequired");
      const now = new Date().toISOString();
      counter += 1;
      let project: ProjectSummary = {
        id: `mock-project-${Date.now()}-${counter}`,
        name: input.name.trim(),
        color: input.color ?? null,
        mainFolder: input.mainFolder,
        additionalFolders: (input.additionalFolders ?? []).filter(
          (folder, index, all) => !folderInside(input.mainFolder, folder) && all.indexOf(folder) === index,
        ),
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
      projects.set(project.id, project);
      const agents = input.agents?.length ? input.agents : [{ name: project.name, role: "" }];
      for (const agent of agents) project = addAgent(project, agent);
      emitProjects(project.id);
      return detail(project);
    },
    update: async (input) => {
      const { projectId, ...change } = input;
      const project = touch(requireProject(projectId), change);
      if (change.accessLevel !== undefined)
        host.setAgents(
          host
            .agents()
            .map((agent) =>
              project.agentIds.includes(agent.id)
                ? { ...agent, access: project.accessLevel === "open" ? "full" : "workspace" }
                : agent,
            ),
        );
      emitProjects(project.id);
      return detail(project);
    },
    archive: async (projectId) => {
      const project = touch(requireProject(projectId), { archivedAt: new Date().toISOString() });
      emitProjects(project.id);
      return clone(project);
    },
    restore: async (projectId) => {
      const project = touch(requireProject(projectId), { archivedAt: null });
      emitProjects(project.id);
      return clone(project);
    },
    delete: async (projectId) => {
      const project = requireProject(projectId);
      projects.delete(projectId);
      removeAgents(project.agentIds);
      emitProjects(null);
    },
    chooseFolder: async () => {
      counter += 1;
      return { outcome: "chosen", path: `/Users/demo/Projects/project-${counter}` };
    },
    addFolder: async ({ projectId, path }) => folderChange(requireProject(projectId), path),
    removeFolder: async ({ projectId, path }) => {
      const project = requireProject(projectId);
      if (path === project.mainFolder) return { outcome: "refused", path, refusal: "main", detail: detail(project) };
      const next = touch(project, {
        additionalFolders: project.additionalFolders.filter((folder) => folder !== path),
      });
      emitProjects(next.id);
      return { outcome: "removed", path, detail: detail(next) };
    },
    createAgent: async ({ projectId, ...input }) => {
      const project = addAgent(requireProject(projectId), input);
      emitProjects(project.id);
      return detail(project);
    },
    updateAgent: async (input) => {
      const project = requireProject(input.projectId);
      if (!project.agentIds.includes(input.agentId)) fail("error.project.agentNotFound");
      if (input.instructions !== undefined) agentInstructions.set(input.agentId, input.instructions);
      host.setAgents(
        host.agents().map((agent) =>
          agent.id === input.agentId
            ? {
                ...agent,
                ...(input.name === undefined ? {} : { name: input.name }),
                ...(input.role === undefined ? {} : { title: input.role }),
                ...(input.runtime === undefined
                  ? {}
                  : {
                      provider: input.runtime.provider,
                      model: input.runtime.model,
                      reasoningEffort: input.runtime.reasoningEffort,
                    }),
              }
            : agent,
        ),
      );
      const next = touch(project, {});
      emitProjects(next.id);
      return detail(next);
    },
    removeAgent: async ({ projectId, agentId }) => {
      const project = requireProject(projectId);
      if (!project.agentIds.includes(agentId)) fail("error.project.agentNotFound");
      if (project.agentIds.length === 1) fail("error.project.agentRequired");
      const removedTaskIds = host.tasks(agentId).map((task) => task.id);
      removeAgents([agentId]);
      const next = touch(project, { agentIds: project.agentIds.filter((id) => id !== agentId) });
      emitProjects(next.id);
      emitChats(next, [], removedTaskIds);
      return detail(next);
    },
    listChats: async (input) => {
      const filter = input.archived ?? "exclude";
      const chats = chatsOf(requireProject(input.projectId)).filter(
        (chat) => filter === "include" || chat.archived === (filter === "only"),
      );
      const offset = decodeCursor(input.cursor);
      const limit = input.limit ?? 50;
      return clone({
        chats: chats.slice(offset, offset + limit),
        nextCursor: offset + limit < chats.length ? encodeCursor(offset + limit) : null,
      });
    },
    getChat: async ({ agentId, taskId }) => {
      const { project, task } = findChat(agentId, taskId);
      return clone(chatOf(project, task));
    },
    searchChats: async (input) => {
      const query = input.query.trim().toLowerCase();
      const scope = input.projectId === undefined ? [...projects.values()] : [requireProject(input.projectId)];
      const matches: ProjectChatMatch[] = [];
      for (const project of scope) {
        for (const agentId of project.agentIds) {
          for (const task of host.tasks(agentId)) {
            const chat = chatOf(project, task);
            if (task.title.toLowerCase().includes(query))
              matches.push({ chat, kind: "title", messageId: null, excerpt: task.title, createdAt: task.updatedAt });
            for (const message of host.conversation(task).messages) {
              if (!message.text.toLowerCase().includes(query)) continue;
              matches.push({
                chat,
                kind: "message",
                messageId: message.id,
                excerpt: message.text.slice(0, PROJECT_LIMITS.searchExcerpt),
                createdAt: message.createdAt,
              });
            }
          }
        }
      }
      matches.sort((left, right) => (right.createdAt ?? "").localeCompare(left.createdAt ?? ""));
      const offset = decodeCursor(input.cursor);
      const limit = input.limit ?? 50;
      return clone({
        matches: matches.slice(offset, offset + limit),
        nextCursor: offset + limit < matches.length ? encodeCursor(offset + limit) : null,
      });
    },
    startChat: async (input) => {
      const project = requireProject(input.projectId);
      if (project.archivedAt !== null) fail("error.project.archived");
      if (!project.agentIds.includes(input.agentId)) fail("error.project.agentNotFound");
      const task = host.newTask(input.agentId, input.text.slice(0, INPUT_LIMITS.messageText));
      known.set(task.id, { agentId: task.agentId, state: task.state });
      host.runTurn(task, input.text);
      return clone(chatOf(project, task));
    },
    setChatArchived: async ({ agentId, taskId, archived }) => {
      const { project, task } = findChat(agentId, taskId);
      flagsOf(taskId).archived = archived;
      if (archived && task.state !== "closed")
        Object.assign(task, { state: "closed", closedAt: new Date().toISOString(), activeTurnId: null });
      known.set(task.id, { agentId, state: task.state });
      host.emitTasks(agentId);
      return clone(chatOf(project, task));
    },
    setChatPinned: async ({ agentId, taskId, pinned }) => {
      const { project, task } = findChat(agentId, taskId);
      flagsOf(taskId).pinned = pinned;
      emitChats(project, [task]);
      return clone(chatOf(project, task));
    },
    listActivity: async () => clone(activity()),
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

  return {
    api,
    beforeSend: (agentId, taskId) => {
      const task = projectOfAgent(agentId) ? host.tasks(agentId).find((candidate) => candidate.id === taskId) : null;
      if (!task) return;
      const chat = flagsOf(taskId);
      chat.needsInput = false;
      chat.failureUnseen = false;
      chat.archived = false;
      if (task.state === "closed") Object.assign(task, { state: "idle", closedAt: null });
      known.set(task.id, { agentId, state: task.state });
    },
    taskRead: (agentId, taskId) => {
      const project = projectOfAgent(agentId);
      const task = project ? host.tasks(agentId).find((candidate) => candidate.id === taskId) : null;
      if (!project || !task) return;
      flagsOf(taskId).failureUnseen = false;
      emitChats(project, [task]);
    },
  };
}
