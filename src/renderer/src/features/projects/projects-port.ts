import {
  type ChooseProjectFolderInput,
  type CreateProjectAgentInput,
  type CreateProjectInput,
  isProjectRuntime,
  type ListProjectChatsInput,
  type MarkAgentTaskReadInput,
  type ProjectActivity,
  type ProjectActivityChangedEvent,
  type ProjectAgentRef,
  type ProjectChat,
  type ProjectChatRef,
  type ProjectChatSearchPage,
  type ProjectChatsChangedEvent,
  type ProjectChatsPage,
  type ProjectDetail,
  type ProjectFolderChange,
  type ProjectFolderChoice,
  type ProjectFolderInput,
  type ProjectRuntime,
  type ProjectSummary,
  type ProjectsChangedEvent,
  type SearchProjectChatsInput,
  type SetProjectChatArchivedInput,
  type SetProjectChatPinnedInput,
  type StartProjectChatInput,
  type UpdateProjectAgentInput,
  type UpdateProjectInput,
} from "@codebot/contracts/ipc";
import { isDynamicRecord } from "@codebot/contracts/runtime-values";
import { sourceText } from "@codebot/i18n/source";

export interface EngineProjectsPort {
  list(): Promise<ProjectSummary[]>;
  get(projectId: string): Promise<ProjectDetail>;
  create(input: CreateProjectInput): Promise<ProjectDetail>;
  update(input: UpdateProjectInput): Promise<ProjectDetail>;
  archive(projectId: string): Promise<ProjectSummary>;
  restore(projectId: string): Promise<ProjectSummary>;
  delete(projectId: string): Promise<void>;
  chooseFolder(input: ChooseProjectFolderInput): Promise<ProjectFolderChoice>;
  addFolder(input: ProjectFolderInput): Promise<ProjectFolderChange>;
  removeFolder(input: ProjectFolderInput): Promise<ProjectFolderChange>;
  createAgent(input: CreateProjectAgentInput): Promise<ProjectDetail>;
  updateAgent(input: UpdateProjectAgentInput): Promise<ProjectDetail>;
  removeAgent(input: ProjectAgentRef): Promise<ProjectDetail>;
  listChats(input: ListProjectChatsInput): Promise<ProjectChatsPage>;
  getChat(input: ProjectChatRef): Promise<ProjectChat>;
  searchChats(input: SearchProjectChatsInput): Promise<ProjectChatSearchPage>;
  startChat(input: StartProjectChatInput): Promise<ProjectChat>;
  setChatArchived(input: SetProjectChatArchivedInput): Promise<ProjectChat>;
  setChatPinned(input: SetProjectChatPinnedInput): Promise<ProjectChat>;
  markChatShown(input: MarkAgentTaskReadInput): Promise<void>;
  listActivity(): Promise<ProjectActivity[]>;
  onChanged(listener: (event: ProjectsChangedEvent) => void): () => void;
  onChatsChanged(listener: (event: ProjectChatsChangedEvent) => void): () => void;
  onActivityChanged(listener: (event: ProjectActivityChangedEvent) => void): () => void;
}

interface SetProjectChatRuntimeInput extends ProjectChatRef {
  runtime: ProjectRuntime | null;
}

export interface ProjectsPort extends EngineProjectsPort {
  setChatRuntime(input: SetProjectChatRuntimeInput): Promise<ProjectChat>;
}

export function projectChatKey(ref: ProjectChatRef): string {
  return `${ref.agentId}\u0000${ref.taskId}`;
}

const PROBE_PROJECT_ID = "codebot-projects-probe";

