import type { CodeBotDesktopApi } from "@codebot/contracts/ipc";

export interface ProjectBrowserPort {
  browser: Pick<
    CodeBotDesktopApi["browser"],
    | "activate"
    | "getDisplayState"
    | "navigate"
    | "onDisplayState"
    | "open"
    | "releaseControl"
    | "reload"
    | "setVisible"
    | "takeControl"
  >;
}

export function projectBrowserPort(): ProjectBrowserPort {
  return window.codebot;
}
