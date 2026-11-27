# Engine map: browser, channels, routines, CRM, MCP, memory, skills, files and other backend areas

## What this area is

- The backend folders that are not about providers, agents, threads or the database. Paths are under `src/backend/` unless shown.
- It covers the embedded browser (`browser-*`), channels (`channel-*`), routines (`routine-*`, `routine-flows/`, `routine-results/`), workflows, CRM (`crm/`), MCP servers (`mcp-*`), memory stores, local skills, workspace and attachment files, messaging connectors (`messaging/`), and small shared helpers.
- Each store writes to `codebot.db` through `CodeBotDatabase`. Schema changes must follow `src/backend/AGENTS.md` (new migration file, history JSON, parity test).
- Several features here are hidden in the PRD (section 15). The hidden-feature switch is not built yet. See the section "Hidden features (PRD section 15)".

## Key files

### Browser (embedded browser and agent browser control)

| Path | What it owns |
| --- | --- |
| `browser-host.ts` (5245 lines) | `BrowserHost` class. Owns tabs, sessions, user control, sign-in and secret handling, teach mode, site memory and tool dispatch. Constructed in `src/main/application-services.ts` (about line 1433). |
| `browser-cdp.ts` (4245 lines) | `BrowserCdpEngine`. Drives one page through the Electron `WebContents.debugger` (CDP). Snapshot, input, dialogs, screencast. |
| `browser-cdp-snapshot.ts` | `collectBoundedSnapshot`, `MAX_SNAPSHOT_SCANNED_NODES`, `CardValueScrub`, target candidate text. |
| `browser-cdp-input.ts` | `dispatchMouseClick`, `dispatchText`, `dispatchShortcut`, modifier and key helpers. |
| `browser-cdp-values.ts` | Value helpers for CDP results (not read in detail). |
| `browser-tools.ts` (632 lines) | `CODEBOT_BROWSER_NAMESPACE` (`"codebot_browser"`), `BROWSER_TOOL_DEFINITIONS`, `BROWSER_DYNAMIC_TOOLS`, `parseBrowserToolCall`, `parseBrowserToolArguments`, `parseBrowserStep`, script limits. |
| `browser-tool-actions.ts`, `browser-tool-input.ts` | `browserInputAction`, `browserToolTimeout`, input repair for browser tool calls. |
| `browser-control.ts`, `browser-control-sessions.ts` | `BrowserControlSessions`, `controlSessionId`, `browserControlAction`. Maps tools to control state per thread and turn. |
| `browser-tab-operations.ts` (757 lines) | Tab queue (`enqueueTabOperation`), `runTabAction`, `runTabEvaluation`, `runTabFillFields`, `readTabSnapshot`, `readActionStatus`, dialog results, site memory helpers (`BrowserSiteMemories`). |
| `browser-script.ts` | `runBrowserScript` (the `run_script` tool), step outcomes, page crash handling. |
| `browser-recorder.ts`, `browser-recorder-permission.ts` | `BrowserRecorder` (`recording_start`, `recording_stop`), recording frame size, permission check. |
| `browser-state.ts` | `readBrowserState`, `StoredBrowserStateV2`, tab session partitions, persistable URL rules. |
| `browser-policy.ts` | `normalizeBrowserUrl`, `isAllowedMainUrl`, `isAllowedBrowserPermission`, request headers, language setup. |
| `browser-consent.ts` | `refuseCookieBanners`, `stopCookieBanners` (cookie banner handling in a separate world). |
| `browser-challenge.ts` | `detectChallenge`, `describeChallenge`, sign-in challenge helpers (behavior detail unverified). |
| `browser-location.ts` | `BrowserLocationRequests`, per-origin location answers (`alwaysLocationKey`). |
| `browser-card-fill.ts`, `browser-card-scrub.test.ts` | Payment card fill. `BROWSER_CARD_FIELDS`, field description and selection functions. |
| `browser-identity.ts`, `browser-user-click.ts`, `browser-cursor.ts`, `browser-press-guard.ts`, `browser-settle.ts`, `browser-screencast-pacing.ts`, `browser-shortcuts.ts`, `browser-navigation.ts`, `browser-fill-fields.ts`, `browser-host-tab.ts`, `browser-effects.ts` | Smaller helpers: identity, user clicks, cursor overlay, press guard, page settle, screencast pacing, shortcuts, navigation, fill fields, one tab wrapper, effect errors. |
| `browser-diagnostics.ts` | Browser diagnostics helpers and their test. |
| `browser-profiles/browser-profile-store.ts` | `BrowserProfileStore`, `BrowserProfileRecord`. |
| `browser-profiles/browser-proxy-store.ts` | `BrowserProxyStore`, proxy record types. |
| `browser-profiles/browser-proxy-relay.ts` | `openBrowserProxyRelay`, `socksExit`. Local relay to a SOCKS upstream. |
| `src/main/ipc/browser-handlers.ts` | IPC groups `browser` and `browserInput`. |
| `src/main/ipc/browser-dock-handlers.ts` | IPC group `browserDock` (dock presentation and overlay frame). |

### Channels (group chats that hold agents, tasks and assignments)

