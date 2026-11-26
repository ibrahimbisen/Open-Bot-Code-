import {
  type ExplorerChange,
  IPC_ENDPOINTS,
  parseExplorerCreateInput,
  parseExplorerGitCommitInput,
  parseExplorerGitDiffInput,
  parseExplorerGitLogInput,
  parseExplorerGitStatusInput,
  parseExplorerListInput,
  parseExplorerPathInput,
  parseExplorerRenameInput,
  parseExplorerScopeInput,
  parseExplorerWatchInput,
  parseExplorerWriteInput,
} from "@codebot/contracts/ipc";
import { EXPLORER_CAPABILITY } from "@codebot/contracts/team-protocol/explorer-v1";
import { sourceText } from "@codebot/i18n/source";
import type { WebContents } from "electron";
import type { ExplorerService } from "../explorer/explorer-service";
import { type RendererIpcWindow, sendToRenderer } from "../renderer-ipc";
import { agentRequest } from "./agent-inputs";
import { eventPayloadHandler, type IpcGroupHandlers } from "./define-ipc-group";
import { routeToServer } from "./route-to-server";
import { scopedHandler } from "./scoped-handler";

export interface ExplorerIpcDependencies {
  explorer: ExplorerService;
  remoteServers: { supportsCapability(serverId: string, capability: typeof EXPLORER_CAPABILITY): boolean };
  windowOf: (contents: WebContents) => RendererIpcWindow | null;
}

export function explorerIpcHandlers({
  explorer,
  remoteServers,
  windowOf,
}: ExplorerIpcDependencies): Pick<IpcGroupHandlers, "explorer"> {
  const watched = new Set<number>();

  function remote(_payload: unknown, serverId: string): never {
    throw new Error(
      sourceText(
        remoteServers.supportsCapability(serverId, EXPLORER_CAPABILITY)
          ? "error.explorer.clientUnsupported"
          : "error.explorer.serverUnsupported",
      ),
    );
  }

  function subscriber(contents: WebContents): string {
    const id = String(contents.id);
    if (watched.has(contents.id)) return id;
    watched.add(contents.id);
    const release = () => explorer.unwatchAll(id);
    contents.on("did-start-navigation", (details) => {
      if (details.isMainFrame && !details.isSameDocument) release();
    });
    contents.on("render-process-gone", release);
    contents.once("destroyed", () => {
      watched.delete(contents.id);
      release();
    });
    return id;
  }

  function notify(contents: WebContents): (change: ExplorerChange) => void {
    return (change) => {
      if (!contents.isDestroyed()) sendToRenderer(windowOf(contents), IPC_ENDPOINTS.explorer.changed, change);
    };
  }

  return {
    explorer: {
      roots: scopedHandler(parseExplorerScopeInput, { local: (scope) => explorer.files.roots(scope), remote }),
      list: scopedHandler(parseExplorerListInput, { local: (input) => explorer.files.list(input), remote }),
      stat: scopedHandler(parseExplorerPathInput, { local: (input) => explorer.files.stat(input), remote }),
      read: scopedHandler(parseExplorerPathInput, { local: (input) => explorer.files.read(input), remote }),
      write: scopedHandler(parseExplorerWriteInput, { local: (input) => explorer.files.write(input), remote }),
      create: scopedHandler(parseExplorerCreateInput, { local: (input) => explorer.files.create(input), remote }),
      rename: scopedHandler(parseExplorerRenameInput, { local: (input) => explorer.files.rename(input), remote }),
      trash: scopedHandler(parseExplorerPathInput, { local: (input) => explorer.files.trash(input), remote }),
      reveal: scopedHandler(parseExplorerPathInput, { local: (input) => explorer.files.reveal(input), remote }),
      watch: eventPayloadHandler(agentRequest(parseExplorerWatchInput), (event, { serverId, payload }) =>
        routeToServer(serverId, {
          local: () => explorer.watch(subscriber(event.sender), payload, notify(event.sender)),
          remote: (target) => remote(payload, target),
        }),
      ),
      unwatch: eventPayloadHandler(agentRequest(parseExplorerScopeInput), (event, { serverId, payload }) =>
        routeToServer(serverId, {
          local: () => explorer.unwatch(String(event.sender.id), payload),
          remote: () => undefined,
        }),
      ),
      gitStatus: scopedHandler(parseExplorerGitStatusInput, { local: (input) => explorer.git.status(input), remote }),
      gitLog: scopedHandler(parseExplorerGitLogInput, { local: (input) => explorer.git.log(input), remote }),
      gitCommitFiles: scopedHandler(parseExplorerGitCommitInput, {
        local: (input) => explorer.git.commitFiles(input),
        remote,
      }),
      gitDiff: scopedHandler(parseExplorerGitDiffInput, { local: (input) => explorer.git.diff(input), remote }),
    },
  };
}
