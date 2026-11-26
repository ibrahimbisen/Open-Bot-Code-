import {
  type ConversationMessageSender,
  isProjectActivityList,
  isProjectChat,
  isProjectChatSearchPage,
  isProjectChatsPage,
  isProjectDetail,
  isProjectFolderChange,
  isProjectSummary,
  isProjectSummaryList,
  type ProjectFolderChoice,
} from "@codebot/contracts/ipc";
import { guardedDecoder } from "@codebot/contracts/ipc-decoding";
import {
  PROJECTS_V1_CAPABILITY,
  PROJECTS_V1_ROUTES,
  type ProjectsV1Operation,
} from "@codebot/contracts/team-protocol/projects-v1";
import type { AppTranslate } from "@codebot/i18n";
import { sourceText } from "@codebot/i18n/source";
import type { Effect } from "effect";
import type { BrowserWindow } from "electron";
import { runCauseEffect } from "../../backend/effect-boundary";
import type { ProjectOperations } from "../../backend/projects/project-operations";
import { pickFolder } from "../folder-dialog";
import type { ResponseDecoder } from "../remote-host-decoding";
import type { RemoteRequestInit } from "../remote-server-client";
import type { RemoteWorkflowError } from "../remote-service-effects";
import { type IpcGroupHandlers, payloadHandler } from "./define-ipc-group";
import {
  parseChooseProjectFolder,
  parseCreateProject,
  parseCreateProjectAgent,
  parseListProjectChats,
  parseProjectAgentRef,
  parseProjectChatRef,
  parseProjectFolder,
  parseProjectId,
  parseSearchProjectChats,
  parseSetProjectChatArchived,
  parseSetProjectChatPinned,
  parseSetProjectChatRuntime,
  parseStartProjectChat,
  parseUpdateProject,
  parseUpdateProjectAgent,
} from "./project-inputs";
import { scopedHandler, scopedQueryHandler } from "./scoped-handler";

interface ProjectRemoteServers {
  supportsCapability(serverId: string, capability: typeof PROJECTS_V1_CAPABILITY): boolean;
  request<T>(
    serverId: string,
    path: string,
    decoder: ResponseDecoder<T>,
    init?: RemoteRequestInit,
  ): Effect.Effect<T, RemoteWorkflowError>;
}

const decodeSummary = guardedDecoder(isProjectSummary, "project response");
const decodeSummaries = guardedDecoder(isProjectSummaryList, "projects response");
const decodeDetail = guardedDecoder(isProjectDetail, "project detail response");
const decodeFolderChange = guardedDecoder(isProjectFolderChange, "project folder response");
const decodeChat = guardedDecoder(isProjectChat, "project chat response");
const decodeChatsPage = guardedDecoder(isProjectChatsPage, "project chats response");
const decodeSearchPage = guardedDecoder(isProjectChatSearchPage, "project chat search response");
const decodeActivity = guardedDecoder(isProjectActivityList, "project activity response");
const decodeNothing = (): void => undefined;

export interface ProjectIpcDependencies {
  projects: ProjectOperations;
  remoteServers: ProjectRemoteServers;
  sender: () => ConversationMessageSender | undefined;
  getMainWindow: () => BrowserWindow | null;
  translate: AppTranslate;
}

