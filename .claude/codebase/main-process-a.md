# Main process, files a to f (`src/main`)

## What this area is

- This area is the Electron main process code in `src/main/*.ts` whose names start with a to f, plus `src/main/AGENTS.md`.
- It holds most service classes and stores: accounts, agents, ACP registry, analytics, browser docks, computer use (CUA driver), and preferences.
- Startup and shutdown wiring live in `index.ts` (dispatcher and lifecycle) and `application-services.ts` (service construction). `index.ts` starts with `i`, so it is outside the a to f range; it is documented here because the startup wiring lives there.
- Read `src/main/AGENTS.md` first. It holds the ownership table and the trust-boundary rules.

Scope counts: 120 entries in scope. That is 116 non-test `.ts` modules, 3 test files (`chat-visual-protocol.test.ts`, `content-security-policy.test.ts`, `file-preview-pages.test.ts`), and `AGENTS.md`. Line counts: `index.ts` 2085, `application-services.ts` 4624, `AGENTS.md` 131.

## Key files

Paths are relative to `src/main/` unless shown otherwise.

### Startup, wiring and lifecycle

| Path | What it owns |
| --- | --- |
| `AGENTS.md` | Rules for `src/main`: IPC rules, trust boundary, ownership table, team API route rules. |
| `index.ts` | Dispatcher and lifecycle. Module-scope env reads, single-instance lock, `app.whenReady()` boot, `registerIpcHandlers`, `before-quit`, `prepareForShutdown`. |
| `application-services.ts` | `createApplicationServices` (line 1034), `ApplicationServiceContext` (659), `ApplicationServices` (688), `TEARDOWN_ORDER` (590 to 657), preference file name constants (527 to 585). |
| `application-services.ts` (exports) | `APPEARANCE_PREFERENCE_FILE` (537), `ApplicationServiceContext`, `ApplicationServices`, `createApplicationServices`. |
| `deep-link-router.ts` | `DeepLink` union, `parseDeepLink`, `findDeepLink`, `MCP_OAUTH_REDIRECT_URL` (`codebot://mcp-auth`). Parses invite, plugin, agent-template, marketplace, MCP auth, Slack, Discord and NEAR links. |
| `development-profile.ts` | Reads dev profile env values and derives dev instance id, user-data name, worktree colour. Also `shouldAutoStartHost`, `shouldShowDevelopmentWindow`, `readAnalyticsCaptureUrl`. |
| `development-remote-bootstrap.ts` | Dev-only remote role (`startDevelopmentRemoteRole`) and dev remote account (`applyDevelopmentRemoteAccount`). |
| `development-runtime-directory.ts` | `devRuntimeDirectory`, `developmentRemoteConnectionPath`. |
| `development-worktree-icon.ts` | `tintDevelopmentIcon`. Used for the dev worktree icon. |
| `app-behavior-service.ts` | `AppBehaviorService`. Provides `quitGuard` and `keepRunningInBackground` (read in `index.ts`). |
| `app-icon.ts` | `readAppVariant`, `resolveAppIconPath`, `resolveMenuBarIconPath`, `resolveLogoColorIconPath`. |
| `app-archive-watch.ts` | `watchAppArchive(resourcesPath, translate)`. Returns an unwatch function. Registered by `index.ts` at line 1568. |
| `background-tray.ts` | `createBackgroundTray` and `BackgroundTray`. Created in `index.ts` at line 1771. |
| `exit-watchdog.ts` | `stopStuckExitAfterLimit(logsDirectory)`. Called at module scope in `index.ts` line 416. |
| `console-output.ts` | `guardConsoleOutput`. Guards the error streams. |
| `claude-session-environment.ts` | `removeClaudeCodeSessionEnvironment`. Strips Claude Code session env vars. |
| `download-url.ts` | `DOWNLOAD_URL`, `RELEASES_URL` constants. |
| `file-preview-pages.ts` | `FilePreviewPages` class and `filePreviewPages` singleton. `index.ts` clears it on renderer load and renderer gone. |

### Accounts, auth and remote identity

| Path | What it owns |
| --- | --- |
| `account-service-access.ts` | `safeStorageCipher`, `centralAuthApiUrl` (reads `CODEBOT_AUTH_API_URL`), `createCentralAuthManager`. |
| `account-activity-reporter.ts` | `ACCOUNT_ACTIVITY_PATH` (`/v1/me/activity`), `AccountActivityReporter`, `HostAccountActivity`. |
| `central-auth-manager.ts` | `CentralAuthManager` (EventEmitter, emits `changed`). Sign-in, session, host credentials, mobile connect, remote tickets. Helpers: `readCentralAuthApiUrl`, `readMobileConnectApiUrl`, `isHostNotOnAccount`, `authApiRateLimit`, `authApiErrorCode`, `isFinalClientError`. About 2,900 lines. |
| `central-auth-effects.ts` | `CentralAuthOperationError`, `authCall`, `authDecode`, `CentralAuthTransport` service. |
| `central-auth-records.ts` | Response decoders for users, hosts, invites, members, sessions, mobile connect and email challenges. |
| `company-sign-in-browser.ts` | `CompanySignInBrowser`, `awaitCompanySignIn`. Company sign-in in an external browser. |
| `billing-service.ts` | `BillingDesktopService`. Built with `centralAuth` and `openLink`. |
| `credits-service.ts` | `CreditsDesktopService`. Built with `centralAuth` and `openLink`. |
| `credit-media-gateway.ts` | `createCreditMediaGateway`. Built in `application-services.ts` near line 2214. |
| `feedback.ts` | `feedbackFacts`, `feedbackSender`. Built with `centralAuth`. |

