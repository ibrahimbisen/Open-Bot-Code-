import type { ServerConnectionState } from "@codebot/contracts/ipc";
import type { AppTextKey } from "@codebot/i18n";
import { Button, IconButton, UserRound } from "@codebot/ui";
import { useText } from "@codebot/ui/text";
import { Show } from "solid-js";
import { useAuth } from "../account/account-context";
import { useServerSettings } from "../servers/server-settings";
import { useServers } from "../servers/servers-context";
import { useSettings } from "../settings/settings-context";
import { StatusBarMount } from "../status-bar/StatusBarMount";

const SERVER_STATE_LABEL = {
  online: "project.status.server.online",
  connecting: "project.status.server.connecting",
  offline: "project.status.server.offline",
  error: "project.status.server.error",
  incompatible: "project.status.server.incompatible",
} as const satisfies Record<ServerConnectionState, AppTextKey>;

export function ProjectStatusEntries(props: { compact: boolean }) {
  const { t } = useText();
  const auth = useAuth();
  const { activeServer, activeServerId } = useServers();
  const settings = useSettings();
  const { openServerSettings } = useServerSettings();
  const accountName = () => {
    const user = auth.visibleSignedInAccount();
    return user ? (user.name ?? user.email) : t("project.status.account.local");
  };
  const serverName = () => activeServer()?.name ?? t("sidebar.topbar.localServer");
  const serverState = (): ServerConnectionState => activeServer()?.state ?? "online";
  const serverLabel = () =>
    t("project.status.server.entry", { name: serverName(), state: t(SERVER_STATE_LABEL[serverState()]) });
  const openAccount = (button: HTMLElement) => settings.openAppSettings(button, "profile");
  const openServer = (button: HTMLElement) => openServerSettings(activeServerId(), button, null);
  return (
    <div class="project-status-entries" data-compact={props.compact ? "" : undefined}>
      <Show
        when={!props.compact}
        fallback={
          <>
            <IconButton
              label={t("project.status.account.entry", { name: accountName() })}
              size="icon-sm"
              variant="ghost"
              class="project-status-account"
              onClick={(event) => openAccount(event.currentTarget)}
            >
              <UserRound />
            </IconButton>
            <IconButton
              label={serverLabel()}
              size="icon-sm"
              variant="ghost"
              class="project-status-server"
              onClick={(event) => openServer(event.currentTarget)}
            >
              <span class="project-server-dot" data-state={serverState()} aria-hidden="true" />
            </IconButton>
          </>
        }
      >
        <Button
          variant="ghost"
          class="project-status-entry project-status-account"
          aria-label={t("project.status.account.entry", { name: accountName() })}
          onClick={(event) => openAccount(event.currentTarget)}
        >
          <UserRound />
          <span class="project-status-entry-text">{accountName()}</span>
        </Button>
        <Button
          variant="ghost"
          class="project-status-entry project-status-server"
          aria-label={serverLabel()}
          onClick={(event) => openServer(event.currentTarget)}
        >
          <span class="project-server-dot" data-state={serverState()} aria-hidden="true" />
          <span class="project-status-entry-text">{serverName()}</span>
          <span class="project-status-entry-detail">{t(SERVER_STATE_LABEL[serverState()])}</span>
        </Button>
        <StatusBarMount />
      </Show>
    </div>
  );
}
