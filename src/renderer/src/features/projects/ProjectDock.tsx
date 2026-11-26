import type { ProjectSummary } from "@codebot/contracts/ipc";
import type { AppTextKey } from "@codebot/i18n";
import {
  Button,
  Columns2,
  DropdownMenu,
  IconButton,
  Maximize2,
  MessageCirclePlus,
  Minimize2,
  Plus,
  Rows2,
  X,
} from "@codebot/ui";
import { useText } from "@codebot/ui/text";
import { Portal } from "@solidjs/web";
import {
  createDockview,
  type DockviewApi,
  type DockviewGroupPanel,
  type DockviewPanelApi,
  type GroupPanelPartInitParameters,
  type IContentRenderer,
  type IDockviewPanel,
  type IHeaderActionsRenderer,
} from "dockview-core";
import { createEffect, createMemo, createSignal, createStore, For, onSettled, Show, untrack } from "solid-js";
import { useServers } from "../servers/servers-context";
import { ProjectChatPanel } from "./ProjectChatPanel";
import type { OpenChatRequest, OpenSlotRequest, ProjectDockController } from "./project-dock-controller";
import {
  type ChatPanelParams,
  type DockPanelParams,
  type DockSplitDirection,
  dockPanelParamsSchema,
  isChatPanel,
  SLOT_PANEL_KINDS,
  type SlotPanelKind,
  slotPanelContents,
} from "./project-dock-panels";
import { readDockLayout, writeDockLayout } from "./project-dock-storage";
import { useProjects } from "./projects-context";

const SLOT_ADD_LABEL = {
  file: "panel.add.file",
  diff: "panel.add.diff",
  browser: "panel.add.browser",
} as const satisfies Record<SlotPanelKind, AppTextKey>;

const CHAT_COMPONENT = "chat";
const SLOT_COMPONENT = "slot";
const SAVE_DELAY_MS = 350;

interface PanelHost {
  id: string;
  element: HTMLElement;
  api: DockviewPanelApi;
}

interface ActionsHost {
  groupId: string;
  element: HTMLElement;
  group: DockviewGroupPanel;
}

function panelId(): string {
  return `panel-${crypto.randomUUID()}`;
}

