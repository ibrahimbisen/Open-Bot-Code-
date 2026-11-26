import { hostBrowsingMemory } from "@codebot/contracts/ipc";
import {
  BROWSING_MEMORY_CAPABILITY,
  BROWSING_MEMORY_ROUTES,
} from "@codebot/contracts/team-protocol/browsing-memory-v1";
import { sourceText } from "@codebot/i18n/source";
import { runCauseEffect } from "../../backend/effect-boundary";
import type { TeamApiAdmin } from "./dependencies";
import { HttpError } from "./http-error";
import type { RouteOutcome, TeamApiRequestContext } from "./request-context";
import { readJson, requireAdmin } from "./request-helpers";

export async function routeBrowsingMemory(
  context: TeamApiRequestContext,
  admin: TeamApiAdmin | undefined,
): Promise<RouteOutcome> {
  const { method, url, capabilities, member, request, json } = context;
  if (
    method !== "POST" ||
    (url.pathname !== BROWSING_MEMORY_ROUTES.settings && url.pathname !== BROWSING_MEMORY_ROUTES.update)
  )
    return "unmatched";
  const setting = admin?.browsingMemory;
  if (!setting || !capabilities.has(BROWSING_MEMORY_CAPABILITY))
    throw new HttpError(400, sourceText("error.team.browsingMemoryUnsupported"));
  requireAdmin(member);
  const body = await readJson(request);
  if (url.pathname === BROWSING_MEMORY_ROUTES.settings) return json(200, hostBrowsingMemory(setting.get()));
  if (typeof body.enabled !== "boolean") throw new HttpError(400, "Browsing memory setting is required.");
  return json(200, hostBrowsingMemory(await runCauseEffect(setting.set({ enabled: body.enabled }))));
}
