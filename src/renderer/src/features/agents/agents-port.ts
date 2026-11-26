import type { CodeBotDesktopApi } from "@codebot/contracts/ipc";

export interface AgentsPort {
  agent: Pick<
    CodeBotDesktopApi["agent"],
    | "createAgent"
    | "deleteAgent"
    | "duplicateAgent"
    | "getAgentAdminSettings"
    | "getAgentHostSettings"
    | "updateAgentHostSettings"
    | "getAgentBackupModels"
    | "updateAgentBackupModels"
    | "getAgentNewChat"
    | "updateAgentNewChat"
    | "getAgentPlanCard"
    | "updateAgentPlanCard"
    | "getAgentBuiltinMemory"
    | "updateAgentBuiltinMemory"
    | "getAgentFastMode"
    | "updateAgentFastMode"
    | "listAgents"
    | "listConversationReads"
    | "listModels"
    | "onEvent"
    | "getRuntimeSnapshot"
    | "listPendingPrompts"
    | "setAgentHidden"
    | "setAgentNotificationLevel"
    | "setAvatar"
    | "updateAgent"
    | "updateAgentAdminSettings"
  >;
  providerAdmin: Pick<CodeBotDesktopApi["providerAdmin"], "accounts" | "accountUsage">;
}

export function agentsPort(): AgentsPort {
  return window.codebot;
}
