import { INPUT_LIMITS } from "./input-limits";
import { AGENT_FOLDER_LIMIT, isAgentAdditionalFolders } from "./ipc-agent-folders";
import {
  type AgentModelId,
  type AgentReasoningEffort,
  type AvatarColor,
  isAgentModel,
  isAvatarColor,
  isReasoningEffort,
} from "./ipc-agent-identity";
import { type AgentProviderId, isAgentProvider, isProviderAccountId } from "./ipc-agent-status";
import { isBoundedString, isIdentifier, isNullableBoundedString } from "./ipc-bounded-values";
import { isDynamicRecord, isOneOf } from "./runtime-values";

export const PROJECT_ACCESS_LEVELS = ["strict", "normal", "open"] as const;
export type ProjectAccessLevel = (typeof PROJECT_ACCESS_LEVELS)[number];
export const DEFAULT_PROJECT_ACCESS_LEVEL: ProjectAccessLevel = "normal";

export function isProjectAccessLevel(value: unknown): value is ProjectAccessLevel {
  return isOneOf(PROJECT_ACCESS_LEVELS, value);
}

export const PROJECT_LIMITS = {
  projects: 200,
  name: 80,
  instructions: 32_000,
  replyRule: 2_000,
  folders: AGENT_FOLDER_LIMIT,
  agents: 16,
} as const;

export const DEFAULT_REPLY_RULE =
  "Reply short and plain. Answer only what the user asked. No filler. Use Simplified Technical English.";

export interface ProjectRuntime {
  provider: AgentProviderId;
  model: AgentModelId;
  reasoningEffort: AgentReasoningEffort;
  providerAccountId?: string;
}

export function isProjectRuntime(value: unknown): value is ProjectRuntime {
  return (
    isDynamicRecord(value) &&
    isAgentProvider(value.provider) &&
    isAgentModel(value.model) &&
    isReasoningEffort(value.reasoningEffort) &&
    (value.providerAccountId === undefined || isProviderAccountId(value.providerAccountId))
  );
}

export interface ProjectSummary {
  id: string;
  name: string;
  color: AvatarColor | null;
  mainFolder: string;
  additionalFolders: string[];
  accessLevel: ProjectAccessLevel;
  defaultRuntime: ProjectRuntime | null;
  replyRule: string | null;
  instructions: string;
  agentIds: string[];
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export function isProjectSummary(value: unknown): value is ProjectSummary {
  return (
    isDynamicRecord(value) &&
    isIdentifier(value.id) &&
    isBoundedString(value.name, PROJECT_LIMITS.name) &&
    (value.color === null || isAvatarColor(value.color)) &&
    isBoundedString(value.mainFolder, INPUT_LIMITS.path) &&
    isAgentAdditionalFolders(value.additionalFolders) &&
    isProjectAccessLevel(value.accessLevel) &&
    (value.defaultRuntime === null || isProjectRuntime(value.defaultRuntime)) &&
    isNullableBoundedString(value.replyRule, PROJECT_LIMITS.replyRule) &&
    isBoundedString(value.instructions, PROJECT_LIMITS.instructions) &&
    Array.isArray(value.agentIds) &&
    value.agentIds.length <= PROJECT_LIMITS.agents &&
    value.agentIds.every(isIdentifier) &&
    (value.ownerId === null || isIdentifier(value.ownerId)) &&
    isBoundedString(value.createdAt, 160) &&
    isBoundedString(value.updatedAt, 160) &&
    isNullableBoundedString(value.archivedAt, 160)
  );
}

export function projectFolders(project: Pick<ProjectSummary, "mainFolder" | "additionalFolders">): string[] {
  return [project.mainFolder, ...project.additionalFolders.filter((folder) => folder !== project.mainFolder)];
}