| Path | What it owns |
| --- | --- |
| `channel-service.ts` (4111 lines) | `ChannelService` class. Receives commands, hand-offs and notes. Schedules work to members. Handles deliveries, results and cancellation. Hooks type: `ChannelHooks`. Built in `src/backend/agent-service.ts` (about line 1506). |
| `channel-store.ts` (1338 lines) | `ChannelStore`. SQL reads and commits for channels, messages, assignments, contexts, summaries and reads. Types `ChannelAssignment`, `ChannelContext`, `ChannelHistorySummary`. |
| `channel-history.ts` (700 lines) | `ChannelHistory`. Bounded history pages, summaries (model text through a hook), delivered context text, `CHANNEL_LANGUAGE_RULE`. |
| `channel-management.ts` | `CHANNEL_MANAGEMENT_TOOLS`, `isChannelRoutineTool`, `PERSON_REQUEST_REQUIRED`, `channelRoutineTool`, change notes for members, instructions and routines. |
| `channel-tools.ts` | `CHANNEL_TOOL_DEFINITIONS` (15 tools): `channel_history`, `channel_assign`, `channel_transfer`, `channel_result`, `channel_reply`, `channel_cancel`, `channel_remember`, `channel_forget_memory`, `channel_add_member`, `channel_remove_member`, `channel_set_instructions`, `channel_list_routines`, `channel_create_routine`, `channel_update_routine`, `channel_delete_routine`. |
| `channel-replies.ts` | `CHANNEL_REPLY_LIMIT`, `CHANNEL_REPLY_CHARACTERS`, `checkChannelReply`, reply sender rules. |
| `channel-request-returns.ts` | `ChannelRequestReturns`. Returns person requests and answers to the waiting agent. |
| `channel-images.ts` | `ChannelImages`. Image files for channels (root `channelImagesRoot`). |
| `channel-memory-store.ts` | `ChannelMemoryStore` (extends `MemoryStore`). Table `projection_channel_memories`. |
| `channel-routine-store.ts` | `ChannelRoutineStore` (extends `RoutineStore`). Channel-owned routines. |
| `channel-routine-scheduler.ts` (400 lines) | `ChannelRoutineScheduler` (implements `RoutineDueSource`). Fires channel routines. |
| `channel-effects.ts` | `ChannelOperationError`, `channelFailure`, `channelResult`, `channelSync` (Effect helpers). |
| `src/main/ipc/channel-folder-handlers.ts` | IPC group `channelFolders`. |
| `src/main/ipc/channel-memory-handlers.ts` | IPC group `channelMemories`. |
| `src/main/ipc/channel-routine-handlers.ts` | IPC group `channelRoutines`. |

### Routines, routine flows, routine results and workflows

| Path | What it owns |
| --- | --- |
| `routine-store.ts` (1452 lines) | `RoutineStore`. Generic store for agent and channel routines: records, triggers, runs, missed runs, pause by run, webhooks, validation. Types `OwnedRoutine`, `OwnedRoutineRun`, `DueRoutine`, `RoutineRunStart`. |
| `routine-tables.ts` | `ROUTINE_TABLES` with two owner kinds: `agent` and `channel`. Table names are in the next section. |
| `routine-records.ts` | `RoutineRecords` (and `RoutineRecordFailed`). One facade over the agent and channel stores. Wired in `agent-service.ts` (about line 1748). |
| `routine-timer.ts` | `RoutineTimer` and `RoutineDueSource`. Arms one timer for the next due time across all sources. |
| `routine-tool-schema.ts` | Zod schemas: schedule, instruction, limit policy, missed policy, run place, webhook event type and filters. |
| `agent-routine-store.ts` | `AgentRoutineStore` (extends `RoutineStore`). Agent-owned routines. Used by `agent/routine-scheduler.ts` (adjacent). |
| `routine-flows/routine-flow-store.ts` | `RoutineFlowStore`. Flow links, steps and positions. |
| `routine-flows/routine-flow-routines.ts`, `routine-flows/routine-flow-graph.ts`, `routine-flows/routine-flows.ts` | Flow graph and the `createRoutineFlows` service. |
| `routine-flows/routine-flow-tools.ts` | `ROUTINE_FLOW_TOOL_DEFINITIONS`, `handleRoutineFlowTool`. |
| `routine-results/routine-result-store.ts`, `routine-results/routine-results.ts` | `RoutineResultStore`, `createRoutineResults`, `resultText`. Delivers a routine answer to its destinations. |
| `routine-run-*` and `routine-*-migration.test.ts` | Migration tests for routine run columns and results. |
| `webhook-route-store.ts` | `WebhookRouteStore`, webhook receipts, `revokeRoutineWebhooks`. |
| `webhook-trigger.ts` | `validateWebhookTrigger`, event type and filter limits. |
| `workflows/workflows.ts` (2418 lines) | `createWorkflows`. Workflow service. |
| `workflows/workflow-store.ts`, `workflows/workflow-run-store.ts`, `workflows/workflow-graph.ts`, `workflows/workflow-walk.ts`, `workflows/workflow-transaction.ts` | Workflow storage, run storage, graph and transactions. |
| `workflows/workflow-triggers.ts` | `WorkflowTriggers` (implements `RoutineDueSource`). Schedule and webhook triggers for workflows. |
| `workflows/workflow-tools.ts` | `WORKFLOW_TOOL_DEFINITIONS`, `WORKFLOW_ANSWER_TOOL_DEFINITION`, `handleWorkflowTool`, `handleWorkflowAnswerTool`. |
| `workflows/slack-matching.ts`, `telegram-matching.ts`, `discord-matching.ts`, `github-matching.ts`, `github-output.ts`, `workflow-github-*.ts` | Connector matching and output for workflow steps. |
| `workflows/higgsfield-*.ts`, `sunra-*.ts`, `media-catalog.ts`, `mcp-media.ts`, `credit-media.ts`, `flat-background.ts` | Media steps and catalogs (detail unverified). |
| `workflow-folders-store.ts` | `WorkflowFoldersStore`. File `codebot-workflow-folders-v1.json` in userData. |
| `src/main/ipc/routine-handlers.ts` | IPC group `agentRoutines`. |
| `src/main/ipc/routine-feed-handlers.ts` | IPC group `routineFeed`. |
| `src/main/ipc/routine-result-handlers.ts` | IPC group `routineResults`. |
| `src/main/ipc/workflow-handlers.ts` | IPC group `workflows`. |

