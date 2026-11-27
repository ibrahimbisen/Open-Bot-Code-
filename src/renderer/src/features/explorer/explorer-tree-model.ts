import type { ExplorerEntryKind } from "@codebot/contracts/ipc";
import type { ExplorerSessionState } from "./explorer-session";

export type ExplorerEdit =
  | { mode: "create"; kind: ExplorerEntryKind; parent: string }
  | { mode: "rename"; kind: ExplorerEntryKind; parent: string; path: string; name: string };

export interface ExplorerEntryRow {
  type: "entry";
  key: string;
  path: string;
  name: string;
  depth: number;
  directory: boolean;
  expanded: boolean;
  root: boolean;
  symlink: boolean;
  hint: string | null;
}

export interface ExplorerEditRow {
  type: "edit";
  key: string;
  depth: number;
  edit: ExplorerEdit;
}

export interface ExplorerStatusRow {
  type: "status";
  key: string;
  path: string;
  depth: number;
  status: "loading" | "empty" | "error" | "more";
  error: unknown;
  remaining: number;
}

export type ExplorerRow = ExplorerEntryRow | ExplorerEditRow | ExplorerStatusRow;

const EDIT_KEY = "\u0000edit";

function rootHint(state: ExplorerSessionState, path: string, name: string): string | null {
  if (state.roots.filter((root) => root.name === name).length < 2) return null;
  const end = path.lastIndexOf(state.separator);
  return end > 0 ? path.slice(0, end) : null;
}

export function explorerRows(state: ExplorerSessionState, edit: ExplorerEdit | null): ExplorerRow[] {
  const rows: ExplorerRow[] = [];
  const status = (path: string, depth: number, kind: ExplorerStatusRow["status"], error: unknown, remaining = 0) =>
    rows.push({ type: "status", key: `${path}\u0000${kind}`, path, depth, status: kind, error, remaining });

  function children(path: string, depth: number): void {
    const directory = state.directories[path];
    const creating = edit?.mode === "create" && edit.parent === path;
    if (creating) rows.push({ type: "edit", key: EDIT_KEY, depth, edit });
    if (!directory?.loaded) {
      status(path, depth, "loading", null);
      return;
    }
    if (directory.error !== null) {
      status(path, depth, "error", directory.error);
      return;
    }
    if (directory.entries.length === 0 && !creating) status(path, depth, "empty", null);
    for (const entry of directory.entries) {
      if (edit?.mode === "rename" && edit.path === entry.path) {
        rows.push({ type: "edit", key: EDIT_KEY, depth, edit });
        continue;
      }
      const isDirectory = entry.kind === "directory";
      const expanded = isDirectory && state.expanded[entry.path] === true;
      rows.push({
        type: "entry",
        key: entry.path,
        path: entry.path,
        name: entry.name,
        depth,
        directory: isDirectory,
        expanded,
        root: false,
        symlink: entry.symlink,
        hint: null,
      });
      if (expanded) children(entry.path, depth + 1);
    }
    if (directory.more) status(path, depth, "more", null, directory.total - directory.entries.length);
  }

  for (const root of state.roots) {
    const expanded = state.expanded[root.path] === true;
    rows.push({
      type: "entry",
      key: root.path,
      path: root.path,
      name: root.name,
      depth: 0,
      directory: true,
      expanded,
      root: true,
      symlink: false,
      hint: rootHint(state, root.path, root.name),
    });
    if (expanded) children(root.path, 1);
  }
  return rows;
}

export function findRowByPrefix(rows: readonly ExplorerRow[], from: number, prefix: string): number {
  const wanted = prefix.toLowerCase();
  for (let step = 0; step < rows.length; step += 1) {
    const index = (from + step) % rows.length;
    const row = rows[index];
    if (row?.type === "entry" && row.name.toLowerCase().startsWith(wanted)) return index;
  }
  return -1;
}

export function parentRowIndex(rows: readonly ExplorerRow[], index: number): number {
  const depth = rows[index]?.depth ?? 0;
  for (let at = index - 1; at >= 0; at -= 1) {
    const row = rows[at];
    if (row?.type === "entry" && row.depth < depth) return at;
  }
  return -1;
}
