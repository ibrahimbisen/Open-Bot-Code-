import {
  EXPLORER_LIMITS,
  type ExplorerChange,
  type ExplorerEntry,
  type ExplorerEntryKind,
  type ExplorerGitStatus,
  type ExplorerRoot,
  type ExplorerScope,
  type ExplorerSeparator,
  explorerScopeKey,
} from "@codebot/contracts/ipc";
import { createStore, flush } from "solid-js";
import { type ExplorerPort, explorerPort } from "./explorer-port";

const EXPANDED_STORAGE_PREFIX = "codebot:explorer-expanded:";
const EXPANDED_STORAGE_LIMIT = 300;
const WATCH_SYNC_MS = 80;
const GIT_REFRESH_MS = 450;
const FOCUS_REFRESH_MS = 2_000;

export interface ExplorerDirectoryState {
  entries: ExplorerEntry[];
  total: number;
  more: boolean;
  loading: boolean;
  loaded: boolean;
  error: unknown;
}

export interface ExplorerSessionState {
  status: "idle" | "loading" | "ready" | "error";
  error: unknown;
  roots: ExplorerRoot[];
  separator: ExplorerSeparator;
  directories: Record<string, ExplorerDirectoryState | undefined>;
  expanded: Record<string, boolean | undefined>;
  git: Record<string, ExplorerGitStatus | undefined>;
  gitLoaded: boolean;
}

export type ExplorerChangeListener = (change: ExplorerChange) => void;

export interface ExplorerSession {
  readonly serverId: string;
  readonly scope: ExplorerScope;
  readonly port: ExplorerPort;
  readonly state: ExplorerSessionState;
  start(): void;
  expand(path: string): Promise<void>;
  collapse(path: string): void;
  toggle(path: string): void;
  reveal(path: string): Promise<void>;
  reload(): Promise<void>;
  loadMore(path: string): Promise<void>;
  refreshGit(): void;
  createEntry(parent: string, name: string, kind: ExplorerEntryKind): Promise<ExplorerEntry>;
  renameEntry(path: string, name: string): Promise<ExplorerEntry>;
  trashEntry(path: string): Promise<void>;
  parentOf(path: string): string | null;
  rootOf(path: string): ExplorerRoot | null;
  relativePath(path: string): string;
  keepWatched(directory: string): () => void;
  onChange(listener: ExplorerChangeListener): () => void;
}

function readExpanded(key: string): string[] {
  try {
    const stored = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(stored) ? stored.filter((path): path is string => typeof path === "string") : [];
  } catch {
    return [];
  }
}

function emptyDirectory(): ExplorerDirectoryState {
  return { entries: [], total: 0, more: false, loading: false, loaded: false, error: null };
}