### CRM

| Path | What it owns |
| --- | --- |
| `crm/crm.ts` | `Crm` service (`Context.Service` id `codebot/backend/Crm`), `CrmDependencies`, `CrmHandle`. Builds `CrmStore`, sources and the agent view. |
| `crm/crm-store.ts` (1380 lines) | `CrmStore`. Customers, plans, payments, statuses, tags, sources, proposals, agent access and private fields. `propose`, `apply`, `#decide`. |
| `crm/crm-agent-view.ts` | `CrmAgentView`, agent read and propose operations. `CrmAgentFindInput`, `CrmAgentProposeInput`. |
| `crm/crm-handle.ts` | `CrmError`, `CrmPeopleOperations`, `CrmSettingsStore`. |
| `crm/crm-source.ts` | `CrmSourceAdapter`, `makeCrmSources`, `SourceFailure`. Source sync. |
| `crm/crm-source-store.ts` | `CrmSourceStore`. Source batches and state. |
| `crm/crm-stripe.ts` | `stripeSource`. A CRM source adapter that reads Stripe data. Wired in `src/main/application-services.ts` (about line 2641). |
| `crm/crm-schema.ts` | `CRM_TABLES_AFTER_MIGRATION` (table shape for tests). |
| `agent/crm-tool.ts` | `CRM_TOOL_DEFINITIONS`: `crm_find`, `crm_customer`, `crm_payments`, `crm_propose` (agent side, adjacent). |
| `src/main/ipc/crm-handlers.ts`, `src/main/ipc/crm-inputs.ts` | IPC group `crm`. |
| `crm-migration.test.ts` | CRM migration test. Schema from `migrations/0063-crm.ts`. |
| `packages/contracts/src/ipc-crm.ts` | `DEFAULT_CRM_SETTINGS` = `{ enabled: false }` (line 77). |

### MCP servers

| Path | What it owns |
| --- | --- |
| `mcp-server-store.ts` (323 lines) | `McpServerStore` (table `projection_mcp_servers`). `list`, `listEnabled`, `get`, `save`, `remove`, `setEnabled`, `migrateCatalogRows`. Built-in remote bridges: `MCP_REMOTE_BRIDGES` (canva, linear, notion, figma, sentry, stripe). `CATALOG_PIN_MOVES`. |
| `mcp-probe.ts` (767 lines) | `testMcpServer`, `inspectMcpServer`, `callMcpServerTool`. Timeouts: `MCP_STDIO_PROBE_TIMEOUT_MS` (60 s), `MCP_TOOL_CALL_TIMEOUT_MS` (5 min). |
| `mcp-provider-shapes.ts` (598 lines) | `agentMcpServers(configs, computerUse)`, `usableMcpServers`, `mcpLaunchEnvironment`, `mcpEnvironment`, `needsManagedRuntime`, `pickWindowsExecutable`, `clearMcpCommandCache`. Filters the computer-use server. |
| `mcp-stdio-relay.ts` | `startStdioMcpRelay`, `StdioMcpLaunch`. Relays a stdio MCP server. |
| `mcp-oauth-provider.ts` (1818 lines) | `McpOAuth` class, `McpOAuthRecord`, `secureOAuthFetch`, `normalizeResource`, relay URL and callback constants. Built in `src/main/application-services.ts` (about line 1846). |
| `mcp-oauth-proxy.ts` (596 lines) | `McpOAuthProxy`, `mcpOAuthProxyRoute`, `insufficientScopeChallenge`. Used by `agent/mcp-gateway.ts` (adjacent). |
| `mcp-redaction.ts` | `redactMcpSecrets`, `redactMcpRecord`, `registerMcpSecretValues`, `mcpSecretValues`. |
| `mcp-handoff-log.ts` | `McpHandoffLog`. Used by `agent/mcp-gateway.ts` (adjacent). |
| `mcp-effects.ts` | `McpOperationError`, `mcpCall`, `mcpResult`. |
| `local-mcp-bridge.ts` (503 lines) | `LocalMcpBridge`. A local HTTP MCP server. Provider CLIs connect to it to call dynamic tool namespaces. `DynamicToolNamespace`, `LocalMcpSession`. |
| `agent/mcp-tools.ts` | `MCP_SERVER_TOOL_DEFINITIONS`: `list_mcp_servers`, `save_mcp_server`, `test_mcp_server`, `set_mcp_server_enabled`, `remove_mcp_server` (agent side, adjacent). |
| `src/main/ipc/mcp-server-handlers.ts`, `src/main/ipc/mcp-inputs.ts` | IPC group `mcpServers`. Sign-in, relay, app and test calls. |
| `migrations/0020-mcp-servers.ts`, `migrations/0021-free-computer-use-server-name.ts` | Table creation and the rename of a user server named `computer_use`. |

### Memory

| Path | What it owns |
| --- | --- |
| `memory-store.ts` | `MemoryStore` (generic). Takes `MemoryTables`. `list`, `get`, `count`, `limit`, `createManual`, `duplicate`, `updateManual`, `delete`, `clear`. Helpers `normalizeMemorySite`, `memorySitesForHost`, `memoryPromptLine`. |
| `agent-memory-store.ts` | `AgentMemoryStore` (extends `MemoryStore`). Tables `projection_agent_memories`, `agent_memory_selections`, full-text index `agent_memory_search`. Search and list pages. |
| `agent-memory-selection.ts`, `agent-memory-selection-migration.test.ts` | Which memories an agent uses. |
| `channel-memory-store.ts` | `ChannelMemoryStore` (table `projection_channel_memories`). |
| `messaging/messaging-memory-store.ts` | Messaging memory store (detail unverified). |
| `host-memory.ts` | `HostMemory` interface and `HostMemoryLevel` (`ok`, `low`, `critical`). Turn limits and reservations. Consumers unverified. |
| `user-browsing-log.ts` | `UserBrowsingLog`, retention and text limits. Log of user browsing steps. |
| `src/main/ipc/memory-handlers.ts` | IPC group `agentMemories`. |
| `src/main/ipc/channel-memory-handlers.ts` | IPC group `channelMemories`. |

