# CodeBot architecture digest (docs area)

Scope: `docs/ARCHITECTURE.md`, `docs/architecture/*.md`, `docs/glossary.md`, `docs/main-process-design-notes.md`, `docs/ui-foundation.md`, `docs/i18n.md`.
Generated for coding agents. Repo root: `C:\Users\IbrahimBisen\Desktop\Coding Software\CodeBot`. Paths are repo-relative.
Items marked (unverified) come from the docs only, or I could not confirm them in code.
Fact-checked 2026-11-26 against the code tree (paths, names, IPC groups, migrations, constants, scripts).

## What this area is

- `docs/ARCHITECTURE.md` is the index. It links one doc per topic in `docs/architecture/`.
- CodeBot is a Bun workspace: Electron desktop app (`src/`), Cloudflare Workers and a Signal relay (`apps/`, `remote/`), and shared packages (`packages/`).
- The docs explain the process model, the event and webhook model, the Team API, providers, the side panel, the browser, skills and plugins, UI foundation, i18n and glossary terms.
- Rule of thumb: check the linked doc before you edit. Each point below links to its source doc.

## Key files

| Path | What it owns |
| --- | --- |
| `docs/ARCHITECTURE.md` | Index of all architecture topics and their anchors |
| `docs/architecture/structure.md` | Workspace map, dependency direction, state ownership, shared UI package |
| `docs/architecture/change-rules.md` | Effect service rules, 10 change rules, logging, dev-stack registry, SQLite migration rule, verification |
| `docs/architecture/events.md` | Webhook routines, workflow webhook/GitHub/Discord/Telegram/Slack triggers, threat model |
| `docs/architecture/team-api.md` | Team API compatibility boundary, WebRTC, capabilities, server safe mode |
| `docs/architecture/providers.md` | Provider tool catalog, history, background memory review, idle sessions, CLI updates, per-provider sections |
| `docs/architecture/agents.md` | Local scripts API, routines, workflows, CRM, agent threads (side threads), routine flows, templates |
| `docs/architecture/side-panel.md` | Side panel panes registry, add-pane steps, close order |
| `docs/architecture/browser.md` | Web `/app` client, browser tool execution, BrowserHost, tab lifetime, secure sign-in |
| `docs/architecture/skills-and-plugins.md` | Skill folders, home skills, MCP config, password vaults, local skill library, plugin catalog |
| `docs/architecture/integrations.md` | Sign-in flow, MCP and provider sign-in relay, add a provider/app/connector/Team API capability, NEAR Intents wallet |
| `docs/architecture/servers.md` | Storage, notifications, billing, Host Manager, hosted servers, remote connect (large, 2,299 lines) |
| `docs/architecture/channels-and-messaging.md` | Mobile notifications, shared channel chats, messaging connections, mobile chat queue |
| `docs/architecture/computer-use.md` | Computer Use and remote desktop permission checks |
| `docs/architecture/analytics.md` | Mobile, Chrome extension, website and agent usage analytics; resource sampling |
| `docs/hosted-servers.md` | Hosted server notes and Leaseweb references (linked from `servers.md`) |
| `docs/automation.md` | Local scripts API (linked from `agents.md`) |
| `docs/glossary.md` | Product terms and the identifiers each one owns |
| `docs/main-process-design-notes.md` | Why main is built the way it is: IPC coverage, shutdown order, MCP OAuth redirect, Team API dispatch |
| `docs/ui-foundation.md` | Design tokens, dark default, primitives, Kobalte rules, `check:ui` |
| `docs/i18n.md` | Message catalogs, add a key, translations, `i18n:check` |
| `packages/contracts/src/ipc-endpoints.ts` | `IPC_ENDPOINTS`: all IPC endpoint groups (local `request<I,O>()` and `event<T>()` helpers) |
| `packages/contracts/src/ipc-events.ts` | Event and routine webhook types (`RoutineWebhookTrigger`) |
| `packages/contracts/src/agent-providers.ts` | `AGENT_PROVIDERS` list and `AgentProviderId` type |
| `packages/contracts/src/team-protocol/` | `v1.ts` to `v10.ts` protocol files, `events-v1.ts`, `provider-aware-codec.ts`, capability files (`*-v1.ts`) |
| `packages/contracts/src/signal-protocol/webhook-route.ts` | `WEBHOOK_ROUTES_LIMIT` (64) and webhook signature pattern |
| `packages/contracts/src/signal-protocol/messages.ts` | `WEBHOOK_DELIVERY_BODY_BYTES_LIMIT` (64 KiB) |
| `packages/contracts/src/ipc-agent-tasks.ts` | `AGENT_TASK_LIMIT_DEFAULT` (4), `HOST_AGENT_TASK_LIMIT_MAX` (64) |
| `src/main/index.ts` | Electron lifecycle: setPath, sandbox, protocol registration at module scope; calls `createApplicationServices` and `registerIpcGroups` |
| `src/main/application-services.ts` | Defines `createApplicationServices` (service graph) |
| `src/main/trusted-ipc.ts` | The only non-test place that calls `ipcMain` directly (sender check) |
| `src/main/ipc/define-ipc-group.ts` | Typed handler wrappers (`handler`, `payloadHandler`, `eventHandler`, `authorizedHandler`) |
| `src/main/ipc-channel-coverage.test.ts` | Checks IPC name coverage and the trusted wrapper names |
| `src/main/team-api-server.ts`, `src/main/team-api/` | Local Team API host; `request-helpers.ts`; `route-*.ts` per route group; `server-safe-mode-api.ts` |
| `src/main/server-safe-mode.ts` | Minimal Team API when a server stops its start loop |
| `src/main/host-events-service.ts` | Webhook receive, signature check, route sync (`HostEventsService`) |
| `src/main/analytics.ts` | `HostAnalytics.handleWebhookDelivery` |
| `src/main/webhook-security.ts`, `src/main/github-relay.ts`, `src/main/deep-link-router.ts` | Webhook secret cipher/signing; GitHub event relay (`GitHubRelay`); `codebot://` links |
| `src/main/mcp-oauth-redirect-server.ts` | Loopback OAuth redirect listener for MCP sign-in |
| `src/main/agent-database-host-process.ts` | Forks the database utility process (`utilityProcess.fork`) |
| `src/backend/agent-data/agent-database-host.ts` | Database host child: `node:sqlite` `DatabaseSync`, SQL authorizer, line protocol |
| `src/backend/agent-service.ts` | `AgentService`: owns agent state writes and events to the renderer |
| `src/backend/codebot-database-schema.ts` | `codebot.db` schema and migrations (baseline version 8); migration files in `src/backend/migrations/` |
| `src/backend/routine-store.ts`, `webhook-route-store.ts`, `routine-records.ts`, `webhook-trigger.ts` | Routine save, webhook routes (`WebhookRouteStore`) and receipts, owner view, filter matching |
| `src/backend/workflows/workflows.ts` | `Workflows` service: `receiveWebhook`, `receiveGitHub`, `receiveDiscord`, `receiveTelegram`, `receiveSlack` |
| `src/backend/agent/tool-catalog.ts` | Direct tools and 3 discovery tools for every provider adapter |
| `src/backend/agent/model-catalog.ts` | `ModelCatalog.refresh` reads `model/list` from each CLI |
| `src/backend/provider-drivers.ts` | Per-provider driver rules (catalog, custom behavior) |
| `src/backend/idle-thread-pool.ts` | `IdleThreadPool`: unloads idle provider sessions |
| `src/backend/provider-history.ts`, `provider-history-import.ts` | History fragment reader and normalized import commits |
| `src/main/provider-runtime-releases.ts` | Upstream CLI release checks and hash verification |
| `src/backend/agent/prompts.ts` | `apiKeyFormSpec`. Developer instructions are in `src/backend/agent/developer-instructions.ts` |
| `src/backend/agent/conversation-runtime.ts` | Conversation runtime (active work and recent cache) (unverified as the doc's `ConversationRuntime`) |
| `src/backend/agent-threads/agent-thread-store.ts` | `projection_agent_threads` store (side threads, formerly "tasks") |
| `src/backend/process-confinement.ts` | Protects workspace skill folders for confined agents |
| `src/backend/browser-host.ts` | `BrowserHost`: tab access, operation queues, focus, deadlines, persistent state |
| `src/backend/browser-tools.ts` | Provider schemas for browser tools; parses each call |
| `src/backend/browser-tool-actions.ts` | Maps input tools to CDP operations (does not own tabs) |
| `src/backend/browser-state.ts`, `src/backend/versioned-json-store.ts` | `browser-tabs.json` re-validation; versioned JSON rule |
| `src/backend/password-vault.ts` | `PasswordVault` interface for 1Password and Bitwarden |
| `src/main/onepassword-connector-service.ts` | 1Password connector (`op` CLI, `@1password/sdk`) |
| `src/main/local-skill-library.ts` | Immutable local skill revisions |
| `src/main/skill-folder-discovery.ts` | Lists workspace skill folders (read-only) |
| `src/main/skill-marketplace-service.ts` | Writes `.codebot/skills-lock.json` and `.codebot/skills-disabled/` |
| `src/backend/home-skills.ts` | Reads `~/.agents/skills` (read-only, max 200); `SKILL_OWNERSHIP_MARKER` (`.codebot-managed.json`) |
| `src/backend/claude-workspace-sandbox.ts` | `claudeHomeSkillPlugin`: exposes home skills to Claude Code as plugin `agents` |
| `src/backend/mcp-redaction.ts`, `src/backend/mcp-oauth-provider.ts` | MCP secret redaction; OAuth provider and client registration |
| `src/main/automation-server.ts` | Loopback HTTP listener for local scripts (`allowAutomation`) |
| `src/renderer/src/features/conversation/stores/panels-store.ts` | `SidePanelState` (open tabs, selected tab, maximize) |
| `src/renderer/src/features/conversation/conversation-scope.ts` | `openSidePanelPane`, `closeSidePanelPane`, `sidePanelPaneActions`, `keepSidePanelShown`, `resetPanelsForAgent` |
| `src/renderer/src/features/conversation/ConversationPanels.tsx` | `sidePanelPanes` availability rules and pane content switch |
| `src/renderer/src/features/conversation/stores/side-question-store.ts` | Side question per chat and per side thread |
| `src/renderer/src/features/conversation/stores/skills-store.ts` | `$` skill tag list, per chat and per channel |
| `src/renderer/src/features/web-client/` | Browser composition for `/app`; `web-runtime.ts` (`WebWorkspaceRuntime`) |
| `src/renderer/src/color-scheme.ts` | Resolves System/Light/Dark for each window |
| `packages/ui/src/features/conversation/SidePanel.tsx` | `SIDE_PANEL_PANES` record, `SidePanelPane`, `isSidePanelPane` |
| `packages/ui/src/complex.tsx` | Curated Kobalte adapters (Dialog, DropdownMenu, Popover, etc.) |
| `packages/ui/src/icons.ts` | Shared Lucide icon export |
| `packages/ui/src/features/workflows/` | Workflow canvas (props only, no app context) |
| `packages/brand/src/tokens.css` | All global `--codebot-*` tokens (dark values); only allowed colour literal file |
| `packages/brand/src/tokens-light.css` | Light token values (`data-codebot-color-scheme="light"`) |
| `packages/i18n/src/messages/<locale>/<area>.ts` | Message catalogs, one file per area |
| `packages/i18n/untranslated.json` | Keys a locale does not translate yet |
| `scripts/side-panel-panes-e2e.ts`, `scripts/web-side-panel-e2e.ts` | Side panel end-to-end checks |
| `scripts/ui-foundation-check.ts` (`bun run check:ui`), `scripts/ui-foundation-check.test.ts` | UI foundation rules check and its test |
| `scripts/dev-automation/instance-registry.ts`, `stack-registry.ts`, `port-allocation.ts`, `scripts/dev-stack.ts` | Dev instance and port registry (dev:status, dev:stop, dev:forget) |
| `AGENTS.md`, `src/main/AGENTS.md`, `packages/ui/AGENTS.md` | Active rules (linked from docs; not in this scope) |

## How it works

### Process model

- Four runtimes (from `docs/architecture/structure.md` and `docs/architecture/change-rules.md`):
  - **main** (`src/main/`): Electron lifecycle, trusted IPC, host server, OS adapters. Runs with full user privileges.
  - **backend** (`src/backend/`): agent runtime, provider adapters, event storage, queues, browser host.
  - **renderer** (`src/renderer/`): SolidJS UI. Cannot import `src/main` or `src/backend`.
  - **preload** (`src/preload/`): narrow typed bridge. Maps typed calls to IPC channels. No business rules.
- **database host** (a separate process): `src/main/agent-database-host-process.ts` forks `agent-database-host.js` with `utilityProcess.fork`, service name "CodeBot databases". The child (`src/backend/agent-data/agent-database-host.ts`) uses `node:sqlite` `DatabaseSync` and a SQL authorizer. It speaks a frozen line protocol. The supervisor can kill it if it blocks. Process count and restart policy beyond this: unverified.
- Shared contracts: `packages/contracts` (no Electron, Node, SolidJS, provider or Cloudflare imports). Biome `noRestrictedImports` enforces these boundaries.
- Import direction (`structure.md`): renderer -> contracts <- preload <- main -> backend; auth-api -> contracts only.
- Service graph: `createApplicationServices` (defined in `src/main/application-services.ts`, called from `src/main/index.ts`) constructs services in one function. Shutdown runs roughly in construction order, not reverse (`main-process-design-notes.md`).
- Effect 4.0.0 is used for service workflows in main, the account Worker, the site-router Worker, Signal and the team client. Promise interfaces stay at framework and SDK boundaries (`change-rules.md`).

### State ownership

- `codebot.db` (SQLite): source of truth for agents, conversations, queues, reactions, attachments and provider-session bindings (`structure.md`). Schema and migrations: `src/backend/codebot-database-schema.ts` and `src/backend/migrations/`.
- `browser-tabs.json`: browser tab state. Outside `codebot.db` and outside the migration runner (`structure.md`).
- `~/CodeBot/Shared/Data/agent-data.db`: shared agent tables (`codebot_metadata` owner table). Outside `codebot.db`.
- `codebot-approval-automation-v3.json`: which agents have Full access. Read by `AttentionRegistry`. Never crosses the Team API.
- Provider home folders (`~/.codex`, `~/.claude`, `~/.gemini`, etc.) are provider-owned login and resume state, not CodeBot conversation storage.
- D1 (account service): accounts, memberships, invitations, logical sessions, webhook route metadata (`webhook_routes`, `apps/auth-api/src/server/remote-control-plane.ts`).
- Stripe: source of truth for paid plans. D1 `billing_subscriptions` is a copy.
- Renderer stores: display projections only. One record per agent inside the keyed server scope (`change-rules.md`, rule 7).

### Event log and webhook events

- Flow: signed request -> route -> routine -> run (`events.md`).
- Routine trigger: `schedule` or `webhook`. Webhook trigger has a public URL, an optional exact event type and up to 128 JSON Pointer filters (`webhook-trigger.ts`, `WEBHOOK_FILTERS_LIMIT`).
- Ownership table (`events.md`): trigger and secret in `projection_routine_webhooks` and `projection_channel_routine_webhooks`; receipts in `projection_webhook_receipts`; revocations in `projection_webhook_route_revocations`; workflow triggers in `workflow_trigger_webhooks` (created by migration 46, `src/backend/migrations/0046-workflows.ts`).
- Route creation: backend makes a UUID route ID. Main makes the secret (`whsec_` + 32 random bytes, Standard Webhooks format) and encrypts it with Electron `safeStorage`. The secret is shown once.
- Routes limit: `WEBHOOK_ROUTES_LIMIT` = 64 (`packages/contracts/src/signal-protocol/webhook-route.ts`), checked in `host-events-service.ts`.
- Route sync: `HostEventsService.syncRoutes` registers routes with the account service. Retry after 30 s, doubling to 15 min (unverified in code).
- Inbound (`remote/api/src/app.ts`): the Signal app has a `/v1/signal` WebSocket. The webhook route `POST /v1/webhooks/:routeId`, its check order (route 404, body 413, content type 415, headers 401, socket 503, rate limit 429) and "Signal does not store the body" are unverified: the route was not found in `remote/api/src/app.ts`.
- Host body limit: `HostEventsService.receive` refuses a body over `WEBHOOK_DELIVERY_BODY_BYTES_LIMIT` (64 KiB, `packages/contracts/src/signal-protocol/messages.ts`) with 413.
- Host responses (`HostEventsService.receive`): 413, 404, 401, 400, 202 (started or ignored), 200 (duplicate), 503 (held or failed). Full table in `events.md` (not re-checked).
- Signature: `sha256=HMAC-SHA256(secret, "<timestamp>.<deliveryId>.<body>")`, constant-time compare, timestamp within 5 min (`events.md`; signature pattern verified in `webhook-route.ts`).
- Receipt and run commit in one transaction. Unique key `(owner_kind, routine_id, delivery_id)`. Receipts live 7 days (`events.md`).
- Analytics: `system_webhook_delivery` events, at most 60 per minute (`HostAnalytics.handleWebhookDelivery` in `src/main/analytics.ts`; the 60/minute limit is unverified). No route ID, delivery ID, secret, or body.
- Workflow triggers (`events.md`; the `Workflows` service is in `src/backend/workflows/workflows.ts`):
  - Webhook: `Workflows.receiveWebhook`. Body limit of 64,000 characters from the doc (unverified in code). Busy workflow answers 202 `ignored`.
  - GitHub: GitHub App -> Signal -> `GitHubRelay` -> `Workflows.receiveGitHub`. Table `workflow_github_deliveries` (migration 49). Skip reasons: `filter`, `self`, `chain`, `refused`, `offline`.
  - Discord: `MessagingService` -> `Workflows.receiveDiscord`. Source `discord` (migration 50).
  - Telegram: `Workflows.receiveTelegram`. Source `telegram` (migration 52). Key `telegram:<node>:<connection>:<message>`.
  - Slack: `app_mention` only (`src/backend/messaging/slack/slack-events.ts`). `Workflows.receiveSlack`. Source `slack` (migration 53).
- Local event IPC: `events` group in `IPC_ENDPOINTS` (`packages/contracts/src/ipc-endpoints.ts`, line 2089).
- Remote events: `events-v1` Team API capability, `EVENTS_ROUTES` in `packages/contracts/src/team-protocol/events-v1.ts`. Admin-only (`adminRoute`).
- Optional capabilities on top of events: `routine-recovery-v1`, `webhook-tests-v1`, `webhook-sender-secret-v1`, `webhook-agent-secret-v1`, `workflows-v1` (`rotate-webhook-secret`), `workflows-github-v1`, `workflows-chats-v1`. All have files in `packages/contracts/src/team-protocol/`.
- Agent events: `workflows-changed`, `routine-flows-changed` (`agents.md`).
- Threat model: a valid event is still external data. It cannot grant tools or skip approvals (`events.md`).

### Team API

- Current remote link: Team API protocol v9 (`team-api.md`, line 5) over ordered WebRTC DataChannels. The channel kinds are `rpc`, `events`, `files` and `desktop` (`ChannelKind` in `packages/team-client/src/remote-peer.ts`). A hidden sandboxed Chromium page owns each `RTCPeerConnection`, and Signal carries SDP and ICE only (both from `team-api.md`, unverified in code).
- Protocol files: `packages/contracts/src/team-protocol/v1.ts` through `v10.ts`. `TEAM_PROTOCOL_V10` is the local maximum (`src/main/remote-server-connection-status.ts`, `LOCAL_TEAM_PROTOCOL`). Header: `CodeBot-Protocol-Version` (`TEAM_PROTOCOL_VERSION_HEADER`).
- Capabilities are additive. The client sends its list when it sets the event scope. A missing capability disables only that feature. Unknown optional events are ignored. A malformed known event closes the connection as `protocol_error` (`team-api.md`).
- Named capabilities (from docs; each has a file in `packages/contracts/src/team-protocol/` unless noted): `agent-tasks-v1`, `providers-v1` (and `providers-v3` to `v8`), `instance-transfer-v1`, `vault-v1`, `workflows-v1`, `sign-in-relay-v1`, `events-v1`, `provider-accounts-v1`, `connectors-v1`, `browser-profiles-v1`, `agent-memories-v1`, `agent-install-v1`, `agent-update-v1`, `agent-publish-v1`, `skills-admin-v1`, `sidebar-pins-v1`, `routine-results-v1`. `mcp-servers-v1` has no file of that name; the string is used in `src/renderer/src/features/servers/server-capabilities.ts`. MCP files are `mcp-v1.ts`, `mcp-access-v1.ts` and others.
- Dispatch order in the Team API (`main-process-design-notes.md`): compatibility first, then remote-screen delegation, then authentication, then route selection, then unmatched path/method handling. One dispatcher catch returns 500 for unexpected errors. One `HttpError` class (`src/main/team-api/http-error.ts`).
- Route files: `src/main/team-api/route-*.ts` (per group). Shared helpers: `src/main/team-api/request-helpers.ts`.
- Server safe mode (`team-api.md`): a server that stopped its start loop keeps a minimal API (`src/main/server-safe-mode.ts`, `src/main/team-api/server-safe-mode-api.ts`). Answers protocol 10 only. Capability `server-safe-mode-v1`. Other requests get 426 or 503 (status codes unverified).
- Mobile and web clients use the same ticket, transcript, framing and RPC codec (doc). Mobile Connect QR codes bind the host ID and public-key fingerprint (doc).
- Released adapters are frozen. Old protocol adapters stay while a release in the support window uses them (`change-rules.md`, rule 9).
- Host and preload decoders stay separate: `decode*FromHost` (main) and `decode*FromMain` (preload). `ipc-channel-coverage.test.ts` checks name pairing (`main-process-design-notes.md`).

### IPC

- All endpoints are declared in `IPC_ENDPOINTS` (`packages/contracts/src/ipc-endpoints.ts`), grouped by domain. Top-level groups (line numbers from file): `app` (788), `maintenance` (856), `providers` (860), `providerRuntimes`, `voice`, `dynamicIsland`, `browserDock`, `agentDock`, `computerUse`, `macAutomation`, `backgroundProcesses`, `skills` (996), `customProviders`, `providerDetection`, `acpRegistry`, `customAgents`, `providerAdmin` (1046), `messaging` (1138), `hostAdmin` (1248), `githubConnector`, `bitwardenConnector`, `passwordManagers`, `linkAccount`, `nearWallet`, `vault` (1397), `onePasswordConnector`, `hostedSites`, `routineFeed`, `billing`, `referral`, `credits`, `license`, `hostedServers`, `localServers`, `marketplaceAgents`, `agentTemplates`, `auth`, `update`, `notifications`, `agent` (1561), `agentMemories`, `sharedTables`, `agentRoutines`, `channelMemories`, `channelFolders`, `channelRoutines`, `workflows` (1733), `crm`, `routineResults`, `agentAttachments`, `agentFolders`, `agentInstructions`, `attachmentImports`, `browser` (1835), `browserInput`, `servers` (1879), `agentAdmin` (1919), `mcpServers` (1992), `storage`, `agentImport`, `instanceTransfer`, `plugins`, `marketplace`, `host` (2067), `events` (2089), `remoteDesktop` (2105).
- Helper functions (local to `ipc-endpoints.ts`): `request<I, O>()("ns:name")`, `event<T>()("ns:name")`.
- Main side: `src/main/ipc/define-ipc-group.ts` wrappers. Each domain module returns a typed handler group. `registerIpcGroups` (called from `src/main/index.ts`) must list every group (missing group is `TS2741`).
- Sender validation in `src/main/trusted-ipc.ts` (`isTrustedRendererUrl`). Decoding runs after sender validation.
- Direct `ipcMain` use is allowed only in `trusted-ipc.ts`.

### Providers

- Provider ids: `AGENT_PROVIDERS` in `packages/contracts/src/agent-providers.ts` has 18 ids: `codex`, `claude`, `grok`, `opencode`, `antigravity`, `cursor`, `cline`, `pi`, `muse`, `inception`, `deepseek`, `openrouter`, `hermes`, `acp`, `kimi`, `devin`, `copilot`, `mistral`.
- Gemini: the provider with id `antigravity` has display name "Gemini" (`agent-providers.ts`). The Gemini section in `providers.md` describes this provider.
- Direct built-in tools for every adapter (`DIRECT_NAMES` in `src/backend/agent/tool-catalog.ts`): `ask_user`, `ask_ui`, `attach_files_to_response`, `list_agents`, `send_message`, `start_task`, `message_task`, `close_task`, `search_memories`, `remember`, `forget_memory`, `react_to_user_message`, `request_api_key`, `routine_no_update`, `routine_report_failure`, `suggest_marketplace_app`, `generate_image`, `generate_video`. Direct browser tools: `open`, `list_tabs`, `run_script`. Three discovery tools: `tool_search`, `tool_describe`, `tool_call`. Claude uses its native question tool, not `ask_user` (unverified).
- Channel tools `channel_result` and `channel_reply` are used for Claude channel threads (`providers.md`). They appear in `developer-instructions.ts`, `tool-guidance.ts` and `turn-lifecycle.ts`, but are not in `DIRECT_NAMES` (unverified how they are exposed).
- `CLAUDE_CODE_TERMINAL_MCP_TOOLS` (in `src/backend/claude-client.ts`) names `routine_no_update` and channel tools so the CLI ends the turn with no extra text (contents from doc).
- Model list: `ModelCatalog.refresh` (`src/backend/agent/model-catalog.ts`) asks each running CLI for `model/list`. Per-provider rules live in `src/backend/provider-drivers.ts`.
- Idle sessions: `IdleThreadPool` (`src/backend/idle-thread-pool.ts`) closes idle processes and resumes at the next turn. Antigravity holds its session up to 30 min (4 h max) while tool calls run (doc; unverified in code).
- Background memory review and skill suggestions: `providers.md` sections "Background memory review" and "Skill suggestions".
- History: adapters own pagination and decoding; `provider-history.ts` defines the reader; `provider-history-import.ts` commits pages without deleting absent messages (`structure.md`).
- CLI updates (`providers.md`, `src/main/provider-runtime-releases.ts`): GitHub releases for Codex, Pi, Kimi, Copilot, Mistral, Gemini; npm `latest` for Claude, OpenCode, Cline; `x.ai/cli/stable` for Grok; `muse-stable` for Muse; Cognition manifest for Devin; ACP registry for Cursor. Each download is checked against the source hash. Pinned versions are in `native-runtime.lock.json`. Install record: `codebot-install.json` (written from `src/main/provider-runtime-descriptors.ts`).
- Custom agents and ACP: `providers.md` sections "Custom agents" and "OpenCode and ACP".
- Backup models and failover: `providers.md` "Backup models and failover".
- Provider variables and local context: `providers.md` "Provider variables", "Local context indication".
- Sign-in per provider: `integrations.md#add-a-provider`, and `providers.md` "Account code sign-in".

### Agents and threads (for context)

- Agent = product object (`AgentStore` in `src/backend/agent-store.ts`, `AgentSummary`, `agent-${uuid}`, `~/CodeBot/Agents/<id>`) (`glossary.md`).
- Side thread (code and wire name `task`): `projection_agent_threads`, migration 47 (`src/backend/migrations/0047-agent-threads.ts`); id is `legacy_task_id ?? thread_id` (`agents.md`, `agent-thread-store.ts`).
- Concurrency: at most `agentTaskLimit` side-thread turns per agent. Default 4 (`AGENT_TASK_LIMIT_DEFAULT`); max 64 host-wide (`HOST_AGENT_TASK_LIMIT_MAX`, `packages/contracts/src/ipc-agent-tasks.ts`).
- Workflows: graph on the Workflows page; host keeps them; `workflows-v1` capability; canvas in `packages/ui/src/features/workflows/` (`agents.md`).
- Routine flows: `src/backend/routine-flows/` (migration 31). Desktop has no routine canvas (`agents.md`).
- Local scripts API: `src/main/automation-server.ts`; loopback only (`127.0.0.1`); bearer token in `<userData>/automation/`; `automationRunsPerHour` default 30 (unverified in code). See `agents.md` and `docs/automation.md`.
- Agent templates: public link-only copies of instructions, skills and routines; no workspace files or memories (`glossary.md`). D1 table `agent_templates` (`apps/auth-api/src/server/agent-templates.ts`).

### Side panel

- Panes registry: `SIDE_PANEL_PANES` in `packages/ui/src/features/conversation/SidePanel.tsx`. Entries: pane id, label key `conversation.sidePanel.pane.<id>`, icon. Order = launcher and Add menu order.
- Type and check: `SidePanelPane` and `isSidePanelPane`, derived from the same record.
- State: `SidePanelState` in `src/renderer/src/features/conversation/stores/panels-store.ts` (`files`, `panes`, selected tab, maximize).
- Actions: `openSidePanelPane`, `closeSidePanelPane`, `showSidePanelInPlaceOf`, `sidePanelPaneActions` (`open` and `release`), `keepSidePanelShown`, `resetPanelsForAgent` in `src/renderer/src/features/conversation/conversation-scope.ts`.
- Availability: `sidePanelPanes` rules in `src/renderer/src/features/conversation/ConversationPanels.tsx`. Content shows when `activeRightPanel()` equals the pane id.
- Close order when the shown tab closes: next pane, then first side thread, then last file tab, then the pane list (doc; unverified in code).
- Question pane: one side question per chat and per side thread (`side-question-store.ts`). Close tab deletes all side questions (doc; unverified).
- Panel tabs persist per agent and per channel while collapsed (doc; unverified).
- Not a plugin API. Internal extension point for built-in features (`side-panel.md`).

### Browser

- Web client: `apps/auth-api` serves `/app`. Client code: `src/renderer/src/features/web-client/`. Typed interface `WebWorkspaceRuntime` (`web-runtime.ts`). Account calls go through a closed list of `/api/browser/*` operations.
- Remote browser runtime uses `packages/team-client` (directory, WebRTC peer, Signal recovery, file transfers, browser-view streams).
- Agent browser tools: `list_tabs`, `status`, `open`, `snapshot`, `navigate`, `evaluate`, `request_takeover`, `submit_secret`, `list_logins`, `fill_card` are all defined in `src/backend/browser-tools.ts`. Other tools there include `click`, `type`, `fill_fields`, `list_vault_items`, `save_vault_item`, `run_script` and `close_tab`. CDP mapping: `src/backend/browser-tool-actions.ts`.
- `BrowserHost` (`src/backend/browser-host.ts`) owns: tab access check (`toolCanUseTab`, `#requireToolTab`), operation queues, focus, deadlines, persistent state.
- Tab ownership: main chat, side threads of the same agent, or none. `list_tabs` and `status` report `chat` values and `otherChatWorking`. Channels use only their own tabs. Tagged tabs (`sharedThreadIds`) are shared (doc).
- Browser profile: persistent partition per agent (`persist:codebot-browser-profile-<id>`). Profiles hold proxies (the max of 50 proxies is unverified; `BROWSER_PROXY_ADDRESS_MAX` is an address length limit, `packages/contracts/src/ipc-browser-proxies.ts`).
- Tab lifetime (`browser.md`): tabs sleep after 2 min idle (`IDLE_TAB_FREEZE_MS` in `browser-host.ts`). The "more than 3 idle tabs" condition is unverified. Tabs close on agent delete or profile change (doc).
- Popups become `WebContentsView` tabs. Dependent popups close with the parent (doc).
- Persistent state file: `browser-tabs.json`, versioned (`v1`, `v2`), via `src/backend/versioned-json-store.ts`. `src/backend/browser-state.ts` re-validates each bound on read (`structure.md`).
- Secure sign-in: `codebot_browser.list_logins`, `submit_secret`, `fill_card`. Secrets never go to providers. Scripted pages mark their origin (`browser.md`, `skills-and-plugins.md`).
- Password vaults: 1Password (`src/main/onepassword-connector-service.ts`, `@1password/sdk`) and Bitwarden (`bw` CLI, `src/main/bitwarden-connector-service.ts`). Both implement `PasswordVault` (`src/backend/password-vault.ts`). Bitwarden keeps no connection file (doc; unverified).
- Browser user-agent: `sessionBrowserUserAgent` in `src/backend/browser-identity.ts` removes `CodeBot/` and `Electron/` tokens. It adds `Electron/` back only for `accounts.google.com`.

### Skills and plugins

- Skill format: Agent Skills spec, folder `<name>/` with `SKILL.md`. Frontmatter `name` (folder name) and `description` (length limit unverified) (`skills-and-plugins.md`).
- Workspace folders read by providers: per provider `skillFolders` in `packages/contracts/src/agent-providers.ts` (for example `.gemini/skills` and `.agents/skills` for antigravity). The full list in `skills-and-plugins.md` (`.agents/skills/`, `.claude/skills/`, `.opencode/skills/`, `.gemini/skills/`, `.cursor/skills/`, `.cline/skills/`, `.clinerules/skills/`) is unverified as a whole.
- CodeBot-installed skills are copied to both `.agents/skills/<slug>` and `.claude/skills/<slug>` (copies, not links) (doc; unverified). Lock: `.codebot/skills-lock.json`. Disabled: `.codebot/skills-disabled/` (both in `src/main/skill-marketplace-service.ts`). Bundled marker: `.codebot-managed.json` (`SKILL_OWNERSHIP_MARKER` in `src/backend/home-skills.ts`).
- `src/main/skill-folder-discovery.ts` lists other workspace skills as read-only `workspace` skills.
- Home skills: `~/.agents/skills` read by `src/backend/home-skills.ts` (max 200, never written). Delivery per provider: `native`, `plugin` (Claude Code via `claudeHomeSkillPlugin`), or `instructions` (Antigravity, Muse, custom ACP: up to 100 skills listed) (doc; the `instructions` value for antigravity is verified in `agent-providers.ts`).
- `$` tag list: `listInstalledForChatTags`. Home skill id is `home:<slug>`. Channel `$` list per agent: `skills-store.ts`.
- Local skill library: `src/main/local-skill-library.ts`. Immutable revisions at `local-skills/<uuid>/<revision>/bundle.zip` (doc). Used by `create_skill` and `revise_skill` (both in `src/backend/agent/developer-instructions.ts` and `skill-suggestion.ts`). Pack = several skills in one bundle (doc).
- MCP servers: `projection_mcp_servers` in SQLite is the source. Claude starts with `strictMcpConfig` (`src/backend/claude-client.ts`). Secrets are masked in the panel and removed from logs (`mcp-redaction.ts`). Whether CodeBot writes no provider MCP files is unverified: `src/backend/agent/codex-mcp-config.ts` exists.
- MCP OAuth redirect: `src/main/mcp-oauth-redirect-server.ts` listens on `127.0.0.1` (the redirect URL is built from the server port). `codebot://mcp-auth` (`MCP_OAUTH_REDIRECT_URL` in `src/main/deep-link-router.ts`) is the fallback. Stored registrations are checked in `src/backend/mcp-oauth-provider.ts` (`clientInformation()`).
- Plugins: one developer bundle = MCP server + skills + listing. Catalog from `marketplace/plugin-catalog/` (generated; generator not opened), served by the account Worker from `openbot.run`. Install saves the app as a host-global MCP server and installs pinned skills. Share link `openbot.run/plugins/<slug>`. Deep link `codebot://plugins/<slug>` (`src/main/deep-link-router.ts`). Plugin cache and Worker routes are still design (doc).
- Connectors (built-in sign-in services): GitHub (`src/main/github-connector-service.ts`), Bitwarden, 1Password. A user MCP server or plugin is not a connector (`glossary.md`).

### UI foundation

- Tokens: every global `--codebot-*` token is declared in `packages/brand/src/tokens.css` (dark values). Light values in `packages/brand/src/tokens-light.css`. `src/renderer/src/styles.css` imports both (doc; import not checked).
- Dark is the default. Light applies when `data-codebot-color-scheme="light"` is set on the root (attribute set by `packages/ui/src/document-color-scheme.ts`). System resolves through `prefers-color-scheme` in `src/renderer/src/color-scheme.ts`.
- Control scale: 24, 28, 32 (standard), 36 px (important actions) (doc; unverified).
- Primitives exported from `@codebot/ui`: `Text`, `Heading`, `Button` (variants `default`, `secondary`, `ghost`, `destructive`, `link`), `IconButton` (needs `label`), `Badge`, `Input`, `Textarea`, `NativeSelect`, `Field`, `Switch`, `Card`, `Separator`, `Spinner`, `Skeleton`, `Kbd`, `Dialog`, `AlertDialog`, `DropdownMenu`, `Popover`, `Tooltip`, `Tabs`, `RadioGroup`, `Select`, `Combobox`, `Listbox` (the index in `packages/ui/src/index.ts` re-exports per-file modules; the exact names were only partly checked, and the complex controls are confirmed in `complex.tsx`).
- Kobalte is pinned to `@kobalte/core@2.0.0-alpha.0` (`package.json`) and reachable only through `@codebot/ui` (`packages/ui/src/complex.tsx`). Direct Kobalte and Lucide imports are blocked. Patches in `patches/` (Bun).
- Checks: `bun run check:ui` (`scripts/ui-foundation-check.ts`) blocks native buttons and switches, hand-rolled dialogs/menus, direct Kobalte/Lucide imports, colour literals outside `tokens.css`, and untokenized text sizes, radii and transition durations. Budget is zero.
- Storybook: `Foundations` section; a11y gate `test: "error"` (unverified).
- Motion: under 300 ms; `prefers-reduced-motion` respected; hover only under `(hover: hover) and (pointer: fine)` (doc; unverified).
- Desktop transparent window (macOS): `data-codebot-window-glass` on root; `src/renderer/src/styles/window-glass.css` (the attribute is used in `window.css` and `web-client.css`).

### i18n

- Catalogs: `packages/i18n/src/messages/<locale>/<area>.ts`. English is the source. Locales (verified as directories): `ar`, `de`, `en`, `es`, `fr`, `he`, `it`, `ja`, `ko`, `nl`, `pl`, `pt`, `ru`, `tr`, `zh`.
- Areas: `common`, `format`, `language`, `error/*`, `status/*`, `mobile/*`, and screen areas (`settings`, `chat`, etc.) (doc; unverified).
- Add a key: `defineMessages("<area>", { "<area>.<key>": "..." })`. Prefix must match the module (build fails otherwise; enforced in `scripts/i18n-check.ts`). Plurals use `{ one, other }`.
- Missing translation shows English. Unlisted untranslated keys go in `packages/i18n/untranslated.json` (verified file, per-key locale lists).
- Checks: `bun run i18n:check` (script `scripts/i18n-check.ts`; `--fix` verified; `--accept=<tag>` unverified); `bun run typecheck:i18n` (verified script).
- Text from another process (`error/*`, `status/*`) is shown through catalog keys, not raw English.

### Glossary (naming rules)

- **agent**: product object. Table `projection_agents`. "teammate" is marketing text only. Human members use `TeamMemberSummary`.
- **agent template**: public link-only copy (`agent-templates:*`, D1 `agent_templates`). Not a marketplace agent.
- **browser profile**: persistent browser session for agents (`browser_profiles`, `persist:codebot-browser-profile-<id>`). Not `AgentProfile`.
- **bot**: released names only (Team API v1-v3 `bot`/`botId`, `bots.json`). Do not use in new product code.
- **channel**: shared multi-agent chat (`ChannelStore` in `src/backend/channel-store.ts`, `projection_channels`). "group" is a sidebar section or IPC group, never a product term. An IPC channel is an endpoint wire name.
- **connector**: built-in sign-in to an outside service, turned into agent tools (`GitHubConnectorService`).
- **messaging connection**: one external workspace (Slack workspace, Discord guild, Telegram chat). Slack channel is a `platformChannelId`.
- **CodeBot credits**: prepaid points (`packages/contracts/src/credits.ts`, `credits.*` IPC). Not usage credits or media credits.
- **server**: joined team server (`ServerSummary`), local Team API host (`HostStatus`), account API, or MCP server.
- **thread**: durable `projection_threads`. **conversation**: read projection. **provider session**: CLI resume state. **team session**: remote connection. **turn**: one exchange.
- **side thread**: second conversation of one agent (`projection_agent_threads`). Code and wire still say **task** (`AgentTask`, `taskId`, defined in `src/backend/agent-tasks/agent-tasks.ts`). **archive** closes it. **tab** is a local view. **branch** copies a thread through one turn (not a git branch).
- **role**: custom server role for agent access (`AgentAccessRole`, `agent-access-v1`). Team role is `TeamRole` (owner, admin, member; `packages/contracts/src/ipc-team-host.ts`).
- **routine**: saved instruction with one schedule or webhook trigger (`EventRoutineTrigger`, unverified name in code). Not Claude Code `/schedule`.
- **webhook routine / webhook route**: `RoutineWebhookTrigger` (`packages/contracts/src/ipc-events.ts`); route ID in `WebhookRouteStore` (`webhook_routes` in D1). A **receipt** dedupes delivery IDs.
- **workflow**: graph on the Workflows page (`WorkflowStore` in `src/backend/workflows/workflow-store.ts`, `workflows`, `workflows-v1`). Run = one pass. Step = one node try. Version = saved copy. Not a routine flow.
- **shared table**: a table in `~/CodeBot/Shared/Data/agent-data.db`. Owner = agent in `codebot_metadata`.

## How to change it

1. **Add an IPC endpoint.**
   - Add `request<I, O>()("ns:name")` in the right group of `IPC_ENDPOINTS` (`packages/contracts/src/ipc-endpoints.ts`).
   - Implement it in the domain module with `src/main/ipc/define-ipc-group.ts` wrappers. Decode input after the sender check.
   - Add the group to `registerIpcGroups` (called from `src/main/index.ts`). Missing groups fail compile (`TS2741`).
   - Add the preload mapping. Run `src/main/ipc-channel-coverage.test.ts`.
   - Use a focused input module, not `ipcMain` directly (`trusted-ipc.ts` owns `ipcMain`).
2. **Add a Team API capability** (`integrations.md#add-a-team-api-capability`).
   - Add `packages/contracts/src/team-protocol/<name>-v1.ts` with the route table (pattern: `events-v1.ts`).
   - Add route handlers in `src/main/team-api/route-*.ts`.
   - Advertise the capability only when the host serves it. Clients must check the list before they call it.
   - Keep the old protocol adapters until the support window ends.
3. **Add a provider** (`integrations.md#add-a-provider`).
   - Add the id to `AGENT_PROVIDERS` (`packages/contracts/src/agent-providers.ts`).
   - Add a driver rule in `src/backend/provider-drivers.ts`. Put provider payloads inside the adapter.
   - Add the CLI release source in `src/main/provider-runtime-releases.ts` and the pin in `native-runtime.lock.json`.
   - Check the tool list in `src/backend/agent/tool-catalog.ts` and the model list in `model-catalog.ts`.
4. **Add a side panel pane** (`side-panel.md`, "Add a pane").
   - Add label key `conversation.sidePanel.pane.<id>` to every `packages/i18n/src/messages/*/conversation.ts`.
   - Add the pane to `SIDE_PANEL_PANES` (`packages/ui/src/features/conversation/SidePanel.tsx`), with an icon from `@codebot/ui`.
   - Render content in `ConversationPanels.tsx` when `activeRightPanel()` is the id.
   - Add an availability rule to `sidePanelPanes` for the launcher, or open it from its own entry point only.
   - Add `sidePanelPaneActions` `open` or `release` only when needed.
   - Run `scripts/side-panel-panes-e2e.ts` and check each item in the "Verification" list.
5. **Add a browser tool.**
   - Add the schema in `src/backend/browser-tools.ts` and parsing there.
   - Map to CDP in `src/backend/browser-tool-actions.ts`. Do not own tabs there.
   - Add the tab check in `BrowserHost` with `toolCanUseTab` (lowest point every tab tool passes).
   - Check `status`/`list_tabs` output for `chat` ownership.
6. **Add a webhook trigger field or kind.**
   - Change the trigger in `webhook-trigger.ts` and the save in `routine-store.ts` (one transaction).
   - Add a migration in `codebot-database-schema.ts` (append only, never rewrite a shipped one).
   - Revoke routes through `revokeRoutineWebhooks` (`webhook-route-store.ts`, used by `channel-store.ts`) on delete or schedule change.
   - Add a Team API route only with a new capability. Do not change `events-v1` for released clients.
7. **Add a DB table or migration.**
   - Append to `src/backend/codebot-database-schema.ts`. Keep baseline version 8 unchanged.
   - Add migration tests and run `codebot-database-schema-parity.test.ts`.
8. **Add a UI control.**
   - Use `@codebot/ui` primitives. Use `--codebot-*` tokens only.
   - Run `bun run check:ui`. Add a Storybook story with the states in `ui-foundation.md`.
9. **Add a user-visible string.**
   - Add the key to the English module of its area. Start the key with the module prefix.
   - Add translations, or add the key to `packages/i18n/untranslated.json`.
   - Run `bun run i18n:check` and `bun run typecheck:i18n`.
10. **Add a skill to the local library or a plugin.**
    - Local: `create_skill` / `revise_skill` publish a folder to `src/main/local-skill-library.ts` (the tool names are verified; the publish path is doc).
    - Plugin: edit `marketplace/plugin-catalog/` (generated catalog). Update both the Apps tab and the public page from one catalog (doc).
11. **Verify.**
    - Run the narrowest test and lint changed files. Pre-commit runs `check:staged`, `check:ui` and typechecks (`scripts/staged-typecheck.ts`).
    - Packaging and Electron security changes need the macOS and Windows package checks (`change-rules.md`).
    - Live provider tests are manual and use isolated temp data.

## Other docs in scope (short map)

- `docs/architecture/servers.md`: storage and files, desktop server notifications, billing, servers on this computer, macOS Host Manager, hosted servers, remote connect order and workspace frame.
- `docs/architecture/channels-and-messaging.md`: iPhone and Android notifications, shared channel chats, messaging connections (`apps/discord-app`, `apps/slack-app`, `apps/telegram-app`, `packages/whatsapp`), mobile chat queue.
- `docs/architecture/integrations.md`: how a sign-in reaches CodeBot, the remote sign-in callback relay, add a provider/application/connector/Team API capability, NEAR Intents wallet, the browser extension and agents on the member's Chrome.
- `docs/architecture/computer-use.md`: Computer Use and remote desktop permission checks.
- `docs/architecture/analytics.md`: mobile product analytics, Chrome extension analytics, website analytics, resource sampling, agent usage analytics. Code: `src/main/analytics.ts`.

## Gotchas

- **Two-owner rule for types.** Put a type in `packages/contracts` only when it crosses a process or app boundary (`change-rules.md`, rule 1).
- **No `console.*`.** Use `@codebot/logging`. Biome `noConsole` enforces it (rule 10). Piped stdout uses `process.stdout.write`.
- **Only Biome.** Do not add a second linter or formatter (rule 6).
- **Schema rules.** Keep the baseline (version 8) frozen. Append migrations. Never rewrite a shipped migration. A downgrade keeps a newer file unchanged (`versioned-json-store.ts`).
- **Released names stay.** Team API v1-v3 `bot` names, `bots.json`, `mailbox.json` and the `agent-tasks-v1` wire keep old names.
- **Module-scope side effects.** `src/main/index.ts` sets `app.setPath`, `app.enableSandbox` and `protocol.registerSchemesAsPrivileged` at import time. Tests need an Electron mock or must read the file.
- **Getters before `whenReady`.** A service wired before `app.whenReady()` needs a getter. A captured `null` never recovers (`main-process-design-notes.md`).
- **Shutdown order.** Shutdown is largely construction order. Browser host closes before its PiP window; provider runtimes stop before the agent service that owns them (doc; unverified).
- **Webhook route IDs are never reused.** Revocation keeps the ID. A removed route can still receive posts to the old URL. A route conflict changes the URL (`events.md`; unverified).
- **Webhook secret is shown once.** A rotate ends the old secret at once. The chat tool does not return the first secret to the model.
- **Webhook events are data.** A valid signature does not grant tools or skip approvals.
- **Workflow triggers have no test event.** Discord, Telegram and Slack triggers have no route or secret of their own (`events.md`; unverified).
- **Team API protocol number.** `team-api.md` line 5 says the current remote link uses "protocol v9", and line 309 says protocol 10 is the protocol 9 wire with two capability lists (`v10.ts`). `LOCAL_TEAM_PROTOCOL.maximum` is `TEAM_PROTOCOL_V10` (`src/main/remote-server-connection-status.ts`). Treat v10 as the local maximum; the doc's "current" wording is unverified.
- **Side panel path.** `side-panel.md` names `ConversationPanels.tsx` and `panels-store.ts` without a full path. Real paths are `src/renderer/src/features/conversation/`. `SIDE_PANEL_PANES` is in `packages/ui/`.
- **Side thread = task in code.** `AgentTask`, `taskId` and `agent-tasks-v1` are still the names. A closed task is an archived thread.
- **Provider home folders are not history.** `~/.codex`, `~/.claude`, etc. hold login and resume state. Conversation data is in `codebot.db`.
- **Skills are copies.** CodeBot writes copies to `.agents/skills` and `.claude/skills`. Claude does not read `.agents/skills`, so a skill there stops working after a switch to Claude Code (doc; unverified).
- **Home skills are read-only.** Never write to `~/.agents/skills`.
- **MCP config is not in files.** Claude starts with `strictMcpConfig` (verified), so `.mcp.json` is not read (inference; unverified).
- **MCP OAuth redirect.** Port changes on each start. Registration is dynamic. A stored registration with another address is replaced for the next sign-in attempt. The `localhost` and `codebot://mcp-auth` forms are fallbacks (`main-process-design-notes.md`).
- **Browser tabs persist outside the migration runner.** `browser-tabs.json` is re-validated on read. A tab with a bad environment is still returned, without that environment.
- **Shared tables are not in `codebot.db`.** Only the owner can drop or alter a shared table. Users delete tables from agent settings.
- **Workspace writable roots.** A folder that holds CodeBot data, the home folder and disk roots are refused (`structure.md`).
- **Dev stack registry.** Pids are not identities. `dev:forget` is the only command that removes a record. Readers never delete a record file (`change-rules.md`).
- **Renderer may not read `window.codebot` directly** except through `<domain>-port.ts` modules (`change-rules.md`, rule 7; for example `conversation-port.ts`).
- **Dark is the default.** Light changes only token values. Do not add colour literals outside `tokens.css`.
- **Kobalte alpha.** Only `@codebot/ui` may import it. Wrappers in `complex.tsx` compensate for lost focus after close.
- **Glossary naming.** Do not add "bot", "teammate" or "group" as type names. "Task" is the code name for a side thread.
- **i18n keys are literals.** Write each key as a string literal so `i18n:check` and search can find it.
- **Short labels.** Button labels do not wrap. Pick the shortest natural translation (`i18n.md`).

## Unverified points

- Team API WebRTC framing (`WebRTC V2`), the hidden sandboxed Chromium page and Signal's SDP/ICE-only role: from docs only.
- Browser tool behavior and descriptions beyond the names: from `browser.md` text.
- `ConversationRuntime`: the doc uses this name in the renderer and browser sections. The file `src/backend/agent/conversation-runtime.ts` exists; its role matching the doc is unverified.
- `AgentService` method flow (write-then-notify): the class exists in `src/backend/agent-service.ts`; the exact flow is from `structure.md` only.
- Count of providers and whether `AGENT_PROVIDERS` is the complete provider set: 18 ids verified; the doc's list matches.
- `CLAUDE_CODE_TERMINAL_MCP_TOOLS` contents and behavior: the constant is used in `src/backend/claude-client.ts`; the contents are from `providers.md` only.
- Skill and plugin limits (100 skills in instructions, 300 chars per description, 200 home skills): only the 200 home-skill limit is verified (`MAX_HOME_SKILLS`).
- `marketplace/plugin-catalog/` and its generator: the directory exists; the generator was not opened.
- Shutdown order details (browser host before PiP window; teardown ordinals): from `main-process-design-notes.md` only.
- Database host process count and crash/restart policy beyond the fork and stderr tail: unverified.
- Signal webhook route `POST /v1/webhooks/:routeId` and its check order: not found in `remote/api/src/app.ts`.
- Webhook workflow body limit (64,000 characters), analytics rate limit (60/min), route-sync retry timing (30 s to 15 min), `automationRunsPerHour` default 30, the "more than 3 idle tabs" condition, and the browser proxy maximum of 50: not found in code.
- Antigravity idle session hold (30 min, 4 h max): doc only.
- `docs/architecture/servers.md` (2,299 lines), `integrations.md` (921 lines), `channels-and-messaging.md` (1,008 lines), `computer-use.md`, `analytics.md`, and the body of `agents.md` (1,654 lines) were not read in full. Only their headings and cited paths were checked. Use each doc's own text before you rely on any detail from them.
- `bun run check:ui` covers `tools/ui-foundation/*.grit` rules too (the doc describes the check; the GritQL rule set was not read). The `tools/ui-foundation` directory exists.
- Storybook `test: "error"` a11y gate and the `Foundations` story path: from `ui-foundation.md` only.
- Control scale, motion limits, primitive export names (partly checked), and `i18n:check --accept=<tag>`: from docs only.
