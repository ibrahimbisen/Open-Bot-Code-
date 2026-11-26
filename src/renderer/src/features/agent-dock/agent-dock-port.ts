import type { CodeBotDesktopApi } from "@codebot/contracts/ipc";

export interface AgentDockPort {
  agentDock: CodeBotDesktopApi["agentDock"];
  agent: Pick<CodeBotDesktopApi["agent"], "respondToBrowserSecret">;
}

export function agentDockPort(): AgentDockPort {
  return window.codebot;
}
