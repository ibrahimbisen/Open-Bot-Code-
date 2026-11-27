# Renderer features, area A

Paths are relative to the CodeBot repo root. "(unverified)" marks a point I could not confirm.

## What this area is

- Renderer feature folders: account, agent-dock, agent-tasks, agent-templates, agent-threads, agents, browser, channels, computer-use, connectors, conversation, crm, custom-agents, custom-providers.
- `features/conversation/` is the largest part. It holds the chat view, composer, timeline, side panels, and turn trace.
- Each folder reaches the main process only through `window.codebot` (typed `CodeBotDesktopApi`), narrowed by a `*-port.ts` file.
- Nothing here imports `src/main`, `src/backend`, or `src/preload`. The shared layer is `packages/contracts/src`.

## Key files

### Shared wiring

| Path | What it owns |
|---|---|
| `src/renderer/AGENTS.md` | Renderer rules: Solid caveats, store shape, folder layout, `check:ui` guard |
| `packages/contracts/src/ipc-desktop-apis.ts` | `CodeBotDesktopApi`, `AgentDesktopApi`, `BrowserDesktopApi`, `ServersDesktopApi` |
| `packages/contracts/src/ipc-endpoints.ts` | Every channel string, grouped (`agent`, `agentFolders`, `browser`, `browserDock`, `agentDock`, `crm`, `computerUse`, `customAgents`, `providerAdmin`, `agentTemplates`, `githubConnector`, and so on) |
| `src/preload/index.ts` | Builds `window.codebot`: `ipcRenderer.invoke(endpoint.channel, ...)` |
| `src/main/trusted-ipc.ts` | `handleTrusted`, `handleTrustedWithEvent` (sender checks) |
| `src/main/ipc/define-ipc-group.ts` | Binds endpoint groups to main handlers |
| `src/main/ipc/AGENTS.md`, `src/preload/AGENTS.md` | How to add an endpoint |
| `src/renderer/src/preview/mock-codebot.ts` | Mock `window.codebot` for previews |

### Conversation (`src/renderer/src/features/conversation/`)

| Path | What it owns |
|---|---|
| `Conversation.tsx` | `Conversation` component: wraps `ConversationView`; on cleanup it stops composer typing, resets the focus request and handles voice state |
| `ConversationView.tsx` | Layout: header, timeline, composer, side thread |
| `ConversationHeader.tsx`, `ConversationTimeline.tsx` (1817 lines) | Header; message list, virtualized rows, step disclosures, cards, subagent groups |
| `ConversationComposer.tsx` (974 lines) | Composer shell: attachments, queue, send control, notices, voice, skill picker trigger |
| `ConversationPanels.tsx` (1204 lines) | Right-side panels (browser, files, threads, settings) (unverified detail) |
| `ConversationThread.tsx`, `ConversationSideThread.tsx` | Thread panel, side thread |
| `ConversationQuestionPrompt.tsx`, `UiBlockPrompt.tsx` | Agent questions and UI block prompts |
| `ConversationBrowser*.tsx` | Browser location, tab notice, takeover in the chat |
| `conversation-context.tsx` (1292 lines) | `Conversation` context: message store, sends, reads, events, prompt answers |
| `conversation-scope.ts` (3031 lines) | `createConversationViewScope`: view-side owner of panels, composer, activity, browser, scroll, search, voice, pins, queue, actions |
| `conversation-controller.ts`, `conversation-controller-context.tsx` | `createConversationController`; controller context |
| `conversation-port.ts` | `ConversationPort`, `conversationPort()` |
| `conversation-types.ts` | `ConversationProps`, `ComposerDraft`, `RightPanelMode`, `SideThread`, `ConversationThreads` |
| `conversation-keys.ts`, `conversation-merge.ts`, `conversation-read-state.ts` | Key builders; page merge by message id; auto-read decisions |
| `composer-draft.ts`, `composer-draft-storage.ts`, `composer-clipboard.ts`, `composer-resize.ts` | Draft model, draft storage, copy/paste, height |
| `stores/composer-store.ts`, `stores/composer-actions.ts` (1028 lines) | Composer state and actions (`createComposerActions`, line 200) |
| `stores/queue-store.ts`, `stores/pending-send-store.ts`, `stores/thread-queue-edit.ts` | Queue snapshot, optimistic sends (`PENDING_SEND_ID_PREFIX = "pending:"`), queue edits |
| `stores/activity-store.ts` | Live activity per turn |
| `stores/panels-store.ts` (1003 lines) | Side panels: files, browser pane, split groups (`MAX_SIDE_SPLITS = 2`) |
| `stores/scroll-store.ts` (548 lines) | Scroll, history paging; uses `createChatVirtualizer` (`packages/ui/src/features/conversation/createChatVirtualizer.ts`) |
| `stores/search-store.ts`, `chat-search.ts`, `stores/message-pins-store.ts`, `stores/message-actions.ts` | Search, pins, message actions |
| `stores/voice-*.ts`, `stores/codex-live-conversation-store.ts` | Voice input and live voice sessions |
| `stores/settings-store.ts`, `stores/skills-store.ts`, `stores/mcp-servers-store.ts` | Settings drawer, skills, MCP state |
| `stores/browser-store.ts` (923 lines) | Browser takeover, local sign-in, chat browser previews |
| `turn-steps.ts` (374 lines) | `createTurnSteps`: steps and trace spans per turn |
| `turn-trace.ts` | `useTurnTrace`: `AgentStepsTrace` (labels, keyboard hint) |
| `turn-step-lines.ts` | `appendTurnStepLine`: live progress lines |
| `narration-rows.ts`, `agent-message-timeline.ts` | Row order for narration, day markers, teammate answers |
| `subagent-dock.ts` | Subagent dock state |
| `FilePreviewPanel.tsx`, `ChatVisualReply.tsx` | File preview; HTML and visual replies |
| `AgentSettingsPanel.tsx` (748 lines) | Agent settings drawer (sections below) |
| `AgentSkillsModal.tsx`, `LocalSkillsLibrary.tsx`, `AgentRoutinesSettings.tsx`, `AgentMemoriesSettings.tsx`, `SharedTablesModal.tsx` | Settings sections |
| `routines-port.ts`, `routine-webhooks-api.ts`, `memories-port.ts`, `agent-folders-port.ts` | Ports for the settings sections |
| `BrowserDockAdapter.tsx`, `BrowserFullViewAdapter.tsx`, `BrowserPreviewSidebar.tsx`, `BrowserWindowBridge.tsx` | Browser pane adapters |
| `WorkspaceConversation.tsx`, `WorkspaceDirectConversation.tsx`, `direct-messages-context.tsx` | Workspace wrappers; direct messages |
| `attachment-*.ts`, `desktop-media-approval.ts`, `credits-hold-controls.ts`, `usage-limit-ask.ts` | Attachments; approval and usage prompts |

