# Contracts, preload and preview mock

Map for coding agents. All paths are relative to the repo root `CodeBot/` unless they start with `packages/`, `src/` or `scripts/` (those are also repo-relative). Items marked **(unverified)** were not confirmed in code.

## What this area is

- `packages/contracts` (`@codebot/contracts`) holds the IPC endpoint table, the IPC payload types, the Team API wire protocol (versions 1 to 10), and the runtime decoders for shared values.
- `src/preload` is the only code with both `ipcRenderer` and renderer access. Its `index.ts` builds `window.codebot` from `IPC_ENDPOINTS`.
- `src/renderer/src/preview` holds the mock that replaces `window.codebot` in the preview, the Storybook stories and the web bench. The mock is a second implementation of `CodeBotDesktopApi`.
- Contracts are frozen where a shipped build or a remote host speaks them. Read `packages/contracts/AGENTS.md` before any change to a `team-protocol` file.

## Key files

| Path | What it owns |
| --- | --- |
| `packages/contracts/src/ipc-endpoints.ts` | `IPC_ENDPOINTS` (every endpoint), `IPC_GROUP_PATHS` (place of each group on `window.codebot`), endpoint helpers (`request`, `scopedRequest`, `scopedQuery`, `event`, `untypedRequest`), and the typed API helpers (`Invoke`, `Subscribe`, `GroupApi`, `PathApi`, `BridgedDesktopApi`). 2245 lines. |
| `packages/contracts/src/ipc.ts` | Barrel. `export * from` every `ipc-*.ts`, `agent-providers`, `ui-blocks` and some others. Subpath `@codebot/contracts/ipc` points here. |
| `packages/contracts/src/ipc-desktop-apis.ts` | `CodeBotDesktopApi` (the type of `window.codebot`), plus named group types (`AgentDesktopApi`, `ServersDesktopApi`, `BrowserDesktopApi`, and many `*DesktopApi` aliases). |
| `packages/contracts/src/ipc-decoding.ts` | Generic contract helpers: `decodeRecord`, `requiredString`, `requiredNumber`, `requiredBoolean`, `nullableString`, `nullableNumber`, `nullableBoolean`, `decodeList`, `guardedDecoder`, `guardedListDecoder`, `emptyDecoder`, `optionalHistoryExtent`. |
| `packages/contracts/src/runtime-values.ts` | Type guards: `isString`, `isNumber`, `isBoolean`, `isDynamicRecord`, `isOneOf`, `isHttpsUrl`, `isFunction`, `DynamicRecord`. |
| `packages/contracts/src/ipc-agent-events.ts` | `AgentIpcRequest<T>` (`{ serverId, payload }`), `ScopedAgentEvent` (`{ serverId, event, bufferedLive? }`). |
| `packages/contracts/src/ipc-events.ts` | Types for the `events` group (webhook routines, activity, secrets). |
| `packages/contracts/src/ipc-team-host.ts` | Server types: `LOCAL_SERVER_ID` (`"local"`), `LOCAL_SERVER_LIMIT` (5), `TeamRole`, `ServerConnectionState`, `ServerCompatibility`, `ServerNotificationLevel`, presence and direct-message realtime types. |
| `packages/contracts/src/ipc-workflow-format.ts` | Workflow format rules. `WORKFLOW_FORMAT_RULES` (line 46) and the format number a graph needs. |
| `packages/contracts/src/ipc-*.ts` (117 files) | One file per IPC domain: payload and result types. Example: `ipc-agent-admin.ts`, `ipc-crm.ts`, `ipc-workflows.ts`. |
| `packages/contracts/src/team-api-routes.ts` | `TEAM_API_ROUTES` (HTTP paths of the Team API, such as `/v1/compatibility`), `WORKSPACE_FILE_EXACT_PATH_QUERY`. |
| `packages/contracts/src/team-protocol/current.ts` | `TEAM_CAPABILITY_REGISTRY` (one row per capability, with its `since` version and `bootstrap` flag), capability helpers, `TEAM_WEB_CLIENT_PROTOCOL`, `TEAM_WEBRTC_CLIENT_PROTOCOL`, `supportsTeamCapability`, `expandTeamCapabilitiesV10`. 1056 lines. |
| `packages/contracts/src/team-protocol/capability-limits.ts` | `TEAM_PROTOCOL_CAPABILITY_LIMITS` (max capability list length per protocol) and `teamProtocolCapabilityLimit()`. |
| `packages/contracts/src/team-protocol/http-codecs.ts` | `teamHttpCodec(protocol)`: picks the codec for a protocol number. |
| `packages/contracts/src/team-protocol/v1.ts` ... `v10.ts` | One protocol per file (constants, capability list, decoders). `v10.ts` holds the absent-list logic. |
| `packages/contracts/src/team-protocol/v<N>-adapter.ts`, `v<N>-base*.ts`, `v<N>-webrtc-adapter.ts` | Request and response codecs per protocol, and WebRTC variants. Older files have `-base` variants. |
| `packages/contracts/src/team-protocol/provider-aware-codec.ts` | Shared codec for protocols 7 and later. Header names, `OPEN_PROVIDER_ID`, `decodeTeamProtocolSupportProviderAware`, `highestCommonTeamProtocol`. |
| `packages/contracts/src/team-protocol/fixtures/` | Frozen wire samples per protocol (`v1` ... `v10`, plus feature folders). Read by hand. |
| `packages/contracts/src/signal-protocol/` (11 files) | Signal and ingress protocol types (Discord, GitHub, Slack, Telegram, webhook routes). |
| `packages/contracts/package.json` | Explicit `exports` map (about 380 subpath entries). No wildcard. |
| `src/preload/index.ts` (1762 lines) | Builds `codebotApi: CodeBotDesktopApi`, calls `bridgeGroup`, and runs `contextBridge.exposeInMainWorld("codebot", codebotApi)` (line 1762). Also holds the hand-written groups. |
| `src/preload/bridge-group.test.ts` | Tests `bridgeGroup`: one input at most, server scoping, decode failure, event unsubscribe, dropped deep-link events. |
| `src/preload/*-decoding.ts` (about 20 files) | Preload decoders (`FromMain`). Example: `team-decoding.ts` (23 exported decoders), `app-decoding.ts` (also holds `decodeVoid`, line 736). |
| `src/preload/team-webrtc.ts` | Takes the one `MessagePort` for the hidden WebRTC window and forwards it with `window.postMessage`. |
| `src/preload/browser-page.ts` | Preload for browser tabs. No IPC. Runs one function in the page world with `contextBridge.executeInMainWorld` (line 313). Exposes no `window.codebot`. |
| `src/preload/AGENTS.md` | Rules for the preload. Read first. |
| `src/renderer/src/preview/mock-codebot.ts` (3995 lines) | `createMockCodeBot(options)` (line 473). Returns `MockCodeBotControls` with `.api: CodeBotDesktopApi`. Typed at line 1335. |
| `src/renderer/src/preview/mock-*.ts` (39 files) | One module per domain. `mock-team.ts` (`createMockTeam`, 578 lines) owns `servers`, `host`, `remoteDesktop`, presence and direct messages. |
| `src/renderer/src/preview/mock-support.ts` | Shared mock helpers used by `mock-codebot.ts` (`clone`, `Listener`, `MockRuntime`, `matchesQuery`). |
| `src/renderer/src/preview/CodeBotPlayground.tsx` | Sets `window.codebot = mock.api` (lines 35 to 38) and restores the old value on unmount (line 103). |
| `src/renderer/src/preview/mock-web-runtime.ts`, `bench-web-runtime.ts` | Use `createMockCodeBot()` for the web client and the bench. |
| `src/renderer/src/preview/fixtures.ts`, `landing-fixtures.ts`, `agent-template-fixtures.ts` | Seed data for the mock. |
| `src/renderer/AGENTS.md` | Covers `preview/` (no separate AGENTS file exists there). |
| `src/main/ipc-channel-coverage.test.ts` | Checks the endpoint table against main and preload: wire values unique, each request invoked, each event subscribed, twin decoders match. |
| `src/main/ipc/define-ipc-group.ts` | Main-side `registerIpcGroups`. Each group needs one handler object. |
| `scripts/verify-preload-bundle.ts` | Runs the built preload and compares `window.codebot` with `IPC_ENDPOINTS`. `HAND_WRITTEN_METHODS` (line 14) lists allowed hand-written methods. |

