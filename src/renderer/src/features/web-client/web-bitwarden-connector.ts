import { runTeamEffect } from "@codebot/team-client";
import { bitwardenConnectorRequest } from "@codebot/team-client/team-admin-requests";
import type { TeamApiRequest } from "@codebot/team-client/team-api-requests";
import { Effect } from "effect";
import { type BitwardenConnectorPort, polledBitwardenConnectorPort } from "../connectors/bitwarden-connector-port";

export function webBitwardenConnectorPort(request: () => TeamApiRequest): BitwardenConnectorPort {
  const run = (
    route: Parameters<typeof bitwardenConnectorRequest>[1],
    body?: Parameters<typeof bitwardenConnectorRequest>[2],
  ) =>
    runTeamEffect(
      Effect.suspend(() => bitwardenConnectorRequest(request(), route, body)).pipe(
        Effect.mapError((error) => error.cause),
      ),
    );
  return polledBitwardenConnectorPort({
    status: () => run("status"),
    connectHost: (input) => run("connect", input),
    disconnect: () => run("disconnect"),
  });
}
