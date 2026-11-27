import { INPUT_LIMITS } from "./input-limits";
import { isBoundedString, isIdentifier, isNullableBoundedString } from "./ipc-bounded-values";
import { isDynamicRecord, isNumber, isOneOf } from "./runtime-values";

export const CONVERSATION_TRACE_STEP_KINDS = ["reasoning", "tool", "message"] as const;
export type ConversationTraceStepKind = (typeof CONVERSATION_TRACE_STEP_KINDS)[number];

export const CONVERSATION_TRACE_ACTIVITIES = [
  "editing",
  "running",
  "reading",
  "searching",
  "browsing",
  "delegating",
  "working",
] as const;
export type ConversationTraceActivity = (typeof CONVERSATION_TRACE_ACTIVITIES)[number];

export const CONVERSATION_TRACE_TARGET_LIMIT = 16;
const ACTIVITY_LIMIT = 32;

export interface ConversationTraceStep {
  id: string;
  kind: ConversationTraceStepKind;
  text?: string | undefined;
  command?: string | undefined;
  recipientAgentIds?: string[] | undefined;
  startedAt: string;
  endedAt: string | null;
  failed?: true | undefined;
  error?: string | undefined;
  activity?: string | undefined;
  targets?: string[] | undefined;
}

export function traceStepActivity(step: Pick<ConversationTraceStep, "activity">): ConversationTraceActivity | null {
  if (step.activity === undefined) return null;
  return isOneOf(CONVERSATION_TRACE_ACTIVITIES, step.activity) ? step.activity : "working";
}

export interface ConversationTurnTrace {
  startedAt: string;
  endedAt: string | null;
  steps: ConversationTraceStep[];
  tokens?: number | undefined;
  cachedInput?: number | undefined;
  costUsd?: number | null | undefined;
}

export const CONVERSATION_TRACE_STEP_LIMIT = 500;
export const CONVERSATION_TRACE_TEXT_LIMIT = 500;
const TIME_LIMIT = 160;

export function isConversationTurnTrace(value: unknown): value is ConversationTurnTrace {
  return (
    isDynamicRecord(value) &&
    isBoundedString(value.startedAt, TIME_LIMIT) &&
    isNullableBoundedString(value.endedAt, TIME_LIMIT) &&
    Array.isArray(value.steps) &&
    value.steps.length <= CONVERSATION_TRACE_STEP_LIMIT &&
    value.steps.every(isConversationTraceStep) &&
    (value.tokens === undefined || isCount(value.tokens)) &&
    (value.cachedInput === undefined || isCount(value.cachedInput)) &&
    (value.costUsd === undefined || value.costUsd === null || isCost(value.costUsd))
  );
}

function isConversationTraceStep(value: unknown): value is ConversationTraceStep {
  return (
    isDynamicRecord(value) &&
    isIdentifier(value.id) &&
    isOneOf(CONVERSATION_TRACE_STEP_KINDS, value.kind) &&
    (value.text === undefined || isBoundedString(value.text, CONVERSATION_TRACE_TEXT_LIMIT)) &&
    (value.command === undefined || isBoundedString(value.command, CONVERSATION_TRACE_TEXT_LIMIT)) &&
    (value.error === undefined || isBoundedString(value.error, CONVERSATION_TRACE_TEXT_LIMIT)) &&
    (value.recipientAgentIds === undefined ||
      (Array.isArray(value.recipientAgentIds) &&
        value.recipientAgentIds.length <= INPUT_LIMITS.messageRecipients &&
        value.recipientAgentIds.every(isIdentifier))) &&
    isBoundedString(value.startedAt, TIME_LIMIT) &&
    isNullableBoundedString(value.endedAt, TIME_LIMIT) &&
    (value.failed === undefined || value.failed === true) &&
    (value.activity === undefined || isBoundedString(value.activity, ACTIVITY_LIMIT)) &&
    (value.targets === undefined ||
      (Array.isArray(value.targets) &&
        value.targets.length <= CONVERSATION_TRACE_TARGET_LIMIT &&
        value.targets.every((target) => isBoundedString(target, CONVERSATION_TRACE_TEXT_LIMIT))))
  );
}

function isCount(value: unknown): value is number {
  return isNumber(value) && Number.isSafeInteger(value) && value >= 0;
}

function isCost(value: unknown): value is number {
  return isNumber(value) && Number.isFinite(value) && value >= 0;
}