### Other folders

| Path | What it owns |
|---|---|
| `account/account-context.tsx`, `account/account-port.ts` | `AuthProvider` / `useAuth`; `agent.getUsage`, `auth.*` |
| `account/account-usage-polling.ts`, `account/usage-refresh-poll.ts` | Usage poll: 5 min refresh, 30 s check |
| `agent-dock/AgentDockHost.tsx` (51 KB) | `useAgentDockPlacement`, `AgentDockHost`, `WindowAgentDock`, `ScreenAgentDock`, `createServerDock` |
| `agent-dock/AgentDockSurface.tsx`, `AgentDockEdgeStrip.tsx` | Dock UI in its own window; edge strip (`AGENT_DOCK_STRIP_WIDTH = 6`) |
| `agent-dock/agent-dock-preference.ts` | Dock preference and seat storage |
| `agent-dock/agent-dock-voice.ts`, `agent-dock-port.ts` | Voice into a composer draft; `agentDockPort()` |
| `agent-tasks/agent-tasks-state.ts` (961 lines) | `createAgentTasks`: task list, task conversations, unread counts, queue actions |
| `agent-tasks/agent-tasks-port.ts`, `agent-tasks-context.tsx` | `agentTasksPort(server)`; `AgentTasksProvider` / `useAgentTasks` |
| `agent-templates/agent-template-card.tsx` | `renderAgentTemplateCard`: PNG share card drawn with canvas |
| `agent-templates/PublishAgent.tsx`, `AgentTemplateInstall.tsx`, `agent-templates-port.ts` | Publish flow, install flow, port |
| `agent-threads/agent-thread-tabs.ts` (480 lines) | `createAgentThreadTabs`: open, side, hidden, draft, archive, delete with undo |
| `agent-threads/conversation-threads.ts` | `conversationThreads`: `ConversationThreads` for the open agent |
| `agent-threads/sidebar-agent-threads.ts` | `sidebarAgentThreads`: the sidebar chat list |
| `agent-threads/agent-threads-context.tsx` | `AgentThreadsProvider` / `useAgentThreads`: `createAgentThreadTabs` for the active server, agent and `useAgentTasks()` |
| `agent-threads/thread-tabs-storage.ts` | Tab, seen, and pending-delete storage (zod) |
| `agents/agents-context.tsx` (15 KB) | `AgentsProvider` / `useAgents`: agent list, selection, hidden agents |
| `agents/agent-event-bridge.tsx` (27 KB) | `AgentEventBridge`: routes every `agent:event` to stores |
| `agents/agent-actions.tsx` | Create, duplicate, delete, update, avatar |
| `agents/agent-runtime-snapshot.ts`, `agent-thread-attention.ts` | Attention prompts; which threads need attention |
| `agents/remote-agent-admin.ts` (19 KB), `host-provider-accounts.ts` | Admin calls for remote servers; host accounts merged into agent status |
| `agents/agents-port.ts`, `agent-selection.ts`, `pending-agent-deletes.ts`, `WorkspaceAgentSetup.tsx` | Port; selection and pending deletes in storage; first-run setup |
| `browser/browser-context.tsx` | `BrowserTabsProvider` / `useBrowserTabs`: tabs, active tab, control state |
| `browser/browser-port.ts`, `browser-dock-port.ts` | `browserPort()`; `browserDockPort()` |
| `browser/BrowserDockSurface.tsx` | Renders `BrowserDock` (from `@codebot/ui`) in its own window |
| `browser/browser-window.tsx`, `browser-window-model.ts`, `browser-window-relay.ts` | Separate browser window: model, actions, relay |
| `browser/browser-pip.tsx`, `browser-pip-controls.tsx` | Picture-in-picture browser |
| `browser/browser-tab-session.ts`, `browser-tab-reconciliation.ts` | Tab order per server, reopen stack; active tab after load and close |
| `browser/ServerBrowserWindowBridge.tsx`, `ServerBrowserProfilesPanel.tsx` | Opens and controls tabs; profile panel |
| `browser/device-location.ts` | Answers browser location permission |
| `browser/browser-profiles-port.ts`, `stores/browser-profiles-store.ts`, `stores/browser-tab-profiles.ts` | Profiles and proxies (`agent.*` admin calls) |
| `channels/channels-controller.ts` (24 KB) | `createChannelsController`: channel list, selection, commands, reads |
| `channels/channel-conversation.tsx`, `channel-conversation-rows.ts` | Channel page state; row building (working turns, prompts, approvals) |
| `channels/ChannelEditor.tsx` (22 KB), `ChannelCreateDialog.tsx`, `ChannelConversationParts.tsx` | Channel settings and members; create dialog; header, empty state, settings pane |
| `channels/WorkspaceChannelConversation.tsx`, `channels-context.tsx`, `channels-port.ts`, `channels-draft.ts` | Workspace view, context, port, draft |
| `channels/channel-selection.ts`, `channel-folders-port.ts`, `channel-page-merge.ts`, `global-search-channels.ts` | Selection storage; folder calls; page merge; global search |
| `computer-use/ComputerUseSetup.tsx`, `ComputerUsePermissionHelp.tsx` | Setup screen; permission help (reads `?permission=`) |
| `computer-use/ComputerUseAgentCursor.tsx`, `agent-cursor-motion.ts` | Agent cursor; motion (`planAgentCursorMove`, `agentCursorPointAt`) |
| `computer-use/ComputerUseHighlightSurface.tsx`, `ComputerUseWindowHighlight.tsx` | Highlight overlays |
| `computer-use/computer-use-port.ts` | `computerUsePort()`: `computerUse`, `remoteDesktop.checkSetup`, `update` |
| `connectors/connector-registry.ts` | `createConnectorRegistry`, `createConnectorSet`, `LOCAL_CONNECTOR_TRANSPORTS` |
| `connectors/connector-access.ts`, `connector-controller.ts`, `connectors-context.tsx` | Access rule; `ConnectorController`; `ConnectorsProvider` / `useConnectors` |
| `connectors/messaging-connector.ts` (12 KB), `whatsapp-connector.ts` | Slack, Discord, Telegram; WhatsApp |
| `connectors/github-connector.ts`, `onepassword-connector.ts`, `bitwarden-connector.ts`, `password-manager-connector.ts` | Controllers for each connector |
| `connectors/*-port.ts`, `host-messaging-port.ts` | Local and host ports (`host*Port(serverId)`, `polled*Port`) |
| `crm/crm-controller.ts`, `crm/crm-enabled.ts` | `createCrmController(host, serverId)`; `createCrmEnabled` |
| `crm/crm-port.ts`, `CrmPage.tsx`, `CrmScreen.tsx`, `crm-page.css` | `desktopCrmHost(serverId)`; page and screen |
| `custom-agents/custom-agents-port.ts`, `custom-agents-context.tsx` | `localCustomAgentsApi()`, `hostCustomAgentsApi(serverId)`; provider |
| `custom-agents/stores/custom-agents-store.ts`, `custom-agent-usage-polling.ts` | Store (`CustomAgentUsageRow`); usage polling |
| `custom-providers/custom-providers-port.ts`, `custom-providers-context.tsx` | Port (`providerAdmin` calls); `CustomProvidersProvider` / `useCustomProviders` |
| `custom-providers/stores/custom-providers-store.ts`, `custom-provider-host-state.ts`, `custom-provider-restart.ts` | Store; host state; restart notice text |
| `custom-providers/stores/provider-detection-store.ts` (11 KB), `provider-detection-context.tsx` | `createProviderDetectionStore`; `ProviderDetectionProvider` |