### Agents, folders and stores

| Path | What it owns |
| --- | --- |
| `agent-access-store.ts` | `AGENT_ACCESS_FILE` (`codebot-agent-access-v1.json`), `AgentAccessStore`, `agentAccessLevel`, `agentAccessSnapshot`, `AgentAccessStale`, `AgentAccessAudit` type. |
| `agent-admin-settings.ts` | `createAgentAdminSettings`, `AgentAdminSettingsService`, `AgentNotFoundError`. |
| `agent-defaults-settings.ts` | `createAgentDefaultsSettings`, `AgentDefaultsSettingsService`. |
| `agent-defaults-preference-store.ts` | `createAgentDefaultsPreferenceStore`, `AgentDefaultsPreferenceStore`. |
| `agent-host-settings.ts` | `createAgentHostSettings`, `AgentHostSettingsService`. |
| `agent-memory-limit-preference-store.ts` | `AgentMemoryLimitPreferenceStore`, `reloadingAgentMemoryLimit`. |
| `agent-notification-level-store.ts` | `AgentNotificationLevelStore`, `OWNER_NOTIFICATION_KEY` (`"owner"`). |
| `agent-display.ts` | `agentDisplayEnvironment`, `hasSeparateAgentDisplay`. |
| `agent-folders.ts` | `createAgentFolders`, `isProtectedFolder`, `realFolder`, `isDirectory`, `AgentFolders`. |
| `agent-instructions-files.ts` | `createAgentInstructionsFiles`, `AgentInstructionsFiles`, `AgentInstructionsRefusedError`. |
| `agent-initialization.ts` | `AgentInitializationGate<E>`. Built around line 4259 in `application-services.ts`. |
| `agent-image-fit.ts` | `fitImageForAgent`, `compactScreenshot`, `upright`, `jpegFacts`, `PNG_SIGNATURE`. |
| `agent-archive.ts` | Archive read and extract: `readArchiveEffect`, `readEntriesEffect`, `readSkillEffect`, `extractEntryEffect`, `writeTreeEffect`, `writeImportedFilesEffect`, `isUnsafeEntry`, `avatarImage`. `MANIFEST_MAX_BYTES` is 64 MiB. |
| `agent-import-manifest.ts` | `AGENT_IMPORT_MANIFEST` (`codebot-import.json`), `decodeImportManifest`, import manifest types. |
| `agent-import-service.ts` | `AgentImportService`. Calls `readArchiveEffect` (lines 403 and 567). Built near line 3045. |
| `agent-template-service.ts` | `AgentTemplateService`, `AgentTemplateFailure`. Built near line 2799. |
| `agent-marketplace-service.ts` | `AgentMarketplaceService`, `AgentMarketplaceFailure`, `localSchedule`, `validTimezone`, `imageMimeType`, `toArrayBuffer`. Built near line 2798. |
| `agent-dock-window.ts` | `AgentDockWindowController` (line 70), `requireAgentDockSender` (568), `AgentDockFailed`, `toAgentDockFailed`, `AgentDockSendAction`. Built near line 1144. |
| `agent-database-host-process.ts` | `spawnAgentDatabaseHost` (child process host for the agent database), `checkDatabaseIntegrityInHost`. |
| `approval-automation-store.ts` | `ApprovalAutomation` class, `readApprovalAutomation`, `AgentApprovalGrant`. |
| `automation-server.ts` | `AutomationServer` (line 94), `AutomationServerOptions`, `UpdatedAgent`. Built near line 2419. |
| `attachment-previews.ts` | `AttachmentPreviews` class, `PreviewFile`. Built near line 3312. |
| `archive-effects.ts` | `ArchiveOperationError`, `archiveCall`, `archiveSync`, `archiveResult`, `archiveFailure`. |
| `background-processes.ts` | `listBackgroundProcesses`, `stopBackgroundProcess`, `BackgroundProcessAgent`. |
| `custom-agent-store.ts` | `CustomAgentStore`, `CUSTOM_AGENTS_FILE` (`custom-agents.json`), `CustomAgentFailure`. |
| `custom-agent-changes.ts` | `createCustomAgentChanges`, `CustomAgentChanges`. Built near line 3008. |
| `custom-provider-store.ts` | `CustomProviderStore` (line 83), `CustomProviderCipher`, `CustomProviderFailure`. |
| `custom-provider-changes.ts` | `createCustomProviderChanges`, `CustomProviderChanges`, `PeerCustomProviderChanges`. Built near line 2992. |
| `channel-folders.ts` | `createChannelFolders`, `ChannelFolders`. Built near line 2969. |
| `browsing-memory-preference-store.ts` | `BrowsingMemoryPreferenceStore`. |
| `busy-message-mode-preference-store.ts` | `BusyMessageModePreferenceStore`. |
| `cache-expiry-compaction-preference-store.ts` | `createCacheExpiryCompactionPreferenceStore`, `cacheExpiryCompactionControl`. |
| `claude-compact-window-preference-store.ts` | `createClaudeCompactWindowPreferenceStore`, `claudeCompactWindowControl`. |
| `claude-user-setup-preference-store.ts` | `createClaudeUserSetupPreferenceStore`, `claudeUserSetupControl`. |
| `crm-preference-store.ts` | `createCrmPreferenceStore`, `crmSettingsStore`. The file name `codebot-crm-v1.json` is the `CRM_PREFERENCE_FILE` constant in `application-services.ts` (line 557). |
| `dynamic-island-preference-store.ts` | `readDynamicIslandPreference`, `writeDynamicIslandPreference`. |
| `external-link-opener.ts` | `ExternalLinkOpener` (line 44), `createExternalLinkPreferenceStore`, `openWithXdg`. Takes an injected `openDefault`; `application-services.ts` line 1076 passes `shell.openExternal`. |
| `chat-visual-preview.ts` | `ChatVisualPreviewer`. Built near line 2174. |
| `chat-visual-protocol.ts` | `chatVisualResponse`, `attachmentCorsHeaders`, `attachmentDocumentHeaders`. |
| `content-disposition.ts` | `contentDispositionFileName`, `inlineContentDisposition`. |
| `content-security-policy.ts` | `buildContentSecurityPolicy`, `readSelfHostedSignalOrigin`. Consumed by `session-configuration.ts` line 24. |

