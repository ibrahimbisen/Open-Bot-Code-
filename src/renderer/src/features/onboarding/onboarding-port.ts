import type { CodeBotDesktopApi } from "@codebot/contracts/ipc";

export interface OnboardingPort {
  getSetupState: CodeBotDesktopApi["getSetupState"];
  saveSetup: CodeBotDesktopApi["saveSetup"];
  onSetupState: CodeBotDesktopApi["onSetupState"];
  servers: Pick<CodeBotDesktopApi["servers"], "previewInvite">;
  openUrl: CodeBotDesktopApi["openUrl"];
}

export function onboardingPort(): OnboardingPort {
  return window.codebot;
}
