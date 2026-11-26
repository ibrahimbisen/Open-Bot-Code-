import { type ExplorerEntryKind, type ExplorerScope, explorerScopeKey } from "@codebot/contracts/ipc";
import {
  Button,
  ChevronRight,
  ChevronsDownUp,
  ConfirmDialog,
  ContextMenu,
  Copy,
  File,
  FilePlus,
  FolderOpen,
  FolderPlus,
  IconButton,
  Input,
  Link2,
  PanelRight,
  Pencil,
  RefreshCw,
  Spinner,
  Trash2,
} from "@codebot/ui";
import { createListVirtualizer } from "@codebot/ui/components/createListVirtualizer";
import { documentColorScheme } from "@codebot/ui/document-color-scheme";
import { useText } from "@codebot/ui/text";
import type { JSX } from "@solidjs/web";
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  Match,
  onCleanup,
  onSettled,
  Show,
  Switch,
  untrack,
} from "solid-js";
import { actionToast } from "../../action-toast";
import { explorerGitLetter, explorerGitMark, explorerGitMarks } from "./explorer-git-marks";
import { explorerIconUrl, loadExplorerIcons } from "./explorer-icons";
import type { ExplorerPort } from "./explorer-port";
import { acquireExplorerSession } from "./explorer-session";
import { explorerGitChangeText } from "./explorer-text";
import {
  type ExplorerEdit,
  type ExplorerEditRow,
  type ExplorerEntryRow,
  type ExplorerRow,
  type ExplorerStatusRow,
  explorerRows,
  findRowByPrefix,
  parentRowIndex,
} from "./explorer-tree-model";

const ROW_HEIGHT = 24;
const ROW_INDENT = 12;
const ROW_INSET = 6;
const TYPE_RESET_MS = 700;
const OVERSCAN = 12;

export interface ExplorerFileTarget {
  path: string;
  name: string;
}

export interface ExplorerTreeProps {
  serverId: string;
  scope: ExplorerScope;
  port?: ExplorerPort | undefined;
  activePath?: string | null | undefined;
  canReveal?: boolean | undefined;
  onOpenFile: (file: ExplorerFileTarget) => void;
  onOpenToSide?: ((file: ExplorerFileTarget) => void) | undefined;
}

export function ExplorerTree(props: ExplorerTreeProps): JSX.Element {
  const key = createMemo(() => `${props.serverId}\n${explorerScopeKey(props.scope)}`);
  return (
    <Show when={key()} keyed>
      {(_scopeKey) => <ExplorerTreeView {...props} />}
    </Show>
  );
}

function rowInset(depth: number): string {
  return `${ROW_INSET + depth * ROW_INDENT}px`;
}

function entryRowOf(row: ExplorerRow | undefined): ExplorerEntryRow | undefined {
  return row?.type === "entry" ? row : undefined;
}

function editRowOf(row: ExplorerRow | undefined): ExplorerEditRow | undefined {
  return row?.type === "edit" ? row : undefined;
}

function statusRowOf(row: ExplorerRow | undefined): ExplorerStatusRow | undefined {
  return row?.type === "status" ? row : undefined;
}

