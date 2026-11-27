# Renderer features (group B)

Base path for feature files: `src/renderer/src/features/`. All paths are repo-relative to `CodeBot/`.

## What this area is

- Group B is 19 feature folders: dynamic-island, files, onboarding, provider-updates, remote-desktop, schedule, server-setup, servers, settings, sidebar, speech, tasks, team, updates, usage, vault, web-client, window, workflows.
- Most folders reach the main process only through `window.codebot`, typed as `CodeBotDesktopApi`. Each folder has a `*-port.ts` that narrows that type.
- Heavy-use areas: `settings` (tabs), `sidebar` (left bar), `usage` (plan limits), `files` (previews), `updates` (update flow), `window` (page model and rail).
- `web-client` is a browser build of the workspace. It uses its own runtime (`web-runtime.ts`), not Electron IPC.

## Folder map

One line per folder. Details are in the sections below.

| Folder | Purpose | IPC group or data source | Settings tab |
|---|---|---|---|
| `dynamic-island` | Floating island UI and its presentation state | `dynamicIsland` (dock: `agentDock`) | `dynamic-island`, `agent-dock` |
| `files` | Library, file previews, storage usage, background processes | `storage`, `backgroundProcesses` | none (agent files are in agent settings) |
| `onboarding` | First-run flow and initial setup | `servers` port (`previewInvite`) | none |
| `provider-updates` | AI provider runtime downloads, updates and sign-in | `providerRuntimes`, `providerAdmin` | none |
| `remote-desktop` | Remote desktop sessions | `remoteDesktop` | none (setup is in server settings `desktop`) |
| `schedule` | Routine calendar and schedule view | `agent` (`routineCalendar`) | none |
| `server-setup` | First setup screen of a server | plain HTTP routes, not IPC | none |
| `servers` | Server switcher, server scope, server settings modal, members, MCP | `servers` port, `serverAdminPort()` | server settings sections |
| `settings` | App settings modal and tabs | `update`, `notifications`, `voice`, `dynamicIsland` | 15 tabs (see Settings tabs) |
| `sidebar` | Left agent sidebar, cards, pins | `agent` (sidebar layout and pin methods) | none |
| `speech` | Read-aloud, dictation and live voice | `voice` | `voice` |
| `tasks` | Task list and task conversation | `agent` (task methods) | none |
| `team` | Presence, typing and WebRTC bridge | `servers` port (presence, typing); `src/preload/team-webrtc.ts` | none |
| `updates` | App update flow, restart toasts, What's new | `update` | `updates` |
| `usage` | Usage panel and plan limit rows | `providerAdmin` (`accountUsage`), `agent` (`getHostAnalytics`) | none |
| `vault` | Vault, link-account and NEAR wallet stores | `vault` (`vault:host-*` on a host) | none (server settings `vault`) |
| `web-client` | Browser build of the workspace | hosted API `/api/browser/v2/remote/hosts/{hostId}` | none |
| `window` | Page model, page rail, settings search | no port of its own; `WorkspacePageRail.tsx` reads `window.codebot` | none (search reads `navItems`) |
| `workflows` | Workflow list, canvas and runs | `workflows` | none |

## Key files

### Settings (`settings/`)

| Path | What it owns |
|---|---|
| `settings/settings-tabs.ts` | `SettingsTab` union, `navItems`, `navItem()`, `settingsTabShown()`, `settingsRowShown()`, `dynamicIslandSettingsShown()` |
| `settings/SettingsModal.tsx` | Modal shell. `visibleNavItems`, one `Tabs.Content` per tab |
| `settings/SettingsGeneralTab.tsx` | Shared body for `general`, `appearance`, `app-behavior` (prop `part`) |
| `settings/SettingsVoiceTab.tsx`, `SettingsNotificationsTab.tsx`, `SettingsDynamicIslandTab.tsx`, `SettingsAgentDockTab.tsx`, `SettingsKeyboardTab.tsx` | Bodies of those tabs |
| `settings/settings-context.tsx` | `openAppSettings(trigger, tab)`, `openAppSettingRow(tab, anchor)` |
| `settings/setting-link-targets.ts` | `TARGETS`: maps each `SettingLinkId` to `{ tab, row }` |
| `settings/settings-port.ts` | `SettingsPort`, `settingsPort()` |
| `settings/marketplace-controller.ts` (1869 lines), `MarketplaceModal.tsx` | Marketplace state and modal |
| `settings/marketplace-plugin-catalog.ts` (10972 lines) | Catalog data, not logic |

### Window pages and shell (`window/`)

