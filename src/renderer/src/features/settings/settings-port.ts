import type { CodeBotDesktopApi } from "@codebot/contracts/ipc";

export interface SettingsPort {
  getAgentDefaults: CodeBotDesktopApi["getAgentDefaults"];
  getAgentMemoryLimitPreference: CodeBotDesktopApi["getAgentMemoryLimitPreference"];
  getAppBehaviorPreference: CodeBotDesktopApi["getAppBehaviorPreference"];
  getApprovalAutomation: CodeBotDesktopApi["getApprovalAutomation"];
  getBusyMessageModePreference: CodeBotDesktopApi["getBusyMessageModePreference"];
  getExternalLinkPreference: CodeBotDesktopApi["getExternalLinkPreference"];
  listExternalLinkBrowsers: CodeBotDesktopApi["listExternalLinkBrowsers"];
  chooseExternalLinkApp: CodeBotDesktopApi["chooseExternalLinkApp"];
  onExternalLinkFallback: CodeBotDesktopApi["onExternalLinkFallback"];
  getRemoteNetworkRoute: CodeBotDesktopApi["getRemoteNetworkRoute"];
  getRemoteSessionReusePreference: CodeBotDesktopApi["getRemoteSessionReusePreference"];
  onAgentMemoryLimitPreference: CodeBotDesktopApi["onAgentMemoryLimitPreference"];
  onApprovalAutomation: CodeBotDesktopApi["onApprovalAutomation"];
  onOpenSettings: CodeBotDesktopApi["onOpenSettings"];
  onOpenUpdateSettings: CodeBotDesktopApi["onOpenUpdateSettings"];
  setAppBehaviorPreference: CodeBotDesktopApi["setAppBehaviorPreference"];
  setExternalLinkPreference: CodeBotDesktopApi["setExternalLinkPreference"];
  setRemoteNetworkRoute: CodeBotDesktopApi["setRemoteNetworkRoute"];
  setRemoteSessionReusePreference: CodeBotDesktopApi["setRemoteSessionReusePreference"];
  agent: Pick<
    CodeBotDesktopApi["agent"],
    "listAgents" | "updateAgent" | "listAgentNotificationLevels" | "setAgentNotificationLevel" | "onScopedEvent"
  >;
  dynamicIsland: Pick<
    CodeBotDesktopApi["dynamicIsland"],
    "getBuiltInDisplayGeometry" | "getPreference" | "onPreference" | "setPreference" | "setXWayland"
  >;
  replies: Pick<CodeBotDesktopApi["replies"], "getRule" | "setRule">;
  notifications: Pick<CodeBotDesktopApi["notifications"], "getPreference" | "openSettings" | "setPreference" | "test">;
  update: Pick<CodeBotDesktopApi["update"], "getPreference" | "onPreference" | "setPreference">;
}

export function settingsPort(): SettingsPort {
  return window.codebot;
}