### ACP registry

| Path | What it owns |
| --- | --- |
| `acp-registry.ts` | `AcpRegistry` class (line 50): `listInstalled`, `search`, `install`, `uninstall`, `close`. Writes `installed.json` under its root. `createAcpRegistry` (341). Built near line 3009. |
| `acp-registry-catalog.ts` | `RegistryAgent` schema, `readAcpRegistry` (catalog read), `registryDownload`. |
| `acp-registry-install.ts` | `registryDistributions`, `prepareRegistryAgent`, `RegistryPrepared`. |
| `acp-registry-process.ts` | `runRegistryInstaller`. Runs the installer process. |

### Analytics and diagnostics

| Path | What it owns |
| --- | --- |
| `analytics.ts` | `HostAnalytics` class (line 484). Event methods include `handleAgentEvent` (555), `handleStartup` (703), `handleFailure` (749), `handleToolUsage` (778), `handleWorkflowRun` (792), `handleCreditMedia` (818), `handleSiteVisit` (885), `flushPending` (900), `clear` (918). `close` is an `Effect.fn` property at `analytics.ts` line 1326. `application-services.ts` line 3796 calls it. Option and inventory types. |
| `analytics-effects.ts` | `AnalyticsOperationFailure`, analytics effect helpers. |
| `analytics-install-id.ts` | `readAnalyticsInstallId` (file `codebot-analytics-install-id-v1.json`). |
| `analytics-inventory.ts` | `analyticsInventoryDayStore`, `collectAnalyticsInventory`. |
| `analytics-plugin-catalog.ts` | `loadCatalogPluginServers`, `isReportedMcpServerName`, `catalogPluginSlug`. Reads `catalog.json`. |
| `analytics-preference-service.ts` | `AnalyticsPreferenceService` (line 26), `AnalyticsAccount`. |
| `analytics-preference-store.ts` | `readAnalyticsPreference`, `readSavedAnalyticsPreference`, `saveAnalyticsDefault`, `writeAnalyticsPreference`. |
| `analytics-provider-auth.ts` | `providerAuthKind` and `PROVIDER_AUTH_KINDS` (`subscription`, `api_key`, `free`, `custom`, `unknown`). |
| `computer-activity-report.ts` | `ComputerActivityReport` class. |
| `console-output.ts` | See startup table. |

### Browser, docks and windows

