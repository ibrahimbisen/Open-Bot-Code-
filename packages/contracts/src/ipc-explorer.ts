import { INPUT_LIMITS } from "./input-limits";
import { integerInRange, isBoundedString, isFiniteNumber, isIdentifier } from "./ipc-bounded-values";
import { isBoolean, isDynamicRecord, isOneOf } from "./runtime-values";

export const EXPLORER_LIMITS = {
  roots: 64,
  name: 255,
  directoryPage: 1_000,
  editableBytes: 5 * 1_024 * 1_024,
  truncatedBytes: 1_024 * 1_024,
  writeCharacters: 16 * 1_024 * 1_024,
  previewBytes: 64 * 1_024 * 1_024,
  expandedDirectories: 1_000,
  changedPaths: 400,
  gitFiles: 5_000,
  gitLogPage: 200,
  gitCommitFiles: 2_000,
  gitDiffBytes: 2 * 1_024 * 1_024,
  gitText: 2_000,
  gitRefs: 64,
  gitParents: 16,
} as const;

export interface ExplorerScope {
  agentId: string;
}

export function explorerScopeKey(scope: ExplorerScope): string {
  return `agent:${scope.agentId}`;
}

export function isExplorerScope(value: unknown): value is ExplorerScope {
  return isDynamicRecord(value) && isIdentifier(value.agentId);
}

function scopeOf(value: unknown): ExplorerScope {
  if (!isDynamicRecord(value) || !isExplorerScope(value.scope)) throw new Error("Invalid explorer scope.");
  return { agentId: value.scope.agentId };
}

function isPath(value: unknown): value is string {
  return isBoundedString(value, INPUT_LIMITS.path) && value.length > 0 && !value.includes("\0");
}

function pathOf(value: unknown, field: string): string {
  const path = isDynamicRecord(value) ? value[field] : undefined;
  if (!isPath(path)) throw new Error(`Invalid explorer ${field}.`);
  return path;
}

export const EXPLORER_SEPARATORS = ["/", "\\"] as const;
export type ExplorerSeparator = (typeof EXPLORER_SEPARATORS)[number];

export interface ExplorerRoot {
  path: string;
  name: string;
}

export interface ExplorerRoots {
  roots: ExplorerRoot[];
  separator: ExplorerSeparator;
}

function isExplorerRoot(value: unknown): value is ExplorerRoot {
  return isDynamicRecord(value) && isPath(value.path) && isBoundedString(value.name, INPUT_LIMITS.path);
}

export function isExplorerRoots(value: unknown): value is ExplorerRoots {
  return (
    isDynamicRecord(value) &&
    Array.isArray(value.roots) &&
    value.roots.length <= EXPLORER_LIMITS.roots &&
    value.roots.every(isExplorerRoot) &&
    isOneOf(EXPLORER_SEPARATORS, value.separator)
  );
}

export const EXPLORER_ENTRY_KINDS = ["file", "directory"] as const;
export type ExplorerEntryKind = (typeof EXPLORER_ENTRY_KINDS)[number];

export interface ExplorerEntry {
  name: string;
  path: string;
  kind: ExplorerEntryKind;
  size: number;
  modifiedAt: number;
  symlink: boolean;
}

export function isExplorerEntry(value: unknown): value is ExplorerEntry {
  return (
    isDynamicRecord(value) &&
    isBoundedString(value.name, INPUT_LIMITS.path) &&
    isPath(value.path) &&
    isOneOf(EXPLORER_ENTRY_KINDS, value.kind) &&
    isFiniteNumber(value.size) &&
    isFiniteNumber(value.modifiedAt) &&
    isBoolean(value.symlink)
  );
}

export function isExplorerEntryOrNull(value: unknown): value is ExplorerEntry | null {
  return value === null || isExplorerEntry(value);
}

export interface ExplorerDirectory {
  path: string;
  entries: ExplorerEntry[];
  offset: number;
  total: number;
  more: boolean;
}

export function isExplorerDirectory(value: unknown): value is ExplorerDirectory {
  return (
    isDynamicRecord(value) &&
    isPath(value.path) &&
    Array.isArray(value.entries) &&
    value.entries.length <= EXPLORER_LIMITS.directoryPage &&
    value.entries.every(isExplorerEntry) &&
    isFiniteNumber(value.offset) &&
    isFiniteNumber(value.total) &&
    isBoolean(value.more)
  );
}

