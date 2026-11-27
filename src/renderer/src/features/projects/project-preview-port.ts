import type { CodeBotDesktopApi } from "@codebot/contracts/ipc";

export interface ProjectPreviewPort {
  agent: Pick<
    CodeBotDesktopApi["agent"],
    "openSharedFile" | "openWorkspaceFile" | "previewSharedFile" | "previewWorkspaceFile" | "releaseFilePreview"
  >;
}

export function projectPreviewPort(): ProjectPreviewPort {
  return window.codebot;
}
