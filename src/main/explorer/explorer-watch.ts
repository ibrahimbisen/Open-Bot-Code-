import { type FSWatcher, statSync, watch as watchPath } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { EXPLORER_LIMITS } from "@codebot/contracts/ipc";
import { isPathInside } from "../../backend/path-containment";

const COALESCE_MS = 150;
const GIT_FOLDER = ".git";
const NOISE_FOLDERS = new Set([GIT_FOLDER, "node_modules"]);
const GIT_QUIET_PARTS = new Set(["objects", "logs"]);

export interface ExplorerWatchChange {
  directories: string[];
  files: string[];
  roots: boolean;
  git: boolean;
  overflow: boolean;
}

type WatchListener = (eventType: string, filename: string | Buffer | null) => void;

export type WatchFunction = (
  path: string,
  options: { recursive: boolean; persistent: boolean },
  listener: WatchListener,
) => FSWatcher;

export interface ExplorerWatchOptions {
  watch?: WatchFunction;
  recursive?: boolean;
  coalesceMs?: number;
}

interface WatchedRoot {
  path: string;
  recursive: FSWatcher | null;
  folders: Map<string, FSWatcher>;
}

interface WatchSubscriber {
  expanded: ReadonlySet<string>;
  notify: (change: ExplorerWatchChange) => void;
}

interface WatchSession {
  key: string;
  subscribers: Map<string, WatchSubscriber>;
  expanded: ReadonlySet<string>;
  roots: Map<string, WatchedRoot>;
  timer: ReturnType<typeof setTimeout> | null;
  directories: Set<string>;
  files: Set<string>;
  rootsChanged: boolean;
  git: boolean;
  overflow: boolean;
}

function fileName(value: string | Buffer | null): string | null {
  if (value === null) return null;
  return typeof value === "string" ? value : value.toString("utf8");
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path, { throwIfNoEntry: false })?.isDirectory() === true;
  } catch {
    return false;
  }
}

function nativeRecursiveWatch(platform: NodeJS.Platform = process.platform): boolean {
  return platform === "win32" || platform === "darwin";
}

export class ExplorerWatchers {
  readonly #watch: WatchFunction;
  readonly #recursive: boolean;
  readonly #coalesceMs: number;
  readonly #sessions = new Map<string, WatchSession>();
  #watchers = 0;

  constructor({
    watch = watchPath,
    recursive = nativeRecursiveWatch(),
    coalesceMs = COALESCE_MS,
  }: ExplorerWatchOptions = {}) {
    this.#watch = watch;
    this.#recursive = recursive;
    this.#coalesceMs = coalesceMs;
  }

  get watcherCount(): number {
    return this.#watchers;
  }

  get sessionCount(): number {
    return this.#sessions.size;
  }

  subscribe(
    key: string,
    subscriber: string,
    roots: readonly string[],
    expanded: readonly string[],
    notify: (change: ExplorerWatchChange) => void,
  ): void {
    let session = this.#sessions.get(key);
    if (!session) {
      session = {
        key,
        subscribers: new Map(),
        expanded: new Set(),
        roots: new Map(),
        timer: null,
        directories: new Set(),
        files: new Set(),
        rootsChanged: false,
        git: false,
        overflow: false,
      };
      this.#sessions.set(key, session);
    }
    session.subscribers.set(subscriber, { expanded: new Set(expanded), notify });
    this.#collectExpanded(session);
    this.#syncRoots(session, roots);
  }

  unsubscribe(key: string, subscriber: string): void {
    const session = this.#sessions.get(key);
    if (!session?.subscribers.delete(subscriber)) return;
    if (session.subscribers.size === 0) {
      this.#closeSession(session);
      return;
    }
    this.#collectExpanded(session);
    for (const root of session.roots.values()) this.#syncFolders(session, root);
  }

  unsubscribeAll(subscriber: string): void {
    for (const key of [...this.#sessions.keys()]) this.unsubscribe(key, subscriber);
  }

  close(): void {
    for (const session of [...this.#sessions.values()]) this.#closeSession(session);
  }

  #collectExpanded(session: WatchSession): void {
    session.expanded = new Set([...session.subscribers.values()].flatMap((subscriber) => [...subscriber.expanded]));
  }

  #closeSession(session: WatchSession): void {
    if (session.timer) clearTimeout(session.timer);
    session.timer = null;
    for (const root of session.roots.values()) this.#closeRoot(root);
    session.roots.clear();
    session.subscribers.clear();
    this.#sessions.delete(session.key);
  }

  #closeWatcher(watcher: FSWatcher): void {
    watcher.removeAllListeners();
    watcher.on("error", () => undefined);
    watcher.close();
    this.#watchers -= 1;
  }

  #closeRoot(root: WatchedRoot): void {
    if (root.recursive) this.#closeWatcher(root.recursive);
    root.recursive = null;
    for (const watcher of root.folders.values()) this.#closeWatcher(watcher);
    root.folders.clear();
  }