## How it works

### 1. Endpoints are declared once

- `IPC_ENDPOINTS` (`ipc-endpoints.ts`, line 787) is an object of groups. Each group is an object of endpoints. There are 66 groups (keys of `IPC_GROUP_PATHS`) and 939 endpoints.
- Endpoint kinds (grep count):

| Helper | Kind | Count | Wire shape |
| --- | --- | --- | --- |
| `request<Payload, Result>()` | request, no server scope | 423 | `request` in `ipc-endpoints.ts` line 761 |
| `scopedRequest<Input, Result, Server?>()` | request, server in payload | part of 452 | `scope: "payload"` (line 767) |
| `scopedQuery<Result, Server?>()` | request, server only | part of 452 | `scope: "empty"` (line 773) |
| `event<Payload>()` | main to renderer event | 63 | line 779 |
| `untypedRequest(channel)` | untyped (only `browserInput.sendLiveViewInput`) | 1 | line 783 |

- Wire values are strings such as `"agent:get-status"`, `"agent:session-settings:read"`, `"servers:list"`, `"app:set-provider-on"`. The prefix is often not the group name. Example: the `providers` group uses `app:` prefixes, and `agent.getHostAnalytics` uses `host:get-analytics`. Do not infer the group from the wire value.
- Event wire values are the same kind of string (`"agent:attachment-import-progress"`).
- `Untyped` (line 726) is a branded type. `Invoke` returns `never` for it, so the bridge does not expose a typed method.
- `request` has a type constraint: the channel must not be used with an `AgentIpcRequest` payload. Use `scopedRequest` for those.

