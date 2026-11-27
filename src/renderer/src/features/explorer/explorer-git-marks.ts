import {
  type ExplorerGitChange,
  type ExplorerGitStatus,
  type ExplorerSeparator,
  explorerGitChange,
} from "@codebot/contracts/ipc";

export interface ExplorerGitMarks {
  files: ReadonlyMap<string, ExplorerGitChange>;
  folders: ReadonlySet<string>;
  inherited: readonly (readonly [string, ExplorerGitChange])[];
  ignored: readonly string[];
  separator: ExplorerSeparator;
}

export interface ExplorerGitMark {
  change: ExplorerGitChange | null;
  contains: boolean;
  ignored: boolean;
}

export const NO_GIT_MARK: ExplorerGitMark = { change: null, contains: false, ignored: false };

export function explorerGitMarks(
  statuses: readonly (ExplorerGitStatus | undefined)[],
  separator: ExplorerSeparator,
): ExplorerGitMarks {
  const files = new Map<string, ExplorerGitChange>();
  const folders = new Set<string>();
  const inherited: [string, ExplorerGitChange][] = [];
  const ignored: string[] = [];
  for (const status of statuses) {
    if (status?.state !== "ready") continue;
    for (const file of status.files) {
      const change = explorerGitChange(file);
      if (change === "ignored") {
        ignored.push(file.path);
        continue;
      }
      files.set(file.path, change);
      if (file.directory) inherited.push([file.path, change]);
      let folder = file.path;
      for (;;) {
        const end = folder.lastIndexOf(separator);
        if (end <= 0) break;
        folder = folder.slice(0, end);
        if (folders.has(folder)) break;
        folders.add(folder);
        if (folder === status.root) break;
      }
    }
  }
  return { files, folders, inherited, ignored, separator };
}

function under(path: string, folder: string, separator: string): boolean {
  return path === folder || path.startsWith(`${folder}${separator}`);
}

export function explorerGitMark(marks: ExplorerGitMarks, path: string): ExplorerGitMark {
  const ignored = marks.ignored.some((entry) => under(path, entry, marks.separator));
  const change =
    marks.files.get(path) ?? marks.inherited.find(([folder]) => under(path, folder, marks.separator))?.[1] ?? null;
  if (!ignored && change === null && !marks.folders.has(path)) return NO_GIT_MARK;
  return { change, contains: marks.folders.has(path), ignored };
}

const GIT_LETTERS = {
  added: "A",
  modified: "M",
  deleted: "D",
  renamed: "R",
  untracked: "U",
  conflicted: "!",
  ignored: "",
} as const satisfies Record<ExplorerGitChange, string>;

export function explorerGitLetter(change: ExplorerGitChange): string {
  return GIT_LETTERS[change];
}