function createSession(serverId: string, scope: ExplorerScope, port: ExplorerPort, onIdle: () => void) {
  const scopeKey = explorerScopeKey(scope);
  const storageKey = `${EXPANDED_STORAGE_PREFIX}${serverId}:${scopeKey}`;
  const [state, setState] = createStore<ExplorerSessionState>({
    status: "idle",
    error: null,
    roots: [],
    separator: "/",
    directories: {},
    expanded: {},
    git: {},
    gitLoaded: false,
  });
  const listeners = new Set<ExplorerChangeListener>();
  const kept = new Map<string, number>();
  let started = false;
  let restored = false;
  let disposed = false;
  let stopEvents: (() => void) | undefined;
  let watchTimer: number | undefined;
  let gitTimer: number | undefined;
  let gitRunning = false;
  let gitAgain = false;
  let lastFocusRefresh = 0;

  const expandedPaths = () => Object.keys(state.expanded).filter((path) => state.expanded[path] === true);

  function saveExpanded(): void {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(expandedPaths().slice(0, EXPANDED_STORAGE_LIMIT)));
    } catch {}
  }

  function syncWatch(): void {
    if (watchTimer !== undefined || disposed) return;
    watchTimer = window.setTimeout(() => {
      watchTimer = undefined;
      if (disposed || state.status !== "ready") return;
      const watched = [...new Set([...expandedPaths(), ...kept.keys()])].slice(0, EXPLORER_LIMITS.expandedDirectories);
      void port.watch({ scope, expanded: watched }, serverId).catch(() => undefined);
    }, WATCH_SYNC_MS);
  }

  function rootOf(path: string): ExplorerRoot | null {
    let best: ExplorerRoot | null = null;
    for (const root of state.roots) {
      const inside = path === root.path || path.startsWith(`${root.path}${state.separator}`);
      if (inside && (best === null || root.path.length > best.path.length)) best = root;
    }
    return best;
  }

  function parentOf(path: string): string | null {
    if (state.roots.some((root) => root.path === path)) return null;
    const end = path.lastIndexOf(state.separator);
    return end > 0 ? path.slice(0, end) : null;
  }

  function relativePath(path: string): string {
    const root = rootOf(path);
    if (!root || root.path === path) return "";
    return path
      .slice(root.path.length + 1)
      .split(state.separator)
      .join("/");
  }

  async function loadDirectory(path: string, quiet: boolean): Promise<boolean> {
    const known = state.directories[path];
    if (known?.loading) return true;
    setState((draft) => {
      const directory = draft.directories[path] ?? emptyDirectory();
      directory.loading = true;
      if (!quiet) directory.error = null;
      draft.directories[path] = directory;
    });
    const wanted = Math.max(EXPLORER_LIMITS.directoryPage, known?.entries.length ?? 0);
    try {
      const entries: ExplorerEntry[] = [];
      let total = 0;
      let more = true;
      while (more && entries.length < wanted) {
        const page = await port.list({ scope, path, offset: entries.length }, serverId);
        entries.push(...page.entries);
        total = page.total;
        more = page.more && page.entries.length > 0;
      }
      if (disposed) return false;
      setState((draft) => {
        draft.directories[path] = { entries, total, more, loading: false, loaded: true, error: null };
      });
      return true;
    } catch (error) {
      if (disposed) return false;
      setState((draft) => {
        if (quiet) {
          delete draft.directories[path];
          delete draft.expanded[path];
        } else draft.directories[path] = { ...emptyDirectory(), loaded: true, error };
      });
      if (quiet) saveExpanded();
      return false;
    }
  }

  async function loadRoots(): Promise<void> {
    setState((draft) => {
      if (draft.status !== "ready") draft.status = "loading";
      draft.error = null;
    });
    try {
      const found = await port.roots(scope, serverId);
      if (disposed) return;
      const stored = restored ? [] : readExpanded(storageKey);
      const first = !restored;
      restored = true;
      setState((draft) => {
        draft.roots = found.roots;
        draft.separator = found.separator;
        draft.status = "ready";
        for (const path of stored) draft.expanded[path] = true;
        if (first && stored.length === 0 && found.roots[0]) draft.expanded[found.roots[0].path] = true;
        for (const path of Object.keys(draft.directories)) {
          const inside = found.roots.some(
            (root) => path === root.path || path.startsWith(`${root.path}${found.separator}`),
          );
          if (!inside) {
            delete draft.directories[path];
            delete draft.expanded[path];
          }
        }
      });
      flush();
      await Promise.all(expandedPaths().map((path) => loadDirectory(path, true)));
      syncWatch();
      refreshGit();
    } catch (error) {
      if (disposed) return;
      setState((draft) => {
        draft.status = "error";
        draft.error = error;
      });
    }
  }

  async function runGit(): Promise<void> {
    if (gitRunning) {
      gitAgain = true;
      return;
    }
    gitRunning = true;
    try {
      const roots = [...state.roots];
      const found = await Promise.all(
        roots.map((root) => port.gitStatus({ scope, root: root.path, ignored: true }, serverId).catch(() => undefined)),
      );
      if (disposed) return;
      setState((draft) => {
        draft.git = {};
        roots.forEach((root, index) => {
          const status = found[index];
          if (status) draft.git[root.path] = status;
        });
        draft.gitLoaded = true;
      });
    } finally {
      gitRunning = false;
      if (gitAgain && !disposed) {
        gitAgain = false;
        void runGit();
      }
    }
  }

  function refreshGit(): void {
    if (disposed) return;
    if (gitTimer !== undefined) window.clearTimeout(gitTimer);
    gitTimer = window.setTimeout(() => {
      gitTimer = undefined;
      void runGit();
    }, GIT_REFRESH_MS);
  }

  function reloadLoaded(paths: readonly string[]): void {
    for (const path of paths) if (state.directories[path]?.loaded) void loadDirectory(path, true);
  }

  function handleChange(change: ExplorerChange): void {
    if (disposed || change.serverId !== serverId || explorerScopeKey(change.scope) !== scopeKey) return;
    if (change.roots) void loadRoots();
    else if (change.overflow) reloadLoaded(Object.keys(state.directories));
    else reloadLoaded(change.directories);
    if (change.git || change.overflow || change.files.length > 0 || change.directories.length > 0) refreshGit();
    for (const listener of [...listeners]) listener(change);
  }

  function onWindowFocus(): void {
    const now = Date.now();
    if (state.status !== "ready" || now - lastFocusRefresh < FOCUS_REFRESH_MS) return;
    lastFocusRefresh = now;
    handleChange({ serverId, scope, directories: [], files: [], roots: false, git: true, overflow: true });
  }

  async function expand(path: string): Promise<void> {
    setState((draft) => {
      draft.expanded[path] = true;
    });
    saveExpanded();
    if (!state.directories[path]?.loaded) await loadDirectory(path, false);
    syncWatch();
  }

  function collapse(path: string): void {
    setState((draft) => {
      delete draft.expanded[path];
    });
    saveExpanded();
    syncWatch();
  }

  async function afterMutation(directory: string | null): Promise<void> {
    if (directory !== null && state.directories[directory]?.loaded) await loadDirectory(directory, true);
    refreshGit();
  }

  const session: ExplorerSession = {
    serverId,
    scope,
    port,
    state,
    start() {
      if (started || disposed) return;
      started = true;
      stopEvents = port.onChanged(handleChange);
      window.addEventListener("focus", onWindowFocus);
      void loadRoots();
    },
    expand,
    collapse,
    toggle(path) {
      if (state.expanded[path]) collapse(path);
      else void expand(path);
    },
    async reveal(path) {
      const chain: string[] = [];
      for (let parent = parentOf(path); parent !== null; parent = parentOf(parent)) chain.unshift(parent);
      for (const folder of chain) await expand(folder);
    },
    async reload() {
      await loadRoots();
      await Promise.all(
        Object.keys(state.directories)
          .filter((path) => state.directories[path]?.loaded)
          .map((path) => loadDirectory(path, true)),
      );
    },
    async loadMore(path) {
      const directory = state.directories[path];
      if (!directory?.more || directory.loading) return;
      const page = await port.list({ scope, path, offset: directory.entries.length }, serverId);
      if (disposed) return;
      setState((draft) => {
        const current = draft.directories[path];
        if (!current) return;
        current.entries.push(...page.entries);
        current.total = page.total;
        current.more = page.more && page.entries.length > 0;
      });
    },
    refreshGit,
    async createEntry(parent, name, kind) {
      const entry = await port.create({ scope, parent, name, kind }, serverId);
      await afterMutation(parent);
      return entry;
    },
    async renameEntry(path, name) {
      const entry = await port.rename({ scope, path, name }, serverId);
      if (state.expanded[path]) {
        setState((draft) => {
          delete draft.expanded[path];
          delete draft.directories[path];
        });
        saveExpanded();
      }
      await afterMutation(parentOf(path));
      return entry;
    },
    async trashEntry(path) {
      await port.trash({ scope, path }, serverId);
      await afterMutation(parentOf(path));
    },
    parentOf,
    rootOf,
    relativePath,
    keepWatched(directory) {
      kept.set(directory, (kept.get(directory) ?? 0) + 1);
      syncWatch();
      return () => {
        const left = (kept.get(directory) ?? 1) - 1;
        if (left <= 0) kept.delete(directory);
        else kept.set(directory, left);
        syncWatch();
      };
    },
    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };

  function dispose(): void {
    disposed = true;
    if (watchTimer !== undefined) window.clearTimeout(watchTimer);
    if (gitTimer !== undefined) window.clearTimeout(gitTimer);
    window.removeEventListener("focus", onWindowFocus);
    stopEvents?.();
    listeners.clear();
    if (started) void port.unwatch(scope, serverId).catch(() => undefined);
    onIdle();
  }

  return { session, dispose };
}

interface SharedSession {
  session: ExplorerSession;
  users: number;
  dispose: () => void;
}

const sessionsByPort = new WeakMap<ExplorerPort, Map<string, SharedSession>>();

export function acquireExplorerSession(
  serverId: string,
  scope: ExplorerScope,
  port: ExplorerPort = explorerPort(),
): { session: ExplorerSession; release: () => void } {
  let sessions = sessionsByPort.get(port);
  if (!sessions) {
    sessions = new Map();
    sessionsByPort.set(port, sessions);
  }
  const key = `${serverId}\n${explorerScopeKey(scope)}`;
  let shared = sessions.get(key);
  if (!shared) {
    const owner = sessions;
    const created = createSession(serverId, scope, port, () => owner.delete(key));
    shared = { session: created.session, users: 0, dispose: created.dispose };
    sessions.set(key, shared);
  }
  const entry = shared;
  entry.users += 1;
  let released = false;
  return {
    session: entry.session,
    release() {
      if (released) return;
      released = true;
      entry.users -= 1;
      if (entry.users === 0) entry.dispose();
    },
  };
}