## How it works

### Data path

1. A component calls a port, for example `conversationPort().agent.sendMessage(input, serverId)`.
2. The preload runs `ipcRenderer.invoke(endpoint.channel, scopedRequest(...))`.
3. The main handler runs (`src/main/ipc/*-handlers.ts`).
4. Events return as `agent:event` (scoped). `agents/agent-event-bridge.tsx` routes each type to a store.
5. Stores update Solid state. Components read it.

Scoped calls take `serverId` as the last argument. Local calls use `LOCAL_SERVER_ID`. Remote calls use the `host*` ports.

### Main handler files

| Domain | File(s) under `src/main/ipc/` |
|---|---|
| agent, tasks, queue, prompts, channels | `agent-handlers.ts`, `agent-inputs.ts`, `agent-admin-handlers.ts`, `channel-folder-handlers.ts`, `channel-memory-handlers.ts`, `channel-routine-handlers.ts` (`agent:` groups are split across several registrars, per `src/main/ipc/AGENTS.md`) |
| agent dock, browser, computer use | `agent-dock-handlers.ts`, `browser-handlers.ts`, `browser-dock-handlers.ts`, `computer-use-handlers.ts` |
| CRM, custom agents, providers | `crm-handlers.ts`, `custom-agent-handlers.ts`, `custom-provider-handlers.ts`, `provider-detection-handlers.ts`, `provider-admin-handlers.ts` |
| connectors | `github-connector-handlers.ts`, `bitwarden-connector-handlers.ts`, `onepassword-connector-handlers.ts`, `password-managers-handlers.ts`, `messaging-handlers.ts` |
| templates, account | `agent-template-handlers.ts`, `marketplace-link-handlers.ts`, `account-handlers.ts` |

