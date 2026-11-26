import type { CodeBotDesktopApi } from "@codebot/contracts/ipc";

export interface ComputerUsePort {
  computerUse: CodeBotDesktopApi["computerUse"];
  remoteDesktop: Pick<CodeBotDesktopApi["remoteDesktop"], "checkSetup">;
  update: Pick<CodeBotDesktopApi["update"], "getStatus" | "restartWhenIdle">;
}

export function computerUsePort(): ComputerUsePort {
  return window.codebot;
}
