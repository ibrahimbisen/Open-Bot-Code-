import type { CodeBotDesktopApi } from "@codebot/contracts/ipc";

export interface BrowserDockPort {
  agent: Pick<CodeBotDesktopApi["agent"], "respondToBrowserSecret">;
  browserDock: Pick<
    CodeBotDesktopApi["browserDock"],
    "getPresentation" | "onPresentation" | "performAction" | "setFrame"
  >;
}

export function browserDockPort(): BrowserDockPort {
  return window.codebot;
}
