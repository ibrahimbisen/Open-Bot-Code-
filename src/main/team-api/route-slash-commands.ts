import {
  parseResumeSessionInput,
  parseSlashCommandChatInput,
  type ResumableSessionList,
  type ResumeSessionInput,
  type ResumeSessionResult,
  type SlashCommandChatInput,
  type SlashCommandList,
} from "@codebot/contracts/ipc";
import { isString } from "@codebot/contracts/runtime-values";
import { SLASH_COMMANDS_CAPABILITY, SLASH_COMMANDS_ROUTES } from "@codebot/contracts/team-protocol/slash-commands-v1";
import { sourceText } from "@codebot/i18n/source";
import { Effect } from "effect";
import { HttpError } from "./http-error";
import type { RouteOutcome, TeamApiRequestContext } from "./request-context";
import { readJson, requireAdmin } from "./request-helpers";

export interface TeamApiSlashCommands {
  listSlashCommands(input: SlashCommandChatInput): Effect.Effect<SlashCommandList, unknown>;
  listResumableSessions(agentId: string): Effect.Effect<ResumableSessionList, unknown>;
  resumeAgentSession(input: ResumeSessionInput): Effect.Effect<ResumeSessionResult, unknown>;
}

const SLASH_PATHS: ReadonlySet<string> = new Set(Object.values(SLASH_COMMANDS_ROUTES));

function messageOf(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null && "cause" in error) return messageOf(error.cause);
  return isString(error) ? error : sourceText("error.slash.remoteFailed");
}

function parse<A>(decode: (value: unknown) => A, input: unknown): A {
  try {
    return decode(input);
  } catch (error) {
    throw new HttpError(400, messageOf(error));
  }
}

async function run<A>(operation: Effect.Effect<A, unknown>): Promise<A> {
  try {
    return await Effect.runPromise(operation);
  } catch (error) {
    throw new HttpError(400, messageOf(error));
  }
}

export async function routeSlashCommands(
  context: TeamApiRequestContext,
  commands: TeamApiSlashCommands | undefined,
): Promise<RouteOutcome> {
  const { method, url, capabilities, member, request, json } = context;
  const path = url.pathname;
  if (method !== "POST" || !SLASH_PATHS.has(path)) return "unmatched";
  if (!commands || !capabilities.has(SLASH_COMMANDS_CAPABILITY))
    throw new HttpError(400, sourceText("error.slash.serverUnsupported"));
  requireAdmin(member);
  const input = (await readJson(request)).input;
  switch (path) {
    case SLASH_COMMANDS_ROUTES.list:
      return json(200, await run(commands.listSlashCommands(parse(parseSlashCommandChatInput, input))));
    case SLASH_COMMANDS_ROUTES.listSessions: {
      const agentId = parse(parseSlashCommandChatInput, input).agentId;
      return json(200, await run(commands.listResumableSessions(agentId)));
    }
    case SLASH_COMMANDS_ROUTES.resumeSession:
      return json(200, await run(commands.resumeAgentSession(parse(parseResumeSessionInput, input))));
  }
  return "unmatched";
}
