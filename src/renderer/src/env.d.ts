/// <reference types="vite/client" />

import type { CodeBotDesktopApi } from "@codebot/contracts/ipc";

declare global {
  interface HighlightRegistry {
    set(name: string, highlight: Highlight): this;
    delete(name: string): boolean;
  }

  interface Window {
    codebot: CodeBotDesktopApi;
  }

  interface ExtensionSignInMessage {
    kind: string;
    state: string;
    code?: string;
    error?: string;
  }

  interface ExtensionMessaging {
    sendMessage?(extensionId: string, message: ExtensionSignInMessage): Promise<{ received?: boolean } | undefined>;
  }

  var chrome: { runtime?: ExtensionMessaging } | undefined;
}