| Path | What it owns |
|---|---|
| `window/window-page-context.tsx` | `WindowPage` union, `windowPageKind()`, `SettingsKind` (`personal` or `server`), `useWindowPage` |
| `window/WindowPageView.tsx` | Renders the active page. Lazy views for usage, CRM, library, workflows |
| `window/SettingsPage.tsx` | Searchable settings index. Built from `navItems` |
| `window/WorkspacePageRail.tsx` | Far-left icon rail that switches pages |
| `window/workspace-shortcuts.ts` | `useWorkspaceShortcuts()` for `newAgent`, `toggleSidebar`, `showShortcuts` |
| `window/chat-window.ts` | `readChatWindowTarget(search)` |
| `window/restarted-start.ts` | Reads `?restarted=1` from the URL, removes it, and exposes `startsAfterRestart()` and `finishRestartedStart()` |
| `window/window.css` (1286 lines) | Window styles |

### Left sidebar (`sidebar/`)

| Path | What it owns |
|---|---|
| `sidebar/WorkspaceSidebar.tsx` (376 lines) | The left agent sidebar. Prop `peopleEnabled`. Mounted by `src/renderer/src/WorkspaceShell.tsx` |
| `sidebar/sidebar-context.tsx`, `sidebar/sidebar-port.ts` | `SidebarProvider`, `useSidebar`, `SidebarPort` |
| `sidebar/sidebar-preferences.ts` | `createSidebarPreferences({ scope, sync })`: pins, collapsed sections, tab ids |
| `sidebar/sidebar-sections.ts` | `defaultSidebarLayout()` |
| `sidebar/sidebar-pins-storage.ts`, `sidebar-sections-storage.ts`, `sidebar-tabs-storage.ts`, `sidebar-people-order.ts` | localStorage readers and writers |
| `sidebar/storage-card.ts`, `sidebar/machine-card.ts`, `sidebar/community-card.ts` | Card factories (`createStorageCard`, `createMachineCard`) |
| `sidebar/SidebarAlertCards.tsx`, `sidebar/server-upgrade-offer.tsx` | Alert cards and upgrade offer |

### Usage (`usage/`)

| Path | What it owns |
|---|---|
| `usage/usage-context.tsx` | `UsageProvider`, `useUsage`. Holds the host pane view (`HostPaneView`) |
| `usage/AgentUsagePanel.tsx` (327 lines) | Usage panel: metric and period selects, host analytics |
| `usage/UsageMachine.tsx` | Machine and storage meter |
| `usage/plan-limit-rows.ts` | `usePlanLimitRows()`: plan-limit rows for the account |
| `usage/background-refresh.ts` | `createBackgroundRefresh(run, intervalMs = 15000)` |
| `usage/usage-port.ts` | `UsagePort`, `usagePort()` |

### Files and library (`files/`)

| Path | What it owns |
|---|---|
| `files/files-port.ts` | `FilesPort`, `filesPort()`, `onLibraryFoldersChanged` |
| `files/ServerLibrary.tsx` (230 lines) | Server library: preview or open files |
| `files/storage-usage.ts` (256 lines) | `createStorageUsage(target, calls)`: `fileAction()`, usage cache, `hostedPlanStorageGb()`, `canManageStorage()` |
| `files/ServerStoragePanel.tsx`, `files/ChatFilesPanel.tsx`, `files/AgentFilesSettings.tsx`, `files/LibraryPanel.tsx` | Panels |
| `files/library-folders.ts`, `files/library-rows-storage.ts` | Library folders; collapsed rows and favorites in localStorage |
| `files/machine-resources.ts` | `createMachineResources()`. `MACHINE_RESOURCES_SHOWN = false` |
| `files/server-background-processes.ts` | Background process list and stop |

### Updates (`updates/`)

| Path | What it owns |
|---|---|
| `updates/updates-context.tsx` | `UpdatesProvider`, `useUpdates`: `runAction()`, restart functions |
| `updates/updates-port.ts` | `UpdatesPort`, `updatesPort()`, `idleRestartTarget(status)` |
| `updates/SidebarUpdateIsland.tsx` | Update island in the sidebar |
| `updates/scheduled-update-toast.ts`, `updates/idle-restart-toast.ts`, `updates/host-restart-toast.ts` | Toasts |
| `updates/whats-new-context.tsx`, `updates/WhatsNewOverlay.tsx` | What's-new state and overlay |
| `updates/whats-new-releases.ts`, `updates/whats-new-history.ts` | Loader and version history |
| `updates/whats-new-releases.json` (2043 lines), `updates/whats-new/<locale>.json` (14 files) | Release notes: English and translated |

### Provider updates (`provider-updates/`)

| Path | What it owns |
|---|---|
| `provider-updates/provider-runtime-store.ts` (421 lines) | `createProviderRuntimeStore()`: runtime status, downloads, update checks |
| `provider-updates/remote-provider-runtimes.ts` | Same store, backed by `providerAdmin` on a host |
| `provider-updates/provider-connection.ts` (647 lines) | `createProviderConnection()`: provider sign-in |
| `provider-updates/provider-connect-route.ts` | `ProviderSignInMethod`, `providerConnectRoute()` |
| `provider-updates/provider-update-toast.tsx` | Update toasts and "offer closed" memory |

### Remote desktop, schedule, tasks

