import type { ExplorerFile, ExplorerFileVersion, ExplorerScope } from "@codebot/contracts/ipc";
import {
  Alert,
  AlertActions,
  AlertContent,
  AlertDescription,
  AlertIcon,
  Button,
  File as FileIcon,
  FolderOpen,
  IconButton,
  RefreshCw,
  Save,
  SlidingTabs,
  Spinner,
  TriangleAlert,
  WrapText,
} from "@codebot/ui";
import { useText } from "@codebot/ui/text";
import type { JSX } from "@solidjs/web";
import {
  createEffect,
  createMemo,
  createSignal,
  createStore,
  Match,
  onCleanup,
  onSettled,
  Show,
  Switch,
  untrack,
} from "solid-js";
import { actionToast } from "../../action-toast";
import { CodeEditor } from "./CodeEditor";
import {
  ExplorerImagePreview,
  ExplorerJsonPreview,
  ExplorerMarkdownPreview,
  ExplorerMediaPreview,
  ExplorerPdfPreview,
  ExplorerTablePreview,
} from "./ExplorerPreviews";
import { explorerIconUrl, loadExplorerIcons } from "./explorer-icons";
import type { ExplorerPort } from "./explorer-port";
import { type ExplorerPreviewKind, explorerPreviewKind } from "./explorer-preview";
import { acquireExplorerSession } from "./explorer-session";

const WRAP_STORAGE_KEY = "codebot:explorer-wrap";

