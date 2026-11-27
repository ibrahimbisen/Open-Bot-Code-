# Main process (part B): src/main files g to z

## What this area is

- This is the Electron main process code for CodeBot, in the top-level folder `src/main/`. This doc covers the 298 top-level `.ts` files whose names start with g to z (also h, i, m, s, t, w, and others in that range). It includes `index.ts` and `start.ts`.
- Most files hold one service, store, or helper. The big ones are `index.ts` (2085 lines, app entry), `remote-server-manager.ts` (2850), `team-store.ts` (1801), `team-webrtc-host-peer.ts` (1359), `update-service.ts` (995), and `signal-ingress.ts` (927).
- Services are built in `src/main/application-services.ts` (not in this scope, 4624 lines). `index.ts` wires the built services to windows and IPC.
- Files in subfolders (`ipc/`, `team-api/`, `local-servers/`, `password-managers/`) are not in this scope. See `.claude/codebase/main-subdirs-and-ipc.md` for those.

## Method and limits

- Based on: all `export` names per file, the `index.ts` outline, `start.ts`, `trusted-ipc.ts`, importer counts (grep, excluding tests), and `new ClassName(` sites in `application-services.ts` and `index.ts`.
- Most files were not read in full. Behavior is inferred from names and wiring. Unchecked points are marked "(unverified)".
- No file was changed. No build, test, or typecheck was run.

## Key files

### Startup and app shell

| path | what it owns |
|---|---|
| `src/main/start.ts` | Real entry point. In a packaged app, shows the "damaged installation" dialog on module load errors (a server exits without it). Then does `await import("./index")`. Runs perf probes first when enabled. |
| `src/main/index.ts` | App bootstrap. Reads env at import time (lines ~268-304). Runs `requestSingleInstanceLock` (line 374). Builds `TeardownRegistry` (522) and main window controller (526, 588). Runs `registerIpcHandlers` (718). Runs start-loop recovery (`recoverFromStartLoop`, 1187). Runs `presentApplication` (1226). Handles deep links (1332-1403), `open-url` (1444), `second-instance` (1466), `whenReady` (1493), `activate` (1935), `window-all-closed` (1992), `before-quit` (1996). |
| `src/main/start-attempts.ts` | `StartAttempts` (`begin`, `summary`, `finished`, `failed`, `quitting`, `osShutdown`). Counts start attempts to detect a crash loop. |
| `src/main/server-start-halt.ts` | `START_LOOP_EXIT_CODE`, `START_HALT_FILE`, `takeStartHalt`, `writeStartHalt`, `startHaltReason`, `takeServerStartGuardTest`. Halts server starts after a loop. |
| `src/main/start-recovery-window.ts` | `openStartRecoveryWindow`, `StartRecovery`. Recovery window shown after failed starts. |
| `src/main/start-recovery-release.ts` | `readDatabaseSchemaVersion`, `compatiblePreviousRelease`. Picks an older release to recover to. |
| `src/main/start-recovery-plush.ts` | `recoveryPlushSvg`. SVG art for the recovery window. |
| `src/main/startup-timing.ts` | `StartupTiming`, `START_KINDS`, `SERVICE_STEPS`, `StartupProperties`. Times startup steps. |
| `src/main/single-instance-owner.ts` | `singleInstanceOwnerPid`, `singleInstanceExitMessage`. |
| `src/main/lifecycle-gate.ts` | `LifecycleGate`. Generic gate class. Used by `cua-driver-runtime.ts`, `remote-viewer-proxy.ts`, `sunshine-moonlight-runtime.ts`, and `team-api-server.ts`. |
| `src/main/teardown-registry.ts` | `TeardownRegistry`, `TeardownStepOptions`. Ordered shutdown steps. Built in `index.ts` line 522. |
| `src/main/exit-watchdog.ts` | `stopStuckExitAfterLimit`. Stops a stuck exit after a limit. Called from `index.ts`. |
| `src/main/run-marker.ts` | `RunMarker`, `RUN_MARKER_FILE`, `countCrashDumps`. Marks unclean exits. |
| `src/main/newer-database-recovery.ts` | `recoverFromNewerDatabase`. Handles a database made by a newer build. |
| `src/main/released-schema-versions.ts` | `RELEASED_SCHEMA_VERSIONS`. List of shipped schema versions. |
| `src/main/perf-probes-install.ts` | `installPerfProbes`. Dev-only probes (called from `start.ts`). |
| `src/main/perf-probes-build.d.ts` | Type stub for a build-time flag. |
| `src/main/idle-restart.ts` | `IdleRestart`. Restarts when idle. |
| `src/main/keep-awake.ts` | `KeepAwake`. Keeps the machine awake while work runs. |
| `src/main/login-item.ts` | `LoginItem`, `createLoginItem`. Start-at-login. |
| `src/main/quit-shortcut.ts` | `QuitShortcut`, `createQuitShortcut`, `isQuitGuarded`. |
| `src/main/server-mode.ts` | `ServerMode`, `takeServerModeEnvironment`, `ServerSetupAction`. Headless server mode. |
| `src/main/server-safe-mode.ts` | `ServerSafeMode`, `startServerSafeMode`, `safeModeMarkerDirectory`. |
| `src/main/server-setup-page.ts` | `ServerSetupPage`. Setup page for server mode. |

### Windows and window chrome

