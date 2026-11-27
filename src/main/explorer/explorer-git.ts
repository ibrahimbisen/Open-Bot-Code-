import { execFile } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import {
  EXPLORER_LIMITS,
  type ExplorerGitBranch,
  type ExplorerGitChange,
  type ExplorerGitCommit,
  type ExplorerGitCommitFile,
  type ExplorerGitCommitFiles,
  type ExplorerGitCommitInput,
  type ExplorerGitDiff,
  type ExplorerGitDiffInput,
  type ExplorerGitFile,
  type ExplorerGitLog,
  type ExplorerGitLogInput,
  type ExplorerGitState,
  type ExplorerGitStatus,
  type ExplorerGitStatusInput,
  type ExplorerRoot,
  type ExplorerScope,
} from "@codebot/contracts/ipc";
import { sourceText } from "@codebot/i18n/source";
import { isPathInside } from "../../backend/path-containment";
import { ExplorerRefused, isMissing, resolveInside, resolveNearest } from "./explorer-paths";
import { decodeText } from "./explorer-text";

const GIT_TIMEOUT_MS = 20_000;
const GIT_OUTPUT_BYTES = 32 * 1_024 * 1_024;
const BINARY_SNIFF_BYTES = 8_000;
const FIELD = "\u001f";
const BINARY = Symbol("binary");

export interface ExplorerGitDependencies {
  roots: (scope: ExplorerScope) => Promise<ExplorerRoot[]>;
  searchPath?: () => Promise<string | null>;
  command?: string;
}

class GitUnavailable extends Error {
  constructor(readonly state: Exclude<ExplorerGitState, "ready">) {
    super(state);
  }
}

class GitOutputTooLarge extends Error {}

interface GitResult {
  stdout: Buffer;
  stderr: string;
  code: number;
}

interface Repository {
  root: string;
  top: string;
}

function gitText(value: string): string {
  return value.length > EXPLORER_LIMITS.gitText ? `${value.slice(0, EXPLORER_LIMITS.gitText - 1)}…` : value;
}

function slashed(path: string): string {
  return sep === "/" ? path : path.split(sep).join("/");
}

function isBinary(bytes: Uint8Array): boolean {
  return bytes.subarray(0, BINARY_SNIFF_BYTES).includes(0);
}

function changeFromCode(code: string): ExplorerGitChange | null {
  switch (code) {
    case "A":
    case "C":
      return "added";
    case "M":
    case "T":
      return "modified";
    case "D":
      return "deleted";
    case "R":
      return "renamed";
    case "U":
      return "conflicted";
    default:
      return null;
  }
}

export function parseGitStatus(output: string, top: string): { branch: ExplorerGitBranch; files: ExplorerGitFile[] } {
  const branch: ExplorerGitBranch = { name: null, head: null, upstream: null, ahead: 0, behind: 0 };
  const files: ExplorerGitFile[] = [];
  const records = output.split("\0");
  const fileAt = (
    relativePath: string,
    index: ExplorerGitChange | null,
    worktree: ExplorerGitChange | null,
    originalPath: string | null = null,
  ): ExplorerGitFile => {
    const directory = relativePath.endsWith("/");
    const clean = directory ? relativePath.slice(0, -1) : relativePath;
    return {
      path: join(top, ...clean.split("/")),
      relativePath: clean,
      index,
      worktree,
      originalPath: originalPath === null ? null : join(top, ...originalPath.split("/")),
      directory,
    };
  };
  for (let at = 0; at < records.length; at += 1) {
    const record = records[at] ?? "";
    if (record.startsWith("# branch.oid ")) {
      const oid = record.slice("# branch.oid ".length);
      branch.head = oid === "(initial)" ? null : oid.slice(0, 12);
    } else if (record.startsWith("# branch.head ")) {
      const name = record.slice("# branch.head ".length);
      branch.name = name === "(detached)" ? null : gitText(name);
    } else if (record.startsWith("# branch.upstream ")) {
      branch.upstream = gitText(record.slice("# branch.upstream ".length));
    } else if (record.startsWith("# branch.ab ")) {
      const match = /^\+(\d+) -(\d+)$/u.exec(record.slice("# branch.ab ".length));
      branch.ahead = Number(match?.[1] ?? 0);
      branch.behind = Number(match?.[2] ?? 0);
    } else if (record.startsWith("1 ")) {
      const parts = record.split(" ");
      const path = parts.slice(8).join(" ");
      const state = parts[1] ?? "..";
      files.push(fileAt(path, changeFromCode(state.charAt(0)), changeFromCode(state.charAt(1))));
    } else if (record.startsWith("2 ")) {
      const parts = record.split(" ");
      const path = parts.slice(9).join(" ");
      const state = parts[1] ?? "..";
      const original = records[at + 1] ?? "";
      at += 1;
      files.push(fileAt(path, changeFromCode(state.charAt(0)), changeFromCode(state.charAt(1)), original));
    } else if (record.startsWith("u ")) {
      files.push(fileAt(record.split(" ").slice(10).join(" "), "conflicted", "conflicted"));
    } else if (record.startsWith("? ")) {
      files.push(fileAt(record.slice(2), null, "untracked"));
    } else if (record.startsWith("! ")) {
      files.push(fileAt(record.slice(2), null, "ignored"));
    }
  }
  return { branch, files };
}

