import { type ExplorerGitFile, type ExplorerScope, explorerGitChange } from "@codebot/contracts/ipc";
import { Badge, Button, FileDiff, Spinner } from "@codebot/ui";
import { useText } from "@codebot/ui/text";
import type { JSX } from "@solidjs/web";
import { createEffect, createSignal, For, Match, onCleanup, onSettled, Switch, untrack } from "solid-js";
import { explorerGitLetter } from "./explorer-git-marks";
import { explorerIconUrl, loadExplorerIcons } from "./explorer-icons";
import type { ExplorerPort } from "./explorer-port";
import { acquireExplorerSession } from "./explorer-session";
import { explorerGitChangeText } from "./explorer-text";
import type { ExplorerDiffTarget } from "./explorer-types";

const STAT_CONCURRENCY = 8;
const STAT_LIMIT = 400;
const REFRESH_MS = 500;

export interface ChatChangesPanelProps {
  serverId: string;
  scope: ExplorerScope;
  port?: ExplorerPort | undefined;
  since: number | null;
  onOpenDiff: (target: ExplorerDiffTarget) => void;
}

interface ChangedFile {
  root: string;
  file: ExplorerGitFile;
}

function nameOf(path: string, separator: string): string {
  const end = path.lastIndexOf(separator);
  return end === -1 ? path : path.slice(end + 1);
}

function folderOf(relativePath: string): string {
  const end = relativePath.lastIndexOf("/");
  return end === -1 ? "" : relativePath.slice(0, end);
}

export function ChatChangesPanel(props: ChatChangesPanelProps): JSX.Element {
  const { t } = useText();
  const acquired = untrack(() => acquireExplorerSession(props.serverId, props.scope, props.port));
  const session = acquired.session;
  onCleanup(acquired.release);
  const port = session.port;
  onSettled(() => {
    session.start();
    void loadExplorerIcons();
  });

  const [found, setFound] = createSignal<ChangedFile[]>([]);
  const [busy, setBusy] = createSignal(true);
  let disposed = false;
  let run = 0;
  let timer: number | undefined;
  onCleanup(() => {
    disposed = true;
    if (timer !== undefined) window.clearTimeout(timer);
  });

  const repositories = () =>
    session.state.roots.flatMap((root) => {
      const status = session.state.git[root.path];
      return status?.state === "ready" ? [{ root: root.path, files: status.files }] : [];
    });
  const gitAvailable = () => repositories().length > 0;

  async function scan(): Promise<void> {
    const mine = ++run;
    const candidates: ChangedFile[] = [];
    for (const repository of repositories())
      for (const file of repository.files)
        if (explorerGitChange(file) !== "ignored" && !file.directory) candidates.push({ root: repository.root, file });
    const since = props.since;
    const limited = candidates.slice(0, STAT_LIMIT);
    const matched: ChangedFile[] = [];
    let next = 0;
    async function worker(): Promise<void> {
      while (next < limited.length) {
        const item = limited[next];
        next += 1;
        if (!item) return;
        if (explorerGitChange(item.file) === "deleted" || since === null) {
          matched.push(item);
          continue;
        }
        const entry = await port.stat({ scope: props.scope, path: item.file.path }, props.serverId).catch(() => null);
        if (entry && entry.modifiedAt >= since) matched.push(item);
      }
    }
    await Promise.all(Array.from({ length: Math.min(STAT_CONCURRENCY, limited.length) }, worker));
    if (disposed || mine !== run) return;
    setFound(matched.toSorted((first, second) => first.file.relativePath.localeCompare(second.file.relativePath)));
    setBusy(false);
  }

  function schedule(): void {
    if (timer !== undefined) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      timer = undefined;
      void scan();
    }, REFRESH_MS);
  }

  createEffect(
    () => ({ gitLoaded: session.state.gitLoaded, repositories: repositories(), since: props.since }),
    ({ gitLoaded }) => {
      if (!gitLoaded) return;
      schedule();
    },
  );

  function open(item: ChangedFile): void {
    props.onOpenDiff({
      root: item.root,
      path: item.file.path,
      name: nameOf(item.file.path, session.state.separator),
      originalPath: item.file.originalPath,
      hash: null,
      change: explorerGitChange(item.file),
      label: null,
    });
  }

  return (
    <section class="explorer-git" aria-label={t("explorer.chat.label")}>
      <header class="explorer-git-header">
        <FileDiff class="explorer-git-branch-icon" aria-hidden="true" />
        <span class="explorer-git-branch">{t("explorer.chat.title")}</span>
        <Badge variant="secondary">{found().length}</Badge>
      </header>
      <div class="explorer-git-scroll">
        <Switch>
          <Match when={session.state.status !== "ready" || !session.state.gitLoaded || busy()}>
            <div class="explorer-git-state">
              <Spinner />
            </div>
          </Match>
          <Match when={!gitAvailable()}>
            <div class="explorer-git-state">
              <FileDiff aria-hidden="true" />
              <p>{t("explorer.chat.needsGit")}</p>
            </div>
          </Match>
          <Match when={found().length === 0}>
            <div class="explorer-git-state">
              <FileDiff aria-hidden="true" />
              <p>{t("explorer.chat.empty")}</p>
            </div>
          </Match>
          <Match when={true}>
            <p class="explorer-git-note">{t("explorer.chat.note")}</p>
            <ul class="explorer-git-list" aria-label={t("explorer.chat.title")}>
              <For each={found()} keyed={(item) => item.file.path}>
                {(item) => (
                  <li>
                    <Button
                      variant="ghost"
                      class="explorer-git-row"
                      data-git={explorerGitChange(item().file)}
                      title={item().file.relativePath}
                      onClick={() => open(item())}
                    >
                      <img
                        class="explorer-row-icon"
                        src={explorerIconUrl({
                          name: nameOf(item().file.path, session.state.separator),
                          directory: false,
                        })}
                        alt=""
                      />
                      <span class="explorer-git-name">{nameOf(item().file.path, session.state.separator)}</span>
                      <span class="explorer-git-folder">{folderOf(item().file.relativePath)}</span>
                      <span
                        class="explorer-git-letter"
                        data-git={explorerGitChange(item().file)}
                        title={t(explorerGitChangeText(explorerGitChange(item().file)))}
                      >
                        {explorerGitLetter(explorerGitChange(item().file))}
                      </span>
                    </Button>
                  </li>
                )}
              </For>
            </ul>
          </Match>
        </Switch>
      </div>
    </section>
  );
}
