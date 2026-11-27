import { randomBytes } from "node:crypto";
import type { Dirent, Stats } from "node:fs";
import { chmod, lstat, mkdir, open, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, sep } from "node:path";
import {
  EXPLORER_LIMITS,
  type ExplorerCreateInput,
  type ExplorerDirectory,
  type ExplorerEntry,
  type ExplorerFile,
  type ExplorerListInput,
  type ExplorerPathInput,
  type ExplorerRenameInput,
  type ExplorerRoot,
  type ExplorerRoots,
  type ExplorerScope,
  type ExplorerText,
  type ExplorerWriteInput,
  type ExplorerWriteResult,
} from "@codebot/contracts/ipc";
import { sourceText } from "@codebot/i18n/source";
import { previewTypeForName, textMimeTypeForName } from "./explorer-file-kinds";
import {
  ExplorerRefused,
  hasErrorCode,
  isMissing,
  requireEntryName,
  resolveEntry,
  resolveInside,
  resolveTarget,
} from "./explorer-paths";
import { decodeText, encodeText } from "./explorer-text";

const STAT_CONCURRENCY = 32;
const RENAME_ATTEMPTS = 4;
const RENAME_RETRY_MS = 40;

export interface ExplorerFilesDependencies {
  roots: (scope: ExplorerScope) => Promise<ExplorerRoot[]>;
  trash: (path: string) => Promise<void>;
  reveal: (path: string) => void;
  fileUrl: (scope: ExplorerScope, file: { path: string; name: string; modifiedAt: number; size: number }) => string;
}

const nameOrder = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

function compareNames(first: string, second: string): number {
  return nameOrder.compare(first, second) || (first < second ? -1 : first > second ? 1 : 0);
}

async function inBatches<Item, Result>(
  items: readonly Item[],
  size: number,
  run: (item: Item) => Promise<Result>,
): Promise<Result[]> {
  const results: Result[] = [];
  for (let start = 0; start < items.length; start += size) {
    results.push(...(await Promise.all(items.slice(start, start + size).map(run))));
  }
  return results;
}

function modifiedAt(stats: Stats): number {
  return Math.max(0, Math.floor(stats.mtimeMs));
}

function entryOf(path: string, name: string, stats: Stats | null, symlink: boolean): ExplorerEntry {
  const directory = stats?.isDirectory() === true;
  return {
    name,
    path,
    kind: directory ? "directory" : "file",
    size: stats && !directory ? stats.size : 0,
    modifiedAt: stats ? modifiedAt(stats) : 0,
    symlink,
  };
}

async function entryAt(path: string): Promise<ExplorerEntry> {
  const link = await lstat(path);
  const target = link.isSymbolicLink() ? await stat(path).catch(() => null) : link;
  return entryOf(path, basename(path), target, link.isSymbolicLink());
}

function notFile(): ExplorerRefused {
  return new ExplorerRefused("kind", sourceText("error.explorer.notFile"));
}

function notDirectory(): ExplorerRefused {
  return new ExplorerRefused("kind", sourceText("error.explorer.notDirectory"));
}

function alreadyExists(name: string): ExplorerRefused {
  return new ExplorerRefused("exists", sourceText("error.explorer.exists", { name }));
}

async function readStart(path: string, length: number): Promise<Buffer> {
  const file = await open(path, "r");
  try {
    const buffer = Buffer.alloc(length);
    let filled = 0;
    while (filled < length) {
      const { bytesRead } = await file.read(buffer, filled, length - filled, filled);
      if (bytesRead === 0) break;
      filled += bytesRead;
    }
    return buffer.subarray(0, filled);
  } finally {
    await file.close();
  }
}

async function readText(path: string, size: number): Promise<ExplorerText | null> {
  const large = size > EXPLORER_LIMITS.editableBytes;
  const bytes = await readStart(path, large ? EXPLORER_LIMITS.truncatedBytes : size);
  const truncated = large || bytes.byteLength < size;
  const decoded = decodeText(bytes, truncated);
  if (!decoded) return null;
  return { ...decoded, readOnly: truncated, truncated };
}

async function replaceFile(temporary: string, target: string): Promise<void> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await rename(temporary, target);
      return;
    } catch (error) {
      if (attempt >= RENAME_ATTEMPTS || !hasErrorCode(error, "EPERM", "EACCES", "EBUSY")) throw error;
      await new Promise((done) => setTimeout(done, RENAME_RETRY_MS * attempt));
    }
  }
}

async function writeAtomic(target: string, bytes: Buffer, mode: number | undefined): Promise<void> {
  const temporary = join(dirname(target), `.${basename(target)}.${randomBytes(6).toString("hex")}.tmp`);
  try {
    await writeFile(temporary, bytes, { flag: "wx" });
    if (mode !== undefined) await chmod(temporary, mode & 0o777).catch(() => undefined);
    await replaceFile(temporary, target);
  } catch (error) {
    await rm(temporary, { force: true }).catch(() => undefined);
    throw error;
  }
}

