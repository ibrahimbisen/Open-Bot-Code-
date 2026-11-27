import {
  isExplorerChange,
  isExplorerDirectory,
  isExplorerEntry,
  isExplorerEntryOrNull,
  isExplorerFile,
  isExplorerGitCommitFiles,
  isExplorerGitDiff,
  isExplorerGitLog,
  isExplorerGitStatus,
  isExplorerRoots,
  isExplorerWriteResult,
} from "@codebot/contracts/ipc";
import { guardedDecoder } from "@codebot/contracts/ipc-decoding";

export const decodeExplorerRoots = guardedDecoder(isExplorerRoots, "explorer roots");
export const decodeExplorerDirectory = guardedDecoder(isExplorerDirectory, "explorer directory");
export const decodeExplorerEntry = guardedDecoder(isExplorerEntry, "explorer entry");
export const decodeExplorerEntryOrNull = guardedDecoder(isExplorerEntryOrNull, "explorer entry");
export const decodeExplorerFile = guardedDecoder(isExplorerFile, "explorer file");
export const decodeExplorerWriteResult = guardedDecoder(isExplorerWriteResult, "explorer write result");
export const decodeExplorerChange = guardedDecoder(isExplorerChange, "explorer change");
export const decodeExplorerGitStatus = guardedDecoder(isExplorerGitStatus, "explorer git status");
export const decodeExplorerGitLog = guardedDecoder(isExplorerGitLog, "explorer git log");
export const decodeExplorerGitCommitFiles = guardedDecoder(isExplorerGitCommitFiles, "explorer git commit files");
export const decodeExplorerGitDiff = guardedDecoder(isExplorerGitDiff, "explorer git diff");