### Skills (local skills and the skill marketplace)

| Path | What it owns |
| --- | --- |
| `home-skills.ts` | `HOME_SKILL_FOLDER` (`.agents/skills`), `SKILL_OWNERSHIP_MARKER` (`.codebot-managed.json`), limits (200 skills, 256 KB per file), `listHomeSkills`, `homeSkillTagId`, `skillFolderNames`, `userSkillFolderNames`. |
| `skill-frontmatter.ts` | `readSkillFrontmatter`, `SkillFrontmatterProblem`. |
| `agent/skill-tools.ts` | `LOCAL_SKILL_TOOL_DEFINITIONS` (agent side): `create_skill`, `revise_skill`, `list_local_skills`, `read_local_skill`, `install_local_skill`, `set_skill_enabled`, `uninstall_skill`. |
| `src/main/ipc/local-skill-inputs.ts`, `src/main/ipc/skill-handlers.ts` | IPC group `skills`. Local calls: `localList`, `localGet`, `localCreate`, `localRevise`, `localInstall`. Marketplace calls: `list`, `get`, `getBySlug`, `listMine`, `choosePackage`, `submit`, `listInstalled`, `install`, `uninstall`, `setEnabled`. |
| `src/main/skill-marketplace-service.ts` | `SkillMarketplaceService`, `SkillMarketplaceFailure`. Marketplace logic (main process, adjacent). |
| `src/main/agent-marketplace-service.ts` | `AgentMarketplaceService`. Agent marketplace logic (main process, adjacent). |
| `src/main/ipc/marketplace-agent-handlers.ts`, `src/main/ipc/marketplace-link-handlers.ts` | IPC groups `marketplaceAgents` and `marketplace`. |

### Workspace and files

| Path | What it owns |
| --- | --- |
| `workspace-paths.ts` | `resolveWorkspaceFile`, `resolveSharedFile`, `listWorkspaceDirectory`, `workspacePathFromInput`, `sharedPathFromInput`, `rebaseLegacyWorkspacePath`, `isWithin`, `WorkspacePathRefused`. Keeps paths inside an agent workspace or the shared folder. |
| `path-containment.ts` | `isPathInside`. |
| `attachment-files.ts` (824 lines) | `AttachmentFiles`. Draft and transfer file operations, generated attachments, export. Must not import `MailboxStore` (see `src/backend/AGENTS.md`). |
| `attachment-effects.ts` | `AttachmentOperationError`, `attachmentCall`, `attachmentResult`. |
| `user-files-bytes.ts` | `UserFilesBytes`. Byte totals for user files. |
| `file-hash.ts`, `file-errors.ts`, `image-size.ts` | `sha256File`, `isMissingFileError`, `imageSizeOfBytes`. |
| `library-folders-store.ts` | `LibraryFoldersStore`, `LibraryFolderChangeRefused`. File `codebot-library-folders-v1.json` in userData. |
| `storage-usage.ts` (649 lines) | `StorageUsageService`, `StorageUsageScanner`, `measureTree`, `diskSpace`. |
| `disk-restore.ts` | Disk restore wait and probe. |
| `mailbox-store.ts` (4426 lines, adjacent) | `MailboxStore`. Owns mailbox state. Exports `channelLane`, `laneChannelId`, `MESSAGING_LANE`. Channels use it for delivery lanes. |
| `message-delete.ts`, `message-pins.ts`, `message-run-ids.ts` | `MessageDeleteRefused`, `MessagePinRefused`, run id helpers. |

### Messaging connectors (Slack, Discord, Telegram, WhatsApp)

| Path | What it owns |
| --- | --- |
| `messaging/messaging-service.ts` | `MessagingService`, `MessagingOperationFailed`. Built in `src/main/application-services.ts` (about line 897). |
| `messaging/messaging-threads.ts` | `MessagingThreads`. Links platform chats to mailbox threads. `PLATFORM_NAMES`. |
| `messaging/messaging-store.ts`, `messaging-history-store.ts` | Connector state and history tables. |
| `messaging/messaging-tools.ts` | `MESSAGING_TOOL_DEFINITIONS`: `messaging_remember`, `messaging_forget_memory`, `messaging_history`, `messaging_list_places`, `messaging_post`. |
| `messaging/messaging-prompt.ts`, `messaging-mentions.ts`, `messaging-chunks.ts`, `messaging-status-posts.ts`, `messaging-types.ts` | Prompt text, mentions, message splitting, status posts, types. |
| `messaging/slack/` | `SlackConnect`, `slackDriver`, `SlackEventsTransport`, `slackInboundMessage`, `SlackWebApi`, `slackMrkdwn`, `slack-orchestrator.ts`. |
| `messaging/discord/` | `discord-connect.ts`, `discord-driver.ts`, `discord-transport.ts`, `discord-orchestrator.ts`, `discord-events.ts`. |
| `messaging/telegram/` | `telegramDriver`, `TelegramChats`, `telegramLinkUrl`, `telegramHtml`, `telegram-updates.ts`, `telegram-orchestrator.ts`. |
| `messaging/whatsapp/` | `whatsapp-session.ts`, `whatsapp-runtime.ts` (imports `@codebot/whatsapp/baileys`), `whatsapp-driver.ts`, `whatsapp-senders.ts`, `whatsapp-loop-guard.ts`, `whatsapp-archive.ts`, `whatsapp-media.ts`. |
| `src/main/ipc/messaging-handlers.ts`, `src/main/ipc/messaging-inputs.ts` | IPC group `messaging`. Overview, connect, disconnect, reconnect, enable, orchestrator and access calls per platform. |