### 2. Groups become `window.codebot` paths

- `IPC_GROUP_PATHS` (line 2119) maps each group to a place on `window.codebot`:
  - `""` for top level (`app`, `providers`).
  - A named key (`voice`, `browser`, `crm`, `billing`, ...).
  - A shared path. Twelve groups map to `"agent"`: `agent`, `agentMemories`, `sharedTables`, `agentRoutines`, `channelMemories`, `channelRoutines`, `channelFolders`, `agentAttachments`, `agentFolders`, `agentInstructions`, `agentAdmin`, `mcpServers`. `browser` and `browserInput` both map to `"browser"`.
  - `null` for a group the page must not reach: `attachmentImports`.
- `IPC_GROUP_PATHS` is `as const satisfies` each group name. A new group must have a key here.
- `BridgedDesktopApi` (line 2241) = `PathApi<"">` plus one nested type per non-empty path. `PathApi` merges the `GroupApi`s of all groups at that path (`UnionToIntersection`).
- `GroupApi<Group>` (line 2219) turns each endpoint into a method. Request key `k` becomes method `k`. Event key `k` becomes method `onK` (`groupApiMethodName`, line 2243).
- `Invoke<Endpoint>` (line 2203): a scoped request takes the payload (if any) then an optional or required `serverId`. `Subscribe<Endpoint>` (line 2212) takes a listener and returns an unsubscribe function.
- `CodeBotDesktopApi` (`ipc-desktop-apis.ts`, line 82) = `Omit<BridgedDesktopApi, "agent" | "browser" | "servers">` plus `agent: AgentDesktopApi`, `browser: BrowserDesktopApi`, `servers: ServersDesktopApi`.
- `AgentDesktopApi` (line 8) adds hand-written methods on top of `PathApi<"agent">`: `addDroppedAgentFolder`, `onAttachmentImport`, `retryAttachmentImport`, `discardAttachmentImport`, `onEvent`.
- `ServersDesktopApi` (line 38) adds `onPresence`, `onDirectMessage`, `onDirectTyping`. `onPresence` takes an optional server id. `onDirectMessage` and `onDirectTyping` take only a listener.
- `BrowserDesktopApi` (line 20) adds `sendLiveViewInput`.

### 3. The preload bridge

`src/preload/index.ts` builds the API. Key pieces:

| Name | Line | Role |
| --- | --- | --- |
| `chatWindowServerId`, `selectedServerId` | about 423 to 428 | Server the preload sends by default. A chat window pins its server with `?window=chat&server=...`. |
| `invokeAgentForServer(serverId, endpoint, payload, decode)` | 429 | Hand-written invoke for a server-scoped payload. Sends `{ serverId, payload }`. |
| `listen(endpoint, onValue)` | 439 | Hand-written subscribe. Calls `ipcRenderer.on`; returns an unsubscribe. Always use this, not `ipcRenderer.on`. |
| `dropInvalid(decode)` | 449 | Wraps an event decoder that returns `null` for a value to drop (used for deep-link ids). |
| `bridgeGroup(group, decoders)` | 467 (overload), 471 (body) | Builds a method for every endpoint in a group. Throws if a decoder is missing or extra. |
| `scopedRequest(scope, args)` | 501 | Builds the `AgentIpcRequest`. For `"empty"`, `args[0]` is the server. For `"payload"`, `args[0]` is the payload and `args[1]` is the server. Falls back to `selectedServerId`. |
| `rememberActiveServer(servers)` | 506 | Updates `selectedServerId` from a server list. |
| `agentGroup`, `agentFoldersGroup`, `serversGroup` | 629, 729, 740 | Groups bridged into a const so some methods can read or set preload state. |
| `codebotApi: CodeBotDesktopApi` | 784 | The object exposed to the page. Spreads or assigns each bridged group. |
| `browser.sendLiveViewInput` | 1641 | Hand-written. Calls `ipcRenderer.invoke` on `IPC_ENDPOINTS.browserInput.sendLiveViewInput.channel`, then `decodeVoid`. |
| `contextBridge.exposeInMainWorld("codebot", codebotApi)` | 1762 | The only exposure. |

`bridgeGroup` details (from the code):

- A request method forwards only its first argument: `ipcRenderer.invoke(channel, ...args.slice(0, 1))`. Extra arguments are dropped.
- A scoped request sends `scopedRequest(scope, args)` instead of the raw args.
- A request decoder must be a function. A request cannot use a dropping decoder.
- An event method calls `listen`, then decodes each value. A `DroppingDecoder` (`{ drop }`) skips a `null` result.
- Duplicate method names throw (`two methods named`). Missing decoders throw (`no decoder for`).

