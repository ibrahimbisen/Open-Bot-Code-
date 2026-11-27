import type { ProjectChat, ProjectChatMatch, ProjectSummary } from "@codebot/contracts/ipc";
import {
  Archive,
  ArchiveRestore,
  Button,
  ConfirmDialog,
  DropdownMenu,
  Ellipsis,
  IconButton,
  Input,
  MessageCirclePlus,
  Pencil,
  Pin,
  PinOff,
  Search,
  Settings,
  SlidingTabs,
  Spinner,
  SquareArrowOutUpRight,
  Trash2,
  X,
} from "@codebot/ui";
import { PanelResizer } from "@codebot/ui/components/PanelResizer";
import { useText } from "@codebot/ui/text";
import { createEffect, createMemo, createSignal, For, onSettled, Show } from "solid-js";
import { readPanelWidth, savePanelWidth } from "../../components/panel-width-storage";
import { AccessBadge, ProjectMark, StatusDot } from "./ProjectsLeftBar";
import { projectChatDateLabel, projectChatDateTitle } from "./project-chat-date";
import { projectSlots } from "./project-slots";
import { useProjects } from "./projects-context";

const COLUMN_WIDTH_KEY = "codebot:project-column-width";
const COLUMN_DEFAULT = 280;
const COLUMN_MIN = 200;
const COLUMN_MAX = 420;
const ROW_HEIGHT = 56;
const OVERSCAN = 6;
const SEARCH_DELAY_MS = 250;
type ToolKind = "files" | "git";
const TOOLS_HEIGHT_KEY = "codebot:project-tools-height";

