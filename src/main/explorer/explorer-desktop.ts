import { shell } from "electron";
import { agentLaunchPath } from "../../backend/cli";
import { runCauseEffect } from "../../backend/effect-boundary";
import { type ExplorerAgentSource, explorerScopeFolders } from "./explorer-roots";
import { createExplorerService, type ExplorerService } from "./explorer-service";

export function createDesktopExplorer(agents: ExplorerAgentSource): ExplorerService {
  return createExplorerService({
    folders: (scope) => explorerScopeFolders(scope, agents),
    trash: (path) => shell.trashItem(path),
    reveal: (path) => shell.showItemInFolder(path),
    gitSearchPath: () => runCauseEffect(agentLaunchPath()),
  });
}
