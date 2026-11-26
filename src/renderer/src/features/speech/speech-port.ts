import type { CodeBotDesktopApi } from "@codebot/contracts/ipc";

export interface SpeechPort {
  voice: Pick<
    CodeBotDesktopApi["voice"],
    | "getSpeechSettings"
    | "setSpeechSettings"
    | "getSpeechModelStatus"
    | "getModelStatuses"
    | "downloadSpeechModel"
    | "onSpeechModelStatus"
    | "speak"
    | "warmSpeech"
    | "keepRecording"
    | "getServer"
    | "onServerSettings"
  >;
  agent: Pick<CodeBotDesktopApi["agent"], "readConversationPage" | "discardDraftAttachment">;
}

export function speechPort(): SpeechPort {
  return window.codebot;
}