Hand-written groups or methods (`HAND_WRITTEN_METHODS` in `scripts/verify-preload-bundle.ts`, line 14, lists only the four `agent` and three `servers` methods below; `attachmentImports` and `browserInput.sendLiveViewInput` are not in it):

- `attachmentImports` (group `null`): `importAttachments` (scoped), `importProgress` (event). Only the preload calls it, with dropped file paths.
- `agent.onAttachmentImport`, `agent.retryAttachmentImport`, `agent.discardAttachmentImport`, `agent.addDroppedAgentFolder` (all `null`).
- `agent.onEvent` maps to `IPC_ENDPOINTS.agent.scopedEvent`.
- `servers.onPresence` maps to `scopedPresence`. `servers.onDirectMessage` maps to `scopedDirectMessage`. `servers.onDirectTyping` maps to `scopedDirectTyping`.
- `browserInput.sendLiveViewInput` (untyped).

### 4. Decoders

- Each value from main is decoded in the preload before the page reads it. The decoders are `FromMain` functions in `src/preload/*-decoding.ts`. There are about 270 exported `decode*` functions across `src/preload/` (grep count).
- Helpers come from `@codebot/contracts/ipc-decoding` and `@codebot/contracts/runtime-values`. Fifteen preload files import them (grep count).
- Main-side decoders are `FromHost`. The preload and main sides are kept apart on purpose. A test in `src/main/ipc-channel-coverage.test.ts` (test "gives every FromHost decoder a FromMain twin, and the reverse", near line 198) checks that each main `FromHost` decoder has a `FromMain` twin with the same name pattern.
- `decodeVoid` (`app-decoding.ts` line 736) accepts only `undefined` or `null`. Use it for void results.
- `bridgeGroup` requires one decoder for each endpoint. A missing key is a type error (`TS2741`). An extra key is `TS2353`.

### 4a. Main-side binding

- Each IPC group has one registrar, `registerIpcGroups` in `src/main/ipc/define-ipc-group.ts` (line 100). It takes one handler object per group.
- The binding rules are in `src/main/ipc/AGENTS.md`: "The five ways to bind a handler" (line 35) and "What is enforced, and by what" (line 58).
- The wire value of an endpoint must match on both sides. `src/main/ipc-channel-coverage.test.ts` checks this, so a new endpoint needs its main handler in the same change.

### 5. Preview mock

- `createMockCodeBot(options)` (`mock-codebot.ts` line 473) returns `MockCodeBotControls`. It holds the field `api: CodeBotDesktopApi` (line 381; the object literal is at line 1335), emit helpers (for example `emitPresence`, `emitDirectMessage`, `emitHostStatus`, `emitRemoteDesktopSessions`, around lines 3972 to 3978), and sent-message records (`MockSentMessage`, line 319).
- The mock object literal assigns each group. Some groups are spread from a mock module. Examples: `servers: mockTeam.servers` (line 3672), `host: mockTeam.host` (3688), `remoteDesktop: mockTeam.remoteDesktop` (3943), `browser: mockBrowser.browser` (3596), `voice: mockVoice.voice` (1704).
- The mock is type-checked against `CodeBotDesktopApi`. Type checks do not test behaviour. A method that returns an empty value compiles and shows nothing in a story.
- Users of the mock: `CodeBotPlayground.tsx` (preview page), `mock-web-runtime.ts` (web client), `bench-web-runtime.ts` (bench), and Storybook stories (`src/renderer/stories/*.stories.tsx`). The `.storybook/` config does not import the mock.

### 6. Team API protocol

Versions and their shape:

| Protocol | Own files (under `packages/contracts/src/team-protocol/`) | WebSocket constant | Capability limit |
| --- | --- | --- | --- |
| 1 | `v1.ts`, `v1-adapter.ts` | `codebot-team-v1` (`v1.ts` line 8) | 64 |
| 2 | `v2.ts` (re-exports `webrtc-framing.ts`), `v2-adapter.ts` (WebRTC frames). No HTTP codec: `teamHttpCodec` returns `V1_CODEC` for 1 and 2 | none (framing names are in `webrtc-framing.ts`) | 64 |
| 3 | `v3.ts`, `v3-adapter.ts`, `v3-webrtc-adapter.ts` | none found | 64 |
| 4 | `v4.ts`, `v4-base.ts`, `v4-base-adapter.ts`, `v4-adapter.ts`, `v4-webrtc-adapter.ts` | `codebot-team-v4` (`v4-base.ts` line 28) | 64 |
| 5 | `v5.ts`, `v5-base.ts`, `v5-base-adapter.ts`, `v5-adapter.ts`, `v5-webrtc-adapter.ts` | `codebot-team-v5` | 64 |
| 6 | `v6.ts`, `v6-base.ts`, `v6-base-adapter.ts`, `v6-adapter.ts`, `v6-webrtc-adapter.ts` | `codebot-team-v6` | 64 |
| 7 | `v7.ts`, `v7-base.ts`, `v7-base-adapter.ts`, `v7-adapter.ts`, `v7-webrtc-adapter.ts` | `codebot-team-v7` | 128 |
| 8 | `v8.ts`, `v8-base.ts`, `v8-base-adapter.ts`, `v8-adapter.ts`, `v8-webrtc-adapter.ts` | `codebot-team-v8` | 128 |
| 9 | `v9.ts`, `v9-webrtc-adapter.ts` (no `v9-adapter.ts`) | none found | 256 |
| 10 | `v10.ts`, `v10-webrtc-adapter.ts` | none found | 256 |

