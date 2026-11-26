import type {
  ConversationMessageSender,
  CreateProjectAgentInput,
  CreateProjectInput,
  ListProjectChatsInput,
  ProjectActivity,
  ProjectAgentRef,
  ProjectChat,
  ProjectChatRef,
  ProjectChatSearchPage,
  ProjectChatsPage,
  ProjectDetail,
  ProjectFolderChange,
  ProjectFolderChoice,
  ProjectFolderInput,
  ProjectSummary,
  SearchProjectChatsInput,
  SetProjectChatArchivedInput,
  SetProjectChatPinnedInput,
  StartProjectChatInput,
  UpdateProjectAgentInput,
  UpdateProjectInput,
} from "@codebot/contracts/ipc";
import { type Effect, Schema } from "effect";
import { causeHelpers } from "../effect-boundary";

export class ProjectFailed extends Schema.TaggedError<ProjectFailed>()("ProjectFailed", {
  cause: Schema.Defect(),
}) {}

export const { io: projectIo, sync: projectStep, rewrap: toProjectFailed } = causeHelpers(ProjectFailed);

export type ProjectServiceEvent =
  | { type: "projects-changed"; projectId: string | null; projects: ProjectSummary[] }
  | { type: "chats-changed"; projectId: string; chats: ProjectChat[]; removedTaskIds: string[] }
  | { type: "activity-changed"; activity: ProjectActivity[] };

export interface ProjectOperations {
  list(): ProjectSummary[];
  find(projectId: string): ProjectSummary | null;
  get(projectId: string): Effect.Effect<ProjectDetail, ProjectFailed>;
  create(input: CreateProjectInput, ownerId: string | null): Effect.Effect<ProjectDetail, ProjectFailed>;
  update(input: UpdateProjectInput): Effect.Effect<ProjectDetail, ProjectFailed>;
  archive(projectId: string): Effect.Effect<ProjectSummary, ProjectFailed>;
  restore(projectId: string): Effect.Effect<ProjectSummary, ProjectFailed>;
  delete(projectId: string): Effect.Effect<void, ProjectFailed>;
  checkFolder(path: string): Effect.Effect<ProjectFolderChoice, ProjectFailed>;
  addFolder(input: ProjectFolderInput): Effect.Effect<ProjectFolderChange, ProjectFailed>;
  removeFolder(input: ProjectFolderInput): Effect.Effect<ProjectFolderChange, ProjectFailed>;
  createAgent(input: CreateProjectAgentInput): Effect.Effect<ProjectDetail, ProjectFailed>;
  updateAgent(input: UpdateProjectAgentInput): Effect.Effect<ProjectDetail, ProjectFailed>;
  removeAgent(input: ProjectAgentRef): Effect.Effect<ProjectDetail, ProjectFailed>;
  listChats(input: ListProjectChatsInput): ProjectChatsPage;
  getChat(input: ProjectChatRef): ProjectChat;
  searchChats(input: SearchProjectChatsInput): ProjectChatSearchPage;
  startChat(
    input: StartProjectChatInput,
    sender: ConversationMessageSender | undefined,
  ): Effect.Effect<ProjectChat, ProjectFailed>;
  setChatArchived(input: SetProjectChatArchivedInput): Effect.Effect<ProjectChat, ProjectFailed>;
  setChatPinned(input: SetProjectChatPinnedInput): ProjectChat;
  listActivity(): ProjectActivity[];
  subscribe(listener: (event: ProjectServiceEvent) => void): () => void;
}
