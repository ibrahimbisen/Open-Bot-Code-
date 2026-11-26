import type { ExplorerScope } from "@codebot/contracts/ipc";
import { ArrowLeft, ConfirmDialog, IconButton, SlidingTabs, X } from "@codebot/ui";
import { useText } from "@codebot/ui/text";
import type { JSX } from "@solidjs/web";
import { createMemo, createSignal, Match, Show, Switch } from "solid-js";
import { ChatChangesPanel } from "./ChatChangesPanel";
import { DiffViewer } from "./DiffViewer";
import { type ExplorerFileTarget, ExplorerTree } from "./ExplorerTree";
import type { ExplorerPort } from "./explorer-port";
import type { ExplorerDiffTarget } from "./explorer-types";
import { FilePanel } from "./FilePanel";
import { GitPanel } from "./GitPanel";

type ExplorerView = "files" | "changes" | "git";

type ExplorerContent = { type: "file"; file: ExplorerFileTarget } | { type: "diff"; target: ExplorerDiffTarget };

export interface ExplorerPaneProps {
  serverId: string;
  scope: ExplorerScope;
  port?: ExplorerPort | undefined;
  canReveal?: boolean | undefined;
  chatSince?: number | null | undefined;
  resizer?: JSX.Element;
  onClose?: (() => void) | undefined;
  onOpenLink: (url: string) => void;
}

function isView(value: string): value is ExplorerView {
  return value === "files" || value === "changes" || value === "git";
}

export function ExplorerPane(props: ExplorerPaneProps): JSX.Element {
  const { t } = useText();
  const [view, setView] = createSignal<ExplorerView>("files");
  const [content, setContent] = createSignal<ExplorerContent | null>(null);
  const [dirty, setDirty] = createSignal(false);
  const [pending, setPending] = createSignal<{ next: ExplorerContent | null } | null>(null);

  function request(next: ExplorerContent | null): void {
    if (dirty()) setPending({ next });
    else {
      setDirty(false);
      setContent(next);
    }
  }

  const activePath = createMemo(() => {
    const current = content();
    return current?.type === "file" ? current.file.path : null;
  });

  const back = (
    <IconButton variant="ghost" size="icon-xs" label={t("explorer.pane.backToList")} onClick={() => request(null)}>
      <ArrowLeft aria-hidden="true" />
    </IconButton>
  );

  const openDiff = (target: ExplorerDiffTarget) => request({ type: "diff", target });
  const openFile = (file: ExplorerFileTarget) => request({ type: "file", file });

  return (
    <aside id="explorer-panel" class="browser-panel explorer-pane" aria-label={t("explorer.pane.title")}>
      {props.resizer}
      <Show when={content() === null}>
        <header class="explorer-pane-header">
          <SlidingTabs.Root value={view()} onChange={(value) => isView(value) && setView(value)}>
            <SlidingTabs.List aria-label={t("explorer.pane.views")}>
              <SlidingTabs.Trigger value="files">{t("explorer.pane.files")}</SlidingTabs.Trigger>
              <SlidingTabs.Trigger value="changes">{t("explorer.pane.changes")}</SlidingTabs.Trigger>
              <SlidingTabs.Trigger value="git">{t("explorer.pane.git")}</SlidingTabs.Trigger>
            </SlidingTabs.List>
          </SlidingTabs.Root>
          <span class="explorer-file-spacer" />
          <Show when={props.onClose}>
            {(close) => (
              <IconButton variant="ghost" size="icon-xs" label={t("explorer.pane.close")} onClick={() => close()()}>
                <X aria-hidden="true" />
              </IconButton>
            )}
          </Show>
        </header>
      </Show>
      <div class="explorer-pane-body">
        <div class="explorer-pane-view" hidden={content() !== null || view() !== "files"}>
          <ExplorerTree
            serverId={props.serverId}
            scope={props.scope}
            port={props.port}
            activePath={activePath()}
            canReveal={props.canReveal}
            onOpenFile={openFile}
          />
        </div>
        <div class="explorer-pane-view" hidden={content() !== null || view() !== "changes"}>
          <ChatChangesPanel
            serverId={props.serverId}
            scope={props.scope}
            port={props.port}
            since={props.chatSince ?? null}
            onOpenDiff={openDiff}
          />
        </div>
        <div class="explorer-pane-view" hidden={content() !== null || view() !== "git"}>
          <GitPanel
            serverId={props.serverId}
            scope={props.scope}
            port={props.port}
            onOpenDiff={openDiff}
            onOpenFile={openFile}
          />
        </div>
        <Show when={content()} keyed>
          {(current) => (
            <div class="explorer-pane-view explorer-pane-content">
              <Switch>
                <Match when={current.type === "file" && current}>
                  {(file) => (
                    <FilePanel
                      serverId={props.serverId}
                      scope={props.scope}
                      port={props.port}
                      path={file().file.path}
                      name={file().file.name}
                      canReveal={props.canReveal}
                      onOpenLink={props.onOpenLink}
                      onDirtyChange={setDirty}
                      leading={back}
                    />
                  )}
                </Match>
                <Match when={current.type === "diff" && current}>
                  {(diff) => (
                    <DiffViewer
                      serverId={props.serverId}
                      scope={props.scope}
                      port={props.port}
                      target={diff().target}
                      onOpenFile={openFile}
                      leading={back}
                    />
                  )}
                </Match>
              </Switch>
            </div>
          )}
        </Show>
      </div>
      <ConfirmDialog
        open={pending() !== null}
        title={t("explorer.file.discardTitle")}
        description={t("explorer.file.discardDescription")}
        confirmLabel={t("explorer.file.discard")}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          const next = pending();
          setPending(null);
          if (!next) return;
          setDirty(false);
          setContent(next.next);
        }}
      />
    </aside>
  );
}