- Limits come from `TEAM_PROTOCOL_CAPABILITY_LIMITS` (`capability-limits.ts`). The `teamProtocolCapabilityLimit(protocol)` helper picks the highest entry at or below the protocol.
- `teamHttpCodec(protocol)` (`http-codecs.ts` line 186) returns V10, V9, V8, V7, V6, V5, V4, V3 codecs for their numbers and `V1_CODEC` for all other values.
- Application SemVer is not a protocol number. `TEAM_APP_VERSION_HEADER` is diagnostic only.
- Headers (`provider-aware-codec.ts` lines 39 to 41): `CodeBot-Protocol-Version`, `CodeBot-App-Version`, `CodeBot-Capabilities`. Protocol 10 adds `CodeBot-Absent-Capabilities` (`v10.ts` line 10).

Capabilities:

- `TEAM_CAPABILITY_REGISTRY` (`current.ts`, starts at line 566, ends about line 880) is the single table. Each row is `[capabilityName, placement]`. Placement is `{ since, bootstrap }`. Shared constants: `ALL_BOOTSTRAP`, `ALL`, `V7`, `V7_BOOTSTRAP`, `V8`, `V9`, `V9_BOOTSTRAP`, `V10` (lines 557 to 564). About 312 rows (grep count). About 56 are `V10` rows (grep count).
- Each capability has a named constant (for example `TEAM_SEMANTIC_TAGS_CAPABILITY`, `TEAM_QUEUE_WINDOW_CAPABILITY`, `MCP_ACCOUNTS_CAPABILITY`) that is exported from `current.ts` or the matching `team-protocol` file.
- Helpers in `current.ts`:
  - `TEAM_CURRENT_CAPABILITIES` (line 881): all names.
  - `TEAM_BOOTSTRAP_CAPABILITIES` (line 941): rows with `bootstrap: true`.
  - `TEAM_PROTOCOL_V9_ONLY_CAPABILITIES` (line 942).
  - `TEAM_PROTOCOL_V10_BASELINE_CAPABILITIES` (line 947): rows with `since <= 9`. This is the frozen baseline. `fixtures/v10/baseline-capabilities.json` is its saved copy.
  - `teamCapabilitiesForProtocol(protocol)` (line 965): protocols below 7 get the bootstrap list.
  - `teamCapabilitiesVisibleToProtocol(capabilities, protocol)` (line 971).
  - `supportsTeamCapability(...)` (line 979): check one name on the full set.
  - `expandTeamCapabilitiesV10(lists)` (line 986): `(baseline - absent) + capabilities`.
  - `encodeTeamCapabilitiesV10(capabilities)` (line 996).
  - `teamCapabilityHeaders` (line 1007), `teamCapabilityLists` (line 1018), `decodeTeamProtocolSupportExpanded` (line 1028), `readTeamHostCompatibility` (line 1038).
- Protocol 10 wire rule (`v10.ts`): a protocol 10 peer sends `capabilities` (names after protocol 9, plus markers) and `absent` (baseline names it does not serve). `readTeamCapabilitiesV10` rejects lists over the limit (256) and names that do not match `^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$` with length 64 or less.
- `TEAM_CAPABILITY_BASELINE_CAPABILITY` = `"capability-baseline-v1"` (`v10.ts` line 9).
- Client protocol ranges (`current.ts` lines 949 to 956):
  - `TEAM_WEBRTC_CLIENT_PROTOCOL`: minimum V3, maximum V9.
  - `TEAM_WEB_CLIENT_PROTOCOL`: minimum V3, maximum V10.
  - `packages/team-client/src/remote-peer.ts` line 549 uses `TEAM_WEBRTC_CLIENT_PROTOCOL` as the default client protocol. The reason for V9 as the WebRTC maximum is **(unverified)**.
- Negotiation: `highestCommonTeamProtocol` (`provider-aware-codec.ts` line 1091) and `teamWebRtcClientProtocol` (`current.ts` line 958). `teamProtocolUpdateDirection` (`provider-aware-codec.ts` line 1100) says which side must update.

