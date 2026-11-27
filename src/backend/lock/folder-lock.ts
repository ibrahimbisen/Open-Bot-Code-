import { join } from "node:path";
import { type AgentSummary, isProjectAccessLevel } from "@codebot/contracts/ipc";
import { isDynamicRecord, isString } from "@codebot/contracts/runtime-values";
import { existingAgentFolders } from "../agent/workspace-sandbox";
import { agentProjectContext } from "../projects/project-context";
import { agentLockLevel, type EnforcedLockLevel } from "./lock-level";

type LockedAgent = Pick<AgentSummary, "id" | "access" | "additionalFolders" | "excludedFolders" | "workspacePath">;

export interface FolderLock {
  readonly level: EnforcedLockLevel;
  readonly projectId: string | null;
  readonly allowedFolders: readonly string[];
  readonly excludedFolders: readonly string[];
  readonly readOnlyFolders: readonly string[];
}

const ATTACHMENT_FOLDER = "Transfers";

export function agentFolderLock(agent: LockedAgent, sharedRoot: string): FolderLock | null {
  const level = agentLockLevel(agent);
  const project = agentProjectContext(agent.id);
  if (level === "open" || !project) return null;
  return {
    level,
    projectId: project.projectId,
    allowedFolders: [...new Set([agent.workspacePath, ...existingAgentFolders(agent)])],
    excludedFolders: [...(agent.excludedFolders ?? [])],
    readOnlyFolders: [join(sharedRoot, ATTACHMENT_FOLDER)],
  };
}

export function folderLockParam(agent: LockedAgent, sharedRoot: string): { folderLock?: FolderLock } {
  const folderLock = agentFolderLock(agent, sharedRoot);
  return folderLock ? { folderLock } : {};
}

export function readFolderLock(params: unknown): FolderLock | null {
  const value = isDynamicRecord(params) ? params.folderLock : undefined;
  if (!isDynamicRecord(value)) return null;
  const level = value.level;
  if (!isProjectAccessLevel(level) || level === "open") return null;
  return {
    level,
    projectId: isString(value.projectId) ? value.projectId : null,
    allowedFolders: strings(value.allowedFolders),
    excludedFolders: strings(value.excludedFolders),
    readOnlyFolders: strings(value.readOnlyFolders),
  };
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter(isString) : [];
}