  #syncRoots(session: WatchSession, roots: readonly string[]): void {
    for (const [path, root] of [...session.roots]) {
      if (roots.includes(path)) continue;
      this.#closeRoot(root);
      session.roots.delete(path);
    }
    for (const path of roots) {
      let root = session.roots.get(path);
      if (!root) {
        root = { path, recursive: this.#recursive ? this.#start(session, path, path, true) : null, folders: new Map() };
        session.roots.set(path, root);
      }
      this.#syncFolders(session, root);
    }
  }

  #syncFolders(session: WatchSession, root: WatchedRoot): void {
    if (root.recursive) return;
    const wanted = new Set(
      [root.path, join(root.path, GIT_FOLDER), ...session.expanded]
        .filter((folder) => isPathInside(root.path, folder))
        .slice(0, EXPLORER_LIMITS.expandedDirectories + 2),
    );
    for (const [folder, watcher] of [...root.folders]) {
      if (wanted.has(folder)) continue;
      this.#closeWatcher(watcher);
      root.folders.delete(folder);
    }
    for (const folder of wanted) {
      if (root.folders.has(folder)) continue;
      const watcher = this.#start(session, root.path, folder, false);
      if (watcher) root.folders.set(folder, watcher);
    }
  }

  #start(session: WatchSession, rootPath: string, folder: string, recursive: boolean): FSWatcher | null {
    let watcher: FSWatcher;
    try {
      watcher = this.#watch(folder, { recursive, persistent: false }, (eventType, filename) =>
        this.#record(session, rootPath, folder, eventType, fileName(filename)),
      );
    } catch {
      return null;
    }
    this.#watchers += 1;
    watcher.on("error", () => this.#failed(session, rootPath, folder, watcher));
    return watcher;
  }

  #dropRoot(session: WatchSession, root: WatchedRoot): void {
    this.#closeRoot(root);
    session.roots.delete(root.path);
    session.rootsChanged = true;
  }

  #failed(session: WatchSession, rootPath: string, folder: string, watcher: FSWatcher): void {
    const root = session.roots.get(rootPath);
    if (!root) return;
    if (root.recursive === watcher) {
      this.#closeWatcher(watcher);
      root.recursive = null;
      if (isDirectory(rootPath)) this.#syncFolders(session, root);
      else this.#dropRoot(session, root);
      session.overflow = true;
    } else if (root.folders.get(folder) === watcher) {
      this.#closeWatcher(watcher);
      root.folders.delete(folder);
      if (folder === rootPath && !isDirectory(rootPath)) this.#dropRoot(session, root);
      else session.directories.add(folder === rootPath ? folder : dirname(folder));
    } else return;
    this.#schedule(session);
  }

  #record(session: WatchSession, rootPath: string, folder: string, eventType: string, name: string | null): void {
    if (!this.#sessions.has(session.key) || !session.roots.has(rootPath)) return;
    if (name === null || name === "") {
      session.overflow = true;
      this.#schedule(session);
      return;
    }
    const path = join(folder, name);
    const parent = dirname(path);
    const parts = relative(rootPath, path).split(sep);
    const noiseAt = parts.findIndex((part) => NOISE_FOLDERS.has(part));
    const insideNoise = noiseAt !== -1 && noiseAt < parts.length - 1;
    if (noiseAt !== -1 && parts[noiseAt] === GIT_FOLDER) {
      const next = parts[noiseAt + 1];
      if (next === undefined || (!GIT_QUIET_PARTS.has(next) && !path.endsWith(".lock"))) session.git = true;
    }
    if (insideNoise && !session.expanded.has(parent)) {
      if (session.git) this.#schedule(session);
      return;
    }
    if (eventType === "rename") session.directories.add(parent);
    session.files.add(path);
    this.#schedule(session);
  }

  #schedule(session: WatchSession): void {
    if (session.timer) return;
    session.timer = setTimeout(() => this.#flush(session), this.#coalesceMs);
  }

  #flush(session: WatchSession): void {
    session.timer = null;
    if (!this.#sessions.has(session.key)) return;
    for (const root of [...session.roots.values()]) if (!isDirectory(root.path)) this.#dropRoot(session, root);
    const limit = EXPLORER_LIMITS.changedPaths;
    const directories = [...session.directories].filter(
      (folder) => session.expanded.has(folder) || session.roots.has(folder),
    );
    const files = [...session.files];
    const change: ExplorerWatchChange = {
      directories: directories.slice(0, limit),
      files: files.slice(0, limit),
      roots: session.rootsChanged,
      git: session.git,
      overflow: session.overflow || directories.length > limit || files.length > limit,
    };
    session.directories = new Set();
    session.files = new Set();
    session.rootsChanged = false;
    session.git = false;
    session.overflow = false;
    for (const subscriber of [...session.subscribers.values()]) subscriber.notify(change);
  }
}
