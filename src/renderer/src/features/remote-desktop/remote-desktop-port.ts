import type { CodeBotDesktopApi } from "@codebot/contracts/ipc";

export interface RemoteDesktopPort {
  remoteDesktop: Pick<
    CodeBotDesktopApi["remoteDesktop"],
    "connect" | "disconnect" | "list" | "onEvent" | "selectDisplay"
  >;
}

export function remoteDesktopPort(): RemoteDesktopPort {
  return window.codebot;
}
