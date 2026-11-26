import type { ProjectAccessLevel, ProjectRuntime } from "@codebot/contracts/ipc";

export interface AgentProjectContext {
  projectId: string;
  projectName: string;
  mainFolder: string;
  folders: readonly string[];
  accessLevel: ProjectAccessLevel;
  replyRule: string | null;
  instructions: string;
}

type AgentProjectContextSource = (agentId: string) => AgentProjectContext | null;

let contextOf: AgentProjectContextSource = () => null;

export function setAgentProjectContextSource(source: AgentProjectContextSource): void {
  contextOf = source;
}

export function agentProjectContext(agentId: string): AgentProjectContext | null {
  return contextOf(agentId);
}

type ChatRuntimeSource = (agentId: string, taskId: string) => ProjectRuntime | null;

let chatRuntimeOf: ChatRuntimeSource = () => null;

export function setChatRuntimeSource(source: ChatRuntimeSource): void {
  chatRuntimeOf = source;
}

export function chatRuntimeOverride(agentId: string, taskId: string): ProjectRuntime | null {
  return chatRuntimeOf(agentId, taskId);
}
