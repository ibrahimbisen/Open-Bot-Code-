import {
  EXPLORER_LIMITS,
  type ExplorerGitChange,
  type ExplorerGitCommit,
  type ExplorerGitCommitFile,
  type ExplorerGitFile,
  type ExplorerGitStatus,
  type ExplorerScope,
  explorerGitChange,
} from "@codebot/contracts/ipc";
import {
  ArrowDown,
  ArrowUp,
  Badge,
  Button,
  ChevronRight,
  GitBranch,
  GitCommitHorizontal,
  IconButton,
  NativeSelect,
  RefreshCw,
  Spinner,
} from "@codebot/ui";
import { useText } from "@codebot/ui/text";
import type { JSX } from "@solidjs/web";
import {
  createEffect,
  createMemo,
  createSignal,
  createStore,
  For,
  Match,
  onCleanup,
  onSettled,
  Show,
  Switch,
  untrack,
} from "solid-js";
import { explorerGitLetter } from "./explorer-git-marks";
import { explorerIconUrl, loadExplorerIcons } from "./explorer-icons";
import type { ExplorerPort } from "./explorer-port";
import { acquireExplorerSession } from "./explorer-session";
import { explorerGitChangeText } from "./explorer-text";
import type { ExplorerDiffTarget } from "./explorer-types";

const LOG_PAGE = 40;
const FILE_LIST_LIMIT = 300;
const LOG_REFRESH_MS = 600;

export interface GitPanelProps {
  serverId: string;
  scope: ExplorerScope;
  port?: ExplorerPort | undefined;
  onOpenDiff: (target: ExplorerDiffTarget) => void;
  onOpenFile: (file: { path: string; name: string }) => void;
}

interface LogState {
  state: "loading" | "ready" | "not-repository" | "git-missing" | "error";
  error: unknown;
  commits: ExplorerGitCommit[];
  more: boolean;
  loadingMore: boolean;
  root: string | null;
}

interface CommitFilesState {
  loading: boolean;
  error: unknown;
  files: ExplorerGitCommitFile[];
  truncated: boolean;
}

function nameOf(path: string, separator: string): string {
  const end = path.lastIndexOf(separator);
  return end === -1 ? path : path.slice(end + 1);
}

function folderOf(relativePath: string): string {
  const end = relativePath.lastIndexOf("/");
  return end === -1 ? "" : relativePath.slice(0, end);
}

