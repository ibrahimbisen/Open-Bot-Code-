import type { CodeBotDesktopApi } from "@codebot/contracts/ipc";

export interface UsagePort {
  agent: Pick<CodeBotDesktopApi["agent"], "getHostAnalytics" | "listAgents" | "onScopedEvent">;
  servers: Pick<CodeBotDesktopApi["servers"], "onEvent">;
}

export function usagePort(): UsagePort {
  return window.codebot;
}