| Path | What it owns |
| --- | --- |
| `browser-dock-overlay.ts` | `BrowserDockOverlay` (line 73), `browserDockLayout`, `requireBrowserDockSender` (288). Built near line 1497. |
| `browser-egress-host.ts` | `BrowserEgressHost` (extends EventEmitter). Built near line 1376. Creates `BrowserEgressMux` at line 117. |
| `browser-egress-client.ts` | `BrowserEgressClient`. Built near line 3924. Creates `BrowserEgressMux` at line 55. |
| `browser-egress-mux.ts` | `BrowserEgressMux` (line 159), `BrowserEgressStream` (Duplex), `BrowserEgressRefusedError`, frame types. |
| `browser-picture-in-picture.ts` | `BrowserPictureInPicture` (line 30), `PictureInPictureFailed`. Built near line 1465. |
| `browser-picture-in-picture-bounds.ts` | `constrainBrowserPictureInPictureBounds`, `rectanglesIntersect`, minimum sizes 300 by 220. |
| `browser-profile-service.ts` | `createBrowserProfileService` (line 109), `BrowserProfileService`, `browserProxyConnection`, `BrowserProfileRejectedError`. Built near line 2975. |
| `browser-sign-in-page.ts` | `isBrowserSignInAddress`, `isBrowserSignInSite`, `isBrowserSignedInPage`. |
| `browser-view-client.ts` | `BrowserViewClient` (line 47). Built near line 4057. |
| `browser-view-gateway.ts` | `BrowserViewGateway` (line 132). `layer`, `createSession`, `handleUpgrade`. Constructed in `host-service.ts` line 401 (outside scope). |
| `client-browser-hub.ts` | `ClientBrowserHub`. Built near line 1378. |
| `detached-browser-window.ts` | `DetachedBrowserWindow` (line 32), `DetachedBrowserWindowFailed`. Built near line 1478. |
| `detached-browser-window-bounds.ts` | `detachedBrowserWindowBounds`, minimum 480 by 360. |
| `dynamic-island-window.ts` | `DynamicIslandWindowController` (line 70), `requireDynamicIslandSender` (561), `dynamicIslandNotchSizeForDisplay`. Built near line 1095. |
| `dynamic-island-actions.ts` | `performDynamicIslandCriticalAction`, `CriticalAction`. |
| `desktop-notifications.ts` | `desktopShowsAgentEvent`, `desktopAgentEventLevel`, `showRetainedNotification` (retain limit 50), `requestNotificationPermission`, `notificationSettingsUrl`. |
| `file-preview.ts` | `mimeTypeForName`, `filePreviewFromBytes`, `localFilePreview`. |
| `file-response.ts` | `bytesResponse`, `fileResponse`. |
| `folder-dialog.ts` | `pickFolder`. |

### Computer use (CUA driver)

| Path | What it owns |
| --- | --- |
| `cua-driver-runtime.ts` | `CuaDriverRuntime` (line 150): `start`, `stop`, `state`, `lastAction`, `lastPointer`, `mcpServerConfig`. `resolveCuaDriverEndpoint`, `cuaDriverDrivesWayland`. Reads `WAYLAND_DISPLAY` and `XDG_SESSION_TYPE`. Built at `application-services.ts` line 1997. |
| `cua-driver-artifact.ts` | `resolveCuaDriver`, `isSupportedCuaDriverTarget`, `CUA_DRIVER_VENDOR_CALLS_OFF`. |
| `cua-driver-action-tap.ts` | `CuaDriverActionTap` (line 390), `ObservedAction`, `ObservedPointer`. Built at line 1998. |
| `cua-driver-daemon-client.ts` | `CuaDriverDaemonClient`. Built near line 2031. |
| `cua-driver-effects.ts` | `CuaDriverFailure`, `cuaIO`, `cuaSync`, `toCuaDriverFailure`. |
| `cua-driver-structured-text.ts` | `rewriteCallAnswer`, `parseAnswerLine`. |
| `computer-idle.ts` | `createComputerIdle`, `ComputerIdle`. Built near line 3285. |
| `computer-use-display-awake.ts` | `ComputerUseDisplayAwake`. Built near line 2024. |
| `computer-use-highlight-window.ts` | `ComputerUseHighlightController` (line 54). Built near line 2035. |
| `computer-use-permission-app.ts` | `applicationBundlePath`, `applicationBundleName`, `applicationIconName`. |
| `computer-use-permission-help-window.ts` | `ComputerUsePermissionHelpWindowController` (line 29), `PermissionHelpFailed`. Built near line 2073. |
| `computer-use-target-window.ts` | `liveSession`, `pointerOnDesktop`, `chooseTarget`. Timing constants: action age 60 s, cursor age 15 s. |

### Bitwarden, remote and misc

| Path | What it owns |
| --- | --- |
| `bitwarden-cli-installer.ts` | `managedBitwardenCli` (managed CLI install). Called near line 1901. |
| `bitwarden-connector-service.ts` | `BitwardenConnectorService` (line 219, implements `PasswordVault`), `BitwardenHostOptions`, `BitwardenCliRunner`. Built near line 1895. |
| `bitwarden-connector-store.ts` | `BitwardenConnectorStore`. Built inside the connector at line 1897. |
| `automation-server.ts` | See agents table. |
| `agent-display.ts` | See agents table. |
| `deep-link-router.ts` | See startup table. |

### Appearance and content types