export interface ExplorerPathInput {
  scope: ExplorerScope;
  path: string;
}

export function parseExplorerScopeInput(value: unknown): ExplorerScope {
  if (!isExplorerScope(value)) throw new Error("Invalid explorer scope.");
  return { agentId: value.agentId };
}

export function parseExplorerPathInput(value: unknown): ExplorerPathInput {
  return { scope: scopeOf(value), path: pathOf(value, "path") };
}

export interface ExplorerListInput extends ExplorerPathInput {
  offset?: number;
}

export function parseExplorerListInput(value: unknown): ExplorerListInput {
  const input = parseExplorerPathInput(value);
  const offset = isDynamicRecord(value) ? value.offset : undefined;
  if (offset === undefined) return input;
  if (!integerInRange(offset, 0, Number.MAX_SAFE_INTEGER)) throw new Error("Invalid explorer offset.");
  return { ...input, offset };
}

export const EXPLORER_ENCODINGS = ["utf8", "utf16le", "utf16be", "latin1"] as const;
export type ExplorerEncoding = (typeof EXPLORER_ENCODINGS)[number];

export const EXPLORER_LINE_ENDINGS = ["lf", "crlf"] as const;
export type ExplorerLineEnding = (typeof EXPLORER_LINE_ENDINGS)[number];

export interface ExplorerText {
  content: string;
  encoding: ExplorerEncoding;
  bom: boolean;
  lineEnding: ExplorerLineEnding;
  mixedLineEndings: boolean;
  readOnly: boolean;
  truncated: boolean;
}

function isExplorerText(value: unknown): value is ExplorerText {
  return (
    isDynamicRecord(value) &&
    isBoundedString(value.content, EXPLORER_LIMITS.editableBytes) &&
    isOneOf(EXPLORER_ENCODINGS, value.encoding) &&
    isBoolean(value.bom) &&
    isOneOf(EXPLORER_LINE_ENDINGS, value.lineEnding) &&
    isBoolean(value.mixedLineEndings) &&
    isBoolean(value.readOnly) &&
    isBoolean(value.truncated)
  );
}

export const EXPLORER_FILE_KINDS = ["text", "image", "svg", "pdf", "audio", "video", "binary"] as const;
export type ExplorerFileKind = (typeof EXPLORER_FILE_KINDS)[number];

export interface ExplorerFileVersion {
  modifiedAt: number;
  size: number;
}

export interface ExplorerFile extends ExplorerFileVersion {
  path: string;
  name: string;
  mimeType: string;
  kind: ExplorerFileKind;
  text: ExplorerText | null;
  url: string | null;
}

const EXPLORER_FILE_URL = /^codebot-attachment:\/\/explorer\/[^\s]+$/u;

export function isExplorerFileUrl(value: unknown): value is string {
  return isBoundedString(value, INPUT_LIMITS.path * 4) && EXPLORER_FILE_URL.test(value);
}

export function isExplorerFile(value: unknown): value is ExplorerFile {
  return (
    isDynamicRecord(value) &&
    isPath(value.path) &&
    isBoundedString(value.name, INPUT_LIMITS.path) &&
    isBoundedString(value.mimeType, INPUT_LIMITS.mimeType) &&
    isOneOf(EXPLORER_FILE_KINDS, value.kind) &&
    isFiniteNumber(value.size) &&
    isFiniteNumber(value.modifiedAt) &&
    (value.text === null || isExplorerText(value.text)) &&
    (value.url === null || isExplorerFileUrl(value.url))
  );
}

function isExplorerFileVersion(value: unknown): value is ExplorerFileVersion {
  return isDynamicRecord(value) && isFiniteNumber(value.modifiedAt) && isFiniteNumber(value.size);
}

export interface ExplorerWriteInput extends ExplorerPathInput {
  content: string;
  encoding: ExplorerEncoding;
  bom: boolean;
  lineEnding: ExplorerLineEnding;
  expected: ExplorerFileVersion | null;
}

