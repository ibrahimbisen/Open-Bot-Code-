import {
  type ConversationTraceActivity,
  TURN_STEP_DETAIL_LIMITS,
  type TurnStepDetail,
  type TurnStepFileDiff,
} from "@codebot/contracts/ipc";
import { type DynamicRecord, isString } from "@codebot/contracts/runtime-values";
import { getArray, getRecord, getString, isRecord, type ThreadItem } from "../protocol";
import { addedLines, lineDiff } from "./line-diff";
import { STEP_DETAIL_CONTENT_KEY, STEP_DETAIL_INPUT_KEY, STEP_DETAIL_RESULT_KEY } from "./step-detail-keys";

type Redact = (text: string) => string;

interface Capped {
  text: string;
  truncated: boolean;
}

const WINDOW_FACTOR = 4;
const PATH_KEYS = ["file_path", "filePath", "path", "target_file", "notebook_path", "filename"] as const;
const OLD_KEYS = ["old_string", "oldString", "old_str", "oldText", "old_text"] as const;
const NEW_KEYS = ["new_string", "newString", "new_str", "newText", "new_text"] as const;
const CONTENT_KEYS = ["content", "file_text", "contents", "new_content"] as const;
const RESULT_KEYS = [
  "error",
  "aggregatedOutput",
  "stderr",
  "message",
  "output",
  "text",
  "content",
  "contentItems",
  "result",
] as const;

function capHead(text: string, limit: number, redact: Redact, keepIndent = false): Capped {
  const window = text.length > limit * WINDOW_FACTOR ? text.slice(0, limit * WINDOW_FACTOR) : text;
  const clean = keepIndent ? redact(window).trimEnd() : redact(window).trim();
  if (clean.length <= limit && window.length === text.length) return { text: clean, truncated: false };
  return { text: clean.slice(0, limit).replace(/[\uD800-\uDBFF]$/u, ""), truncated: true };
}

function capTail(text: string, limit: number, redact: Redact): Capped {
  const window = text.length > limit * WINDOW_FACTOR ? text.slice(-limit * WINDOW_FACTOR) : text;
  const clean = redact(window).trim();
  if (clean.length <= limit && window.length === text.length) return { text: clean, truncated: false };
  return { text: clean.slice(-limit).replace(/^[\uDC00-\uDFFF]/u, ""), truncated: true };
}

function firstString(record: unknown, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = getString(record, key);
    if (value !== null) return value;
  }
  return null;
}

type ToolInput = DynamicRecord | string | null;

function toolInput(value: unknown): ToolInput {
  if (isRecord(value)) return value;
  if (Array.isArray(value)) return value.length > 0 ? JSON.stringify(value, null, 2) : null;
  if (!isString(value)) return null;
  const text = value.trim();
  if (!text.startsWith("{")) return text || null;
  try {
    const decoded = JSON.parse(text);
    return isRecord(decoded) ? decoded : text;
  } catch {
    return text;
  }
}

function rawInput(item: ThreadItem): ToolInput {
  return toolInput(item[STEP_DETAIL_INPUT_KEY]) ?? toolInput(item.arguments);
}

function withoutKeys(record: DynamicRecord, keys: readonly string[]): DynamicRecord {
  return Object.fromEntries(Object.entries(record).filter(([key]) => !keys.includes(key)));
}

function inputText(item: ThreadItem, input: ToolInput, diffed: boolean): string | null {
  const command = getString(item, "command");
  if (command) return command;
  if (isString(input)) return input;
  if (input !== null) {
    const shown = diffed ? withoutKeys(input, [...OLD_KEYS, ...NEW_KEYS, ...CONTENT_KEYS, "edits"]) : input;
    return Object.keys(shown).length > 0 ? JSON.stringify(shown, null, 2) : null;
  }
  return getString(item, "query") ?? getString(item, "pattern") ?? getString(item, "url") ?? getString(item, "path");
}

function editPairs(input: DynamicRecord): { before: string; after: string }[] {
  const pairs = [input, ...getArray(input, "edits").filter(isRecord)].flatMap((edit) => {
    const before = firstString(edit, OLD_KEYS);
    const after = firstString(edit, NEW_KEYS);
    return before === null && after === null ? [] : [{ before: before ?? "", after: after ?? "" }];
  });
  return pairs;
}

function patchDiff(result: unknown): string | null {
  const hunks = getArray(result, "structuredPatch").filter(isRecord);
  const lines = hunks.flatMap((hunk) => {
    const body = getArray(hunk, "lines").filter(isString);
    if (body.length === 0) return [];
    const header = `@@ -${Number(hunk.oldStart) || 0},${Number(hunk.oldLines) || 0} +${Number(hunk.newStart) || 0},${Number(hunk.newLines) || 0} @@`;
    return [header, ...body];
  });
  return lines.length > 0 ? lines.join("\n") : null;
}

function contentDiffs(item: ThreadItem): { path: string; diff: string }[] {
  return getArray(item, STEP_DETAIL_CONTENT_KEY).flatMap((entry) => {
    if (!isRecord(entry) || entry.type !== "diff") return [];
    const path = getString(entry, "path") ?? "";
    const after = getString(entry, "newText") ?? "";
    const before = getString(entry, "oldText");
    const diff = before === null ? addedLines(after) : lineDiff(before, after);
    return diff ? [{ path, diff }] : [];
  });
}