function ipcProjectsPort(serverId: string): EngineProjectsPort {
  const projects = () => window.codebot.projects;
  const own =
    <Event extends { serverId: string }>(listener: (event: Event) => void) =>
    (event: Event) => {
      if (event.serverId === serverId) listener(event);
    };
  return {
    list: () => projects().list(serverId),
    get: (projectId) => projects().get(projectId, serverId),
    create: (input) => projects().create(input, serverId),
    update: (input) => projects().update(input, serverId),
    archive: (projectId) => projects().archive(projectId, serverId),
    restore: (projectId) => projects().restore(projectId, serverId),
    delete: (projectId) => projects().delete(projectId, serverId),
    chooseFolder: (input) => projects().chooseFolder(input),
    addFolder: (input) => projects().addFolder(input, serverId),
    removeFolder: (input) => projects().removeFolder(input, serverId),
    createAgent: (input) => projects().createAgent(input, serverId),
    updateAgent: (input) => projects().updateAgent(input, serverId),
    removeAgent: (input) => projects().removeAgent(input, serverId),
    listChats: (input) => projects().listChats(input, serverId),
    getChat: (input) => projects().getChat(input, serverId),
    searchChats: (input) => projects().searchChats(input, serverId),
    startChat: (input) => projects().startChat(input, serverId),
    setChatArchived: (input) => projects().setChatArchived(input, serverId),
    setChatPinned: (input) => projects().setChatPinned(input, serverId),
    markChatShown: async (input) => {
      await window.codebot.agent.markTaskRead(input, serverId);
    },
    listActivity: () => projects().listActivity(serverId),
    onChanged: (listener) => projects().onChanged(own(listener)),
    onChatsChanged: (listener) => projects().onChatsChanged(own(listener)),
    onActivityChanged: (listener) => projects().onActivityChanged(own(listener)),
  };
}

async function engineServesProjects(serverId: string): Promise<boolean> {
  const unserved = [sourceText("error.project.serverTooOld")];
  try {
    await window.codebot.projects.get(PROBE_PROJECT_ID, serverId);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return !unserved.some((text) => message.includes(text));
  }
}

function deferredPort(resolve: () => Promise<EngineProjectsPort>): EngineProjectsPort {
  const subscribe =
    <Event>(select: (port: EngineProjectsPort) => (listener: (event: Event) => void) => () => void) =>
    (listener: (event: Event) => void) => {
      let stop: (() => void) | undefined;
      let stopped = false;
      void resolve().then((port) => {
        if (!stopped) stop = select(port)(listener);
      });
      return () => {
        stopped = true;
        stop?.();
      };
    };
  return {
    list: () => resolve().then((port) => port.list()),
    get: (projectId) => resolve().then((port) => port.get(projectId)),
    create: (input) => resolve().then((port) => port.create(input)),
    update: (input) => resolve().then((port) => port.update(input)),
    archive: (projectId) => resolve().then((port) => port.archive(projectId)),
    restore: (projectId) => resolve().then((port) => port.restore(projectId)),
    delete: (projectId) => resolve().then((port) => port.delete(projectId)),
    chooseFolder: (input) => resolve().then((port) => port.chooseFolder(input)),
    addFolder: (input) => resolve().then((port) => port.addFolder(input)),
    removeFolder: (input) => resolve().then((port) => port.removeFolder(input)),
    createAgent: (input) => resolve().then((port) => port.createAgent(input)),
    updateAgent: (input) => resolve().then((port) => port.updateAgent(input)),
    removeAgent: (input) => resolve().then((port) => port.removeAgent(input)),
    listChats: (input) => resolve().then((port) => port.listChats(input)),
    getChat: (input) => resolve().then((port) => port.getChat(input)),
    searchChats: (input) => resolve().then((port) => port.searchChats(input)),
    startChat: (input) => resolve().then((port) => port.startChat(input)),
    setChatArchived: (input) => resolve().then((port) => port.setChatArchived(input)),
    setChatPinned: (input) => resolve().then((port) => port.setChatPinned(input)),
    markChatShown: (input) => resolve().then((port) => port.markChatShown(input)),
    listActivity: () => resolve().then((port) => port.listActivity()),
    onChanged: subscribe((port) => port.onChanged),
    onChatsChanged: subscribe((port) => port.onChatsChanged),
    onActivityChanged: subscribe((port) => port.onActivityChanged),
  };
}

const CHAT_RUNTIME_STORAGE_KEY = "codebot:project-chat-runtime:v1";

type ChatRuntimes = Record<string, ProjectRuntime>;

