import type { CodeBotDesktopApi, DeleteSharedTableInput, SharedTable } from "@codebot/contracts/ipc";

export interface ConversationPort {
  dynamicIsland: Pick<CodeBotDesktopApi["dynamicIsland"], "openBrowserTakeover">;
  agent: Pick<
    CodeBotDesktopApi["agent"],
    | "addPreviewPage"
    | "readAgentSessionSettings"
    | "listAgentNotificationLevels"
    | "askSideQuestion"
    | "saveSkillSuggestion"
    | "setAgentSessionSetting"
    | "resetAgentSessionSetting"
    | "onScopedEvent"
    | "deleteConversationMessage"
    | "deleteTable"
    | "listMemories"
    | "listPinnedMessages"
    | "listRoutines"
    | "listTables"
    | "markConversationRead"
    | "markConversationUnread"
    | "readConversationPage"
    | "releaseFilePreview"
    | "searchConversationMessages"
    | "sendMessage"
    | "setMessagePinned"
    | "withdrawFeedback"
  >;
  browser: Pick<
    CodeBotDesktopApi["browser"],
    | "capturePreview"
    | "closeWindow"
    | "finishLocalSignIn"
    | "onLiveViewEvent"
    | "onWindowEvent"
    | "openLocalSignIn"
    | "sendLiveViewInput"
    | "startLiveView"
    | "stopLiveView"
  >;
  servers: Pick<
    CodeBotDesktopApi["servers"],
    | "listDirectThreads"
    | "markDirectRead"
    | "onDirectMessage"
    | "onDirectTyping"
    | "readDirectConversationPage"
    | "sendDirectMessage"
    | "setDirectTyping"
  >;
  storage: Pick<CodeBotDesktopApi["storage"], "openLocation">;
  hostAdmin: Pick<CodeBotDesktopApi["hostAdmin"], "getAgentAccess">;
  browserDock: Pick<CodeBotDesktopApi["browserDock"], "publishPresentation" | "onAction" | "onShown">;
}

export function conversationPort(): ConversationPort {
  return window.codebot;
}

export function releaseFilePreviewPage(pageUrl: string | undefined): void {
  if (!pageUrl) return;
  void conversationPort()
    .agent.releaseFilePreview(pageUrl)
    .catch(() => undefined);
}

export interface SharedTableCalls {
  listTables(): Promise<SharedTable[]>;
  deleteTable(input: DeleteSharedTableInput): Promise<void>;
}
