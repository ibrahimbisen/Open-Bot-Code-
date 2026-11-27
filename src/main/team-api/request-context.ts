import type { IncomingMessage, ServerResponse } from "node:http";
import type { AgentAccessLevel, TeamMemberSummary } from "@codebot/contracts/ipc";

export type RouteOutcome = "handled" | "unmatched";

export interface TeamApiRequestContext {
  readonly request: IncomingMessage;
  readonly response: ServerResponse;
  readonly method: string;
  readonly url: URL;
  readonly protocol: number;
  readonly capabilities: Set<string>;
  readonly member: TeamMemberSummary;
  readonly token: string;
  readonly sessionId: string;
  readonly sessionExpiresAt: string;
  readonly fromChrome: boolean;
  readonly agentLevel: (agentId: string) => AgentAccessLevel;
  /** Records the signed-in member as the owner of agents that this request created. */
  readonly claimAgents: (agentIds: readonly string[]) => Promise<void>;
  readonly json: (status: number, value: object | null) => RouteOutcome;
  readonly empty: (status: number) => RouteOutcome;
}

export interface AgentRouteTarget {
  readonly agentId: string;
  readonly action: string;
}
