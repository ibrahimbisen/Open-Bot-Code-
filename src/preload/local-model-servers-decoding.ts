import {
  isLocalModelServerCandidates,
  isLocalModelServerStatuses,
  isLocalModelServerTestResult,
  type LocalModelServerCandidate,
  type LocalModelServerStatus,
  type LocalModelServerTestResult,
} from "@codebot/contracts/ipc";

export function decodeLocalModelServerStatuses(value: unknown): LocalModelServerStatus[] {
  if (!isLocalModelServerStatuses(value)) throw new Error("Invalid local model server status response.");
  return value;
}

export function decodeLocalModelServerTestResult(value: unknown): LocalModelServerTestResult {
  if (!isLocalModelServerTestResult(value)) throw new Error("Invalid local model server test response.");
  return value;
}

export function decodeLocalModelServerCandidates(value: unknown): LocalModelServerCandidate[] {
  if (!isLocalModelServerCandidates(value)) throw new Error("Invalid local model server scan response.");
  return value;
}
