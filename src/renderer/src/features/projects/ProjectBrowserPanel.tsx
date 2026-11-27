import type { BrowserTab } from "@codebot/contracts/ipc";
import { Hand, IconButton, Input, Spinner } from "@codebot/ui";
import { BROWSER_NEW_TAB_URL, browserAddressUrl } from "@codebot/ui/features/browser/browser-suggestions";
import {
  BrowserBackIcon,
  BrowserForwardIcon,
  BrowserReloadIcon,
} from "@codebot/ui/features/conversation/ConversationIcons";
import { useText } from "@codebot/ui/text";
import { createEffect, createSignal, onCleanup, onSettled, Show, untrack } from "solid-js";
import { projectBrowserPort } from "./project-browser-port";
import type { SlotPanelProps } from "./project-dock-panels";
import { useProjects } from "./projects-context";

const OVERLAY_ROLES = ["dialog", "alertdialog", "menu", "listbox"];
const OVERLAY_SELECTOR = OVERLAY_ROLES.map((name) => `[role="${name}"]`).join(", ");

export function ProjectBrowserPanel(props: SlotPanelProps) {
  const { t } = useText();
  const projects = useProjects();
  const [tabs, setTabs] = createSignal<readonly BrowserTab[] | null>(null);
  const [seen, setSeen] = createSignal(false);
  const [failed, setFailed] = createSignal(false);
  const [typed, setTyped] = createSignal<string | null>(null);
  const [overlayOpen, setOverlayOpen] = createSignal(false);
  let surface: HTMLDivElement | undefined;
  let creating = false;
  const tabId = () => props.params.data.tabId ?? null;
  const tab = () => tabs()?.find((entry) => entry.id === tabId());
  const port = () => projectBrowserPort().browser;

  onSettled(() => {
    const stop = port().onDisplayState((state) => setTabs(state.tabs));
    void port()
      .getDisplayState()
      .then((state) => setTabs((current) => current ?? state.tabs))
      .catch(() => setFailed(true));
    const watcher = new MutationObserver(() => setOverlayOpen(document.querySelector(OVERLAY_SELECTOR) !== null));
    watcher.observe(document.body, { childList: true, subtree: true });
    return () => {
      stop();
      watcher.disconnect();
    };
  });

  createEffect(
    () => ({ loaded: tabs() !== null, id: tabId() }),
    ({ loaded, id }) => {
      if (!loaded || id !== null || creating) return;
      creating = true;
      const detail = untrack(() => projects.detailOf(props.params.projectId));
      const agentId = props.params.data.agentId ?? detail?.agents[0]?.id ?? null;
      void port()
        .open({ url: BROWSER_NEW_TAB_URL, ownerAgentId: agentId, ownerThreadId: null, focus: true })
        .then((created) => props.onDataChange({ ...props.params.data, tabId: created.id }))
        .catch(() => setFailed(true))
        .finally(() => {
          creating = false;
        });
    },
  );

  createEffect(
    () => tab() !== undefined,
    (present) => {
      if (present) setSeen(true);
      else if (untrack(seen) && untrack(tabs) !== null) props.onClose();
    },
  );

  createEffect(
    () => tab()?.title,
    (title) => {
      if (title) props.onTitleChange(title);
    },
  );

  createEffect(
    () => (props.visible ? tab()?.id : undefined),
    (id) => {
      if (id) void port().activate(id);
    },
  );

  createEffect(
    () => props.visible && tab() !== undefined && !overlayOpen(),
    (shown) => {
      if (!shown) {
        void port().setVisible({ visible: false, target: "main" });
        return;
      }
      let frame: number | undefined;
      const sync = () => {
        frame = undefined;
        if (!surface?.isConnected) return;
        const bounds = surface.getBoundingClientRect();
        void port().setVisible({
          visible: true,
          target: "main",
          bounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
        });
      };
      const schedule = () => {
        if (frame === undefined) frame = requestAnimationFrame(sync);
      };
      const observer = new ResizeObserver(schedule);
      if (surface) observer.observe(surface);
      const root = surface?.closest(".project-dock");
      if (root) observer.observe(root);
      window.addEventListener("resize", schedule);
      schedule();
      return () => {
        observer.disconnect();
        window.removeEventListener("resize", schedule);
        if (frame !== undefined) cancelAnimationFrame(frame);
      };
    },
  );

  onCleanup(() => {
    void port().setVisible({ visible: false, target: "main" });
  });

  function submit(): void {
    const id = tabId();
    const value = typed();
    if (id === null || value === null || value.trim() === "") return;
    setTyped(null);
    void port().navigate({ tabId: id, url: browserAddressUrl(value.trim()) });
  }

  function toggleControl(): void {
    const current = tab();
    if (!current) return;
    void (current.userControl ? port().releaseControl(current.id) : port().takeControl(current.id));
  }

  function step(direction: "back" | "forward"): void {
    const id = tabId();
    if (id) void port().navigate({ tabId: id, direction });
  }

  return (
    <section class="project-browser-panel" aria-label={t("panel.browser.label")}>
      <div class="project-browser-toolbar">
        <IconButton
          label={t("browser.goBack")}
          size="icon-sm"
          variant="ghost"
          disabled={tab()?.canGoBack !== true}
          onClick={() => step("back")}
        >
          <BrowserBackIcon />
        </IconButton>
        <IconButton
          label={t("browser.goForward")}
          size="icon-sm"
          variant="ghost"
          disabled={tab()?.canGoForward !== true}
          onClick={() => step("forward")}
        >
          <BrowserForwardIcon />
        </IconButton>
        <IconButton
          label={t("browser.reload")}
          size="icon-sm"
          variant="ghost"
          disabled={tab() === undefined}
          onClick={() => {
            const id = tabId();
            if (id) void port().reload(id);
          }}
        >
          <BrowserReloadIcon />
        </IconButton>
        <Input
          class="project-browser-address"
          type="text"
          autocomplete="off"
          spellcheck={false}
          aria-label={t("browser.address.label")}
          placeholder={t("browser.address.placeholder")}
          value={typed() ?? tab()?.url ?? ""}
          onInput={(event: InputEvent & { currentTarget: HTMLInputElement }) => setTyped(event.currentTarget.value)}
          onBlur={() => setTyped(null)}
          onKeyDown={(event: KeyboardEvent) => {
            if (event.key === "Enter") submit();
            else if (event.key === "Escape") setTyped(null);
          }}
        />
        <IconButton
          class="project-browser-control"
          label={tab()?.userControl ? t("panel.browser.handControl") : t("panel.browser.takeControl")}
          size="icon-sm"
          variant="ghost"
          disabled={tab() === undefined}
          aria-pressed={tab()?.userControl ? "true" : "false"}
          onClick={toggleControl}
        >
          <Hand />
        </IconButton>
      </div>
      <div class="project-browser-status" role="status">
        <Show when={tab()?.userControl} fallback={<span>{t("panel.browser.agentControls")}</span>}>
          <span>{t("panel.browser.userControls")}</span>
        </Show>
      </div>
      <div class="project-browser-surface" ref={(element) => (surface = element)}>
        <Show when={tab() === undefined}>
          <div class="project-browser-note">
            <Show
              when={failed() || (tabId() !== null && tabs() !== null)}
              fallback={<Spinner aria-label={t("panel.browser.starting")} />}
            >
              <span>{failed() ? t("panel.browser.failed") : t("panel.browser.closed")}</span>
            </Show>
          </div>
        </Show>
      </div>
    </section>
  );
}