export function parseExplorerWriteInput(value: unknown): ExplorerWriteInput {
  const input = parseExplorerPathInput(value);
  if (
    !isDynamicRecord(value) ||
    !isBoundedString(value.content, EXPLORER_LIMITS.writeCharacters) ||
    !isOneOf(EXPLORER_ENCODINGS, value.encoding) ||
    !isBoolean(value.bom) ||
    !isOneOf(EXPLORER_LINE_ENDINGS, value.lineEnding) ||
    !(value.expected === null || isExplorerFileVersion(value.expected))
  )
    throw new Error("Invalid explorer write input.");
  return {
    ...input,
    content: value.content,
    encoding: value.encoding,
    bom: value.bom,
    lineEnding: value.lineEnding,
    expected: value.expected === null ? null : { modifiedAt: value.expected.modifiedAt, size: value.expected.size },
  };
}

export type ExplorerWriteResult =
  | ({ outcome: "saved"; encoding: ExplorerEncoding } & ExplorerFileVersion)
  | ({ outcome: "conflict"; exists: boolean } & ExplorerFileVersion);

export function isExplorerWriteResult(value: unknown): value is ExplorerWriteResult {
  if (!isDynamicRecord(value) || !isFiniteNumber(value.modifiedAt) || !isFiniteNumber(value.size)) return false;
  if (value.outcome === "saved") return isOneOf(EXPLORER_ENCODINGS, value.encoding);
  return value.outcome === "conflict" && isBoolean(value.exists);
}

export interface ExplorerCreateInput {
  scope: ExplorerScope;
  parent: string;
  name: string;
  kind: ExplorerEntryKind;
}

function isEntryName(value: unknown): value is string {
  return isBoundedString(value, EXPLORER_LIMITS.name) && value.length > 0;
}

export function parseExplorerCreateInput(value: unknown): ExplorerCreateInput {
  if (!isDynamicRecord(value) || !isEntryName(value.name) || !isOneOf(EXPLORER_ENTRY_KINDS, value.kind))
    throw new Error("Invalid explorer create input.");
  return { scope: scopeOf(value), parent: pathOf(value, "parent"), name: value.name, kind: value.kind };
}

export interface ExplorerRenameInput extends ExplorerPathInput {
  name: string;
}

export function parseExplorerRenameInput(value: unknown): ExplorerRenameInput {
  const input = parseExplorerPathInput(value);
  if (!isDynamicRecord(value) || !isEntryName(value.name)) throw new Error("Invalid explorer rename input.");
  return { ...input, name: value.name };
}

export interface ExplorerWatchInput {
  scope: ExplorerScope;
  expanded: string[];
}

export function parseExplorerWatchInput(value: unknown): ExplorerWatchInput {
  const expanded = isDynamicRecord(value) ? value.expanded : undefined;
  if (!Array.isArray(expanded) || expanded.length > EXPLORER_LIMITS.expandedDirectories || !expanded.every(isPath))
    throw new Error("Invalid explorer watch input.");
  return { scope: scopeOf(value), expanded: [...expanded] };
}

export interface ExplorerChange {
  serverId: string;
  scope: ExplorerScope;
  directories: string[];
  files: string[];
  roots: boolean;
  git: boolean;
  overflow: boolean;
}

function isPathList(value: unknown): value is string[] {
  return Array.isArray(value) && value.length <= EXPLORER_LIMITS.changedPaths && value.every(isPath);
}

export function isExplorerChange(value: unknown): value is ExplorerChange {
  return (
    isDynamicRecord(value) &&
    isIdentifier(value.serverId) &&
    isExplorerScope(value.scope) &&
    isPathList(value.directories) &&
    isPathList(value.files) &&
    isBoolean(value.roots) &&
    isBoolean(value.git) &&
    isBoolean(value.overflow)
  );
}

export const EXPLORER_GIT_STATES = ["ready", "not-repository", "git-missing"] as const;
export type ExplorerGitState = (typeof EXPLORER_GIT_STATES)[number];

export const EXPLORER_GIT_CHANGES = [
  "added",
  "modified",
  "deleted",
  "renamed",
  "untracked",
  "conflicted",
  "ignored",
] as const;
export type ExplorerGitChange = (typeof EXPLORER_GIT_CHANGES)[number];