| Path | What it owns |
| --- | --- |
| `appearance-service.ts` | `AppearanceService` (line 80): loads and saves the app appearance preference (`APPEARANCE_PREFERENCE_FILE`, `codebot-appearance-preference-v1.json`), follows palette files (`followPalettes`, `refreshPalettes`) and notifies subscribers. `readSavedTransparentWindow` (line 66) is read by `index.ts` (import at line 46). Built in `application-services.ts` line 1514 and loaded at line 1645. |
| `application-content-type.ts` | `applicationContentType(path)`: maps a file extension to a Content-Type for the bundle protocol. Used by `session-configuration.ts` (line 262) and `server-setup-page.ts` (line 131). |

### Tests in scope

| Path | What it covers |
| --- | --- |
| `chat-visual-protocol.test.ts` | `chat-visual-protocol.ts`. |
| `content-security-policy.test.ts` | `content-security-policy.ts`. Required by `AGENTS.md` for CSP changes. |
| `file-preview-pages.test.ts` | `file-preview-pages.ts`. |

## How it works

### Boot sequence (`index.ts`)

1. Module scope (before `whenReady`):
   - Reads env values with `take*` and `read*` helpers (`takeHostedServerEnvironment`, `takeServerModeEnvironment`, `takeLocalServerChildEnvironment`, `readDevelopmentProfile`, `readAnalyticsCaptureUrl`, and others).
   - Sets `app.setName("CodeBot")`, `app.enableSandbox()`, the `FedCm` feature switch.
   - Takes the single-instance lock (line 374).
   - Creates `TeardownRegistry` (line 522), `createMainWindowHolder`, `createRendererForwarders` (line 559), and `createMainWindowController` (line 588).
2. `app.whenReady()` (line 1493):
   - Checks `hostAllowsTenantLaunch`. Quits if false.
   - Calls `presentApplication` for the normal desktop case.
   - Runs `recoverFromStartLoop`.
   - Calls `configureContentSecurityPolicy()` and `configureRendererPermissions()` (from `session-configuration.ts`).
   - Calls `windows.openMainWindow()`.
   - Calls `createApplicationServices({...})` (line 1536). It gets the window, forwarders and the teardown registry as values.
   - Starts the updater, then calls `registerIpcHandlers(built)` (line 1720).
   - Calls `dynamicIsland.initialize()` (line 1833) and `windows.loadRenderer(mainWindow)` (line 1841).
   - Then runs `remoteServers.startEventConnections()` and screen and power listeners.
3. `registerIpcHandlers` (line 718) passes the service fields to each IPC group in `ipc/*-handlers.ts`, then calls `registerIpcGroups` (line 840).

### Service construction (`application-services.ts`)

- `createApplicationServices` (1034) builds services in dependency order inside one long function.
- It reads preference files whose names are constants at lines 527 to 585 under `app.getPath("userData")`.
- It runs `Promise.all` loads near line 1640 (`agentAccess.load()`, `mcpAccessStore.load()`, and others) before building dependent services.
- It returns the `ApplicationServices` object at line 4483.
- Each service that needs cleanup calls `teardown.push(TEARDOWN_ORDER.<key>, "<label>", stop)`. There are 71 `teardown.push` calls in this file.

### Teardown

- `TEARDOWN_ORDER` (lines 590 to 657) maps names to numeric orders. Orders can be fractional, such as `9.5` or `110.25`.
- `TeardownRegistry.runAll` sorts steps by `order`, ascending (`teardown-registry.ts` line 66). Lower numbers stop first.
- A step with `afterAbandonedSteps: true` waits for abandoned steps first (`teardown-registry.ts` line 75). The database uses this (application-services line 1299).
- Other `teardown.push` calls live in `index.ts`. Line 1568 registers `app archive watch` with order `0`.

### Shutdown (`index.ts`)

1. `app.on("before-quit")` (line 1996) calls `prepareForShutdown()` and prevents the default quit once.
2. `prepareForShutdown` (line 2062):
   - `recordExit("quit")`.
   - Arms `forceExitAfterShutdownDeadline` (30 s).
   - Stops the updater.
   - Flushes main window bounds.
   - Calls `services.dynamicIsland.destroy()`, `services.agentDock.destroy()`, and `macHapticFeedback.destroy()`.
   - Calls `teardown.runAll()`.
   - Stops server safe mode and cleans the run marker.
3. The system-session-end path (`systemSessionEnding`) runs a shorter path in `before-quit`.

### Trust boundary used by this area

- Window docks and island check the sender frame ID before handling any IPC payload:
  - `requireAgentDockSender` (`agent-dock-window.ts` line 568).
  - `requireDynamicIslandSender` (`dynamic-island-window.ts` line 561).
  - `requireBrowserDockSender` (`browser-dock-overlay.ts` line 288).
- Each takes the actual sender ID and a `ReadonlySet<number>` of expected IDs.
- Shared IPC primitives are outside this scope (`trusted-ipc.ts`, `renderer-ipc.ts`).