| Path | What it owns |
|---|---|
| `remote-desktop/remote-desktop-context.tsx` (298 lines), `remote-desktop-port.ts` | Session list, connect, disconnect, display select |
| `schedule/SchedulePanel.tsx` (235 lines) | `SchedulePanel`, `ScheduleView` |
| `schedule/schedule-port.ts` | `ScheduleSource`, `changesSchedule()`, `desktopScheduleSource()` |
| `schedule/routine-timezone-prompt.ts` (279 lines), `schedule-routine-create.ts` | Routine helpers |
| `tasks/TasksView.tsx` (932 lines), `tasks/TasksPanel.tsx` | Task list and task conversation |
| `tasks/tasks-port.ts` | `TasksSource`, `isTaskEvent()` |

### Speech and vault

| Path | What it owns |
|---|---|
| `speech/speech-playback.ts` (583 lines) | Read-aloud and recording playback. Pause, resume, seek, stop, hold, release |
| `speech/speech-replies.ts` (503 lines) | Dictated replies: `noteDictatedMessage()`, `readDictatedReplies()`, `toggleSpokenReply()` |
| `speech/speech-model.ts`, `speech/voice-server.ts` | Model readiness and voice server |
| `speech/codex-live-access.ts` | `codexLiveAccess(providers)`: returns `ready` or `signIn` for Codex live voice |
| `speech/speech-port.ts` | `SpeechPort` (`voice` and `agent` subsets) |
| `vault/vault-port.ts` | `VaultCalls`, `desktopVaultCalls()`, `remoteVaultCalls()` |
| `vault/ServerVaultPanel.tsx` | Host vault panel (server settings `vault` section) |
| `vault/stores/*.ts` | `vault-store.ts`; `link-account-store.ts` (linked account state from `window.codebot.linkAccount`); `near-wallet-store.ts` (NEAR wallet state from `window.codebot.nearWallet`, used by `conversation/near-payment-approval.tsx`) |

### Onboarding and server setup

| Path | What it owns |
|---|---|
| `onboarding/FirstRunFlow.tsx` (465 lines) | First-run flow. Steps: `"choose"`, `"plan"`, `"computer"` |
| `onboarding/InitialSetup.tsx`, `onboarding/SetupProviderPicker.tsx` (740 lines) | Setup and provider picker |
| `onboarding/onboarding-port.ts`, `onboarding/onboarding-context.tsx` | Setup state, invite previews, analytics default |
| `onboarding/setup-next.ts` | `createSetupNext(providers)` |
| `server-setup/ServerSetupScreen.tsx` (234 lines), `server-setup/server-setup-port.ts` | Setup screen. Plain HTTP calls, not IPC |

### Servers (`servers/`)

| Path | What it owns |
|---|---|
| `servers/servers-port.ts` | `ServersPort`, `serversPort()`, `serverAdminPort()`, `activeServerId()` |
| `servers/servers-context.tsx` (459 lines) | `ServersProvider`, `useServers` |
| `servers/server-scope.tsx` (481 lines) | `ServerScopeProvider`, `useServerScope`: scopes calls to a server |
| `servers/server-settings.tsx` (474 lines) | `ServerSettingsProvider`, `useServerSettings` |
| `servers/server-capabilities.ts` (313 lines) | `serverSupportsCapability()`, `serverCanAdminister()`, `serverCanManageMcp()`, `remoteAdminServer()` |
| `servers/ServerSettingsModal.tsx` (995 lines) | Server settings modal and `ServerSettingsSection` type |
| `servers/server-settings-section.ts` | `ServerSettingsSectionHost` interface |
| `servers/server-update-flow.tsx` (614 lines) | Host update flow: `checkServerUpdate()`, `showServerUpdate()`, `serverUpdateBadge()` |
| `servers/RemoteDesktopSetup.tsx` (490 lines), `ServerDesktopPanel.tsx` | Remote desktop setup for a server |
| `servers/ServerMembersSection.tsx` (1068 lines), `ServerRolesSection.tsx`, `ServerAuditSection.tsx` | People sections |
| `servers/McpServerForm.tsx` (719 lines), `McpServerControls.tsx`, `mcp-servers.ts` | MCP server management |
| `servers/AddServerOverlay.tsx` (687 lines), `WorkspaceServerRail.tsx` | Add server flow and server switcher rail |

### Team, web client, workflows, dynamic island