export interface ExplorerGitFile {
  path: string;
  relativePath: string;
  index: ExplorerGitChange | null;
  worktree: ExplorerGitChange | null;
  originalPath: string | null;
  directory: boolean;
}

const GIT_CHANGE_ORDER: readonly ExplorerGitChange[] = [
  "conflicted",
  "deleted",
  "untracked",
  "added",
  "renamed",
  "modified",
  "ignored",
];

export function explorerGitChange(file: Pick<ExplorerGitFile, "index" | "worktree">): ExplorerGitChange {
  const found = GIT_CHANGE_ORDER.find((change) => file.index === change || file.worktree === change);
  return found ?? "modified";
}

function isGitChangeOrNull(value: unknown): value is ExplorerGitChange | null {
  return value === null || isOneOf(EXPLORER_GIT_CHANGES, value);
}

function isExplorerGitFile(value: unknown): value is ExplorerGitFile {
  return (
    isDynamicRecord(value) &&
    isPath(value.path) &&
    isBoundedString(value.relativePath, INPUT_LIMITS.path) &&
    isGitChangeOrNull(value.index) &&
    isGitChangeOrNull(value.worktree) &&
    (value.originalPath === null || isPath(value.originalPath)) &&
    isBoolean(value.directory)
  );
}

export interface ExplorerGitBranch {
  name: string | null;
  head: string | null;
  upstream: string | null;
  ahead: number;
  behind: number;
}

function isGitText(value: unknown): value is string {
  return isBoundedString(value, EXPLORER_LIMITS.gitText);
}

function isExplorerGitBranch(value: unknown): value is ExplorerGitBranch {
  return (
    isDynamicRecord(value) &&
    (value.name === null || isGitText(value.name)) &&
    (value.head === null || isGitText(value.head)) &&
    (value.upstream === null || isGitText(value.upstream)) &&
    isFiniteNumber(value.ahead) &&
    isFiniteNumber(value.behind)
  );
}

export interface ExplorerGitStatus {
  state: ExplorerGitState;
  root: string;
  repository: string | null;
  branch: ExplorerGitBranch | null;
  files: ExplorerGitFile[];
  truncated: boolean;
}

export function isExplorerGitStatus(value: unknown): value is ExplorerGitStatus {
  return (
    isDynamicRecord(value) &&
    isOneOf(EXPLORER_GIT_STATES, value.state) &&
    isPath(value.root) &&
    (value.repository === null || isPath(value.repository)) &&
    (value.branch === null || isExplorerGitBranch(value.branch)) &&
    Array.isArray(value.files) &&
    value.files.length <= EXPLORER_LIMITS.gitFiles &&
    value.files.every(isExplorerGitFile) &&
    isBoolean(value.truncated)
  );
}

export interface ExplorerGitInput {
  scope: ExplorerScope;
  root: string;
}

export interface ExplorerGitStatusInput extends ExplorerGitInput {
  ignored: boolean;
}

export function parseExplorerGitStatusInput(value: unknown): ExplorerGitStatusInput {
  if (!isDynamicRecord(value) || !isBoolean(value.ignored)) throw new Error("Invalid explorer git input.");
  return { scope: scopeOf(value), root: pathOf(value, "root"), ignored: value.ignored };
}

export interface ExplorerGitCommit {
  hash: string;
  shortHash: string;
  subject: string;
  author: string;
  authoredAt: number;
  refs: string[];
  parents: string[];
}

const GIT_HASH = /^[0-9a-f]{4,64}$/u;

export function isExplorerGitHash(value: unknown): value is string {
  return isBoundedString(value, 64) && GIT_HASH.test(value);
}

function isExplorerGitCommit(value: unknown): value is ExplorerGitCommit {
  return (
    isDynamicRecord(value) &&
    isExplorerGitHash(value.hash) &&
    isExplorerGitHash(value.shortHash) &&
    isGitText(value.subject) &&
    isGitText(value.author) &&
    isFiniteNumber(value.authoredAt) &&
    Array.isArray(value.refs) &&
    value.refs.length <= EXPLORER_LIMITS.gitRefs &&
    value.refs.every(isGitText) &&
    Array.isArray(value.parents) &&
    value.parents.length <= EXPLORER_LIMITS.gitParents &&
    value.parents.every(isExplorerGitHash)
  );
}

