import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, rmdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE = ["o", "p", "e", "n", "b", "o", "t"].join("");
const TARGET = ["c", "o", "d", "e", "b", "o", "t"].join("");
const NAME = new RegExp(SOURCE, "gi");

const KEPT_FILES: readonly string[] = ["LICENSE", "NOTICE", "scripts/codebot/branding-allowlist.json"];
const KEPT_DIRECTORIES: readonly string[] = ["docs/upstream/", "docs/codebot/"];

const DOMAIN = `(?:[a-z0-9-]+\\.)*[a-z0-9-]*${SOURCE}\\.(?:run|site)\\b`;
const KEPT_SPANS: readonly RegExp[] = [
  new RegExp(`[a-z0-9._%+-]*@${SOURCE}\\.run\\b`, "gi"),
  new RegExp(DOMAIN, "gi"),
  new RegExp(`nightly-labs/${SOURCE}[a-z0-9._-]*`, "gi"),
  new RegExp(`${SOURCE}[a-z0-9-]*\\.[a-z0-9-]+\\.workers\\.dev\\b`, "gi"),
  new RegExp(`${SOURCE}-a3328\\b`, "gi"),
  new RegExp(`${SOURCE}git\\b`, "gi"),
  new RegExp(`@${SOURCE}_(?![a-z0-9_])`, "gi"),
  new RegExp(`(?:x|twitter)\\.com/${SOURCE}_`, "gi"),
  new RegExp(`reddit\\.com/r/${SOURCE}_`, "gi"),
  new RegExp(`"${SOURCE}_"`, "g"),
  new RegExp(`company/${SOURCE}-si\\b`, "gi"),
  new RegExp(`integrations/${SOURCE}\\.png`, "gi"),
];

const BINARY_PROBE_BYTES = 8_192;

interface RenameSummary {
  root: string;
  filesChanged: number;
  replacements: number;
  pathsMoved: number;
  keptSpans: number;
  skippedBinary: number;
}

function renameName(match: string): string {
  let renamed = "";
  for (let index = 0; index < match.length; index += 1) {
    const source = match[index] ?? "";
    const target = TARGET[index] ?? "";
    renamed += source === source.toUpperCase() && source !== source.toLowerCase() ? target.toUpperCase() : target;
  }
  return renamed;
}

function keptRanges(text: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  for (const pattern of KEPT_SPANS) {
    pattern.lastIndex = 0;
    for (let match = pattern.exec(text); match !== null; match = pattern.exec(text)) {
      if (match[0].length === 0) {
        pattern.lastIndex += 1;
        continue;
      }
      ranges.push([match.index, match.index + match[0].length]);
    }
  }
  return ranges;
}

export function renameText(text: string): { text: string; replacements: number; kept: number } {
  if (!NAME.test(text)) return { text, replacements: 0, kept: 0 };
  const ranges = keptRanges(text);
  let replacements = 0;
  let kept = 0;
  NAME.lastIndex = 0;
  const renamed = text.replace(NAME, (match, offset: number) => {
    if (ranges.some(([start, end]) => offset >= start && offset + match.length <= end)) {
      kept += 1;
      return match;
    }
    replacements += 1;
    return renameName(match);
  });
  return { text: renamed, replacements, kept };
}

export function renamePath(path: string): string {
  NAME.lastIndex = 0;
  return path.replace(NAME, (match) => renameName(match));
}

function isKept(path: string): boolean {
  return KEPT_FILES.includes(path) || KEPT_DIRECTORIES.some((directory) => path.startsWith(directory));
}

function trackedFiles(root: string): Array<{ path: string; symlink: boolean }> {
  const listed = execFileSync("git", ["ls-files", "-s", "-z"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 256 * 1_024 * 1_024,
  });
  const files: Array<{ path: string; symlink: boolean }> = [];
  for (const entry of listed.split("\0")) {
    if (entry === "") continue;
    const tab = entry.indexOf("\t");
    if (tab < 0) continue;
    files.push({ path: entry.slice(tab + 1), symlink: entry.startsWith("120000 ") });
  }
  return files;
}

function isBinary(content: Buffer): boolean {
  return content.subarray(0, BINARY_PROBE_BYTES).includes(0);
}

function removeEmptyParents(root: string, path: string): void {
  let directory = dirname(path);
  while (directory !== "." && directory !== "") {
    try {
      rmdirSync(join(root, directory));
    } catch {
      return;
    }
    directory = dirname(directory);
  }
}

export function renameRepository(root: string, write: boolean): RenameSummary {
  const summary: RenameSummary = {
    root,
    filesChanged: 0,
    replacements: 0,
    pathsMoved: 0,
    keptSpans: 0,
    skippedBinary: 0,
  };
  for (const file of trackedFiles(root)) {
    if (isKept(file.path)) continue;
    const absolute = join(root, file.path);
    if (!existsSync(absolute)) continue;
    if (!file.symlink) {
      const original = readFileSync(absolute);
      if (isBinary(original)) {
        summary.skippedBinary += 1;
      } else {
        const text = original.toString("utf8");
        if (Buffer.from(text, "utf8").equals(original)) {
          const renamed = renameText(text);
          summary.keptSpans += renamed.kept;
          if (renamed.replacements > 0) {
            summary.filesChanged += 1;
            summary.replacements += renamed.replacements;
            if (write) writeFileSync(absolute, renamed.text);
          }
        } else {
          summary.skippedBinary += 1;
        }
      }
    }
    const target = renamePath(file.path);
    if (target === file.path) continue;
    summary.pathsMoved += 1;
    if (!write) continue;
    const targetAbsolute = join(root, target);
    if (existsSync(targetAbsolute)) throw new Error(`Cannot move ${file.path}: ${target} exists.`);
    mkdirSync(dirname(targetAbsolute), { recursive: true });
    renameSync(absolute, targetAbsolute);
    removeEmptyParents(root, file.path);
  }
  return summary;
}

function main(): void {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const rootIndex = args.indexOf("--root");
  const rootArgument = rootIndex >= 0 ? args[rootIndex + 1] : undefined;
  if (rootIndex >= 0 && !rootArgument) throw new Error("--root needs a directory.");
  const unknown = args.filter((arg, index) => arg !== "--dry-run" && arg !== "--root" && index !== rootIndex + 1);
  if (unknown.length > 0) {
    process.stderr.write("Usage: bun scripts/codebot/rename-upstream.ts [--dry-run] [--root <checkout>]\n");
    process.exit(2);
  }
  const root = resolve(rootArgument ?? join(dirname(fileURLToPath(import.meta.url)), "..", ".."));
  const summary = renameRepository(root, !dryRun);
  process.stdout.write(`${JSON.stringify({ ...summary, dryRun }, null, 2)}\n`);
}

if (import.meta.main) main();