| Path | What it owns |
|---|---|
| `team/team-context.tsx`, `team/team-port.ts`, `team/team-typing.ts` | Presence and typing |
| `team/team-webrtc.ts` (1135 lines) | WebRTC bridge (`BridgeCommand`, `connect`, ICE policy) |
| `team/team-webrtc-framing.ts` | Re-exports `encodeTeamWebRtcPayload` and `TeamWebRtcPayloadDecoder` from `@codebot/team-client` |
| `team/team-webrtc-private-network.ts`, `team/reader-identity.ts` | Private-network SDP; reader identity (also used by `web-client/WebWorkspace.tsx`) |
| `web-client/WebApp.tsx` (723 lines) | Entry: `WebApp(props.createRuntime?)` |
| `web-client/WebWorkspace.tsx` (4294 lines) | Browser workspace UI |
| `web-client/web-runtime.ts` (2113 lines) | `createWebWorkspaceRuntime()`, `WebWorkspaceRuntime`, `WebHostConnectionError` |
| `web-client/web-client-context.tsx` (2687 lines) | `createWebWorkspace()`, `WebRuntimeFactory` |
| `web-client/web-host-connections.ts` (453 lines), `web-host-lock.ts`, `web-host-lifecycle.ts` | Host connections, one-tab lock, lifecycle |
| `web-client/web-*.ts` | Adapters for workflows, schedule, tasks, usage limits, vault, marketplace, billing, notifications |
| `workflows/workflows-controller.ts` (944 lines) | `createWorkflowsController()`: workflow CRUD, runs, steps, versions |
| `workflows/workflows-port.ts` (321 lines) | `WorkflowHost`, `desktopWorkflowHost()` |
| `workflows/WorkflowsCanvas.tsx`, `WorkflowsPage.tsx` | Canvas and page |
| `dynamic-island/DynamicIslandSurface.tsx` (383 lines) | Island UI. Rendered by `src/renderer/src/helper.tsx` |
| `dynamic-island/dynamic-island-bridge.tsx`, `dynamic-island-context.tsx`, `dynamic-island-port.ts` | Bridge (mounted in `src/renderer/src/app-providers.tsx`), context, port |

## How it works

### Port pattern and IPC

- Each `*-port.ts` returns `window.codebot`, typed with `Pick<CodeBotDesktopApi[...]>`. Tests pass fakes through these types. `AgentUsagePanel` also takes a `port` prop.
- Contract: `packages/contracts/src/ipc-endpoints.ts`. Each group is an object of `request<In, Out>()("channel")`, `event<T>()("channel")`, `scopedQuery<...>()` or `scopedRequest<...>()`.
- `packages/contracts/src/ipc-desktop-apis.ts` defines `CodeBotDesktopApi`.
- Decoders for replies: `src/preload/*-decoding.ts`, wired in `src/preload/index.ts`.
- Scoped endpoints take a server id argument. Local and host variants can use different channels. Example: `vault:list` (local) and `vault:host-list` (host).

### IPC groups used here

| Contract group | Channels confirmed in contract | Used by |
|---|---|---|
| `update` | `update:get-status`, `:check`, `:download`, `:install`, `:get-preference`, `:set-preference`, `:cancel-scheduled-restart`, `:restart-when-idle`, `:cancel-idle-restart`, `:restart-now`; events `update:event`, `update:preference-event` | `updates/`, `settings/` |
| `dynamicIsland` | `dynamic-island:get-preference`, `:set-preference`, `:publish-presentation`, `:get-presentation`, `:perform-action`, `:perform-haptic`, `:set-interactive`, `:set-input-region`, `:set-xwayland`, `:get-built-in-display-geometry`; events for presentation, preference, geometry, action | `dynamic-island/`, `settings/` |
| `storage` | `storage:get-usage`, `:get-disk`, `:get-machine-metrics`, `:delete-file`, `:clear`, `:open-file`, `:open-location` | `files/`, `sidebar/` |
| `backgroundProcesses` | `background-processes:list`, `:stop` | `files/` |
| `providerRuntimes` | `provider-runtimes:get-status`, `:download`, `:cancel`, `:measure-download`, `:remove-download`, `:check-for-updates`; event `:event` | `provider-updates/` |
| `providerAdmin` | `provider-admin:account-usage` (scoped) | `usage/`, `provider-updates/remote-provider-runtimes.ts` |
| `remoteDesktop` | `remote-desktop:check-setup`, `:open-setup`, `:test`, `:list`, `:connect`, `:select-display`, `:disconnect`; event `:event` | `remote-desktop/`, `servers/RemoteDesktopSetup.tsx` |
| `vault` | `vault:list`, `:save`, `:delete`, `:reveal`, `:copy`, `:import-csv`, `:reset`, `:codes`; event `:changed`; `vault:host-*` variants | `vault/` |
| `workflows` | `workflows:list`, `:get`, `:create`, `:rename`, `:setPaused`, `:export-file`, `:delete`, `:save-graph`, `:versions`, `:version-graph`, `:restore-version`, `:start-run` and more | `workflows/`, `web-client/web-workflows.ts` |
| `voice` | `voice:get-model-status`, `:get-model-statuses`, `:prepare-model`, `:download-model`, `:cancel-model-download` and more | `speech/`, `settings/SettingsVoiceTab.tsx` |
| `notifications` | `notifications:get-preference`, `:set-preference`, `:test`, `:open-settings` | `settings/` |
| `agent` (methods) | `listTasks`, `readTask`, `startTask`, `sendMessage`, `stopTask`, `reopenTask`, `closeTask`, `getHostAnalytics`, `listAgents`, `routineCalendar`, `getSidebarLayout`, `mutateSidebarLayout`, `getSidebarPins`, `setSidebarPins`, `seedSidebarPins`, `onScopedEvent` | `tasks/`, `usage/`, `schedule/`, `sidebar/` |