### Other backend modules in this scope

| Path | What it owns (from exports) |
| --- | --- |
| `password-vault.ts`, `password-vault-router.ts`, `vault-items.ts` | `PASSWORD_MANAGER_BRANDS`, `PasswordVaultError`, `passwordVaultRouter`, `vaultClosedText`. |
| `link-wallet.ts`, `near-wallet.ts` | `LinkWalletError`, `NearWalletError`. Wallet link cards (purpose detail unverified). |
| `sidebar-layout-store.ts` | `SidebarLayoutStore` (EventEmitter). Sidebar layout state. |
| `team-chat-store.ts` | `TeamChatStore`, `directThreadId`. |
| `versioned-json-store.ts` | `readVersionedJsonFile`, `versionedJsonFallbackPath`. JSON files with a version field. |
| `with-timeout.ts` | `withTimeout`, `TimeoutError`. |
| `restart-activity.ts` | `recordRestartActivity`, `recordAgentRestartActivity`. |
| `conversation-read-store.ts` | `ConversationReadStore`. |
| `cursor-mcp-disabled.ts`, `pi-mcp.ts`, `pi-mcp-names.ts` | Provider-specific MCP helpers. Provider area (adjacent, not read). |

### Vault, wallet and connector IPC groups

These backend modules have IPC groups in `src/main/ipc/`. They are not described in the sections above, and their PRD section 15 status is not checked here.

| IPC group | Handler file |
| --- | --- |
| `vault` | `vault-handlers.ts` |
| `passwordManagers` | `password-managers-handlers.ts` |
| `bitwardenConnector` | `bitwarden-connector-handlers.ts` |
| `onePasswordConnector` | `onepassword-connector-handlers.ts` |
| `githubConnector` | `github-connector-handlers.ts` |
| `nearWallet` | `near-wallet-handlers.ts` (uses `near-wallet.ts`) |
| `linkAccount` | `link-account-handlers.ts` |

## Hidden features (PRD section 15)

Source: `docs/codebot/prd-status.md` section 15 and `docs/codebot/decisions.md` D14. All rows are status `todo` in the PRD at this time.

| PRD feature | PRD decision | Backend entry points in this area | IPC groups |
| --- | --- | --- | --- |
| Routines | Keep, hidden | `routine-store.ts`, `routine-timer.ts`, `routine-records.ts`, `agent-routine-store.ts`, `channel-routine-*.ts`, `routine-flows/`, `routine-results/`, `webhook-*.ts` | `agentRoutines`, `channelRoutines`, `routineFeed`, `routineResults` |
| Channels | Keep, hidden | `channel-service.ts`, `channel-store.ts`, `channel-*.ts` | `channelFolders`, `channelMemories`, `channelRoutines` |
| Marketplace | Keep, hidden | `src/main/skill-marketplace-service.ts`, `src/main/agent-marketplace-service.ts`, `marketplace/` (catalogs) | `marketplace`, `marketplaceAgents`, `skills` |
| Slack, Discord, Telegram, WhatsApp connectors | Keep, hidden | `messaging/`, `messaging-threads.ts` | `messaging` |
| Computer Use | Keep, hidden | `mcp-provider-shapes.ts` (`computerUse` flag), `migrations/0021-...`; main side `src/main/computer-use-*.ts`, `src/main/cua-driver-runtime.ts` | `computerUse` |
| Remote desktop | Keep, hidden | Not in `src/backend`. Main side: `src/main/remote-desktop-manager.ts`, `remote-desktop-runtime-artifact.ts`, `remote-desktop-*.ts` | Not read in detail (unverified) |
| Local skills | Keep, visible | `home-skills.ts`, `skill-frontmatter.ts`, `agent/skill-tools.ts` | `skills` (local calls) |
| Embedded browser | Keep, visible, redesigned | `browser-*.ts`, `browser-profiles/` | `browser`, `browserInput`, `browserDock` |
| 15.1 Hidden means no button, switch in Settings > Advanced features | Required | None found (see Gotchas) | None |
| 15.2 Turned-on feature shows in left bar or settings | Required | Not in this area | None |

Other PRD section 15 rows that touch this area:

- Billing, Stripe, plans (Remove, W02): `crm/crm-stripe.ts` is a CRM source adapter for Stripe. It is not billing code. Its removal status is unverified.
- OpenBot hosted servers (Remove, W02): the agent tool `list_sites` in `codebot-tools.ts` and `src/main/ipc/hosted-site-handlers.ts` look related. Status unverified.

## How it works

### Browser

1. An agent calls a tool in the `codebot_browser` namespace. `src/backend/agent/codebot-tool-router.ts` (about line 886) checks the channel rule first (see Gotchas).
2. `parseBrowserToolCall` (`browser-tools.ts`) checks the arguments. Input repair runs first.
3. `BrowserHost` (`browser-host.ts`) puts the call in a tab queue (`enqueueTabOperation` in `browser-tab-operations.ts`). Each tab has one owner thread and turn.
4. `BrowserCdpEngine` (`browser-cdp.ts`) runs the page work through `WebContents.debugger`: snapshot, click, type, scroll, dialogs and screencast.
5. Results come back through readers such as `readTabSnapshot` and `readActionStatus`. Secrets and card values pass through `CardValueScrub` and the vault tools, and are not echoed.
6. User takeover uses `BrowserUserControlHolder` and `awaitUserControlRelease`. Teach mode records `BrowserTeachStep` items.
7. Tab count is capped by `INPUT_LIMITS.browserTabs` (25, `packages/contracts/src/input-limits.ts` line 80).
8. Persistent state is read and written through `browser-state.ts` (`readBrowserState`, `StoredBrowserStateV2`).