export function GitPanel(props: GitPanelProps): JSX.Element {
  const { t, format, errorMessage } = useText();
  const acquired = untrack(() => acquireExplorerSession(props.serverId, props.scope, props.port));
  const session = acquired.session;
  onCleanup(acquired.release);
  const port = session.port;
  onSettled(() => {
    session.start();
    void loadExplorerIcons();
  });

  const [rootPath, setRootPath] = createSignal<string | null>(null);
  const activeRoot = createMemo(() => {
    const roots = session.state.roots;
    const chosen = rootPath();
    return roots.find((root) => root.path === chosen) ?? roots[0] ?? null;
  });
  const status = (): ExplorerGitStatus | undefined => {
    const root = activeRoot();
    return root ? session.state.git[root.path] : undefined;
  };
  const changes = createMemo(() =>
    (status()?.files ?? [])
      .filter((file) => explorerGitChange(file) !== "ignored")
      .toSorted((first, second) => first.relativePath.localeCompare(second.relativePath)),
  );
  const [showAll, setShowAll] = createSignal(false);
  const shownChanges = () => (showAll() ? changes() : changes().slice(0, FILE_LIST_LIMIT));

  const [log, setLog] = createStore<LogState>({
    state: "loading",
    error: null,
    commits: [],
    more: false,
    loadingMore: false,
    root: null,
  });
  const [openCommit, setOpenCommit] = createSignal<string | null>(null);
  const [commitFiles, setCommitFiles] = createStore<Record<string, CommitFilesState | undefined>>({});
  let disposed = false;
  onCleanup(() => {
    disposed = true;
    if (logTimer !== undefined) window.clearTimeout(logTimer);
  });
  let logTimer: number | undefined;
  let logRun = 0;

  async function loadLog(root: string, reset: boolean): Promise<void> {
    const run = ++logRun;
    const skip = reset ? 0 : log.commits.length;
    if (!reset)
      setLog((draft) => {
        draft.loadingMore = true;
      });
    const keep = reset ? Math.max(LOG_PAGE, log.commits.length) : LOG_PAGE;
    try {
      const result = await port.gitLog(
        { scope: props.scope, root, skip, limit: Math.min(keep, EXPLORER_LIMITS.gitLogPage) },
        props.serverId,
      );
      if (disposed || run !== logRun) return;
      setLog((draft) => {
        draft.root = root;
        draft.error = null;
        draft.loadingMore = false;
        if (result.state !== "ready") {
          draft.state = result.state;
          draft.commits = [];
          draft.more = false;
          return;
        }
        draft.state = "ready";
        draft.commits = reset ? result.commits : [...draft.commits, ...result.commits];
        draft.more = result.more;
      });
    } catch (error) {
      if (disposed || run !== logRun) return;
      setLog((draft) => {
        draft.state = "error";
        draft.error = error;
        draft.loadingMore = false;
      });
    }
  }

  createEffect(
    () => activeRoot()?.path ?? null,
    (root) => {
      if (root === null) return;
      setShowAll(false);
      setOpenCommit(null);
      void loadLog(root, true);
    },
  );

  const stopChanges = session.onChange((change) => {
    const root = activeRoot()?.path;
    if (!root || !(change.git || change.overflow || change.files.length > 0)) return;
    if (logTimer !== undefined) window.clearTimeout(logTimer);
    logTimer = window.setTimeout(() => {
      logTimer = undefined;
      void loadLog(root, true);
    }, LOG_REFRESH_MS);
  });
  onCleanup(stopChanges);

  async function toggleCommit(commit: ExplorerGitCommit): Promise<void> {
    const root = activeRoot()?.path;
    if (!root) return;
    if (openCommit() === commit.hash) {
      setOpenCommit(null);
      return;
    }
    setOpenCommit(commit.hash);
    if (commitFiles[commit.hash]?.files.length) return;
    setCommitFiles((draft) => {
      draft[commit.hash] = { loading: true, error: null, files: [], truncated: false };
    });
    try {
      const result = await port.gitCommitFiles({ scope: props.scope, root, hash: commit.hash }, props.serverId);
      if (disposed) return;
      setCommitFiles((draft) => {
        draft[commit.hash] = { loading: false, error: null, files: result.files, truncated: result.truncated };
      });
    } catch (error) {
      if (disposed) return;
      setCommitFiles((draft) => {
        draft[commit.hash] = { loading: false, error, files: [], truncated: false };
      });
    }
  }

  function openChange(file: ExplorerGitFile): void {
    const root = activeRoot()?.path;
    if (!root) return;
    props.onOpenDiff({
      root,
      path: file.path,
      name: nameOf(file.path, session.state.separator),
      originalPath: file.originalPath,
      hash: null,
      change: explorerGitChange(file),
      label: null,
    });
  }

  function openCommitFile(commit: ExplorerGitCommit, file: ExplorerGitCommitFile): void {
    const root = activeRoot()?.path;
    if (!root) return;
    props.onOpenDiff({
      root,
      path: file.path,
      name: nameOf(file.path, session.state.separator),
      originalPath: file.originalPath,
      hash: commit.hash,
      change: file.change,
      label: commit.shortHash,
    });
  }

  const branchName = () => {
    const branch = status()?.branch;
    if (!branch) return "";
    return branch.name ?? t("explorer.git.detached", { head: branch.head ?? "" });
  };
  const changeBadge = (change: ExplorerGitChange): JSX.Element => (
    <span class="explorer-git-letter" data-git={change} title={t(explorerGitChangeText(change))}>
      {explorerGitLetter(change)}
    </span>
  );
  const unavailable = () => {
    const found = status();
    if (found && found.state !== "ready") return found.state;
    return null;
  };

  return (
    <section class="explorer-git" aria-label={t("explorer.git.label")}>
      <header class="explorer-git-header">
        <GitBranch class="explorer-git-branch-icon" aria-hidden="true" />
        <Show when={status()?.branch} fallback={<span class="explorer-git-branch">{t("explorer.pane.git")}</span>}>
          {(branch) => (
            <>
              <span class="explorer-git-branch" title={branchName()}>
                {branchName()}
              </span>
              <Show when={branch().ahead > 0}>
                <span class="explorer-git-sync" title={t("explorer.git.ahead", { count: branch().ahead })}>
                  <ArrowUp aria-hidden="true" />
                  {branch().ahead}
                </span>
              </Show>
              <Show when={branch().behind > 0}>
                <span class="explorer-git-sync" title={t("explorer.git.behind", { count: branch().behind })}>
                  <ArrowDown aria-hidden="true" />
                  {branch().behind}
                </span>
              </Show>
            </>
          )}
        </Show>
        <span class="explorer-file-spacer" />
        <IconButton
          variant="ghost"
          size="icon-xs"
          label={t("explorer.tree.refresh")}
          onClick={() => {
            session.refreshGit();
            const root = activeRoot()?.path;
            if (root) void loadLog(root, true);
          }}
        >
          <RefreshCw aria-hidden="true" />
        </IconButton>
      </header>
      <Show when={session.state.roots.length > 1}>
        <div class="explorer-git-roots">
          <NativeSelect
            size="sm"
            aria-label={t("explorer.git.folder")}
            value={activeRoot()?.path ?? ""}
            onChange={(event) => setRootPath(event.currentTarget.value)}
          >
            <For each={session.state.roots} keyed={(root) => root.path}>
              {(root) => <option value={root().path}>{root().name}</option>}
            </For>
          </NativeSelect>
        </div>
      </Show>
      <div class="explorer-git-scroll">
        <Switch>
          <Match when={session.state.status !== "ready" || (!session.state.gitLoaded && activeRoot() !== null)}>
            <div class="explorer-git-state">
              <Spinner />
            </div>
          </Match>
          <Match when={activeRoot() === null}>
            <div class="explorer-git-state">
              <p>{t("explorer.tree.noFolders")}</p>
            </div>
          </Match>
          <Match when={unavailable() === "not-repository"}>
            <div class="explorer-git-state">
              <GitBranch aria-hidden="true" />
              <p>{t("explorer.git.notRepository")}</p>
            </div>
          </Match>
          <Match when={unavailable() === "git-missing"}>
            <div class="explorer-git-state">
              <GitBranch aria-hidden="true" />
              <p>{t("explorer.git.missing")}</p>
            </div>
          </Match>
          <Match when={true}>
            <h3 class="explorer-git-heading">
              {t("explorer.git.changes")}
              <Badge variant="secondary">{format.number(changes().length)}</Badge>
            </h3>
            <Show when={changes().length > 0} fallback={<p class="explorer-git-empty">{t("explorer.git.clean")}</p>}>
              <ul class="explorer-git-list" aria-label={t("explorer.git.changes")}>
                <For each={shownChanges()} keyed={(file) => file.path}>
                  {(file) => (
                    <li>
                      <Button
                        variant="ghost"
                        class="explorer-git-row"
                        data-git={explorerGitChange(file())}
                        title={file().relativePath}
                        onClick={() => openChange(file())}
                      >
                        <img
                          class="explorer-row-icon"
                          src={explorerIconUrl({
                            name: nameOf(file().path, session.state.separator),
                            directory: file().directory,
                          })}
                          alt=""
                        />
                        <span class="explorer-git-name">{nameOf(file().path, session.state.separator)}</span>
                        <span class="explorer-git-folder">{folderOf(file().relativePath)}</span>
                        {changeBadge(explorerGitChange(file()))}
                      </Button>
                    </li>
                  )}
                </For>
              </ul>
              <Show when={!showAll() && changes().length > FILE_LIST_LIMIT}>
                <Button variant="link" size="xs" class="explorer-git-more" onClick={() => setShowAll(true)}>
                  {t("explorer.tree.showMore", { count: changes().length - FILE_LIST_LIMIT })}
                </Button>
              </Show>
            </Show>
            <h3 class="explorer-git-heading">{t("explorer.git.history")}</h3>
            <Switch>
              <Match when={log.state === "loading"}>
                <div class="explorer-git-state">
                  <Spinner />
                </div>
              </Match>
              <Match when={log.state === "error"}>
                <p class="explorer-git-empty">{errorMessage(log.error, t("explorer.git.logFailed"))}</p>
              </Match>
              <Match when={log.commits.length === 0}>
                <p class="explorer-git-empty">{t("explorer.git.noCommits")}</p>
              </Match>
              <Match when={true}>
                <ul class="explorer-git-list explorer-git-commits" aria-label={t("explorer.git.history")}>
                  <For each={log.commits} keyed={(commit) => commit.hash}>
                    {(commit) => (
                      <li>
                        <Button
                          variant="ghost"
                          class="explorer-git-commit"
                          aria-expanded={openCommit() === commit().hash ? "true" : "false"}
                          onClick={() => void toggleCommit(commit())}
                        >
                          <ChevronRight
                            class={
                              openCommit() === commit().hash
                                ? "explorer-git-chevron explorer-git-chevron-open"
                                : "explorer-git-chevron"
                            }
                            aria-hidden="true"
                          />
                          <span class="explorer-git-commit-text">
                            <span class="explorer-git-subject">{commit().subject}</span>
                            <span class="explorer-git-meta">
                              <GitCommitHorizontal aria-hidden="true" />
                              {commit().shortHash}
                              <span class="explorer-git-dot" aria-hidden="true">
                                ·
                              </span>
                              {commit().author}
                              <span class="explorer-git-dot" aria-hidden="true">
                                ·
                              </span>
                              {format.date(commit().authoredAt * 1000, { dateStyle: "medium" })}
                            </span>
                            <Show when={commit().refs.length > 0}>
                              <span class="explorer-git-refs">
                                <For each={commit().refs} keyed={(name) => name}>
                                  {(name) => <Badge variant="secondary">{name()}</Badge>}
                                </For>
                              </span>
                            </Show>
                          </span>
                        </Button>
                        <Show when={openCommit() === commit().hash}>
                          <CommitFiles
                            state={commitFiles[commit().hash]}
                            separator={session.state.separator}
                            onOpen={(file) => openCommitFile(commit(), file)}
                            fallbackError={t("explorer.git.filesFailed")}
                            errorMessage={errorMessage}
                            badge={changeBadge}
                          />
                        </Show>
                      </li>
                    )}
                  </For>
                </ul>
                <Show when={log.more}>
                  <Button
                    variant="link"
                    size="xs"
                    class="explorer-git-more"
                    disabled={log.loadingMore}
                    onClick={() => {
                      const root = activeRoot()?.path;
                      if (root) void loadLog(root, false);
                    }}
                  >
                    {t("explorer.git.loadMore")}
                  </Button>
                </Show>
              </Match>
            </Switch>
          </Match>
        </Switch>
      </div>
    </section>
  );
}