Settings preference getters (`getAppBehaviorPreference`, `getExternalLinkPreference`, `getAnalyticsPreference`, and others) come from `settings/settings-port.ts`. Their channel names were not read.

### Settings tabs

1. `settings/settings-tabs.ts` is the source of truth. The `SettingsTab` union has 15 values: `general`, `appearance`, `app-behavior`, `notifications`, `voice`, `keyboard`, `dynamic-island`, `agent-dock`, `computer-use`, `profile`, `billing`, `referral`, `mobile-connect`, `updates`, `hosted-servers`.
2. Each `navItems` entry has `value`, `titleKey`, `descriptionKey`, `icon`, optional `group`, and `rows`. A row has `titleKey`, optional `descriptionKey`, and optional `macOS` (`true` shows on macOS only, `false` on non-macOS only).
3. Visibility:
   - `settingsTabShown(tab, { platform, chatWindow })`: `hosted-servers` is always hidden. `dynamic-island` needs a known platform and a non-chat window. `agent-dock` needs a known platform and a non-chat window.
   - `settingsRowShown(row, platform)` checks the `macOS` flag.
4. `SettingsModal.tsx` filters `navItems` into `visibleNavItems`. `agent-dock` also needs `props.agentDock !== undefined`. Each visible tab has a `Tabs.Content` with `data-tab`. `initialTab` or `openTab` of `hosted-servers` opens `billing`.
5. `general`, `appearance` and `app-behavior` all render `SettingsGeneralTab` with different `part` values.
6. Opening from code: `openAppSettings(trigger, tab)` and `openAppSettingRow(tab, anchor)` are defined in `settings-context.tsx` and exposed through `useSettings()`. Chat deep links go through `setting-link-targets.ts`.
7. `window/SettingsPage.tsx` builds its search rows from `navItems` and opens the modal with `openAppSettings(null, row.tab)`. So one `navItems` entry feeds both places.
8. Server settings are a separate modal. `ServerSettingsSection` has 18 values: `general`, `personality`, `agents`, `memory`, `vault`, `members`, `roles`, `audit`, `desktop`, `storage`, `sites`, `providers`, `updates`, `import`, `transfer`, `routines`, `browser-profiles`, `experimental`. Some depend on `sectionSupported()`. Example: `vault` needs `props.vault`; `agents` needs `agents.available()`.

### Sidebar

- Left-to-right in `src/renderer/src/WorkspaceShell.tsx`: `WorkspacePageRail` (line 357), `WorkspaceServerRail` (line 393), `WorkspaceSidebar` (line 395).
- `WorkspaceSidebar.tsx` also renders `SidebarUpdateIsland` (line 347).
- Shared layout comes from `agent.getSidebarLayout` and `agent.mutateSidebarLayout`. Pins come from `getSidebarPins`, `setSidebarPins`, `seedSidebarPins`.
- Section ids (`packages/contracts/src/ipc-sidebar-layout.ts`): `people` and `unassigned`.
- Local-only state is in localStorage (see Gotchas). Pins are stored per scope (server id) inside one key.
- Cards are factories that take a server accessor and a port (default `sidebarPort`).

### Usage and plan limits

- Host pane views (`HostPaneView`): `usage`, `schedule`, `tasks`, `workflows`, `library`, `crm`. `usage-context.tsx` opens each one.
- `AgentUsagePanel`:
  - Metrics: `cost` (default), `tokens`. Periods: `7d`, `30d` (default), `90d`, `1y`. Defined in `packages/ui/src/features/usage/usage-format.ts`.
  - Loads `agent.getHostAnalytics({ startDate, endDate, timeZone, agentId? }, serverId)` and `agent.listAgents(serverId)`.
  - Reloads on range change and on scoped events. Background refresh has a 15 s minimum gap.
  - Sends the `usage_viewed` analytics event.
- `UsageMachine.tsx` shows the machine meter. It needs `MACHINE_RESOURCES_CAPABILITY` and `STORAGE_USER_FILES_CAPABILITY`. The plan size comes from `hostedPlanStorageGb()`.
- Plan limit rows (`plan-limit-rows.ts`):
  - Start from `auth.accountUsage()` merged with `withHostAccountUsage(...)`.
  - Rows come from `accountUsageProviderRows()` (`@codebot/ui/features/account/account-usage-view`).
  - A model is "held" when `usageLimitedModels()` reports a limit that `spentUsageWindow()` still covers. Held rows show 0% remaining (`usageTone(0)`). Imports are from `@codebot/team-client/plan-limits`.
  - Reset times use `formatUsageReset()`.
- Web variant: `web-usage-limits.ts` (`agent-usage-limit-v1`) and `web-account-usage.ts` (reacts to `usage-changed`).

