import { mkdir, realpath } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import {
  type CreateProjectInput,
  canAdministerServer,
  type ProjectDetail,
  type ProjectSummary,
} from "@codebot/contracts/ipc";
import { PROJECTS_V1_CAPABILITY, PROJECTS_V1_ROUTES } from "@codebot/contracts/team-protocol/projects-v1";
import { sourceText } from "@codebot/i18n/source";
import { Effect } from "effect";
import { isPathInside } from "../../backend/path-containment";
import type { ProjectOperations } from "../../backend/projects/project-operations";
import { ProjectFailed } from "../../backend/projects/project-operations";
import {
  parseCreateProject,
  parseCreateProjectAgent,
  parseListProjectChats,
  parseProjectAgentRef,
  parseProjectChatRef,
  parseProjectFolder,
  parseProjectId,
  parseSearchProjectChats,
  parseSetProjectChatArchived,
  parseSetProjectChatPinned,
  parseSetProjectChatRuntime,
  parseStartProjectChat,
  parseUpdateProject,
  parseUpdateProjectAgent,
} from "../ipc/project-inputs";
import { HttpError } from "./http-error";
import type { RouteOutcome, TeamApiRequestContext } from "./request-context";
import { memberSender, readJson, requireAdmin } from "./request-helpers";

const PROJECT_PATHS: ReadonlySet<string> = new Set(Object.values(PROJECTS_V1_ROUTES));

function messageOf(error: unknown): string {
  if (error instanceof ProjectFailed) return messageOf(error.cause);
  return error instanceof Error ? error.message : sourceText("error.project.remoteFailed");
}

function parse<A>(decode: (value: unknown) => A, input: unknown): A {
  try {
    return decode(input);
  } catch (error) {
    throw new HttpError(400, messageOf(error));
  }
}

async function run<A>(operation: () => A | Effect.Effect<A, ProjectFailed>): Promise<A> {
  try {
    const result = operation();
    return Effect.isEffect(result) ? await Effect.runPromise(result) : result;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, messageOf(error));
  }
}

async function memberFolder(root: string, memberId: string, path: string): Promise<string> {
  if (!/^[\w-]+$/.test(memberId)) throw new HttpError(403, sourceText("error.project.memberFolder"));
  const base = join(root, memberId);
  await mkdir(base, { recursive: true });
  const realBase = await realpath(base);
  const target = resolve(realBase, path);
  if (!isPathInside(realBase, target)) throw new HttpError(403, sourceText("error.project.memberFolder"));
  if (!isAbsolute(path)) await mkdir(target, { recursive: true });
  const real = await realpath(target).catch(() => target);
  if (!isPathInside(realBase, real)) throw new HttpError(403, sourceText("error.project.memberFolder"));
  return real;
}

function refuseOpenAccess(level: CreateProjectInput["accessLevel"]): void {
  if (level === "open") throw new HttpError(403, sourceText("error.project.memberOpenAccess"));
}

/**
 * Owners and admins use every project. A member uses only the projects that they created, and only
 * with folders inside their own folder below memberProjectsRoot.
 */