Providers:

- From protocol 8, provider ids and auth kinds are open (`OPEN_PROVIDER_ID`, `provider-aware-codec.ts` line 37). A new provider needs no new protocol.
- Main-side `FROZEN_PROVIDERS` in `src/main/team-api/provider-visibility.ts` lists the providers each frozen protocol (1 to 7) knows. `isPeerHiddenProvider` clamps the protocol to 8 with `Math.min`.

Routes:

- `TEAM_API_ROUTES` (`team-api-routes.ts` line 9) has the HTTP paths: `compatibility`, `identity`, `events`, `me`, `attachments`, `sharedFiles`, `workspaceFiles`, `join.*`, `auth.*`, `host.*`, `team.*`, and more (23 top-level keys by grep count).
- Route matchers in `current.ts` (lines 900 to 940): `isConversationUnreadRoute`, `isQueueSnapshotRoute`, `isConversationRoute`, `isAgentProfileRoute`, `isAgentAnalyticsRoute`, `isHostAnalyticsRoute`, `isAgentCreateRoute`, `isAgentMessageRoute`.
- Main-side route handlers are in `src/main/team-api/route-*.ts` (many files). `src/main/team-api-server.ts` imports team-protocol capability constants from `@codebot/contracts/team-protocol/<name>` subpaths. Its routes were not read **(unverified)**.

Fixtures:

- `packages/contracts/src/team-protocol/fixtures/` holds JSON samples for `v1` through `v10` and feature folders (`agent-task-ui-blocks-v1`, `channel-attention-v1`, `channel-isolation-v1`, `channel-picture-v1`, `context-usage-v1`, `quiet-turn-v1`). `decoder-edge-cases.json` is used by `scripts/team-protocol-decoder-e2e.ts`.
- No `*.test.ts` file under `packages/contracts/src` or `src` references `fixtures/` (grep). The `AGENTS.md` rule that fixtures are compared by hand is consistent with this.

Workflow format:

- A workflow that an older CodeBot cannot run gets `WORKFLOW_FORMAT`. Rules are in `WORKFLOW_FORMAT_RULES` (`packages/contracts/src/ipc-workflow-format.ts` line 46). The format number is the highest `since` of the rules the graph uses (line 55). Step data goes in `fields`, not in a new node or edge property (`packages/contracts/AGENTS.md`).

## How to change it

Run the checks listed at the end of each recipe. Do not run them from this map; they are listed for the implementer.

### A. Add a request or event to a bridged group

A bridged group is one whose methods all pass straight through (`bridgeGroup(IPC_ENDPOINTS.<group>, {...})` in `src/preload/index.ts`).

1. Payload and result types: add them to the domain file `packages/contracts/src/ipc-<domain>.ts`. If the file is new, add `export * from "./ipc-<domain>";` to `packages/contracts/src/ipc.ts`.
2. Endpoint: add the line to the group object in `packages/contracts/src/ipc-endpoints.ts`. Use a unique wire value, for example `request<Payload, Result>()("group:kebab-name")` or `event<Payload>()("group:kebab-name")`. For a server-scoped call use `scopedRequest<Input, Result>()` or `scopedQuery<Result>()`. Add `"required"` as the last type argument when the caller must name the server. Add the type import to the import block at the top of `ipc-endpoints.ts`.
3. Main handler: follow `src/main/ipc/AGENTS.md` ("Adding an endpoint", and `define-ipc-group.ts`). The group's registrar needs one key for the new endpoint. A missing key is `TS2741`.
4. Preload decoder: add a key to the `bridgeGroup` map in `src/preload/index.ts`. Write the decoder in `src/preload/<domain>-decoding.ts` (use `decodeVoid` for void results). Import the decoder in `index.ts`. The key must exist in the group (extra key is `TS2353`).
5. Renderer API: nothing to add for a bridged group. `CodeBotDesktopApi` picks the new method up through `GroupApi`. For an event, the method is `on<Key>`.
6. Mock: add the behaviour to `src/renderer/src/preview/mock-codebot.ts`, or to the `mock-*.ts` module that owns the group (`mock-team.ts` for `servers`, `host`, `remoteDesktop`). For an event, add an emit helper and expose it on `MockCodeBotControls` if stories need it.
7. Checks: `bun run typecheck:node`, `bun run typecheck:renderer`, `bun run typecheck:contracts`. For the coverage rules: `bun run test:desktop -- src/main/ipc-channel-coverage.test.ts`. For the preload: `bun run test:desktop -- src/preload/<name>.test.ts`. Later, `bun run verify:preload` after `bun run build` (part of `check:desktop:static`).

### B. Add a hand-written method (group is not bridged)

Use this for `attachmentImports`, the untyped `browserInput`, and methods that read preload state.