### Files and previews

- `storage-usage.ts` reads usage through `storage.getUsage` and acts on files through `storage.openFile({ fileId, action }, serverId)`.
- Preview decision in `ServerLibrary.tsx`: if `canPreviewAttachment(file)` is true and `previewUrl` is set, it calls `attachmentFilePreview(file)` and opens `FilePreviewPanel` (lazy, from `../conversation/`). If the preview kind is `"none"`, or the file cannot be previewed, it calls `act(file, "open")`, which uses `storage:open-file`.
- Library folder changes come through the scoped event `library-folders-changed`, wrapped by `filesPort().onLibraryFoldersChanged`.
- Chat and agent lists use `ConversationFilesPanel` from `@codebot/ui`.

### Updates

- `UpdatesProvider` holds a `status` signal, starting from `FALLBACK_UPDATE_STATUS`. It loads `update:get-status` and then listens to `update:event`.
- `runAction()`:
  1. If `managedByHost === true`, return.
  2. If phase is `ready`, call `update.install()`.
  3. If phase is `available`, or `error` with `errorCode === "download_failed"`, call `update.download()`.
  4. Otherwise call `update.check()`.
  - Each step sends an `update_action` analytics event.
- Restart: `idleRestartTarget(status)` returns `"update"` only when phase is `ready` and not host-managed. Otherwise it returns `"relaunch"`.
- Toasts: scheduled-restart toast, idle-restart toast (opens the `updates` tab via `openAppSettings(null, "updates")`), host restart toasts.
- Preference (`UpdatePreference`, `packages/contracts/src/ipc-app-auth.ts`): `autoDownload`, `allowRemoteUpdates`, `autoInstall`.
- Failure codes: `check_failed`, `download_failed`, `install_failed` (`UPDATE_FAILURE_CODES`). Restart modes: `when-idle`, `now` (`UPDATE_RESTART_MODES`).
- Host (server) updates are separate: `servers/server-update-flow.tsx`, with `HostUpdateStatus` from `packages/contracts/src/ipc-host-update.ts`.
- What's new:
  - `whats-new-context.tsx` decides when to open the overlay. It calls `load(automatic, version, from)`.
  - `whats-new-history.ts` keeps the last shown version in localStorage (`codebot:whats-new-version`). `claimWhatsNewVersion()` prevents a second display.
  - `whats-new-releases.ts` loads the English JSON with Vite `?url&no-inline` imports. Translated JSON is fetched for other locales. A missing version falls back to English.
  - Source notes live in `changelog.d/*.md` (see `changelog.d/README.md`).

### Provider updates

- `ProviderRuntimeSource` is `ProviderRuntimesDesktopApi` without `measureDownload` and `removeDownload`.
- Store flow: `checkForUpdates()` runs first. Downloads report progress and retry. Errors map to codes (for example `installRecordMismatch` maps to `checksum_failed`).
- `provider-update-toast.tsx`: `showProviderUpdateToast()`, `reportProviderUpdateToast()`, `dismissProviderUpdateToast()`. `providerUpdateOfferClosed(provider, availableVersion)` remembers a closed offer.
- Sign-in methods (`ProviderSignInMethod`): `browser`, `relay`, `host-page`, `code`, `use-app`, `address`.

### Remote desktop and schedule

- Remote desktop: `remote-desktop-context.tsx` keeps the session list from `remoteDesktop.list()` and `remoteDesktop.event`. Setup checks (`checkSetup`, `openSetup`, `test`) are on `serversPort().remoteDesktop` (`servers/servers-port.ts`). `servers/RemoteDesktopSetup.tsx` calls them.
- `WorkspaceShell.tsx` hides the page rail while a remote desktop workspace is visible.
- Schedule: `desktopScheduleSource()` calls `agent.routineCalendar(input, serverId)`. It reloads on `changesSchedule()` events: `routines-changed`, `channel-routines-changed`, `agents-changed`, and `turn-completed` with `origin === "routine"`. It also reloads when the server comes back online.

### Tasks and speech

- Tasks: `TasksView.tsx` uses `agent.listTasks`, `readTask`, `startTask`, `sendMessage`, `stopTask`, `reopenTask`, `closeTask`, plus attachment calls and `voice.submit`. Events: `agent-tasks-changed`, `agent-task-conversation`, `agent-task-conversation-delta`.
- Speech playback keeps one shared playback state. `holdSpeech(agent)` and `releaseSpeech(agent, resume)` let other audio take over. Waveforms use `SPEECH_LEVEL_COUNT = 40`.
- Dictated replies link a sent message to the reply to read back (`noteDictatedMessage`, `claimDictatedSend`, `readDictatedReplies`).

### Vault

- `VaultCalls` is the shared interface. `desktopVaultCalls()` maps it to `vault:*`. `remoteVaultCalls()` is used for a host. `importCsv` is optional.

### Onboarding and server setup