### Conversation: chat view

- `ConversationView.tsx` mounts the header, timeline, and composer. The side thread (`ConversationThread`) renders only while `sideThreadOpen()` is true (line 145).
- `createConversationViewScope(props)` (`conversation-scope.ts`, line 145) builds the view state.
- `ConversationProvider` (`conversation-context.tsx`, line 1291) holds the message store, keyed by agent. Live updates come from `conversation-delta` and `conversation-page` events, merged by `conversation-merge.ts`.
- Reads: `agent:read-conversation-page`, `agent:search-conversation-messages`. Read state: `agent:mark-conversation-read`, `agent:mark-conversation-unread`.
- Rows carry `ConversationMessage.trace` (`packages/contracts/src/ipc-conversation-messages.ts`, line 301, type `ConversationTurnTrace`). Other row types: routines, skill suggestions, settings links, MCP sign-in, visual replies.

### Conversation: composer and picker

- `ConversationComposer.tsx` renders the shell. The editor is `ComposerEditor` (`packages/ui/src/features/conversation/ComposerEditor.tsx`).
- `@` opens the mention picker. `$` opens the skill picker. The `@everyone` option uses `EVERYONE_MENTION` (`packages/contracts/src/chat-tag-references.ts`, value `"@everyone"`). Option types are in `packages/ui/src/features/conversation/composer-picker.ts` (`PickerOption`: `agent`, `everyone`, `skill`, `mcp`, `attachment`, `tab`, `thread`).
- `ComposerEditor.tsx`: `MentionContext` (line 150, `trigger: "@" | "$"`), `pickerSections` (line 336), `openSkillPicker` (line 735).
- Send path: `ConversationComposer` → `createComposerActions` (`stores/composer-actions.ts`) → `sendMessage` (`conversation-context.tsx`, line 961) → `sendMessageToAgent` (line 984) → `conversationPort().agent.sendMessage` (line 1006), channel `agent:send-message`.
- While a turn runs, a send becomes a queued delivery. Queue calls: `agent:list-queue`, `agent:list-active-queues`, `agent:steer-queued-message`, `agent:edit-queued-message`, `agent:cancel-queued-message`, `agent:reorder-queue`. Stop: `agent:interrupt`.
- Optimistic rows are `PendingSend` entries (`stores/pending-send-store.ts`).

### Conversation: slash menu

- No `/` slash command menu exists. Grep for `slash` in `src/renderer` and `packages/ui/src` finds only path and key-name uses.
- The equivalents are the `@` mention picker and the `$` skill picker.

### Conversation: trace and steps

