import { realpath, stat } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { EXPLORER_LIMITS, type ExplorerRoot } from "@codebot/contracts/ipc";
import { sourceText } from "@codebot/i18n/source";
import { isPathInside } from "../../backend/path-containment";

export class ExplorerRefused extends Error {
  constructor(
    readonly reason: "outside" | "missing" | "kind" | "name" | "exists" | "root",
    message: string,
  ) {
    super(message);
  }
}

function errorCode(error: unknown): string | undefined {
  return error instanceof Error && "code" in error && typeof error.code === "string" ? error.code : undefined;
}

export function isMissing(error: unknown): boolean {
  const code = errorCode(error);
  return code === "ENOENT" || code === "ENOTDIR";
}

export function hasErrorCode(error: unknown, ...codes: string[]): boolean {
  const code = errorCode(error);
  return code !== undefined && codes.includes(code);
}

export async function resolveRoots(folders: readonly string[]): Promise<ExplorerRoot[]> {
  const found = await Promise.all(
    folders.slice(0, EXPLORER_LIMITS.roots).map(async (folder): Promise<ExplorerRoot | null> => {
      if (!isAbsolute(folder)) return null;
      try {
        const path = await realpath(folder);
        if (!(await stat(path)).isDirectory()) return null;
        return { path, name: basename(path) || path };
      } catch {
        return null;
      }
    }),
  );
  const seen = new Set<string>();
  return found.filter((root): root is ExplorerRoot => {
    if (root === null || seen.has(root.path)) return false;
    seen.add(root.path);
    return true;
  });
}

function outside(): ExplorerRefused {
  return new ExplorerRefused("outside", sourceText("error.explorer.outside"));
}

function missing(): ExplorerRefused {
  return new ExplorerRefused("missing", sourceText("error.explorer.notFound"));
}

function samePath(first: string, second: string): boolean {
  return relative(first, second) === "";
}

export interface ResolvedPath {
  path: string;
  real: string;
}

function lexical(path: string): string {
  if (path.includes("\0") || !isAbsolute(path)) throw outside();
  return resolve(path);
}

function requireInside(roots: readonly ExplorerRoot[], real: string): void {
  if (!roots.some((root) => isPathInside(root.path, real))) throw outside();
}

export async function resolveInside(roots: readonly ExplorerRoot[], input: string): Promise<ResolvedPath> {
  const path = lexical(input);
  let real: string;
  try {
    real = await realpath(path);
  } catch (error) {
    if (!isMissing(error)) throw error;
    await resolveParent(roots, path);
    throw missing();
  }
  requireInside(roots, real);
  return { path, real };
}

async function resolveParent(roots: readonly ExplorerRoot[], path: string): Promise<string> {
  const parent = dirname(path);
  if (parent === path) throw outside();
  let real: string;
  try {
    real = await realpath(parent);
  } catch (error) {
    if (!isMissing(error)) throw error;
    await resolveParent(roots, parent);
    throw missing();
  }
  requireInside(roots, real);
  return real;
}

export async function resolveEntry(roots: readonly ExplorerRoot[], input: string): Promise<ResolvedPath> {
  const path = lexical(input);
  const parent = await resolveParent(roots, path);
  const real = join(parent, basename(path));
  if (roots.some((root) => samePath(root.path, real) || samePath(root.path, path))) {
    throw new ExplorerRefused("root", sourceText("error.explorer.rootProtected"));
  }
  return { path, real };
}

export async function resolveTarget(
  roots: readonly ExplorerRoot[],
  input: string,
): Promise<ResolvedPath & { exists: boolean }> {
  try {
    return { ...(await resolveInside(roots, input)), exists: true };
  } catch (error) {
    if (!(error instanceof ExplorerRefused) || error.reason !== "missing") throw error;
    const path = lexical(input);
    return { path, real: join(await resolveParent(roots, path), basename(path)), exists: false };
  }
}

export async function resolveNearest(roots: readonly ExplorerRoot[], input: string): Promise<string> {
  const path = lexical(input);
  const missingParts: string[] = [];
  for (let current = path; ; ) {
    try {
      const real = await realpath(current);
      requireInside(roots, real);
      return join(real, ...missingParts);
    } catch (error) {
      if (error instanceof ExplorerRefused || !isMissing(error)) throw error;
    }
    const parent = dirname(current);
    if (parent === current) throw outside();
    missingParts.unshift(basename(current));
    current = parent;
  }
}

const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/iu;

function isValidEntryName(name: string, platform: NodeJS.Platform = process.platform): boolean {
  if (name.length === 0 || name.length > EXPLORER_LIMITS.name) return false;
  if (name === "." || name === ".." || /[\0/\\]/u.test(name)) return false;
  if (platform !== "win32") return true;
  for (let index = 0; index < name.length; index += 1) if (name.charCodeAt(index) < 0x20) return false;
  return !/[<>:"|?*]/u.test(name) && !/[. ]$/u.test(name) && !WINDOWS_RESERVED.test(name);
}

export function requireEntryName(name: string): string {
  if (!isValidEntryName(name)) throw new ExplorerRefused("name", sourceText("error.explorer.invalidName"));
  return name;
}
