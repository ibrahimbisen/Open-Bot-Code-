import type { CodeBotDesktopApi } from "@codebot/contracts/ipc";

export interface VoicePort {
  voice: CodeBotDesktopApi["voice"];
}

export function voicePort(): VoicePort {
  return window.codebot;
}
