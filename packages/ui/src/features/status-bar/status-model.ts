import {
  isLocalModelServerMachine,
  type LocalModelServerGpuSummary,
  type LocalModelServerStatus,
  localModelServerGpuSummary,
} from "@codebot/contracts/ipc";
import { type PlanLimitTone, planLimitWindowKind } from "@codebot/team-client/plan-limits";
import type { AccountUsageProviderRow, AccountUsageWindowRow } from "../account/account-usage-view";
import { accountUsageRowKey } from "../account/account-usage-view";

export interface StatusLimitWindow {
  remainingPercent: number;
  tone: PlanLimitTone;
  resetsAtLabel: string | null;
}

export interface StatusProviderEntry {
  key: string;
  row: AccountUsageProviderRow;
  fiveHour: StatusLimitWindow | null;
  weekly: StatusLimitWindow | null;
}

function lowestWindow(
  windows: readonly AccountUsageWindowRow[],
  kind: "fiveHour" | "weekly",
): StatusLimitWindow | null {
  let lowest: AccountUsageWindowRow | null = null;
  for (const window of windows) {
    if (planLimitWindowKind(window.durationMins).kind !== kind) continue;
    if (lowest === null || window.remainingPercent < lowest.remainingPercent) lowest = window;
  }
  return lowest
    ? { remainingPercent: lowest.remainingPercent, tone: lowest.tone, resetsAtLabel: lowest.resetsAtLabel }
    : null;
}

export function statusProviderEntry(row: AccountUsageProviderRow): StatusProviderEntry {
  return {
    key: accountUsageRowKey(row),
    row,
    fiveHour: lowestWindow(row.windows, "fiveHour"),
    weekly: lowestWindow(row.windows, "weekly"),
  };
}

export function statusProviderEntries(rows: readonly AccountUsageProviderRow[]): StatusProviderEntry[] {
  return rows.map(statusProviderEntry).filter((entry) => entry.fiveHour !== null || entry.weekly !== null);
}

export type StatusMachineTone = "ok" | "busy" | "offline" | "unknown";

export function statusMachineTone(status: LocalModelServerStatus): StatusMachineTone {
  if (status.state === "offline") return "offline";
  if (status.state !== "online") return "unknown";
  const summary = localModelServerGpuSummary(status.gpus);
  const memory =
    summary.memoryUsedBytes !== null && summary.memoryTotalBytes
      ? summary.memoryUsedBytes / summary.memoryTotalBytes
      : 0;
  return (summary.utilizationPercent ?? 0) >= 90 || memory >= 0.95 ? "busy" : "ok";
}

export interface StatusMachineEntry {
  status: LocalModelServerStatus;
  tone: StatusMachineTone;
  gpu: LocalModelServerGpuSummary;
  loadedCount: number | null;
}

export function statusMachineEntry(status: LocalModelServerStatus): StatusMachineEntry {
  return {
    status,
    tone: statusMachineTone(status),
    gpu: localModelServerGpuSummary(status.gpus),
    loadedCount: status.loadedModels === null ? null : status.loadedModels.length,
  };
}

export function statusMachineEntries(statuses: readonly LocalModelServerStatus[]): StatusMachineEntry[] {
  return statuses
    .filter((status) => status.state !== "off" && isLocalModelServerMachine(status))
    .map(statusMachineEntry);
}
