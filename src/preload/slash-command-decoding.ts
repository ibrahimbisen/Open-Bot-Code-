import {
  isResumableSessionList,
  isResumeSessionResult,
  isSlashCommandList,
  isSlashCommandsChanged,
  type ResumableSessionList,
  type ResumeSessionResult,
  type SlashCommandList,
  type SlashCommandsChanged,
} from "@codebot/contracts/ipc";

export function decodeSlashCommandList(value: unknown): SlashCommandList {
  if (!isSlashCommandList(value)) throw new Error("Invalid slash command list.");
  return value;
}

export function decodeResumableSessionList(value: unknown): ResumableSessionList {
  if (!isResumableSessionList(value)) throw new Error("Invalid resumable session list.");
  return value;
}

export function decodeResumeSessionResult(value: unknown): ResumeSessionResult {
  if (!isResumeSessionResult(value)) throw new Error("Invalid resume session result.");
  return value;
}

export function decodeSlashCommandsChanged(value: unknown): SlashCommandsChanged {
  if (!isSlashCommandsChanged(value)) throw new Error("Invalid slash commands change.");
  return value;
}
