import type { ReplyRuleSettings, TurnStepDetails } from "@codebot/contracts/ipc";
import {
  REPLY_ROUTES,
  REPLY_RULE_CAPABILITY,
  TURN_STEP_DETAILS_CAPABILITY,
} from "@codebot/contracts/team-protocol/replies-v1";
import { sourceText } from "@codebot/i18n/source";
import { Effect } from "effect";
import { parseReplyRuleSettings } from "../reply-rule-preference-store";
import { HttpError } from "./http-error";
import type { RouteOutcome, TeamApiRequestContext } from "./request-context";
import { readJson, requireAdmin, requireAgentLevel } from "./request-helpers";

export interface TeamApiReplies {
  rule: {
    get(): ReplyRuleSettings;
    set(settings: ReplyRuleSettings): Effect.Effect<ReplyRuleSettings, { readonly cause: unknown }>;
  };
  readTurnStepDetails(agentId: string, turnId: string): TurnStepDetails;
}

const REPLY_PATHS: ReadonlySet<string> = new Set(Object.values(REPLY_ROUTES));

function text(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 128)
    throw new HttpError(400, `Invalid ${field}.`);
  return value;
}

export async function routeReplies(
  context: TeamApiRequestContext,
  replies: TeamApiReplies | undefined,
): Promise<RouteOutcome> {
  const { method, url, capabilities, member, request, json } = context;
  const path = url.pathname;
  if (method !== "POST" || !REPLY_PATHS.has(path)) return "unmatched";
  if (!replies) throw new HttpError(400, sourceText("error.project.replyUnsupported"));
  const body = await readJson(request);
  if (path === REPLY_ROUTES.rule) {
    if (!capabilities.has(REPLY_RULE_CAPABILITY))
      throw new HttpError(400, sourceText("error.project.replyUnsupported"));
    return json(200, replies.rule.get());
  }
  if (path === REPLY_ROUTES.updateRule) {
    if (!capabilities.has(REPLY_RULE_CAPABILITY))
      throw new HttpError(400, sourceText("error.project.replyUnsupported"));
    requireAdmin(member);
    let settings: ReplyRuleSettings;
    try {
      settings = parseReplyRuleSettings(body);
    } catch (error) {
      throw new HttpError(400, error instanceof Error ? error.message : sourceText("error.project.replyFailed"));
    }
    try {
      return json(200, await Effect.runPromise(replies.rule.set(settings)));
    } catch {
      throw new HttpError(400, sourceText("error.project.replyFailed"));
    }
  }
  if (!capabilities.has(TURN_STEP_DETAILS_CAPABILITY))
    throw new HttpError(400, sourceText("error.project.replyUnsupported"));
  const agentId = text(body.agentId, "agentId");
  requireAgentLevel(context, agentId, "view");
  return json(200, replies.readTurnStepDetails(agentId, text(body.turnId, "turnId")));
}
