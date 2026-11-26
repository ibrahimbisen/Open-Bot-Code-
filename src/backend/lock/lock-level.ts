import {
  type AgentSummary,
  isProjectAccessLevel,
  type ProjectAccessLevel,
  workspaceAccessEnforced,
} from "@codebot/contracts/ipc";
import { agentProjectContext } from "../projects/project-context";

export type LockLevel = ProjectAccessLevel;
export type EnforcedLockLevel = Exclude<LockLevel, "open">;

type LevelAgent = Pick<AgentSummary, "id" | "access">;

export function agentLockLevel(agent: LevelAgent): LockLevel {
  const project = agentProjectContext(agent.id);
  if (project && isProjectAccessLevel(project.accessLevel)) return project.accessLevel;
  return workspaceAccessEnforced(agent) ? "normal" : "open";
}

export function lockEnforced(agent: LevelAgent): boolean {
  return agentLockLevel(agent) !== "open";
}