- `FirstRunFlow` steps: `choose` (has a `path`, for example `free`), `plan`, `computer`. `createSetupNext()` picks the next step. Transitions use `firstRunTransition()` (`onboarding/first-run-transition.ts`).
- Server setup uses plain HTTP, not IPC. `server-setup-port.ts` sends `GET /api/status`, `POST /api/login/start`, `POST /api/login/verify`, `POST /api/retry` (routes in `packages/contracts/src/server-setup.ts`). Every call sends `x-codebot-setup: 1`. Answers are `SetupAnswer { ok, values }`.

### Team, web client, workflows, dynamic island

- Presence: `team-context.tsx` reads `servers.onPresence`. Typing goes through `servers.setTyping`.
- `team-webrtc.ts` runs as a bridge. It posts `bridge-ready`, then handles `connect` commands (signal URL, token, peer, `iceTransportPolicy` `all` or `relay`). `src/preload/team-webrtc.ts` passes the port.
- `WebApp.tsx` is the browser entry. `scripts/web-client-perf-e2e.ts` and `apps/auth-api/renderer-preview-alias.ts` both point to it.
- `web-runtime.ts` calls the hosted API under `/api/browser/v2/remote/hosts/{hostId}` through `accountFetch`.
- Host state (`WebHostState`): `unknown`, `connecting`, `online`, `offline`, `error`, `incompatible`.
- `acquireWebHostLock()` (`web-host-lock.ts`) makes sure only one tab drives a host. It needs `navigator.locks`.
- Workflows: `workflows-controller.ts` handles all workflow actions. `desktopWorkflowHost()` picks the local or host channel.
- Dynamic island: the bridge passes presentation and preference state to `DynamicIslandSurface`. Haptics use `performHaptic`.

### Window page model

- `WindowPage`: `agents`, `tasks`, `schedule`, `workflows`, `usage`, `library`, `crm`, `marketplace`, `settings`, `server-settings`, `credits`, `pricing`.
- `windowPageKind()`: `settings` for the two settings pages, `agents` for `agents` and `tasks`, `titled` for the rest.
- `WindowPageView.tsx` renders the page. Pricing mounts through a portal (`setPricingMount`).

## How to change it

### Add a settings tab

1. Add the value to the `SettingsTab` union in `settings/settings-tabs.ts`.
2. Add a `navItems` entry with `titleKey`, `descriptionKey` (i18n keys), `icon` (from `@codebot/ui`), optional `group`, and `rows`.
3. If it is platform- or window-specific, add a rule to `settingsTabShown()`.
4. In `settings/SettingsModal.tsx`, add `<Tabs.Content value="<tab>" data-tab="<tab>">` with the body component. The tab shows up in `visibleNavItems` automatically.
5. For chat deep links, add a `SettingLinkId` in `packages/contracts/src/setting-links.ts` and a `TARGETS` entry in `settings/setting-link-targets.ts`.
6. `window/SettingsPage.tsx` picks up the new rows through `navItems` (code path read, not run).

### Add a row to an existing settings tab

- Add `{ titleKey, descriptionKey?, macOS? }` to that tab's `rows` in `settings/settings-tabs.ts`. Add the control in the tab body. Add the i18n keys first.

### Add a server settings section

1. Add the value to `ServerSettingsSection` in `servers/ServerSettingsModal.tsx` (line 187).
2. Add `{ value, icon, group? }` to `NAV_SECTIONS` (line 271).
3. Add search words to `SECTION_ROWS` (line 232).
4. Add a `case` to `sectionSupported()` (line 417) if it needs a condition.
5. Add `Tabs.Content value="<section>" data-tab="<section>"` in the modal body.
6. Use `ServerSettingsSectionHost` (`servers/server-settings-section.ts`) for shared props (`run`, `busy`, `published`, `showCopyError`).

### Add a sidebar card

1. Create `createXCard(server: () => ServerSummary | undefined, port: () => SidebarCardsPort = sidebarPort)` in `sidebar/`, following `machine-card.ts`.
2. Store dismissal under a `codebot:<name>-card-dismissed` key in localStorage, inside try/catch. `machine-card.ts` and `storage-card.ts` use a prefix (`codebot:machine-card-dismissed:`, `codebot:storage-card-dismissed:`).
3. Render it from `sidebar/WorkspaceSidebar.tsx`.
4. If it needs new data, add a method to `SidebarPort` and the endpoint in `packages/contracts/src/ipc-endpoints.ts`.

### Change plan-limit display

- Held-model logic and row building: `usage/plan-limit-rows.ts`.
- Row shape and reset text: `packages/ui/src/features/account/account-usage-view.ts` (`accountUsageProviderRows`, `formatUsageReset`).
- Tone thresholds: `usageTone` in `packages/team-client/src/plan-limits.ts` (also has `spentUsageWindow`).

### Add a usage metric or period

1. Add to `usageMetrics` or `usagePeriods` (and `usagePeriodDays`, labels) in `packages/ui/src/features/usage/usage-format.ts`.
2. Update the `UsageSelect` usage in `usage/AgentUsagePanel.tsx`.
3. Confirm the host accepts the range (`HostAnalyticsInput`, `analyticsRange`).

