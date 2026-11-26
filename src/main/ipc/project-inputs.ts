import { INPUT_LIMITS } from "@codebot/contracts/input-limits";
import {
  type ChooseProjectFolderInput,
  type CreateProjectAgentInput,
  type CreateProjectInput,
  isAvatarColor,
  isProjectAccessLevel,
  isProjectRuntime,
  type ListProjectChatsInput,
  PROJECT_CHAT_ARCHIVE_FILTERS,
  PROJECT_LIMITS,
  type ProjectAgentInput,
  type ProjectAgentRef,
  type ProjectChatRef,
  type ProjectFolderInput,
  type ProjectRuntime,
  type SearchProjectChatsInput,
  type SetProjectChatArchivedInput,
  type SetProjectChatPinnedInput,
  type StartProjectChatInput,
  type UpdateProjectAgentInput,
  type UpdateProjectInput,
} from "@codebot/contracts/ipc";
import { type DynamicRecord, isBoolean, isNumber, isOneOf, isString } from "@codebot/contracts/runtime-values";
import { sourceText } from "@codebot/i18n/source";
import { parseStartAgentTask } from "./agent-inputs";
import { isObject, requireString } from "./validation";

export function parseProjectId(value: unknown): string {
  return requireString(value, "projectId", INPUT_LIMITS.identifier);
}

function projectName(value: unknown): string {
  if (!isString(value) || !value.trim()) throw new Error(sourceText("error.project.nameRequired"));
  if (value.trim().length > PROJECT_LIMITS.name) throw new Error("name is too long.");
  return value.trim();
}

function agentName(value: unknown): string {
  if (!isString(value) || !value.trim()) throw new Error(sourceText("error.project.agentNameRequired"));
  if (value.trim().length > PROJECT_LIMITS.agentName) throw new Error("name is too long.");
  return value.trim();
}

function folderPath(value: unknown, field: string): string {
  return requireString(value, field, INPUT_LIMITS.path);
}

function limitedText(value: unknown, field: string, limit: number): string {
  if (!isString(value)) throw new Error(`Invalid ${field}.`);
  if (value.length > limit) throw new Error(`${field} is too long.`);
  return value;
}

function runtime(value: unknown): ProjectRuntime {
  if (!isProjectRuntime(value)) throw new Error("Invalid runtime.");
  return {
    provider: value.provider,
    model: value.model,
    reasoningEffort: value.reasoningEffort,
    ...(value.providerAccountId === undefined ? {} : { providerAccountId: value.providerAccountId }),
  };
}

function projectFields(value: DynamicRecord): Omit<UpdateProjectInput, "projectId" | "mainFolder" | "name"> {
  const fields: Omit<UpdateProjectInput, "projectId" | "mainFolder" | "name"> = {};
  if (value.color !== undefined) {
    if (value.color !== null && !isAvatarColor(value.color)) throw new Error("Invalid color.");
    fields.color = value.color;
  }
  if (value.accessLevel !== undefined) {
    if (!isProjectAccessLevel(value.accessLevel)) throw new Error("Invalid access level.");
    fields.accessLevel = value.accessLevel;
  }
  if (value.defaultRuntime !== undefined)
    fields.defaultRuntime = value.defaultRuntime === null ? null : runtime(value.defaultRuntime);
  if (value.replyRule !== undefined) {
    const rule = value.replyRule === null ? "" : limitedText(value.replyRule, "replyRule", PROJECT_LIMITS.replyRule);
    fields.replyRule = rule.trim() ? rule : null;
  }
  if (value.instructions !== undefined)
    fields.instructions = limitedText(value.instructions, "instructions", PROJECT_LIMITS.instructions);
  return fields;
}

function agentInput(value: unknown): ProjectAgentInput {
  if (!isObject(value)) throw new Error("Invalid project agent.");
  return {
    name: agentName(value.name),
    role: limitedText(value.role ?? "", "role", PROJECT_LIMITS.agentRole).trim(),
    ...(value.instructions === undefined
      ? {}
      : { instructions: limitedText(value.instructions, "instructions", PROJECT_LIMITS.agentInstructions) }),
    ...(value.runtime === undefined ? {} : { runtime: value.runtime === null ? null : runtime(value.runtime) }),
  };
}

export function parseCreateProject(value: unknown): CreateProjectInput {
  if (!isObject(value)) throw new Error("Invalid project creation request.");
  const folders = value.additionalFolders ?? [];
  if (!Array.isArray(folders) || folders.length > PROJECT_LIMITS.folders) throw new Error("Invalid folders.");
  const agents = value.agents ?? [];
  if (!Array.isArray(agents) || agents.length > PROJECT_LIMITS.agents)
    throw new Error(sourceText("error.project.agentLimit", { limit: PROJECT_LIMITS.agents }));
  return {
    name: projectName(value.name),
    mainFolder: folderPath(value.mainFolder, "mainFolder"),
    additionalFolders: folders.map((folder) => folderPath(folder, "folder")),
    ...projectFields(value),
    agents: agents.map(agentInput),
    ...(value.operationId === undefined
      ? {}
      : { operationId: requireString(value.operationId, "operationId", INPUT_LIMITS.identifier) }),
  };
}

