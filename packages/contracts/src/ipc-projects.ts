import { INPUT_LIMITS } from "./input-limits";
import { AGENT_FOLDER_LIMIT, isAgentAdditionalFolders } from "./ipc-agent-folders";
import {
  type AgentModelId,
  type AgentReasoningEffort,
  type AvatarColor,
  type AvatarHue,
  isAgentModel,
  isAvatarColor,
  isAvatarHue,
  isAvatarSeed,
  isReasoningEffort,
} from "./ipc-agent-identity";
import { type AgentProviderId, isAgentProvider, isProviderAccountId } from "./ipc-agent-status";
import { AGENT_TASK_HOLDS, type AgentTaskHold } from "./ipc-agent-tasks";
import { integerInRange, isBoundedString, isIdentifier, isNullableBoundedString } from "./ipc-bounded-values";
import { isBoolean, isDynamicRecord, isOneOf } from "./runtime-values";

export const PROJECTS_CAPABILITY = "projects-v1";

export const PROJECT_ACCESS_LEVELS = ["strict", "normal", "open"] as const;
export type ProjectAccessLevel = (typeof PROJECT_ACCESS_LEVELS)[number];
export const DEFAULT_PROJECT_ACCESS_LEVEL: ProjectAccessLevel = "normal";

export function isProjectAccessLevel(value: unknown): value is ProjectAccessLevel {
  return isOneOf(PROJECT_ACCESS_LEVELS, value);
}