1. Declare the endpoint as in recipe A, step 2.
2. In `ipc-desktop-apis.ts`, type the method as `Invoke<typeof IPC_ENDPOINTS.<group>.<key>>` (or `Subscribe<...>` for an event). Use the interface that owns the group.
3. In `src/preload/index.ts`, write the call:
   - Server-scoped request: `invokeAgentForServer(serverId, endpoint, payload, decode)`.
   - Untyped request: `ipcRenderer.invoke(endpoint.channel, ...)`, as `browserInput.sendLiveViewInput` does.
   - Event: `listen(endpoint, (value) => ...)`. Decode the raw value inside the handler.
4. If the method is not derived from `IPC_GROUP_PATHS`, add an entry to `HAND_WRITTEN_METHODS` in `scripts/verify-preload-bundle.ts` (line 14).
5. Checks: as in recipe A, step 7, plus `ipc-channel-coverage.test.ts`, which reads the preload source for the invoke and subscribe calls.

### C. Add a new group

1. Add the group to `IPC_ENDPOINTS` (`ipc-endpoints.ts`).
2. Add its path key to `IPC_GROUP_PATHS` (line 2119). Use `""`, a name, `"agent"`, or `null`. `CodeBotDesktopApi` is generated from this table, so no line is needed in `ipc-desktop-apis.ts` for a bridged group.
3. Add a `bridgeGroup` block in `src/preload/index.ts`. If the group is nested, spread it into the parent path.
4. Add a registrar in `src/main/ipc/` that covers the whole group (`registerIpcGroups`).
5. Add mock wiring in `mock-codebot.ts`.

### D. Add an additive team capability (protocol 10 or later)

Use this for an optional feature that an old peer can ignore.

1. Add a constant: `export const NEW_FEATURE_CAPABILITY = "new-feature-v1";` in the matching `team-protocol` file, or in `current.ts` if it is shared.
2. Add one row at the end of `TEAM_CAPABILITY_REGISTRY` in `current.ts`, before the closing `] as const satisfies ...` line (about line 880):
   `[NEW_FEATURE_CAPABILITY, V10],`
   Do not change the placement of a row that is already released.
3. Check the list size. Protocol 9 and 10 read 256 names (`capability-limits.ts`). Protocol 10 sends `capabilities` and `absent` separately. Stay under the limit.
4. Gate the feature on the full set: `supportsTeamCapability(fullSet, NEW_FEATURE_CAPABILITY)`. Do not test a single list.
5. Host and client code must not fail when the capability is absent. A missing capability disables only its own feature (`packages/contracts/AGENTS.md`).
6. Checks: `bun run test:team-protocol-v10` (checks both directions of the absent list) and `bun run test:team-legacy-clients`.

### E. Add a new protocol version (rare)

Use this only for a required field, a removed field, or a changed meaning. Steps below are a pattern from the existing files. The exact list of touched files is **(unverified)** beyond what is named.

1. Create `packages/contracts/src/team-protocol/v<N>.ts` (copy the shape of `v10.ts`: constant, capability list, decoder).
2. Create `v<N>-adapter.ts` (request and response codecs) and `v<N>-webrtc-adapter.ts` (WebRTC response decoder). Check the pattern of `v10-webrtc-adapter.ts`.
3. Register the codec in `teamHttpCodec` (`http-codecs.ts` line 186) and export the new files from `team-protocol/index.ts`.
4. Add the limit to `TEAM_PROTOCOL_CAPABILITY_LIMITS` (`capability-limits.ts`).
5. Update the client protocol ranges in `current.ts` (`TEAM_WEB_CLIENT_PROTOCOL`, `TEAM_WEBRTC_CLIENT_PROTOCOL`) **(unverified: which ones change in a given release)**.
6. Add frozen samples in `fixtures/v<N>/` (client and host request and response, host status and compatibility). Keep the earlier folders unchanged.
7. Add a host-side route and provider rule in `src/main/team-api/` if the host speaks the new version.
8. Run `bun run test:team-protocol-decoders`, `bun run test:team-protocol-v10` (or its successor for the new version), and `bun run test:team-legacy-clients`.

### F. Raise the minimum protocol (remove an old one)

From `packages/contracts/AGENTS.md`. Do this in one change:

1. Delete the codec, adapter, fixtures and capability list of the oldest protocol in the window.
2. Add a changelog entry (`changelog.d/` or `CHANGELOG.md` per root rules).
3. Make peers below the minimum get `client_update_required` or `host_update_required`, with clear UI text. Never fail silently.
4. Run an E2E check in both directions (`test:team-api-routes`, `test:team-legacy-clients`).
5. Update the client minimum in `TEAM_WEB_CLIENT_PROTOCOL` and `TEAM_WEBRTC_CLIENT_PROTOCOL` (`current.ts`) **(unverified: exact steps)**.

### G. Add a workflow format rule

