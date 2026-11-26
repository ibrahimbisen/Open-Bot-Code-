import type { AgentSummary, ExplorerScope } from "@codebot/contracts/ipc";
import { sourceText } from "@codebot/i18n/source";
import { effectiveAgentFolders } from "../../backend/agent/workspace-sandbox";
import { agentProjectContext } from "../../backend/projects/project-context";

export interface ExplorerAgentSource {
  listAgents(): readonly Pick<AgentSummary, "id" | "workspacePath" | "additionalFolders">[];
}

export function explorerScopeFolders(scope: ExplorerScope, agents: ExplorerAgentSource): string[] {
  const project = agentProjectContext(scope.agentId);
  if (project) return [project.mainFolder, ...project.folders];
  const agent = agents.listAgents().find((candidate) => candidate.id === scope.agentId);
  if (!agent) throw new Error(sourceText("error.explorer.unknownAgent"));
  return [agent.workspacePath, ...effectiveAgentFolders(agent)];
}