| path | what it owns |
|---|---|
| `src/main/main-window.ts` | `createMainWindowHolder`, `createMainWindowController`, `createDynamicIslandWindow`, `createAgentDockWindow`, `createComputerUseHighlightWindow`, and more. Main window `minWidth` (960 px, see AGENTS.md line 152). |
| `src/main/main-window-state.ts` | `readMainWindowBounds`, `writeMainWindowBounds`, `presentMainWindow`, `secondLaunchResponse`, `ensureMacApplicationPresence`. |
| `src/main/window-appearance.ts` | `setWindowAppearance`, `windowBackgroundColor`, `followAppearance`, `setInitialWindowGlass`, `glassWindowOptions`, `followWindowGlass`. |
| `src/main/window-buttons.ts` | `placeWindowButtons`, `followWindowButtonSide`. |
| `src/main/windows-topmost-keeper.ts` | `WindowsTopmostKeeper`. |
| `src/main/windows-short-path.ts` | `windowsShortPath`. 8.3 short paths. |
| `src/main/windows-notification-history.ts` | `clearEarlierWindowsNotifications`. |
| `src/main/windows-package-restart.ts` | `restartOutsideWindowsPackage`. |
| `src/main/windows-session-state.ts` | `windowsSessionDisconnected`. |
| `src/main/windows-update-signature.ts` | `verifyWindowsUpdateSignature`. |
| `src/main/mac-panel-activation.ts` | `preventPanelActivation`, `hidePanelFromWindowSwitchers`, `keepPanelThroughAppHide`. macOS panel rules. |
| `src/main/mac-haptic-feedback.ts` | `MacHapticFeedback`, `HapticProcess`. |
| `src/main/mac-installed-copy.ts` | `restartFromInstalledCopy`. |
| `src/main/mac-automation.ts` | `requestMacAutomation`. |
| `src/main/mac-permission-urls.ts` | `MAC_PERMISSION_URLS`. |
| `src/main/linux-tiling-desktop.ts` | `onTilingLinuxDesktop`, `windowMinimumSize`, `desktopLayoutZoomFactor`. |
| `src/main/linux-x11-activation.ts` | `forceActivateX11Window`, `x11CompositorRunning`. |
| `src/main/linux-wayland-output.ts` | `keepAboveAppsXWayland`, `setAboveAppsXWayland`, `takeXWaylandRestartMarker`, `ozonePlatformArguments`, `usesX11Windows`, `aboveAppsScreenSupport`. |
| `src/main/linux-gpu-mode.ts` | `LinuxGpuMode`, `readLinuxGpuMode`, `configureLinuxGpu`. Called from `index.ts` line 424. |
| `src/main/linux-desktop-entry.ts` | `installLinuxDesktopEntry`. |
| `src/main/linux-password-store.ts` | `configureLinuxPasswordStore`. |
| `src/main/linux-appimage-crashpad.ts` | `runsFromOwnMount`, `stopAppImageCrashpadHandlerAtExit`. |
| `src/main/linux-appimage-relaunch.ts` | `relaunchApp`. |
| `src/main/logo-color-service.ts` | `LogoColorService`. App icon color. |
| `src/main/interface-size-service.ts` | `InterfaceSizeService`, `InterfaceSizeStep`, `interfaceSizeShortcut`. |
| `src/main/pointer-forwarding-gate.ts` | `PointerForwardingGate`, `letPointerThrough`. Built in `application-services.ts` line 1093. |
| `src/main/theme-palette-files.ts` | `readThemePalettes`, `watchThemePalettes`, `THEME_PALETTE_DIRECTORY`. |
| `src/main/installed-fonts.ts` | `listInstalledFonts`. |
| `src/main/system-hour-cycle.ts` | `systemHourCycle`. |
| `src/main/language-service.ts` | `LanguageService`. Built in `application-services.ts` line 1088. |
| `src/main/language-preference-store.ts` | `readLanguagePreference`, `writeLanguagePreference`. |

### IPC and renderer boundary

| path | what it owns |
|---|---|
| `src/main/trusted-ipc.ts` | `handleTrusted`, `handleTrustedWithEvent`, `setIpcCallObserver`. Types: `PayloadDecoder`, `AuthorizeSender`, `TakesNoArguments`, `TakesEventOnly`, `IpcCallRecord`. Checks the sender URL with `isTrustedRendererUrl` (from `trusted-renderer.ts`) before a handler runs. |
| `src/main/trusted-renderer.ts` | `isTrustedRendererUrl`. Allow-list for renderer URLs. |
| `src/main/renderer-ipc.ts` | `sendToRenderer`, `RendererIpcWindow`. Main-to-renderer sends. |
| `src/main/renderer-forwarders.ts` | `createRendererForwarders`, `RendererForwarderDependencies`. Pushes service events to renderer windows. |
| `src/main/renderer-permissions.ts` | `canCheckRendererPermission`, `canRequestRendererPermission`. |
| `src/main/session-configuration.ts` | `configureContentSecurityPolicy`, `configureRendererPermissions`, `configureAttachmentProtocol`, `configureServerLogoProtocols`, `AttachmentProtocolDependencies`, `ServerLogoProtocolDependencies`. Electron session setup. |
| `src/main/http-body.ts` | `readBodyWithin`. Body size limit helper. |
| `src/main/ws-raw-data.ts` | `rawDataText`, `rawDataBytes`, `rawDataSize`, `sendableCloseCode`. WebSocket frame helpers. |
| `src/main/ingress-queue-key.ts` | `IngressQueueKey`, `loadIngressQueueKey`. |
| `src/main/private-network-detection.ts` | `isTailscaleConnected`. |

IPC handler groups live in `src/main/ipc/` (out of scope). They use `handleTrusted` through `src/main/ipc/define-ipc-group.ts` (lines 21-73). `index.ts` calls `registerIpcHandlers` (line 718).

### Persistence and secrets

| path | what it owns |
|---|---|
| `src/main/preference-file.ts` | `readPreferenceFile`, `writePreferenceFile`, `PreferenceStore`, `PreferenceFileFailure`. Base for JSON preference files. Imported by 57 files. |
| `src/main/secret-storage-cipher.ts` | `SecretStorageCipher`, `SecretStorage`, `createSecretStorage`, `SECRET_STORAGE_KEY_FILE`. Encrypts stored secrets with the Electron safeStorage API (OS keyring). When the keyring does not keep the secrets, it uses AES-256-GCM with a key file (`SECRET_STORAGE_KEY_FILE`). |
| `src/main/provider-credential-store.ts` | `ProviderCredentialStore`, `CodeBotSecretName`, `SecretCipher`, `CredentialFileTooLarge`, `CredentialStoreFailure`. |
| `src/main/provider-environment-store.ts` | `ProviderEnvironmentPreferenceStore`, `providerEnvironmentControl`, `ProviderEnvironmentRefused`, `providerEnvironmentSecret`. |
| `src/main/vault-store.ts` | `VaultStore`, `VaultRecord`, `StoredLogin`, `StoredCard`, `StoredContact`, `StoredApiKey`. |
| `src/main/vault-service.ts` | `VaultService`, `VAULT_CSV_LIMIT`. Built in `application-services.ts` line 1914. |
| `src/main/vault-inputs.ts` | `decodeVaultSaveInput`, `decodeVaultSecretRequest`, `vaultWebsite`. |
| `src/main/vault-csv.ts` | `parseLoginCsv`, `CsvLogin`. CSV import. |
| `src/main/telegram-files.ts` | `downloadTelegramFile`, `uploadTelegramFile`, `signalHttpOrigin`. |
| `src/main/sidebar-pin-store.ts` | `SidebarPinStore`, `OWNER_PIN_KEY`. |
| `src/main/server-audit-store.ts` | `ServerAuditStore`, `SERVER_AUDIT_FILE`, `serverAuditNames`, `memberAuditChanges`. |
| `src/main/setup-store.ts` | `readSetupState`, `writeSetupState`. |
| `src/main/update-preference-store.ts` | `readUpdatePreference`, `writeUpdatePreference`, `UPDATE_PREFERENCE_FILE`. |
| `src/main/update-install-guard.ts` | `writeUpdateHandover`, `writeUpdateInstallRecord`, `readNotInstalledUpdate`, `shipItInstallInProgress`, `macShipItDirectory`. |
| `src/main/*-preference-store.ts` | Many small stores (see Preference stores below). |
| `src/main/vault-service.test.ts` | Test. |

Preference stores (each is a small file, most built on `preference-file.ts`):

