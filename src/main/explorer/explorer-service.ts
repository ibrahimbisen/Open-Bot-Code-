import {
  type ExplorerChange,
  type ExplorerRoot,
  type ExplorerScope,
  type ExplorerWatchInput,
  explorerScopeKey,
  LOCAL_SERVER_ID,
} from "@codebot/contracts/ipc";
import { createExplorerFiles } from "./explorer-files";
import { createExplorerGit } from "./explorer-git";
import { resolveRoots } from "./explorer-paths";
import { createExplorerProtocol, explorerFileUrl } from "./explorer-protocol";
import { ExplorerWatchers, type ExplorerWatchOptions } from "./explorer-watch";

export interface ExplorerServiceDependencies {
  folders: (scope: ExplorerScope) => readonly string[];
  trash: (path: string) => Promise<void>;
  reveal: (path: string) => void;
  gitSearchPath?: () => Promise<string | null>;
  watch?: ExplorerWatchOptions;
}

export function createExplorerService({ folders, trash, reveal, gitSearchPath, watch }: ExplorerServiceDependencies) {
  const roots = async (scope: ExplorerScope): Promise<ExplorerRoot[]> => resolveRoots(folders(scope));
  const watchers = new ExplorerWatchers(watch);
  return {
    files: createExplorerFiles({ roots, trash, reveal, fileUrl: explorerFileUrl }),
    git: createExplorerGit({ roots, ...(gitSearchPath ? { searchPath: gitSearchPath } : {}) }),
    fileResponse: createExplorerProtocol(roots),
    async watch(subscriber: string, input: ExplorerWatchInput, notify: (change: ExplorerChange) => void) {
      const { scope } = input;
      const watched = (await roots(scope)).map((root) => root.path);
      watchers.subscribe(explorerScopeKey(scope), subscriber, watched, input.expanded, (change) =>
        notify({ serverId: LOCAL_SERVER_ID, scope, ...change }),
      );
    },
    unwatch(subscriber: string, scope: ExplorerScope): void {
      watchers.unsubscribe(explorerScopeKey(scope), subscriber);
    },
    unwatchAll(subscriber: string): void {
      watchers.unsubscribeAll(subscriber);
    },
    close(): void {
      watchers.close();
    },
    get watcherCount(): number {
      return watchers.watcherCount;
    },
    get watchSessionCount(): number {
      return watchers.sessionCount;
    },
  };
}

export type ExplorerService = ReturnType<typeof createExplorerService>;