export function ProjectColumn(props: { project: ProjectSummary }) {
  const { t } = useText();
  const projects = useProjects();
  const [width, setWidth] = createSignal(readPanelWidth(COLUMN_WIDTH_KEY, COLUMN_DEFAULT, COLUMN_MIN, COLUMN_MAX));
  const [query, setQuery] = createSignal("");
  const [showArchived, setShowArchived] = createSignal(false);
  const searching = () => query().trim().length > 0;
  const hasTools = () => projectSlots.projectFiles !== undefined || projectSlots.projectGit !== undefined;
  const [tool, setTool] = createSignal<ToolKind>("files");
  const [toolsHeight, setToolsHeight] = createSignal(readPanelWidth(TOOLS_HEIGHT_KEY, 240, 120, 600));
  const toolKinds = (): ToolKind[] => {
    const kinds: ToolKind[] = [];
    if (projectSlots.projectFiles) kinds.push("files");
    if (projectSlots.projectGit) kinds.push("git");
    return kinds;
  };
  const shownTool = () => (toolKinds().includes(tool()) ? tool() : toolKinds()[0]);

  createEffect(
    () => ({ id: props.project.id, archived: showArchived() }),
    ({ id, archived }) => {
      void projects.loadChats(id, { archived });
    },
  );

  return (
    <aside
      class="project-column"
      id="project-column"
      style={{ width: `${width()}px` }}
      aria-label={t("project.column.label", { name: props.project.name })}
    >
      <header class="project-column-header">
        <ProjectMark project={props.project} />
        <span class="project-column-name" title={props.project.mainFolder}>
          {props.project.name}
        </span>
        <AccessBadge level={props.project.accessLevel} />
        <IconButton
          label={t("project.column.settings")}
          size="icon-sm"
          variant="ghost"
          onClick={() => projects.setSettingsProjectId(props.project.id)}
        >
          <Settings />
        </IconButton>
      </header>
      <div class="project-column-actions">
        <Button variant="default" class="project-new-chat" onClick={() => projects.newChat(props.project.id)}>
          <MessageCirclePlus />
          {t("project.chat.new")}
        </Button>
      </div>
      <div class="project-column-search">
        <Search class="project-column-search-icon" aria-hidden="true" />
        <Input
          type="search"
          size="sm"
          aria-label={t("project.chat.search")}
          placeholder={t("project.chat.search")}
          value={query()}
          onValueChange={setQuery}
        />
        <Show when={searching()}>
          <IconButton
            label={t("project.chat.clearSearch")}
            size="icon-xs"
            variant="ghost"
            class="project-column-search-clear"
            onClick={() => setQuery("")}
          >
            <X />
          </IconButton>
        </Show>
      </div>
      <div class="project-column-history-head">
        <h3 class="project-section-label">{t(showArchived() ? "project.chat.archived" : "project.chat.history")}</h3>
        <IconButton
          label={t(showArchived() ? "project.chat.recent" : "project.chat.showArchived")}
          size="icon-sm"
          variant={showArchived() ? "secondary" : "ghost"}
          aria-pressed={showArchived() ? "true" : "false"}
          onClick={() => setShowArchived((open) => !open)}
        >
          <Archive />
        </IconButton>
      </div>
      <Show when={searching()} fallback={<ChatHistory project={props.project} archived={showArchived()} />}>
        <SearchResults project={props.project} query={query()} />
      </Show>
      <Show when={hasTools()}>
        <section class="project-tools" aria-label={t("project.tools.label")} style={{ height: `${toolsHeight()}px` }}>
          <PanelResizer
            class="project-tools-resizer"
            label={t("project.tools.resize")}
            controls="project-tools-body"
            direction="bottom"
            value={toolsHeight()}
            defaultValue={240}
            min={120}
            max={600}
            onResize={setToolsHeight}
            onResizeEnd={(value) => savePanelWidth(TOOLS_HEIGHT_KEY, value)}
          />
          <SlidingTabs.Root
            class="project-tools-tabs"
            value={shownTool()}
            onChange={(value) => {
              const next = toolKinds().find((kind) => kind === value);
              if (next) setTool(next);
            }}
          >
            <SlidingTabs.List aria-label={t("project.tools.label")}>
              <For each={toolKinds()}>
                {(kind) => (
                  <SlidingTabs.Trigger value={kind}>
                    {t(kind === "files" ? "project.tools.files" : "project.tools.git")}
                  </SlidingTabs.Trigger>
                )}
              </For>
            </SlidingTabs.List>
          </SlidingTabs.Root>
          <div class="project-tools-body" id="project-tools-body">
            <Show when={shownTool() === "files" ? projectSlots.projectFiles : projectSlots.projectGit} keyed>
              {(slot) =>
                slot({
                  get project() {
                    return props.project;
                  },
                })
              }
            </Show>
          </div>
        </section>
      </Show>
      <PanelResizer
        class="project-column-resizer"
        label={t("project.column.resize")}
        controls="project-column"
        direction="left"
        value={width()}
        defaultValue={COLUMN_DEFAULT}
        min={COLUMN_MIN}
        max={COLUMN_MAX}
        onResize={setWidth}
        onResizeEnd={(value) => savePanelWidth(COLUMN_WIDTH_KEY, value)}
      />
    </aside>
  );
}

function ChatHistory(props: { project: ProjectSummary; archived: boolean }) {
  const { t } = useText();
  const projects = useProjects();
  const list = () => projects.listOf(props.project.id, props.archived);
  const [scrollTop, setScrollTop] = createSignal(0);
  const [height, setHeight] = createSignal(400);
  let scroller: HTMLDivElement | undefined;

  onSettled(() => {
    if (!scroller) return;
    const observer = new ResizeObserver(() => setHeight(scroller?.clientHeight ?? 400));
    observer.observe(scroller);
    setHeight(scroller.clientHeight);
    return () => observer.disconnect();
  });

  const total = () => list().chats.length;
  const range = createMemo(() => {
    const first = Math.max(0, Math.floor(scrollTop() / ROW_HEIGHT) - OVERSCAN);
    const last = Math.min(total(), Math.ceil((scrollTop() + height()) / ROW_HEIGHT) + OVERSCAN);
    return { first, last };
  });
  const visible = () => list().chats.slice(range().first, range().last);

  createEffect(
    () => ({ last: range().last, total: total(), more: list().nextCursor !== null, loading: list().loading }),
    ({ last, total: count, more, loading }) => {
      if (more && !loading && last >= count - 2) {
        void projects.loadChats(props.project.id, { archived: props.archived, more: true });
      }
    },
  );

  return (
    <div class="project-history" ref={scroller} onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}>
      <Show
        when={total() > 0}
        fallback={
          <div class="project-history-empty">
            <Show
              when={!list().loaded || list().loading}
              fallback={
                <>
                  <strong>{t(props.archived ? "project.chat.emptyArchived" : "project.chat.empty")}</strong>
                  <Show when={!props.archived}>
                    <span>{t("project.chat.emptyHint")}</span>
                  </Show>
                </>
              }
            >
              <Spinner aria-label={t("project.chat.loading")} />
            </Show>
          </div>
        }
      >
        <ul
          class="project-history-spacer"
          aria-label={t("project.chat.history")}
          style={{ height: `${total() * ROW_HEIGHT}px` }}
        >
          <For each={visible()}>
            {(chat, index) => <ChatRow chat={chat} top={(range().first + index()) * ROW_HEIGHT} />}
          </For>
        </ul>
        <Show when={list().loading}>
          <div class="project-history-more">
            <Spinner aria-label={t("project.chat.loading")} />
          </div>
        </Show>
      </Show>
    </div>
  );
}