export function parseGitLog(output: string): ExplorerGitCommit[] {
  const commits: ExplorerGitCommit[] = [];
  for (const record of output.split("\0")) {
    const [hash, shortHash, author, seconds, refs, parents, ...subject] = record.replace(/^\n+/u, "").split(FIELD);
    if (!hash || !shortHash || seconds === undefined || refs === undefined || parents === undefined) continue;
    commits.push({
      hash,
      shortHash,
      subject: gitText(subject.join(FIELD)),
      author: gitText(author ?? ""),
      authoredAt: Number(seconds) * 1_000,
      refs: refs
        .split(", ")
        .map((ref) => gitText(ref.trim()))
        .filter(Boolean)
        .slice(0, EXPLORER_LIMITS.gitRefs),
      parents: parents.split(" ").filter(Boolean).slice(0, EXPLORER_LIMITS.gitParents),
    });
  }
  return commits;
}

export function parseGitNameStatus(output: string, top: string): ExplorerGitCommitFile[] {
  const files: ExplorerGitCommitFile[] = [];
  const records = output.split("\0");
  const absolute = (path: string) => join(top, ...path.split("/"));
  for (let at = 0; at < records.length; at += 1) {
    const code = records[at] ?? "";
    if (code === "") continue;
    const kind = code.charAt(0);
    if (kind === "R" || kind === "C") {
      const original = records[at + 1] ?? "";
      const path = records[at + 2] ?? "";
      at += 2;
      if (path === "") continue;
      files.push({
        path: absolute(path),
        relativePath: path,
        change: kind === "R" ? "renamed" : "added",
        originalPath: kind === "R" ? absolute(original) : null,
      });
      continue;
    }
    const path = records[at + 1] ?? "";
    at += 1;
    if (path === "") continue;
    files.push({
      path: absolute(path),
      relativePath: path,
      change: changeFromCode(kind) ?? "modified",
      originalPath: null,
    });
  }
  return files;
}

