import type { CodeBotDesktopApi } from "@codebot/contracts/ipc";

export type ExplorerPort = CodeBotDesktopApi["explorer"];

export function explorerPort(): ExplorerPort {
  return window.codebot.explorer;
}
