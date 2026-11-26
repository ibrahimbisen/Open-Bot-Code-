import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import type { HookCallbackMatcher, Options, Settings } from "@anthropic-ai/claude-agent-sdk";
import { type DynamicRecord, isDynamicRecord, isString } from "@codebot/contracts/runtime-values";
import { Effect, Result } from "effect";
import { workspaceTemporaryPaths } from "../agent/workspace-sandbox";
import {
  claudeExcludedWriteMessage,
  claudeWorkspaceSandbox,
  claudeWriteInExcluded,
  claudeWriteOutsideRoots,
  resolveExisting,
} from "../claude-workspace-sandbox";
import { runCauseEffect } from "../effect-boundary";
import { isPathInside } from "../path-containment";
import type { FolderLock } from "./folder-lock";
import { personalFolders, strictHiddenFolders } from "./personal-folders";

export type ClaudeShellGate = "sandbox" | "container" | "ask";

export interface ClaudeLockContext {
  readonly lock: FolderLock;
  readonly cwd: string;
  readonly shell: ClaudeShellGate;
  readonly configDirectory: string;
  readonly readableFolders: readonly string[];
  sessionFolder: string | null;
}

export type ClaudeLockVerdict =
  | { readonly kind: "allow" }
  | { readonly kind: "deny"; readonly message: string }
  | { readonly kind: "ask"; readonly command: string };

export interface ClaudeLockPlan {
  readonly context: ClaudeLockContext;
  readonly sandbox: NonNullable<Settings["sandbox"]> | null;
  readonly hooks: NonNullable<Options["hooks"]>;
}

export interface ClaudeLockPlanInput {
  readonly cwd: string;
  readonly configDirectory: string;
  readonly shell: ClaudeShellGate;
  readonly engineFolder: string | null;
  readonly skillFolders: readonly string[];
}

const ALLOW: ClaudeLockVerdict = { kind: "allow" };
const WRITE_TOOLS: ReadonlySet<string> = new Set(["Write", "Edit", "MultiEdit", "NotebookEdit"]);
const SHELL_TOOLS: ReadonlySet<string> = new Set(["Bash", "PowerShell"]);
const SEARCH_ROOT_TOOLS: ReadonlySet<string> = new Set(["Grep", "LS"]);
const PATH_KEY =
  /(?:^|_)(?:path|paths|file|files|dir|dirs|directory|directories|folder|folders|cwd)$|(?:Path|Paths|File|Files|Dir|Directory|Folder)$/u;