export function projectIpcHandlers({
  projects,
  remoteServers,
  sender,
  getMainWindow,
  translate,
}: ProjectIpcDependencies): Pick<IpcGroupHandlers, "projects"> {
  function remote<T>(
    serverId: string,
    operation: ProjectsV1Operation,
    decoder: ResponseDecoder<T>,
    input?: unknown,
  ): Promise<T> {
    if (!remoteServers.supportsCapability(serverId, PROJECTS_V1_CAPABILITY))
      throw new Error(sourceText("error.project.serverTooOld"));
    return runCauseEffect(
      remoteServers.request(serverId, PROJECTS_V1_ROUTES[operation], decoder, {
        method: "POST",
        body: input === undefined ? {} : { input },
      }),
    );
  }

  return {
    projects: {
      list: scopedQueryHandler({
        local: () => projects.list(),
        remote: (serverId) => remote(serverId, "list", decodeSummaries),
      }),
      get: scopedHandler(parseProjectId, {
        local: (projectId) => runCauseEffect(projects.get(projectId)),
        remote: (input, serverId) => remote(serverId, "get", decodeDetail, input),
      }),
      create: scopedHandler(parseCreateProject, {
        local: (input) => runCauseEffect(projects.create(input, sender()?.id ?? null)),
        remote: (input, serverId) => remote(serverId, "create", decodeDetail, input),
      }),
      update: scopedHandler(parseUpdateProject, {
        local: (input) => runCauseEffect(projects.update(input)),
        remote: (input, serverId) => remote(serverId, "update", decodeDetail, input),
      }),
      archive: scopedHandler(parseProjectId, {
        local: (projectId) => runCauseEffect(projects.archive(projectId)),
        remote: (input, serverId) => remote(serverId, "archive", decodeSummary, input),
      }),
      restore: scopedHandler(parseProjectId, {
        local: (projectId) => runCauseEffect(projects.restore(projectId)),
        remote: (input, serverId) => remote(serverId, "restore", decodeSummary, input),
      }),
      delete: scopedHandler(parseProjectId, {
        local: (projectId) => runCauseEffect(projects.delete(projectId)),
        remote: (input, serverId) => remote(serverId, "delete", decodeNothing, input),
      }),
      chooseFolder: payloadHandler(parseChooseProjectFolder, async ({ projectId }): Promise<ProjectFolderChoice> => {
        const project = projectId === undefined ? null : projects.find(projectId);
        if (projectId !== undefined && !project) throw new Error(sourceText("error.project.notFound"));
        const picked = await pickFolder(getMainWindow(), {
          title: project
            ? translate("project.dialog.addFolder", { project: project.name })
            : translate("project.dialog.chooseMainFolder"),
          properties: ["openDirectory", "createDirectory"],
          ...(project ? { defaultPath: project.mainFolder } : {}),
        });
        if (picked === undefined) return { outcome: "cancelled" };
        return runCauseEffect(projects.checkFolder(picked));
      }),
      addFolder: scopedHandler(parseProjectFolder, {
        local: (input) => runCauseEffect(projects.addFolder(input)),
        remote: (input, serverId) => remote(serverId, "addFolder", decodeFolderChange, input),
      }),
      removeFolder: scopedHandler(parseProjectFolder, {
        local: (input) => runCauseEffect(projects.removeFolder(input)),
        remote: (input, serverId) => remote(serverId, "removeFolder", decodeFolderChange, input),
      }),
      createAgent: scopedHandler(parseCreateProjectAgent, {
        local: (input) => runCauseEffect(projects.createAgent(input)),
        remote: (input, serverId) => remote(serverId, "createAgent", decodeDetail, input),
      }),
      updateAgent: scopedHandler(parseUpdateProjectAgent, {
        local: (input) => runCauseEffect(projects.updateAgent(input)),
        remote: (input, serverId) => remote(serverId, "updateAgent", decodeDetail, input),
      }),
      removeAgent: scopedHandler(parseProjectAgentRef, {
        local: (input) => runCauseEffect(projects.removeAgent(input)),
        remote: (input, serverId) => remote(serverId, "removeAgent", decodeDetail, input),
      }),
      listChats: scopedHandler(parseListProjectChats, {
        local: (input) => projects.listChats(input),
        remote: (input, serverId) => remote(serverId, "listChats", decodeChatsPage, input),
      }),
      getChat: scopedHandler(parseProjectChatRef, {
        local: (input) => projects.getChat(input),
        remote: (input, serverId) => remote(serverId, "getChat", decodeChat, input),
      }),
      searchChats: scopedHandler(parseSearchProjectChats, {
        local: (input) => projects.searchChats(input),
        remote: (input, serverId) => remote(serverId, "searchChats", decodeSearchPage, input),
      }),
      startChat: scopedHandler(parseStartProjectChat, {
        local: (input) => runCauseEffect(projects.startChat(input, sender())),
        remote: (input, serverId) => remote(serverId, "startChat", decodeChat, input),
      }),
      setChatArchived: scopedHandler(parseSetProjectChatArchived, {
        local: (input) => runCauseEffect(projects.setChatArchived(input)),
        remote: (input, serverId) => remote(serverId, "setChatArchived", decodeChat, input),
      }),
      setChatPinned: scopedHandler(parseSetProjectChatPinned, {
        local: (input) => projects.setChatPinned(input),
        remote: (input, serverId) => remote(serverId, "setChatPinned", decodeChat, input),
      }),
      setChatRuntime: scopedHandler(parseSetProjectChatRuntime, {
        local: (input) => runCauseEffect(projects.setChatRuntime(input)),
        remote: (input, serverId) => remote(serverId, "setChatRuntime", decodeChat, input),
      }),
      listActivity: scopedQueryHandler({
        local: () => projects.listActivity(),
        remote: (serverId) => remote(serverId, "listActivity", decodeActivity),
      }),
    },
  };
}