export function createExplorerFiles({ roots, trash, reveal, fileUrl }: ExplorerFilesDependencies) {
  async function list(input: ExplorerListInput): Promise<ExplorerDirectory> {
    const { path, real } = await resolveInside(await roots(input.scope), input.path);
    let dirents: Dirent[];
    try {
      dirents = await readdir(real, { withFileTypes: true });
    } catch (error) {
      if (hasErrorCode(error, "ENOTDIR")) throw notDirectory();
      throw error;
    }
    const linked = await inBatches(
      dirents.filter((dirent) => dirent.isSymbolicLink()),
      STAT_CONCURRENCY,
      async (dirent) => [dirent.name, (await stat(join(real, dirent.name)).catch(() => null))?.isDirectory()] as const,
    );
    const linkedDirectories = new Set(linked.filter(([, directory]) => directory === true).map(([name]) => name));
    const names = dirents
      .map((dirent) => ({
        name: dirent.name,
        symlink: dirent.isSymbolicLink(),
        directory: dirent.isDirectory() || linkedDirectories.has(dirent.name),
      }))
      .sort((first, second) =>
        first.directory === second.directory ? compareNames(first.name, second.name) : first.directory ? -1 : 1,
      );
    const offset = Math.min(input.offset ?? 0, names.length);
    const page = names.slice(offset, offset + EXPLORER_LIMITS.directoryPage);
    const entries = await inBatches(page, STAT_CONCURRENCY, async (item) => {
      const stats = await stat(join(real, item.name)).catch(() => null);
      return entryOf(join(path, item.name), item.name, stats, item.symlink);
    });
    return { path, entries, offset, total: names.length, more: offset + entries.length < names.length };
  }

  async function statEntry(input: ExplorerPathInput): Promise<ExplorerEntry | null> {
    try {
      const { path, real } = await resolveInside(await roots(input.scope), input.path);
      const link = await lstat(path).catch(() => null);
      return entryOf(path, basename(path), await stat(real), link?.isSymbolicLink() === true);
    } catch (error) {
      if ((error instanceof ExplorerRefused && error.reason === "missing") || isMissing(error)) return null;
      throw error;
    }
  }

  async function read(input: ExplorerPathInput): Promise<ExplorerFile> {
    const { path, real } = await resolveInside(await roots(input.scope), input.path);
    const stats = await stat(real);
    if (!stats.isFile()) throw notFile();
    const name = basename(path);
    const version = { modifiedAt: modifiedAt(stats), size: stats.size };
    const preview = previewTypeForName(name);
    const url =
      preview && (preview.kind === "audio" || preview.kind === "video" || stats.size <= EXPLORER_LIMITS.previewBytes)
        ? fileUrl(input.scope, { path, name, ...version })
        : null;
    if (preview && preview.kind !== "svg") {
      return {
        path,
        name,
        ...version,
        mimeType: preview.mimeType,
        kind: url ? preview.kind : "binary",
        text: null,
        url,
      };
    }
    const text = await readText(real, stats.size);
    if (preview) {
      return { path, name, ...version, mimeType: preview.mimeType, kind: text ? "svg" : "binary", text, url };
    }
    return {
      path,
      name,
      ...version,
      mimeType: text ? textMimeTypeForName(name) : "application/octet-stream",
      kind: text ? "text" : "binary",
      text,
      url: null,
    };
  }

  async function write(input: ExplorerWriteInput): Promise<ExplorerWriteResult> {
    const target = await resolveTarget(await roots(input.scope), input.path);
    const current = target.exists ? await stat(target.real) : null;
    if (current && !current.isFile()) throw notFile();
    if (input.expected) {
      if (!current) return { outcome: "conflict", exists: false, modifiedAt: 0, size: 0 };
      if (modifiedAt(current) !== input.expected.modifiedAt || current.size !== input.expected.size)
        return { outcome: "conflict", exists: true, modifiedAt: modifiedAt(current), size: current.size };
    }
    const encoded = encodeText(input.content, input);
    await writeAtomic(target.real, encoded.bytes, current?.mode);
    const saved = await stat(target.real);
    return { outcome: "saved", encoding: encoded.encoding, modifiedAt: modifiedAt(saved), size: saved.size };
  }

  async function create(input: ExplorerCreateInput): Promise<ExplorerEntry> {
    const name = requireEntryName(input.name);
    const parent = await resolveInside(await roots(input.scope), input.parent);
    if (!(await stat(parent.real)).isDirectory()) throw notDirectory();
    try {
      if (input.kind === "directory") await mkdir(join(parent.real, name));
      else await writeFile(join(parent.real, name), "", { flag: "wx" });
    } catch (error) {
      if (hasErrorCode(error, "EEXIST")) throw alreadyExists(name);
      throw error;
    }
    return entryAt(join(parent.path, name));
  }

  async function renameEntry(input: ExplorerRenameInput): Promise<ExplorerEntry> {
    const name = requireEntryName(input.name);
    const source = await resolveEntry(await roots(input.scope), input.path);
    const from = await lstat(source.real, { bigint: true }).catch((error: unknown) => {
      if (isMissing(error)) throw new ExplorerRefused("missing", sourceText("error.explorer.notFound"));
      throw error;
    });
    const target = join(dirname(source.real), name);
    const taken = await lstat(target, { bigint: true }).catch(() => null);
    if (taken && !(taken.ino === from.ino && taken.dev === from.dev && taken.ino !== 0n)) throw alreadyExists(name);
    await rename(source.real, target);
    return entryAt(join(dirname(source.path), name));
  }

  return {
    async roots(scope: ExplorerScope): Promise<ExplorerRoots> {
      return { roots: await roots(scope), separator: sep === "\\" ? "\\" : "/" };
    },
    list,
    stat: statEntry,
    read,
    write,
    create,
    rename: renameEntry,
    async trash(input: ExplorerPathInput): Promise<void> {
      const entry = await resolveEntry(await roots(input.scope), input.path);
      await lstat(entry.real).catch((error: unknown) => {
        if (isMissing(error)) throw new ExplorerRefused("missing", sourceText("error.explorer.notFound"));
        throw error;
      });
      await trash(entry.real);
    },
    async reveal(input: ExplorerPathInput): Promise<void> {
      reveal((await resolveInside(await roots(input.scope), input.path)).path);
    },
  };
}