function CommitFiles(props: {
  state: CommitFilesState | undefined;
  separator: string;
  onOpen: (file: ExplorerGitCommitFile) => void;
  fallbackError: string;
  errorMessage: (error: unknown, fallback: string) => string;
  badge: (change: ExplorerGitChange) => JSX.Element;
}): JSX.Element {
  return (
    <div class="explorer-git-files">
      <Show when={props.state && !props.state.loading} fallback={<Spinner size="sm" />}>
        <Show
          when={props.state?.error}
          fallback={
            <ul class="explorer-git-list">
              <For each={props.state?.files ?? []} keyed={(file) => file.path}>
                {(file) => (
                  <li>
                    <Button
                      variant="ghost"
                      class="explorer-git-row"
                      title={file().relativePath}
                      onClick={() => props.onOpen(file())}
                    >
                      <img
                        class="explorer-row-icon"
                        src={explorerIconUrl({ name: nameOf(file().path, props.separator), directory: false })}
                        alt=""
                      />
                      <span class="explorer-git-name">{nameOf(file().path, props.separator)}</span>
                      <span class="explorer-git-folder">{folderOf(file().relativePath)}</span>
                      {props.badge(file().change)}
                    </Button>
                  </li>
                )}
              </For>
            </ul>
          }
        >
          <p class="explorer-git-empty">{props.errorMessage(props.state?.error, props.fallbackError)}</p>
        </Show>
      </Show>
    </div>
  );
}