export async function routeProjects(
  context: TeamApiRequestContext,
  projects: ProjectOperations | undefined,
  memberProjectsRoot?: string,
): Promise<RouteOutcome> {
  const { method, url, capabilities, member, request, json } = context;
  const path = url.pathname;
  if (method !== "POST" || !PROJECT_PATHS.has(path)) return "unmatched";
  if (!projects || !capabilities.has(PROJECTS_V1_CAPABILITY))
    throw new HttpError(400, sourceText("error.project.serverTooOld"));
  const admin = canAdministerServer(member.role);
  if (!admin && memberProjectsRoot === undefined) requireAdmin(member);
  const root = memberProjectsRoot ?? "";
  const body = await readJson(request);
  const input = body.input;
  const sender = memberSender(member);
  const mine = (project: ProjectSummary | null) => admin || (project !== null && project.ownerId === member.id);
  const own = <A extends { projectId: string }>(value: A): A => {
    if (!mine(projects.find(value.projectId))) throw new HttpError(403, sourceText("error.project.ownerOnly"));
    return value;
  };
  const ownChat = <A extends { agentId: string }>(value: A): A => {
    if (!admin && !projects.list().some((project) => mine(project) && project.agentIds.includes(value.agentId)))
      throw new HttpError(403, sourceText("error.project.ownerOnly"));
    return value;
  };
  const ownId = (projectId: string): string => own({ projectId }).projectId;
  const myProjectIds = () => new Set(projects.list().flatMap((project) => (mine(project) ? [project.id] : [])));
  const claim = async (detail: ProjectDetail): Promise<ProjectDetail> => {
    await context.claimAgents(detail.project.agentIds);
    return detail;
  };
  switch (path) {
    case PROJECTS_V1_ROUTES.list:
      return json(
        200,
        projects.list().filter((project) => mine(project)),
      );
    case PROJECTS_V1_ROUTES.get:
      return json(200, await run(() => projects.get(ownId(parse(parseProjectId, input)))));
    case PROJECTS_V1_ROUTES.create: {
      const create = parse(parseCreateProject, input);
      if (!admin) {
        refuseOpenAccess(create.accessLevel);
        create.mainFolder = await memberFolder(root, member.id, create.mainFolder);
        const extra: string[] = [];
        for (const folder of create.additionalFolders ?? []) extra.push(await memberFolder(root, member.id, folder));
        create.additionalFolders = extra;
      }
      return json(200, await claim(await run(() => projects.create(create, member.id))));
    }
    case PROJECTS_V1_ROUTES.update: {
      const update = own(parse(parseUpdateProject, input));
      if (!admin) {
        refuseOpenAccess(update.accessLevel);
        if (update.mainFolder !== undefined) update.mainFolder = await memberFolder(root, member.id, update.mainFolder);
      }
      return json(200, await run(() => projects.update(update)));
    }
    case PROJECTS_V1_ROUTES.archive:
      return json(200, await run(() => projects.archive(ownId(parse(parseProjectId, input)))));
    case PROJECTS_V1_ROUTES.restore:
      return json(200, await run(() => projects.restore(ownId(parse(parseProjectId, input)))));
    case PROJECTS_V1_ROUTES.delete:
      await run(() => projects.delete(ownId(parse(parseProjectId, input))));
      return json(200, {});
    case PROJECTS_V1_ROUTES.addFolder: {
      const folder = own(parse(parseProjectFolder, input));
      if (!admin) folder.path = await memberFolder(root, member.id, folder.path);
      return json(200, await run(() => projects.addFolder(folder)));
    }
    case PROJECTS_V1_ROUTES.removeFolder:
      return json(200, await run(() => projects.removeFolder(own(parse(parseProjectFolder, input)))));
    case PROJECTS_V1_ROUTES.createAgent:
      return json(200, await claim(await run(() => projects.createAgent(own(parse(parseCreateProjectAgent, input))))));
    case PROJECTS_V1_ROUTES.updateAgent:
      return json(200, await run(() => projects.updateAgent(own(parse(parseUpdateProjectAgent, input)))));
    case PROJECTS_V1_ROUTES.removeAgent:
      return json(200, await run(() => projects.removeAgent(own(parse(parseProjectAgentRef, input)))));
    case PROJECTS_V1_ROUTES.listChats:
      return json(200, await run(() => projects.listChats(own(parse(parseListProjectChats, input)))));
    case PROJECTS_V1_ROUTES.getChat:
      return json(200, await run(() => projects.getChat(ownChat(parse(parseProjectChatRef, input)))));
    case PROJECTS_V1_ROUTES.searchChats: {
      const search = parse(parseSearchProjectChats, input);
      if (search.projectId !== undefined) ownId(search.projectId);
      const page = await run(() => projects.searchChats(search));
      if (admin) return json(200, page);
      const visible = myProjectIds();
      return json(200, { ...page, matches: page.matches.filter((match) => visible.has(match.chat.projectId)) });
    }
    case PROJECTS_V1_ROUTES.startChat:
      return json(200, await run(() => projects.startChat(own(parse(parseStartProjectChat, input)), sender)));
    case PROJECTS_V1_ROUTES.setChatArchived:
      return json(200, await run(() => projects.setChatArchived(ownChat(parse(parseSetProjectChatArchived, input)))));
    case PROJECTS_V1_ROUTES.setChatPinned:
      return json(200, await run(() => projects.setChatPinned(ownChat(parse(parseSetProjectChatPinned, input)))));
    case PROJECTS_V1_ROUTES.setChatRuntime:
      return json(200, await run(() => projects.setChatRuntime(ownChat(parse(parseSetProjectChatRuntime, input)))));
    case PROJECTS_V1_ROUTES.listActivity: {
      const visible = myProjectIds();
      return json(
        200,
        projects.listActivity().filter((activity) => visible.has(activity.projectId)),
      );
    }
  }
  return "unmatched";
}
