import type { DockviewApi, DockviewGroupPanel, IDockviewPanel } from "dockview-core";
import type { OpenContentRequest } from "./project-dock-controller";
import { type DockPanelParams, isChatPanel } from "./project-dock-panels";
import {
  type CloseReason,
  chatKeyFrom,
  isTransientKind,
  panelsToClose,
  type TransientPanel,
  transientPanelOf,
} from "./project-preview-model";
import { clampPreviewFraction, readPreviewFraction, writePreviewFraction } from "./project-preview-storage";

const WIDTH_SAVE_DELAY_MS = 300;
const MIN_SPLIT_SURFACE_PX = 560;
const ROW_TOLERANCE_PX = 2;
const COMPOSER_SELECTOR = '[role="textbox"], textarea, [contenteditable="true"]';

export interface PreviewDockDeps {
  api: () => DockviewApi | undefined;
  container: () => HTMLElement | undefined;
  parsed: (panel: IDockviewPanel) => DockPanelParams | null;
  newPanelId: () => string;
  component: string;
  onChanged: () => void;
}

function contentKey(params: DockPanelParams): string | null {
  if (isChatPanel(params)) return null;
  return params.data.tabId ?? params.data.key ?? null;
}

export function createPreviewDock(deps: PreviewDockDeps) {
  let shownChatKey: string | null = null;
  let widthTimer: ReturnType<typeof setTimeout> | undefined;
  let applyingSize = 0;
  const watchedGroups = new WeakSet<DockviewGroupPanel>();

  function transientPanels(): TransientPanel[] {
    return (deps.api()?.panels ?? []).flatMap((panel) => {
      const entry = transientPanelOf(panel.id, deps.parsed(panel));
      return entry ? [entry] : [];
    });
  }

  function closeTransient(reason: CloseReason, scope: { chatKey?: string | null } = {}): void {
    const api = deps.api();
    if (!api) return;
    for (const id of panelsToClose(transientPanels(), reason, scope)) api.getPanel(id)?.api.close();
  }

  function watchWidth(group: DockviewGroupPanel): void {
    if (watchedGroups.has(group)) return;
    watchedGroups.add(group);
    group.api.onDidDimensionsChange((event) => {
      if (applyingSize > 0) return;
      const total = deps.container()?.clientWidth ?? 0;
      const active = group.activePanel;
      const params = active ? deps.parsed(active) : null;
      if (total <= 0 || !params || isChatPanel(params) || !isTransientKind(params.kind)) return;
      clearTimeout(widthTimer);
      widthTimer = setTimeout(
        () => writePreviewFraction(clampPreviewFraction(event.width / total)),
        WIDTH_SAVE_DELAY_MS,
      );
    });
  }

  function rowOf(group: DockviewGroupPanel): DockviewGroupPanel[] {
    const box = group.element.getBoundingClientRect();
    return (deps.api()?.groups ?? [])
      .filter((member) => {
        const rect = member.element.getBoundingClientRect();
        return Math.abs(rect.top - box.top) < ROW_TOLERANCE_PX && Math.abs(rect.bottom - box.bottom) < ROW_TOLERANCE_PX;
      })
      .sort(
        (first, second) => first.element.getBoundingClientRect().left - second.element.getBoundingClientRect().left,
      );
  }

  function applyWidth(group: DockviewGroupPanel): void {
    const total = deps.container()?.clientWidth ?? 0;
    if (total <= 0) return;
    applyingSize += 1;
    try {
      const row = rowOf(group);
      if (row.length <= 2) group.api.setSize({ width: Math.round(total * readPreviewFraction()) });
      else {
        const share = Math.round(total / row.length);
        for (const member of row.slice(0, -1)) member.api.setSize({ width: share });
      }
    } finally {
      queueMicrotask(() => {
        applyingSize -= 1;
      });
    }
  }

  function referenceChat(request: OpenContentRequest): IDockviewPanel | undefined {
    const api = deps.api();
    if (!api) return undefined;
    const sourceKey = chatKeyFrom(request.data.agentId, request.data.chatId);
    const chats = api.panels.filter((panel) => {
      const params = deps.parsed(panel);
      return params !== null && isChatPanel(params);
    });
    return (
      chats.find((panel) => {
        const params = deps.parsed(panel);
        return params !== null && isChatPanel(params) && chatKeyFrom(params.agentId, params.chatId) === sourceKey;
      }) ??
      (api.activePanel && chats.includes(api.activePanel) ? api.activePanel : undefined) ??
      chats[0]
    );
  }

  function openContent(request: OpenContentRequest): void {
    const api = deps.api();
    if (!api) return;
    const key = request.data.tabId ?? request.data.key ?? null;
    const sameKind = api.panels.filter((panel) => deps.parsed(panel)?.kind === request.kind);
    const existing = sameKind.find((panel) => {
      const params = deps.parsed(panel);
      return params !== null && key !== null && contentKey(params) === key;
    });
    const params = {
      kind: request.kind,
      projectId: request.projectId,
      title: request.title,
      data: request.data,
    } as const;
    if (existing) {
      existing.api.updateParameters({ data: request.data });
      existing.api.setTitle(request.title);
      if (request.activate) existing.api.setActive();
      return;
    }
    const reusable = sameKind.find((panel) => {
      const entry = transientPanelOf(panel.id, deps.parsed(panel));
      return entry !== null && !entry.pinned;
    });
    if (reusable) {
      reusable.api.updateParameters({ ...params });
      reusable.api.setTitle(request.title);
      if (request.activate) reusable.api.setActive();
      return;
    }
    const reference = referenceChat(request) ?? api.activePanel ?? api.panels[0];
    const previous = api.activePanel;
    const narrow = (deps.container()?.clientWidth ?? Number.POSITIVE_INFINITY) < MIN_SPLIT_SURFACE_PX;
    const direction = narrow ? ("within" as const) : ("right" as const);
    const panel = api.addPanel({
      id: deps.newPanelId(),
      component: deps.component,
      title: request.title,
      params: { ...params, ...(request.pinned ? { pinned: true } : {}) },
      ...(reference ? { position: { referencePanel: reference, direction } } : {}),
    });
    if (narrow) panel.api.setActive();
    else if (!request.activate && previous) previous.api.setActive();
    if (narrow) {
      deps.onChanged();
      return;
    }
    watchWidth(panel.group);
    if (reference) applyWidth(panel.group);
    deps.onChanged();
  }

  function noteShownChat(key: string | null): void {
    if (key === null) return;
    const previous = shownChatKey;
    shownChatKey = key;
    if (previous !== null && previous !== key) closeTransient("chat-switch");
  }

  function resetShownChat(): void {
    shownChatKey = null;
  }

  function composerTouched(event: Event): void {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (!target.closest(".project-chat-panel")) return;
    if (target.closest(COMPOSER_SELECTOR)) closeTransient("composer");
  }

  function attach(container: HTMLElement): () => void {
    container.addEventListener("pointerdown", composerTouched, true);
    return () => {
      container.removeEventListener("pointerdown", composerTouched, true);
      clearTimeout(widthTimer);
    };
  }

  function watchExisting(): void {
    for (const panel of deps.api()?.panels ?? []) {
      if (transientPanelOf(panel.id, deps.parsed(panel))) watchWidth(panel.group);
    }
  }

  function dropUnpinnedAfterLoad(): void {
    closeTransient("project-switch");
  }

  return {
    openContent,
    closeTransient,
    noteShownChat,
    resetShownChat,
    attach,
    watchExisting,
    dropUnpinnedAfterLoad,
    transientPanels,
  };
}