function parsedParams(value: unknown): DockPanelParams | null {
  const parsed = dockPanelParamsSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function chatKeyOf(params: ChatPanelParams): string | null {
  return params.agentId && params.chatId ? `${params.agentId}\u0000${params.chatId}` : null;
}

export function ProjectDock(props: { projectId: string }) {
  const { t } = useText();
  const projects = useProjects();
  const { activeServerId } = useServers();
  const serverId = untrack(activeServerId);
  const [hosts, setHosts] = createSignal<PanelHost[]>([]);
  const [actions, setActions] = createSignal<ActionsHost[]>([]);
  const [params, setParams] = createStore<Record<string, DockPanelParams>>({});
  const [panelCount, setPanelCount] = createSignal(0);
  const [maximized, setMaximized] = createSignal(false);
  let container: HTMLDivElement | undefined;
  let api: DockviewApi | undefined;
  let loadedProjectId: string | null = null;
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  let loading = false;

  function register(host: PanelHost, initial: DockPanelParams | null): void {
    setHosts((current) => [...current.filter((entry) => entry.id !== host.id), host]);
    if (initial)
      setParams((current) => {
        current[host.id] = initial;
      });
  }

  function unregister(id: string): void {
    setHosts((current) => current.filter((entry) => entry.id !== id));
    setParams((current) => {
      delete current[id];
    });
  }

  function createRenderer(id: string): IContentRenderer {
    const element = document.createElement("div");
    element.className = "project-dock-panel";
    return {
      element,
      init(parameters: GroupPanelPartInitParameters) {
        register({ id, element, api: parameters.api }, parsedParams(parameters.params));
      },
      update(event) {
        const next = parsedParams({ ...(untrack(() => params[id]) ?? {}), ...event.params });
        if (next)
          setParams((current) => {
            current[id] = next;
          });
      },
      dispose() {
        unregister(id);
      },
    };
  }

  function createActionsRenderer(group: DockviewGroupPanel): IHeaderActionsRenderer {
    const element = document.createElement("div");
    element.className = "project-dock-actions-host";
    return {
      element,
      init() {
        setActions((current) => [...current, { groupId: group.id, element, group }]);
      },
      dispose() {
        setActions((current) => current.filter((entry) => entry.element !== element));
      },
    };
  }

  function chatPanels(): IDockviewPanel[] {
    return (api?.panels ?? []).filter((panel) => {
      const parsed = parsedParams(panel.params);
      return parsed !== null && isChatPanel(parsed);
    });
  }

  function syncOpenChats(): void {
    const keys = new Set<string>();
    for (const panel of chatPanels()) {
      const parsed = parsedParams(panel.params);
      if (parsed && isChatPanel(parsed)) {
        const key = chatKeyOf(parsed);
        if (key) keys.add(key);
      }
    }
    projects.setOpenChatKeys(keys);
    setPanelCount(api?.totalPanels ?? 0);
  }

  function syncShownChat(): void {
    const active = api?.activePanel;
    const parsed = active ? parsedParams(active.params) : null;
    projects.setShownChatKey(parsed && isChatPanel(parsed) ? chatKeyOf(parsed) : null);
    setMaximized(active?.api.isMaximized() === true);
  }

  function scheduleSave(): void {
    if (loading || !api || loadedProjectId === null) return;
    clearTimeout(saveTimer);
    const projectId = loadedProjectId;
    saveTimer = setTimeout(() => {
      if (api && loadedProjectId === projectId) writeDockLayout(serverId, projectId, api.toJSON());
    }, SAVE_DELAY_MS);
  }

  function flushSave(): void {
    clearTimeout(saveTimer);
    if (!loading && api && loadedProjectId !== null) writeDockLayout(serverId, loadedProjectId, api.toJSON());
  }

  function activePanel(): IDockviewPanel | undefined {
    return api?.activePanel ?? api?.panels[0];
  }

  function position(placement: OpenChatRequest["placement"]) {
    const reference = activePanel();
    if (!reference || !api || api.totalPanels === 0) return undefined;
    if (placement === "right") return { referencePanel: reference, direction: "right" as const };
    if (placement === "below") return { referencePanel: reference, direction: "below" as const };
    return { referencePanel: reference, direction: "within" as const };
  }

  function addChatPanel(params: ChatPanelParams, placement: OpenChatRequest["placement"], title?: string): void {
    if (!api) return;
    const where = position(placement);
    api.addPanel({
      id: panelId(),
      component: CHAT_COMPONENT,
      title: title ?? t("project.chat.untitled"),
      params,
      ...(where ? { position: where } : {}),
    });
  }

  function open(request: OpenChatRequest): void {
    if (!api) return;
    const key = request.agentId && request.chatId ? `${request.agentId}\u0000${request.chatId}` : null;
    if (key) {
      const existing = chatPanels().find((panel) => {
        const parsed = parsedParams(panel.params);
        return parsed !== null && isChatPanel(parsed) && chatKeyOf(parsed) === key;
      });
      if (existing && request.placement === "active") {
        existing.api.setActive();
        return;
      }
    }
    const current = activePanel();
    const currentParams = current ? parsedParams(current.params) : null;
    const replaceable =
      request.placement === "active" &&
      current !== undefined &&
      currentParams !== null &&
      isChatPanel(currentParams) &&
      currentParams.chatId === null &&
      currentParams.projectId === request.projectId &&
      request.chatId !== null;
    if (replaceable && current) {
      current.api.updateParameters({ agentId: request.agentId, chatId: request.chatId });
      current.api.setActive();
      return;
    }
    addChatPanel(
      { kind: "chat", projectId: request.projectId, agentId: request.agentId, chatId: request.chatId },
      request.placement,
    );
  }

  function openSlot(request: OpenSlotRequest): void {
    if (!api) return;
    const where = position(request.placement);
    api.addPanel({
      id: panelId(),
      component: SLOT_COMPONENT,
      title: request.title,
      params: { kind: request.kind, projectId: request.projectId, title: request.title, data: request.data },
      ...(where ? { position: where } : {}),
    });
  }

  function split(direction: DockSplitDirection): void {
    const reference = activePanel();
    if (!api) return;
    const referenceParams = reference ? parsedParams(reference.params) : null;
    const projectId = referenceParams?.projectId ?? props.projectId;
    const agentId = referenceParams && isChatPanel(referenceParams) ? referenceParams.agentId : null;
    open({ projectId, agentId, chatId: null, placement: direction });
  }

  function closeActive(): void {
    activePanel()?.api.close();
  }

  function toggleMaximize(): void {
    const panel = activePanel();
    if (!panel) return;
    if (panel.api.isMaximized()) panel.api.exitMaximized();
    else panel.api.maximize();
    setMaximized(panel.api.isMaximized());
  }

  function nextPanel(step: 1 | -1): void {
    if (!api || api.panels.length === 0) return;
    const panels = api.panels;
    const index = Math.max(
      0,
      panels.findIndex((panel) => panel.id === api?.activePanel?.id),
    );
    panels[(index + step + panels.length) % panels.length]?.api.setActive();
  }

  const controller: ProjectDockController = {
    open,
    openSlot,
    split,
    closeActive,
    toggleMaximize,
    nextPanel,
    panelCount: () => api?.totalPanels ?? 0,
  };

  async function dropDeadPanels(): Promise<void> {
    if (!api) return;
    const dock = api;
    const projectIds = new Set(
      chatPanels().flatMap((panel) => {
        const parsed = parsedParams(panel.params);
        return parsed && isChatPanel(parsed) && parsed.chatId ? [parsed.projectId] : [];
      }),
    );
    await Promise.all(
      [...projectIds].map((projectId) => projects.port.listChats({ projectId, limit: 1 }).catch(() => undefined)),
    );
    for (const panel of chatPanels()) {
      const parsed = parsedParams(panel.params);
      if (!parsed || !isChatPanel(parsed)) continue;
      if (!parsed.agentId || !parsed.chatId) continue;
      const alive = await projects.port.getChat({ agentId: parsed.agentId, taskId: parsed.chatId }).then(
        () => true,
        () => false,
      );
      if (!alive && dock === api) panel.api.close();
    }
  }

  async function loadProject(projectId: string): Promise<void> {
    const dock = api;
    if (!dock) return;
    flushSave();
    loading = true;
    loadedProjectId = null;
    try {
      const saved = readDockLayout(serverId, projectId);
      dock.clear();
      if (saved) {
        try {
          dock.fromJSON(saved);
        } catch {
          dock.clear();
        }
      }
      for (const panel of dock.panels) {
        if (parsedParams(panel.params) === null) panel.api.close();
      }
      syncOpenChats();
      await dropDeadPanels();
      if (dock !== api) return;
      const requests = projects.takePendingOpens();
      loadedProjectId = projectId;
      loading = false;
      for (const request of requests) open(request);
      if (dock.totalPanels === 0) {
        const detail = projects.detailOf(projectId);
        open({ projectId, agentId: detail?.agents[0]?.id ?? null, chatId: null, placement: "active" });
      }
      syncOpenChats();
      syncShownChat();
      flushSave();
    } finally {
      loading = false;
      if (dock === api && loadedProjectId === null) loadedProjectId = projectId;
    }
  }

  onSettled(() => {
    if (!container) return;
    const dock = createDockview(container, {
      theme: { name: "codebot", className: "codebot-dock-theme", gap: 6, dndOverlayMounting: "absolute" },
      className: "project-dock-view",
      disableFloatingGroups: true,
      noPanelsOverlay: "emptyGroup",
      createComponent: ({ id }) => createRenderer(id),
      createRightHeaderActionComponent: createActionsRenderer,
    });
    api = dock;
    projects.setDock(controller);
    const listeners = [
      dock.onDidLayoutChange(() => {
        syncOpenChats();
        scheduleSave();
      }),
      dock.onDidActivePanelChange(() => syncShownChat()),
      dock.onDidRemovePanel(() => {
        syncOpenChats();
        if (!loading && dock.totalPanels === 0 && loadedProjectId !== null) {
          const detail = projects.detailOf(loadedProjectId);
          queueMicrotask(() => {
            if (api === dock && dock.totalPanels === 0 && loadedProjectId !== null)
              open({
                projectId: loadedProjectId,
                agentId: detail?.agents[0]?.id ?? null,
                chatId: null,
                placement: "active",
              });
          });
        }
      }),
      dock.onDidMutateLayout(() => setMaximized(dock.activePanel?.api.isMaximized() === true)),
    ];
    const flush = () => flushSave();
    window.addEventListener("pagehide", flush);
    void loadProject(untrack(() => props.projectId));
    return () => {
      window.removeEventListener("pagehide", flush);
      flushSave();
      for (const listener of listeners) listener.dispose();
      projects.setDock(null);
      api = undefined;
      dock.dispose();
    };
  });

  createEffect(
    () => props.projectId,
    (projectId) => {
      if (api && loadedProjectId !== projectId) void loadProject(projectId);
    },
    { defer: true },
  );

  const project = (projectId: string): ProjectSummary | undefined => projects.project(projectId);

  const removeOnDeleted = projects.onChatRemoved((ref) => {
    for (const panel of chatPanels()) {
      const parsed = parsedParams(panel.params);
      if (parsed && isChatPanel(parsed) && parsed.chatId === ref.taskId) panel.api.close();
    }
  });
  onSettled(() => removeOnDeleted);

  const slotKinds = createMemo(() => SLOT_PANEL_KINDS.filter((kind) => slotPanelContents[kind] !== undefined));

  return (
    <section class="project-dock" aria-label={t("panel.dock.label")}>
      <div class="project-dock-surface" ref={container} />
      <For each={hosts()}>
        {(host) => (
          <Portal mount={host.element}>
            <Show when={params[host.id]}>
              {(value) => (
                <PanelBody
                  host={host}
                  params={value()}
                  project={project(value().projectId)}
                  onClose={() => host.api.close()}
                />
              )}
            </Show>
          </Portal>
        )}
      </For>
      <For each={actions()}>
        {(entry) => (
          <Portal mount={entry.element}>
            <GroupActions
              group={entry.group}
              slotKinds={slotKinds()}
              maximized={maximized()}
              onNew={() => {
                entry.group.api.setActive();
                const referenceParams = parsedParams(entry.group.activePanel?.params);
                open({
                  projectId: referenceParams?.projectId ?? props.projectId,
                  agentId: referenceParams && isChatPanel(referenceParams) ? referenceParams.agentId : null,
                  chatId: null,
                  placement: "active",
                });
              }}
              onOther={() => {
                entry.group.api.setActive();
                projects.setPickerOpen({ placement: "active" });
              }}
              onSlot={(kind) => {
                entry.group.api.setActive();
                const reference = parsedParams(entry.group.activePanel?.params);
                openSlot({
                  kind,
                  projectId: reference?.projectId ?? props.projectId,
                  title: t(SLOT_ADD_LABEL[kind]),
                  data: {},
                  placement: "active",
                });
              }}
              onSplit={(direction) => {
                entry.group.api.setActive();
                split(direction);
              }}
              onMaximize={() => {
                entry.group.api.setActive();
                toggleMaximize();
              }}
            />
          </Portal>
        )}
      </For>
      <Show when={panelCount() === 0}>
        <div class="project-dock-empty">
          <Button
            variant="secondary"
            onClick={() => open({ projectId: props.projectId, agentId: null, chatId: null, placement: "active" })}
          >
            <MessageCirclePlus />
            {t("project.chat.new")}
          </Button>
        </div>
      </Show>
    </section>
  );
}

function PanelBody(props: {
  host: PanelHost;
  params: DockPanelParams;
  project: ProjectSummary | undefined;
  onClose: () => void;
}) {
  const slot = () => {
    const value = props.params;
    return isChatPanel(value) ? undefined : value;
  };
  return (
    <Show
      when={slot()}
      fallback={
        <Show when={isChatPanel(props.params) ? props.params : undefined}>
          {(chat) => <ProjectChatPanel panelId={props.host.id} api={props.host.api} params={chat()} />}
        </Show>
      }
    >
      {(value) => {
        const Content = (kind: SlotPanelKind) => slotPanelContents[kind];
        return (
          <Show when={Content(value().kind)}>
            {(content) =>
              content()({
                panelId: props.host.id,
                params: value(),
                project: props.project,
                visible: props.host.api.isVisible,
                onTitleChange: (title) => props.host.api.setTitle(title),
                onClose: props.onClose,
              })
            }
          </Show>
        );
      }}
    </Show>
  );
}

function GroupActions(props: {
  group: DockviewGroupPanel;
  slotKinds: readonly SlotPanelKind[];
  maximized: boolean;
  onNew: () => void;
  onOther: () => void;
  onSlot: (kind: SlotPanelKind) => void;
  onSplit: (direction: DockSplitDirection) => void;
  onMaximize: () => void;
}) {
  const { t } = useText();
  return (
    <div class="project-dock-actions">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger as={IconButton} label={t("panel.add")} size="icon-sm" variant="ghost">
          <Plus />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content>
            <DropdownMenu.Item onSelect={props.onNew}>{t("project.chat.new")}</DropdownMenu.Item>
            <DropdownMenu.Item onSelect={props.onOther}>{t("panel.add.otherChat")}</DropdownMenu.Item>
            <For each={props.slotKinds}>
              {(kind) => (
                <DropdownMenu.Item onSelect={() => props.onSlot(kind)}>{t(SLOT_ADD_LABEL[kind])}</DropdownMenu.Item>
              )}
            </For>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <IconButton label={t("panel.split.right")} size="icon-sm" variant="ghost" onClick={() => props.onSplit("right")}>
        <Columns2 />
      </IconButton>
      <IconButton label={t("panel.split.down")} size="icon-sm" variant="ghost" onClick={() => props.onSplit("below")}>
        <Rows2 />
      </IconButton>
      <IconButton
        label={props.maximized ? t("panel.restore") : t("panel.maximize")}
        size="icon-sm"
        variant="ghost"
        onClick={props.onMaximize}
      >
        <Show when={props.maximized} fallback={<Maximize2 />}>
          <Minimize2 />
        </Show>
      </IconButton>
      <IconButton
        label={t("panel.close")}
        size="icon-sm"
        variant="ghost"
        onClick={() => props.group.activePanel?.api.close()}
      >
        <X />
      </IconButton>
    </div>
  );
}