### Agent access rules (`agent-access-store.ts`)

- `agentAccessLevel` (line 36) returns:
  - `"manage"` for any member whose role is not `"member"`.
  - `"none"` if the server state is `"closed"`.
  - `"manage"` for the member that `state.owners` records as the creator of the agent.
  - Otherwise, starts at `state.everyone[agentId] ?? "none"` and raises the level from matching role grants (D23).
- `AgentAccessStore` (line 122) keeps a `revision` and a `subscribe` listener list. It writes through `preference-file` (outside scope).

## Key classes and where they are built

| Class or function | Defined in | Built in | Main callers |
| --- | --- | --- | --- |
| `AgentDockWindowController` | `agent-dock-window.ts:70` | `application-services.ts:1144` | `index.ts` 1852, 2077; `ipc/agent-dock-handlers.ts` |
| `DynamicIslandWindowController` | `dynamic-island-window.ts:70` | `application-services.ts:1095` | `index.ts` 1833, 1837, 2076; `ipc/dynamic-island-handlers.ts` |
| `HostAnalytics` | `analytics.ts:484` | `application-services.ts:3741` | `index.ts` 1654 to 1658, 1258 to 1308; `analytics-effects.ts` |
| `AgentAccessStore` | `agent-access-store.ts:122` | `application-services.ts:1538` | `index.ts` 760, 1057; `application-services.ts` 1646 |
| `AcpRegistry` | `acp-registry.ts:50` | `createAcpRegistry` at `application-services.ts:3009` | `index.ts` 808; `ipc/acp-registry-handlers.ts` |
| `CuaDriverRuntime` | `cua-driver-runtime.ts:150` | `application-services.ts:1997` | Computer use IPC handlers |
| `CuaDriverActionTap` | `cua-driver-action-tap.ts:390` | `application-services.ts:1998` | `CuaDriverRuntime` |
| `CentralAuthManager` | `central-auth-manager.ts:212` | `createCentralAuthManager` at `application-services.ts:1235` (via `account-service-access.ts`) | `index.ts` 1249 to 1332 (forwarding); many services |
| `ExternalLinkOpener` | `external-link-opener.ts:44` | `application-services.ts:1073` | `application-services.ts` link opening |
| `AgentImportService` | `agent-import-service.ts:154` | `application-services.ts:3045` | `ipc/agent-import-handlers.ts` |
| `AgentTemplateService` | `agent-template-service.ts:140` | `application-services.ts:2799` | `ipc/agent-template-handlers.ts` |
| `AgentMarketplaceService` | `agent-marketplace-service.ts:101` | `application-services.ts:2798` | `ipc/marketplace-agent-handlers.ts` |
| `AutomationServer` | `automation-server.ts:94` | `application-services.ts:2419` | `teardown` order `automation` (108) |
| `BrowserDockOverlay` | `browser-dock-overlay.ts:73` | `application-services.ts:1497` | `index.ts`; `ipc/browser-dock-handlers.ts` |
| `BrowserEgressHost` | `browser-egress-host.ts:20` | `application-services.ts:1376` | Team WebRTC bridge |
| `BrowserEgressClient` | `browser-egress-client.ts:15` | `application-services.ts:3924` | Remote browser sessions |
| `BrowserEgressMux` | `browser-egress-mux.ts:159` | `browser-egress-host.ts:117` and `browser-egress-client.ts:55` | Browser egress only |
| `BrowserPictureInPicture` | `browser-picture-in-picture.ts:30` | `application-services.ts:1465` | Browser IPC |
| `BrowserViewClient` | `browser-view-client.ts:47` | `application-services.ts:4057` | Browser view |
| `BrowserViewGateway` | `browser-view-gateway.ts:132` | `host-service.ts:401` (outside scope) | Team API browser routes |
| `BitwardenConnectorService` | `bitwarden-connector-service.ts:219` | `application-services.ts:1895` | `ipc/bitwarden-connector-handlers.ts` |
| `CustomProviderStore` | `custom-provider-store.ts:83` | `application-services.ts:1739` | `ipc/custom-provider-handlers.ts` |
| `CustomAgentStore` | `custom-agent-store.ts:48` | `application-services.ts:1744` | `ipc/custom-agent-handlers.ts` |
| `ApprovalAutomation` | `approval-automation-store.ts:82` | `application-services.ts:1675` | `agent-admin-settings.ts` |
| `FilePreviewPages` | `file-preview-pages.ts:55` | Singleton at `file-preview-pages.ts:143` | `index.ts` |

## How to change it

### Add a service that lives in one of these files