1. The turn trace arrives as `AgentMessage.trace` (`ConversationTurnTrace`, `packages/contracts/src/ipc-conversation-trace.ts`): `startedAt`, `endedAt`, `steps`, `tokens`, `cachedInput`, `costUsd`.
2. Step kinds: `reasoning`, `tool`, `message` (`CONVERSATION_TRACE_STEP_KINDS`). Limits: 500 steps per trace, 500 characters per text.
3. `createTurnSteps` (`turn-steps.ts`, line 161) reads traces, thinking, memory changes, subagent events, and progress lines per turn.
4. `storedSpans` (line 52) turns stored steps into spans. `guessedSpans` (line 124) estimates spans when no trace exists. `SUBAGENT_SPAN_PREFIX = "subagent:"` marks subagent spans.
5. `traceAbove(messageId, labels)` (line 308) returns spans for one answer. `stepsAbove` (line 295) returns the step list.
6. `useTurnTrace` (`turn-trace.ts`) adds labels (`chat.trace.step.*`) and the keyboard hint.
7. `turn-step-lines.ts`: `TURN_LIMIT = 200` turns, `LINE_LIMIT = 200` lines per turn.
8. Rendering: `AgentStepsDisclosure` (`packages/ui/src/features/conversation/AgentSteps.tsx`), used at `ConversationTimeline.tsx` lines 1349 and 1443. `TraceWaterfall` and `TraceWaterfallDialog` (`packages/ui/src/features/conversation/TraceWaterfall.tsx`) draw the timeline.
9. Backend source: `turnTrace(threadId, turnId)` in `src/backend/database/agent-history-queries.ts` (line 117).

### Conversation: settings drawer

| Section | Component or port | Channels |
|---|---|---|
| Session settings | `AgentSessionSettings` (ui), `readAgentSessionSettings` | `agent:session-settings:read`, `:set`, `:reset`; event `agent-session-settings-changed` |
| Notifications | `AgentNotificationLevelCalls` | `agent:notification-levels:list`, `:set` |
| Browser profile | `createBrowserProfilesStore` | `agent:admin:list-browser-profiles`, `agent:admin:get-browser-profile` |
| Shared tables | `SharedTablesModal.tsx` | `shared:list-tables`, `shared:delete-table` |
| Memories | `AgentMemoriesSettings.tsx`, `memories-port.ts` | `agent:list-memories` |
| Routines | `AgentRoutinesSettings.tsx`, `routines-port.ts` | `agent:list-routines`, `events:list-routines` |
| Files | `agent-folders-port.ts` | `agent:folders:list`, `agent:folders:add` |
| Instructions | `AgentInstructionsView` (ui), `agent-folders-port.ts` | `agentInstructions` group |
| Skills | `AgentSkillsModal.tsx`, `installed-skills-source.ts` | `agent:list-installed-skills`, `skills.*` |

Drawer state is in `stores/settings-store.ts`. The open row is `AgentSettingRowRequest` in `stores/panels-store.ts`.

### Conversation: side panels and browser pane

- `stores/panels-store.ts` holds up to two split groups (`MAX_SIDE_SPLITS = 2`). A side panel can show a file, a page, a thread, or the browser.
- Storage: `codebot:side-panel-files`, `codebot:side-split-layout` (`side-split-layout.ts`), `codebot:side-panel-page-tabs` (`side-panel-page-tabs.ts`).
- `RightPanelMode` (`conversation-types.ts`) is the panel type.
- Browser state for the chat lives in `stores/browser-store.ts`: takeover previews, local sign-in.

### Browser feature (`features/browser/`)

- `browser-context.tsx`: `loadDisplayState` calls `browser.getDisplayState`; `loadControlState` calls `browser.getControlState`; tab actions call `browser.activate` and `browser.close`.
- `ServerBrowserWindowBridge.tsx` calls `browser.open({ url, ...owner, focus: true })`, plus reload, stop, and navigate.
- `browser-window.tsx` subscribes to `browser.onWindowModel` and calls `browser.getWindowModel`, `browser.setVisible`, `browser.sendWindowAction`, `browser.answerHttpSignIn`.
- `browser-window-relay.ts` publishes the window model (`browser.publishWindowModel`) and listens to `browser.onWindowEvent`.
- `browser-pip.tsx` uses `browser.setVisible({ target: "picture-in-picture" })` and `browser.onDisplayState`.
- `BrowserDockSurface.tsx` uses `browserDock.performAction`, `browserDock.setFrame` (measured frame with `seq`), `browserDock.getPresentation`, `browserDock.onPresentation`.
- Browser IPC group `browser`: `open`, `activate`, `navigate`, `reload`, `stop`, `close`, `takeControl`, `releaseControl`, `answerPermission`, `startTeach`, `stopTeach`, `listTabs`, `getDisplayState`, `getControlState`, `capturePreview`, `setVisible`, `startLiveView`, `stopLiveView`, the PiP and window calls, `openLocalSignIn`, `finishLocalSignIn`, `answerHttpSignIn`. Events: `liveViewEvent`, `displayState`, `windowModel`, `windowEvent`, `pictureInPictureEvent`.
- Browser dock group `browserDock`: `publishPresentation`, `getPresentation`, `presentation`, `performAction`, `action`, `setFrame`, `shown`.

