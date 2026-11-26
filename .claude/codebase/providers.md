# Providers (backend adapters)

## What this area is

- The provider layer connects CodeBot to outside agent runtimes: Claude, Codex, ACP CLIs (Grok, OpenCode, Antigravity, Cursor, Cline, Kimi, Devin, Copilot, Mistral, Hermes, custom ACP), and Pi-based providers.
- Every provider is one `AgentClient` (src/backend/agent-client.ts). A `BuiltInProviderDriver` (src/backend/provider-drivers.ts) makes the client for each provider id.
- `ProviderRuntime` (src/backend/agent/provider-runtime.ts) owns the clients. The scheduler, thread and turn code (src/backend/agent/*) drives them with JSON-RPC style method names such as `thread/start` and `turn/start`.
- Read this file first. Then read docs/architecture/providers.md for the long per-provider notes.

## Key files

| Path | What it owns |
|---|---|
| src/backend/agent-client.ts | `AgentClient` interface (adapter contract), `fixedContextCompaction`, shared error classes (`ProviderTurnActiveError`, `ProviderSessionBusyError`, `ProviderStoppedError`, `MissingClaudeSessionError`, `AgentProcessExitError`, `RequestTimeoutError`). |
| packages/contracts/src/agent-providers.ts | `AGENT_PROVIDERS` (18 ids), `AgentProviderDescriptor` (incl. `workspaceEnforcement`, `homeSkills`, `signInPageEnd`), `PROVIDER_ID_PATTERN`, foreign provider refs. |
| src/backend/provider-drivers.ts | `ProviderClientContext` (line ~441), `BuiltInProviderDriver` (~550), `BUILT_IN_PROVIDER_DRIVERS` (~637, one entry per provider), `claudeAgentEnvironment` (~496), `requireProviderDriver` (~1535), `savedCustomAgents` (~1518). |
| src/backend/agent/provider-runtime.ts | `ProviderRuntime` class (~342, ~4,700 lines), `AgentClientFactory` (~275), `ProviderHooks` (~294), `ProviderPort` (~321), per-provider compaction modes (`#compactionModes`, ~383), usage refresh guard (~356, ~2965), rate-limit read `account/rateLimits/read` (~4550). |
| src/backend/claude-client.ts (3,861 lines) | `ClaudeAgentClient` (~679). Wraps the Claude Agent SDK. RPC switch in `request` (~1099). `#resumeThread` (~1469), `#startThread` (~1497), `#startTurnEffect` (~1778), `#openTurn` (~1799), `#openCompaction` (~1863), `#handleMessage` (~2118), `#completeTurn` (~2805), `#readUsageEffect` (~1320). Also `CLAUDE_HOST_TOOLS` (~181), `CLAUDE_UNFIT_SKILLS` (~190), `claudeSettingSources` (~613), `ThreadConfig` (~352), `readThreadConfig` (~3581), `claudeRateLimits` (~3477), `claudeWeeklyKey` (~3491), `CLAUDE_SANDBOX_BLOCKED` (~3304), `claudeSdkLaunch` (~3365). |
| src/backend/claude-workspace-sandbox.ts | Claude "Workspace only" mode. `claudeWorkspaceSandbox`, `CLAUDE_WORKSPACE_MANAGED_SETTINGS`, `claudeWorkspaceSkillPlugin`, `claudeHomeSkillPlugin`, `claudeWorkspaceHooks`, `claudeWriteOutsideRoots`, `claudeWriteInExcluded`, `claudeExcludedWriteMessage`, `isClaudeSettingsFile`, `WRITE_TOOLS`. |
| src/backend/claude-history.ts | Reads Claude session history from `projects/<dir>/<threadId>.jsonl` under `CLAUDE_CONFIG_DIR` (or `~/.claude`). `claudeHistoryReader` (~130), `claudeHistoryFromMessages`, SQLite index under `codebot-claude-history`. |
| src/backend/claude-stored-sign-in.ts | `readClaudeStoredSignIn` (~215). Reads the Claude CLI's stored login (no secrets copied). |
| src/backend/claude-context-categories.ts | `claudeContextCategories` (context usage breakdown for the UI). |
| src/backend/app-server-client.ts (1,083 lines) | `CodexAppServerClient` (~108). Speaks JSON-RPC to `codex app-server` over stdio. `contextCompaction = "events"` (~109). `#wireParams` (~486), `#trackTurnContext` (~496), `withoutTurnContextParams` (~986). |
| src/backend/agent/codex-*.ts | Codex helpers: `codex-login.ts` (`CodexLoginFlow`), `codex-idle-sessions.ts` (`CodexIdleSessions`), `codex-mcp-config.ts`, `codex-model-source.ts` (`readCodexModelSource`, `CODEX_VARIABLE_PROVIDER`), `codex-prompt-settings.ts`, `codex-archive-retries.ts`. |
| src/backend/acp-client.ts (5,288 lines) | `AcpAgentClient` (~524). Generic ACP client over the `@agentclientprotocol/sdk`. Session create/load/resume (~1925-2070), `turn/start` case (~1340), prompt and developer-instruction injection (~2560-2590), `SLASH_COMMAND` regex (~387), `SESSION_STATE_UPDATES` (~173). |
| src/backend/acp-connection.ts | `AcpConnection` (~49). Spawns the ACP child process and makes the NDJSON stream. |
| src/backend/acp-flavor.ts (632 lines) | `AcpFlavor` interface (~58): per-CLI quirks as optional fields. `DEFAULT_ACP_FLAVOR` (~206). Flavor constants: `CLINE_ACP_FLAVOR` (~212), `COPILOT_ACP_FLAVOR` (~220), `GROK_ACP_FLAVOR` (~270), `HERMES_ACP_FLAVOR` (~428), `CURSOR_ACP_FLAVOR` (~455), `KIMI_ACP_FLAVOR` (~485), `DEVIN_ACP_FLAVOR` (~504), `MISTRAL_ACP_FLAVOR` (~515). `customAgentFlavor(command)` (~617). |
| src/backend/acp-flavor-opencode.ts | `OPENCODE_ACP_FLAVOR` (contextCompaction `"handoff"`). |
| src/backend/acp-flavor-antigravity.ts | `ANTIGRAVITY_ACP_FLAVOR` (contextCompaction `"handoff"`, ~467). Also holds the Gemini error patterns (`GEMINI_*` regexes, ~9-22). |
| src/backend/acp-configuration.ts | `AcpConfiguration` class and `AcpModel`, `AcpConfigurationState` (session config options and models). (unverified: details not read) |
| src/backend/acp-session-steering.ts | `acpSessionSteers(initialization)` and `steerAcpSession`. Decides if a live ACP session can take a steer. |
| src/backend/acp-sign-in.ts | `startAcpAuthentication`, `googleSignInByCodeBot`. ACP `authenticate` flow. |
| src/backend/acp-agent-command.ts, acp-agent-check.ts, acp-agent-scan.ts | Validate and scan custom ACP agent commands (`agentCommandForm`, `checkAcpAgent`, `scanAcpAgents`). |
| src/backend/custom-acp-agents-client.ts (856 lines) | `CustomAcpAgentsClient`, `CustomAgentConfig`, `CustomAgentSource`. Client for user-defined ACP agents. |
| src/backend/grok-client.ts | `GrokAgentClient` (~21). Subclass of `AcpAgentClient` with `GROK_ACP_FLAVOR`. |
| src/backend/grok-media.ts | Grok media (image/video) helpers. |
| src/backend/opencode-config.ts | OpenCode config. `CustomProviderSource`, `customProvidersOn`, `OPENCODE_PROFILE_CONFIG`, `OPENCODE_AGENT_CONFIG`, `openCodeConfigEnv`, `isMistralApi`. |
| src/backend/opencode-agent-defaults.ts, opencode-windows-shell.ts | OpenCode default agent env and Windows shell env. |
| src/backend/opencode-usage.ts | `readOpenCodeGoUsage`, `readOpenCodeRefusalStatus`, `readOpenCodeStoredKey` (reads the OpenCode SQLite DB). |
| src/backend/cursor-usage.ts | `readCursorUsage`, `checkCursorApiKey`, `cursorAuthFile`. |
| src/backend/cursor-mcp-disabled.ts | `enableCursorMcpServers` (per-folder MCP enable list). |
| src/backend/cline-free-models.ts | `clineFreeModels` and the Cline recommended-models URL. |
| src/backend/antigravity-usage.ts | `readAntigravityQuota`, `readAntigravityValidationLink`, `readAntigravityEmail`. |
| src/backend/antigravity-token-import.ts | `importAntigravityToken` (creates the Antigravity OAuth token file from a legacy refresh token when the target is missing, then writes a marker). |
| src/backend/pi-key-providers.ts | `createPiKeyExtension` (keys for Pi-based providers). |
| src/backend/provider-client-effects.ts | `ProviderClientOperationError`, `providerCall`, `providerSync`, `providerFailure`, `toProviderClientOperationError`, `ProviderSignInError`. |
| src/backend/provider-history.ts | Types `ProviderHistoryRequest`, `ReadProviderHistory`, `ProviderHistoryFragment`. |
| src/backend/provider-history-persistence.ts, provider-history-import.ts | Stores and imports provider history (`providerHistoryPersistence`, `importProviderHistory`). |
| src/backend/provider-process-group.ts, provider-processes.ts | Process group ends on exit; registry of provider PIDs. |
| src/backend/provider-temp.ts | `spawnWithProviderTemp`, `sweepProviderTemp`, `ProviderTempDiskSpaceError`. |
| src/backend/provider-terminal-login.ts | `startProviderTerminalLogin` (terminal sign-in). |
| src/backend/agent/turn-context.ts | `TurnContext` class (~15). Sends per-turn context blocks (memory, teammates, instructions file, saved logins, style reminder) and resends them when needed. |
| src/backend/agent/developer-instructions.ts | `developerInstructions(...)` (~394), `DeveloperInstructionOptions`, `folderToolsInstruction` (~69; Workspace only text). |
| src/backend/agent/thread-lifecycle.ts | `ThreadLifecycle` (~189). Sends `thread/start` (~565, ~690) and `thread/resume` (~1351, ~1359). `#workspaceOnlyParam` (~1046) sets `workspaceOnly` and `excludedFolders`. |
| src/backend/agent/drain-scheduler.ts | `DrainScheduler` (~182). Sends `turn/start` (~1085). Usage-limit gate (~427, ~764). |
| src/backend/agent/turn-lifecycle.ts | `TurnLifecycle` (~357). Sends `turn/interrupt`, handles turn events, sets compaction thresholds (~1475-1612). |
| src/backend/agent/context-compaction.ts | Compaction modes and scheduling. `compactsOnRequest` (~96), `thread/compact/start` (~534), handoff rotation (~471, ~510). |
| src/backend/agent/provider-accounts.ts (1,080 lines) | Provider account records and usage (unverified: sampled only). |
| src/backend/agent/provider-account-pool.ts | `pickPoolAccount` (~40). Chooses the account with the most room under the usage limit. |
| src/backend/agent/provider-account-store.ts | Stored accounts (unverified: not read in depth). |
| src/backend/agent/provider-status.ts, provider-diagnostics.ts, provider-models.ts | Provider status updates, MCP failure classification, model display and ordering. |
| src/backend/agent/workspace-sandbox.ts | Writable roots and excluded folders. `workspaceWritableRoots` (~54), `workspaceExcludedFolders` (~61), `workspaceTemporaryPaths` (~91), Codex sandbox policy helpers. |
| src/backend/agent/acp-subagent-updates.ts | OpenCode child-session updates (`OPENCODE_CHILD_UPDATE_METHOD`) and `foldAcpSubagentTool`. |
| src/backend/pi-client.ts | `PiAgentClient` (~202). Client for the Pi-based providers (pi, inception, deepseek, openrouter). `contextCompaction = "request"` (~203). |
| src/backend/muse-client.ts | `MuseAgentClient` (~116). `contextCompaction = "events"` (~117). |
| src/backend/agent/usage-limit-gate.ts | `UsageLimitGate` (~73). The scheduler calls its `mayDrain`, `mayTry`, `tryStarted`, `failed`, `notOffered` and `reached` methods. |
| src/backend/agent/account-usage.ts | `normalizeAccountUsage` (~12). Shapes the rate-limit read result. |
| src/backend/idle-thread-pool.ts | `IdleThreadPool`. The pool of idle Claude threads (claude-client.ts ~707). |
| src/backend/process-confinement.ts | `confineSpawnTarget` (~459), `canConfineProcesses` (~502, returns true only on `darwin`). |
| packages/contracts/src/ipc-agents.ts | `workspaceAccessEnforced(agent)` (~125): true only when `agent.access === "workspace"`. |
| docs/architecture/providers.md (2,028 lines) | Long design notes. Sections: Built-in tool discovery (6), History retrieval (136), Background memory review (180), Idle provider sessions (335), Compaction ownership (379), Model catalog (400), Provider CLI updates (409), OpenCode and ACP (673), Gemini (932), Cursor (1145), Cline (1224), Custom agents (1576), Provider variables (1650), Backup models and failover (1704), Usage read pacing (1733), Usage reset credits (1761), Account sign-in (1823), Pi (1888), Protocol compatibility (1976). |

## How it works

### The adapter contract

- `AgentClient` (src/backend/agent-client.ts, line ~31) is the one interface all clients implement.
- Required members: `provider`, `running`, `start()`, `stop()`, `request(method, params, decoder, timeoutMs?)`, `notify`, `respond`, `respondError`, and event hooks (`notification`, `request`, `diagnostic`, `exit`).
- Optional capability flags decide what the scheduler does:
  - `contextCompaction`: `"events" | "request" | "native" | "handoff" | "unsupported"`.
  - `compactsOnDemand`, `compactsItself`, `turnContext`, `userInputNote`, `imageInput`, `structuredOutput`, `provisionalAnswers`.
  - `releaseThread`, `releaseIdleThreads`, `releaseQuietBackgroundThreads`, `canReleaseProcess`, `holdsBackgroundWork`, `wakesAfterBackgroundWork`, `archiveThread`, `nameThread`.
  - `readSessionSettings`, `setSessionSetting`, `readUsageText`, `callRelayedMcpTool`, `relaysMcpServer`.
- Each client speaks JSON-RPC-like methods. The methods the runtime sends:
  - `initialize`, `account/read`, `account/rateLimits/read`, `model/list`, `plugin/list`.
  - `thread/start`, `thread/resume`, `thread/read`, `thread/compact/start`, `thread/archive`, `thread/delete`, `thread/revert`.
  - `turn/start`, `turn/steer`, `turn/interrupt`.
- The Claude client implements these in its `request` switch (claude-client.ts, ~1099-1190). Unknown methods fail with `Claude adapter does not implement <method>.`
- The ACP client has the same switch (acp-client.ts, ~1221-1401).

### Driver and client creation

- `BUILT_IN_PROVIDER_DRIVERS` (provider-drivers.ts, ~637) has one entry per id in `AGENT_PROVIDERS`. The 18 ids are: codex, claude, grok, opencode, antigravity, cursor, cline, pi, muse, inception, deepseek, openrouter, hermes, acp, kimi, devin, copilot, mistral.
- A driver has: `id`, `signIn`, optional `accounts`, `catalog`, `codeSignIn`, `signOut`, `cliProvider`, `resolveCli()`, `createClient(cli, timeoutMs, context, confinement?)`, optional `createProfileClient` and `createMediaClient`, `authState()`, and `validateAccount()`.
- `ProviderRuntime` calls `requireProviderDriver(provider).createClient(...)` (provider-runtime.ts, ~995).
- Client class per driver (from `new X(` calls in provider-drivers.ts):

| Driver ids | Client class | Notes |
|---|---|---|
| codex | `CodexAppServerClient` (app-server-client.ts) | Own JSON-RPC over stdio. |
| claude | `ClaudeAgentClient` (claude-client.ts) | Claude Agent SDK. |
| pi, inception, deepseek, openrouter | `PiAgentClient` (pi-client.ts) | Inception, DeepSeek and OpenRouter use `cliProvider: "pi"`. |
| muse | `MuseAgentClient` (muse-client.ts) | |
| grok | `GrokAgentClient` (grok-client.ts) | Subclass of `AcpAgentClient`. |
| opencode, antigravity, cursor, cline, kimi, devin, copilot, mistral, hermes | `AcpAgentClient` (acp-client.ts) | Each passes its own `flavor`. |
| acp | `CustomAcpAgentsClient` (custom-acp-agents-client.ts) or `AcpAgentClient` | Flavor from `customAgentFlavor(command)`. |

- ACP flavor per driver: opencode uses `OPENCODE_ACP_FLAVOR`; antigravity uses `ANTIGRAVITY_ACP_FLAVOR`; cursor uses `CURSOR_ACP_FLAVOR`; cline uses `CLINE_ACP_FLAVOR`; kimi uses `KIMI_ACP_FLAVOR`; devin uses `DEVIN_ACP_FLAVOR`; copilot uses `COPILOT_ACP_FLAVOR`; mistral uses `MISTRAL_ACP_FLAVOR`; hermes uses `HERMES_ACP_FLAVOR`.
- Workspace enforcement per provider (`workspaceEnforcement` in packages/contracts/src/agent-providers.ts):
  - `command-sandbox`: codex.
  - `tool-sandbox`: claude only.
  - `confined-process`: all others (grok, opencode, antigravity, cursor, cline, kimi, devin, copilot, mistral, pi, muse, inception, deepseek, openrouter, hermes, acp).

### How a turn runs

1. The user message goes to `DrainScheduler` (agent/drain-scheduler.ts). It sends `turn/start` with `threadId`, `model`, `effort`, `sessionSettings`, `clientUserMessageId`, and optionally `clientTurnId` (added for non-Codex providers after a usage-limit resume or a plan note; drain-scheduler.ts ~1094).
2. `#startTurnEffect` (claude-client.ts ~1778) calls `#threads.startTurn(threadId, () => #openTurn(...))`.
3. The client emits notifications (`item/completed`, `warning`, `codebot/context-compaction`, and others). `TurnLifecycle` (agent/turn-lifecycle.ts) turns them into thread items.
4. A turn ends in `#completeTurn` (claude-client.ts ~2805). It sends `turn/completed`-style notifications.
5. Steering during a turn uses `turn/steer` (Claude `#steerTurnEffect` ~1984; ACP `acp-session-steering.ts`). Stop uses `turn/interrupt`.
6. Claude queries restart on a changed config (`threadConfigKey` compare; `#resumeThread` ~1469 logs `reason: "configuration-change"`).

### Session start and resume

- Claude `thread/start` (`#startThread`, ~1497): new UUID from `randomUUID()`. It passes `sessionId` and `title` to the SDK.
- Claude `thread/resume` (`#resumeThread`, ~1469): the id must be a UUID. Otherwise it fails with `MissingClaudeSessionError` (agent-client.ts). It passes `resume: threadId` to the SDK.
- Claude keeps `#takenPrompts` per thread (~716). A resume skips prompts already in the session file.
- Claude history is read from disk (claude-history.ts), not from the SDK.
- Codex `thread/resume` strips turn context and sets `excludeTurns: true` (app-server-client.ts ~486-492).
- ACP `session/new` (acp-client.ts ~2000), `session/resume` (~2028), `session/load` (~4195). The client uses `resumeSession` or `loadSession` based on the agent's capabilities (~2217).
- Idle sessions: Codex uses `CodexIdleSessions` (agent/codex-idle-sessions.ts). Claude uses an `IdleThreadPool` (claude-client.ts ~707). `releaseIdleThreads()` and `releaseQuietBackgroundThreads()` close sessions that are not busy.

### Slash command data and the init message

- Claude: the SDK sends a `system` message with `subtype: "init"`. The client reads it only to report failed MCP servers (claude-client.ts ~2147). (unverified: whether Claude's slash command list reaches the UI. Searched src/ for `slash_commands` and `slashCommands`: no match.)
- ACP: the agent sends `available_commands_update` (acp-client.ts ~175). It is listed in `SESSION_STATE_UPDATES` with `current_mode_update`, `session_info_update` and `user_message_chunk`.
- A user message that starts with `/command` matches `SLASH_COMMAND` (acp-client.ts ~387). For a slash command the ACP client does not send developer instructions. It also takes no turn-context blocks (`turnContext.take(threadId, true)` returns `[]`, agent/turn-context.ts).

### Developer instructions and turn context

- `developerInstructions(...)` (agent/developer-instructions.ts ~394) builds the system text for a thread. Its inputs come from `DeveloperInstructionOptions` (~line 111). It covers folders, memory, teammates, saved logins, computer use and skills.
- The text is sent as `developerInstructions` in `thread/start` and `thread/resume` params.
- Claude: when `profileGeneration` is false, the text is appended to the `claude_code` preset (`systemPrompt: { type: "preset", preset: "claude_code", append: developerInstructions }`). For profile generation the text replaces the system prompt.
- ACP: the text is prepended to the first prompt inside `<codebot-developer-instructions>...</codebot-developer-instructions>` (acp-client.ts ~2578-2583). It is resent when it changes, after a failed turn, after compaction, and every `ACP_INSTRUCTIONS_REFRESH_PROMPTS` prompts when context usage is unknown (~2573-2576).
- Codex: `thread/start` strips the per-turn blocks (`withoutTurnContextParams`, app-server-client.ts ~986). The blocks are sent as text inputs in front of the user input on `turn/start` (`#wireParams`, ~486-493).
- `TurnContext` (agent/turn-context.ts) keeps "current" and "delivered" values per thread. `take()` returns only the changed blocks. `resend()` sets them back to undelivered (used after compaction, failure, or revert).

### additionalDirectories and folders

- `readThreadConfig` (claude-client.ts ~3581) sets `additionalDirectories = [...new Set([cwd, ...runtimeWorkspaceRoots])]`.
- Claude passes `additionalDirectories` to the SDK options (~1697). In Workspace only mode they also become writable roots in the sandbox (`claudeWorkspaceSandbox(config.additionalDirectories, ...)`, ~1640).
- ACP sends `additionalDirectories` in `session/new`, `session/resume` and `session/load` only when the agent reports `sessionCapabilities.additionalDirectories` (acp-client.ts ~1731-1734). A flavor with `workspaceAsAdditionalDirectory` puts `cwd` first (~1930).
- Folder list for the agent: `workspaceWritableRoots(agent, sharedRoot)` (agent/workspace-sandbox.ts ~54) gives `[workspacePath, sharedRoot, ...existingAgentFolders]`.

### Workspace only mode

- Turned on when `agent.access === "workspace"` (`workspaceAccessEnforced`, packages/contracts/src/ipc-agents.ts ~125).
- `#workspaceOnlyParam` (agent/thread-lifecycle.ts ~1046) sends `workspaceOnly: true` and `excludedFolders` only when the provider's `workspaceEnforcement === "tool-sandbox"`. In practice this is Claude only.
- Claude effects of `workspaceOnly`:
  - Setting sources drop `project` and `local` (claude-client.ts `claudeSettingSources`, ~613). Only `user` is kept.
  - SDK `sandbox` is set by `claudeWorkspaceSandbox`: `enabled: true`, `failIfUnavailable: true`, `autoAllowBashIfSandboxed: true`, `allowUnsandboxedCommands: false`, and `filesystem.allowWrite` = roots plus temp paths. `denyWrite` is set for excluded folders.
  - `canUseTool` denies writes to excluded folders. It asks the user (`#requestWriteApprovalEffect`) for writes outside the roots.
  - A PreToolUse hook (`claudeWorkspaceHooks`) covers `Write|Edit|MultiEdit|NotebookEdit`. It denies excluded folders and returns `ask` for paths outside the roots.
  - Managed settings set `allowManagedHooksOnly: true`.
  - Skills are exposed as local plugins: `claudeWorkspaceSkillPlugin` (workspace `.claude/skills`) and `claudeHomeSkillPlugin` (home skills).
  - Settings files (`.claude/settings.json`, `settings.local.json`) are always writable from the SDK's point of view (`isClaudeSettingsFile`).
  - Temp folders are writable: `workspaceTemporaryPaths()` (agent/workspace-sandbox.ts ~91). On Windows that is `tmpdir()` only.
- For confined-process providers, `workspaceOnly` needs process confinement. `canConfineProcesses()` returns true only on `darwin` (process-confinement.ts ~502). Otherwise `workspaceOnlyUnavailable` blocks the setting (agent-service.ts ~7875, refusal at ~4121-4123). Error text says it is macOS only.
- Codex: `codexSandboxPolicy` (agent/workspace-sandbox.ts ~95) sets `workspace-write` or `danger-full-access`. On Linux, `#checkLinuxSandbox` runs for `workspaceWrite` policies (the call is at app-server-client.ts ~515, the method at ~554).
- Developer instructions tell the model it is in Workspace only (`folderToolsInstruction(workspaceOnly, addedFolders)`, developer-instructions.ts ~69).

### Context compaction

- Each client declares a mode. `fixedContextCompaction` (agent-client.ts) sets Claude to `"native"` and custom ACP to `"unsupported"`.
- Modes (src/backend/agent/context-compaction.ts):
  - `"events"`: Codex. Compaction arrives as turn events (`contextCompaction` item or `thread/compacted`). Codex sets this in `app-server-client.ts` line ~109.
  - `"request"`: the compaction is one request (`thread/compact/start` with `runsInRequest`, ~517-534).
  - `"native"` plus `compactsOnDemand`: Claude. The scheduler asks the SDK to compact (`thread/compact/start` with `threadId`). Claude also sets `CLAUDE_CODE_AUTO_COMPACT_WINDOW` when `claudeCompactWindow()` returns a value (provider-drivers.ts `claudeAgentEnvironment`, ~496).
  - `"handoff"`: OpenCode and Antigravity flavors. The session is closed and a new one starts on the same thread with a history handoff (context-compaction.ts ~471, ~510). The session method is `ThreadLifecycle.rotateProviderSession` (thread-lifecycle.ts ~1413).
  - `"unsupported"`: other ACP clients. No compaction request is sent.
- `compactsOnRequest(mode)` (context-compaction.ts ~96) is true for `events`, `request`, and `handoff`. `compactsWhenAsked` (~108) adds Claude, which is `native` with `compactsOnDemand = true` (claude-client.ts ~681).
- The scheduler stores the mode per provider (`#compactionModes`, provider-runtime.ts ~383; `lastCompactionMode`, ~2530).
- Codex keeps an 80% threshold on its last reported token usage and window size (turn-lifecycle.ts ~1611-1612; docs/architecture/providers.md ~379-395).
- Pi uses `request` (pi-client.ts ~203). Muse uses `events` (muse-client.ts ~117).

### Usage limits and account pool

- Claude usage: `#readUsageEffect` (claude-client.ts ~1320) calls the SDK's `usage_EXPERIMENTAL_MAY_CHANGE_DO_NOT_RELY_ON_THIS_API_YET` method. It converts the result with `claudeRateLimits` (~3477): a 5-hour window (300 minutes) and a weekly window (10,080 minutes).
- Weekly window key: `claudeWeeklyKey` (~3491). It picks `seven_day_opus` or `seven_day_sonnet` when the model name matches and that window exists. Otherwise it uses `seven_day`.
- Claude also gets rate-limit pushes (`claudePushedWindows`, ~3500).
- Provider runtime: `account/rateLimits/read` is sent from provider-runtime.ts (~4550). `normalizeAccountUsage` (agent/account-usage.ts ~12) shapes the result. It is called at provider-runtime.ts ~1043-1055. A refresh guard (`#usageLimitRefreshes`, ~356 and ~2965) stops parallel refreshes.
- Usage-limit gate in the scheduler: the `UsageLimitGate` class (agent/usage-limit-gate.ts ~73) is used by `DrainScheduler` (drain-scheduler.ts ~174, ~427, ~764, ~1243). A provider with a known reset time is paused until then. Work resumes with `resumeAfterUsageLimit` (drain-scheduler.ts ~967, ~1335).
- Account pool: `pickPoolAccount` (agent/provider-account-pool.ts ~40) skips an account when a window is nearly full. The buffer is 15% for windows of 24 hours or less, 5% for longer windows, and 10% when the length is unknown. A window past its reset counts as 0% used.
- Cursor usage: `readCursorUsage` (cursor-usage.ts ~230). OpenCode: `readOpenCodeGoUsage` (opencode-usage.ts ~58). Antigravity: `readAntigravityQuota` (antigravity-usage.ts ~110). Each is a separate reader.

### Claude auth and environment

- `claudeAgentEnvironment` (provider-drivers.ts ~496): sets `ENABLE_PROMPT_CACHING_1H=1` when the cache TTL is `1h`. Sets `CLAUDE_CODE_AUTO_COMPACT_WINDOW` when a compact window is set. Adds account and provider env.
- `claudeFallbackApiKey` (~513): uses the Claude key from the key store only when there is no account environment, and no own `ANTHROPIC_API_KEY` or `ANTHROPIC_AUTH_TOKEN` variable.
- `#readAuthStatusEffect` (claude-client.ts ~1405) and `readClaudeStoredSignIn` (claude-stored-sign-in.ts ~215) decide the sign-in state. A settings file with `apiKeyHelper` or auth env overrides the stored login.

### Gemini

- There is no Gemini provider id. `AGENT_PROVIDERS` has no `gemini`.
- Gemini error text is matched inside the Antigravity flavor (acp-flavor-antigravity.ts, `GEMINI_*` regexes, ~9-25).
- `geminiCliSessionNotFound` (acp-flavor.ts ~531) is used by `customSessionNotFound` for custom ACP agents.

## How to change it

1. Add a new ACP CLI provider (recipe, unverified as a full checklist):
   - Add the id to `AGENT_PROVIDERS` (packages/contracts/src/agent-providers.ts line ~7) and a descriptor with `workspaceEnforcement`, `homeSkills` and `signInPageEnd`.
   - Add a flavor constant in src/backend/acp-flavor.ts (or a new `acp-flavor-<name>.ts`). Copy an existing one such as `CLINE_ACP_FLAVOR`.
   - Add a `BuiltInProviderDriver` entry to `BUILT_IN_PROVIDER_DRIVERS` (src/backend/provider-drivers.ts ~637). Its `createClient` returns `new AcpAgentClient(cli, timeout, { flavor, ... })`.
   - Search for an existing id such as `mistral` to find every other place that lists provider ids (unverified: the full list was not traced).
   - Run `bun run test:acp-flavors` and `bun run test:acp-directories` after the change (scripts exist; not run here).

2. Add a per-CLI quirk to ACP:
   - Add an optional field to `AcpFlavor` (acp-flavor.ts ~58). Set it in the flavor constant.
   - Read it in `AcpAgentClient` (acp-client.ts) through `this.#flavor.<field>`.

3. Change what Claude's Workspace only mode allows:
   - Sandbox settings: `claudeWorkspaceSandbox` (claude-workspace-sandbox.ts ~14).
   - Write rules: `claudeWriteOutsideRoots` and `claudeWriteInExcluded` (same file, ~132 and ~155). Edit `WRITE_TOOLS` (~96) to add write tools.
   - Hook behaviour: `claudeWorkspaceHooks` (~98).
   - Roots and temp paths: `writableRoots` (same file) and `workspaceTemporaryPaths` (agent/workspace-sandbox.ts ~91).
   - Run `bun run test:claude-turn-context` or the `claude` tests that cover the sandbox (unverified which script covers it).

4. Add or change a Claude SDK query option:
   - Edit the options object in `#startThread` (claude-client.ts ~1497-1720). Settings: `settingSources` (~1628, ~1692), `sandbox` (~1640), `additionalDirectories` (~1697), `hooks` and `managedSettings` (~1706-1708), `plugins` (~1712), `mcpServers` (~1713).
   - Add config fields to `ThreadConfig` (~352) and read them in `readThreadConfig` (~3581). Also add them to `threadConfigKey` if a change must restart the query.

5. Change the context a turn sends (memory, teammates, saved logins, instructions file, style reminder):
   - Add a field to `TurnContext` (agent/turn-context.ts): the `set`, `take`, and `resend` methods.
   - Build the text in agent/developer-instructions.ts. Add the option to `DeveloperInstructionOptions`.
   - For Codex, the block is stripped by `withoutTurnContextParams` (app-server-client.ts ~986). Add the key there.

6. Change a provider's compaction mode:
   - Set `contextCompaction` on the client class (Codex: app-server-client.ts line ~109) or on the flavor (`contextCompaction: "handoff"`, acp-flavor.ts ~177).
   - Check `compactsOnRequest` (agent/context-compaction.ts ~96) for the scheduler behaviour.

7. Add a usage reader for a provider:
   - Handle `account/rateLimits/read` in the client's `request` switch. Return `AccountRateLimitsReadResult` (`rateLimits` with `primary` and `secondary` windows).
   - Check how provider-runtime.ts sends the read (~4552) and how `normalizeAccountUsage` (agent/account-usage.ts ~12) shapes it, and how `pickPoolAccount` uses it (agent/provider-account-pool.ts).

8. Change session resume rules:
   - Claude: `#resumeThread` (claude-client.ts ~1469) and the `thread/resume` case (~1131). Keep the UUID check.
   - ACP: session create and resume code in `acp-client.ts` (~1925-2070). Keep the `restore` object in sync (~2068).

## Gotchas

- Claude `thread/resume` fails on any id that is not a UUID (`MissingClaudeSessionError`). Do not change how ids are made without checking this.
- Codex `thread/start` does not carry turn-context params. They are sent on `turn/start`. A change to one side can drop context silently.
- Slash commands skip turn-context blocks and skip developer instructions in ACP. Adding a new block means checking the `command` flag in `TurnContext.take`.
- ACP developer instructions are resent only when they change or after a failure or compaction. If you change how they are built, check that the resend rule still fires.
- Claude's `workspaceOnly` removes `project` and `local` setting sources. Repo `.claude/settings*.json` is then ignored. Skills in the workspace are added back through a plugin (`claudeWorkspaceSkillPlugin`).
- Claude's write hook only covers `Write`, `Edit`, `MultiEdit` and `NotebookEdit`. A shell command is limited by the SDK sandbox, not by the hook. The sandbox uses `failIfUnavailable: true`, so a machine without the sandbox fails the turn. (unverified: sandbox behaviour on Linux and Windows.)
- `CLAUDE_SANDBOX_BLOCKED` (claude-client.ts ~3304) matches sandbox start errors (bwrap, seccomp, unshare). A match adds one warning per turn.
- Non-Claude providers cannot use Workspace only unless process confinement works. `canConfineProcesses()` returns true only on `darwin`. The UI and `agent-service.ts` block the setting elsewhere.
- Claude usage uses the SDK's experimental usage API (its name starts with `usage_EXPERIMENTAL_MAY_CHANGE_DO_NOT_RELY_ON_THIS_API_YET`). It may change with an SDK update. (unverified: stability)
- Claude's weekly usage key depends on the model name (`opus` or `sonnet` in the name). A model name that does not match uses `seven_day`.
- `claudeFallbackApiKey` returns nothing when an account environment is set. A key in the key store is then not used as a fallback.
- ACP `additionalDirectories` is sent only when the agent reports the capability. Otherwise the extra folders are not passed to the agent. Check `sessionCapabilities.additionalDirectories` first.
- `TurnContext.resend` runs after compaction, after a failed turn and after revert. Forgetting it leaves the model without rules after those events.
- Gemini has no provider id of its own. Its error patterns live in the Antigravity flavor. Do not add a `gemini` id without checking those patterns.
- Pi-based providers (inception, deepseek, openrouter) share `PiAgentClient` through `cliProvider: "pi"`. A change to Pi affects all of them.
- `docs/architecture/providers.md` is long (2,028 lines). Its compaction and usage sections match the code, but check the code before you rely on any single claim.
- Unverified items (not confirmed in code):
  - Whether Claude's init-message slash command list reaches the UI (only the MCP failure read was found).
  - The purpose of Grok's three `GrokAgentClient` creation branches (provider-drivers.ts ~816-846).
  - Sandbox behaviour on Linux and Windows for Claude.
  - Full list of places that must change for a new provider id.
  - Details of `provider-accounts.ts`, `provider-account-store.ts`, `acp-configuration.ts` and most of `provider-runtime.ts` (sampled only).
