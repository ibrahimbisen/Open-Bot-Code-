import type { AgentProviderState, AgentStatus } from "@codebot/contracts/ipc";

export function fallbackProviderState(status: AgentStatus): AgentProviderState {
  return status.phase === "starting" || status.phase === "restarting" ? "checking" : "error";
}
