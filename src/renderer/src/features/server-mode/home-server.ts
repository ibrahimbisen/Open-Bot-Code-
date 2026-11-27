import type { ServerSummary } from "@codebot/contracts/ipc";

export const HOME_SERVER_STORAGE_KEY = "codebot:home-server:v1";

export type EngineMode = "computer" | "home";

export function engineModeOf(servers: readonly ServerSummary[]): EngineMode {
  const active = servers.find((server) => server.active);
  return active !== undefined && active.kind === "remote" ? "home" : "computer";
}

export function pickHomeServer(servers: readonly ServerSummary[], storedId: string | null): ServerSummary | null {
  const remote = servers.filter((server) => server.kind === "remote");
  return (
    remote.find((server) => server.active) ??
    remote.find((server) => server.id === storedId && server.state === "online") ??
    remote.find((server) => server.state === "online") ??
    remote.find((server) => server.id === storedId) ??
    remote[0] ??
    null
  );
}

export function readHomeServerId(): string | null {
  try {
    return window.localStorage.getItem(HOME_SERVER_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeHomeServerId(serverId: string): void {
  try {
    window.localStorage.setItem(HOME_SERVER_STORAGE_KEY, serverId);
  } catch {
    return;
  }
}
