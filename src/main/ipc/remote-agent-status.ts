import { type AgentStatus, decodeProviderModelSources, withModelSources } from "@codebot/contracts/ipc";
import { TEAM_API_ROUTES } from "@codebot/contracts/team-api-routes";
import type { TeamCurrentCapability } from "@codebot/contracts/team-protocol/current";
import {
  PROVIDER_MODEL_SOURCE_CAPABILITY,
  PROVIDER_MODEL_SOURCE_ROUTES,
} from "@codebot/contracts/team-protocol/provider-model-source-v1";
import { Effect } from "effect";
import { decodeAgentStatusFromHost } from "../remote-agent-decoding";
import type { ResponseDecoder } from "../remote-host-decoding";
import type { RemoteRequestInit } from "../remote-server-client";
import type { RemoteWorkflowError } from "../remote-service-effects";

export interface RemoteStatusServers {
  supportsCapability(serverId: string, capability: TeamCurrentCapability): boolean;
  request<T>(
    serverId: string,
    path: string,
    decoder: ResponseDecoder<T>,
    init?: RemoteRequestInit,
  ): Effect.Effect<T, RemoteWorkflowError>;
}

export const readRemoteAgentStatus = Effect.fn("RemoteAgentStatus.read")(function* (
  remoteServers: RemoteStatusServers,
  serverId: string,
) {
  const status = remoteServers.request(serverId, TEAM_API_ROUTES.agents.status, decodeAgentStatusFromHost);
  const sources = remoteServers.supportsCapability(serverId, PROVIDER_MODEL_SOURCE_CAPABILITY)
    ? remoteServers
        .request(serverId, PROVIDER_MODEL_SOURCE_ROUTES.list, decodeProviderModelSources, { method: "POST", body: {} })
        .pipe(Effect.orElseSucceed(() => []))
    : Effect.succeed([]);
  const [rows, listed] = yield* Effect.all([status, sources], { concurrency: "unbounded" });
  return withModelSources(rows, listed) satisfies AgentStatus;
});