### Agent dock (`features/agent-dock/`)

- `AgentDockHost.tsx` shows the dock on the screen (`ScreenAgentDock`) or in a window (`WindowAgentDock`). `useAgentDockPlacement` exposes the choice.
- `agentDock` group: `publishPresentation`, `getPresentation`, `presentation`, `performAction`, `action`, `setInteractive`, `setInputRegion`, `setExtent`, `setXWayland`, `closeChat`, `listDisplays`, `drag`, `moved`.
- Dock preference fields: `shown`, `placement` (`"screen"` or `"window"`), `display`, `edge`, `autoHide`, `edgeStrip`, `sizePercent`, `results`, `activeSeats`, `offsets`. Default `shown` is `!import.meta.env.DEV`.

### Agent tasks (`features/agent-tasks/`)

- `createAgentTasks(options)` (`agent-tasks-state.ts`, line 93) owns the task list per agent. Options: `reloadKey`, `available`, `editable`, `messageDeletable`, `branchable`.
- Calls (`agentTasksPort(server)`): `agent:tasks:list`, `:list-archived`, `:read`, `:read-page`, `:read-around`, `:start`, `:run-queued-message`, `:branch`, `:stop`, `:close`, `:reopen`, `:rename`, `:delete`, `:reads`, `:mark-read`, `:compact-context`.
- Events: `agent-tasks-changed`, `agent-task-conversation`, `agent-task-conversation-delta` (`isAgentTaskEvent`).
- Start and send use `retryOperationIds` (lines 629, 679) so retries reuse an id.

### Agent threads (`features/agent-threads/`)

- Threads are agent tasks shown as tabs. `MAIN_THREAD_ID` and `DRAFT_THREAD_ID` come from `@codebot/ui/features/conversation/threads/thread-types`.
- `createAgentThreadTabs` (`agent-thread-tabs.ts`, line 32) handles open, close, `toSide`, `closeSide`, move, archive, restore, rename, send, branch, and remove.
- `remove` (line 217) closes and hides the tab and shows an undo toast (`TOAST_DURATION` from `@codebot/ui`, 6 000 ms, `packages/ui/src/toast.tsx`). After the deadline it calls `tasks.deleteTask`. A failed delete restores the tab. If the window scope changed, `addPendingThreadDelete` stores it, and `OTHER_WINDOW_DELAY_MS = 5_000` controls the timer.
- `conversationThreads(input)` (`conversation-threads.ts`, line 41) returns the tab lists, active thread, and per-thread approval, takeover, and prompt items.
- `sidebarAgentThreads(input)` (`sidebar-agent-threads.ts`, line 17) builds the sidebar chat list: `threads`, `openId`, `load`, `onOpen`, `onNew`, `onArchive`, `onDelete`. Closed and hidden tasks are left out. Newest first.
- `taskWaitsFor` (`conversation-threads.ts`, line 240) reports what a thread waits for.

### Agents (`features/agents/`)

- `agents-context.tsx` loads `agent:list` and keeps the selected agent per server (`codebot:selected-agent:v1`).
- `AgentEventBridge` switches on event `type`. Types include `conversation`, `conversation-delta`, `conversation-page`, `conversation-invalidated`, `prompt`, `approval`, `status`, `turn-started`, `turn-progress`, `turn-completed`, `thread-turn-completed`, `queue-changed`, `waits-changed`, `usage-changed`, `browser-takeover-requested`, `browser-takeover-resolved`, `sidebar-layout-changed`, `sidebar-pins-changed`, `routines-changed`, `agents-changed`.
- `agent-actions.tsx`: `agent:create`, `agent:duplicate`, `agent:update`, `agent:set-avatar`, `agent:delete`.

### Channels (`features/channels/`)

- `createChannelsController` (`channels-controller.ts`, line 84) loads `agent:channels:list` and the selected channel through `agent:channels:read`. Commands use `agent:channels:command`.
- Other channel calls: `agent:channels:delete`, `:delete-message`, `:set-image`, `:clear-context`, `:delete-history`, `:compact-context`, `:compact-availability`.

### Computer use (`features/computer-use/`)

- `computerUse` group: `getState`, `openPermissionPane`, `closePermissionHelp`, `getPermissionApp`, `startPermissionAppDrag`, `revealPermissionApp`, and the `highlightPlacement` event.
- Permission IDs are `MacPermissionId` (screen recording, accessibility). Windows behavior is unverified.

### Connectors (`features/connectors/`)

- `CONNECTOR_IDS` (`packages/contracts/src/marketplace-suggestion-events.ts`, line 6): `slack`, `discord`, `telegram`, `whatsapp`, `github`, `onepassword`, `bitwarden`, `protonpass`.
- `createConnectorSet(transports, options)` (`connector-registry.ts`, line 35):

