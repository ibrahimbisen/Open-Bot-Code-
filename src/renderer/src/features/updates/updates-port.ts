import type { CodeBotDesktopApi, IdleRestartTarget, UpdateStatus } from "@codebot/contracts/ipc";

export interface UpdatesPort {
  update: Pick<
    CodeBotDesktopApi["update"],
    | "check"
    | "download"
    | "getStatus"
    | "install"
    | "onEvent"
    | "cancelScheduledRestart"
    | "restartWhenIdle"
    | "cancelIdleRestart"
    | "restartNow"
  >;
}

export function updatesPort(): UpdatesPort {
  return window.codebot;
}

export function idleRestartTarget(status: UpdateStatus): IdleRestartTarget {
  return status.phase === "ready" && status.managedByHost !== true ? "update" : "relaunch";
}
