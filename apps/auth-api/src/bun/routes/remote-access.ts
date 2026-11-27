import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { runApiEffect } from "../../server/effect-runtime";
import { bindRouteServices, rememberSourceIp } from "../compat/route-host";
import { installRouteCompat } from "../compat/route-modules";
import { type CapturedHandler, takeCapturedRoutes } from "../compat/tanstack-route";
import { bearerToken } from "../http/responses";
import type { HttpMethod, Router } from "../http/router";
import type { AccountServices } from "../services";

const ROUTES_DIRECTORY = resolve(import.meta.dirname, "../../routes");

const ROUTE_FILES = [
  "v1/me.ts",
  "v1/me/profile.ts",
  "v1/me/avatar.ts",
  "v1/me/chat-color.ts",
  "v1/avatars/$userId.ts",
  "v1/auth/logout.ts",
  "v1/mobile-auth/devices.ts",
  "v1/mobile-auth/devices/$sessionId.ts",
  "v1/mobile-auth/link.ts",
  "v1/mobile-auth/redeem.ts",
  "v1/mobile-auth/session.ts",
  "v1/mobile-auth/ticket.ts",
  "v1/team-auth/redeem.ts",
  "v1/team-auth/ticket.ts",
  "v1/team-hosts/ice-servers.ts",
  "v1/team-tunnels/provision.ts",
  "v1/app/minimum-version.ts",
  "v1/mobile/features.ts",
  "v2/remote/hosts/index.ts",
  "v2/remote/hosts/register.ts",
  "v2/remote/hosts/$hostId/appearance.ts",
  "v2/remote/hosts/$hostId/hidden.ts",
  "v2/remote/hosts/$hostId/index.ts",
  "v2/remote/hosts/$hostId/invites.ts",
  "v2/remote/hosts/$hostId/key-handover.ts",
  "v2/remote/hosts/$hostId/logo.ts",
  "v2/remote/hosts/$hostId/owner-session.ts",
  "v2/remote/hosts/$hostId/signal-homes.ts",
  "v2/remote/hosts/$hostId/ticket.ts",
  "v2/remote/hosts/$hostId/webhook-route.ts",
  "v2/remote/hosts/$hostId/webhook-routes.ts",
  "v2/remote/hosts/$hostId/members/index.ts",
  "v2/remote/hosts/$hostId/members/$membershipId.ts",
  "v2/remote/invites/$inviteId.ts",
  "v2/remote/invites/accept.ts",
  "v2/remote/invites/preview.ts",
  "v2/remote/resume/validate.ts",
  "v2/remote/sessions/index.ts",
  "v2/remote/sessions/$sessionId/end.ts",
  "v2/remote/sessions/$sessionId/ticket.ts",
  "v2/remote/webhook-route/validate.ts",
] as const;

const UNGUARDED = new Set(["POST /v1/auth/logout", "DELETE /v1/mobile-auth/session"]);
const HOST_OWNER_GUARDED = new Set([
  "POST /v2/remote/hosts/:hostId/ticket",
  "POST /v2/remote/hosts/:hostId/owner-session",
]);
function isHttpMethod(method: string): method is HttpMethod {
  return method === "GET" || method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";
}

function routerPattern(path: string): string {
  const converted = path.replace(/\$([A-Za-z0-9_]+)/gu, ":$1");
  return converted.length > 1 && converted.endsWith("/") ? converted.slice(0, -1) : converted;
}

export async function registerRemoteAccessRoutes(router: Router, services: AccountServices): Promise<void> {
  bindRouteServices(services);
  installRouteCompat();
  for (const file of ROUTE_FILES) {
    await import(pathToFileURL(resolve(ROUTES_DIRECTORY, file)).href);
    for (const route of takeCapturedRoutes()) {
      const pattern = routerPattern(route.path);
      for (const [method, handler] of Object.entries(route.handlers)) {
        if (!handler || !isHttpMethod(method)) continue;
        router.add(method, pattern, guarded(services, `${method} ${pattern}`, handler));
      }
    }
  }
}

function guarded(
  services: AccountServices,
  key: string,
  handler: CapturedHandler,
): (context: { request: Request; params: Readonly<Record<string, string>>; sourceIp: string }) => Promise<Response> {
  return async ({ request, params, sourceIp }) => {
    rememberSourceIp(request, sourceIp);
    try {
      if (!UNGUARDED.has(key)) {
        const token = bearerToken(request);
        if (token) {
          const user = await runApiEffect(services.auth.authenticate(token));
          if (user) await runApiEffect(services.guard.requireFreshUser(user.id));
        }
      }
      const hostId = params.hostId;
      if (hostId && HOST_OWNER_GUARDED.has(key)) await runApiEffect(services.guard.requireFreshHostOwner(hostId));
    } catch (error) {
      return services.respondToError(error);
    }
    return handler({ request, params: { ...params } });
  };
}
