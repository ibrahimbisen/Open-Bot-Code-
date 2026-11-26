import { Effect } from "effect";
import type { AuthService } from "../../server/auth-service";
import { type RemoteControlPlane, verifyRemoteServiceSignature } from "../../server/remote-control-plane";
import { apiError, bearerToken, json } from "../http/responses";
import { routeServices } from "./route-host";

export { apiError, bearerToken, json };

export function requestAuthService(): AuthService {
  return routeServices().auth;
}

export function requestRemoteControlPlane(): RemoteControlPlane {
  return routeServices().remote;
}

export function requestUser(request: Request) {
  const token = bearerToken(request);
  if (!token) return Effect.succeed(null);
  return routeServices().auth.authenticate(token);
}

export function requestAvatarBucket(): R2Bucket {
  return routeServices().bindings.AVATARS;
}

export function requestOwnerTransferEmailDelivery(): null {
  return null;
}

export function requestAdoptUnlinkedHostedSites(): Effect.Effect<void> {
  return Effect.void;
}

export function schedule<E>(work: Effect.Effect<void, E>): void {
  routeServices().background.schedule(work);
}

export function authErrorResponse(error: unknown): Response {
  return routeServices().respondToError(error);
}

export function remoteControlPlaneErrorResponse(error: unknown): Response {
  return routeServices().respondToError(error);
}

export function verifyRemoteServiceRequest(request: Request, body: string) {
  const secret = routeServices().config.signal.webhookSecret;
  if (!secret) return Effect.succeed(false);
  return verifyRemoteServiceSignature(
    secret,
    body,
    request.headers.get("CodeBot-Timestamp") ?? "",
    request.headers.get("CodeBot-Signature") ?? "",
  );
}
