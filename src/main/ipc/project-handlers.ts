import { type ConversationMessageSender, PROJECTS_CAPABILITY, type ProjectFolderChoice } from "@codebot/contracts/ipc";
import type { AppTranslate } from "@codebot/i18n";
import { sourceText } from "@codebot/i18n/source";
import type { BrowserWindow } from "electron";
import { runCauseEffect } from "../../backend/effect-boundary";
import type { ProjectOperations } from "../../backend/projects/project-operations";
import { pickFolder } from "../folder-dialog";
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
  parseStartProjectChat,
  parseUpdateProject,
  parseUpdateProjectAgent,
} from "./project-inputs";
import { scopedHandler, scopedQueryHandler } from "./scoped-handler";

interface ProjectRemoteServers {
  supportsCapability(serverId: string, capability: string): boolean;
}

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
  function remote(serverId: string): never {
    const served = remoteServers.supportsCapability(serverId, PROJECTS_CAPABILITY);
    throw new Error(sourceText(served ? "error.project.remoteNotReady" : "error.project.serverTooOld"));
  }
  const overRemote = (_input: unknown, serverId: string) => remote(serverId);

  return {
    projects: {
      list: scopedQueryHandler({ local: () => projects.list(), remote }),
      get: scopedHandler(parseProjectId, {
        local: (projectId) => runCauseEffect(projects.get(projectId)),
        remote: overRemote,
      }),
      create: scopedHandler(parseCreateProject, {
        local: (input) => runCauseEffect(projects.create(input, sender()?.id ?? null)),
        remote: overRemote,
      }),
      update: scopedHandler(parseUpdateProject, {
        local: (input) => runCauseEffect(projects.update(input)),
        remote: overRemote,
      }),
      archive: scopedHandler(parseProjectId, {
        local: (projectId) => runCauseEffect(projects.archive(projectId)),
        remote: overRemote,
      }),
      restore: scopedHandler(parseProjectId, {
        local: (projectId) => runCauseEffect(projects.restore(projectId)),
        remote: overRemote,
      }),
      delete: scopedHandler(parseProjectId, {
        local: (projectId) => runCauseEffect(projects.delete(projectId)),
        remote: overRemote,
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
        remote: overRemote,
      }),
      removeFolder: scopedHandler(parseProjectFolder, {
        local: (input) => runCauseEffect(projects.removeFolder(input)),
        remote: overRemote,
      }),
      createAgent: scopedHandler(parseCreateProjectAgent, {
        local: (input) => runCauseEffect(projects.createAgent(input)),
        remote: overRemote,
      }),
      updateAgent: scopedHandler(parseUpdateProjectAgent, {
        local: (input) => runCauseEffect(projects.updateAgent(input)),
        remote: overRemote,
      }),
      removeAgent: scopedHandler(parseProjectAgentRef, {
        local: (input) => runCauseEffect(projects.removeAgent(input)),
        remote: overRemote,
      }),
      listChats: scopedHandler(parseListProjectChats, {
        local: (input) => projects.listChats(input),
        remote: overRemote,
      }),
      getChat: scopedHandler(parseProjectChatRef, {
        local: (input) => projects.getChat(input),
        remote: overRemote,
      }),
      searchChats: scopedHandler(parseSearchProjectChats, {
        local: (input) => projects.searchChats(input),
        remote: overRemote,
      }),
      startChat: scopedHandler(parseStartProjectChat, {
        local: (input) => runCauseEffect(projects.startChat(input, sender())),
        remote: overRemote,
      }),
      setChatArchived: scopedHandler(parseSetProjectChatArchived, {
        local: (input) => runCauseEffect(projects.setChatArchived(input)),
        remote: overRemote,
      }),
      setChatPinned: scopedHandler(parseSetProjectChatPinned, {
        local: (input) => projects.setChatPinned(input),
        remote: overRemote,
      }),
      listActivity: scopedQueryHandler({ local: () => projects.listActivity(), remote }),
    },
  };
}
