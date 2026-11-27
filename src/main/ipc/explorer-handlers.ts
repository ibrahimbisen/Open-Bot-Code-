import {
  type ExplorerChange,
  type ExplorerFile,
  IPC_ENDPOINTS,
  isExplorerDirectory,
  isExplorerEntry,
  isExplorerEntryOrNull,
  isExplorerFile,
  isExplorerGitCommitFiles,
  isExplorerGitDiff,
  isExplorerGitLog,
  isExplorerGitStatus,
  isExplorerRoots,
  isExplorerWriteResult,
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
import { guardedDecoder } from "@codebot/contracts/ipc-decoding";
import {
  EXPLORER_CAPABILITY,
  EXPLORER_ROUTES,
  type ExplorerOperation,
} from "@codebot/contracts/team-protocol/explorer-v1";
import { sourceText } from "@codebot/i18n/source";
import type { Effect } from "effect";
import type { WebContents } from "electron";
import { runCauseEffect } from "../../backend/effect-boundary";
import type { ExplorerService } from "../explorer/explorer-service";
import type { ResponseDecoder } from "../remote-host-decoding";
import type { RemoteRequestInit } from "../remote-server-client";
import type { RemoteWorkflowError } from "../remote-service-effects";
import { type RendererIpcWindow, sendToRenderer } from "../renderer-ipc";
import { agentRequest } from "./agent-inputs";
import { eventPayloadHandler, type IpcGroupHandlers } from "./define-ipc-group";
import { routeToServer } from "./route-to-server";
import { scopedHandler } from "./scoped-handler";

export interface ExplorerIpcDependencies {
  explorer: ExplorerService;
  remoteServers: {
    supportsCapability(serverId: string, capability: typeof EXPLORER_CAPABILITY): boolean;
    request<T>(
      serverId: string,
      path: string,
      decoder: ResponseDecoder<T>,
      init?: RemoteRequestInit,
    ): Effect.Effect<T, RemoteWorkflowError>;
  };
  windowOf: (contents: WebContents) => RendererIpcWindow | null;
}

const decodeRoots = guardedDecoder(isExplorerRoots, "explorer roots response");
const decodeDirectory = guardedDecoder(isExplorerDirectory, "explorer directory response");
const decodeEntryOrNull = guardedDecoder(isExplorerEntryOrNull, "explorer entry response");
const decodeEntry = guardedDecoder(isExplorerEntry, "explorer entry response");
const decodeWrite = guardedDecoder(isExplorerWriteResult, "explorer write response");
const decodeGitStatus = guardedDecoder(isExplorerGitStatus, "explorer git status response");
const decodeGitLog = guardedDecoder(isExplorerGitLog, "explorer git log response");
const decodeGitCommitFiles = guardedDecoder(isExplorerGitCommitFiles, "explorer git commit response");
const decodeGitDiff = guardedDecoder(isExplorerGitDiff, "explorer git diff response");
const decodeNothing = (): void => undefined;
const decodeExplorerFile = guardedDecoder(isExplorerFile, "explorer file response");
const decodeFile: ResponseDecoder<ExplorerFile> = (value) => ({ ...decodeExplorerFile(value), url: null });

export function explorerIpcHandlers({
  explorer,
  remoteServers,
  windowOf,
}: ExplorerIpcDependencies): Pick<IpcGroupHandlers, "explorer"> {
  const watched = new Set<number>();

  function remote<T>(
    serverId: string,
    operation: ExplorerOperation,
    decoder: ResponseDecoder<T>,
    input: unknown,
  ): Promise<T> {
    if (!remoteServers.supportsCapability(serverId, EXPLORER_CAPABILITY))
      throw new Error(sourceText("error.explorer.serverUnsupported"));
    return runCauseEffect(
      remoteServers.request(serverId, EXPLORER_ROUTES[operation], decoder, { method: "POST", body: { input } }),
    );
  }

  function unsupportedRemote(): never {
    throw new Error(sourceText("error.explorer.clientUnsupported"));
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
      roots: scopedHandler(parseExplorerScopeInput, {
        local: (scope) => explorer.files.roots(scope),
        remote: (input, serverId) => remote(serverId, "roots", decodeRoots, input),
      }),
      list: scopedHandler(parseExplorerListInput, {
        local: (input) => explorer.files.list(input),
        remote: (input, serverId) => remote(serverId, "list", decodeDirectory, input),
      }),
      stat: scopedHandler(parseExplorerPathInput, {
        local: (input) => explorer.files.stat(input),
        remote: (input, serverId) => remote(serverId, "stat", decodeEntryOrNull, input),
      }),
      read: scopedHandler(parseExplorerPathInput, {
        local: (input) => explorer.files.read(input),
        remote: (input, serverId) => remote(serverId, "read", decodeFile, input),
      }),
      write: scopedHandler(parseExplorerWriteInput, {
        local: (input) => explorer.files.write(input),
        remote: (input, serverId) => remote(serverId, "write", decodeWrite, input),
      }),
      create: scopedHandler(parseExplorerCreateInput, {
        local: (input) => explorer.files.create(input),
        remote: (input, serverId) => remote(serverId, "create", decodeEntry, input),
      }),
      rename: scopedHandler(parseExplorerRenameInput, {
        local: (input) => explorer.files.rename(input),
        remote: (input, serverId) => remote(serverId, "rename", decodeEntry, input),
      }),
      trash: scopedHandler(parseExplorerPathInput, {
        local: (input) => explorer.files.trash(input),
        remote: (input, serverId) => remote(serverId, "trash", decodeNothing, input),
      }),
      reveal: scopedHandler(parseExplorerPathInput, {
        local: (input) => explorer.files.reveal(input),
        remote: unsupportedRemote,
      }),
      watch: eventPayloadHandler(agentRequest(parseExplorerWatchInput), (event, { serverId, payload }) =>
        routeToServer(serverId, {
          local: () => explorer.watch(subscriber(event.sender), payload, notify(event.sender)),
          remote: () => undefined,
        }),
      ),
      unwatch: eventPayloadHandler(agentRequest(parseExplorerScopeInput), (event, { serverId, payload }) =>
        routeToServer(serverId, {
          local: () => explorer.unwatch(String(event.sender.id), payload),
          remote: () => undefined,
        }),
      ),
      gitStatus: scopedHandler(parseExplorerGitStatusInput, {
        local: (input) => explorer.git.status(input),
        remote: (input, serverId) => remote(serverId, "gitStatus", decodeGitStatus, input),
      }),
      gitLog: scopedHandler(parseExplorerGitLogInput, {
        local: (input) => explorer.git.log(input),
        remote: (input, serverId) => remote(serverId, "gitLog", decodeGitLog, input),
      }),
      gitCommitFiles: scopedHandler(parseExplorerGitCommitInput, {
        local: (input) => explorer.git.commitFiles(input),
        remote: (input, serverId) => remote(serverId, "gitCommitFiles", decodeGitCommitFiles, input),
      }),
      gitDiff: scopedHandler(parseExplorerGitDiffInput, {
        local: (input) => explorer.git.diff(input),
        remote: (input, serverId) => remote(serverId, "gitDiff", decodeGitDiff, input),
      }),
    },
  };
}