export interface ExplorerGitLogInput extends ExplorerGitInput {
  skip: number;
  limit: number;
}

export function parseExplorerGitLogInput(value: unknown): ExplorerGitLogInput {
  if (
    !isDynamicRecord(value) ||
    !integerInRange(value.skip, 0, Number.MAX_SAFE_INTEGER) ||
    !integerInRange(value.limit, 1, EXPLORER_LIMITS.gitLogPage)
  )
    throw new Error("Invalid explorer git log input.");
  return { scope: scopeOf(value), root: pathOf(value, "root"), skip: value.skip, limit: value.limit };
}

export interface ExplorerGitLog {
  state: ExplorerGitState;
  commits: ExplorerGitCommit[];
  more: boolean;
}

export function isExplorerGitLog(value: unknown): value is ExplorerGitLog {
  return (
    isDynamicRecord(value) &&
    isOneOf(EXPLORER_GIT_STATES, value.state) &&
    Array.isArray(value.commits) &&
    value.commits.length <= EXPLORER_LIMITS.gitLogPage &&
    value.commits.every(isExplorerGitCommit) &&
    isBoolean(value.more)
  );
}

export interface ExplorerGitCommitInput extends ExplorerGitInput {
  hash: string;
}

export function parseExplorerGitCommitInput(value: unknown): ExplorerGitCommitInput {
  if (!isDynamicRecord(value) || !isExplorerGitHash(value.hash)) throw new Error("Invalid explorer git commit input.");
  return { scope: scopeOf(value), root: pathOf(value, "root"), hash: value.hash };
}

export interface ExplorerGitCommitFile {
  path: string;
  relativePath: string;
  change: ExplorerGitChange;
  originalPath: string | null;
}

function isExplorerGitCommitFile(value: unknown): value is ExplorerGitCommitFile {
  return (
    isDynamicRecord(value) &&
    isPath(value.path) &&
    isBoundedString(value.relativePath, INPUT_LIMITS.path) &&
    isOneOf(EXPLORER_GIT_CHANGES, value.change) &&
    (value.originalPath === null || isPath(value.originalPath))
  );
}

export interface ExplorerGitCommitFiles {
  state: ExplorerGitState;
  files: ExplorerGitCommitFile[];
  truncated: boolean;
}

export function isExplorerGitCommitFiles(value: unknown): value is ExplorerGitCommitFiles {
  return (
    isDynamicRecord(value) &&
    isOneOf(EXPLORER_GIT_STATES, value.state) &&
    Array.isArray(value.files) &&
    value.files.length <= EXPLORER_LIMITS.gitCommitFiles &&
    value.files.every(isExplorerGitCommitFile) &&
    isBoolean(value.truncated)
  );
}

export interface ExplorerGitDiffInput extends ExplorerGitInput {
  path: string;
  hash: string | null;
  originalPath: string | null;
}

export function parseExplorerGitDiffInput(value: unknown): ExplorerGitDiffInput {
  if (
    !isDynamicRecord(value) ||
    !(value.hash === null || isExplorerGitHash(value.hash)) ||
    !(value.originalPath === null || isPath(value.originalPath))
  )
    throw new Error("Invalid explorer git diff input.");
  return {
    scope: scopeOf(value),
    root: pathOf(value, "root"),
    path: pathOf(value, "path"),
    hash: value.hash,
    originalPath: value.originalPath,
  };
}

export interface ExplorerGitDiff {
  state: ExplorerGitState;
  path: string;
  original: string | null;
  modified: string | null;
  binary: boolean;
  tooLarge: boolean;
}

function isDiffText(value: unknown): value is string | null {
  return value === null || isBoundedString(value, EXPLORER_LIMITS.gitDiffBytes);
}

export function isExplorerGitDiff(value: unknown): value is ExplorerGitDiff {
  return (
    isDynamicRecord(value) &&
    isOneOf(EXPLORER_GIT_STATES, value.state) &&
    isPath(value.path) &&
    isDiffText(value.original) &&
    isDiffText(value.modified) &&
    isBoolean(value.binary) &&
    isBoolean(value.tooLarge)
  );
}
