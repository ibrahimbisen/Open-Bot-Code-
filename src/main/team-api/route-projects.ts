import { PROJECTS_V1_CAPABILITY, PROJECTS_V1_ROUTES } from "@codebot/contracts/team-protocol/projects-v1";
import { sourceText } from "@codebot/i18n/source";
import { Effect } from "effect";
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
    throw new HttpError(400, messageOf(error));
  }
}

export async function routeProjects(
  context: TeamApiRequestContext,
  projects: ProjectOperations | undefined,
): Promise<RouteOutcome> {
  const { method, url, capabilities, member, request, json } = context;
  const path = url.pathname;
  if (method !== "POST" || !PROJECT_PATHS.has(path)) return "unmatched";
  if (!projects || !capabilities.has(PROJECTS_V1_CAPABILITY))
    throw new HttpError(400, sourceText("error.project.serverTooOld"));
  requireAdmin(member);
  const body = await readJson(request);
  const input = body.input;
  const sender = memberSender(member);
  switch (path) {
    case PROJECTS_V1_ROUTES.list:
      return json(200, projects.list());
    case PROJECTS_V1_ROUTES.get:
      return json(200, await run(() => projects.get(parse(parseProjectId, input))));
    case PROJECTS_V1_ROUTES.create:
      return json(200, await run(() => projects.create(parse(parseCreateProject, input), member.id)));
    case PROJECTS_V1_ROUTES.update:
      return json(200, await run(() => projects.update(parse(parseUpdateProject, input))));
    case PROJECTS_V1_ROUTES.archive:
      return json(200, await run(() => projects.archive(parse(parseProjectId, input))));
    case PROJECTS_V1_ROUTES.restore:
      return json(200, await run(() => projects.restore(parse(parseProjectId, input))));
    case PROJECTS_V1_ROUTES.delete:
      await run(() => projects.delete(parse(parseProjectId, input)));
      return json(200, {});
    case PROJECTS_V1_ROUTES.addFolder:
      return json(200, await run(() => projects.addFolder(parse(parseProjectFolder, input))));
    case PROJECTS_V1_ROUTES.removeFolder:
      return json(200, await run(() => projects.removeFolder(parse(parseProjectFolder, input))));
    case PROJECTS_V1_ROUTES.createAgent:
      return json(200, await run(() => projects.createAgent(parse(parseCreateProjectAgent, input))));
    case PROJECTS_V1_ROUTES.updateAgent:
      return json(200, await run(() => projects.updateAgent(parse(parseUpdateProjectAgent, input))));
    case PROJECTS_V1_ROUTES.removeAgent:
      return json(200, await run(() => projects.removeAgent(parse(parseProjectAgentRef, input))));
    case PROJECTS_V1_ROUTES.listChats:
      return json(200, await run(() => projects.listChats(parse(parseListProjectChats, input))));
    case PROJECTS_V1_ROUTES.getChat:
      return json(200, await run(() => projects.getChat(parse(parseProjectChatRef, input))));
    case PROJECTS_V1_ROUTES.searchChats:
      return json(200, await run(() => projects.searchChats(parse(parseSearchProjectChats, input))));
    case PROJECTS_V1_ROUTES.startChat:
      return json(200, await run(() => projects.startChat(parse(parseStartProjectChat, input), sender)));
    case PROJECTS_V1_ROUTES.setChatArchived:
      return json(200, await run(() => projects.setChatArchived(parse(parseSetProjectChatArchived, input))));
    case PROJECTS_V1_ROUTES.setChatPinned:
      return json(200, await run(() => projects.setChatPinned(parse(parseSetProjectChatPinned, input))));
    case PROJECTS_V1_ROUTES.setChatRuntime:
      return json(200, await run(() => projects.setChatRuntime(parse(parseSetProjectChatRuntime, input))));
    case PROJECTS_V1_ROUTES.listActivity:
      return json(200, projects.listActivity());
  }
  return "unmatched";
}