- `skill-learning-preference-store.ts` (`SkillLearningPreferenceStore`)
- `server-timezone-preference-store.ts` (`ServerTimezonePreferenceStore`, `applyServerTimezone`)
- `server-personality-preference-store.ts` (`ServerPersonalityPreferenceStore`, `parseServerPersonality`)
- `prompt-cache-ttl-preference-store.ts` (`PromptCacheTtlPreferenceStore`)
- `provider-use-settings-store.ts` (`ProviderUseSettingsStore`)
- `provider-detection-settings-store.ts` (`ProviderDetectionSettingsStore`, `PROVIDER_DETECTION_SETTINGS_FILE`)
- `host-turn-limits-preference-store.ts` (`HostTurnLimitsPreferenceStore`)
- `memory-review-preference-store.ts` (`MemoryReviewPreferenceStore`)
- `media-approval-credits-preference-store.ts` (`createMediaApprovalCreditsPreferenceStore`, `mediaApprovalCreditsControl`, `creditAsksControl`)
- `notification-preference-store.ts` (`NotificationPreferenceStore`)
- `remote-control-policy-store.ts` (`RemoteControlPolicyStore`, `createRemoteControlPolicyStore`)
- `remote-network-route-preference-store.ts` (`RemoteNetworkRoutePreferenceStore`)
- `remote-session-reuse-preference-store.ts` (`RemoteSessionReusePreferenceStore`)
- `speech-preference-store.ts` (`SpeechPreferenceStore`)
- `voice-preference-store.ts` (`VoicePreferenceStore`)
- `voice-api-key-store.ts` (`VoiceApiKeyStore`, `VoiceApiKeyCipher`)
- `instance-transfer-preferences.ts`, `instance-transfer-server-preferences.ts`
- `mcp-access-store.ts` (`McpAccessStore`, `MCP_ACCESS_FILE`)
- `mcp-server-owners-store.ts` (`McpServerOwnersStore`, `MCP_SERVER_OWNERS_FILE`)
- `mcp-oauth-store.ts` (`McpOAuthStore`), `mcp-oauth-proxy-store.ts`
- `machine-alerts.ts` (`MachineAlertPreferenceStore`, `MachineAlertMonitor`, `MACHINE_ALERTS_PREFERENCE_FILE`)

### Remote servers, teams, and sync

| path | what it owns |
|---|---|
| `src/main/remote-server-manager.ts` | `RemoteServerManager`. Central owner of remote server connections. Built in `application-services.ts` line 3842. Imported by 24 files. |
| `src/main/remote-server-store.ts` | `RemoteServerStore`, `RemoteServerDirectory`, `RemoteServerPatch`, `ActiveSelection`, `PreservedHostIdentity`, `TokenCipher`. |
| `src/main/remote-server-stored-shape.ts` | `StoredRemoteServer(s)`, `readStoredRemoteServers`, `serializeStoredRemoteServers`. On-disk shape. |
| `src/main/remote-server-client.ts` | `RemoteServerClient`, `RemoteServerClientOptions`, `RemoteRequestFn`. HTTP client to a remote host. |
| `src/main/remote-server-connections.ts` | `RemoteServerConnections`. |
| `src/main/remote-server-connection-status.ts` | `RemoteServerConnectionStatus`, `classifyConnectFailure`, `classifyRemoteConnectionError`, `classifyTransportError`, `hostUnreachable`. |
| `src/main/remote-server-event-stream.ts` | `RemoteEventStream`. Event stream from remote host. |
| `src/main/remote-server-event-refresh.ts` | `RemoteEventRefresh`. |
| `src/main/remote-server-http.ts` | `requestJson`, `remoteFetch`, `throwRemoteResponseError`, `webRtcRequestBody`. |
| `src/main/remote-server-host-directory.ts` | `watchRemoteHostDirectory`, `watchServerClaims`, `verifyHostKeySignature`, `WebRtcHostReconciliation`. |
| `src/main/remote-server-presence.ts` | `RemotePresenceCache`. |
| `src/main/remote-server-summaries.ts` | `remoteServerSummaries`. |
| `src/main/remote-server-urls.ts` | `remoteServerLogoUrl`, `parseRemoteAvatarUrl`, `addRemotePreviewUrls`, `isLocalDevelopmentApi`. |
| `src/main/remote-server-errors.ts` | `RemoteRequestError`, `RemoteProtocolError`. |
| `src/main/remote-server-connections.ts` | (see above). |
| `src/main/remote-session-cache.ts` | `RemoteSessionCache`, `CachedRemoteSession`. Built in `application-services.ts` line 1663. |
| `src/main/remote-viewer-proxy.ts` | `RemoteViewerProxy`. |
| `src/main/remote-team-directory.ts` | `RemoteTeamDirectory`, `RemoteControlPlaneTransport`. |
| `src/main/remote-team-decoding.ts` | `decodeTeamMembers`, `decodeInvitePreview`, `decodeJoinResult`, and others. |
| `src/main/remote-agent-decoding.ts` | `decodeAgentHostSettingsFromHost`, `decodeRemoteAgentTasks`, and others. |
| `src/main/remote-conversation-decoding.ts` | `decodeDirectMessage`, `decodeDirectConversationPage`, and others. |
| `src/main/remote-device-decoding.ts` | `decodeBrowserTab`, `decodeRemoteDesktopSession`, and others. |
| `src/main/remote-host-decoding.ts` | `ResponseDecoder`, `decodeVoid`, `acceptEmpty`, `decodeComputerActivityReply`. |
| `src/main/remote-desktop-setup-decoding.ts` | `decodeRemoteDesktopSetupFromHost`, `decodeRemoteDesktopTestFromHost`. |
| `src/main/remote-service-effects.ts` | `RemoteWorkflowError`, `RemoteFileProgress`, `RemoteRequest`. |
| `src/main/remote-connect-trace.ts` | `RemoteConnectTrace`, `REMOTE_CONNECT_PHASES`, `RemoteConnectSummary`. Built in `application-services.ts` line 3828. |
| `src/main/remote-diagnostics.ts` | `appendRemoteDiagnosticLog`, `forwardDiagnosticLines`, `stopRemoteProcess`. |
| `src/main/remote-attachment-cache.ts` | `RemoteAttachmentCache`, `RemoteAttachment`. |
| `src/main/remote-picture-cache.ts` | `RemotePictureCache`. |
| `src/main/remote-instance-transfer-chunks.ts` | `uploadTransferInParts`, `downloadTransferInParts`. |
| `src/main/remote-sync-profile-file.ts` | `remoteSyncProfileFile`. |
| `src/main/remote-control-question.ts` | `createRemoteControlQuestion`, `notifyRemoteControlStarted`. |
| `src/main/remote-desktop-manager.ts` | `RemoteDesktopManager`. Built in `application-services.ts` line 4074. |
| `src/main/remote-desktop-*.ts` | `remote-desktop-effects.ts`, `remote-desktop-keyboard.ts` (`remoteDesktopKeyboardScript`), `remote-desktop-paste.ts` (`remoteDesktopPasteScript`), `remote-desktop-stream-watch.ts` (`remoteDesktopStreamWatchScript`), `remote-desktop-runtime-artifact.ts` (`resolveRemoteDesktopRuntime`), `remote-desktop-signal.ts`. |
| `src/main/remote-screen-gateway.ts` | `RemoteScreenGateway`, `RemoteScreenRuntime`, `RemoteScreenSessionRequest`, `RemoteScreenAuditEvent`. |
| `src/main/sunshine-moonlight-runtime.ts` | `SunshineMoonlightRuntime`, `SunshineApiError`, `RemoteRuntimeStartError`. Remote screen runtime. |
| `src/main/team-store.ts` | `TeamStore`, `TEAM_STORE_FILE`, `LEGACY_TEAM_STORE_FILE`, `TeamStoreError`, `TeamIdentity`, `CreatedInvite`, `TeamInvitePreview`, `AuthenticatedMember`, `RemoteDirectoryMember`. Built in `application-services.ts` line 2810. Imported by 16 files. |
| `src/main/team-api-server.ts` | `TeamApiServer`. HTTP server for team routes. Its route files are in `src/main/team-api/` (out of scope). |
| `src/main/team-webrtc-bridge.ts` | `TeamWebRtcBridge`, `TeamWebRtcChannel`. Built in `application-services.ts` line 1368. |
| `src/main/team-webrtc-host-peer.ts` | `TeamWebRtcHostPeer`, `TeamWebRtcHostPeerOptions`, `IncomingConnection`. Host side peer. |
| `src/main/team-webrtc-host-gateway.ts` | `TeamWebRtcHostGateway`. |
| `src/main/team-webrtc-client-transport.ts` | `TeamWebRtcClientTransport`, `TeamWebRtcRequestError`. Client side. Built in `application-services.ts` line 3891. |
| `src/main/team-webrtc-file-transfer.ts` | `TeamWebRtcFileTransfer`, `ReceivedWebRtcFile`, `TeamFileTooLargeError`. |
| `src/main/sign-in-relay-host.ts` | `SignInRelayHost`, `SignInRelayProvider`, `RelaySignIn`, `replaySignInCallback`, `agentPrintedLink`. Built in `application-services.ts` line 3249. |
| `src/main/sign-in-relay-client.ts` | `SignInRelayClient`, `SignInRelayRemote`, `ChosenSignInPage`. Built in `application-services.ts` line 1810. |
| `src/main/host-*.ts` | Host side services (see Host and hosted server). |

