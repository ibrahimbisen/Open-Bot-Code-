import {
  isProjectActivityChangedEvent,
  isProjectActivityList,
  isProjectChat,
  isProjectChatSearchPage,
  isProjectChatsChangedEvent,
  isProjectChatsPage,
  isProjectDetail,
  isProjectFolderChange,
  isProjectFolderChoice,
  isProjectSummary,
  isProjectSummaryList,
  isProjectsChangedEvent,
} from "@codebot/contracts/ipc";
import { guardedDecoder } from "@codebot/contracts/ipc-decoding";

export const decodeProjectSummary = guardedDecoder(isProjectSummary, "project response");
export const decodeProjectSummaries = guardedDecoder(isProjectSummaryList, "projects response");
export const decodeProjectDetail = guardedDecoder(isProjectDetail, "project detail response");
export const decodeProjectFolderChange = guardedDecoder(isProjectFolderChange, "project folder response");
export const decodeProjectFolderChoice = guardedDecoder(isProjectFolderChoice, "project folder choice");
export const decodeProjectChat = guardedDecoder(isProjectChat, "project chat response");
export const decodeProjectChatsPage = guardedDecoder(isProjectChatsPage, "project chats response");
export const decodeProjectChatSearchPage = guardedDecoder(isProjectChatSearchPage, "project chat search response");
export const decodeProjectActivityList = guardedDecoder(isProjectActivityList, "project activity response");
export const decodeProjectsChangedEvent = guardedDecoder(isProjectsChangedEvent, "projects event");
export const decodeProjectChatsChangedEvent = guardedDecoder(isProjectChatsChangedEvent, "project chats event");
export const decodeProjectActivityChangedEvent = guardedDecoder(
  isProjectActivityChangedEvent,
  "project activity event",
);