export function parseUpdateProject(value: unknown): UpdateProjectInput {
  if (!isObject(value)) throw new Error("Invalid project update request.");
  const fields: UpdateProjectInput = { projectId: parseProjectId(value.projectId), ...projectFields(value) };
  if (value.name !== undefined) fields.name = projectName(value.name);
  if (value.mainFolder !== undefined) fields.mainFolder = folderPath(value.mainFolder, "mainFolder");
  if (Object.keys(fields).length === 1) throw new Error("A project update is required.");
  return fields;
}

export function parseChooseProjectFolder(value: unknown): ChooseProjectFolderInput {
  if (value === undefined || value === null) return {};
  if (!isObject(value)) throw new Error("Invalid project folder request.");
  return value.projectId === undefined ? {} : { projectId: parseProjectId(value.projectId) };
}

export function parseProjectFolder(value: unknown): ProjectFolderInput {
  if (!isObject(value)) throw new Error("Invalid project folder request.");
  return { projectId: parseProjectId(value.projectId), path: folderPath(value.path, "path") };
}

export function parseCreateProjectAgent(value: unknown): CreateProjectAgentInput {
  if (!isObject(value)) throw new Error("Invalid project agent.");
  return { projectId: parseProjectId(value.projectId), ...agentInput(value) };
}

export function parseProjectAgentRef(value: unknown): ProjectAgentRef {
  if (!isObject(value)) throw new Error("Invalid project agent.");
  return {
    projectId: parseProjectId(value.projectId),
    agentId: requireString(value.agentId, "agentId", INPUT_LIMITS.identifier),
  };
}

export function parseUpdateProjectAgent(value: unknown): UpdateProjectAgentInput {
  const fields: UpdateProjectAgentInput = parseProjectAgentRef(value);
  if (!isObject(value)) throw new Error("Invalid project agent.");
  if (value.name !== undefined) fields.name = agentName(value.name);
  if (value.role !== undefined) fields.role = limitedText(value.role, "role", PROJECT_LIMITS.agentRole).trim();
  if (value.instructions !== undefined)
    fields.instructions = limitedText(value.instructions, "instructions", PROJECT_LIMITS.agentInstructions);
  if (value.runtime !== undefined) fields.runtime = runtime(value.runtime);
  if (Object.keys(fields).length === 2) throw new Error("A project agent update is required.");
  return fields;
}

function pageLimit(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (!isNumber(value) || !Number.isInteger(value) || value < 1 || value > PROJECT_LIMITS.chatsPage)
    throw new Error(`The page limit must be between 1 and ${PROJECT_LIMITS.chatsPage}.`);
  return value;
}

function pageCursor(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  return requireString(value, "cursor", PROJECT_LIMITS.chatCursor);
}

function page(value: DynamicRecord): { cursor?: string; limit?: number } {
  const cursor = pageCursor(value.cursor);
  const limit = pageLimit(value.limit);
  return { ...(cursor === undefined ? {} : { cursor }), ...(limit === undefined ? {} : { limit }) };
}

export function parseListProjectChats(value: unknown): ListProjectChatsInput {
  if (!isObject(value)) throw new Error("Invalid project chats request.");
  if (value.archived !== undefined && !isOneOf(PROJECT_CHAT_ARCHIVE_FILTERS, value.archived))
    throw new Error("Invalid archive filter.");
  return {
    projectId: parseProjectId(value.projectId),
    ...page(value),
    ...(value.archived === undefined ? {} : { archived: value.archived }),
  };
}

export function parseSearchProjectChats(value: unknown): SearchProjectChatsInput {
  if (!isObject(value)) throw new Error("Invalid project chat search request.");
  const query = requireString(value.query, "query", PROJECT_LIMITS.searchQuery).trim();
  if (!query) throw new Error(sourceText("error.agent.searchQueryRequired"));
  return {
    query,
    ...(value.projectId === undefined ? {} : { projectId: parseProjectId(value.projectId) }),
    ...page(value),
  };
}

export function parseProjectChatRef(value: unknown): ProjectChatRef {
  if (!isObject(value)) throw new Error("Invalid project chat request.");
  return {
    agentId: requireString(value.agentId, "agentId", INPUT_LIMITS.identifier),
    taskId: requireString(value.taskId, "taskId", INPUT_LIMITS.identifier),
  };
}

export function parseStartProjectChat(value: unknown): StartProjectChatInput {
  if (!isObject(value)) throw new Error("Invalid project chat request.");
  return { projectId: parseProjectId(value.projectId), ...parseStartAgentTask(value) };
}

export function parseSetProjectChatArchived(value: unknown): SetProjectChatArchivedInput {
  const chat = parseProjectChatRef(value);
  if (!isObject(value) || !isBoolean(value.archived)) throw new Error("archived must be a boolean.");
  return { ...chat, archived: value.archived };
}

export function parseSetProjectChatPinned(value: unknown): SetProjectChatPinnedInput {
  const chat = parseProjectChatRef(value);
  if (!isObject(value) || !isBoolean(value.pinned)) throw new Error("pinned must be a boolean.");
  return { ...chat, pinned: value.pinned };
}