### Host and hosted server

| path | what it owns |
|---|---|
| `src/main/host-service.ts` | `HostService`, `DEVELOPMENT_REMOTE_CLIENT_USERNAME`. Built in `application-services.ts` line 3337. Imported by 10 files. |
| `src/main/host-manager.ts` | `HostManager`, `HostManagerOperations`. |
| `src/main/host-release-service.ts` | `HostReleaseService`, `readInstallationMode`, `fetchLatestLinuxRelease`. Built at `application-services.ts` line 3029. |
| `src/main/host-update-coordinator.ts` | `HostUpdateCoordinator`, `hostAllowsTenantLaunch`. |
| `src/main/host-update-files.ts` | `HOST_MANAGER_DIRECTORY`, `HOST_POLL_MS`, `HOST_HEARTBEAT_TIMEOUT_MS`, `HOST_IDLE_GRACE_MS`, `hostConfigSchema`, `hostStateSchema`, `tenantStatusSchema`, `verifyHostDirectory`, `readOwnedJson`, `writeProtocolJson`. Schemas for host files. |
| `src/main/host-update-relaunch.ts` | `relaunchManagedTenant`. |
| `src/main/host-sign-in-pages.ts` | `HostSignInPages`, `HostSignInPage`, `HostSignInRun`, `HostSignInPageMode`. |
| `src/main/host-signal-home.ts` | `HostSignalHomeService`, `readSignalHomeChoice`, `SIGNAL_HOME_PREFERENCE_FILE`, `SignalHomeUnknownError`. Built at `application-services.ts` line 1550. |
| `src/main/host-events-service.ts` | `HostEventsService`, `HostWebhookRelay`, `WebhookDeliveryReport`, `HostAgentWebhookKeys`, `hostAgentWebhookKeys`, `agentWebhookRoutineWriter`. Built at `application-services.ts` line 2860. |
| `src/main/host-events-runtime.ts` | `HostEventsRuntime`. Built at `application-services.ts` line 2875. |
| `src/main/host-events-api.ts` | `HostEventsApi`, `HostEventsFailure`, `WebhookRouteConflict`, `hostEventsFailureMessage`. |
| `src/main/host-events-inputs.ts` | `parseListEventRoutines`, `parseSaveEventRoutine`, `parseSetWebhookSecret`, `parseListEventActivity`, and others. |
| `src/main/host-voice-model.ts` | `HostVoiceModelService`, `VoiceModels`. |
| `src/main/host-turn-limits-preference-store.ts` | (see Preference stores) |
| `src/main/hosted-server-bootstrap.ts` | `takeHostedServerEnvironment`, `hostedDiskRestoreProbe`, `applyHostedServerAccount`, `hostedServerStorageGb`, `HostedServerEnvironment`. |
| `src/main/hosted-server-service.ts` | `HostedServerDesktopService`, `HostedServerAuthClient`, `takeHostingDeveloperKey`, `withHostingDeveloperKey`. Built at `application-services.ts` line 1339. |
| `src/main/hosted-server-activity.ts` | `HostedServerActivity`, `CLIENT_USE_WINDOW_MS`. |
| `src/main/hosted-server-start-retry.ts` | `HostedServerStartRetry`. |
| `src/main/hosted-site-service.ts` | `HostedSiteDesktopService`, `HostedSiteAuthClient`, `HostedSiteServerCredential`, `HostedSiteFailure`. Built at `application-services.ts` line 1331. |
| `src/main/hosted-update-adapter.ts` | `HostedUpdateAdapter`, `HOSTED_UPDATE_TRIGGER`, `CONTAINER_UPDATE_PATHS`, `CONTAINER_UPDATE_TRIGGER`, `HOSTED_RUNTIME_DIRECTORY`. |
| `src/main/mobile-connect-host.ts` | `createHostedMobileConnect`, `createHostedMobileConnectLink`. |

### Updates

