import type { CodeBotDesktopApi } from "@codebot/contracts/ipc";

export interface TeamPort {
  servers: Pick<CodeBotDesktopApi["servers"], "onPresence" | "setTyping">;
}

export function teamPort(): TeamPort {
  return window.codebot;
}
