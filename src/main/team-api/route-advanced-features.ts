import { decodeSetAdvancedFeatureInput } from "@codebot/contracts/ipc";
import {
  ADVANCED_FEATURES_CAPABILITY,
  ADVANCED_FEATURES_ROUTES,
} from "@codebot/contracts/team-protocol/advanced-features-v1";
import { sourceText } from "@codebot/i18n/source";
import { runCauseEffect } from "../../backend/effect-boundary";
import type { TeamApiAdmin } from "./dependencies";
import { HttpError } from "./http-error";
import type { RouteOutcome, TeamApiRequestContext } from "./request-context";
import { readJson, requireAdmin } from "./request-helpers";

export async function routeAdvancedFeatures(
  context: TeamApiRequestContext,
  admin: TeamApiAdmin | undefined,
): Promise<RouteOutcome> {
  const { method, url, capabilities, member, request, json } = context;
  if (
    method !== "POST" ||
    (url.pathname !== ADVANCED_FEATURES_ROUTES.settings && url.pathname !== ADVANCED_FEATURES_ROUTES.update)
  )
    return "unmatched";
  const setting = admin?.advancedFeatures;
  if (!setting || !capabilities.has(ADVANCED_FEATURES_CAPABILITY))
    throw new HttpError(400, sourceText("error.advanced.unsupported"));
  const body = await readJson(request);
  if (url.pathname === ADVANCED_FEATURES_ROUTES.settings) return json(200, setting.get());
  requireAdmin(member);
  let change: ReturnType<typeof decodeSetAdvancedFeatureInput>;
  try {
    change = decodeSetAdvancedFeatureInput(body);
  } catch {
    throw new HttpError(400, sourceText("error.advanced.invalidChange"));
  }
  return json(200, await runCauseEffect(setting.set(change)));
}
