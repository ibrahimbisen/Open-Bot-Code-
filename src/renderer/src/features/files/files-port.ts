import type { CodeBotDesktopApi } from "@codebot/contracts/ipc";

export interface FilesPort {
  agent: Pick<CodeBotDesktopApi["agent"], "listAgents">;
  storage: Pick<CodeBotDesktopApi["storage"], "clear" | "deleteFile" | "getUsage" | "openFile"> &
    Partial<
      Pick<
        CodeBotDesktopApi["storage"],
        | "getRemovableRuntimes"
        | "removeRemovableRuntimes"
        | "getMachineMetrics"
        | "getDisk"
        | "getLibraryFolders"
        | "changeLibraryFolders"
      >
    >;
  hostAdmin?: Pick<CodeBotDesktopApi["hostAdmin"], "getMachineAlerts" | "setMachineAlerts">;
  backgroundProcesses?: Pick<CodeBotDesktopApi["backgroundProcesses"], "list" | "stop">;
  onLibraryFoldersChanged?: (serverId: string, listener: () => void) => () => void;
}

export function filesPort(): FilesPort {
  const api = window.codebot;
  return {
    agent: api.agent,
    storage: api.storage,
    hostAdmin: api.hostAdmin,
    backgroundProcesses: api.backgroundProcesses,
    onLibraryFoldersChanged: (serverId, listener) =>
      api.agent.onScopedEvent((scoped) => {
        if (scoped.serverId === serverId && scoped.event.type === "library-folders-changed") listener();
      }),
  };
}
