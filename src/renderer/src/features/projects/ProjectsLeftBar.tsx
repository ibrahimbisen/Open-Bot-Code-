import type { ProjectAccessLevel, ProjectActivityState, ProjectChat, ProjectSummary } from "@codebot/contracts/ipc";
import type { AppTextKey } from "@codebot/i18n";
import {
  Archive,
  Button,
  ChevronDown,
  ChevronRight,
  DropdownMenu,
  Ellipsis,
  IconButton,
  Lock,
  LockOpen,
  MessageCirclePlus,
  PanelLeft,
  Plus,
  Settings,
  ShieldCheck,
  Trash2,
} from "@codebot/ui";
import { useText } from "@codebot/ui/text";
import { For, Show } from "solid-js";
import { useLayout } from "../../layout";
import { EngineSwitch } from "../server-mode/EngineSwitch";
import { useServers } from "../servers/servers-context";
import { useSettings } from "../settings/settings-context";
import { projectSlots } from "./project-slots";
import { RECENT_CHAT_COUNT, useProjects } from "./projects-context";

export const ACTIVITY_LABEL = {
  idle: "project.status.idle",
  working: "project.status.working",
  done: "project.status.done",
  "needs-input": "project.status.needsInput",
  error: "project.status.error",
} as const satisfies Record<ProjectActivityState, AppTextKey>;

const ACCESS_LABEL = {
  strict: "project.access.strict",
  normal: "project.access.normal",
  open: "project.access.open",
} as const satisfies Record<ProjectAccessLevel, AppTextKey>;

export function StatusDot(props: { state: ProjectActivityState; label?: boolean }) {
  const { t } = useText();
  return (
    <span
      class="project-status-dot"
      data-state={props.state}
      role="img"
      aria-label={t(ACTIVITY_LABEL[props.state])}
      title={t(ACTIVITY_LABEL[props.state])}
    />
  );
}

export function AccessBadge(props: { level: ProjectAccessLevel }) {
  const { t } = useText();
  const label = () => t("project.access.badge", { level: t(ACCESS_LABEL[props.level]) });
  return (
    <span class="project-access-badge" data-level={props.level} role="img" aria-label={label()} title={label()}>
      <Show when={props.level === "strict"}>
        <ShieldCheck />
      </Show>
      <Show when={props.level === "normal"}>
        <Lock />
      </Show>
      <Show when={props.level === "open"}>
        <LockOpen />
      </Show>
    </span>
  );
}

export function ProjectMark(props: { project: ProjectSummary }) {
  return (
    <span
      class="project-mark"
      style={props.project.color ? { "background-color": props.project.color } : undefined}
      data-colored={props.project.color ? "" : undefined}
      aria-hidden="true"
    >
      {Array.from(props.project.name.trim())[0]?.toUpperCase() ?? ""}
    </span>
  );
}

function ProjectRow(props: { project: ProjectSummary; compact: boolean }) {
  const { t } = useText();
  const projects = useProjects();
  const active = () => projects.state.activeProjectId === props.project.id;
  const activity = () => projects.activityOf(props.project.id);
  const expanded = () => projects.state.expanded[props.project.id] === true;
  const recent = () => projects.listOf(props.project.id, false).chats.slice(0, RECENT_CHAT_COUNT);
  const toggle = () => {
    projects.toggleExpanded(props.project.id);
    if (!expanded()) projects.ensureChats(props.project.id);
  };
  return (
    <li class="project-row-item" data-active={active() ? "" : undefined}>
      <div class="project-row" data-active={active() ? "" : undefined} data-activity={activity().state}>
        <Show when={!props.compact}>
          <IconButton
            label={t(expanded() ? "project.row.hideChats" : "project.row.showChats", { name: props.project.name })}
            size="icon-xs"
            variant="ghost"
            class="project-row-expand"
            aria-expanded={expanded() ? "true" : "false"}
            onClick={toggle}
          >
            <Show when={expanded()} fallback={<ChevronRight />}>
              <ChevronDown />
            </Show>
          </IconButton>
        </Show>
        <Button
          variant="ghost"
          class="project-row-main"
          aria-current={active() ? "true" : undefined}
          aria-label={t("project.row.open", { name: props.project.name })}
          title={props.compact ? props.project.name : props.project.mainFolder}
          onClick={() => projects.setActiveProject(props.project.id)}
        >
          <span class="project-row-mark">
            <ProjectMark project={props.project} />
            <Show when={props.compact}>
              <StatusDot state={activity().state} />
            </Show>
          </span>
          <Show when={!props.compact}>
            <span class="project-row-name">{props.project.name}</span>
            <AccessBadge level={props.project.accessLevel} />
            <StatusDot state={activity().state} />
          </Show>
        </Button>
        <Show when={!props.compact}>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger
              as={IconButton}
              label={t("project.row.actions", { name: props.project.name })}
              size="icon-xs"
              variant="ghost"
              class="project-row-actions"
            >
              <Ellipsis />
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content>
                <DropdownMenu.Item onSelect={() => projects.newChat(props.project.id)}>
                  <MessageCirclePlus />
                  {t("project.menu.newChat")}
                </DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => projects.setSettingsProjectId(props.project.id)}>
                  <Settings />
                  {t("project.menu.settings")}
                </DropdownMenu.Item>
                <DropdownMenu.Separator />
                <DropdownMenu.Item onSelect={() => void projects.archiveProject(props.project.id)}>
                  <Archive />
                  {t("project.menu.archive")}
                </DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => projects.setSettingsProjectId(props.project.id)}>
                  <Trash2 />
                  {t("project.menu.delete")}
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </Show>
      </div>
      <Show when={expanded() && !props.compact}>
        <ul class="project-recent" aria-label={t("project.row.chats", { name: props.project.name })}>
          <For each={recent()} fallback={<li class="project-recent-empty">{t("project.row.noChats")}</li>}>
            {(chat) => <RecentChat chat={chat} />}
          </For>
        </ul>
      </Show>
    </li>
  );
}

