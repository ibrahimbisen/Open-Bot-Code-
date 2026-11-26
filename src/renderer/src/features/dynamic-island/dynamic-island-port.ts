import type { CodeBotDesktopApi } from "@codebot/contracts/ipc";

export interface DynamicIslandPort {
  agent: Pick<CodeBotDesktopApi["agent"], "acknowledgeFailedTurn" | "onScopedEvent">;
  dynamicIsland: Pick<
    CodeBotDesktopApi["dynamicIsland"],
    | "getPreference"
    | "getPresentation"
    | "onAction"
    | "onGeometry"
    | "onPreference"
    | "onPresentation"
    | "performAction"
    | "performHaptic"
    | "publishPresentation"
    | "setInteractive"
    | "setInputRegion"
  >;
}

export function dynamicIslandPort(): DynamicIslandPort {
  return window.codebot;
}
