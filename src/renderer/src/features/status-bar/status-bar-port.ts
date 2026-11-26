import type { CodeBotDesktopApi } from "@codebot/contracts/ipc";

export interface StatusBarPort {
  localModelServers: CodeBotDesktopApi["localModelServers"];
}

export function statusBarPort(): StatusBarPort {
  return window.codebot;
}
