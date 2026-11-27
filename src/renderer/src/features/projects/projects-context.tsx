import type {
  CreateProjectInput,
  MarkAgentTaskReadInput,
  ProjectActivity,
  ProjectAgentInput,
  ProjectChat,
  ProjectChatRef,
  ProjectDetail,
  ProjectFolderChange,
  ProjectRuntime,
  ProjectSummary,
  UpdateProjectAgentInput,
  UpdateProjectInput,
} from "@codebot/contracts/ipc";
import { emptyProjectActivity } from "@codebot/contracts/ipc";
import { classifyFailure } from "@codebot/telemetry";
import { currentText } from "@codebot/ui/text";
import { createEffect, createSignal, createStore, getOwner, onSettled, runWithOwner, untrack } from "solid-js";
import { actionToast } from "../../action-toast";
import { createSimpleContext } from "../../simple-context";
import { useTurns } from "../../turns";
import { useAgentTasks } from "../agent-tasks/agent-tasks-context";
import { taskWaitsFor } from "../agent-threads/conversation-threads";
import { useAgentActions } from "../agents/agent-actions";
import { useAgents } from "../agents/agents-context";
import { useServers } from "../servers/servers-context";
import { useSidebar } from "../sidebar/sidebar-context";
import type { OpenChatRequest, ProjectDockController } from "./project-dock-controller";
import { readActiveProjectId, writeActiveProjectId } from "./project-dock-storage";
import { createProjectsPort, type ProjectsPort, projectChatKey } from "./projects-port";
import { createTemporaryProjectsPort } from "./projects-port-temporary";

export const CHAT_PAGE_SIZE = 40;
export const RECENT_CHAT_COUNT = 5;

export interface ChatList {
  chats: ProjectChat[];
  nextCursor: string | null;
  loaded: boolean;
  loading: boolean;
  failed: boolean;
}

function emptyList(): ChatList {
  return { chats: [], nextCursor: null, loaded: false, loading: false, failed: false };
}

interface ProjectsState {
  projects: ProjectSummary[];
  loaded: boolean;
  failed: boolean;
  activity: Record<string, ProjectActivity>;
  details: Record<string, ProjectDetail>;
  active: Record<string, ChatList>;
  archived: Record<string, ChatList>;
  activeProjectId: string | null;
  expanded: Record<string, boolean>;
  drafts: Record<string, string>;
}

export function sortChats(chats: readonly ProjectChat[]): ProjectChat[] {
  return [...chats].sort(
    (left, right) =>
      Number(right.pinned) - Number(left.pinned) ||
      right.updatedAt.localeCompare(left.updatedAt) ||
      left.taskId.localeCompare(right.taskId),
  );
}

function mergeChats(current: readonly ProjectChat[], incoming: readonly ProjectChat[]): ProjectChat[] {
  const byId = new Map(current.map((chat) => [chat.taskId, chat]));
  for (const chat of incoming) byId.set(chat.taskId, chat);
  return sortChats([...byId.values()]);
}