| path | what it owns |
|---|---|
| `src/main/update-service.ts` | `UpdateAdapter`, `UpdateCheckOutcome`, `UpdateCancellationToken`, `createDisabledUpdateAdapter`, `loadElectronUpdater`, `electronUpdaterCacheDirectory`, `UpdateDiagnosticEvent`, `UPDATE_INSTALL_TI...`. Imported by 10 files. |
| `src/main/update-readiness.ts` | `checkRestartReadiness`, `RestartReadiness`, `RestartReadinessInput`, `blockersAfterMaximumWait`. Decides if a restart is safe. |
| `src/main/update-sibling-instances.ts` | `listSiblingCodeBotInstances`, `CodeBotSiblingInstance`, `SiblingScanFailed`. |
| `src/main/requested-update.ts` | `RequestedUpdate`, `RequestedUpdateOptions`, `RequestedUpdateRefusal`, `RequestedUpdateRefusalReason`, `HOSTED_UPDATE_MAXIMUM_IDLE_WAIT_MS`. Update requested by a member. |
| `src/main/required-update.ts` | `RequiredUpdate`, `RequiredUpdateOptions`, `RequiredUpdateFetch`. Forced update check. |
| `src/main/update-install-guard.ts` | (see Persistence) |
| `src/main/update-preference-store.ts` | (see Persistence) |

### Providers and runtimes

| path | what it owns |
|---|---|
| `src/main/provider-runtime-manager.ts` | `ProviderRuntimeManager`, `ProviderRuntimeManagerOptions`, `providerRuntimeRoot`, `runtimeTarget`. Built at `application-services.ts` line 1705. |
| `src/main/provider-runtime-descriptors.ts` | `RuntimeSpec`, `RuntimeTarget`, `ArchiveDigest`, `ProviderRuntimeDescriptor`, `ProviderStageContext`, `INSTALL_RECORD`, `codexTag`, `cursorPackageUrl`, `kimiAssetName`, `OPENCODE_CLI_PACKAGE`. Per-provider install recipes. 844 lines. `provider-runtime-manager.ts` (2118 lines) is the largest provider file. |
| `src/main/provider-runtime-releases.ts` | `latestRelease`, `fetchBlockedVersions`, `LatestReleaseContext`, `BlockedVersions`, `readLimitedBody`. |
| `src/main/provider-runtime-archive.ts` | `extractArchive`, `extractZipFiles`, `extractZipTree`, `assertSafeArchive`, `isSafeLinkTarget`, `rejectNonRegularFiles`, `tarExecutable`. Safe archive extraction. |
| `src/main/provider-runtime-effects.ts` | `ProviderRuntimeFailure`. |
| `src/main/provider-runtime-failure-log.test.ts` | Test. |
| `src/main/provider-host-sign-ins.ts` | `ProviderHostSignIns`, `ProviderHostSignInDependencies`. |
| `src/main/provider-accounts-host.ts` | `ProviderAccountsHost`. Built at `application-services.ts` line 3248. |
| `src/main/provider-detection.ts` | `ProviderDetection`, `createProviderDetection`. |
| `src/main/provider-log.ts` | `startProviderLog`, `startAccountLog`, `startAgentLog`, `startMainLog`, `flushMainLog`. Log files. |
| `src/main/model-visibility.ts` | `ModelVisibility`, `ModelReleaseCatalog`. |
| `src/main/model-server-probe.ts` | `probeModels`, `ModelServerProbe`, `ProbeError`. |
| `src/main/model-reasoning-probe.ts` | `ReasoningProbe`, `createModelReasoningSupport`, `ModelReasoningSupport`. |
| `src/main/native-provider-runtime.ts` | `nativeProviderRuntime`. |
| `src/main/hermes-installer.ts` | `HermesInstaller`, `HermesInstallerOptions`. Built at `application-services.ts` line 1701. |
| `src/main/hermes-import-service.ts` | `HermesImportService`, `HermesImportAgents`. Built at `application-services.ts` line 3055. |
| `src/main/hermes-import-reader.ts` | `readHermesProfiles`, `readSkillFiles`, `routineSchedule`, `hasSkillCode`, `HermesProfileData`. |
| `src/main/hermes-import-reader.test.ts` | Test. |
| `src/main/process-launcher.ts` | `ProcessLauncher`, `ProcessLauncherHost`, `forkProcessLauncherHost`. |
| `src/main/process-launcher-host.ts`, `process-launcher-protocol.ts` | Host side and wire types for the launcher. |
| `src/main/local-server-child.ts` | `LocalServerChildEnvironment`, `LOCAL_SERVER_*` constants, `openLocalServerControl`. Child process env and control channel. |
| `src/main/local-servers/` (not in scope) | Local server registry and child spawner. |

### Voice

| path | what it owns |
|---|---|
| `src/main/voice-model-service.ts` | `VoiceModelService` (names: `VOICE_RUNTIME_ADDON`, `VOICE_SPEECH_DETECTOR`, `VoiceSessionConfig`, `SPEECH_HOST_THREADS`). |
| `src/main/voice-server-service.ts` | `VoiceServerService`, `transcribeRecording`, `createVoiceServerPreferenceStore`. |
| `src/main/voice-speech-service.ts` | `VoiceSpeechService`. Built in `application-services.ts` (line 4151). Also called from `ipc/voice-handlers.ts`. |
| `src/main/voice-speech-host.ts`, `voice-speech-host-process.ts` | `spawnVoiceSpeechHost`. Child process for speech. |
| `src/main/voice-speech-protocol.ts` | `VoiceSpeechRequest`, `VoiceSpeechResponse`, `VoiceSpeechFailure`, `VoiceSpeechHostProcess`. |
| `src/main/voice-transcription-service.ts` | `VoiceTranscriptionService`, `MODEL_ENGINES`. |
| `src/main/voice-transcription-host.ts`, `voice-transcription-host-process.ts` | `spawnVoiceTranscriptionHost`. Child process for transcription. |
| `src/main/voice-transcription-protocol.ts` | `VoiceTranscriptionRequest`, `VoiceTranscriptionResponse`, `VoiceTranscriptionEngine`. |
| `src/main/voice-cloud-speech.ts` | `speakInCloud`, `CloudSpeechRequest`, `SpeechFetch`. |
| `src/main/voice-cloud-stream.ts` | `openScribeSocket`, `scribeRealtimeUrl`, `ScribeRealtimeSession`, `VoiceStreamFailure`. |
| `src/main/video-reader.ts` | `VideoReader`. Built at `application-services.ts` line 2186. |

### Webhooks, GitHub, signals, and routines