function RecentChat(props: { chat: ProjectChat }) {
  const projects = useProjects();
  return (
    <li>
      <Button
        variant="ghost"
        class="project-recent-chat"
        onClick={() =>
          projects.openChat({
            projectId: props.chat.projectId,
            agentId: props.chat.agentId,
            chatId: props.chat.taskId,
            placement: "active",
          })
        }
      >
        <StatusDot state={props.chat.activity} />
        <span class="project-recent-title">{props.chat.title}</span>
      </Button>
    </li>
  );
}

export function ProjectsLeftBar() {
  const { t } = useText();
  const projects = useProjects();
  const layout = useLayout();
  const { activeServer } = useServers();
  const settings = useSettings();
  const compact = () => layout.leftPanelCompact();
  const archived = () => projects.state.projects.filter((entry) => entry.archivedAt !== null);
  return (
    <aside
      id="agent-sidebar"
      class="sidebar project-left-bar"
      aria-label={t("project.leftBar.label")}
      data-compact={compact() ? "" : undefined}
    >
      <header class="project-left-bar-header">
        <Show when={!compact()}>
          <span class="project-left-bar-title" title={activeServer()?.name}>
            {t("project.leftBar.label")}
          </span>
        </Show>
        <div class="project-left-bar-header-actions">
          <IconButton
            label={t("project.new")}
            size="icon-sm"
            variant="ghost"
            onClick={() => projects.setCreateOpen(true)}
          >
            <Plus />
          </IconButton>
          <IconButton
            label={t(compact() ? "project.leftBar.expand" : "project.leftBar.collapse")}
            size="icon-sm"
            variant="ghost"
            onClick={() => (compact() ? layout.expandSidebar() : layout.setSidebarCollapsed(true))}
          >
            <PanelLeft />
          </IconButton>
        </div>
      </header>
      <EngineSwitch compact={compact()} />
      <nav class="project-left-bar-scroll" aria-label={t("project.list.label")}>
        <ul class="project-list">
          <For each={projects.visibleProjects()}>
            {(project) => <ProjectRow project={project} compact={compact()} />}
          </For>
        </ul>
        <Show when={archived().length > 0 && !compact()}>
          <section class="project-archived" aria-label={t("project.list.archived")}>
            <h3 class="project-section-label">{t("project.list.archived")}</h3>
            <ul class="project-list">
              <For each={archived()}>
                {(project) => (
                  <li class="project-row-item">
                    <div class="project-row" data-archived="">
                      <Button
                        variant="ghost"
                        class="project-row-main"
                        onClick={() => void projects.restoreProject(project.id)}
                        title={t("project.menu.restore")}
                      >
                        <span class="project-row-mark">
                          <ProjectMark project={project} />
                        </span>
                        <span class="project-row-name">{project.name}</span>
                      </Button>
                    </div>
                  </li>
                )}
              </For>
            </ul>
          </section>
        </Show>
      </nav>
      <footer class="project-left-bar-footer">
        <Show when={projectSlots.leftBarAdvanced}>{(slot) => slot()({ compact: compact() })}</Show>
        <Show when={projectSlots.leftBarFooter}>{(slot) => slot()({ compact: compact() })}</Show>
        <Show
          when={!compact()}
          fallback={
            <IconButton
              label={t("project.leftBar.settings")}
              size="icon-sm"
              variant="ghost"
              onClick={(event) => settings.openAppSettings(event.currentTarget)}
            >
              <Settings />
            </IconButton>
          }
        >
          <Button
            variant="ghost"
            class="project-left-bar-settings"
            onClick={(event) => settings.openAppSettings(event.currentTarget)}
          >
            <Settings />
            {t("project.leftBar.settings")}
          </Button>
        </Show>
      </footer>
    </aside>
  );
}