const Projects = createSimpleContext({
  name: "Projects",
  init: () => {
    const { activeServerId } = useServers();
    const serverId = untrack(activeServerId);
    const agents = useAgents();
    const agentActions = useAgentActions();
    const sidebar = useSidebar();
    const tasks = useAgentTasks();
    const turns = useTurns();
    const owner = getOwner();
    const port: ProjectsPort = createProjectsPort(serverId, () => {
      const create = () =>
        createTemporaryProjectsPort({
          serverId,
          agents: agents.agentList,
          agentsSettled: agents.agentListSettled,
          sidebarLayout: sidebar.sidebarLayout,
          tasks,
          reloadKey: () => agents.agentStatus().phase,
          waitsForInput: (task) =>
            taskWaitsFor(task, {
              approvals: turns.approvals(),
              prompts: Object.values(turns.pendingPrompts()).flatMap((event) =>
                event?.type === "prompt" ? [event] : [],
              ),
              takeovers: Object.values(turns.pendingPrompts()).flatMap((event) =>
                event?.type === "browser-takeover-requested" ? [event.request] : [],
              ),
            }) !== undefined,
          addAgent: (agent) => {
            agentActions.addNewAgent(agent);
          },
          updateAgent: (agentId, updates) => agents.updateAgent(agentId, updates),
          deleteAgent: (agentId) => agentActions.deleteAgent(agentId),
        });
      return runWithOwner(owner, create) ?? create();
    });

    const [state, setState] = createStore<ProjectsState>({
      projects: [],
      loaded: false,
      failed: false,
      activity: {},
      details: {},
      active: {},
      archived: {},
      activeProjectId: readActiveProjectId(serverId),
      expanded: {},
      drafts: {},
    });
    const [dock, setDock] = createSignal<ProjectDockController | null>(null);
    const pendingOpens: OpenChatRequest[] = [];
    const removedListeners = new Set<(ref: ProjectChatRef) => void>();
    const [openChatKeys, setOpenChatKeys] = createSignal<ReadonlySet<string>>(new Set());
    const [shownChatKey, setShownChatKey] = createSignal<string | null>(null);
    const [createOpen, setCreateOpen] = createSignal(false);
    const [settingsProjectId, setSettingsProjectId] = createSignal<string | null>(null);
    const [pickerOpen, setPickerOpen] = createSignal<{ placement: OpenChatRequest["placement"] } | null>(null);

    function report(
      fallback: "project.error.load" | "project.error.chats" | "project.error.start" | "project.error.action",
      error: unknown,
    ): void {
      const { t, errorMessage } = currentText();
      actionToast.error(errorMessage(error, t(fallback)), {
        report: { operation: "other", source: "action", cause_code: classifyFailure(error) },
      });
    }

    const visibleProjects = () => state.projects.filter((project) => project.archivedAt === null);
    const project = (projectId: string | null): ProjectSummary | undefined =>
      projectId === null ? undefined : state.projects.find((entry) => entry.id === projectId);
    const activeProject = () => project(state.activeProjectId);
    const activityOf = (projectId: string): ProjectActivity =>
      state.activity[projectId] ?? emptyProjectActivity(projectId);
    const detailOf = (projectId: string): ProjectDetail | undefined => state.details[projectId];

    async function refreshProjects(): Promise<void> {
      try {
        const [list, activity] = await Promise.all([port.list(), port.listActivity()]);
        setState((current) => {
          current.projects = list;
          current.loaded = true;
          current.failed = false;
          current.activity = Object.fromEntries(activity.map((entry) => [entry.projectId, entry]));
          const stillThere = current.activeProjectId && list.some((entry) => entry.id === current.activeProjectId);
          if (!stillThere) {
            const stored = readActiveProjectId(serverId);
            const next =
              list.find((entry) => entry.id === stored && entry.archivedAt === null) ??
              list.find((entry) => entry.archivedAt === null);
            current.activeProjectId = next?.id ?? null;
          }
        });
      } catch (error) {
        setState((current) => {
          current.failed = true;
          current.loaded = true;
        });
        report("project.error.load", error);
      }
    }

    async function loadDetail(projectId: string): Promise<ProjectDetail | undefined> {
      try {
        const detail = await port.get(projectId);
        setState((current) => {
          current.details[projectId] = detail;
        });
        return detail;
      } catch {
        return undefined;
      }
    }

    function listOf(projectId: string, archived: boolean): ChatList {
      return (archived ? state.archived[projectId] : state.active[projectId]) ?? emptyList();
    }

    async function loadChats(projectId: string, options: { archived?: boolean; more?: boolean } = {}): Promise<void> {
      const archived = options.archived === true;
      const key = archived ? "archived" : "active";
      const before = untrack(() => listOf(projectId, archived));
      if (before.loading || (options.more && before.nextCursor === null)) return;
      setState((current) => {
        current[key][projectId] = { ...before, loading: true, failed: false };
      });
      try {
        const page = await port.listChats({
          projectId,
          limit: CHAT_PAGE_SIZE,
          archived: archived ? "only" : "exclude",
          ...(options.more && before.nextCursor ? { cursor: before.nextCursor } : {}),
        });
        setState((current) => {
          const latest = current[key][projectId] ?? before;
          current[key][projectId] = {
            chats: options.more ? mergeChats(latest.chats, page.chats) : mergeChats([], page.chats),
            nextCursor: page.nextCursor,
            loaded: true,
            loading: false,
            failed: false,
          };
        });
      } catch (error) {
        if (!untrack(() => project(projectId))) return;
        setState((current) => {
          current[key][projectId] = { ...before, loaded: true, loading: false, failed: true };
        });
        report("project.error.chats", error);
      }
    }

    function ensureChats(projectId: string): void {
      const list = untrack(() => listOf(projectId, false));
      if (!list.loaded && !list.loading) void loadChats(projectId);
    }

    function applyChats(projectId: string, chats: readonly ProjectChat[], removedTaskIds: readonly string[]): void {
      setState((current) => {
        for (const kind of ["active", "archived"] as const) {
          const list = current[kind][projectId];
          if (!list) continue;
          const wantArchived = kind === "archived";
          const kept = list.chats.filter((chat) => !removedTaskIds.includes(chat.taskId));
          const incoming = chats.filter((chat) => chat.archived === wantArchived);
          const moved = chats.filter((chat) => chat.archived !== wantArchived).map((chat) => chat.taskId);
          list.chats = mergeChats(
            kept.filter((chat) => !moved.includes(chat.taskId)),
            list.loaded || incoming.length > 0 ? incoming : [],
          );
        }
      });
      for (const taskId of removedTaskIds)
        for (const listener of [...removedListeners]) listener({ agentId: "", taskId });
    }

    function setActiveProject(projectId: string | null): void {
      setState((current) => {
        current.activeProjectId = projectId;
      });
      writeActiveProjectId(serverId, projectId);
      if (projectId) {
        ensureChats(projectId);
        void loadDetail(projectId);
      }
    }

    function openChat(request: OpenChatRequest): void {
      const controller = untrack(dock);
      const sameProject = untrack(() => state.activeProjectId) === request.projectId;
      if (controller && sameProject) {
        controller.open(request);
        return;
      }
      pendingOpens.push(request);
      setActiveProject(request.projectId);
    }

    function takePendingOpens(): OpenChatRequest[] {
      return pendingOpens.splice(0, pendingOpens.length);
    }

    function newChat(projectId: string | null = untrack(() => state.activeProjectId)): void {
      if (!projectId) return;
      const detail = untrack(() => state.details[projectId]);
      openChat({ projectId, agentId: detail?.agents[0]?.id ?? null, chatId: null, placement: "active" });
    }

    async function createProject(input: CreateProjectInput): Promise<ProjectSummary> {
      const detail = await port.create(input);
      setState((current) => {
        current.details[detail.project.id] = detail;
        if (!current.projects.some((entry) => entry.id === detail.project.id)) current.projects.push(detail.project);
      });
      setActiveProject(detail.project.id);
      void refreshProjects();
      return detail.project;
    }

    async function updateProject(input: UpdateProjectInput): Promise<ProjectDetail> {
      const detail = await port.update(input);
      setState((current) => {
        current.details[detail.project.id] = detail;
        const index = current.projects.findIndex((entry) => entry.id === detail.project.id);
        if (index >= 0) current.projects[index] = detail.project;
      });
      return detail;
    }

    async function archiveProject(projectId: string): Promise<void> {
      try {
        await port.archive(projectId);
        await refreshProjects();
        if (untrack(() => state.activeProjectId) === projectId) {
          setActiveProject(untrack(() => visibleProjects()[0]?.id ?? null));
        }
      } catch (error) {
        report("project.error.action", error);
      }
    }

    async function restoreProject(projectId: string): Promise<void> {
      try {
        await port.restore(projectId);
        await refreshProjects();
      } catch (error) {
        report("project.error.action", error);
      }
    }

    async function deleteProject(projectId: string): Promise<void> {
      if (untrack(() => state.activeProjectId) === projectId) {
        setActiveProject(untrack(() => visibleProjects().find((entry) => entry.id !== projectId)?.id ?? null));
      }
      await port.delete(projectId);
      setState((current) => {
        current.projects = current.projects.filter((entry) => entry.id !== projectId);
        delete current.details[projectId];
        delete current.active[projectId];
        delete current.archived[projectId];
      });
    }

    async function changeDetail(run: () => Promise<ProjectDetail>): Promise<ProjectDetail> {
      const detail = await run();
      setState((current) => {
        current.details[detail.project.id] = detail;
        const index = current.projects.findIndex((entry) => entry.id === detail.project.id);
        if (index >= 0) current.projects[index] = detail.project;
      });
      return detail;
    }

    async function changeFolder(run: () => Promise<ProjectFolderChange>): Promise<ProjectFolderChange> {
      const change = await run();
      setState((current) => {
        current.details[change.detail.project.id] = change.detail;
        const index = current.projects.findIndex((entry) => entry.id === change.detail.project.id);
        if (index >= 0) current.projects[index] = change.detail.project;
      });
      return change;
    }

    async function setChatArchived(chat: ProjectChat, archived: boolean): Promise<void> {
      try {
        const updated = await port.setChatArchived({ agentId: chat.agentId, taskId: chat.taskId, archived });
        applyChats(chat.projectId, [updated], []);
        if (archived)
          for (const listener of [...removedListeners]) listener({ agentId: chat.agentId, taskId: chat.taskId });
        else void loadChats(chat.projectId, { archived: false });
      } catch (error) {
        report("project.error.action", error);
      }
    }

    async function setChatPinned(chat: ProjectChat, pinned: boolean): Promise<void> {
      try {
        const updated = await port.setChatPinned({ agentId: chat.agentId, taskId: chat.taskId, pinned });
        applyChats(chat.projectId, [updated], []);
      } catch (error) {
        report("project.error.action", error);
      }
    }

    async function renameChat(chat: ProjectChat, title: string): Promise<void> {
      const trimmed = title.trim();
      if (!trimmed || trimmed === chat.title) return;
      if (await tasks.renameTask(chat.agentId, chat.taskId, trimmed))
        applyChats(chat.projectId, [{ ...chat, title: trimmed }], []);
    }

    async function deleteChat(chat: ProjectChat): Promise<void> {
      if (!(await tasks.deleteTask(chat.agentId, chat.taskId))) return;
      applyChats(chat.projectId, [], [chat.taskId]);
      for (const listener of [...removedListeners]) listener({ agentId: chat.agentId, taskId: chat.taskId });
    }

    async function startChat(input: {
      projectId: string;
      agentId: string;
      text: string;
      runtime: ProjectRuntime | null;
    }): Promise<ProjectChat | null> {
      try {
        const chat = await port.startChat({ projectId: input.projectId, agentId: input.agentId, text: input.text });
        const withRuntime = input.runtime
          ? await port.setChatRuntime({ agentId: chat.agentId, taskId: chat.taskId, runtime: input.runtime })
          : chat;
        applyChats(input.projectId, [withRuntime], []);
        return withRuntime;
      } catch (error) {
        report("project.error.start", error);
        return null;
      }
    }

    async function setChatRuntime(chat: ProjectChatRef & { projectId: string }, runtime: ProjectRuntime | null) {
      try {
        const updated = await port.setChatRuntime({ agentId: chat.agentId, taskId: chat.taskId, runtime });
        applyChats(chat.projectId, [updated], []);
      } catch (error) {
        report("project.error.action", error);
      }
    }

    async function markChatShown(ref: MarkAgentTaskReadInput): Promise<void> {
      try {
        await port.markChatShown(ref);
      } catch {}
    }

    onSettled(() => {
      void refreshProjects().then(() => {
        const id = untrack(() => state.activeProjectId);
        if (id) setActiveProject(id);
      });
      const stops = [
        port.onChanged((event) => {
          setState((current) => {
            current.projects = event.projects;
            if (current.activeProjectId && !event.projects.some((entry) => entry.id === current.activeProjectId)) {
              current.activeProjectId = event.projects.find((entry) => entry.archivedAt === null)?.id ?? null;
            } else if (!current.activeProjectId) {
              current.activeProjectId = event.projects.find((entry) => entry.archivedAt === null)?.id ?? null;
            }
          });
        }),
        port.onChatsChanged((event) => applyChats(event.projectId, event.chats, event.removedTaskIds)),
        port.onActivityChanged((event) =>
          setState((current) => {
            current.activity = Object.fromEntries(event.activity.map((entry) => [entry.projectId, entry]));
          }),
        ),
      ];
      return () => {
        for (const stop of stops) stop();
      };
    });

    createEffect(
      () => state.activeProjectId,
      (projectId) => {
        if (projectId) {
          untrack(() => ensureChats(projectId));
          void loadDetail(projectId);
        }
      },
    );

    return {
      state,
      port,
      visibleProjects,
      project,
      activeProject,
      activityOf,
      detailOf,
      listOf,
      loadChats,
      ensureChats,
      loadDetail,
      refreshProjects,
      setActiveProject,
      openChat,
      newChat,
      takePendingOpens,
      dock,
      setDock: (controller: ProjectDockController | null) => setDock(controller),
      onChatRemoved: (listener: (ref: ProjectChatRef) => void) => {
        removedListeners.add(listener);
        return () => removedListeners.delete(listener);
      },
      openChatKeys,
      setOpenChatKeys,
      shownChatKey,
      setShownChatKey,
      createOpen,
      setCreateOpen,
      settingsProjectId,
      setSettingsProjectId,
      pickerOpen,
      setPickerOpen,
      createProject,
      updateProject,
      archiveProject,
      restoreProject,
      deleteProject,
      createAgent: (projectId: string, input: ProjectAgentInput) =>
        changeDetail(() => port.createAgent({ projectId, ...input })),
      updateAgent: (input: UpdateProjectAgentInput) => changeDetail(() => port.updateAgent(input)),
      removeAgent: (projectId: string, agentId: string) => changeDetail(() => port.removeAgent({ projectId, agentId })),
      chooseFolder: (projectId?: string) => port.chooseFolder(projectId ? { projectId } : {}),
      addFolder: (projectId: string, path: string) => changeFolder(() => port.addFolder({ projectId, path })),
      removeFolder: (projectId: string, path: string) => changeFolder(() => port.removeFolder({ projectId, path })),
      setChatArchived,
      setChatPinned,
      renameChat,
      deleteChat,
      startChat,
      setChatRuntime,
      markChatShown,
      setDraft: (key: string, text: string) =>
        setState((current) => {
          if (text) current.drafts[key] = text;
          else delete current.drafts[key];
        }),
      toggleExpanded: (projectId: string) =>
        setState((current) => {
          current.expanded[projectId] = !current.expanded[projectId];
        }),
      chatKey: projectChatKey,
    };
  },
});

export const ProjectsProvider = Projects.provider;
export const useProjects = Projects.use;