| path | what it owns |
|---|---|
| `src/main/signal-ingress.ts` | `SignalIngress`, `SignalIngressOptions`, `WebhookIngressHandler`, `GitHubIngressHandler`, `WebhookIngressDelivery`, `GitHubIngressDelivery`. Imported by `application-services.ts`, `github-relay.ts`, `host-events-service.ts`, `webhook-relay.ts`. |
| `src/main/webhook-relay.ts` | `WebhookRelay`. Built at `application-services.ts` line 2833. |
| `src/main/webhook-security.ts` | `signWebhookBody`, `verifyWebhookSignature`, `verifyStandardWebhookSignature`. |
| `src/main/github-relay.ts` | `GitHubRelay`, `receiveGitHubDelivery`. Built at `application-services.ts` line 2690. |
| `src/main/github-connector-service.ts` | `GitHubConnectorService`. Built at `application-services.ts` line 1855. |
| `src/main/github-connector-store.ts` | `GitHubConnectorStore`, `GitHubConnectorRecord`. |
| `src/main/github-connector-config.ts` | `githubAppConfig`, `GitHubAppConfig`. Reads GitHub App config (values not copied here). |
| `src/main/github-bot-tokens.ts` | `GitHubBotTokens`, `GitHubBotToken`. |
| `src/main/github-device-flow.ts` | `requestGitHubDeviceCode`, `pollGitHubDeviceToken`, `refreshGitHubToken`, `GitHubDeviceFlowError`, `GITHUB_REQUEST_TIMEOUT_MS`, `githubUnreachable`. |
| `src/main/github-effects.ts` | `GitHubOperationError`, `GitHubPlatform`. |
| `src/main/github-mcp-proxy.ts` | `GitHubMcpProxy`. |
| `src/main/github-rest.ts` | `createGitHubRest`, `workflowGitHubDirectory`, `WorkflowGitHubDirectory`. |
| `src/main/github-skill-source.ts` | `githubSkillSource`, `GithubSkillSourceReader`, `GithubSkillFailure`. |
| `src/main/live-activity-push.ts` | `LiveActivityPushService`, `LiveActivityPushViewer`, `LiveActivitySendFailure`. |
| `src/main/push-notifications.ts` | `PushNotificationService`, `PushNotificationViewer`, `DESKTOP_USE_MS`. Uses the store from `push-notification-store.ts`. |
| `src/main/push-notification-store.ts` | `PushNotificationStore`, `StoredPushRegistration`, `readPushRegistration`, `readAndroidPushRegistration`. |
| `src/main/routine-feed-server.ts` | `RoutineFeedServer`. Built at `application-services.ts` line 2681. |
| `src/main/routine-feed-ics.ts` | `routineFeedIcs`. ICS calendar output. |
| `src/main/routine-hold-file.ts` | `ROUTINE_HOLD_FILE`, `writeRoutineHold`, `clearRoutineHold`, `takeRoutineHold`. |
| `src/main/routine-wake.ts` | `RoutineWake`. |
| `src/main/local-routine-calendar.ts` | `localRoutineCalendarSource`, `localRoutineFeedDocument`. |
| `src/main/message-link-relay.ts` | `MessageLinkRelay`, `openMessageLink`, `openHttpLink`. Built in `index.ts` line 1122. |
| `src/main/message-delete-refusal.ts`, `message-pin-refusal.ts` | `runMessageDelete`, `runMessagePin`. Error refusals. |
| `src/main/messaging-credential-store.ts` | `MessagingCredentialStore`. Test file exists. |
| `src/main/relayed-messaging-installs.ts` | `RelayedMessagingInstalls`, `RelayedPlatform`. |
| `src/main/slack-dev-callback-server.ts` | `SlackDevCallbackServer`, `startSlackDevCallbackServer`. Dev only. |

### Skills, workflows, agents, and library

| path | what it owns |
|---|---|
| `src/main/skill-marketplace-service.ts` | `SkillMarketplaceService`, `readPackFolders`, `SkillMarketplaceFailure`. Built at `application-services.ts` line 2788. |
| `src/main/skill-package.ts` | `archiveDirectory`, `inspectArchive`, `inspectSkillMarkdown`, `skillZippable`, `normalizedFiles`, `SKILL_FRONTMATTER`, `MAX_BYTES`. |
| `src/main/skill-folder-discovery.ts` | `listFolderSkills`, `listHomeFolderSkills`. |
| `src/main/local-skill-library.ts` | `LocalSkillLibrary`, `LocalSkillFailure`, `quotedSkillMarkdown`. |
| `src/main/local-skill-tools.ts` | `localSkillTools`, `keepSkillIdsReadable`. Test file exists. |
| `src/main/local-skill-learner.ts` | `localSkillLearner`. |
| `src/main/managed-skill-service.ts` | `ManagedSkillService`, `listManagedSkillsForChat`, `MANAGED_SKILL_SLUGS`, `OWNERSHIP_MARKER`. Built at `application-services.ts` lines 1300-1313. |
| `src/main/workflow-file-export.ts` | `WorkflowFileExporter`, `createWorkflowFileExporter`. |
| `src/main/workflow-folders-service.ts` | `WorkflowFoldersService`, `WorkflowFoldersSources`. Built at `application-services.ts` line 2559. |
| `src/main/workflow-picture-size.ts` | `sizeWorkflowPicture`. |
| `src/main/library-folders-service.ts` | `LibraryFoldersService`, `LibraryFoldersSources`, `LibraryFolderActionAgents`. Built at `application-services.ts` line 2159. |
| `src/main/instance-transfer-service.ts` | `InstanceTransferService`, `InstanceTransferOptions`, `createRedaction`, `PreparedExport`. Built at `application-services.ts` line 3074. |
| `src/main/instance-transfer-manifest.ts` | `INSTANCE_TRANSFER_FORMAT`, `INSTANCE_TRANSFER_VERSION`, `SHARED_FOLDER`, `SERVER_FOLDER`, `LIBRARY_FOLDER`, `TRANSFER_CHANNELS`, `TransferAgent`, `TransferSettings`. Export file format. |
| `src/main/instance-transfer-chunks.ts` | `InstanceTransferChunks`, `sha256Hex`, `readFully`, `writeFully`, upload and export part types. |
| `src/main/instance-transfer-history.ts` | `exportHistory`, `importHistory`, `exportChannelMessages`, `importChannelMessages`, `decodeChannelFiles`. |
| `src/main/instance-transfer-workflows.ts` | `exportWorkflows`, `importWorkflows`, `TRANSFER_WORKFLOWS`, `TransferWorkflowPort`. |
| `src/main/instance-transfer-runs.ts` | `TransferRun`, `transferRuns`, `decodeRuns`. |

### Browser, account, and wallets