export function createExplorerGit({ roots, searchPath, command = "git" }: ExplorerGitDependencies) {
  async function run(cwd: string, args: readonly string[], maxBuffer = GIT_OUTPUT_BYTES): Promise<GitResult> {
    const path = (await searchPath?.()) ?? null;
    return new Promise((done, fail) => {
      execFile(
        command,
        ["--no-optional-locks", "-c", "core.fsmonitor=false", "-c", "core.quotepath=false", ...args],
        {
          cwd,
          encoding: "buffer",
          maxBuffer,
          timeout: GIT_TIMEOUT_MS,
          windowsHide: true,
          env: {
            ...process.env,
            ...(path === null ? {} : { PATH: path }),
            GIT_OPTIONAL_LOCKS: "0",
            GIT_TERMINAL_PROMPT: "0",
            GIT_ASKPASS: "",
            SSH_ASKPASS: "",
            GCM_INTERACTIVE: "never",
            LC_ALL: "C",
          },
        },
        (error, stdout, stderr) => {
          const message = stderr.toString("utf8");
          if (!error) {
            done({ stdout, stderr: message, code: 0 });
            return;
          }
          if (error.code === "ENOENT") fail(new GitUnavailable("git-missing"));
          else if (error.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER") fail(new GitOutputTooLarge());
          else if (error.killed) fail(new Error(sourceText("error.explorer.gitTimeout")));
          else if (typeof error.code === "number") done({ stdout, stderr: message, code: error.code });
          else fail(error);
        },
      );
    });
  }

  function failure(result: GitResult): Error {
    if (/not a git repository/iu.test(result.stderr)) return new GitUnavailable("not-repository");
    const line = result.stderr.split(/\r?\n/u).find((text) => text.trim() !== "") ?? "";
    return new Error(sourceText("error.explorer.gitFailed", { detail: gitText(line.replace(/^fatal: /u, "")) }));
  }

  async function output(cwd: string, args: readonly string[]): Promise<string> {
    const result = await run(cwd, args);
    if (result.code !== 0) throw failure(result);
    return result.stdout.toString("utf8");
  }

  async function repository(scope: ExplorerScope, rootInput: string): Promise<Repository> {
    const allowed = await roots(scope);
    const { real } = await resolveInside(allowed, rootInput);
    if (!allowed.some((root) => root.path === real)) {
      throw new ExplorerRefused("outside", sourceText("error.explorer.outside"));
    }
    const top = (await output(real, ["rev-parse", "--show-toplevel"])).replace(/\r?\n$/u, "");
    if (top === "") throw new GitUnavailable("not-repository");
    return { root: real, top: resolve(top) };
  }

  async function guarded<Result>(read: () => Promise<Result>, unavailable: (state: ExplorerGitState) => Result) {
    try {
      return await read();
    } catch (error) {
      if (error instanceof GitUnavailable) return unavailable(error.state);
      throw error;
    }
  }

  async function blob(repo: Repository, revision: string, path: string): Promise<Buffer | null | "too-large"> {
    const object = `${revision}:${slashed(relative(repo.top, path))}`;
    try {
      const result = await run(repo.top, ["cat-file", "blob", object], EXPLORER_LIMITS.gitDiffBytes);
      return result.code === 0 ? result.stdout : null;
    } catch (error) {
      if (error instanceof GitOutputTooLarge) return "too-large";
      throw error;
    }
  }

  async function workingFile(path: string): Promise<Buffer | null | "too-large"> {
    try {
      const stats = await stat(path);
      if (!stats.isFile()) return null;
      if (stats.size > EXPLORER_LIMITS.gitDiffBytes) return "too-large";
      return await readFile(path);
    } catch (error) {
      if (isMissing(error)) return null;
      throw error;
    }
  }

  async function parents(repo: Repository, hash: string): Promise<string[]> {
    const line = await output(repo.top, ["rev-list", "--parents", "-n", "1", hash, "--"]);
    return line.trim().split(" ").slice(1);
  }

  async function status(input: ExplorerGitStatusInput): Promise<ExplorerGitStatus> {
    return guarded<ExplorerGitStatus>(
      async () => {
        const repo = await repository(input.scope, input.root);
        const text = await output(repo.root, [
          "status",
          "--porcelain=v2",
          "-z",
          "--branch",
          "--untracked-files=normal",
          input.ignored ? "--ignored=matching" : "--ignored=no",
          "--",
          ".",
        ]);
        const parsed = parseGitStatus(text, repo.top);
        const files = parsed.files.filter((file) => isPathInside(repo.root, file.path));
        return {
          state: "ready",
          root: repo.root,
          repository: repo.top,
          branch: parsed.branch,
          files: files.slice(0, EXPLORER_LIMITS.gitFiles),
          truncated: files.length > EXPLORER_LIMITS.gitFiles,
        };
      },
      (state) => ({ state, root: input.root, repository: null, branch: null, files: [], truncated: false }),
    );
  }

  async function log(input: ExplorerGitLogInput): Promise<ExplorerGitLog> {
    return guarded<ExplorerGitLog>(
      async () => {
        const repo = await repository(input.scope, input.root);
        const result = await run(repo.root, [
          "log",
          "-z",
          "--no-show-signature",
          "--no-color",
          `--skip=${input.skip}`,
          `--max-count=${input.limit + 1}`,
          `--pretty=tformat:%H${FIELD}%h${FIELD}%an${FIELD}%at${FIELD}%D${FIELD}%P${FIELD}%s`,
          ...(repo.root === repo.top ? [] : ["--", "."]),
        ]);
        if (result.code !== 0) {
          if (/does not have any commits yet|bad default revision|unknown revision/iu.test(result.stderr))
            return { state: "ready", commits: [], more: false };
          throw failure(result);
        }
        const commits = parseGitLog(result.stdout.toString("utf8"));
        return { state: "ready", commits: commits.slice(0, input.limit), more: commits.length > input.limit };
      },
      (state) => ({ state, commits: [], more: false }),
    );
  }

  async function commitFiles(input: ExplorerGitCommitInput): Promise<ExplorerGitCommitFiles> {
    return guarded<ExplorerGitCommitFiles>(
      async () => {
        const repo = await repository(input.scope, input.root);
        const first = (await parents(repo, input.hash))[0];
        const compared = first === undefined ? ["--root", input.hash] : [first, input.hash];
        const text = await output(repo.root, [
          "diff-tree",
          "--no-commit-id",
          "--name-status",
          "-r",
          "-M",
          "-z",
          ...compared,
          "--",
          ".",
        ]);
        const files = parseGitNameStatus(text, repo.top).filter((file) => isPathInside(repo.root, file.path));
        return {
          state: "ready",
          files: files.slice(0, EXPLORER_LIMITS.gitCommitFiles),
          truncated: files.length > EXPLORER_LIMITS.gitCommitFiles,
        };
      },
      (state) => ({ state, files: [], truncated: false }),
    );
  }

  async function diff(input: ExplorerGitDiffInput): Promise<ExplorerGitDiff> {
    return guarded<ExplorerGitDiff>(
      async () => {
        const repo = await repository(input.scope, input.root);
        const allowed = await roots(input.scope);
        const path = await resolveNearest(allowed, input.path);
        const original = input.originalPath === null ? path : await resolveNearest(allowed, input.originalPath);
        if (!isPathInside(repo.top, path) || !isPathInside(repo.top, original)) {
          throw new ExplorerRefused("outside", sourceText("error.explorer.outside"));
        }
        const first = input.hash === null ? undefined : (await parents(repo, input.hash))[0];
        const [before, after] = await Promise.all([
          input.hash === null
            ? blob(repo, "HEAD", original)
            : first === undefined
              ? Promise.resolve(null)
              : blob(repo, first, original),
          input.hash === null ? workingFile(path) : blob(repo, input.hash, path),
        ]);
        const tooLarge = before === "too-large" || after === "too-large";
        const texts = [before, after].map((side) => {
          if (side === null || side === "too-large") return null;
          return isBinary(side) ? BINARY : (decodeText(side)?.content ?? BINARY);
        });
        const binary = texts.includes(BINARY);
        const shown = (text: string | symbol | null | undefined) =>
          binary || tooLarge || typeof text !== "string" ? null : text;
        return {
          state: "ready",
          path: input.path,
          original: shown(texts[0]),
          modified: shown(texts[1]),
          binary,
          tooLarge,
        };
      },
      (state) => ({ state, path: input.path, original: null, modified: null, binary: false, tooLarge: false }),
    );
  }

  return { status, log, commitFiles, diff };
}

export type ExplorerGit = ReturnType<typeof createExplorerGit>;