const GLOB_CHARACTERS = /[*?[\]{}]/u;
const PATTERN_LEAVES_BASE = /(?:^|[\\/{,])\.\.(?=[\\/},]|$)|(?:^|[{,])(?:~|[\\/]|[A-Za-z]:)/u;
const OUTSIDE_RULE =
  "Work only inside the project folders. If the task needs something outside them, stop and ask the user.";

export function claudeLockPlan(lock: FolderLock, input: ClaudeLockPlanInput): ClaudeLockPlan {
  const context: ClaudeLockContext = {
    lock,
    cwd: input.cwd,
    shell: input.shell,
    configDirectory: input.configDirectory,
    readableFolders: [...new Set([...lock.readOnlyFolders, ...input.skillFolders])],
    sessionFolder: null,
  };
  return {
    context,
    sandbox: input.shell === "sandbox" ? claudeLockSandbox(lock, input) : null,
    hooks: claudeLockHooks(context),
  };
}

export function claudeLockSandbox(
  lock: FolderLock,
  input: Pick<ClaudeLockPlanInput, "configDirectory" | "engineFolder" | "skillFolders">,
  platform: NodeJS.Platform = process.platform,
  home: string = homedir(),
): NonNullable<Settings["sandbox"]> {
  const base = claudeWorkspaceSandbox(lock.allowedFolders, lock.excludedFolders);
  const hidden =
    lock.level === "strict"
      ? strictHiddenFolders(platform, process.env, home)
      : personalFolders(platform, process.env, home);
  const denyRead = hidden.filter((folder) => !lock.allowedFolders.some((allowed) => isPathInside(allowed, folder)));
  if (denyRead.length === 0) return base;
  const allowRead = [
    ...new Set([
      ...(base.filesystem?.allowWrite ?? []),
      ...lock.readOnlyFolders,
      ...input.skillFolders,
      ...(lock.level === "strict"
        ? [join(input.configDirectory, "shell-snapshots"), ...(input.engineFolder ? [input.engineFolder] : [])]
        : []),
    ]),
  ];
  return { ...base, filesystem: { ...base.filesystem, denyRead, allowRead } };
}

export function claudeLockHooks(context: ClaudeLockContext): NonNullable<Options["hooks"]> {
  const matcher: HookCallbackMatcher = {
    hooks: [
      async (input) => {
        if (input.hook_event_name !== "PreToolUse") return {};
        noteSessionFolder(context, input.session_id, input.transcript_path);
        const verdict = await runCauseEffect(
          claudeLockVerdict(context, input.tool_name, input.tool_input, input.cwd || context.cwd),
        ).catch(
          (): ClaudeLockVerdict => ({ kind: "deny", message: `Folder lock: this call is blocked. ${OUTSIDE_RULE}` }),
        );
        if (verdict.kind === "allow") return {};
        return {
          hookSpecificOutput: {
            hookEventName: "PreToolUse",
            permissionDecision: verdict.kind,
            permissionDecisionReason:
              verdict.kind === "deny"
                ? verdict.message
                : "Folder lock: the OS sandbox is not available, so the user must allow this command.",
          },
        };
      },
    ],
  };
  return { PreToolUse: [matcher] };
}

function noteSessionFolder(context: ClaudeLockContext, sessionId: string, transcriptPath: string): void {
  if (context.sessionFolder !== null || !sessionId || !transcriptPath) return;
  const projects = join(context.configDirectory, "projects");
  if (basename(transcriptPath) !== `${sessionId}.jsonl` || !isPathInside(projects, resolve(transcriptPath))) return;
  context.sessionFolder = join(dirname(resolve(transcriptPath)), sessionId);
}

export const claudeLockVerdict = Effect.fn("ClaudeLock.verdict")(function* (
  context: ClaudeLockContext,
  toolName: string,
  toolInput: unknown,
  cwd: string = context.cwd,
) {
  if (toolName.startsWith("mcp__")) return ALLOW;
  const input: DynamicRecord = isDynamicRecord(toolInput) ? toolInput : {};
  if (WRITE_TOOLS.has(toolName)) return yield* writeVerdict(context, toolName, input, cwd);
  if (SHELL_TOOLS.has(toolName) || isString(input.command)) return shellVerdict(context, input);
  if (isString(input.url) && /^\s*file:/iu.test(input.url))
    return deny(`Folder lock: ${toolName} cannot open a file address. ${OUTSIDE_RULE}`);
  const targets = readTargets(toolName, input, cwd);
  if (targets === null)
    return deny(
      `Folder lock: the search pattern of ${toolName} leaves the search folder. Give a folder inside the project folders in path, and a pattern below it. ${OUTSIDE_RULE}`,
    );
  if (targets.length === 0) return ALLOW;
  const roots = yield* realFolders(
    targets.every((target) => target.known) ? readableFolders(context) : writableFolders(context),
  );
  for (const target of targets) {
    const real = yield* Effect.result(resolveExisting(target.path));
    if (Result.isSuccess(real) && roots.some((root) => isPathInside(root, real.success))) continue;
    return deny(
      `Folder lock: ${target.path} is outside the project folders. Do not read, search or list outside them. ${OUTSIDE_RULE}`,
    );
  }
  return ALLOW;
});

const writeVerdict = Effect.fn("ClaudeLock.writeVerdict")(function* (
  context: ClaudeLockContext,
  toolName: string,
  input: DynamicRecord,
  cwd: string,
) {
  const raw = input.file_path ?? input.notebook_path;
  const target = isString(raw) && raw.trim() !== "" ? { file_path: claudeEnginePath(raw, cwd) } : {};
  const excluded = yield* claudeWriteInExcluded(toolName, target, cwd, context.lock.excludedFolders);
  if (excluded) return deny(claudeExcludedWriteMessage(excluded));
  const outside = yield* claudeWriteOutsideRoots(toolName, target, cwd, context.lock.allowedFolders);
  if (!outside) return ALLOW;
  return deny(
    `Folder lock: ${outside} is outside the project folders, or it is a settings file of the provider. This write is blocked, and no approval can allow it. ${OUTSIDE_RULE}`,
  );
});

function shellVerdict(context: ClaudeLockContext, input: DynamicRecord): ClaudeLockVerdict {
  if (context.shell === "ask") return { kind: "ask", command: isString(input.command) ? input.command : "" };
  if (context.shell === "sandbox" && input.dangerouslyDisableSandbox === true)
    return deny("Folder lock: a command cannot run outside the sandbox. Send the command again without that option.");
  return ALLOW;
}

interface ReadTarget {
  readonly path: string;
  readonly known: boolean;
}

function readTargets(toolName: string, input: DynamicRecord, cwd: string): ReadTarget[] | null {
  const at = (value: unknown): ReadTarget => ({
    path: claudeEnginePath(isString(value) ? value : "", cwd),
    known: true,
  });
  if (toolName === "Read") return [at(input.file_path)];
  if (toolName === "NotebookRead") return [at(input.notebook_path)];
  if (SEARCH_ROOT_TOOLS.has(toolName)) return [at(input.path)];
  if (toolName === "Glob") {
    const pattern = isString(input.pattern) ? input.pattern.trim() : "";
    if (isAbsolute(pattern) && !pattern.startsWith("{")) return [at(input.path), at(staticPrefix(pattern))];
    return PATTERN_LEAVES_BASE.test(pattern) ? null : [at(input.path)];
  }
  return Object.entries(input).flatMap(([key, value]) => {
    if (!PATH_KEY.test(key)) return [];
    const values = Array.isArray(value) ? value.filter(isString) : isString(value) ? [value] : [];
    return values
      .filter((path) => path.trim() !== "")
      .map((path) => ({ path: claudeEnginePath(path, cwd), known: false }));
  });
}

export function claudeEnginePath(raw: string, cwd: string, platform: NodeJS.Platform = process.platform): string {
  const text = raw.trim();
  if (text === "") return resolve(cwd);
  if (text === "~") return homedir();
  if (/^~[\\/]/u.test(text)) return join(homedir(), text.slice(2));
  const drive = platform === "win32" ? /^[\\/](?:cygdrive[\\/])?([A-Za-z])(?=[\\/]|$)/u.exec(text) : null;
  if (drive?.[1]) return resolve(`${drive[1].toUpperCase()}:\\${text.slice(drive[0].length)}`);
  return resolve(cwd, text);
}

function staticPrefix(pattern: string): string {
  const parts = pattern.split(/[\\/]/u);
  const first = parts.findIndex((part) => GLOB_CHARACTERS.test(part));
  const kept = first < 0 ? parts : parts.slice(0, first);
  return kept.join("/") || "/";
}

function writableFolders(context: ClaudeLockContext): string[] {
  return [...context.lock.allowedFolders, ...workspaceTemporaryPaths()];
}

function readableFolders(context: ClaudeLockContext): string[] {
  return [
    ...writableFolders(context),
    ...context.readableFolders,
    ...(context.sessionFolder ? [context.sessionFolder] : []),
  ];
}

const realFolders = Effect.fn("ClaudeLock.realFolders")(function* (folders: readonly string[]) {
  const found = yield* Effect.forEach(folders, (folder) => Effect.result(resolveExisting(resolve(folder))), {
    concurrency: "unbounded",
  });
  return found.flatMap((result) => (Result.isSuccess(result) ? [result.success] : []));
});

function deny(message: string): ClaudeLockVerdict {
  return { kind: "deny", message };
}
