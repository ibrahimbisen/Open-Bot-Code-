import { IconButton, Monitor, Server, SlidingTabs } from "@codebot/ui";
import { useText } from "@codebot/ui/text";
import { createEffect, Show } from "solid-js";
import { useServerActions } from "../servers/server-actions";
import { useServerSelection } from "../servers/server-selection";
import { useServers } from "../servers/servers-context";
import { type EngineMode, engineModeOf, pickHomeServer, readHomeServerId, writeHomeServerId } from "./home-server";

export function EngineSwitch(props: { compact: boolean }) {
  const { t } = useText();
  const { servers } = useServers();
  const { selectServer } = useServerSelection();
  const { add } = useServerActions();
  const mode = () => engineModeOf(servers());
  const home = () => pickHomeServer(servers(), readHomeServerId());
  const local = () => servers().find((server) => server.kind === "local");

  createEffect(
    () => servers().find((server) => server.active && server.kind === "remote")?.id ?? null,
    (activeRemote) => {
      if (activeRemote !== null) writeHomeServerId(activeRemote);
    },
  );

  const change = (next: EngineMode) => {
    if (next === mode()) return;
    if (next === "computer") {
      const target = local();
      if (target) void selectServer(target.id);
      return;
    }
    const target = home();
    if (target) void selectServer(target.id);
    else add();
  };

  const homeLabel = () => t("serverMode.switch.homeServer");
  const homeHint = () =>
    home() === null
      ? t("serverMode.switch.noHomeServer")
      : t("serverMode.switch.homeServerNamed", { name: home()?.name ?? "" });

  return (
    <Show
      when={!props.compact}
      fallback={
        <IconButton
          label={mode() === "home" ? t("serverMode.switch.useComputer") : t("serverMode.switch.useHomeServer")}
          size="icon-sm"
          variant="ghost"
          class="engine-switch-compact"
          data-mode={mode()}
          onClick={() => change(mode() === "home" ? "computer" : "home")}
        >
          <Show when={mode() === "home"} fallback={<Monitor />}>
            <Server />
          </Show>
        </IconButton>
      }
    >
      <div class="engine-switch" data-mode={mode()}>
        <SlidingTabs.Root value={mode()} onChange={(value) => change(value === "home" ? "home" : "computer")}>
          <SlidingTabs.List class="engine-switch-list" aria-label={t("serverMode.switch.label")}>
            <SlidingTabs.Trigger value="computer" class="engine-switch-trigger">
              <Monitor class="engine-switch-icon" aria-hidden="true" />
              <span class="engine-switch-text">{t("serverMode.switch.thisComputer")}</span>
            </SlidingTabs.Trigger>
            <SlidingTabs.Trigger value="home" class="engine-switch-trigger" title={homeHint()}>
              <Server class="engine-switch-icon" aria-hidden="true" />
              <span class="engine-switch-text">{homeLabel()}</span>
            </SlidingTabs.Trigger>
          </SlidingTabs.List>
        </SlidingTabs.Root>
      </div>
    </Show>
  );
}
