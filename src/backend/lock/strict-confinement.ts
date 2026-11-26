import { execFileSync } from "node:child_process";
import { existsSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { isPathInside } from "../path-containment";
import { strictHiddenFolders } from "./personal-folders";

export interface BubblewrapInput {
  readonly program: string;
  readonly command: string;
  readonly args: readonly string[];
  readonly writable: readonly string[];
  readonly protectedPaths: readonly string[];
  readonly readable: readonly string[];
  readonly strict: boolean;
  readonly home: string;
  readonly exists?: (path: string) => boolean;
}

const SYSTEM_FOLDERS = ["/usr", "/bin", "/sbin", "/lib", "/lib32", "/lib64", "/etc", "/opt", "/run/systemd/resolve"];

export function strictReadableFolders(
  command: string,
  extra: readonly string[],
  platform: NodeJS.Platform = process.platform,
  home: string = homedir(),
): string[] {
  const hidden = strictHiddenFolders(platform, process.env, home);
  const programs = [command, process.execPath].flatMap((program) => [dirname(program), dirname(realOrSelf(program))]);
  return [...new Set([...extra, ...programs])].filter((folder) => hidden.some((area) => isPathInside(area, folder)));
}

export function seatbeltReadRules(
  hidden: readonly string[],
  readable: readonly string[],
  quote: (value: string) => string,
  realPaths: (path: string) => string[],
): string[] {
  const denied = [...new Set(hidden.flatMap(realPaths))].map((path) => `(subpath ${quote(path)})`);
  if (denied.length === 0) return [];
  const allowed = [...new Set(readable.flatMap(realPaths))].map((path) => `(subpath ${quote(path)})`);
  return [
    `(deny file-read* ${denied.join(" ")})`,
    ...(allowed.length > 0 ? [`(allow file-read* ${allowed.join(" ")})`] : []),
  ];
}

export function bubblewrapArgs(input: BubblewrapInput): string[] {
  const exists = input.exists ?? existsSync;
  const existing = (paths: readonly string[]) => [...new Set(paths.map((path) => resolve(path)))].filter(exists);
  const writable = existing(input.writable);
  const protectedPaths = existing(input.protectedPaths);
  const readable = existing(input.readable);
  const common = ["--die-with-parent", "--new-session", "--dev", "/dev", "--proc", "/proc"];
  if (!input.strict) {
    return [
      input.program,
      ...common,
      "--ro-bind",
      "/",
      "/",
      ...writable.flatMap((path) => ["--bind", path, path]),
      ...protectedPaths.flatMap((path) => ["--ro-bind", path, path]),
      "--",
      input.command,
      ...input.args,
    ];
  }
  const system = SYSTEM_FOLDERS.filter(exists);
  const temporary = (path: string) => path === "/tmp" || isPathInside("/tmp", path);
  const keptInHome = [...writable, ...readable].some((path) => isPathInside(input.home, path));
  return [
    input.program,
    ...common,
    ...system.flatMap((path) => ["--ro-bind", path, path]),
    "--tmpfs",
    "/tmp",
    ...(keptInHome ? ["--tmpfs", input.home] : []),
    ...readable.filter((path) => !temporary(path)).flatMap((path) => ["--ro-bind", path, path]),
    ...writable.filter((path) => !temporary(path)).flatMap((path) => ["--bind", path, path]),
    ...protectedPaths.filter((path) => !temporary(path)).flatMap((path) => ["--ro-bind", path, path]),
    "--",
    input.command,
    ...input.args,
  ];
}

let bubblewrapPath: string | null | undefined;

export function findBubblewrap(): string | null {
  if (bubblewrapPath !== undefined) return bubblewrapPath;
  bubblewrapPath = null;
  if (process.platform !== "linux") return null;
  for (const candidate of ["/usr/bin/bwrap", "/usr/local/bin/bwrap", "/bin/bwrap"]) {
    if (!existsSync(candidate)) continue;
    try {
      execFileSync(candidate, ["--ro-bind", "/", "/", "--", "true"], { stdio: "ignore", timeout: 10_000 });
      bubblewrapPath = candidate;
      break;
    } catch {}
  }
  return bubblewrapPath;
}

function realOrSelf(path: string): string {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
}
