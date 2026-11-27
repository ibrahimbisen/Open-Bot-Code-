import {
  canAdministerServer,
  isExplorerScope,
  parseExplorerCreateInput,
  parseExplorerGitCommitInput,
  parseExplorerGitDiffInput,
  parseExplorerGitLogInput,
  parseExplorerGitStatusInput,
  parseExplorerListInput,
  parseExplorerPathInput,
  parseExplorerRenameInput,
  parseExplorerScopeInput,
  parseExplorerWriteInput,
} from "@codebot/contracts/ipc";
import { isDynamicRecord } from "@codebot/contracts/runtime-values";
import { EXPLORER_CAPABILITY, EXPLORER_ROUTES } from "@codebot/contracts/team-protocol/explorer-v1";
import { sourceText } from "@codebot/i18n/source";
import type { ProjectOperations } from "../../backend/projects/project-operations";
import type { ExplorerService } from "../explorer/explorer-service";
import { HttpError } from "./http-error";
import type { RouteOutcome, TeamApiRequestContext } from "./request-context";
import { readJson, requireAdmin } from "./request-helpers";

export type TeamApiExplorer = Pick<ExplorerService, "files" | "git">;

const EXPLORER_PATHS: ReadonlySet<string> = new Set(Object.values(EXPLORER_ROUTES));

function parse<A>(decode: (value: unknown) => A, input: unknown): A {
  try {
    return decode(input);
  } catch (error) {
    throw new HttpError(400, error instanceof Error ? error.message : sourceText("error.explorer.remoteFailed"));
  }
}

async function run<A>(operation: () => Promise<A> | A): Promise<A> {
  try {
    return await operation();
  } catch (error) {
    throw new HttpError(400, error instanceof Error ? error.message : sourceText("error.explorer.remoteFailed"));
  }
}

function scopeAgentId(input: unknown): string | null {
  if (isExplorerScope(input)) return input.agentId;
  return isDynamicRecord(input) && isExplorerScope(input.scope) ? input.scope.agentId : null;
}

/** Owners and admins open every file tree. A member opens only the file trees of the projects that they created. */
export async function routeExplorer(
  context: TeamApiRequestContext,
  explorer: TeamApiExplorer | undefined,
  projects?: Pick<ProjectOperations, "list">,
): Promise<RouteOutcome> {
  const { method, url, capabilities, member, request, json } = context;
  const path = url.pathname;
  if (method !== "POST" || !EXPLORER_PATHS.has(path)) return "unmatched";
  if (!explorer || !capabilities.has(EXPLORER_CAPABILITY))
    throw new HttpError(400, sourceText("error.explorer.serverUnsupported"));
  const input = (await readJson(request)).input;
  if (!canAdministerServer(member.role)) {
    const agentId = scopeAgentId(input);
    const own = projects
      ?.list()
      .some((project) => project.ownerId === member.id && agentId !== null && project.agentIds.includes(agentId));
    if (!own) requireAdmin(member);
  }
  switch (path) {
    case EXPLORER_ROUTES.roots:
      return json(200, await run(() => explorer.files.roots(parse(parseExplorerScopeInput, input))));
    case EXPLORER_ROUTES.list:
      return json(200, await run(() => explorer.files.list(parse(parseExplorerListInput, input))));
    case EXPLORER_ROUTES.stat:
      return json(200, await run(() => explorer.files.stat(parse(parseExplorerPathInput, input))));
    case EXPLORER_ROUTES.read:
      return json(200, await run(() => explorer.files.read(parse(parseExplorerPathInput, input))));
    case EXPLORER_ROUTES.write:
      return json(200, await run(() => explorer.files.write(parse(parseExplorerWriteInput, input))));
    case EXPLORER_ROUTES.create:
      return json(200, await run(() => explorer.files.create(parse(parseExplorerCreateInput, input))));
    case EXPLORER_ROUTES.rename:
      return json(200, await run(() => explorer.files.rename(parse(parseExplorerRenameInput, input))));
    case EXPLORER_ROUTES.trash:
      await run(() => explorer.files.trash(parse(parseExplorerPathInput, input)));
      return json(200, {});
    case EXPLORER_ROUTES.gitStatus:
      return json(200, await run(() => explorer.git.status(parse(parseExplorerGitStatusInput, input))));
    case EXPLORER_ROUTES.gitLog:
      return json(200, await run(() => explorer.git.log(parse(parseExplorerGitLogInput, input))));
    case EXPLORER_ROUTES.gitCommitFiles:
      return json(200, await run(() => explorer.git.commitFiles(parse(parseExplorerGitCommitInput, input))));
    case EXPLORER_ROUTES.gitDiff:
      return json(200, await run(() => explorer.git.diff(parse(parseExplorerGitDiffInput, input))));
  }
  return "unmatched";
}