1. Write the class in a new or existing `src/main/<name>.ts`. Do not import Electron if the class is testable. Put the module in the ownership table in `AGENTS.md` if it is a new concern.
2. In `application-services.ts`, construct it in dependency order inside `createApplicationServices`. Pass values, not getters. Use `getMainWindow()` in callbacks that run later.
3. Add a key to `TEARDOWN_ORDER` (lines 590 to 657) with an ordinal. Then add `teardown.push(TEARDOWN_ORDER.<key>, "<label>", () => <stop>)` next to the construction. Do not infer shutdown order from construction order.
4. Add the field to the `ApplicationServices` interface (line 688) and to the returned object (around line 4483).
5. If the renderer needs it, follow the rule in `src/main/AGENTS.md`:
   - Declare endpoints in `packages/contracts/src/ipc-endpoints.ts`.
   - Add a handler group in `src/main/ipc/<domain>-handlers.ts`.
   - Pass its dependencies from `registerIpcHandlers` in `index.ts` and add it to the `registerIpcGroups` spread (line 840).
   - Update `src/preload/index.ts` and `src/renderer/src/preview/mock-codebot.ts` in the same change.
6. If the renderer must receive events, add a forwarder in `renderer-forwarders.ts` (outside scope). Wire it with a getter from `index.ts`.

### Add a preference store

1. Copy the pattern in `crm-preference-store.ts` or `agent-defaults-preference-store.ts`. Use `createXPreferenceStore(path)` and the `PreferenceStore<A>` class (`preference-file.ts` line 38).
2. Add a file-name constant with a version suffix near `application-services.ts` lines 527 to 585, for example `codebot-<name>-v1.json`.
3. Build the store under `app.getPath("userData")` in `application-services.ts`.
4. Add a `*Control` helper if the settings change at runtime, as in `claude-compact-window-preference-store.ts`.

### Change agent access rules

1. Edit `agentAccessLevel` and `agentAccessSnapshot` in `agent-access-store.ts` (lines 36 and 53).
2. Keep the `member.role !== "member"` branch and the `"closed"` branch. They are the security defaults.
3. Update `AgentAccessStore` audit calls if the change affects stored state. Bump the revision.
4. Add a test in the same change. Access checks are in the trust boundary.

### Add a deep link kind

1. Add a variant to the `DeepLink` union in `deep-link-router.ts`.
2. Add a parse path in `parseDeepLink` or a helper like `parseSlackUrl`.
3. If the renderer should receive it, add the kind to `RendererDeepLink` (`index.ts` lines 494 to 497) and handle it in `acceptDeepLink` (line 1332).
4. Main-only kinds (`mcp-auth`, `slack-workspace`, `discord-guild`, `near-signature`) are handled in `index.ts` by their own receive functions (lines 1392 to 1433).

### Add an analytics event

1. Add a `handle*` method to `HostAnalytics` in `analytics.ts`.
2. Connect the source event in `index.ts` (lines 1654 to 1658 show the current pattern) or in `application-services.ts`.
3. Confirm the analytics gate. Events only leave the app when analytics are enabled (see Gotchas).

### Add a dock or island action

1. Add the action type in `agent-dock-window.ts` (`AgentDockSendAction`) or `dynamic-island-actions.ts` (`CriticalAction`).
2. Add the performing code in `performAction` (`agent-dock-window.ts` line 305, `dynamic-island-window.ts` line 269).
3. Keep the sender check first. Call `requireAgentDockSender` or `requireDynamicIslandSender` before decoding payloads.
4. Add the handler in `ipc/agent-dock-handlers.ts` or `ipc/dynamic-island-handlers.ts` with `payloadHandler(decode, handler)`.

### Change the boot order

1. Read the boot sequence above first.
2. Keep `createApplicationServices` before `registerIpcHandlers`. The IPC handlers need the built services.
3. Keep `windows.openMainWindow()` before `createApplicationServices`. The services take `mainWindow` as a value.
4. Keep `configureContentSecurityPolicy()` and `configureRendererPermissions()` before `windows.loadRenderer`.

## Gotchas

1. `createApplicationServices` does more than build services. It also:
   - Registers 71 teardown steps.
   - Starts three logs (provider, agent, account) at lines 1066 to 1069.
   - Attaches about 29 `.on("...")` event listeners (for example line 904 and line 2436).

   `src/main/AGENTS.md` says event wiring stays in `index.ts`. The current code does not follow that rule. Do not copy the pattern without checking the rule.
2. `index.ts` also registers teardown steps (line 1568, order `0`). Teardown is not only in `application-services.ts`.
3. Some `TEARDOWN_ORDER` keys are used twice:
   - `updater` (10) at lines 1278 and 4258.
   - `browserEgress` (99) at lines 1377 and 3929.
   - `cuaDriver` (110.5) at lines 2023 and 2030.
   - `signalIngress` (86) at lines 888 and 1029.

   The sort is stable in JavaScript, so equal orders run in push order (inferred, not run).
