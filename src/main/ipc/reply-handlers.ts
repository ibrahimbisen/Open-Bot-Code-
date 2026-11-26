import {
  decodeReplyRuleSettings,
  decodeTurnStepDetails,
  REPLY_ROUTES,
  REPLY_RULE_CAPABILITY,
  type ReplyRuleSettings,
  TURN_STEP_DETAILS_CAPABILITY,
  type TurnStepDetails,
  type TurnStepDetailsInput,
} from "@codebot/contracts/ipc";
import type { AgentService } from "../../backend/agent-service";
import { runCauseEffect } from "../../backend/effect-boundary";
import type { ResponseDecoder } from "../../backend/protocol";
import type { RemoteServerManager } from "../remote-server-manager";
import { parseReplyRuleSettings, type ReplyRulePreferenceStore } from "../reply-rule-preference-store";
import type { IpcGroupHandlers } from "./define-ipc-group";
import { scopedHandler, scopedQueryHandler } from "./scoped-handler";
import { isObject, requireString } from "./validation";

interface ReplyIpcDependencies {
  replyRule: Pick<ReplyRulePreferenceStore, "get" | "set">;
  service: Pick<AgentService, "readTurnStepDetails">;
  remoteServers: Pick<RemoteServerManager, "list" | "request">;
}

function parseTurnStepDetailsInput(value: unknown): TurnStepDetailsInput {
  if (!isObject(value)) throw new Error("A turn is required.");
  return { agentId: requireString(value.agentId, "agentId"), turnId: requireString(value.turnId, "turnId") };
}

export function replyIpcHandlers({
  replyRule,
  service,
  remoteServers,
}: ReplyIpcDependencies): Pick<IpcGroupHandlers, "replies"> {
  function remote<T>(
    serverId: string,
    capability: string,
    path: string,
    decoder: ResponseDecoder<T>,
    body: Record<string, never> | ReplyRuleSettings | TurnStepDetailsInput,
  ): Promise<T> {
    const host = remoteServers.list().find((server) => server.id === serverId);
    if (!host?.compatibility?.capabilities.includes(capability))
      throw new Error(`The server does not have ${capability}.`);
    return runCauseEffect(remoteServers.request(serverId, path, decoder, { method: "POST", body }));
  }
  return {
    replies: {
      getRule: scopedQueryHandler({
        local: () => replyRule.get(),
        remote: (serverId) => remote(serverId, REPLY_RULE_CAPABILITY, REPLY_ROUTES.rule, decodeReplyRuleSettings, {}),
      }),
      setRule: scopedHandler(parseReplyRuleSettings, {
        local: (settings) => runCauseEffect(replyRule.set(settings)),
        remote: (settings, serverId) =>
          remote(serverId, REPLY_RULE_CAPABILITY, REPLY_ROUTES.updateRule, decodeReplyRuleSettings, settings),
      }),
      readTurnSteps: scopedHandler(parseTurnStepDetailsInput, {
        local: ({ agentId, turnId }): TurnStepDetails => service.readTurnStepDetails(agentId, turnId),
        remote: (input, serverId) =>
          remote(serverId, TURN_STEP_DETAILS_CAPABILITY, REPLY_ROUTES.turnStepDetails, decodeTurnStepDetails, input),
      }),
    },
  };
}
