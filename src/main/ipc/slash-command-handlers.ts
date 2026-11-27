import { parseResumeSessionInput, parseSlashCommandChatInput } from "@codebot/contracts/ipc";
import type { AgentService } from "../../backend/agent-service";
import { runCauseEffect } from "../../backend/effect-boundary";
import { type IpcGroupHandlers, payloadHandler } from "./define-ipc-group";
import { stringPayload } from "./validation";

export interface SlashCommandIpcDependencies {
  service: Pick<AgentService, "listSlashCommands" | "listResumableSessions" | "resumeAgentSession">;
}

export function slashCommandIpcHandlers({
  service,
}: SlashCommandIpcDependencies): Pick<IpcGroupHandlers, "slashCommands"> {
  return {
    slashCommands: {
      list: payloadHandler(parseSlashCommandChatInput, (input) => runCauseEffect(service.listSlashCommands(input))),
      listSessions: payloadHandler(stringPayload("agentId"), (agentId) =>
        runCauseEffect(service.listResumableSessions(agentId)),
      ),
      resumeSession: payloadHandler(parseResumeSessionInput, (input) =>
        runCauseEffect(service.resumeAgentSession(input)),
      ),
    },
  };
}