function rawDiffs(item: ThreadItem, input: ToolInput, filePaths: readonly unknown[]): { path: string; diff: string }[] {
  const changes = getArray(item, "changes").flatMap((change) => {
    const diff = getString(change, "diff");
    return diff ? [{ path: getString(change, "path") ?? "", diff }] : [];
  });
  if (changes.length > 0) return changes;
  const fallbackPath = filePaths.find(isString) ?? "";
  const result = item[STEP_DETAIL_RESULT_KEY];
  const patch = patchDiff(result);
  if (patch) return [{ path: getString(result, "filePath") ?? fallbackPath, diff: patch }];
  const content = contentDiffs(item);
  if (content.length > 0) return content;
  if (input === null || isString(input)) return [];
  const path = fallbackPath || (firstString(input, PATH_KEYS) ?? "");
  const pairs = editPairs(input);
  if (pairs.length > 0) {
    const diff = pairs
      .map(({ before, after }) => lineDiff(before, after))
      .filter(Boolean)
      .join("\n@@\n");
    return diff ? [{ path, diff }] : [];
  }
  const written = firstString(input, CONTENT_KEYS);
  return written ? [{ path, diff: addedLines(written) }] : [];
}

function resultText(value: unknown, depth = 0): string | null {
  if (depth > 4) return null;
  if (isString(value)) return value.trim() || null;
  if (Array.isArray(value)) {
    const parts = value.map((entry) => resultText(entry, depth + 1)).filter(isString);
    return parts.length > 0 ? parts.join("\n") : null;
  }
  if (!isRecord(value)) return null;
  for (const key of RESULT_KEYS) {
    const text = resultText(value[key], depth + 1);
    if (text) return text;
  }
  return null;
}

function outputText(item: ThreadItem): string | null {
  const found = resultText(item);
  if (found) return found;
  const result = getRecord(item, "result");
  return result && Object.keys(result).length > 0 ? JSON.stringify(result, null, 2) : null;
}

export interface StepInputParts {
  input?: string;
  inputTruncated?: true;
  diffs?: TurnStepFileDiff[];
}

export function stepInputParts(
  item: ThreadItem,
  activity: ConversationTraceActivity,
  filePaths: readonly unknown[],
  redact: Redact,
): StepInputParts {
  const input = rawInput(item);
  const diffs =
    activity === "editing"
      ? rawDiffs(item, input, filePaths)
          .slice(0, TURN_STEP_DETAIL_LIMITS.diffFiles)
          .map(({ path, diff }): TurnStepFileDiff => {
            const capped = capHead(diff, TURN_STEP_DETAIL_LIMITS.diff, redact, true);
            return {
              path: redact(path).slice(0, TURN_STEP_DETAIL_LIMITS.path),
              diff: capped.text,
              ...(capped.truncated ? { truncated: true as const } : {}),
            };
          })
          .filter((entry) => entry.diff !== "")
      : [];
  const text = inputText(item, input, diffs.length > 0);
  const capped = text ? capHead(text, TURN_STEP_DETAIL_LIMITS.input, redact) : null;
  return {
    ...(capped?.text ? { input: capped.text } : {}),
    ...(capped?.truncated ? { inputTruncated: true as const } : {}),
    ...(diffs.length > 0 ? { diffs } : {}),
  };
}

export function stepDetail(
  stepId: string,
  item: ThreadItem,
  activity: ConversationTraceActivity,
  started: StepInputParts | undefined,
  filePaths: readonly unknown[],
  redact: Redact,
): TurnStepDetail | null {
  const completed = stepInputParts(item, activity, filePaths, redact);
  const input = completed.input ?? started?.input;
  const inputTruncated = completed.input !== undefined ? completed.inputTruncated : started?.inputTruncated;
  const diffs = completed.diffs ?? started?.diffs;
  const text = outputText(item);
  const output = text
    ? activity === "running"
      ? capTail(text, TURN_STEP_DETAIL_LIMITS.output, redact)
      : capHead(text, TURN_STEP_DETAIL_LIMITS.output, redact)
    : null;
  if (!input && !output?.text && !diffs?.length) return null;
  return {
    stepId,
    ...(input ? { input } : {}),
    ...(inputTruncated ? { inputTruncated: true as const } : {}),
    ...(output?.text ? { output: output.text } : {}),
    ...(output?.truncated ? { outputTruncated: true as const } : {}),
    ...(diffs?.length ? { diffs } : {}),
  };
}

export function stepDetailBytes(detail: TurnStepDetail): number {
  return (
    (detail.input?.length ?? 0) +
    (detail.output?.length ?? 0) +
    (detail.diffs ?? []).reduce((total, diff) => total + diff.path.length + diff.diff.length, 0)
  );
}

export function withinTurnBudget(detail: TurnStepDetail, usedBytes: number): TurnStepDetail {
  if (usedBytes + stepDetailBytes(detail) <= TURN_STEP_DETAIL_LIMITS.turnBytes) return detail;
  return {
    stepId: detail.stepId,
    ...(detail.input ? { input: detail.input } : {}),
    ...(detail.inputTruncated ? { inputTruncated: true as const } : {}),
    ...(detail.output ? { outputTruncated: true as const } : {}),
    ...(detail.diffs?.length
      ? { diffs: detail.diffs.map((diff) => ({ path: diff.path, diff: "", truncated: true as const })) }
      : {}),
  };
}
