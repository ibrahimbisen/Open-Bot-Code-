import type { CodeBotDesktopApi } from "@codebot/contracts/ipc";
import type { CompanySignInCalls } from "./features/servers/ServerCompanySignInSection";

export interface AppPort {
  getAppInfo: CodeBotDesktopApi["getAppInfo"];
  getAppAppearancePreference: CodeBotDesktopApi["getAppAppearancePreference"];
  getAppInterfaceSizePreference: CodeBotDesktopApi["getAppInterfaceSizePreference"];
  getAppLanguagePreference: CodeBotDesktopApi["getAppLanguagePreference"];
  getAppLogoColorPreference: CodeBotDesktopApi["getAppLogoColorPreference"];
  listInstalledFonts: CodeBotDesktopApi["listInstalledFonts"];
  onAppAppearancePreference: CodeBotDesktopApi["onAppAppearancePreference"];
  onAppInterfaceSizePreference: CodeBotDesktopApi["onAppInterfaceSizePreference"];
  onAppLanguagePreference: CodeBotDesktopApi["onAppLanguagePreference"];
  onAppLogoColorPreference: CodeBotDesktopApi["onAppLogoColorPreference"];
  openExternal: CodeBotDesktopApi["openExternal"];
  getSentMessageStats: CodeBotDesktopApi["getSentMessageStats"];
  reportRendererTiming: CodeBotDesktopApi["reportRendererTiming"];
  openUrl: CodeBotDesktopApi["openUrl"];
  openChatWindow: CodeBotDesktopApi["openChatWindow"];
  getChatWindows: CodeBotDesktopApi["getChatWindows"];
  onChatWindows: CodeBotDesktopApi["onChatWindows"];
  onQuitShortcutHint: CodeBotDesktopApi["onQuitShortcutHint"];
  setAppAppearancePreference: CodeBotDesktopApi["setAppAppearancePreference"];
  setAppInterfaceSizePreference: CodeBotDesktopApi["setAppInterfaceSizePreference"];
  setAppLanguagePreference: CodeBotDesktopApi["setAppLanguagePreference"];
  setAppLogoColorPreference: CodeBotDesktopApi["setAppLogoColorPreference"];
  agent: Pick<
    CodeBotDesktopApi["agent"],
    | "readConversationPage"
    | "searchConversationMessages"
    | "searchConversationFiles"
    | "listRoutines"
    | "listAgents"
    | "onScopedEvent"
  >;
  agentTemplates: Pick<CodeBotDesktopApi["agentTemplates"], "onOpenLink" | "takePendingLink">;
  acpRegistry: CodeBotDesktopApi["acpRegistry"];
  hostedSites: CodeBotDesktopApi["hostedSites"];
  billing: CodeBotDesktopApi["billing"];
  credits: CodeBotDesktopApi["credits"];
  license: CodeBotDesktopApi["license"];
  auth: CompanySignInCalls &
    Pick<
      CodeBotDesktopApi["auth"],
      "listOwnerTransfers" | "acceptOwnerTransfer" | "declineOwnerTransfer" | "onOwnerTransfersChanged"
    >;
  hostedServers: CodeBotDesktopApi["hostedServers"];
  routineFeed: CodeBotDesktopApi["routineFeed"];
  events: CodeBotDesktopApi["events"];
  plugins: Pick<CodeBotDesktopApi["plugins"], "onOpenListing" | "takePendingListing">;
  marketplace: Pick<CodeBotDesktopApi["marketplace"], "onOpenListing" | "takePendingListing">;
  servers: Pick<
    CodeBotDesktopApi["servers"],
    "onInvite" | "takePendingInvite" | "getOwnerTransfer" | "startOwnerTransfer" | "cancelOwnerTransfer"
  >;
}

export function appPort(): AppPort {
  return window.codebot;
}
