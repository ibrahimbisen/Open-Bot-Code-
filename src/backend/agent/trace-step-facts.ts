import {
  CONVERSATION_TRACE_TARGET_LIMIT,
  CONVERSATION_TRACE_TEXT_LIMIT,
  type ConversationTraceActivity,
} from "@codebot/contracts/ipc";
import { isString } from "@codebot/contracts/runtime-values";
import { redactText } from "@codebot/logging";
import { bridgedToolName, getArray, getRecord, getString, isRecord, type ThreadItem } from "../protocol";
import { codeBotTool, toolActivity, toolUsage } from "./thread-items";

export interface TraceStepFacts {
  activity: ConversationTraceActivity;
  targets: string[];
}

const FILE_SEARCH_TOOLS = new Set(["grep", "glob", "find", "ls", "search", "list"]);
const FILE_READ_TOOLS = new Set(["read", "notebookread", "view"]);
const FILE_EDIT_TOOLS = new Set(["edit", "multiedit", "write", "notebookedit", "patch", "apply_patch"]);
const COMMAND_TOOLS = new Set(["bash", "powershell", "shell"]);
const ACP_SEARCH_KIND = "search";

function toolName(item: ThreadItem): string {
  return (getString(item, "tool") ?? getString(item, "name") ?? "").toLowerCase();
}

function commandAction(item: ThreadItem): { type: string; path: string | null; query: string | null } | null {
  if (item.type !== "commandExecution") return null;
  const action = getArray(item, "commandActions").find(isRecord);
  const type = getString(action, "type");
  if (!action || !type) return null;
  return { type, path: getString(action, "path") ?? getString(action, "name"), query: getString(action, "query") };
}

function urlHost(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.hostname : null;
  } catch {
    return null;
  }
}

function searchQuery(item: ThreadItem): string | null {
  const direct = getString(item, "query") ?? getString(item, "pattern");
  if (direct) return direct;
  const args = getRecord(item, "arguments");
  const bridged = bridgedToolName(item) ? getRecord(args, "arguments") : args;
  return getString(bridged, "query") ?? getString(bridged, "pattern");
}

function changedPaths(item: ThreadItem): string[] {
  return getArray(item, "changes").flatMap((change) => {
    const path = getString(change, "path");
    return path ? [path] : [];
  });
}

function providerBuiltIn(item: ThreadItem): boolean {
  return item.type === "dynamicToolCall" && !getString(item, "namespace") && bridgedToolName(item) === null;
}

function activityOf(item: ThreadItem): ConversationTraceActivity {
  const base = toolActivity(item, false);
  if (base === "browsing" || base === "delegating") return base;
  const codeBot = providerBuiltIn(item) ? null : codeBotTool(item);
  if (codeBot !== null) return codeBot === "web_search" ? "searching" : "working";
  const kind = toolUsage(item)?.kind ?? "other";
  if (kind === "mcp") return "working";
  const action = commandAction(item);
  if (action?.type === "read") return "reading";
  if (action?.type === "search" || action?.type === "listFiles") return "searching";
  const name = toolName(item);
  if (getString(item, "toolKind") === ACP_SEARCH_KIND || FILE_SEARCH_TOOLS.has(name)) return "searching";
  if (kind === "file_change" || FILE_EDIT_TOOLS.has(name)) return "editing";
  if (kind === "file_read" || FILE_READ_TOOLS.has(name)) return "reading";
  if (kind === "command" || COMMAND_TOOLS.has(name)) return "running";
  if (kind === "web_search") return "searching";
  if (kind === "web_fetch") return "browsing";
  if (kind === "subagent") return "delegating";
  return "working";
}

function targetsOf(item: ThreadItem, activity: ConversationTraceActivity, filePaths: readonly unknown[]): string[] {
  const action = commandAction(item);
  if (activity === "editing") return [...filePaths.filter(isString), ...changedPaths(item)];
  if (activity === "reading") {
    const path = action?.path ?? getString(item, "path");
    return [...filePaths.filter(isString), ...(path ? [path] : [])];
  }
  if (activity === "searching") {
    const query = action?.query ?? searchQuery(item) ?? action?.path;
    return query ? [query] : [];
  }
  if (activity === "browsing") {
    const host = urlHost(getString(item, "url") ?? getString(getRecord(item, "arguments"), "url"));
    return host ? [host] : [];
  }
  return [];
}

export function mergeTraceTargets(known: readonly string[] | undefined, added: readonly string[]): string[] {
  const merged = [...(known ?? [])];
  for (const target of added) {
    if (merged.length >= CONVERSATION_TRACE_TARGET_LIMIT) break;
    const clean = redactText(target.trim()).slice(0, CONVERSATION_TRACE_TEXT_LIMIT);
    if (clean && !merged.includes(clean)) merged.push(clean);
  }
  return merged;
}

export function traceStepFacts(item: ThreadItem, filePaths: readonly unknown[] = []): TraceStepFacts {
  const activity = activityOf(item);
  return { activity, targets: mergeTraceTargets(undefined, targetsOf(item, activity, filePaths)) };
}
