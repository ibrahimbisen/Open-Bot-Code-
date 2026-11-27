import {
  isResumableSessionList,
  isResumeSessionResult,
  isSlashCommandList,
  parseResumeSessionInput,
  parseSlashCommandChatInput,
} from "@codebot/contracts/ipc";
import { guardedDecoder } from "@codebot/contracts/ipc-decoding";
import {
  SLASH_COMMANDS_CAPABILITY,
  SLASH_COMMANDS_ROUTES,
  type SlashCommandsOperation,
} from "@codebot/contracts/team-protocol/slash-commands-v1";
import { sourceText } from "@codebot/i18n/source";
import type { Effect } from "effect";
import type { AgentService } from "../../backend/agent-service";
import { runCauseEffect } from "../../backend/effect-boundary";
import type { ResponseDecoder } from "../remote-host-decoding";
import type { RemoteRequestInit } from "../remote-server-client";
import type { RemoteWorkflowError } from "../remote-service-effects";
import type { IpcGroupHandlers } from "./define-ipc-group";
import { scopedHandler } from "./scoped-handler";
import { stringPayload } from "./validation";

export interface SlashCommandIpcDependencies {
  service: Pick<AgentService, "listSlashCommands" | "listResumableSessions" | "resumeAgentSession">;
  remoteServers: {
    supportsCapability(serverId: string, capability: typeof SLASH_COMMANDS_CAPABILITY): boolean;
    request<T>(
      serverId: string,
      path: string,
      decoder: ResponseDecoder<T>,
      init?: RemoteRequestInit,
    ): Effect.Effect<T, RemoteWorkflowError>;
  };
}

const decodeList = guardedDecoder(isSlashCommandList, "slash command list response");
const decodeSessions = guardedDecoder(isResumableSessionList, "saved chat list response");
const decodeResumed = guardedDecoder(isResumeSessionResult, "resume response");

export function slashCommandIpcHandlers({
  service,
  remoteServers,
}: SlashCommandIpcDependencies): Pick<IpcGroupHandlers, "slashCommands"> {
  function remote<T>(
    serverId: string,
    operation: SlashCommandsOperation,
    decoder: ResponseDecoder<T>,
    input: unknown,
  ): Promise<T> {
    if (!remoteServers.supportsCapability(serverId, SLASH_COMMANDS_CAPABILITY))
      throw new Error(sourceText("error.slash.serverUnsupported"));
    return runCauseEffect(
      remoteServers.request(serverId, SLASH_COMMANDS_ROUTES[operation], decoder, { method: "POST", body: { input } }),
    );
  }

  return {
    slashCommands: {
      list: scopedHandler(parseSlashCommandChatInput, {
        local: (input) => runCauseEffect(service.listSlashCommands(input)),
        remote: (input, serverId) => remote(serverId, "list", decodeList, input),
      }),
      listSessions: scopedHandler(stringPayload("agentId"), {
        local: (agentId) => runCauseEffect(service.listResumableSessions(agentId)),
        remote: (agentId, serverId) => remote(serverId, "listSessions", decodeSessions, { agentId }),
      }),
      resumeSession: scopedHandler(parseResumeSessionInput, {
        local: (input) => runCauseEffect(service.resumeAgentSession(input)),
        remote: (input, serverId) => remote(serverId, "resumeSession", decodeResumed, input),
      }),
    },
  };
}
