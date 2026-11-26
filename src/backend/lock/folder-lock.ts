import { join } from "node:path";
import {
  type AgentSummary,
  isProjectAccessLevel,
  type ProjectAccessLevel,
  workspaceAccessEnforced,
} from "@codebot/contracts/ipc";
import { isDynamicRecord, isString } from "@codebot/contracts/runtime-values";
import { workspaceWritableRoots } from "../agent/workspace-sandbox";
import { agentProjectContext } from "../projects/project-context";

export type LockLevel = ProjectAccessLevel;
export type EnforcedLockLevel = Exclude<LockLevel, "open">;

type LevelAgent = Pick<AgentSummary, "id" | "access">;
type LockedAgent = Pick<AgentSummary, "id" | "access" | "additionalFolders" | "excludedFolders" | "workspacePath">;

export interface FolderLock {
  readonly level: EnforcedLockLevel;
  readonly projectId: string | null;
  readonly allowedFolders: readonly string[];
  readonly excludedFolders: readonly string[];
  readonly readOnlyFolders: readonly string[];
}

const ATTACHMENT_FOLDER = "Transfers";

export function agentLockLevel(agent: LevelAgent): LockLevel {
  const project = agentProjectContext(agent.id);
  const enforced = workspaceAccessEnforced(agent);
  if (!project || project.accessLevel === "open") return enforced ? "normal" : "open";
  return project.accessLevel;
}

export function lockEnforced(agent: LevelAgent): boolean {
  return agentLockLevel(agent) !== "open";
}

export function agentFolderLock(agent: LockedAgent, sharedRoot: string): FolderLock | null {
  const level = agentLockLevel(agent);
  if (level === "open") return null;
  return {
    level,
    projectId: agentProjectContext(agent.id)?.projectId ?? null,
    allowedFolders: [...new Set([agent.workspacePath, ...workspaceWritableRoots(agent, sharedRoot)])],
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

const sessionLocks = new Map<string, string>();

function lockKey(agent: LockedAgent, sharedRoot: string): string {
  return JSON.stringify(agentFolderLock(agent, sharedRoot));
}

export function rememberSessionLock(externalThreadId: string, agent: LockedAgent, sharedRoot: string): void {
  sessionLocks.set(externalThreadId, lockKey(agent, sharedRoot));
}

export function sessionLockChanged(externalThreadId: string, agent: LockedAgent, sharedRoot: string): boolean {
  const remembered = sessionLocks.get(externalThreadId);
  return remembered !== undefined && remembered !== lockKey(agent, sharedRoot);
}

export function forgetSessionLock(externalThreadId: string): void {
  sessionLocks.delete(externalThreadId);
}
