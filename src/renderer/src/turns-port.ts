import type { CodeBotDesktopApi } from "@codebot/contracts/ipc";

export interface TurnsPort {
  agent: Pick<
    CodeBotDesktopApi["agent"],
    | "cancelQueuedMessage"
    | "cancelWait"
    | "clearContext"
    | "compactContext"
    | "compactTaskContext"
    | "deleteHistory"
    | "interrupt"
    | "listActiveQueues"
    | "listQueue"
    | "listRoutines"
    | "listWaits"
    | "readPendingApproval"
    | "reorderQueue"
    | "respondToApproval"
    | "respondToBrowserTakeover"
    | "respondToPrompt"
    | "steerQueuedMessage"
    | "updateQueuedMessage"
  >;
}

export function turnsPort(): TurnsPort {
  return window.codebot;
}
