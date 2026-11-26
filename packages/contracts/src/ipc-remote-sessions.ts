import { isOneOf } from "./runtime-values";

export interface RemoteSessionReusePreference {
  keepBetweenRuns: boolean;
}

export const DEFAULT_REMOTE_SESSION_REUSE_PREFERENCE: RemoteSessionReusePreference = { keepBetweenRuns: true };

export const REMOTE_NETWORK_ROUTES = ["codebot", "private"] as const;
export type RemoteNetworkRoute = (typeof REMOTE_NETWORK_ROUTES)[number];
export const DEFAULT_REMOTE_NETWORK_ROUTE: RemoteNetworkRoute = "codebot";

export function isRemoteNetworkRoute(value: unknown): value is RemoteNetworkRoute {
  return isOneOf(REMOTE_NETWORK_ROUTES, value);
}

export interface RemoteNetworkRoutePreference {
  route: RemoteNetworkRoute;
}

export interface RemoteNetworkRouteState extends RemoteNetworkRoutePreference {
  tailscaleConnected: boolean;
}