1. Add a rule to `WORKFLOW_FORMAT_RULES` in `packages/contracts/src/ipc-workflow-format.ts` (line 46): a `since` number and a `uses(graph)` test.
2. Put new step data in `fields`. Do not add a new node, edge or stroke property (`packages/contracts/AGENTS.md`).
3. Add a fixture with the new data to `scripts/workflow-format-e2e.ts`. Run `bun run test:workflow-format`.

### H. Change a preview mock

- Edit the `mock-*.ts` module that owns the group. Keep `mock-codebot.ts` as the composer.
- Check the behaviour in a story or in the preview page, not only with `typecheck:renderer`. Use the `run` skill or Storybook for screenshots. The main session (not a subagent) should run UI checks (per the CodeBot memory rule).

## Gotchas

1. **Path in `packages/contracts/AGENTS.md` has no package prefix.** It names `src/ipc-workflow-format.ts` (line 46) and does not say what base the path is relative to. The real file is `packages/contracts/src/ipc-workflow-format.ts`.
2. **No group count in `src/preload/AGENTS.md`.** It has no count of agent groups. `IPC_GROUP_PATHS` maps 12 groups to `"agent"`. The preload bridges them in several places (for example `agentGroup` at line 629 and `agentFoldersGroup` at line 729 of `index.ts`).
3. **No wildcard subpath export.** `packages/contracts/package.json` lists each subpath (about 380). A new `ipc-*.ts` file is reached through `@codebot/contracts/ipc` (the barrel). A new file that you want to import by its own subpath needs an `exports` line. `ipc-endpoints.ts` has no own `exports` line; import it from `@codebot/contracts/ipc`.
4. **Wire prefix is not the group name.** Search `IPC_ENDPOINTS` for the wire string, not the group name, when you look for a channel. Duplicate wire values fail `ipc-channel-coverage.test.ts`.
5. **`request` does not accept `AgentIpcRequest` payloads.** Use `scopedRequest` for a server-scoped payload. The compile error names the constraint.
6. **Bridged requests forward one argument.** Extra arguments are dropped before IPC. Put all data in one payload.
7. **Do not pass a bridged method as a DOM handler.** `onClick={api.update.check}` rejects, because Electron cannot copy the DOM event. Wrap it in an arrow function.
8. **Do not call `ipcRenderer.on` in the preload.** Use `listen`. The channel coverage test reads the preload source and checks the subscribe calls. `browser-page.ts` imports only `contextBridge`, and uses only `contextBridge.executeInMainWorld`.
9. **Preload and main decoders are separate.** `FromMain` (preload) and `FromHost` (main) protect different boundaries. Keep them apart. The twin test in `ipc-channel-coverage.test.ts` checks that each main decoder has a preload twin.
10. **A request decoder must not drop values.** `bridgeGroup` throws `The preload cannot drop the result of <channel>.` Use `dropInvalid` only for events.
11. **Types do not test the mock's behaviour.** `mock-codebot.ts` is a product surface. A method that returns `[]` compiles but shows an empty UI in the preview.
12. **Two client protocol maxima differ.** `TEAM_WEBRTC_CLIENT_PROTOCOL` has maximum V9. `TEAM_WEB_CLIENT_PROTOCOL` has maximum V10. The reason is **(unverified)**. Check both before you change either.
13. **Protocol 2 has no HTTP codec.** `teamHttpCodec` sends protocols 1 and 2 to `V1_CODEC`. Protocol 2 has `v2.ts` and `v2-adapter.ts` for WebRTC frames. Protocol 9 has no `v9-adapter.ts`, only `v9-webrtc-adapter.ts`.
14. **Fixtures are checked by hand.** No unit test reads `fixtures/`. The e2e scripts read some of them. Compare a codec change against the fixtures before you merge.
15. **Released capability rows are frozen.** Do not change their `since` or `bootstrap` values. Do not delete a row whose `since` is 9 or lower.
16. **Application version is not the protocol.** Use `TEAM_PROTOCOL_*` constants and the `CodeBot-Protocol-Version` header. `TEAM_APP_VERSION_HEADER` is for display only.
17. **`preview/` has no `AGENTS.md`.** Its rules are in `src/renderer/AGENTS.md`. The mock is covered there.
18. **Windows paths.** The repo folder is `Coding Software` (with a space). Quote paths in shell commands.

## Unverified

- The exact list of files for a new protocol version (recipe E, step 5 and step 7).
- The reason `TEAM_WEBRTC_CLIENT_PROTOCOL` has maximum V9 (gotcha 12).
- The exact steps to change the client minimum protocol (recipe F, step 5).
- The count of 270 preload decode functions is from grep. Whether each one is used is unverified.
- The number of spread calls in `index.ts` was read by line, not counted in code.
- The file `src/main/team-api-server.ts` is the server side of the Team API; its routes were not read.
