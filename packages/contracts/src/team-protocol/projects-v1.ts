import {
  isProjectActivityChangedEvent,
  isProjectChatsChangedEvent,
  isProjectsChangedEvent,
  type ProjectActivity,
  type ProjectChat,
  type ProjectSummary,
} from "../ipc-projects";
import { isDynamicRecord } from "../runtime-values";
import { type AdminDecoder, adminRoute, fields, type OptionalRouteCodec } from "./admin-wire";
import type { TeamProtocolV2Json } from "./webrtc-framing";

export const PROJECTS_V1_CAPABILITY = "projects-v1";

export const PROJECTS_V1_ROUTES = {
  list: "/v1/projects/list",
  get: "/v1/projects/get",
  create: "/v1/projects/create",
  update: "/v1/projects/update",
  archive: "/v1/projects/archive",
  restore: "/v1/projects/restore",
  delete: "/v1/projects/delete",
  addFolder: "/v1/projects/folders/add",
  removeFolder: "/v1/projects/folders/remove",
  createAgent: "/v1/projects/agents/create",
  updateAgent: "/v1/projects/agents/update",
  removeAgent: "/v1/projects/agents/remove",
  listChats: "/v1/projects/chats/list",
  getChat: "/v1/projects/chats/get",
  searchChats: "/v1/projects/chats/search",
  startChat: "/v1/projects/chats/start",
  setChatArchived: "/v1/projects/chats/archive",
  setChatPinned: "/v1/projects/chats/pin",
  setChatRuntime: "/v1/projects/chats/runtime",
  listActivity: "/v1/projects/activity",
} as const;

export type ProjectsV1Operation = keyof typeof PROJECTS_V1_ROUTES;

const MAX_DEPTH = 24;
const MAX_NODES = 50_000;

function plainJson(value: unknown, budget: { nodes: number }, depth: number): TeamProtocolV2Json {
  budget.nodes += 1;
  if (budget.nodes > MAX_NODES || depth > MAX_DEPTH) throw new Error("Invalid projects payload.");
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map((item) => plainJson(item, budget, depth + 1));
  if (typeof value === "object") {
    const decoded: Record<string, TeamProtocolV2Json> = {};
    for (const [key, item] of Object.entries(value)) decoded[key] = plainJson(item, budget, depth + 1);
    return decoded;
  }
  throw new Error("Invalid projects payload.");
}

const payload: AdminDecoder = (value) => plainJson(value, { nodes: 0 }, 0);
const request = fields({}, { input: payload });

export const PROJECTS_V1_CODECS: ReadonlyMap<string, OptionalRouteCodec> = new Map(
  Object.values(PROJECTS_V1_ROUTES).map((path) => [path, adminRoute(request, payload)]),
);

/** Events of the projects feature on the Team API event socket. They go to admin members whose client has `projects-v1`. */
export type ProjectsWireEvent =
  | { type: "projects-changed"; projectId: string | null; projects: ProjectSummary[] }
  | { type: "project-chats-changed"; projectId: string; chats: ProjectChat[]; removedTaskIds: string[] }
  | { type: "project-activity-changed"; activity: ProjectActivity[] };

export function projectsWireEvent(value: unknown): ProjectsWireEvent | null {
  if (!isDynamicRecord(value)) return null;
  const withServer = { ...value, serverId: "remote" };
  if (value.type === "projects-changed" && isProjectsChangedEvent(withServer))
    return { type: "projects-changed", projectId: withServer.projectId, projects: withServer.projects };
  if (value.type === "project-chats-changed" && isProjectChatsChangedEvent(withServer))
    return {
      type: "project-chats-changed",
      projectId: withServer.projectId,
      chats: withServer.chats,
      removedTaskIds: withServer.removedTaskIds,
    };
  if (value.type === "project-activity-changed" && isProjectActivityChangedEvent(withServer))
    return { type: "project-activity-changed", activity: withServer.activity };
  return null;
}
