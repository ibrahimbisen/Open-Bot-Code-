import type { CodeBotDesktopApi } from "@codebot/contracts/ipc";

export interface SidebarPort {
  agent: Pick<
    CodeBotDesktopApi["agent"],
    "getSidebarLayout" | "mutateSidebarLayout" | "getSidebarPins" | "setSidebarPins" | "seedSidebarPins"
  >;
  storage: Pick<CodeBotDesktopApi["storage"], "getDisk" | "getMachineMetrics">;
  hostAdmin: Pick<CodeBotDesktopApi["hostAdmin"], "getMachineAlerts">;
}

export type SidebarCardsPort = Pick<SidebarPort, "storage" | "hostAdmin">;

export function sidebarPort(): SidebarPort {
  return window.codebot;
}