function ExplorerTreeView(props: ExplorerTreeProps): JSX.Element {
  const { t, errorMessage } = useText();
  const acquired = untrack(() => acquireExplorerSession(props.serverId, props.scope, props.port));
  const session = acquired.session;
  onCleanup(acquired.release);
  onSettled(() => {
    session.start();
    void loadExplorerIcons();
  });

  const [edit, setEdit] = createSignal<ExplorerEdit | null>(null);
  const [focusedKey, setFocusedKey] = createSignal<string | null>(null);
  const [menuKey, setMenuKey] = createSignal<string | null>(null);
  const [deleting, setDeleting] = createSignal<ExplorerEntryRow | null>(null);
  let scroller: HTMLElement | undefined;
  let typed = "";
  let typedAt = 0;
  let committing = false;

  const rows = createMemo(() => explorerRows(session.state, edit()));
  const indexByKey = createMemo(() => new Map(rows().map((row, index) => [row.key, index])));
  const focusedIndex = createMemo(() => {
    const key = focusedKey();
    return key === null ? -1 : (indexByKey().get(key) ?? -1);
  });
  const marks = createMemo(() =>
    explorerGitMarks(
      session.state.roots.map((root) => session.state.git[root.path]),
      session.state.separator,
    ),
  );
  const light = () => documentColorScheme() === "light";
  const ids = new Map<string, string>();
  const rowId = (key: string): string => {
    let id = ids.get(key);
    if (!id) {
      id = `explorer-row-${ids.size + 1}`;
      ids.set(key, id);
    }
    return id;
  };

  const virtualizer = createListVirtualizer({
    rows: createMemo(() => rows().map((row) => ({ key: row.key, size: ROW_HEIGHT }))),
    getScrollElement: () => scroller,
    scrollMargin: () => 0,
    pinnedIndex: focusedIndex,
    overscan: OVERSCAN,
  });

  const rowAt = (key: string | null): ExplorerRow | undefined =>
    key === null ? undefined : rows()[indexByKey().get(key) ?? -1];
  const entryAt = (key: string | null): ExplorerEntryRow | null => entryRowOf(rowAt(key)) ?? null;
  const menuRow = () => entryAt(menuKey());
  const fail = (error: unknown) => actionToast.error(errorMessage(error, t("explorer.tree.actionFailed")));
  const focusTree = () => scroller?.focus({ preventScroll: true });

  function focusIndex(index: number): void {
    const list = rows();
    const next = Math.min(list.length - 1, Math.max(0, index));
    const row = list[next];
    if (!row) return;
    setFocusedKey(row.key);
    queueMicrotask(() => virtualizer.reveal(next, next));
  }

  function openFile(row: ExplorerEntryRow, side = false): void {
    const target = { path: row.path, name: row.name };
    if (side && props.onOpenToSide) props.onOpenToSide(target);
    else props.onOpenFile(target);
  }

  function activate(row: ExplorerRow): void {
    if (row.type === "entry") {
      if (row.directory) session.toggle(row.path);
      else openFile(row);
    } else if (row.type === "status" && row.status === "more") void session.loadMore(row.path).catch(fail);
    else if (row.type === "status" && row.status === "error") void session.expand(row.path);
  }

  function folderFor(row: ExplorerEntryRow | null): string | null {
    if (row === null) return session.state.roots[0]?.path ?? null;
    return row.directory ? row.path : session.parentOf(row.path);
  }

  function startCreate(kind: ExplorerEntryKind, row: ExplorerEntryRow | null): void {
    const parent = folderFor(row);
    if (parent === null) return;
    void session.expand(parent).then(() => setEdit({ mode: "create", kind, parent }));
  }

  function startRename(row: ExplorerEntryRow): void {
    const parent = session.parentOf(row.path);
    if (row.root || parent === null) return;
    setEdit({ mode: "rename", kind: row.directory ? "directory" : "file", parent, path: row.path, name: row.name });
  }

  async function commitEdit(value: string): Promise<void> {
    const current = edit();
    if (!current || committing) return;
    const name = value.trim();
    if (name === "" || (current.mode === "rename" && name === current.name)) {
      setEdit(null);
      return;
    }
    committing = true;
    try {
      const entry =
        current.mode === "create"
          ? await session.createEntry(current.parent, name, current.kind)
          : await session.renameEntry(current.path, name);
      setEdit(null);
      setFocusedKey(entry.path);
      if (current.mode === "create" && entry.kind === "file") props.onOpenFile({ path: entry.path, name: entry.name });
    } catch (error) {
      setEdit(null);
      fail(error);
    } finally {
      committing = false;
      focusTree();
    }
  }

  async function copyText(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      actionToast.success(t("explorer.tree.copied"));
    } catch (error) {
      fail(error);
    }
  }

  function collapseAll(): void {
    for (const path of Object.keys(session.state.expanded)) {
      if (!session.state.roots.some((root) => root.path === path)) session.collapse(path);
    }
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.target instanceof HTMLInputElement || event.defaultPrevented) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const list = rows();
    const index = focusedIndex();
    const row = list[index];
    const handled = () => {
      event.preventDefault();
      event.stopPropagation();
    };
    switch (event.key) {
      case "ArrowDown":
        handled();
        focusIndex(index + 1);
        return;
      case "ArrowUp":
        handled();
        focusIndex(index <= 0 ? 0 : index - 1);
        return;
      case "Home":
        handled();
        focusIndex(0);
        return;
      case "End":
        handled();
        focusIndex(list.length - 1);
        return;
      case "PageDown":
      case "PageUp": {
        handled();
        const page = Math.max(1, Math.floor((scroller?.clientHeight ?? ROW_HEIGHT) / ROW_HEIGHT) - 1);
        focusIndex(Math.max(0, index) + (event.key === "PageDown" ? page : -page));
        return;
      }
      case "ArrowRight":
        if (row?.type !== "entry" || !row.directory) return;
        handled();
        if (row.expanded) focusIndex(index + 1);
        else void session.expand(row.path);
        return;
      case "ArrowLeft":
        if (!row) return;
        handled();
        if (row.type === "entry" && row.directory && row.expanded) session.collapse(row.path);
        else {
          const parent = parentRowIndex(list, index);
          if (parent !== -1) focusIndex(parent);
        }
        return;
      case "Enter":
      case " ":
        if (!row) return;
        handled();
        activate(row);
        return;
      case "F2":
        if (row?.type !== "entry") return;
        handled();
        startRename(row);
        return;
      case "Delete":
        if (row?.type !== "entry" || row.root) return;
        handled();
        setDeleting(row);
        return;
      default:
        break;
    }
    if (event.key.length !== 1) return;
    const now = Date.now();
    typed = now - typedAt > TYPE_RESET_MS ? event.key : `${typed}${event.key}`;
    typedAt = now;
    const found = findRowByPrefix(list, typed.length === 1 ? index + 1 : Math.max(0, index), typed);
    if (found === -1) return;
    handled();
    focusIndex(found);
  }

  function pickMenuRow(event: MouseEvent): void {
    const element = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-row-key]") : null;
    const key = element?.dataset.rowKey ?? null;
    const row = entryAt(key);
    setMenuKey(row ? row.key : null);
    if (row) setFocusedKey(row.key);
  }

  createEffect(
    () => props.activePath ?? null,
    (path) => {
      if (path === null) return;
      void session.reveal(path).then(() => {
        const index = indexByKey().get(path);
        if (index === undefined) return;
        setFocusedKey(path);
        queueMicrotask(() => virtualizer.reveal(index, index));
      });
    },
  );

  function EntryRowView(view: { row: ExplorerEntryRow; top: number }): JSX.Element {
    const mark = createMemo(() => explorerGitMark(marks(), view.row.path));
    return (
      <div
        id={rowId(view.row.key)}
        class={[
          "explorer-row",
          {
            "explorer-row-root": view.row.root,
            "explorer-row-active": props.activePath === view.row.path,
            "explorer-row-focused": focusedKey() === view.row.key,
            "explorer-row-ignored": mark().ignored,
          },
        ]}
        {...{
          role: "treeitem" as const,
          tabindex: focusedKey() === view.row.key ? 0 : -1,
          "aria-level": view.row.depth + 1,
          "aria-expanded": view.row.directory ? (view.row.expanded ? "true" : "false") : undefined,
          "aria-selected": props.activePath === view.row.path ? "true" : "false",
          onKeyDown,
          onClick: () => {
            setFocusedKey(view.row.key);
            activate(view.row);
          },
          onAuxClick: (event: MouseEvent) => {
            if (event.button === 1 && !view.row.directory) openFile(view.row, true);
          },
        }}
        data-row-key={view.row.key}
        data-git={mark().change ?? undefined}
        title={view.row.path}
        style={{ top: `${view.top}px`, "padding-inline-start": rowInset(view.row.depth) }}
      >
        <span class={["explorer-row-twist", { "explorer-row-twist-open": view.row.expanded }]} aria-hidden="true">
          <Show when={view.row.directory}>
            <ChevronRight />
          </Show>
        </span>
        <img
          class="explorer-row-icon"
          src={explorerIconUrl({
            name: view.row.name,
            directory: view.row.directory,
            expanded: view.row.expanded,
            root: view.row.root,
            light: light(),
          })}
          alt=""
          draggable={false}
        />
        <span class="explorer-row-name">{view.row.name}</span>
        <Show when={view.row.hint}>
          <span class="explorer-row-hint">{view.row.hint}</span>
        </Show>
        <Show when={view.row.symlink}>
          <Link2 class="explorer-row-link" aria-label={t("explorer.tree.link")} />
        </Show>
        <Show when={mark().change} keyed>
          {(change) => (
            <span class="explorer-row-git" title={t(explorerGitChangeText(change))}>
              {explorerGitLetter(change)}
            </span>
          )}
        </Show>
        <Show when={mark().change === null && mark().contains}>
          <span class="explorer-row-dot" title={t("explorer.tree.containsChanges")} />
        </Show>
      </div>
    );
  }

  function StatusRowView(view: { row: ExplorerStatusRow; top: number }): JSX.Element {
    return (
      <div
        id={rowId(view.row.key)}
        class={["explorer-row", "explorer-row-status", { "explorer-row-focused": focusedKey() === view.row.key }]}
        {...{
          role: "treeitem" as const,
          tabindex: focusedKey() === view.row.key ? 0 : -1,
          "aria-level": view.row.depth + 1,
          "aria-selected": "false",
        }}
        data-row-key={view.row.key}
        style={{ top: `${view.top}px`, "padding-inline-start": rowInset(view.row.depth + 1) }}
      >
        <Switch>
          <Match when={view.row.status === "loading"}>
            <Spinner size="sm" />
            <span class="explorer-row-note">{t("common.loading")}</span>
          </Match>
          <Match when={view.row.status === "empty"}>
            <span class="explorer-row-note">{t("explorer.tree.emptyFolder")}</span>
          </Match>
          <Match when={view.row.status === "error"}>
            <span class="explorer-row-note explorer-row-error">
              {errorMessage(view.row.error, t("explorer.tree.folderFailed"))}
            </span>
            <Button variant="link" size="xs" onClick={() => void session.expand(view.row.path)}>
              {t("common.retry")}
            </Button>
          </Match>
          <Match when={view.row.status === "more"}>
            <Button variant="link" size="xs" onClick={() => void session.loadMore(view.row.path).catch(fail)}>
              {t("explorer.tree.showMore", { count: view.row.remaining })}
            </Button>
          </Match>
        </Switch>
      </div>
    );
  }

  function EditRowView(view: { row: ExplorerEditRow; top: number }): JSX.Element {
    const started = untrack(() => view.row.edit);
    const initial = started.mode === "rename" ? started.name : "";
    const directory = started.kind === "directory";
    const [name, setName] = createSignal(initial);
    const label = () => {
      if (started.mode === "rename") return t("explorer.tree.renameLabel");
      return directory ? t("explorer.tree.newFolderLabel") : t("explorer.tree.newFileLabel");
    };
    return (
      <div
        class="explorer-row explorer-row-edit"
        style={{ top: `${view.top}px`, "padding-inline-start": rowInset(view.row.depth) }}
      >
        <span class="explorer-row-twist" aria-hidden="true" />
        <img
          class="explorer-row-icon"
          src={explorerIconUrl({ name: name(), directory, light: light() })}
          alt=""
          draggable={false}
        />
        <Input
          class="explorer-row-input"
          size="sm"
          defaultValue={initial}
          aria-label={label()}
          spellcheck={false}
          autocomplete="off"
          ref={(element) => {
            requestAnimationFrame(() => {
              element.focus();
              const dot = initial.lastIndexOf(".");
              element.setSelectionRange(0, !directory && dot > 0 ? dot : initial.length);
            });
          }}
          onInput={(event) => setName(event.currentTarget.value)}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === "Enter") {
              event.preventDefault();
              void commitEdit(event.currentTarget.value);
            } else if (event.key === "Escape") {
              event.preventDefault();
              setEdit(null);
              focusTree();
            }
          }}
          onBlur={(event) => void commitEdit(event.currentTarget.value)}
        />
      </div>
    );
  }

  return (
    <section class="explorer-tree" aria-label={t("explorer.tree.label")}>
      <header class="explorer-tree-toolbar">
        <span class="explorer-tree-title">{t("explorer.tree.title")}</span>
        <IconButton
          variant="ghost"
          size="icon-xs"
          label={t("explorer.tree.newFile")}
          onClick={() => startCreate("file", entryAt(focusedKey()))}
        >
          <FilePlus aria-hidden="true" />
        </IconButton>
        <IconButton
          variant="ghost"
          size="icon-xs"
          label={t("explorer.tree.newFolder")}
          onClick={() => startCreate("directory", entryAt(focusedKey()))}
        >
          <FolderPlus aria-hidden="true" />
        </IconButton>
        <IconButton
          variant="ghost"
          size="icon-xs"
          label={t("explorer.tree.refresh")}
          onClick={() => void session.reload()}
        >
          <RefreshCw aria-hidden="true" />
        </IconButton>
        <IconButton variant="ghost" size="icon-xs" label={t("explorer.tree.collapseAll")} onClick={collapseAll}>
          <ChevronsDownUp aria-hidden="true" />
        </IconButton>
      </header>
      <Show when={session.state.status === "error"}>
        <div class="explorer-tree-state">
          <p>{errorMessage(session.state.error, t("explorer.tree.loadFailed"))}</p>
          <Button variant="secondary" size="sm" onClick={() => void session.reload()}>
            {t("common.retry")}
          </Button>
        </div>
      </Show>
      <Show when={session.state.status === "loading" && session.state.roots.length === 0}>
        <div class="explorer-tree-state">
          <Spinner />
        </div>
      </Show>
      <Show when={session.state.status === "ready" && session.state.roots.length === 0}>
        <div class="explorer-tree-state">
          <p>{t("explorer.tree.noFolders")}</p>
        </div>
      </Show>
      <ContextMenu.Root>
        <ContextMenu.Trigger
          as="div"
          ref={(element: HTMLElement) => {
            scroller = element;
          }}
          class="explorer-tree-scroll"
          role="tree"
          tabindex="0"
          aria-label={t("explorer.tree.label")}
          aria-activedescendant={focusedIndex() === -1 ? undefined : rowId(focusedKey() ?? "")}
          hidden={session.state.roots.length === 0}
          onKeyDown={onKeyDown}
          onContextMenu={pickMenuRow}
        >
          <div class="explorer-tree-canvas" style={{ height: `${virtualizer.totalSize()}px` }}>
            <For each={virtualizer.items()} keyed={(item) => item.key}>
              {(item) => {
                const row = createMemo(() => rowAt(String(item().key)));
                return (
                  <Switch>
                    <Match when={entryRowOf(row())}>
                      {(entry) => <EntryRowView row={entry()} top={item().start} />}
                    </Match>
                    <Match when={editRowOf(row())}>
                      {(editing) => <EditRowView row={editing()} top={item().start} />}
                    </Match>
                    <Match when={statusRowOf(row())}>
                      {(status) => <StatusRowView row={status()} top={item().start} />}
                    </Match>
                  </Switch>
                );
              }}
            </For>
          </div>
        </ContextMenu.Trigger>
        <ContextMenu.Portal>
          <ContextMenu.Content aria-label={t("explorer.tree.actions")}>
            <Show when={menuRow()}>
              {(row) => (
                <Show when={!row().directory}>
                  <ContextMenu.Item onSelect={() => openFile(row())}>
                    <File aria-hidden="true" />
                    {t("explorer.tree.open")}
                  </ContextMenu.Item>
                  <Show when={props.onOpenToSide}>
                    <ContextMenu.Item onSelect={() => openFile(row(), true)}>
                      <PanelRight aria-hidden="true" />
                      {t("explorer.tree.openToSide")}
                    </ContextMenu.Item>
                  </Show>
                  <ContextMenu.Separator />
                </Show>
              )}
            </Show>
            <ContextMenu.Item onSelect={() => startCreate("file", menuRow())}>
              <FilePlus aria-hidden="true" />
              {t("explorer.tree.newFile")}
            </ContextMenu.Item>
            <ContextMenu.Item onSelect={() => startCreate("directory", menuRow())}>
              <FolderPlus aria-hidden="true" />
              {t("explorer.tree.newFolder")}
            </ContextMenu.Item>
            <ContextMenu.Separator />
            <Show
              when={menuRow()}
              fallback={
                <ContextMenu.Item onSelect={() => void session.reload()}>
                  <RefreshCw aria-hidden="true" />
                  {t("explorer.tree.refresh")}
                </ContextMenu.Item>
              }
            >
              {(row) => (
                <>
                  <Show when={props.canReveal !== false}>
                    <ContextMenu.Item
                      onSelect={() =>
                        void session.port
                          .reveal({ scope: session.scope, path: row().path }, session.serverId)
                          .catch(fail)
                      }
                    >
                      <FolderOpen aria-hidden="true" />
                      {t("explorer.tree.reveal")}
                    </ContextMenu.Item>
                  </Show>
                  <ContextMenu.Item onSelect={() => void copyText(row().path)}>
                    <Copy aria-hidden="true" />
                    {t("explorer.tree.copyPath")}
                  </ContextMenu.Item>
                  <Show when={!row().root}>
                    <ContextMenu.Item onSelect={() => void copyText(session.relativePath(row().path))}>
                      <Copy aria-hidden="true" />
                      {t("explorer.tree.copyRelativePath")}
                    </ContextMenu.Item>
                    <ContextMenu.Separator />
                    <ContextMenu.Item onSelect={() => startRename(row())}>
                      <Pencil aria-hidden="true" />
                      {t("explorer.tree.rename")}
                    </ContextMenu.Item>
                    <ContextMenu.Item class="ui-action-menu-danger" onSelect={() => setDeleting(row())}>
                      <Trash2 aria-hidden="true" />
                      {t("explorer.tree.delete")}
                    </ContextMenu.Item>
                  </Show>
                </>
              )}
            </Show>
          </ContextMenu.Content>
        </ContextMenu.Portal>
      </ContextMenu.Root>
      <ConfirmDialog
        open={deleting() !== null}
        title={t("explorer.tree.deleteTitle", { name: deleting()?.name ?? "" })}
        description={
          deleting()?.directory ? t("explorer.tree.deleteFolderDescription") : t("explorer.tree.deleteFileDescription")
        }
        confirmLabel={t("explorer.tree.deleteConfirm")}
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          const row = deleting();
          if (!row) return;
          try {
            await session.trashEntry(row.path);
          } catch (error) {
            fail(error);
          }
          setDeleting(null);
        }}
      />
    </section>
  );
}