4. Dynamic Island and the agent dock are destroyed twice on quit. `prepareForShutdown` calls `destroy()` directly (`index.ts` lines 2076 and 2077). The teardown steps at `application-services.ts` lines 1143 and 1234 call it again. Both `destroy()` methods clear their window maps, so a second call should do nothing (read from the code, not run).
5. Analytics is gated. `analyticsEnabled` is true only for a packaged production build, or when a capture URL is set (`application-services.ts` line 3703). Dev builds send nothing unless `CODEBOT_ANALYTICS_CAPTURE_URL` is set.
6. Pre-ready wiring needs getters. `createRendererForwarders` (`index.ts` line 559) gets `getAgentService: () => services?.service ?? null` and similar. Do not pass the `services` value into module-scope code. `services` is `null` until `createApplicationServices` returns.
7. Agent access default for members is `"none"` when there is no entry (D23). A member always manages the agents that `state.owners` records for them; the Team API records the owner when a member creates an agent, a project or a project agent (`claimAgents`). Check this default before changing access logic.
8. Dev-only env values are read only when `app.isPackaged` is false (for example `index.ts` lines 269 to 275, 301, 304). Packaged builds ignore them.
9. Archive import limits matter. `MANIFEST_MAX_BYTES` is 64 MiB (`agent-archive.ts` line 113). `isUnsafeEntry` (line 229) blocks unsafe entry names. Keep both when changing the import path.
10. `index.ts` has module-scope Electron calls. Tests cannot import it. The source coverage tests read it as text (`src/main/AGENTS.md`).
11. Startup order is fixed in `index.ts`. Moving `registerIpcHandlers` before `createApplicationServices` breaks the build. Moving `loadRenderer` earlier can send events before listeners exist.
12. Some stores hold secret material and take a cipher. Treat them as trust-boundary code:
    - `custom-provider-store.ts` takes a `CustomProviderCipher` (interface at line 35).
    - `BitwardenConnectorStore` receives a `secretCipher` built from `safeStorageCipher` (`application-services.ts` line 1738). Its file is `codebot-bitwarden-connector-v1.json`.
    - `account-service-access.ts` exports `safeStorageCipher` (line 24).
13. Environment variable names read in this area (names only): `CODEBOT_AUTH_API_URL`, `CODEBOT_MOBILE_AUTH_API_URL`, `CODEBOT_CUA_DRIVER_PATH`, `CUA_DRIVER_PATH`, `CUA_DRIVER_BIN_DIR`, `CUA_DRIVER_RS_INSTALL_DIR`, `CODEBOT_REMOTE_DESKTOP_RUNTIME_PATH`, `CODEBOT_HOSTED_SERVER`, `ELECTRON_RENDERER_URL`, `WAYLAND_DISPLAY`, `XDG_SESSION_TYPE`, `XDG_RUNTIME_DIR`, `APPIMAGE`, and `CODEBOT_DEV_*` names (for example `CODEBOT_DEV_CLIENT_TRANSPORT`, `CODEBOT_DEV_HOST_EMAIL`). Do not copy values from `.env` files.
14. Persisted files use versioned names, for example `codebot-agent-access-v1.json`, `codebot-analytics-install-id-v1.json`, `codebot-crm-v1.json`, and `custom-agents.json`. Bump the version suffix when the schema changes, as the existing names do.
15. Interface text that reaches users must use `sourceText(key, params)` from `@codebot/i18n/source`, not a literal. Dialogs and menus use `language.translate`.

## Unverified

- `app-archive-watch.ts`: only the signature and the `index.ts` call site (line 1568) were read. The watch logic was not read.
- `agent-database-host-process.ts`: the child-process protocol was not read in full. Its callers outside `application-services.ts` are unverified.
- `browser-view-gateway.ts`: routes and upgrade handling were not traced. The construction at `host-service.ts` line 401 is confirmed by grep (that file is outside this scope).
- `central-auth-manager.ts`: only public methods and exported helpers were listed. The internal state machine was not mapped.
- `acp-registry.ts` and the install path: `install` and `#rollback` were not traced step by step.
- `agent-archive.ts` callers: `agent-import-service.ts` is confirmed (lines 403 and 567). `instance-transfer-service.ts` and `instance-transfer-history.ts` also call the archive readers (found by grep, not read). `agent-template-service.ts` does not call them.
- `content-security-policy.ts`: `session-configuration.ts` line 24 calls `buildContentSecurityPolicy` (confirmed by grep). The policy text itself was not read.
- `exit-watchdog.ts`, `background-tray.ts`: call sites are confirmed in `index.ts` (lines 416 and 1771). Their internal behavior was not read.
- `analytics-effects.ts`, `analytics-install-id.ts`, `analytics-inventory.ts`: only exports were read.
- `teardown-registry.ts` ordering and `afterAbandonedSteps` behavior: read from lines 66 and 75 only. The full class was not read (outside scope).
- Dynamic Island and agent dock double-`destroy` safety: read from the code, not tested.
- The team API and IPC handler callers that use these modules: only some were checked. `ipc/*-handlers.ts` belongs to another scope.
- Most of the 116 non-test modules were classified by name and export list, not by reading the body. Their descriptions in the table are short.
