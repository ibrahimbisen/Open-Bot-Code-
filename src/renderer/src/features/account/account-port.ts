import type { CodeBotDesktopApi } from "@codebot/contracts/ipc";

export interface AccountPort {
  agent: Pick<CodeBotDesktopApi["agent"], "getUsage">;
  auth: Pick<
    CodeBotDesktopApi["auth"],
    | "cancelMobileConnect"
    | "createMobileConnect"
    | "createMobileConnectLink"
    | "getMobileConnectLink"
    | "getState"
    | "listAccountSessions"
    | "listMobileConnectedDevices"
    | "logout"
    | "onEvent"
    | "signIn"
    | "cancelSignIn"
    | "getServiceSettings"
    | "setServiceUrl"
    | "retry"
    | "revokeAccountSession"
    | "revokeMobileConnectedDevice"
    | "revokeMobileConnectLink"
    | "updateAvatar"
    | "updateChatColor"
    | "updateName"
  >;
}

export function accountPort(): AccountPort {
  return window.codebot;
}