### Channels

1. A person or agent sends a command, hand-off or note to a channel. `ChannelService.command`, `handoff` or `postNote` runs it.
2. `ChannelStore.commit` writes one change. It also appends orchestration events and updates the `projection_channel_*` tables.
3. `ChannelService.wake` runs the per-channel pump fibers (`#pumps`) that hand out assignments. Limits are `CHANNEL_PARALLEL_LIMIT` and `CHANNEL_ASSIGNMENT_LIMIT` from `@codebot/contracts/ipc`.
4. Agents reply with `channel_reply`, `channel_result` or `channel_cancel`. Replies follow `channel-replies.ts` rules.
5. Long histories are summarised. `ChannelHistory` calls the model through a hook (`hooks.generate`).
6. Members, instructions and routines can change only from a person's request (`PERSON_REQUEST_REQUIRED`).
7. Channel routines are fired by `ChannelRoutineScheduler`. Its changes call `routineTimer.arm()`.

### Routines

1. Every due source implements `RoutineDueSource` (`nextDueAt`, `processDue`). The sources are `RoutineScheduler` (`agent/routine-scheduler.ts`, agent routines), `ChannelRoutineScheduler` and `WorkflowTriggers`. `AgentRoutineStore` is the storage behind agent routines, not a due source.
2. `RoutineTimer` (`routine-timer.ts`) arms one timer for the earliest due time. `MAX_DELAY` is 60 s and `MIN_REFIRE_GAP` is 2 s.
3. `RoutineStore.#insertRun` writes a run row. Missed runs follow the missed policy (`skipMissed`, `#recordMissed`). Limits follow `limit policy`.
4. The run starts a turn for the owner. Output goes to `RoutineResultStore` and its destinations (`routine_result_destinations`).
5. A webhook routine is fired by a receipt in `WebhookRouteStore`. Filters come from `validateWebhookTrigger`.
6. Routine flows (`routine-flows/`) link routines to agents through `routine_flow_links`, `routine_flow_steps` and `routine_flow_positions`.

### CRM

1. CRM is off by default. `DEFAULT_CRM_SETTINGS` is `{ enabled: false }`. Agent calls fail with `error.crm.off` when it is off (`crm/crm.ts`, `agentAttempt`).
2. An agent does not change records directly. `crm_propose` creates a row in `crm_proposals`.
3. A user approves or denies. `CrmStore.#decide` applies the change in a transaction. Nested calls use savepoints (see `src/backend/AGENTS.md`).
4. Sources (for example Stripe through `stripeSource`) run through `makeCrmSources`. Source state is kept in `CrmSourceStore`.

### MCP servers

1. Servers are saved in `projection_mcp_servers` (`McpServerStore`). Built-in remote bridges are in `MCP_REMOTE_BRIDGES`.
2. `agentMcpServers(configs, computerUse)` picks the servers for one agent. It removes the computer-use server when the flag is off.
3. Stdio servers run with `mcpLaunchEnvironment`. Relays run through `startStdioMcpRelay`.
4. HTTP servers that need sign-in use `McpOAuth` (`secureOAuthFetch`). Traffic from the agent goes through `McpOAuthProxy`.
5. Secret values are added to `registerMcpSecretValues` and removed from logs by `redactMcpSecrets`.
6. `LocalMcpBridge` is a local HTTP server. Provider CLIs connect to it. It serves `DynamicToolNamespace` tools, with keep-alive of 95 s and progress pings every 20 s.

### Memory

1. `MemoryStore` is one generic class. Its tables are passed in as `MemoryTables`.
2. `AgentMemoryStore` adds per-agent selections and a full-text index (`agent_memory_search`).
3. Site memory is keyed by host (`memorySitesForHost`). Browser code reads it through `BrowserSiteMemories`.
4. `memoryPromptLine` turns a memory into prompt text.

### Skills

1. Home skills live in `~/.agents/skills` (`HOME_SKILL_FOLDER`). A folder that CodeBot made has a `.codebot-managed.json` marker.
2. `listHomeSkills` reads up to 200 skills. `readSkillFrontmatter` checks each `SKILL.md` header.
3. Local skill IPC calls create, revise and install skills (`localCreate`, `localRevise`, `localInstall`).
4. Marketplace skills are listed, installed and set on or off through `SkillMarketplaceService` (IPC `skills`).

### Workspace and files

1. `resolveWorkspaceFile` and `resolveSharedFile` turn an input path into an absolute path. They refuse paths outside the root (`WorkspacePathRefused`).
2. `AttachmentFiles` stores drafts and generated files. It commits to the mailbox only after the atomic write succeeds (see `src/backend/AGENTS.md`).
3. `StorageUsageService` measures disk use for agents, channels and files.

### Messaging connectors

1. `MESSAGING_PLATFORMS` is `slack`, `discord`, `telegram`, `whatsapp`. `CONNECTOR_MESSAGING_PLATFORMS` is `slack`, `discord`, `telegram` (no WhatsApp). Both are in `packages/contracts/src/ipc-messaging.ts`.
2. Each platform has a connect module, a driver, an orchestrator and a transport. `MessagingThreads` links platform chats to mailbox threads.
3. `messaging_*` agent tools post and read messages.

### Workflows

1. `createWorkflows` (`workflows/workflows.ts`) is the workflow service. `workflow-store.ts` keeps definitions, and `workflow-run-store.ts` keeps runs. `workflow-graph.ts` and `workflow-walk.ts` walk the step graph, and `workflow-transaction.ts` groups writes.
2. `WorkflowTriggers` (`workflows/workflow-triggers.ts`) implements `RoutineDueSource`, so workflow schedules run on the same `RoutineTimer` as routines.
3. Agents reach workflows through `WORKFLOW_TOOL_DEFINITIONS` and `handleWorkflowTool`. A workflow question to the user uses `WORKFLOW_ANSWER_TOOL_DEFINITION` and `handleWorkflowAnswerTool`.
4. Workflow folders are stored by `WorkflowFoldersStore` in `codebot-workflow-folders-v1.json` (userData).

