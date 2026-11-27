import { isUpdateActivePhase } from "@codebot/contracts/ipc";
import { AGENT_TASKS_CAPABILITY } from "@codebot/contracts/team-protocol/agent-tasks-v1";
import { CRM_CAPABILITY } from "@codebot/contracts/team-protocol/crm-v1";
import { ServerMenu } from "@codebot/ui/features/servers/ServerMenu";
import { PageRail, type PageRailPage } from "@codebot/ui/features/window/PageRail";
import { useText } from "@codebot/ui/text";
import { Show } from "solid-js";
import { appPort } from "../../app-port";
import { useLayout } from "../../layout";
import { WorkflowsPage } from "../../lazy-views";
import { usePlatform } from "../../platform";
import { useAdvancedFeatures } from "../advanced/advanced-features-context";
import { useCustomAgents } from "../custom-agents/custom-agents-context";
import { serverHasStorage } from "../files/storage-usage";
import { useServerActions } from "../servers/server-actions";
import {
  activeServerHasProviderSettings,
  serverCanAdminister,
  serverSupportsCapability,
} from "../servers/server-capabilities";
import { useServerSettings } from "../servers/server-settings";
import { useServers } from "../servers/servers-context";
import { useSettings } from "../settings/settings-context";
import { useUpdates } from "../updates/updates-context";
import { useWhatsNew } from "../updates/whats-new-context";
import { usePlanLimitRows } from "../usage/plan-limit-rows";
import { useUsage } from "../usage/usage-context";
import { createWorkflowMediaCredits } from "../workflows/workflow-media-credits";
import { desktopMediaCredits } from "../workflows/workflows-port";
import { RailHelpMenu } from "./RailHelpMenu";
import { useWindowPage } from "./window-page-context";

export function WorkspacePageRail(props: { hidden: boolean; projects?: boolean }) {
  const text = useText();
  const windowPage = useWindowPage();
  const advanced = useAdvancedFeatures();
  const { openAppSettings, setSkillsMarketplaceOpen, setPendingPluginSlug, setPendingPluginConnect } = useSettings();
  const usage = useUsage();
  const updates = useUpdates();
  const layout = useLayout();
  const whatsNew = useWhatsNew();
  const { activeServer } = useServers();
  const platform = usePlatform();
  const serverActions = useServerActions();
  const { openServerSettings, serverSettingsTarget, serverSettingsShownSection } = useServerSettings();
  const logo = () => {
    const info = platform.appInfo();
    return info && info.platform !== "darwin" ? { variant: info.variant } : undefined;
  };
  const usageRows = usePlanLimitRows();
  const mediaCredits = createWorkflowMediaCredits(
    () => (windowPage.page() === "workflows" ? usage.state.serverId : null),
    desktopMediaCredits,
  );
  const { customAgentUsage } = useCustomAgents();
  const localAgentUsage = () => (activeServer()?.kind === "local" ? customAgentUsage() : []);
  const updateNotice = () => {
    const phase = updates.status().phase;
    if (!layout.leftPanelCompact() || !isUpdateActivePhase(phase)) return undefined;
    return text.t(phase === "ready" || phase === "installing" ? "account.update.ready" : "account.update.available");
  };
  const tasksAvailable = () => {
    const server = activeServer();
    return !server || server.kind === "local" || serverSupportsCapability(server, AGENT_TASKS_CAPABILITY);
  };
  const openProviders = () => {
    const server = activeServer();
    if (!server || !activeServerHasProviderSettings(server)) return undefined;
    return (button: HTMLElement) => openServerSettings(server.id, button, "providers");
  };
  const crmShown = () => serverCanAdminister(activeServer(), CRM_CAPABILITY) && usage.crmEnabled() === true;
  function crmRailAction(): ((button: HTMLElement) => void) | undefined {
    return crmShown() ? windowPage.openCrm : undefined;
  }
  function crmConnectorsAction(): ((button: HTMLElement) => void) | undefined {
    if (!crmShown()) return undefined;
    return (button) => windowPage.openCrm(button, true);
  }
  const current = (): PageRailPage | null => {
    const page = windowPage.page();
    if (page === "agents") return "agents";
    if (page === "server-settings") {
      const providers =
        serverSettingsShownSection() === "providers" && serverSettingsTarget()?.id === activeServer()?.id;
      return providers ? "providers" : null;
    }
    return page === "pricing" ? null : page;
  };
  return (
    <PageRail
      hidden={props.hidden}
      current={current()}
      pinned={layout.railPinned()}
      onPinChange={layout.setRailPinned}
      usageRows={usageRows()}
      customAgentUsage={localAgentUsage()}
      mediaCredits={mediaCredits()}
      onMediaCredits={(provider) => {
        windowPage.leavePricing();
        setPendingPluginConnect(false);
        setPendingPluginSlug(provider);
        setSkillsMarketplaceOpen(true);
      }}
      agentsLabel={props.projects ? text.t("project.rail.projects") : undefined}
      onAgents={() => windowPage.showAgents()}
      onWorkflows={() => windowPage.openWorkflows(null)}
      onPreloadWorkflows={() => void WorkflowsPage.preload()}
      onSchedule={advanced.enabled("routines") ? windowPage.openSchedule : undefined}
      onTasks={tasksAvailable() ? windowPage.openTasks : undefined}
      onUsage={windowPage.openUsage}
      onLibrary={serverHasStorage(activeServer()) ? windowPage.openLibrary : undefined}
      onProviders={openProviders()}
      onCrm={crmRailAction()}
      onCrmConnectors={crmConnectorsAction()}
      hiddenItems={layout.railHidden()}
      onHiddenChange={layout.setRailHidden}
      onMarketplace={
        advanced.enabled("marketplace")
          ? () => {
              windowPage.leavePricing();
              setSkillsMarketplaceOpen(true);
            }
          : undefined
      }
      onSettings={(button) => (updateNotice() ? openAppSettings(button, "updates") : windowPage.openSettings(button))}
      settingsNotice={updateNotice()}
      logo={logo()}
      server={
        <Show when={platform.appInfo()}>
          <ServerMenu
            rail
            serverName={activeServer()?.name ?? text.t("sidebar.topbar.localServer")}
            servers={serverActions.orderedServers()}
            view={layout.serverView()}
            onViewChange={layout.setServerView}
            onSelect={serverActions.select}
            onAdd={serverActions.add}
            addCreatesServer={serverActions.addCreatesServer()}
            hiddenServers={serverActions.hiddenServers()}
            {...serverActions.callbacks}
          />
        </Show>
      }
      help={
        <RailHelpMenu
          version={whatsNew.state.version}
          onOpenWhatsNew={whatsNew.reopen}
          onOpenLink={(destination) => void appPort().openExternal(destination)}
          onOpenUrl={appPort().openUrl}
        />
      }
    />
  );
}