### Add a window page

1. Add the name to `WindowPage` in `window/window-page-context.tsx`. Update `windowPageKind()` if needed.
2. Add the lazy import in `src/renderer/src/lazy-views.ts`.
3. Add the branch in `window/WindowPageView.tsx`.
4. Add a button in `window/WorkspacePageRail.tsx`.

### Add an update preference

1. Add the field to `UpdatePreference` in `packages/contracts/src/ipc-app-auth.ts`. `UpdatePreferenceChange` is `Partial`, so it follows.
2. Add a row to the `updates` tab in `settings/settings-tabs.ts`, and the control in the `SettingsUpdatesTab` component (`packages/ui`).
3. The main-process side is in `src/main/ipc/update-handlers.ts`.

### Add a release note

- Add `changelog.d/<branch-name>.md` (`/` becomes `-`). Use the group rules in `docs/RELEASING.md`.
- Translations: `updates/whats-new/<locale>.json`. Locales come from `TRANSLATED_LOCALES` in `packages/i18n/src/locale.ts`.
- `scripts/whats-new-translations.ts` builds the locale files. `.github/workflows/ci.yml` and `.github/workflows/release.yml` run `bun scripts/whats-new-translations.ts`. There is no `package.json` script for it.

### Add a file preview kind

- Change `canPreviewAttachment()` in `packages/contracts/src/ipc-attachments.ts`.
- Change the branch in `files/ServerLibrary.tsx` (around lines 121 to 126) and the `onPreviewFile` props in `ChatFilesPanel.tsx` and `AgentFilesSettings.tsx`.

### Add a new IPC call for a feature

1. Add `request<In, Out>()("group:name")` (or `scopedRequest`) in `packages/contracts/src/ipc-endpoints.ts`.
2. `ipc-desktop-apis.ts` derives the type from the endpoints.
3. Add a decoder in `src/preload/<group>-decoding.ts` and wire it in `src/preload/index.ts`.
4. Add the method to the feature's `*-port.ts` `Pick<>` type. Call it through the port, not `window.codebot`.

## Gotchas

- Some folders call `window.codebot` directly, outside their port file (for example `schedule/schedule-port.ts` and `workflows/workflows-port.ts`). Prefer the port for new calls.
- `settingsTabShown("hosted-servers")` is always false. Opening it lands on `billing`.
- `agent-dock` hides when `props.agentDock` is `undefined`, even on a supported platform.
- A `macOS: true` row hides on other platforms. A `macOS: false` row hides on macOS.
- Tab ids and row ids are used by deep links. Renaming a tab breaks `setting-link-targets.ts` and any saved `SettingLinkId`.
- Sidebar localStorage keys are fixed names: `codebot:sidebar-pins:v1`, `codebot:sidebar-collapsed:v1`, `codebot:sidebar-tabs:v1`, `codebot:sidebar-people-order:v1`, `codebot:sidebar-pins-pending:v1`. Server ids are values inside them, not part of the key. Renaming one drops user state. Add a new version key and migrate.
- `runAction()` silently returns when `managedByHost` is true. Host-managed desktops never download or install from this path.
- `idleRestartTarget()` returns `"relaunch"` for host-managed updates, even when the phase is `ready`.
- `MACHINE_RESOURCES_SHOWN` in `files/machine-resources.ts` is `false`, so that UI is hidden.
- A held model shows 0% remaining in plan limits. The reset time still comes from the agent when known.
- `AgentUsagePanel` defaults to `cost` and `30d`. Tests that expect other defaults need updating.
- `files-port.ts` marks `hostAdmin`, `backgroundProcesses` and several storage calls as optional. Check them before use.
- localStorage-backed state (whats-new version, sidebar prefs, card dismissal) can reset if storage is blocked. Code must work without it.
- `server-setup-port.ts` depends on the server answering its routes with the `x-codebot-setup` header. No IPC is involved.
- `team-webrtc.ts` runs in a separate bridge context. Commands are async messages.
- Large files: `web-client/WebWorkspace.tsx` (4294), `web-client/web-client-context.tsx` (2687), `web-client/web-runtime.ts` (2113), `settings/marketplace-plugin-catalog.ts` (10972, data), `servers/ServerMembersSection.tsx` (1068). Use Grep on these.

## Unverified points

- The `track` row in the Updates tab (`packages/ui/src/features/settings/SettingsUpdatesTab.tsx`): it has one label, `Stable`. What it controls is not confirmed.
- Desktop source of `auth.accountUsage()`: `src/renderer/src/features/account/account-context.tsx` holds the `accountUsage` store, but the `auth` source was not found there. Only `provider-admin:account-usage` was confirmed.
- Server-side handlers for `/api/status`, `/api/login/*` and `/api/retry`: searched `packages`, `apps` and `src`. Only the route constants in `packages/contracts/src/server-setup.ts` were found.
