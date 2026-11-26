import { isBoundedString, isIdentifier, isNullableBoundedString } from "./ipc-bounded-values";
import { DEFAULT_REPLY_RULE, PROJECT_LIMITS } from "./ipc-projects";
import { isDynamicRecord } from "./runtime-values";

export const REPLY_RULE_CAPABILITY = "reply-rule-v1";
export const TURN_STEP_DETAILS_CAPABILITY = "turn-step-details-v1";

export const REPLY_ROUTES = {
  rule: "/v1/host/reply-rule",
  updateRule: "/v1/admin/host/reply-rule/update",
  turnStepDetails: "/v1/agents/turn-step-details",
} as const;

export interface ReplyRuleSettings {
  rule: string | null;
}

export function isReplyRuleSettings(value: unknown): value is ReplyRuleSettings {
  return isDynamicRecord(value) && isNullableBoundedString(value.rule, PROJECT_LIMITS.replyRule);
}

export function decodeReplyRuleSettings(value: unknown): ReplyRuleSettings {
  if (!isReplyRuleSettings(value)) throw new Error("Invalid reply rule.");
  return { rule: value.rule };
}

export function effectiveReplyRule(
  projectRule: string | null | undefined,
  globalRule: string | null | undefined,
): string {
  return (projectRule ?? globalRule ?? DEFAULT_REPLY_RULE).trim();
}

export const TURN_STEP_DETAIL_LIMITS = {
  input: 2_000,
  output: 8_000,
  diff: 16_000,
  diffFiles: 8,
  path: 500,
  steps: 500,
  turnBytes: 512_000,
} as const;

export interface TurnStepFileDiff {
  path: string;
  diff: string;
  truncated?: true | undefined;
}

export interface TurnStepDetail {
  stepId: string;
  input?: string | undefined;
  inputTruncated?: true | undefined;
  output?: string | undefined;
  outputTruncated?: true | undefined;
  diffs?: TurnStepFileDiff[] | undefined;
}

export interface TurnStepDetails {
  turnId: string;
  steps: TurnStepDetail[];
}

export interface TurnStepDetailsInput {
  agentId: string;
  turnId: string;
}

function isTruncatedMark(value: unknown): value is true | undefined {
  return value === undefined || value === true;
}

function isTurnStepFileDiff(value: unknown): value is TurnStepFileDiff {
  return (
    isDynamicRecord(value) &&
    isBoundedString(value.path, TURN_STEP_DETAIL_LIMITS.path) &&
    isBoundedString(value.diff, TURN_STEP_DETAIL_LIMITS.diff) &&
    isTruncatedMark(value.truncated)
  );
}

export function isTurnStepDetail(value: unknown): value is TurnStepDetail {
  return (
    isDynamicRecord(value) &&
    isIdentifier(value.stepId) &&
    (value.input === undefined || isBoundedString(value.input, TURN_STEP_DETAIL_LIMITS.input)) &&
    isTruncatedMark(value.inputTruncated) &&
    (value.output === undefined || isBoundedString(value.output, TURN_STEP_DETAIL_LIMITS.output)) &&
    isTruncatedMark(value.outputTruncated) &&
    (value.diffs === undefined ||
      (Array.isArray(value.diffs) &&
        value.diffs.length <= TURN_STEP_DETAIL_LIMITS.diffFiles &&
        value.diffs.every(isTurnStepFileDiff)))
  );
}

export function isTurnStepDetails(value: unknown): value is TurnStepDetails {
  return (
    isDynamicRecord(value) &&
    isIdentifier(value.turnId) &&
    Array.isArray(value.steps) &&
    value.steps.length <= TURN_STEP_DETAIL_LIMITS.steps &&
    value.steps.every(isTurnStepDetail)
  );
}

export function decodeTurnStepDetails(value: unknown): TurnStepDetails {
  if (!isTurnStepDetails(value)) throw new Error("Invalid turn step details.");
  return value;
}
