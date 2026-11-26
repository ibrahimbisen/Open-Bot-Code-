import type {
  AgentTask,
  AvatarColor,
  ProjectAccessLevel,
  ProjectRuntime,
  ProjectSummary,
} from "@codebot/contracts/ipc";

export const PROJECT_ACTIVITIES = ["idle", "working", "done", "needs-input", "error"] as const;
export type ProjectActivity = (typeof PROJECT_ACTIVITIES)[number];

export interface ProjectChatRef {
  projectId: string;
  agentId: string;
  chatId: string;
}

export interface ProjectChat extends ProjectChatRef {
  task: AgentTask;
  archived: boolean;
  pinned: boolean;
  runtime: ProjectRuntime | null;
}

export interface ProjectAgent {
  id: string;
  projectId: string;
  name: string;
  role: string;
  instructions: string;
  runtime: ProjectRuntime | null;
}

export interface ProjectAgentDraft {
  name: string;
  role: string;
  instructions: string;
  runtime: ProjectRuntime | null;
}

export interface CreateProjectInput {
  name: string;
  color: AvatarColor | null;
  mainFolder: string;
  additionalFolders: string[];
  accessLevel: ProjectAccessLevel;
  defaultRuntime: ProjectRuntime | null;
  firstAgent: ProjectAgentDraft;
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

export interface ProjectFolderInput {
  projectId: string;
  folder: string;
}

export interface CreateProjectAgentInput extends ProjectAgentDraft {
  projectId: string;
}

export interface UpdateProjectAgentInput extends Partial<ProjectAgentDraft> {
  projectId: string;
  agentId: string;
}

export interface ProjectAgentRef {
  projectId: string;
  agentId: string;
}

export interface ListProjectChatsInput {
  projectId: string;
  archived: boolean;
  limit: number;
}

export interface ProjectChatsPage {
  chats: ProjectChat[];
  hasMore: boolean;
}

export interface SearchProjectChatsInput {
  projectId: string | null;
  query: string;
  limit: number;
}

export interface StartProjectChatInput {
  projectId: string;
  agentId: string;
  text: string;
  attachmentDraftIds: string[];
  runtime: ProjectRuntime | null;
}

export type ProjectsChangeEvent =
  | { type: "projects-changed" }
  | { type: "chats-changed"; projectId: string }
  | { type: "activity-changed" };

export interface ProjectsPort {
  list(): Promise<ProjectSummary[]>;
  create(input: CreateProjectInput): Promise<ProjectSummary>;
  update(input: UpdateProjectInput): Promise<ProjectSummary>;
  setArchived(input: { projectId: string; archived: boolean }): Promise<ProjectSummary>;
  remove(projectId: string): Promise<void>;
  chooseFolder(): Promise<string | null>;
  addFolder(input: ProjectFolderInput): Promise<ProjectSummary>;
  removeFolder(input: ProjectFolderInput): Promise<ProjectSummary>;
  listAgents(projectId: string): Promise<ProjectAgent[]>;
  createAgent(input: CreateProjectAgentInput): Promise<ProjectSummary>;
  updateAgent(input: UpdateProjectAgentInput): Promise<void>;
  removeAgent(input: ProjectAgentRef): Promise<ProjectSummary>;
  listChats(input: ListProjectChatsInput): Promise<ProjectChatsPage>;
  searchChats(input: SearchProjectChatsInput): Promise<ProjectChat[]>;
  startChat(input: StartProjectChatInput): Promise<ProjectChat>;
  setChatArchived(input: ProjectChatRef & { archived: boolean }): Promise<void>;
  setChatPinned(input: ProjectChatRef & { pinned: boolean }): Promise<void>;
  setChatRuntime(input: ProjectChatRef & { runtime: ProjectRuntime | null }): Promise<void>;
  activity(): Promise<Record<string, ProjectActivity>>;
  onChange(listener: (event: ProjectsChangeEvent) => void): () => void;
}

export function projectChatKey(ref: Pick<ProjectChatRef, "agentId" | "chatId">): string {
  return `${ref.agentId}\u0000${ref.chatId}`;
}