| Connector | Controller | Transport |
|---|---|---|
| slack, discord, telegram | `createMessagingConnector` | `messaging` group |
| whatsapp | `createWhatsAppConnector` | `window.codebot.messaging` |
| github | `createGitHubConnector` | `githubConnector` group |
| onepassword | `createOnePasswordConnector` | `onePasswordConnector` group |
| bitwarden | `createBitwardenConnector` | `bitwardenConnector` group |
| protonpass | `createPasswordManagerConnector` | `passwordManagers` group |

- `connectorAccess(id, server)` returns `"available"`, `"local-only"`, or `"hidden"`.

### CRM (`features/crm/`)

- `crm` group: `overview`, `customers`, `payments`, `activity`, `apply`, `sourceConnect`, `sourceDisconnect`, `sourceSync`, `settings`, `setSettings`.
- `createCrmEnabled` reads `settings` and re-reads on `onChanged`. `createCrmController` loads overview, customers, payments, and activity.

### Custom agents and providers

- `customAgents` group: `list`, `save`, `delete` (scoped, local server), `check`, `usage`.
- Providers: `custom-providers-port.ts` (`customProvidersPort()`) uses the `customProviders` group (`custom-providers:list`, `:save`, `:update`, `:delete`). The `providerAdmin` group has the same four operations as `listCustomProviders`, `saveCustomProvider`, `updateCustomProvider`, `deleteCustomProvider`; the custom-providers folder does not call them.
- `providerDetection` group: `scanModelServers`, `discoverModels`, `getSettings`, `setSettings`, `scanAgents`. Store: `createProviderDetectionStore` (`provider-detection-store.ts`, line 117).

### Templates and account

- `agentTemplates` group: `preview`, `publish`, `unpublish`, `get`, `install`, `takePendingLink`, `openLink`. `agentAdmin.addTemplateAgent` adds an installed template as an agent.
- Account: `auth.*` (central sign-in) and `agent.getUsage` (channel `agent:get-usage`). Usage refresh runs every 5 minutes (`USAGE_AUTO_REFRESH_MS`, `account/usage-refresh-poll.ts`), checked every 30 seconds (`USAGE_AUTO_REFRESH_CHECK_MS`).

## Settings (localStorage keys)

| Key | Owner | Holds |
|---|---|---|
| `codebot:agent-dock-preference` | `agent-dock/agent-dock-preference.ts` | Dock preference (see above) |
| `codebot:agent-dock:<server>` | same | Seats per server |
| `codebot:thread-tabs:v1`, `codebot:thread-tabs-seen:v1`, `codebot:thread-deletes:v1` | `agent-threads/thread-tabs-storage.ts` | Tabs per agent; last-seen times; pending deletes (max 200) |
| `codebot:selected-agent:v1` | `agents/agent-selection.ts` | Selected agent per server |
| `codebot:pending-agent-deletes:v1` | `agents/pending-agent-deletes.ts` | Agent deletes waiting for the host |
| `codebot:selected-channel:v1` | `channels/channel-selection.ts` | Selected channel per account |
| `codebot:composer-drafts`, `codebot:queue-edit`, `codebot:thread-queue-edit` | `conversation/composer-draft*.ts` | Drafts; queue edits |
| `codebot:side-panel-files`, `codebot:side-split-layout`, `codebot:side-panel-page-tabs` | `conversation/side-*.ts` | Side panel state |
| `codebot:file-preview-wrap-lines` | `conversation/FilePreviewPanel.tsx` | Wrap lines in preview |
| `codebot:browser-window-bounds`, `codebot:browser-pip-native-bounds` | `conversation/browser-bounds-storage.ts` | Window and PiP bounds |
| `codebot:crm-layout:<serverId>` | `crm/crm-controller.ts` | CRM layout |
| `codebot:marketplace-suggestion-dismissals:v1`, `codebot:github-star-prompt`, `codebot:social-follow-prompt` | `conversation/` | Dismissals and prompt state |
| `codebot:voice-talk-mode`, `codebot:voice-talk-key`, `codebot:voice-language-notice` | `conversation/voice-*.ts` | Voice settings |

Server-side settings (not in localStorage): `agent:session-settings:*`, `agent:notification-levels:*`, `agent:admin:*` browser profiles, `crm` settings, `providerDetection` settings.

## How to change it

### Add an IPC call

1. Add the endpoint to a group in `packages/contracts/src/ipc-endpoints.ts`: `request<Payload, Result>()("group:wire-name")`, or `scopedRequest` / `scopedQuery` for server-scoped calls.
2. Run `bun run typecheck:node`, then `bun run typecheck:renderer`. Errors name what is missing.
3. Add the handler in `src/main/ipc/<domain>-handlers.ts` (`handleTrusted`, or `handleTrustedWithEvent` for events).
4. Add the method to `src/renderer/src/preview/mock-codebot.ts` (or the `mock-*.ts` for the group).
5. Add the method to the feature's port file (for example `agent-tasks-port.ts`), then call it from the context or controller.

