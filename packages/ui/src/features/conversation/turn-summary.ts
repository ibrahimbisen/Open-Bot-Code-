import { type ConversationTraceActivity, traceStepActivity } from "@codebot/contracts/ipc";
import type { TextValue } from "../../text";

export interface TurnSummaryStep {
  activity?: string | undefined;
  targets?: readonly string[] | undefined;
}

export type TurnActivityCounts = Partial<Record<ConversationTraceActivity, number>>;

const SUMMARY_ORDER = ["editing", "running", "reading", "searching", "browsing", "delegating", "working"] as const;

const SUMMARY_KEYS = {
  editing: "reply.summary.edited",
  running: "reply.summary.ran",
  reading: "reply.summary.read",
  searching: "reply.summary.searched",
  browsing: "reply.summary.browsed",
  delegating: "reply.summary.delegated",
  working: "reply.summary.worked",
} as const satisfies Record<ConversationTraceActivity, string>;

const COUNTS_BY_TARGET = new Set<ConversationTraceActivity>(["editing", "reading", "browsing"]);

export function turnActivityCounts(steps: readonly TurnSummaryStep[]): TurnActivityCounts {
  const stepCounts = new Map<ConversationTraceActivity, number>();
  const targets = new Map<ConversationTraceActivity, Set<string>>();
  for (const step of steps) {
    const activity = traceStepActivity({ activity: step.activity });
    if (activity === null) continue;
    stepCounts.set(activity, (stepCounts.get(activity) ?? 0) + 1);
    const known = targets.get(activity) ?? new Set<string>();
    for (const target of step.targets ?? []) known.add(target);
    targets.set(activity, known);
  }
  const counts: TurnActivityCounts = {};
  for (const activity of SUMMARY_ORDER) {
    const steps = stepCounts.get(activity) ?? 0;
    if (steps === 0) continue;
    const named = targets.get(activity)?.size ?? 0;
    counts[activity] = COUNTS_BY_TARGET.has(activity) && named > 0 ? named : steps;
  }
  return counts;
}

export function turnSummaryLine(counts: TurnActivityCounts, text: TextValue): string {
  const parts = SUMMARY_ORDER.flatMap((activity) => {
    const count = counts[activity];
    return count ? [text.t(SUMMARY_KEYS[activity], { count })] : [];
  });
  const line = text.format.list(parts);
  return line.charAt(0).toLocaleUpperCase() + line.slice(1);
}