export const PROJECT_LIMITS = {
  projects: INPUT_LIMITS.agents,
  name: 80,
  instructions: 32_000,
  replyRule: 2_000,
  folders: AGENT_FOLDER_LIMIT,
  agents: 16,
  agentName: INPUT_LIMITS.agentName,
  agentRole: INPUT_LIMITS.agentTitle,
  agentInstructions: INPUT_LIMITS.agentInstructionsFile,
  chatsPage: 100,
  chatCursor: 512,
  searchQuery: 200,
  searchExcerpt: 320,
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

export function isProjectSummaryList(value: unknown): value is ProjectSummary[] {
  return Array.isArray(value) && value.length <= PROJECT_LIMITS.projects && value.every(isProjectSummary);
}

export function projectFolders(project: Pick<ProjectSummary, "mainFolder" | "additionalFolders">): string[] {
  return [project.mainFolder, ...project.additionalFolders.filter((folder) => folder !== project.mainFolder)];
}

export interface ProjectAgent {
  id: string;
  projectId: string;
  name: string;
  role: string;
  instructions: string;
  runtime: ProjectRuntime;
  avatarSeed: string;
  avatarHue: AvatarHue | null;
  avatarColor: AvatarColor | null;
  chatCount: number;
}

export function isProjectAgent(value: unknown): value is ProjectAgent {
  return (
    isDynamicRecord(value) &&
    isIdentifier(value.id) &&
    isIdentifier(value.projectId) &&
    isBoundedString(value.name, PROJECT_LIMITS.agentName) &&
    isBoundedString(value.role, PROJECT_LIMITS.agentRole) &&
    isBoundedString(value.instructions, PROJECT_LIMITS.agentInstructions) &&
    isProjectRuntime(value.runtime) &&
    isAvatarSeed(value.avatarSeed) &&
    (value.avatarHue === null || isAvatarHue(value.avatarHue)) &&
    (value.avatarColor === null || isAvatarColor(value.avatarColor)) &&
    integerInRange(value.chatCount, 0, Number.MAX_SAFE_INTEGER)
  );
}

export interface ProjectFolderState {
  path: string;
  main: boolean;
  found: boolean;
}

function isProjectFolderState(value: unknown): value is ProjectFolderState {
  return (
    isDynamicRecord(value) &&
    isBoundedString(value.path, INPUT_LIMITS.path) &&
    isBoolean(value.main) &&
    isBoolean(value.found)
  );
}

export interface ProjectDetail {
  project: ProjectSummary;
  agents: ProjectAgent[];
  folders: ProjectFolderState[];
}

export function isProjectDetail(value: unknown): value is ProjectDetail {
  return (
    isDynamicRecord(value) &&
    isProjectSummary(value.project) &&
    Array.isArray(value.agents) &&
    value.agents.length <= PROJECT_LIMITS.agents &&
    value.agents.every(isProjectAgent) &&
    Array.isArray(value.folders) &&
    value.folders.length <= PROJECT_LIMITS.folders + 1 &&
    value.folders.every(isProjectFolderState)
  );
}

export interface ProjectAgentInput {
  name: string;
  role: string;
  instructions?: string;
  runtime?: ProjectRuntime | null;
}

export interface CreateProjectInput {
  name: string;
  mainFolder: string;
  additionalFolders?: string[];
  accessLevel?: ProjectAccessLevel;
  color?: AvatarColor | null;
  defaultRuntime?: ProjectRuntime | null;
  replyRule?: string | null;
  instructions?: string;
  agents?: ProjectAgentInput[];
  operationId?: string;
}

export interface UpdateProjectInput {
  projectId: string;
  name?: string;
  color?: AvatarColor | null;
  mainFolder?: string;
  accessLevel?: ProjectAccessLevel;
  defaultRuntime?: ProjectRuntime | null;
  replyRule?: string | null;
  instructions?: string;
}

export interface CreateProjectAgentInput extends ProjectAgentInput {
  projectId: string;
}

export interface UpdateProjectAgentInput {
  projectId: string;
  agentId: string;
  name?: string;
  role?: string;
  instructions?: string;
  runtime?: ProjectRuntime;
}

export interface ProjectAgentRef {
  projectId: string;
  agentId: string;
}

export interface ProjectFolderInput {
  projectId: string;
  path: string;
}

export const PROJECT_FOLDER_REFUSALS = ["protected", "missing", "limit", "contains-main", "main"] as const;
export type ProjectFolderRefusal = (typeof PROJECT_FOLDER_REFUSALS)[number];

export type ProjectFolderChange =
  | { outcome: "added"; path: string; replaced: string[]; detail: ProjectDetail }
  | { outcome: "removed"; path: string; detail: ProjectDetail }
  | { outcome: "covered"; path: string; folder: string; detail: ProjectDetail }
  | { outcome: "refused"; path: string; refusal: ProjectFolderRefusal; detail: ProjectDetail };

export function isProjectFolderChange(value: unknown): value is ProjectFolderChange {
  if (!isDynamicRecord(value) || !isBoundedString(value.path, INPUT_LIMITS.path) || !isProjectDetail(value.detail))
    return false;
  if (value.outcome === "added") return isAgentAdditionalFolders(value.replaced);
  if (value.outcome === "removed") return true;
  if (value.outcome === "covered") return isBoundedString(value.folder, INPUT_LIMITS.path);
  return value.outcome === "refused" && isOneOf(PROJECT_FOLDER_REFUSALS, value.refusal);
}

export interface ChooseProjectFolderInput {
  projectId?: string;
}

export const PROJECT_FOLDER_CHOICE_REFUSALS = ["protected", "missing"] as const;
export type ProjectFolderChoiceRefusal = (typeof PROJECT_FOLDER_CHOICE_REFUSALS)[number];

export type ProjectFolderChoice =
  | { outcome: "cancelled" }
  | { outcome: "chosen"; path: string }
  | { outcome: "refused"; path: string; refusal: ProjectFolderChoiceRefusal };

export function isProjectFolderChoice(value: unknown): value is ProjectFolderChoice {
  if (!isDynamicRecord(value)) return false;
  if (value.outcome === "cancelled") return true;
  if (!isBoundedString(value.path, INPUT_LIMITS.path)) return false;
  if (value.outcome === "chosen") return true;
  return value.outcome === "refused" && isOneOf(PROJECT_FOLDER_CHOICE_REFUSALS, value.refusal);
}

export const PROJECT_ACTIVITY_STATES = ["idle", "working", "done", "needs-input", "error"] as const;
export type ProjectActivityState = (typeof PROJECT_ACTIVITY_STATES)[number];

const ACTIVITY_PRIORITY: readonly ProjectActivityState[] = ["needs-input", "error", "working", "done", "idle"];

export function projectActivityState(states: Iterable<ProjectActivityState>): ProjectActivityState {
  const present = new Set(states);
  return ACTIVITY_PRIORITY.find((state) => present.has(state)) ?? "idle";
}

export const PROJECT_CHAT_STATES = ["idle", "queued", "running"] as const;
export type ProjectChatState = (typeof PROJECT_CHAT_STATES)[number];

export interface ProjectChat {
  projectId: string;
  agentId: string;
  taskId: string;
  threadId: string;
  title: string;
  state: ProjectChatState;
  activity: ProjectActivityState;
  hold: AgentTaskHold | null;
  error: string | null;
  unreadCount: number;
  archived: boolean;
  pinned: boolean;
  runtime: ProjectRuntime | null;
  createdAt: string;
  updatedAt: string;
}

export function isProjectChat(value: unknown): value is ProjectChat {
  return (
    isDynamicRecord(value) &&
    isIdentifier(value.projectId) &&
    isIdentifier(value.agentId) &&
    isIdentifier(value.taskId) &&
    isIdentifier(value.threadId) &&
    isBoundedString(value.title, INPUT_LIMITS.agentTaskTitle) &&
    isOneOf(PROJECT_CHAT_STATES, value.state) &&
    isOneOf(PROJECT_ACTIVITY_STATES, value.activity) &&
    (value.hold === null || isOneOf(AGENT_TASK_HOLDS, value.hold)) &&
    isNullableBoundedString(value.error, INPUT_LIMITS.agentTaskError) &&
    integerInRange(value.unreadCount, 0, Number.MAX_SAFE_INTEGER) &&
    isBoolean(value.archived) &&
    isBoolean(value.pinned) &&
    (value.runtime === null || isProjectRuntime(value.runtime)) &&
    isBoundedString(value.createdAt, 160) &&
    isBoundedString(value.updatedAt, 160)
  );
}

export const PROJECT_CHAT_ARCHIVE_FILTERS = ["exclude", "include", "only"] as const;
export type ProjectChatArchiveFilter = (typeof PROJECT_CHAT_ARCHIVE_FILTERS)[number];

export interface ListProjectChatsInput {
  projectId: string;
  cursor?: string;
  limit?: number;
  archived?: ProjectChatArchiveFilter;
}

export interface ProjectChatsPage {
  chats: ProjectChat[];
  nextCursor: string | null;
}

export function isProjectChatsPage(value: unknown): value is ProjectChatsPage {
  return (
    isDynamicRecord(value) &&
    Array.isArray(value.chats) &&
    value.chats.length <= PROJECT_LIMITS.chatsPage &&
    value.chats.every(isProjectChat) &&
    isNullableBoundedString(value.nextCursor, PROJECT_LIMITS.chatCursor)
  );
}

export interface SearchProjectChatsInput {
  query: string;
  projectId?: string;
  cursor?: string;
  limit?: number;
}

export const PROJECT_CHAT_MATCH_KINDS = ["title", "message"] as const;
export type ProjectChatMatchKind = (typeof PROJECT_CHAT_MATCH_KINDS)[number];

export interface ProjectChatMatch {
  chat: ProjectChat;
  kind: ProjectChatMatchKind;
  messageId: string | null;
  excerpt: string;
  createdAt: string | null;
}

export function isProjectChatMatch(value: unknown): value is ProjectChatMatch {
  return (
    isDynamicRecord(value) &&
    isProjectChat(value.chat) &&
    isOneOf(PROJECT_CHAT_MATCH_KINDS, value.kind) &&
    (value.messageId === null || isIdentifier(value.messageId)) &&
    isBoundedString(value.excerpt, PROJECT_LIMITS.searchExcerpt) &&
    isNullableBoundedString(value.createdAt, 160)
  );
}

export interface ProjectChatSearchPage {
  matches: ProjectChatMatch[];
  nextCursor: string | null;
}

export function isProjectChatSearchPage(value: unknown): value is ProjectChatSearchPage {
  return (
    isDynamicRecord(value) &&
    Array.isArray(value.matches) &&
    value.matches.length <= PROJECT_LIMITS.chatsPage &&
    value.matches.every(isProjectChatMatch) &&
    isNullableBoundedString(value.nextCursor, PROJECT_LIMITS.chatCursor)
  );
}

export interface StartProjectChatInput {
  projectId: string;
  agentId: string;
  text: string;
  attachmentDraftIds?: string[];
  clientMessageId?: string;
}

export interface ProjectChatRef {
  agentId: string;
  taskId: string;
}

export interface SetProjectChatArchivedInput extends ProjectChatRef {
  archived: boolean;
}

export interface SetProjectChatPinnedInput extends ProjectChatRef {
  pinned: boolean;
}

export interface ProjectActivity {
  projectId: string;
  state: ProjectActivityState;
  working: number;
  done: number;
  needsInput: number;
  error: number;
}

export function isProjectActivity(value: unknown): value is ProjectActivity {
  return (
    isDynamicRecord(value) &&
    isIdentifier(value.projectId) &&
    isOneOf(PROJECT_ACTIVITY_STATES, value.state) &&
    integerInRange(value.working, 0, Number.MAX_SAFE_INTEGER) &&
    integerInRange(value.done, 0, Number.MAX_SAFE_INTEGER) &&
    integerInRange(value.needsInput, 0, Number.MAX_SAFE_INTEGER) &&
    integerInRange(value.error, 0, Number.MAX_SAFE_INTEGER)
  );
}

export function isProjectActivityList(value: unknown): value is ProjectActivity[] {
  return Array.isArray(value) && value.length <= PROJECT_LIMITS.projects && value.every(isProjectActivity);
}

export function emptyProjectActivity(projectId: string): ProjectActivity {
  return { projectId, state: "idle", working: 0, done: 0, needsInput: 0, error: 0 };
}

export interface ProjectsChangedEvent {
  serverId: string;
  projectId: string | null;
  projects: ProjectSummary[];
}

export function isProjectsChangedEvent(value: unknown): value is ProjectsChangedEvent {
  return (
    isDynamicRecord(value) &&
    isIdentifier(value.serverId) &&
    (value.projectId === null || isIdentifier(value.projectId)) &&
    isProjectSummaryList(value.projects)
  );
}

export interface ProjectChatsChangedEvent {
  serverId: string;
  projectId: string;
  chats: ProjectChat[];
  removedTaskIds: string[];
}

export function isProjectChatsChangedEvent(value: unknown): value is ProjectChatsChangedEvent {
  return (
    isDynamicRecord(value) &&
    isIdentifier(value.serverId) &&
    isIdentifier(value.projectId) &&
    Array.isArray(value.chats) &&
    value.chats.length <= PROJECT_LIMITS.chatsPage &&
    value.chats.every(isProjectChat) &&
    Array.isArray(value.removedTaskIds) &&
    value.removedTaskIds.length <= PROJECT_LIMITS.chatsPage &&
    value.removedTaskIds.every(isIdentifier)
  );
}

export interface ProjectActivityChangedEvent {
  serverId: string;
  activity: ProjectActivity[];
}

export function isProjectActivityChangedEvent(value: unknown): value is ProjectActivityChangedEvent {
  return isDynamicRecord(value) && isIdentifier(value.serverId) && isProjectActivityList(value.activity);
}
