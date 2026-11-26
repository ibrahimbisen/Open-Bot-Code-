import type { AttachmentSummary, CodeBotDesktopApi, FilePreview } from "@codebot/contracts/ipc";
import type { AttachmentMediaSource } from "@codebot/ui/features/conversation/AttachmentCards";
import type { ChannelMemoriesApi } from "../conversation/memories-port";
import type { EventRoutinesApi } from "../conversation/routine-webhooks-api";
import type { ChannelRoutinesApi } from "../conversation/routines-port";
import type { ChannelFoldersApi } from "./channel-folders-port";

export interface ChannelsPort {
  agent: Pick<
    CodeBotDesktopApi["agent"],
    | "channelCommand"
    | "chooseAttachments"
    | "listChannels"
    | "openAttachment"
    | "readChannel"
    | "respondToApproval"
    | "respondToBrowserSecret"
    | "respondToBrowserTakeover"
    | "respondToPrompt"
  > &
    ChannelMemoriesApi &
    ChannelRoutinesApi &
    Partial<Pick<CodeBotDesktopApi["agent"], "discardDraftAttachment" | "downloadAttachments">> &
    Partial<Pick<CodeBotDesktopApi["agent"], "deleteChannelMessage">> &
    Partial<Pick<CodeBotDesktopApi["agent"], "setChannelImage">> &
    Partial<ChannelFoldersApi & Pick<CodeBotDesktopApi["agent"], "chooseChannelFolder">> &
    Partial<
      Pick<
        CodeBotDesktopApi["agent"],
        "clearChannelContext" | "compactChannelContext" | "channelCompactAvailability" | "deleteChannelHistory"
      >
    >;
  eventRoutines?: EventRoutinesApi | undefined;
  browser: Pick<CodeBotDesktopApi["browser"], "capturePreview">;
  openUrl: CodeBotDesktopApi["openUrl"];
  fileActions: "native" | "browser";
  previewAttachment?: (attachment: AttachmentSummary) => Promise<FilePreview>;
  attachmentMedia?: AttachmentMediaSource;
  visualPage?: (attachment: AttachmentSummary) => Promise<string>;
  importAttachments?: (files: File[]) => Promise<AttachmentSummary[]>;
  onAttachmentImport?: CodeBotDesktopApi["agent"]["onAttachmentImport"];
}

export function channelsPort(): ChannelsPort {
  const api = window.codebot;
  return {
    agent: api.agent,
    browser: api.browser,
    openUrl: (url) => api.openUrl(url),
    fileActions: "native",
    onAttachmentImport: (listener) => api.agent.onAttachmentImport(listener),
  };
}
