import type { CodeBotDesktopApi } from "@codebot/contracts/ipc";

export interface SettingsPort {
  getAgentDefaults: CodeBotDesktopApi["getAgentDefaults"];
  getAgentMemoryLimitPreference: CodeBotDesktopApi["getAgentMemoryLimitPreference"];
  getAnalyticsPreference: CodeBotDesktopApi["getAnalyticsPreference"];
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
  onAnalyticsPreference: CodeBotDesktopApi["onAnalyticsPreference"];
  onApprovalAutomation: CodeBotDesktopApi["onApprovalAutomation"];
  onOpenSettings: CodeBotDesktopApi["onOpenSettings"];
  onOpenUpdateSettings: CodeBotDesktopApi["onOpenUpdateSettings"];
  setAnalyticsPreference: CodeBotDesktopApi["setAnalyticsPreference"];
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
  notifications: Pick<CodeBotDesktopApi["notifications"], "getPreference" | "openSettings" | "setPreference" | "test">;
  update: Pick<CodeBotDesktopApi["update"], "getPreference" | "onPreference" | "setPreference">;
}

export function settingsPort(): SettingsPort {
  return window.codebot;
}