### Marketplace catalogs

1. `marketplace/plugin-catalog/plugins/<slug>/plugin.json` holds 256 plugin folders. `catalog.json` sets order and featured flags.
2. `bun run marketplace:build:plugins` (and `-- --check`) writes three generated files. Do not edit them by hand (see `marketplace/plugin-catalog/README.md`).
3. `marketplace/production-catalog/` holds 40 skill folders and team agent bundles.

## How to change it

### Add a browser tool

1. Add the tool to `BROWSER_TOOL_DEFINITIONS` in `browser-tools.ts`. Add its argument shape and its entry in `parseBrowserToolCall`.
2. Add the action in `browser-tool-actions.ts` (`browserInputAction`) or in `browser-tab-operations.ts` (`runTabAction`).
3. Add the page work in `browser-cdp.ts` or `browser-cdp-input.ts` if it needs CDP.
4. Route it in `BrowserHost` (`browser-host.ts`, the `#toolTabs` path). Decide the control state in `browser-control.ts`.
5. If the tool handles secrets or cards, add it to the guard list. Do not return the value.
6. Add a focused test near `browser-*.test.ts`. Run `bun run test:backend` or `bun run test:browser`.

### Add a channel tool

1. Add the definition to `CHANNEL_TOOL_DEFINITIONS` in `channel-tools.ts` (name, description, zod shape).
2. If it changes members, instructions or routines, add it to `CHANNEL_MANAGEMENT_TOOLS` in `channel-management.ts`. It then needs a person's request.
3. Handle it in `ChannelService.tool` (`channel-service.ts`). Store the change with `ChannelStore.commit`.
4. Make sure the tool appears in `agent/tool-catalog.ts` (it maps `CHANNEL_TOOL_DEFINITIONS`).

### Add a routine field or a routine kind

1. Add the zod schema in `routine-tool-schema.ts`.
2. Add the field to the record types in `routine-store.ts` and to `saveRecord`, `#fields` and `#validateFields`.
3. Add a new table or column with a migration (see the schema rules below). Update `ROUTINE_TABLES` if the owner kind changes.
4. Update the IPC decoders in `src/main/ipc/routine-handlers.ts` and the agent tool in `agent/routine-scheduler.ts`.

### Add a new due source for the timer

1. Implement `RoutineDueSource` (`nextDueAt`, `processDue`).
2. Pass it to `RoutineTimer` where it is built in `agent-service.ts`. Call `arm()` after each change.

### Add a CRM source

1. Implement `CrmSourceAdapter` (`crm-source.ts`). Model it on `crm-stripe.ts`.
2. Add it to `adapters` in `src/main/application-services.ts` (about line 2641). Pass a key store like the existing one.
3. Keep writes as proposals. Use `CrmSourceStore` for batches.
4. Check that `enabled` is still respected (`agentAttempt`).

### Add an MCP catalog entry

1. Add an entry to `MCP_REMOTE_BRIDGES` (`mcp-server-store.ts`) for a remote server, or a stdio row in `migrateCatalogRows`.
2. Pin the npm version. The existing remote entries use `mcp-remote@latest` (see Gotchas).
3. If the server name changes, add a migration like `0021-free-computer-use-server-name.ts`. Do not edit a shipped migration.

### Add a messaging platform

1. Add the id to `MESSAGING_PLATFORMS` in `packages/contracts/src/ipc-messaging.ts`. Add to `CONNECTOR_MESSAGING_PLATFORMS` only for a connector.
2. Add a folder under `messaging/` with connect, driver, transport, orchestrator and events. Copy the Telegram folder, which is the smallest.
3. Add the IPC methods in `src/main/ipc/messaging-handlers.ts` and their decoders in `messaging-inputs.ts`.
4. Add the migration for any new table (see the schema rules below).

### Add a memory store or a memory field

1. Extend `MemoryStore` (`memory-store.ts`). Pass a new `MemoryTables` object.
2. Add a new table or column with a migration. Add the full-text index only in a migration.
3. Add the IPC group in `src/main/ipc/memory-handlers.ts` or `channel-memory-handlers.ts`.

### Gate a feature behind the hidden switch (PRD 15.1)

1. There is no backend flag yet. Add one in the settings contract first (`packages/contracts`), then read it in the IPC group or the service that owns the feature.
2. When the flag is off, the buttons, settings rows and agent tools must not be offered (`docs/codebot/decisions.md` D14). Filter the tool list in `agent/tool-catalog.ts` and `codebot-tools.ts`.
3. Use the CRM gate as the model. It is `DEFAULT_CRM_SETTINGS` with `enabled`, and `agentAttempt` checks it.

### Schema changes in this area

1. Read `src/backend/AGENTS.md` first. A shipped migration never changes.
2. Add `src/backend/migrations/00NN-<name>.ts` with the next version. Register it in `migrations/registry.ts`.
3. Add the version to `codebot-database-schema-history.json`. Run the parity test.
4. Write each change and its `schema_migrations` marker in one transaction (`withTransaction`). Do not write raw `BEGIN`.
5. Add data-preservation fixtures for every released schema (`released-schemas/`).

## Gotchas