function storedChatRuntimes(all: unknown, serverId: string): ChatRuntimes {
  const stored = isDynamicRecord(all) ? all[serverId] : undefined;
  if (!isDynamicRecord(stored)) return {};
  return Object.fromEntries(
    Object.entries(stored).flatMap(([key, value]) => (isProjectRuntime(value) ? [[key, value]] : [])),
  );
}

function readChatRuntimes(serverId: string): ChatRuntimes {
  try {
    return storedChatRuntimes(JSON.parse(window.localStorage.getItem(CHAT_RUNTIME_STORAGE_KEY) ?? "{}"), serverId);
  } catch {
    return {};
  }
}

function withServerRuntimes(all: unknown, serverId: string, runtimes: ChatRuntimes): string {
  return JSON.stringify({ ...(isDynamicRecord(all) ? all : {}), [serverId]: runtimes });
}

function writeChatRuntimes(serverId: string, runtimes: ChatRuntimes): void {
  try {
    const stored = window.localStorage.getItem(CHAT_RUNTIME_STORAGE_KEY) ?? "{}";
    window.localStorage.setItem(CHAT_RUNTIME_STORAGE_KEY, withServerRuntimes(JSON.parse(stored), serverId, runtimes));
  } catch {}
}

function withStoredChatRuntimes(port: EngineProjectsPort, serverId: string): ProjectsPort {
  let runtimes = readChatRuntimes(serverId);
  const listeners = new Set<(event: ProjectChatsChangedEvent) => void>();
  const withRuntime = (chat: ProjectChat): ProjectChat =>
    chat.runtime ? chat : { ...chat, runtime: runtimes[projectChatKey(chat)] ?? null };
  const emit = (event: ProjectChatsChangedEvent) => {
    for (const listener of [...listeners]) listener(event);
  };
  return {
    ...port,
    listChats: async (input) => {
      const page = await port.listChats(input);
      return { ...page, chats: page.chats.map(withRuntime) };
    },
    getChat: async (input) => withRuntime(await port.getChat(input)),
    searchChats: async (input) => {
      const page = await port.searchChats(input);
      return { ...page, matches: page.matches.map((match) => ({ ...match, chat: withRuntime(match.chat) })) };
    },
    startChat: async (input) => withRuntime(await port.startChat(input)),
    setChatArchived: async (input) => withRuntime(await port.setChatArchived(input)),
    setChatPinned: async (input) => withRuntime(await port.setChatPinned(input)),
    setChatRuntime: async (input) => {
      const { [projectChatKey(input)]: _previous, ...rest } = runtimes;
      runtimes = input.runtime ? { ...rest, [projectChatKey(input)]: input.runtime } : rest;
      writeChatRuntimes(serverId, runtimes);
      const chat = withRuntime(await port.getChat({ agentId: input.agentId, taskId: input.taskId }));
      emit({ serverId, projectId: chat.projectId, chats: [chat], removedTaskIds: [] });
      return chat;
    },
    onChatsChanged: (listener) => {
      listeners.add(listener);
      const stop = port.onChatsChanged((event) => {
        for (const taskId of event.removedTaskIds) {
          const removed = Object.keys(runtimes).filter((key) => key.endsWith(`\u0000${taskId}`));
          if (removed.length === 0) continue;
          runtimes = Object.fromEntries(Object.entries(runtimes).filter(([key]) => !removed.includes(key)));
          writeChatRuntimes(serverId, runtimes);
        }
        listener({ ...event, chats: event.chats.map(withRuntime) });
      });
      return () => {
        listeners.delete(listener);
        stop();
      };
    },
  };
}

export function createProjectsPort(serverId: string, temporary: () => EngineProjectsPort): ProjectsPort {
  let chosen: Promise<EngineProjectsPort> | undefined;
  const resolve = () => {
    chosen ??= engineServesProjects(serverId).then((served) => (served ? ipcProjectsPort(serverId) : temporary()));
    return chosen;
  };
  return withStoredChatRuntimes(deferredPort(resolve), serverId);
}