| path | what it owns |
|---|---|
| `src/main/link-auth.ts` | `requestLinkDeviceCode`, `pollLinkDeviceToken`, `refreshLinkToken`, `revokeLinkToken`, `isLinkPa...`, `LINK_API_URL`, `LinkAuthError`. Device flow for account linking. |
| `src/main/link-account-service.ts` | `LinkAccountService`. Built at `application-services.ts` line 1866. |
| `src/main/link-account-store.ts` | `LinkAccountStore`, `LinkAccountRecord`. |
| `src/main/link-effects.ts` | `LinkOperationError`. |
| `src/main/license-service.ts` | `LicenseDesktopService`. Built at `application-services.ts` line 1337. |
| `src/main/referral-service.ts` | `ReferralDesktopService`. Built at `application-services.ts` line 1336. |
| `src/main/near-wallet-service.ts` | `NearWalletService`. Built at `application-services.ts` line 1873. |
| `src/main/near-wallet-store.ts` | `NearWalletStore`, `NearWalletRecord`, `NearOwner`, `NearStoredPayment`. |
| `src/main/near-wallet-signing.ts` | `NEAR_SIGNING_PATH`, `NearSigningRequest`, `NearSigningOptions`, `NearSigningCanceled`, `nearPasskeyPageOrigin`. |
| `src/main/near-intents-gateway.ts` | `NearIntentsGateway`, `createNearIntentsGateway`. |
| `src/main/near-wallet-effects.ts` | `NearOperationError`, `nearFailure`, `nearMessage`. |
| `src/main/onepassword-connector-service.ts` | `OnePasswordConnectorService`, `OnePasswordClient`, `OnePasswordCliRunner`. Built at `application-services.ts` line 1921. |
| `src/main/onepassword-connector-store.ts` | `OnePasswordConnectorStore`, `OnePasswordConnectorRecord`. |
| `src/main/onepassword-cli-installer.ts` | `installOnePasswordCli`, `downloadArchive`, `installedManagedCli`. |
| `src/main/onepassword-effects.ts` | `OnePasswordOperationError`. |
| `src/main/password-managers/` | Not in scope (subfolder). |
| `src/main/mcp-host-sign-ins.ts` | `McpHostSignIns`, `McpHostSignInDependencies`. |
| `src/main/mcp-oauth-redirect-server.ts` | `startMcpOAuthRedirectServer`, `McpOAuthRedirectServer`, `MCP_OAUTH_REDIRECT_PORT`, `MCP_OAUTH_REDIRECT_PATHS`. |
| `src/main/loopback-callback-server.ts` | `startLoopbackCallbackServer`, `LoopbackCallbackServer`. |
| `src/main/listen-loopback.ts` | `listenLoopback`, `listenLoopbackExact`. |
| `src/main/local-sign-in-window.ts` | `LocalSignInWindows`, `LocalSignInTarget`, `LocalSignInEnd`, `LocalSignInFailed`. |
| `src/main/local-sign-in-pages.ts` | `LocalSignInPages`. |

### Metrics, logs, and diagnostics

| path | what it owns |
|---|---|
| `src/main/resource-monitor.ts` | `ResourceMonitor`, `ResourceMonitorOptions`, `MainLoopStallProfile`. Built at `application-services.ts` line 3727. |
| `src/main/resource-summary.ts` | `ProcessGroup`, `ResourceProvider`, `ChildType`, `LoopPhase`, `MAIN_LOOP_STALL_MS`, `RESOURCE_ENUMS`, `RESOURCE_PROPERTY_NAMES`. Fixed label sets for resource events. |
| `src/main/machine-metrics.ts` | `MachineMetricsSampler`. Built at `application-services.ts` line 2821-2822. |
| `src/main/machine-alerts.ts` | `MachineAlertMonitor`, `MachineAlertMonitorOptions`. |
| `src/main/main-loop-profile.ts` | `MainLoopProfiler`, `summarizeCpuProfile`, `MainLoopProfileSummary`, `PROFILE_STALL_MS`. |
| `src/main/trace-file.ts` | `TraceFile`, `TraceFileOptions`, `TraceSpan`, `appendRotatingLines`. |
| `src/main/maintenance-service.ts` | `exportCodeBotData`, `exportDiagnostics`, `exportStartDiagnostics`. |
| `src/main/server-memory.ts` | `ServerMemory`, `agentProcessEnvironment`, `readLinuxMemory`, `readCgroupRoot`, `MemorySample`. |
| `src/main/screen-capture.ts` | `ScreenCapturer`, `CaptureImage`, `ScreenCapturerOptions`. |
| `src/main/video-reader.ts` | (see Voice). |

### Environment, certificates, and CLI tracking