function SearchResults(props: { project: ProjectSummary; query: string }) {
  const { t } = useText();
  const projects = useProjects();
  const [matches, setMatches] = createSignal<ProjectChatMatch[]>([]);
  const [busy, setBusy] = createSignal(false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let request = 0;

  createEffect(
    () => ({ text: props.query.trim(), id: props.project.id }),
    ({ text, id }) => {
      clearTimeout(timer);
      if (!text) return;
      setBusy(true);
      timer = setTimeout(() => {
        const mine = ++request;
        void projects.port
          .searchChats({ query: text, projectId: id, limit: 50 })
          .then((page) => {
            if (mine === request) setMatches(page.matches);
          })
          .catch(() => {
            if (mine === request) setMatches([]);
          })
          .finally(() => {
            if (mine === request) setBusy(false);
          });
      }, SEARCH_DELAY_MS);
      return () => clearTimeout(timer);
    },
  );

  return (
    <div class="project-history project-search-results">
      <Show
        when={matches().length > 0}
        fallback={
          <div class="project-history-empty">
            <Show when={busy()} fallback={<strong>{t("project.chat.noResults")}</strong>}>
              <Spinner aria-label={t("project.chat.loading")} />
            </Show>
          </div>
        }
      >
        <ul class="project-search-list" aria-label={t("project.chat.search")}>
          <For each={matches()}>
            {(match) => (
              <li class="project-search-row">
                <Button
                  variant="ghost"
                  class="project-chat-row-main"
                  onClick={() =>
                    projects.openChat({
                      projectId: match.chat.projectId,
                      agentId: match.chat.agentId,
                      chatId: match.chat.taskId,
                      placement: "active",
                    })
                  }
                >
                  <span class="project-chat-title">{match.chat.title}</span>
                  <span class="project-chat-meta">{match.excerpt}</span>
                </Button>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </div>
  );
}

function ChatRow(props: { chat: ProjectChat; top: number }) {
  const { t, format } = useText();
  const projects = useProjects();
  const [editing, setEditing] = createSignal(false);
  const [title, setTitle] = createSignal("");
  const [deleting, setDeleting] = createSignal(false);
  const key = () => projects.chatKey(props.chat);
  const open = () => projects.openChatKeys().has(key());
  const shown = () => projects.shownChatKey() === key();
  const now = new Date();
  const when = () => projectChatDateLabel(props.chat.updatedAt, now, t, format);
  const stateLabel = () => {
    if (props.chat.activity === "needs-input") return t("project.chat.state.waiting");
    if (props.chat.activity === "error") return t("project.chat.state.failed");
    if (props.chat.state === "running") return t("project.chat.state.running");
    if (props.chat.state === "queued") return t("project.chat.state.queued");
    return "";
  };

  function begin(): void {
    setTitle(props.chat.title);
    setEditing(true);
  }

  function commit(): void {
    const next = title();
    setEditing(false);
    void projects.renameChat(props.chat, next);
  }

  const request = (placement: "active" | "right") => ({
    projectId: props.chat.projectId,
    agentId: props.chat.agentId,
    chatId: props.chat.taskId,
    placement,
  });

  return (
    <li
      class="project-chat-row"
      style={{ transform: `translateY(${props.top}px)`, height: `${ROW_HEIGHT}px` }}
      data-active={shown() ? "" : undefined}
      data-open={open() ? "" : undefined}
      data-archived={props.chat.archived ? "" : undefined}
    >
      <Show
        when={!editing()}
        fallback={
          <Input
            class="project-chat-rename"
            size="sm"
            aria-label={t("project.chat.renameLabel")}
            value={title()}
            onValueChange={setTitle}
            ref={(element: HTMLInputElement) => queueMicrotask(() => element.select())}
            onKeyDown={(event: KeyboardEvent) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commit();
              } else if (event.key === "Escape") {
                event.preventDefault();
                setEditing(false);
              }
            }}
            onBlur={commit}
          />
        }
      >
        <Button
          variant="ghost"
          class="project-chat-row-main"
          aria-current={shown() ? "true" : undefined}
          onClick={() => projects.openChat(request("active"))}
        >
          <span class="project-chat-leading">
            <StatusDot state={props.chat.activity} />
          </span>
          <span class="project-chat-text">
            <span class="project-chat-title">{props.chat.title || t("project.chat.untitled")}</span>
            <span class="project-chat-meta">
              <span title={projectChatDateTitle(props.chat.updatedAt, format)}>{when()}</span>
              <Show when={stateLabel()}>
                <span class="project-chat-state">{stateLabel()}</span>
              </Show>
              <Show when={props.chat.unreadCount > 0}>
                <span class="project-chat-unread" title={t("project.chat.unread", { count: props.chat.unreadCount })}>
                  {props.chat.unreadCount}
                </span>
              </Show>
            </span>
          </span>
          <Show when={props.chat.pinned}>
            <Pin class="project-chat-pin" aria-label={t("project.chat.pinned")} />
          </Show>
        </Button>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger
            as={IconButton}
            label={t("project.chat.actions", { title: props.chat.title })}
            size="icon-xs"
            variant="ghost"
            class="project-chat-actions"
          >
            <Ellipsis />
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content>
              <DropdownMenu.Item onSelect={() => projects.openChat(request("active"))}>
                <MessageCirclePlus />
                {t("project.chat.open")}
              </DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => projects.openChat(request("right"))}>
                <SquareArrowOutUpRight />
                {t("project.chat.openToSide")}
              </DropdownMenu.Item>
              <DropdownMenu.Separator />
              <DropdownMenu.Item onSelect={begin}>
                <Pencil />
                {t("project.chat.rename")}
              </DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => void projects.setChatPinned(props.chat, !props.chat.pinned)}>
                <Show when={props.chat.pinned} fallback={<Pin />}>
                  <PinOff />
                </Show>
                {t(props.chat.pinned ? "project.chat.unpin" : "project.chat.pin")}
              </DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => void projects.setChatArchived(props.chat, !props.chat.archived)}>
                <Show when={props.chat.archived} fallback={<Archive />}>
                  <ArchiveRestore />
                </Show>
                {t(props.chat.archived ? "project.chat.restore" : "project.chat.archive")}
              </DropdownMenu.Item>
              <DropdownMenu.Separator />
              <DropdownMenu.Item onSelect={() => setDeleting(true)}>
                <Trash2 />
                {t("project.chat.delete")}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </Show>
      <ConfirmDialog
        open={deleting()}
        onCancel={() => setDeleting(false)}
        title={t("project.chat.deleteTitle")}
        description={t("project.chat.deleteDescription", { title: props.chat.title })}
        confirmLabel={t("project.chat.deleteConfirm")}
        onConfirm={async () => {
          await projects.deleteChat(props.chat);
          setDeleting(false);
        }}
      />
    </li>
  );
}