Source: `src/main/ipc/AGENTS.md` ("Adding an endpoint").

### Add a picker option (`@` or `$`)

1. Add a variant to `PickerOption` in `packages/ui/src/features/conversation/composer-picker.ts`, with its key, text, name, and description helpers.
2. Add it to `pickerSections` in `ComposerEditor.tsx` (line 336), in the `@` or `$` branch.
3. Feed the data through `ConversationComposer.tsx` props.
4. Add i18n keys `composer.picker.option.*`.

### Add a trace step kind

1. Add the kind to `CONVERSATION_TRACE_STEP_KINDS` and to `isConversationTraceStep` in `packages/contracts/src/ipc-conversation-trace.ts`.
2. Map it to a `TraceSpan` in `storedSpans` (`turn-steps.ts`, line 52).
3. Add the kind or icon to `TraceSpanKind` / `TraceSpanIcon` in `packages/ui/src/features/conversation/TraceWaterfall.tsx`.
4. The backend writer is in `src/backend/agent/turn-traces.ts` (outside this area).

### Add a settings drawer section

1. Add the open or count state to the `draft` store in `AgentSettingsPanel.tsx` (line ~157).
2. Add the component beside the others in `features/conversation/`.
3. Add a port if it needs IPC, and pass it through props.
4. For a server-saved setting, add the endpoint and listen for its scoped event so the drawer refreshes.

### Add a per-browser value

1. Pick a `codebot:` key and define it as a `const` in the owner file.
2. Read and write inside `try/catch` on `window.localStorage`. Use zod for complex shapes (see `thread-tabs-storage.ts`).
3. Use it only for per-viewer convenience. Server state needs an IPC endpoint.

### Add a connector

1. Add the id to `CONNECTOR_IDS` in `packages/contracts/src/marketplace-suggestion-events.ts`.
2. Add a controller in `features/connectors/` (model it on `github-connector.ts`).
3. Add a transport to `ConnectorTransports` and a branch in `createConnectorSet` (`connector-registry.ts`).
4. Add the access rule in `connector-access.ts`.
5. Add a local port and a host port, following `github-connector-port.ts`.

### Add an agent event type

1. Add the variant to the event union in `packages/contracts/src/ipc-agent-events.ts`.
2. Add a `case` in `AgentEventBridge` (`features/agents/agent-event-bridge.tsx`).
3. For a task event, extend `isAgentTaskEvent` and `applyEvent` in `agent-tasks/agent-tasks-state.ts`.

### Add a CRM setting

1. Add the field to `CrmSettings` in `packages/contracts/src/ipc-crm.ts`, and handle it in `src/main/ipc/crm-handlers.ts`.
2. Read it in `crm-enabled.ts` (settings) or `crm-controller.ts` (page data).

## Gotchas

- Read props inside the compute function of `createEffect`, not in the callback. A memo created in an effect callback throws `PRIMITIVE_IN_EFFECT_CALLBACK` (`src/renderer/AGENTS.md`).
- Use `createStore` from `"solid-js"` (no `solid-js/store` in this RC). Stores hold plain values. A `Map` or `Set` is not a store: copy it on write.
- Features must not import `src/main`, `src/backend`, or `src/preload`. `bun run lint` rejects it.
- Scoped calls need the right `serverId`. A wrong id sends the call to the wrong host. Remote servers use the `host*` ports.
- `conversation-scope.ts` (3031 lines) and `AgentDockHost.tsx` (51 KB) are large. Change one concern at a time.
- The composer has no `/` slash menu. Use `@` and `$`.
- Trace spans from `guessedSpans` (`turn-steps.ts`, line 124) are estimates, not stored data.
- Thread delete is undoable until the toast deadline. The real delete runs after it. A failed delete restores the tab.
- Thread tab state lives in per-window `localStorage`. Another window's pending delete runs after `OTHER_WINDOW_DELAY_MS`.
- Dock placement depends on `browserDock.setFrame` reports. A missing report leaves the dock in the wrong place.
- Computer use permission screens target macOS (`MacPermissionId`).
- Usage polling uses timers. Stop them in cleanup (`createUsageRefreshPoll`).
- Two custom-provider IPC groups exist (`customProviders`, used by the custom-providers port, and `providerAdmin`, which has the same four operations under other names). Check before changing either.

## Unverified points

- `ConversationPanels.tsx` contents (section list not read in full).
- Computer use behavior on Windows.
- Browser tab order reset on reload.
- Exact owner split between `channels/` and `conversation/` for group chats.
