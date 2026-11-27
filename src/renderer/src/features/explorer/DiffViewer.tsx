import type { ExplorerGitDiff, ExplorerScope } from "@codebot/contracts/ipc";
import { Badge, Button, Columns2, File as FileIcon, IconButton, Rows2, Spinner } from "@codebot/ui";
import { useText } from "@codebot/ui/text";
import type { JSX } from "@solidjs/web";
import { createMemo, createSignal, createStore, Match, onCleanup, onSettled, Show, Switch, untrack } from "solid-js";
import { DiffEditorView } from "./DiffEditorView";
import { explorerGitLetter } from "./explorer-git-marks";
import { explorerIconUrl, loadExplorerIcons } from "./explorer-icons";
import type { ExplorerPort } from "./explorer-port";
import { acquireExplorerSession } from "./explorer-session";
import { explorerGitChangeText } from "./explorer-text";
import type { ExplorerDiffTarget } from "./explorer-types";

const LAYOUT_STORAGE_KEY = "codebot:explorer-diff-side-by-side";

function readSideBySide(): boolean {
  try {
    return window.localStorage.getItem(LAYOUT_STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

export interface DiffViewerProps {
  serverId: string;
  scope: ExplorerScope;
  port?: ExplorerPort | undefined;
  target: ExplorerDiffTarget;
  onOpenFile?: ((file: { path: string; name: string }) => void) | undefined;
  leading?: JSX.Element;
  actions?: JSX.Element;
}

interface DiffState {
  status: "loading" | "ready" | "error";
  error: unknown;
  diff: ExplorerGitDiff | null;
}

export function DiffViewer(props: DiffViewerProps): JSX.Element {
  const { t, errorMessage } = useText();
  const acquired = untrack(() => acquireExplorerSession(props.serverId, props.scope, props.port));
  const session = acquired.session;
  onCleanup(acquired.release);
  const port = session.port;
  const [state, setState] = createStore<DiffState>({ status: "loading", error: null, diff: null });
  const [sideBySide, setSideBySide] = createSignal(readSideBySide());
  let disposed = false;
  let run = 0;
  onCleanup(() => {
    disposed = true;
  });

  async function load(initial: boolean): Promise<void> {
    const mine = ++run;
    if (initial)
      setState((draft) => {
        draft.status = "loading";
      });
    try {
      const target = props.target;
      const diff = await port.gitDiff(
        {
          scope: props.scope,
          root: target.root,
          path: target.path,
          hash: target.hash,
          originalPath: target.originalPath,
        },
        props.serverId,
      );
      if (disposed || mine !== run) return;
      setState((draft) => {
        draft.status = "ready";
        draft.error = null;
        draft.diff = diff;
      });
    } catch (error) {
      if (disposed || mine !== run) return;
      setState((draft) => {
        draft.status = "error";
        draft.error = error;
      });
    }
  }

  onSettled(() => {
    session.start();
    void loadExplorerIcons();
    void load(true);
  });

  const stopChanges = session.onChange((change) => {
    if (props.target.hash !== null) return;
    const parent = session.parentOf(props.target.path);
    if (
      change.overflow ||
      change.git ||
      change.files.includes(props.target.path) ||
      (parent !== null && change.directories.includes(parent))
    )
      void load(false);
  });
  onCleanup(stopChanges);

  function toggleLayout(): void {
    const next = !sideBySide();
    setSideBySide(next);
    try {
      window.localStorage.setItem(LAYOUT_STORAGE_KEY, String(next));
    } catch {}
  }

  const identical = createMemo(() => {
    const diff = state.diff;
    return diff !== null && diff.original !== null && diff.original === diff.modified;
  });
  const shown = () => {
    const diff = state.diff;
    return diff !== null && !diff.binary && !diff.tooLarge && !identical();
  };
  const heading = () => props.target.label ?? t("explorer.diff.workingTree");

  return (
    <section class="explorer-file explorer-diff" aria-label={t("explorer.diff.label", { name: props.target.name })}>
      <header class="explorer-file-header">
        {props.leading}
        <img class="explorer-file-icon" src={explorerIconUrl({ name: props.target.name, directory: false })} alt="" />
        <span class="explorer-file-name" title={props.target.path}>
          {props.target.name}
        </span>
        <span
          class="explorer-git-letter"
          data-git={props.target.change}
          title={t(explorerGitChangeText(props.target.change))}
        >
          {explorerGitLetter(props.target.change)}
        </span>
        <Badge variant="secondary">{heading()}</Badge>
        <span class="explorer-file-spacer" />
        <Show when={shown()}>
          <IconButton
            variant="ghost"
            size="icon-xs"
            label={sideBySide() ? t("explorer.diff.inline") : t("explorer.diff.sideBySide")}
            onClick={toggleLayout}
          >
            <Show when={sideBySide()} fallback={<Columns2 aria-hidden="true" />}>
              <Rows2 aria-hidden="true" />
            </Show>
          </IconButton>
        </Show>
        <Show when={props.onOpenFile && props.target.hash === null && props.target.change !== "deleted"}>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => props.onOpenFile?.({ path: props.target.path, name: props.target.name })}
          >
            <FileIcon aria-hidden="true" />
            {t("explorer.diff.openFile")}
          </Button>
        </Show>
        {props.actions}
      </header>
      <div class="explorer-file-body">
        <Switch>
          <Match when={state.status === "loading"}>
            <div class="explorer-file-state">
              <Spinner />
            </div>
          </Match>
          <Match when={state.status === "error"}>
            <div class="explorer-file-state">
              <FileIcon aria-hidden="true" />
              <p>{errorMessage(state.error, t("explorer.diff.loadFailed"))}</p>
              <Button variant="secondary" size="sm" onClick={() => void load(true)}>
                {t("common.retry")}
              </Button>
            </div>
          </Match>
          <Match when={state.diff?.state !== "ready"}>
            <div class="explorer-file-state">
              <p>{t("explorer.git.notRepository")}</p>
            </div>
          </Match>
          <Match when={state.diff?.binary}>
            <div class="explorer-file-state">
              <p>{t("explorer.diff.binary")}</p>
            </div>
          </Match>
          <Match when={state.diff?.tooLarge}>
            <div class="explorer-file-state">
              <p>{t("explorer.diff.tooLarge")}</p>
            </div>
          </Match>
          <Match when={identical()}>
            <div class="explorer-file-state">
              <p>{t("explorer.diff.noChanges")}</p>
            </div>
          </Match>
          <Match when={true}>
            <DiffEditorView
              name={props.target.name}
              original={state.diff?.original ?? ""}
              modified={state.diff?.modified ?? ""}
              sideBySide={sideBySide()}
            />
          </Match>
        </Switch>
      </div>
    </section>
  );
}