- Hidden switch not built. `docs/codebot/prd-status.md` rows 15.1 and 15.2 are `todo`. Searching `src` for `advanced features` finds only the docs. Routines, channels, marketplace, messaging connectors, computer use and remote desktop are not hidden by backend code. The renderer side is unverified.
- Channel browser rule. A browser tool call from a channel thread is refused unless `channelAllowsBrowser` says yes. If one member is set as the only browser user, the refusal names that member (`agent/codebot-tool-router.ts`, `#channelBrowserRefusal`, about line 3315).
- Channel changes need a person. Members, instructions and routines change only from a person's request. A routine run or an agent hand-off cannot change them (`PERSON_REQUEST_REQUIRED`).
- CRM is off by default. Turning it on needs a user action through `setSettings`. Agent CRM tools are refused while it is off.
- CRM writes go through proposals. An agent cannot change customer rows directly. Source sync writes its own rows.
- Routine limits are shared. `ROUTINE_TABLES` uses `INPUT_LIMITS.agentRoutines` for both agent and channel routines.
- Routine timer. Any change to a routine must call `arm()`. Otherwise the next run waits for the next timer tick.
- Stripe in CRM versus PRD billing removal. `crm/crm-stripe.ts` reads Stripe data for CRM. PRD row W02 says remove Stripe billing. Check the intent before removing it.
- Hosting tool. `list_sites` in `codebot-tools.ts` relates to hosted sites. PRD W02 says remove OpenBot hosted servers. Check before removal.
- MCP catalog pins. `MCP_REMOTE_ARGS` uses `mcp-remote@latest`, which is not a pinned version. `CATALOG_PIN_MOVES` is a one-off move for `apple-apps`. `migrateCatalogRows` rewrites stored rows (when it runs: unverified).
- Computer-use server name. A user server named `computer_use` is moved by migration 0021. The name is reserved for CodeBot's own computer-use server (`COMPUTER_USE_MCP_SERVER_NAME` in `packages/contracts/src/ipc-mcp-servers.ts` is `computer_use`). `agentMcpServers` removes that server when `computerUse` is false.
- WhatsApp is not a connector id. `CONNECTOR_MESSAGING_PLATFORMS` has slack, discord and telegram. WhatsApp is in `MESSAGING_PLATFORMS` only. Check both lists when you add a platform.
- Large files. `browser-host.ts` (5245 lines), `browser-cdp.ts` (4245), `channel-service.ts` (4111), `mailbox-store.ts` (4426) and `routine-store.ts` (1452) are large. `src/backend/AGENTS.md` says not to add a new concern to the biggest file. Extract a class first.
- Transactions. Use `withTransaction` or `withTransactionAsync` from `database/sqlite-transaction.ts`. A nested call runs in a savepoint. Catch the error outside the nested call to keep the outer writes (see `CrmStore.#decide`).
- Secrets. Browser vault and card tools, MCP secrets and remote desktop credentials are generated or stored at runtime. Do not log their values. Use the redaction helpers (`mcp-redaction.ts`, `CardValueScrub`).
- Workflow placement. Workflows (`workflows/`) are not named in PRD section 15. Their hidden or visible status is unverified.
- Test rule conflict. `docs/codebot/decisions.md` D16 says new tests are E2E scripts under `scripts/`. `src/backend` has about 50 `*.test.ts` files run by Vitest (`test:backend`). Check the current rule before adding a test.
- Size of attachments. `attachment-files.ts` owns files only. Do not write database state from it (see `src/backend/AGENTS.md`).

## Tests and checks in this area

| Command or file | Covers |
| --- | --- |
| `bun run test:backend` (`vitest run src/backend`) | All backend unit tests, including this area. |
| `bun run test:browser` (`scripts/browser-smoke.ts`) | Browser smoke test. |
| `scripts/browser-agent-session-e2e.ts` | Agent browser session end to end. |
| `browser-card-scrub.test.ts`, `browser-diagnostics.test.ts`, `browser-recorder-permission.test.ts` | Card scrub, diagnostics, recorder permission. |
| `browser-profile-migration.test.ts`, `browser-proxy-migration.test.ts` | Browser profile and proxy migrations. |
| `routine-result-migration.test.ts`, `routine-run-columns-migration.test.ts`, `routine-run-place-migration.test.ts`, `routine-flow-sweep-index-migration.test.ts` | Routine migrations. |
| `mcp-redaction.test.ts` | Secret redaction. |
| `crm-migration.test.ts` | CRM schema migration. |
| `workflow-migration.test.ts`, `workflow-paused-migration.test.ts`, `workflow-step-settings-migration.test.ts` | Workflow migrations. |
| `messaging-*-migration.test.ts` (6 files) | Messaging migrations. |
| `attachment-owner-index-migration.test.ts` | Attachment owner index. |
| `computer-use-name-migration.test.ts` | Computer-use server rename. |
| `codebot-database-schema-parity.test.ts` | New database schema against the history JSON. |
| `migration-harness.ts` and `released-schema-upgrade-migration.test.ts` | Upgrade of each released schema. |

## Unverified points

- Remote desktop internals (`src/main/remote-desktop-*.ts`) were not read. Only file names and the `RemoteDesktopManager` wiring were checked.
- Computer-use driver (`src/main/cua-driver-runtime.ts`) was not read.
- Renderer gating of hidden features was not checked.
- Tool names in `agent/data-tools.ts` were not listed.
- Consumers of `HostMemory` (`host-memory.ts`) were not checked.
- `browser-challenge.ts` detection rules were not read in detail.
- The purpose of `link-wallet.ts` and `near-wallet.ts` was taken from names and error types only.
- When `migrateCatalogRows` runs was not checked.
- Which external tools read `~/.agents/skills` was not checked.
- Whether the Stripe CRM source (`crm/crm-stripe.ts`) is removed by PRD W02 was not checked.
- Media workflow catalogs (`workflows/higgsfield-*.ts`, `sunra-*.ts`) were not read.
- `messaging/messaging-memory-store.ts` and the per-platform drivers were not read in detail.