function readWrap(): boolean {
  try {
    return window.localStorage.getItem(WRAP_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function saveWrap(wrap: boolean): void {
  try {
    window.localStorage.setItem(WRAP_STORAGE_KEY, String(wrap));
  } catch {}
}

export interface FilePanelProps {
  serverId: string;
  scope: ExplorerScope;
  port?: ExplorerPort | undefined;
  path: string;
  name: string;
  canReveal?: boolean | undefined;
  onOpenLink: (url: string) => void;
  onDirtyChange?: ((dirty: boolean) => void) | undefined;
  leading?: JSX.Element;
  actions?: JSX.Element;
}

type Notice = "changed" | "deleted";

interface FileState {
  status: "loading" | "ready" | "error";
  error: unknown;
  file: ExplorerFile | null;
  draft: string;
  saved: string;
  version: ExplorerFileVersion | null;
  notice: Notice | null;
  mode: "edit" | "preview";
  saving: boolean;
  wrap: boolean;
}

const LANGUAGE_LABELS: Readonly<Record<string, string>> = {
  utf8: "UTF-8",
  utf16le: "UTF-16 LE",
  utf16be: "UTF-16 BE",
  latin1: "Latin-1",
};

export function FilePanel(props: FilePanelProps): JSX.Element {
  const { t, format, errorMessage } = useText();
  const acquired = untrack(() => acquireExplorerSession(props.serverId, props.scope, props.port));
  const session = acquired.session;
  onCleanup(acquired.release);
  const port = session.port;

  const [state, setState] = createStore<FileState>({
    status: "loading",
    error: null,
    file: null,
    draft: "",
    saved: "",
    version: null,
    notice: null,
    mode: "edit",
    saving: false,
    wrap: readWrap(),
  });
  const [kind, setKind] = createSignal<ExplorerPreviewKind | null>(null);
  let disposed = false;
  onCleanup(() => {
    disposed = true;
  });

  const dirty = createMemo(() => state.file?.text != null && state.draft !== state.saved);
  createEffect(dirty, (value) => {
    props.onDirtyChange?.(value);
  });
  const editable = () => state.file?.text != null && !state.file.text.readOnly;
  const previewable = () => kind() !== null && state.file?.text != null;

  async function load(initial: boolean): Promise<void> {
    if (initial)
      setState((draft) => {
        draft.status = "loading";
      });
    try {
      const file = await port.read({ scope: props.scope, path: props.path }, props.serverId);
      if (disposed) return;
      const found = explorerPreviewKind(file);
      setKind(found);
      setState((draft) => {
        draft.status = "ready";
        draft.error = null;
        draft.file = file;
        draft.version = { modifiedAt: file.modifiedAt, size: file.size };
        draft.draft = file.text?.content ?? "";
        draft.saved = file.text?.content ?? "";
        draft.notice = null;
        if (initial) draft.mode = found !== null ? "preview" : "edit";
      });
    } catch (error) {
      if (disposed) return;
      setState((draft) => {
        draft.status = "error";
        draft.error = error;
      });
    }
  }

  async function checkDisk(): Promise<void> {
    if (state.status !== "ready" || state.saving) return;
    const entry = await port.stat({ scope: props.scope, path: props.path }, props.serverId).catch(() => undefined);
    if (disposed || entry === undefined || state.saving) return;
    if (entry === null) {
      setState((draft) => {
        draft.notice = "deleted";
      });
      return;
    }
    const known = state.version;
    if (known && known.modifiedAt === entry.modifiedAt && known.size === entry.size) return;
    if (dirty())
      setState((draft) => {
        draft.notice = "changed";
      });
    else await load(false);
  }

  async function save(overwrite: boolean): Promise<void> {
    const file = state.file;
    const text = file?.text;
    if (!file || !text || text.readOnly || state.saving) return;
    setState((draft) => {
      draft.saving = true;
    });
    try {
      const result = await port.write(
        {
          scope: props.scope,
          path: props.path,
          content: state.draft,
          encoding: text.encoding,
          bom: text.bom,
          lineEnding: text.lineEnding,
          expected: overwrite ? null : state.version,
        },
        props.serverId,
      );
      if (disposed) return;
      if (result.outcome === "saved") {
        setState((draft) => {
          draft.saved = draft.draft;
          draft.version = { modifiedAt: result.modifiedAt, size: result.size };
          draft.notice = null;
          draft.saving = false;
        });
        session.refreshGit();
      } else {
        setState((draft) => {
          draft.notice = result.exists ? "changed" : "deleted";
          draft.saving = false;
        });
      }
    } catch (error) {
      if (disposed) return;
      setState((draft) => {
        draft.saving = false;
      });
      actionToast.error(errorMessage(error, t("explorer.file.saveFailed")));
    }
  }

  onSettled(() => {
    session.start();
    void loadExplorerIcons();
    void load(true);
  });

  const stopChanges = session.onChange((change) => {
    const parent = session.parentOf(props.path);
    if (
      change.overflow ||
      change.roots ||
      change.files.includes(props.path) ||
      (parent !== null && change.directories.includes(parent))
    )
      void checkDisk();
  });
  onCleanup(stopChanges);

  createEffect(
    () => (session.state.status === "ready" ? session.parentOf(props.path) : null),
    (directory) => {
      if (directory === null) return;
      return session.keepWatched(directory);
    },
  );

  function toggleWrap(): void {
    const next = !state.wrap;
    setState((draft) => {
      draft.wrap = next;
    });
    saveWrap(next);
  }

  const status = () => {
    const text = state.file?.text;
    const file = state.file;
    if (!file) return "";
    const parts: string[] = [];
    if (text) {
      parts.push(LANGUAGE_LABELS[text.encoding] ?? text.encoding);
      parts.push(text.lineEnding === "crlf" ? "CRLF" : "LF");
    }
    parts.push(format.fileSize(file.size));
    return parts.join("  ·  ");
  };

  const body = (): JSX.Element => (
    <Switch>
      <Match when={state.file?.text != null && (state.mode === "edit" || !previewable())}>
        <CodeEditor
          name={props.name}
          value={state.draft}
          readOnly={!editable()}
          wrap={state.wrap}
          onChange={(value) =>
            setState((draft) => {
              draft.draft = value;
            })
          }
          onSave={() => void save(false)}
        />
      </Match>
      <Match when={kind() === "markdown"}>
        <ExplorerMarkdownPreview body={state.draft} onOpenLink={props.onOpenLink} />
      </Match>
      <Match when={kind() === "json"}>
        <ExplorerJsonPreview text={state.draft} />
      </Match>
      <Match when={kind() === "table"}>
        <ExplorerTablePreview text={state.draft} name={props.name} />
      </Match>
      <Match when={kind() === "svg" || kind() === "image"}>
        <ExplorerImagePreview url={state.file?.url ?? ""} name={props.name} />
      </Match>
      <Match when={kind() === "pdf"}>
        <ExplorerPdfPreview url={state.file?.url ?? ""} name={props.name} />
      </Match>
      <Match when={kind() === "audio" || kind() === "video"}>
        <ExplorerMediaPreview
          kind={kind() === "audio" ? "audio" : "video"}
          url={state.file?.url ?? ""}
          name={props.name}
        />
      </Match>
      <Match when={true}>
        <div class="explorer-file-binary">
          <img class="explorer-file-binary-icon" src={explorerIconUrl({ name: props.name, directory: false })} alt="" />
          <p class="explorer-file-binary-name">{props.name}</p>
          <p class="explorer-file-binary-note">
            {t("explorer.file.binary", { size: format.fileSize(state.file?.size ?? 0) })}
          </p>
          <Show when={props.canReveal !== false}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                void port
                  .reveal({ scope: props.scope, path: props.path }, props.serverId)
                  .catch((error: unknown) => actionToast.error(errorMessage(error, t("explorer.tree.actionFailed"))))
              }
            >
              <FolderOpen aria-hidden="true" />
              {t("explorer.tree.reveal")}
            </Button>
          </Show>
        </div>
      </Match>
    </Switch>
  );

  return (
    <section class="explorer-file" aria-label={props.name}>
      <header class="explorer-file-header">
        {props.leading}
        <img class="explorer-file-icon" src={explorerIconUrl({ name: props.name, directory: false })} alt="" />
        <span class="explorer-file-name" title={props.path}>
          {props.name}
        </span>
        <Show when={dirty()}>
          <span
            class="explorer-file-dirty"
            role="img"
            aria-label={t("explorer.file.unsaved")}
            title={t("explorer.file.unsaved")}
          />
        </Show>
        <span class="explorer-file-spacer" />
        <Show when={previewable()}>
          <SlidingTabs.Root
            value={state.mode}
            onChange={(value) =>
              setState((draft) => {
                draft.mode = value === "edit" ? "edit" : "preview";
              })
            }
          >
            <SlidingTabs.List aria-label={t("explorer.file.viewLabel")}>
              <SlidingTabs.Trigger value="preview">{t("explorer.file.preview")}</SlidingTabs.Trigger>
              <SlidingTabs.Trigger value="edit">{t("explorer.file.source")}</SlidingTabs.Trigger>
            </SlidingTabs.List>
          </SlidingTabs.Root>
        </Show>
        <Show when={state.file?.text != null && (state.mode === "edit" || !previewable())}>
          <IconButton
            variant="ghost"
            size="icon-xs"
            label={t("explorer.file.wrap")}
            aria-pressed={state.wrap ? "true" : "false"}
            onClick={toggleWrap}
          >
            <WrapText aria-hidden="true" />
          </IconButton>
        </Show>
        <Show when={editable()}>
          <IconButton
            variant="ghost"
            size="icon-xs"
            label={t("explorer.file.save")}
            disabled={!dirty() || state.saving}
            onClick={() => void save(false)}
          >
            <Save aria-hidden="true" />
          </IconButton>
        </Show>
        {props.actions}
      </header>
      <Show when={state.notice}>
        {(notice) => (
          <Alert tone="warning" class="explorer-file-notice">
            <AlertIcon>
              <TriangleAlert />
            </AlertIcon>
            <AlertContent>
              <AlertDescription>
                {notice() === "deleted" ? t("explorer.file.deletedOnDisk") : t("explorer.file.changedOnDisk")}
              </AlertDescription>
            </AlertContent>
            <AlertActions>
              <Show when={notice() === "changed"}>
                <Button variant="secondary" size="xs" onClick={() => void load(false)}>
                  <RefreshCw aria-hidden="true" />
                  {t("explorer.file.reload")}
                </Button>
              </Show>
              <Show when={editable()}>
                <Button variant="secondary" size="xs" onClick={() => void save(true)}>
                  {notice() === "deleted" ? t("explorer.file.recreate") : t("explorer.file.overwrite")}
                </Button>
              </Show>
            </AlertActions>
          </Alert>
        )}
      </Show>
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
              <p>{errorMessage(state.error, t("explorer.file.loadFailed"))}</p>
              <Button variant="secondary" size="sm" onClick={() => void load(true)}>
                {t("common.retry")}
              </Button>
            </div>
          </Match>
          <Match when={true}>{body()}</Match>
        </Switch>
      </div>
      <footer class="explorer-file-status">
        <span>{status()}</span>
        <Show when={state.file?.text?.readOnly}>
          <span>{state.file?.text?.truncated ? t("explorer.file.truncated") : t("explorer.file.readOnly")}</span>
        </Show>
        <Show when={state.file?.text?.mixedLineEndings}>
          <span>{t("explorer.file.mixedLineEndings")}</span>
        </Show>
      </footer>
    </section>
  );
}