| path | what it owns |
|---|---|
| `src/main/orca-pane-environment.ts` | `removeOrcaPaneEnvironment`. Deletes the `ORCA_*` pane variables from an environment object. Called at import time in `index.ts` (line 277). |
| `src/main/system-certificates.ts` | `trustSystemCertificates` (adds the OS CA roots to Node's default CAs; called from `index.ts` line 263), `AGENT_CERTIFICATES_FILE`, `agentCertificateEnvironment` (writes a PEM bundle for agent processes when the OS roots are not already bundled). |
| `src/main/system-cli-tracker.ts` | `createSystemCliTracker`, `SystemCliTrackerDependencies`. Records system-installed provider CLI versions in the runtime manager. Built in `application-services.ts` (line 2755). |
| `src/main/live-voice-choice.ts` | `liveVoiceOf`. Picks the live voice for a speech setting. Used by `ipc/voice-handlers.ts`. |

### Tests in this scope

13 test files sit beside their modules, for example `trusted-ipc.test.ts`, `trace-file.test.ts`, `vault-service.test.ts`, `remote-server-urls.test.ts`, `renderer-permissions.test.ts`, `remote-diagnostics.test.ts`, `messaging-credential-store.test.ts`, `local-skill-tools.test.ts`, `hermes-import-reader.test.ts`, `github-rest-redaction.test.ts`, `main-loop-profile.test.ts`, `provider-runtime-failure-log.test.ts`, and `ipc-channel-coverage.test.ts`.

## How it works

1. **Boot.** Electron runs `start.ts`. It loads `./index` with a dynamic import. In a packaged app, a damaged install (`SyntaxError`, `ERR_MODULE_NOT_FOUND`, etc.) shows a dialog and exits. A server exits without the dialog.
2. **Index module.** `index.ts` reads env at import time (dev profile, hosted server, server mode, local server child, forced-failure test hooks). Then it takes the single-instance lock. Then it creates the teardown registry and the main window holder and controller.
3. **Start-loop guard.** `StartAttempts.begin` (in `index.ts` around line 392) records each start. `takeStartHalt` reads the previous halt. `recoverFromStartLoop` and `enterServerSafeMode` run if a loop is found.
4. **Services.** `application-services.ts` builds almost all services and stores (the `new` calls listed under Key files). Most take a `preference-file.ts` store or a secret cipher. Files in this scope export those classes.
5. **IPC.** `index.ts` calls `registerIpcHandlers` (line 718). Groups in `src/main/ipc/` call `handleTrusted`. `trusted-ipc.ts` checks the sender with `isTrustedRendererUrl` and decodes the payload.
6. **Renderer events.** Services push to renderers through `renderer-ipc.ts` (`sendToRenderer`) and `renderer-forwarders.ts`.
7. **Remote and team.** `RemoteServerManager` owns connections to other hosts. It uses `RemoteServerClient`, `RemoteEventStream`, and `RemoteServerStore`. Team data uses `TeamStore`. Peer links use `TeamWebRtcBridge`, `TeamWebRtcClientTransport`, and host-side `TeamWebRtcHostPeer` and `TeamWebRtcHostGateway`. Each remote payload is decoded by a `remote-*-decoding.ts` file.
8. **Hosted and host modes.** `HostService`, `HostManager`, `HostUpdateCoordinator`, and `HostedServerDesktopService` handle the host role. Env flags pick the mode (`ServerMode`, `takeHostedServerEnvironment`).
9. **Webhooks.** External deliveries enter through `SignalIngress`. `WebhookRelay` and `GitHubRelay` pass them on. `HostEventsService` routes them to routines.
10. **Updates.** `UpdateAdapter` wraps the updater. `update-readiness.ts` checks if a restart is safe. `requested-update.ts` and `required-update.ts` handle member-driven and forced updates.
11. **Providers.** `ProviderRuntimeManager` installs and runs provider CLIs from `provider-runtime-descriptors.ts`. Downloads are checked with `provider-runtime-releases.ts` and extracted with `provider-runtime-archive.ts`.
12. **Child processes.** Heavy work runs in children: `process-launcher.ts`, `voice-speech-host-process.ts`, `voice-transcription-host-process.ts`, and `local-server-child.ts`. Each has a protocol file (`*-protocol.ts`).
13. **Shutdown.** `before-quit` (index.ts line 1996) and `window-all-closed` (1992) drive quit. `TeardownRegistry` runs ordered steps.

## How to change it

Each recipe lists the files to touch. Confirm names with Grep before editing.

1. **Add a JSON preference (simple setting).**
   - Copy the shape of a small store such as `host-turn-limits-preference-store.ts` (69 lines) or `sidebar-pin-store.ts`.
   - Use `readPreferenceFile` and `writePreferenceFile` from `preference-file.ts`.
   - Build it in `src/main/application-services.ts` near lines 1520-1600.
   - Expose it with an IPC handler (`src/main/ipc/`) and, for remote use, a route in `src/main/team-api/` (both out of scope).
2. **Add a secret.**
   - Store it through `ProviderCredentialStore` or `createSecretStorage` (`secret-storage-cipher.ts`).
   - Use a `codebot:` name for the `CodeBotSecretName` type (a template literal type) in `provider-credential-store.ts`.
   - Never log the value. Never copy it into docs or tests.
3. **Add a new provider runtime.**
   - Add a `RuntimeSpec` and a `ProviderRuntimeDescriptor` in `provider-runtime-descriptors.ts`.
   - Check release lookup in `provider-runtime-releases.ts`.
   - Use `extractArchive` from `provider-runtime-archive.ts` for the download.
   - Add a test beside `provider-runtime-failure-log.test.ts` if the failure log changes.
4. **Change the main window size.** Edit `minWidth` in `src/main/main-window.ts` (960 px). See AGENTS.md line 152. For tiling Linux, see `linux-tiling-desktop.ts` (`windowMinimumSize`, `desktopLayoutZoomFactor`).
5. **Add a GitHub webhook event.**
   - Handle it in `receiveGitHubDelivery` (`github-relay.ts`).
   - Check the signature with `webhook-security.ts`.
   - Route it in `SignalIngress` (`signal-ingress.ts`, `GitHubIngressHandler`).
6. **Add a startup step.**
   - Add the step name to `SERVICE_STEPS` in `startup-timing.ts`.
   - Run the step in `index.ts` inside the start sequence.
   - Add a teardown step in `TeardownRegistry` if the step holds resources.
7. **Change update rules.**
   - Restart checks: `update-readiness.ts` (`checkRestartReadiness`).
   - Member-requested updates: `requested-update.ts`.
   - Forced updates: `required-update.ts`.
   - Installer checks: `windows-update-signature.ts`.
8. **Add a remote-facing field.**
   - Decode it in the matching `remote-*-decoding.ts` file. Decode untrusted values at the boundary (AGENTS.md line 111).
   - Keep the host route change in `src/main/team-api/` (see AGENTS.md line 88).
9. **Change a child process protocol.**
   - Edit the `*-protocol.ts` file (for example `voice-speech-protocol.ts`).
   - Update both the host side (`*-host.ts`) and the process side (`*-host-process.ts`).
10. **Run the narrowest check (repo rules).** Use `bun run test:related -- <source>` for the tests of one changed file. Use `bun run test:desktop -- <path>` for one test file. Use `bun run typecheck:node` for `src/main`. These are in `package.json`. See AGENTS.md lines 191-200. Do not run full suites unless asked.

## Gotchas

- **Import-time side effects.** `index.ts` reads env and mutates it at import (for example `removeClaudeCodeSessionEnvironment(process.env)` and `removeOrcaPaneEnvironment(process.env)`, lines 276-277). Order matters. Do not move these without checking.
- **Single instance.** `requestSingleInstanceLock` (index.ts line 374) decides if this process continues. The `second-instance` handler (line 1466) uses `secondLaunchResponse` from `main-window-state.ts`.
- **Start-loop halt.** `START_LOOP_EXIT_CODE` and `START_HALT_FILE` (server-start-halt.ts) can stop a server from starting. A test guard exists (`takeServerStartGuardTest`). Check it before changing start logic.
- **Schema downgrade.** `RELEASED_SCHEMA_VERSIONS` is read by `start-recovery-release.ts`. `newer-database-recovery.ts` does not import it. Check `start-recovery-release.ts` before you change the schema list or a schema.
- **Preference files are shared.** `preference-file.ts` has 57 importers. A format change affects many stores.
- **Platform prefixes.** File prefixes show the platform: `linux-*`, `mac-*`, `windows-*`. Some files are no-ops on other systems.
- **Electron imports.** Most files import `electron`. Tests must inject boundaries (AGENTS.md line 127). Vitest files are limited to protected areas (AGENTS.md "Tests" section, line 362 on). Tests use fakes, not real windows.
- **Remote input is untrusted.** `remote-*-decoding.ts` and `trusted-ipc.ts` decode input. Do not add a second validation for internal trusted values (AGENTS.md line 111).
- **Sender checks.** A new IPC handler must use `handleTrusted` or `handleTrustedWithEvent`. Direct `ipcMain.handle` skips the sender check.
- **Effects files.** Files named `*-effects.ts` (for example `github-effects.ts`, `near-wallet-effects.ts`, `remote-desktop-effects.ts`) hold error types for Effect-based code. The exact mapping for each file is unverified.
- **Subfolders are separate.** `ipc/`, `team-api/`, `local-servers/`, `password-managers/` are not in this scope. Changes that touch a route usually need both a file here and a file in `team-api/`.
- **Child processes need protocol updates together.** Changing a `*-protocol.ts` file needs matching changes in the host and the child process file.
- **Keep names exact.** Some names in this doc are truncated (for example `UPDATE_INSTALL_TI...`, `isLinkPa...`, `writeProtected...`). They are shortened only for this doc. Use Grep for the full name.
- **Not checked.** Behavior of most files and the callers of `team-api-server.ts` are unverified. `team-api-server.ts` is imported by `host-service.ts` (grep); the other callers were not checked.
