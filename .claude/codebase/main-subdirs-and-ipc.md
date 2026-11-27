# src/main subdirectories and IPC

Scope: `src/main/` subdirectories (`ipc/`, `team-api/`, `local-servers/`, `password-managers/`), plus `src/main/ipc/AGENTS.md`.
Read-only mapping. Counts come from `ls`, `wc` and `grep` on the repo at the time of writing. Items marked "(unverified)" were not confirmed in code.

## What this area is

- `src/main/` is the Electron main process. It owns windows, the trust boundary, lifecycle and privileged services.
- `src/main/ipc/` (88 `.ts` files plus `AGENTS.md`) holds the IPC handlers. 60 `*-handlers.ts` files hold the `*IpcHandlers` factories (count from `ls`). Each factory returns the handlers for one or more endpoint groups.
- Endpoints are declared in `packages/contracts/src/ipc-endpoints.ts`. Every call is registered through `src/main/trusted-ipc.ts`, the only file that calls `ipcMain.handle`.
- A handler that takes a `serverId` routes to the local `AgentService` or to a joined Team server. The remote branch calls the host's Team API over HTTPS or WebRTC V2.
- The Team API host lives in `src/main/team-api/` (140 files). `src/main/team-api-server.ts` dispatches requests to the route files.

## Subdirectories of src/main in scope

| Directory | Contents | Role |
| --- | --- | --- |
| `src/main/ipc/` | 88 `.ts` files plus `AGENTS.md`: `*-handlers.ts`, `*-inputs.ts`, `define-ipc-group.ts`, `scoped-handler.ts`, `route-to-server.ts`, `validation.ts`, tests, `AGENTS.md` | IPC endpoint handlers, grouped by domain |
| `src/main/team-api/` | 140 files: `route-*.ts`, `request-context.ts`, `request-helpers.ts`, `dependencies.ts`, `http-error.ts`, `client-use.ts`, `mcp-member-access.ts`, `provider-visibility.ts`, `workflow-visibility.ts`, `server-safe-mode-api.ts` | Team API host routes served to joined clients |
| `src/main/local-servers/` | `local-server-registry.ts`, `local-servers.ts`, plus 2 test files | Local server registry (behavior not mapped in depth) |
| `src/main/password-managers/` | `driver.ts`, `encrypted-record-store.ts`, `extra-password-pipe.ts`, `password-managers-service.ts`, `proton-pass-cli-installer.ts`, `proton-pass-driver.ts` | Password manager drivers and service (not mapped in depth) |

## Key files

| Path | What it owns |
| --- | --- |
| `src/main/ipc/AGENTS.md` | Rules for IPC: the five handler forms, routing, enforced rules, the add-endpoint steps |
| `src/main/AGENTS.md` | Main-process rules: IPC endpoint rules, trust boundary, Team API route rules, ownership table, lifecycle |
| `src/main/trusted-ipc.ts` | `handleTrusted`, `handleTrustedWithEvent`. Sender URL check, decode, call observer, error reference carry |
| `src/main/trusted-renderer.ts` | `isTrustedRendererUrl(frameUrl, developmentUrl)`. Packaged app: protocol `codebot-app:` and host `app`. Development: origin of `ELECTRON_RENDERER_URL` |
| `src/main/trusted-ipc.test.ts` | Tests for the sender check (fabricated sender frames, `vi.mock("electron")`) |
| `src/main/ipc/define-ipc-group.ts` | Five binders: `handler`, `payloadHandler`, `eventHandler`, `eventPayloadHandler`, `authorizedHandler`. Types `GroupHandlers`, `IpcGroupHandlers`. Functions `registerIpcGroup`, `registerIpcGroups` |
| `src/main/ipc/define-ipc-group.test.ts` | Tests for binder behavior and sender-check ordering |
| `src/main/ipc-channel-coverage.test.ts` | Source-level checks: channel names, trusted-wrapper use, preload `invoke`/`subscribe` coverage, FromHost/FromMain twin decoders |
| `src/main/ipc/validation.ts` | `requireString`, `stringPayload`, `optionalPayload`, `nullishPayload`, `isObject`, `optionalBoolean` |
| `src/main/ipc/agent-inputs.ts` | `agentRequest(decode)`, `agentScope`, `parseAgentId`, `parseChannelId`, `parseAttachmentId`, other agent id parsers |
| `src/main/ipc/scoped-handler.ts` | `scopedHandler(decode, {local, remote})`, `scopedQueryHandler({local, remote})` |
| `src/main/ipc/route-to-server.ts` | `routeToServer(serverId, {local, remote})`. Uses `LOCAL_SERVER_ID` |
| `packages/contracts/src/ipc-team-host.ts` | `LOCAL_SERVER_ID = "local"` (line 13) |
| `src/main/ipc/team-handlers.ts` | `teamIpcHandlers`. Groups `servers`, `host`, `remoteDesktop`. Example of `routeToServer`. `ownerTransferUnsupported` (line 57) throws the localized error |
| `src/main/ipc/agent-handlers.ts` | `agentIpcHandlers` (line 367). Many `scopedHandler` and `scopedQueryHandler` uses with remote branches |
| `src/main/ipc/agent-admin-handlers.ts` | Capability-gated admin calls (`AGENT_ADMIN_CAPABILITY`, `SKILLS_ADMIN_CAPABILITY`, `AGENT_INSTALL_CAPABILITY`) |
| `src/main/ipc/acp-registry-handlers.ts` | Capability-gated remote call (`ACP_REGISTRY_CAPABILITY`) |
| `src/main/ipc/dynamic-island-handlers.ts` | `authorizedHandler` example (`requireDynamicIslandSender`) |
| `src/main/ipc/browser-dock-handlers.ts` | `authorizedHandler` example for `publishPresentation` |
| `src/main/ipc/app-handlers.ts` | `appIpcHandlers` (line 148). `eventPayloadHandler` example (`reportRendererTiming`) |
| `src/main/ipc/browser-handlers.ts` | `eventPayloadHandler` example (`startLiveView`) that sends frames to the calling window |
| `src/main/ipc/remote-agent-status.ts` | `readRemoteAgentStatus`. Reads a remote status with `TEAM_API_ROUTES` and a capability check. Defines `RemoteStatusServers` |
| `src/main/ipc/one-at-a-time.ts` | `oneAtATimePerKey()`. Serializes async changes per key |
| `src/main/renderer-ipc.ts` | `sendToRenderer(window, endpoint, ...args)`. Drops sends to destroyed or loading windows. Not in `ipc/` |
| `src/main/index.ts` | `registerIpcHandlers({...})` (line 718). Spreads all factories into `registerIpcGroups({...})` (line 840) |
| `src/main/team-api-server.ts` | `class TeamApiServer` (line 605). `#handle` (line 1072) runs gates and the route chain, whose first call is at line 1208. Not-found 404 at line 1492. Catch block at lines 1493-1516. `#protocolIssue` (line 3035). `#requestContext` (line 3090) |
| `src/main/host-service.ts` | Constructs `TeamApiServer` (line 479) |
| `src/main/team-api/dependencies.ts` | `TeamApiOptions` (line 638) and the narrow `Pick` types each route needs (`TeamApiAgents`, `TeamApiCrm`, `TeamApiAdmin`, ...) |
| `src/main/team-api/request-context.ts` | `RouteOutcome = "handled" | "unmatched"`. `TeamApiRequestContext` (method, url, protocol, capabilities, member, token, `json`, `empty`, `agentLevel`) |
| `src/main/team-api/http-error.ts` | `class HttpError(status, message)`. The only place this class is defined |
| `src/main/team-api/request-helpers.ts` | `readJson`, `bearerToken` (line 227), `requireAdmin` (258), `requireOwner` (262), `requireAgentLevel` (278), `pathIdentifier` (372), `JSON_LIMIT` (1 MiB, line 67), `WEBRTC_FRAME_BODY_BUDGET` (line 68) |
| `src/main/team-api/route-team.ts` | `routeTeam`. Members, invitations, sessions, presence, authenticated account routes. First route in the chain |
| `src/main/team-api/route-agents.ts` | `routeAgents`. Agent collection and the `/v1/agents/:agentId` regex (line 228). `agentWriteLevel` (line 388) |
| `src/main/team-api/route-crm.ts` | Smallest complete route example. `routeCrm`, `parse`, `run`, `fitted`, a `switch (path)` whose cases are `CRM_ROUTES` values |
| `packages/contracts/src/team-api-routes.ts` | `TEAM_API_ROUTES` (line 9). Path strings and path builders such as `agent.duplicate(agentId)` |
| `packages/contracts/src/team-protocol/` | Capability constants and protocol codecs (`current.ts`, `crm-v1.ts`, `acp-registry-v1.ts`, `agent-admin-v1.ts`, `agent-install-v1.ts`, `skills-admin-v1.ts`, ...; `v1.ts` to `v10.ts` exist) |
| `src/main/remote-server-manager.ts` | `RemoteServerManager` (2850 lines). `activeServerId` (line 819), `supportsCapability` (line 827), `request(serverId, path, decoder, init)` (line 1638) |
| `src/main/remote-server-client.ts` | `RemoteServerClient`. HTTPS path, and WebRTC V2 path through `#transport`. `decodeOrProtocolError`, `rethrowAsRemoteRequestError` |
| `src/main/remote-host-decoding.ts` and four siblings (`remote-agent-decoding.ts`, `remote-conversation-decoding.ts`, `remote-team-decoding.ts`, `remote-device-decoding.ts`, `remote-desktop-setup-decoding.ts`) | `FromHost` decoders for host responses. Main process side of the trust boundary |
| `src/preload/index.ts` | `bridgeGroup` (line 467), `invokeAgentForServer` (line 429). Preload side |
| `src/preload/AGENTS.md` | Preload rules for bridged and hand-written groups |
| `src/renderer/src/preview/mock-codebot.ts`, `mock-team.ts` | Preview mocks that must match each new method |
| `scripts/team-api-routes-e2e.ts` | Team API route end-to-end test. Run by `bun run test:team-api-routes` |
| `scripts/ipc-input-e2e.ts` | Sends malformed payloads to a running dev app. Run by `bun run test:ipc-input` |
| `AGENTS.md` (repo root), section "Joined servers" (line 81) | Rule: a feature that can work on a server needs a `remote` branch, a host route, and client gating |

## How it works

### 1. Startup registration

1. `src/main/index.ts` `registerIpcHandlers({...})` receives the services from `ApplicationServices`.
2. It calls `registerIpcGroups({ ...appIpcHandlers({...}), ...dynamicIslandIpcHandlers({...}), ... })`. There are 60 spreads (lines 840-1140).
3. Each factory returns `Pick<IpcGroupHandlers, "group" | ...>`. The spread builds one object with one key per group.
4. `registerIpcGroups` (in `define-ipc-group.ts`) walks `IPC_ENDPOINTS` from the contracts.
5. For each group it throws `The IPC group <name> has no handlers.` if the group is missing.
6. For each request endpoint it calls `handlers[name](endpoint.channel)`. A missing handler throws `The IPC endpoint <name> has no handler.` Event endpoints are skipped here.
7. Type-level coverage: `GroupHandlers` (TS2741/TS2353) forces one handler per request endpoint.

Counts from grep on `ipc-endpoints.ts`: 423 typed `request<...>()` endpoints, 1 `untypedRequest` endpoint (`browserInput.sendLiveViewInput`), and 63 `event<...>()` endpoints. `IPC_GROUP_PATHS` (line 2119, closes at line 2223) has 66 top-level group entries.

### 2. Registration chain and sender check

```
define-ipc-group.ts  handler / payloadHandler / eventHandler / eventPayloadHandler / authorizedHandler
        -> trusted-ipc.ts  handleTrusted / handleTrustedWithEvent
              -> ipcMain.handle(channel, (event, payload) => { ... })
```

Inside the `ipcMain.handle` callback, in this order:

1. `isTrustedRendererUrl(event.senderFrame?.url)`. If false, throw `Rejected IPC request from an untrusted renderer.`
2. `carryReference(...)` wraps the run so non-runtime errors that carry a reference keep it (uses `@codebot/user-errors`).
3. `observeCall(channel, ...)` calls the optional observer set by `setIpcCallObserver`. It records `{name, durationMs, outcome}`.
4. Branch by registration:
   - no-payload form: call the handler with no arguments.
   - decoder form: `handler(decode(payload))`.
   - event form: `handler(event)`.
   - event-and-payload form: `handler(event, decode(payload))`.
   - authorized form: `authorize(event)`, then `handler(event, decode(payload))`.

So the sender URL check always runs first. The authorize step (when present) runs before the decoder. The decoder runs before the handler body.

### 3. The five handler forms

| Constructor | Takes | Sender check beyond URL | Use for |
| --- | --- | --- | --- |
| `handler(fn)` | nothing from renderer | none | no-argument endpoints |
| `payloadHandler(decode, fn)` | decoded payload | none | most endpoints |
| `eventHandler(fn)` | `IpcMainInvokeEvent` | none | needs `event.sender` |
| `eventPayloadHandler(decode, fn)` | payload and event | none | any app window may call it |
| `authorizedHandler(authorize, decode, fn)` | payload and event | `authorize(event)` before decode | only some windows may call it (Dynamic Island, browser dock, chat windows) |

Typing rules from `define-ipc-group.ts`:
- `TakesNoArguments` makes `handler` fail to compile if the function takes a parameter.
- `TakesEventOnly` allows 0 or 1 parameters for `eventHandler`.

### 4. Routing for joined servers

Two patterns exist.

**A. Payload carries `serverId` (agent and scoped endpoints).**
- The renderer sends `{ serverId, payload }`.
- `agentRequest(decode)` (in `agent-inputs.ts`) requires `serverId` as a string, then decodes `payload`.
- `scopedHandler(decode, { local, remote })` = `payloadHandler(agentRequest(decode), ...)` and calls `routeToServer`. `local(payload)` and `remote(payload, serverId)` are the two branches.
- `scopedQueryHandler({ local, remote })` uses `agentScope`. The payload is `null`. `local()` and `remote(serverId)` are the branches.
- `routeToServer(serverId, branches)` (in `route-to-server.ts`) returns `local()` when `serverId === LOCAL_SERVER_ID` (`"local"`), otherwise `remote(serverId)`. The result is wrapped in `Promise.resolve`.

**B. Payload has no `serverId`; the handler routes by the active server.**
- Used in `team-handlers.ts` for `getPresence`, `setTyping`, `listDirectThreads`, `readDirectConversation`, `readDirectConversationPage`, `sendDirectMessage`, `markDirectRead`, `setDirectTyping`.
- Pattern: `routeToServer(remoteServers.activeServerId, { local: () => host.x(...), remote: () => runCauseEffect(remoteServers.x(...)) })`.
- `remoteServers.activeServerId` is a getter (`remote-server-manager.ts` line 819).

**Capability gating for the remote branch.**
- `remoteServers.supportsCapability(serverId, CAPABILITY)` (line 827) reads `compatibilityFor(serverId)?.capabilities`. It returns false when the server is unknown.
- Common shapes in the handler files:
  - Capability missing, return a safe value: `getUsage` returns `{ limits: [] }` when `model-scoped-usage` is missing (`agent-handlers.ts`, line 498).
  - Capability missing, throw a localized error: `ownerTransferUnsupported` in `team-handlers.ts` (line 57) throws `sourceText("error.team.ownerTransferUnsupported")`.
  - Capability missing, return `null` from the remote branch: `getHostAnalytics` and `getAnalytics` (`agent-handlers.ts`, lines 471-495) check the literal strings `"host-analytics"` and `"agent-analytics"` before they call the host. They are not in `team-handlers.ts`.
- Capability constants live in `packages/contracts/src/team-protocol/*-v1.ts`, for example `CRM_CAPABILITY = "crm-v1"` (`crm-v1.ts` line 18), `ACP_REGISTRY_CAPABILITY = "acp-registry-v1"`, `AGENT_ADMIN_CAPABILITY = "agent-admin-v1"`. The list of current capabilities is in `team-protocol/current.ts`.

**Remote request dispatch.**
1. The handler calls `remoteServers.request(serverId, path, decoder, init)` (`remote-server-manager.ts` line 1638). It returns an Effect.
2. `RemoteServerManager` calls `this.#client.request(...)`, the `RemoteServerClient` in `remote-server-client.ts`.
3. The client uses the HTTPS path, or for `transport === "webrtc-v2"` the `#transport` (`RemoteHostRequestTransport`). If that transport is missing it throws `sourceText("error.remote.webRtcUnavailable")` (`remote-server-client.ts` line 586).
4. The response passes through a `FromHost` decoder. A bad response becomes `RemoteProtocolError("protocol_error", ...)` (`decodeOrProtocolError`).
5. A WebRTC error becomes `RemoteRequestError(status, message, code)` (`rethrowAsRemoteRequestError`).

### 5. Team API host: request flow

`TeamApiServer.#handle` (`team-api-server.ts`, starts at line 1072):

1. Set `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`. Parse the URL against `http://127.0.0.1`.
2. `GET /v1/compatibility` returns the protocol support object. No auth.
3. `remoteScreen.handlesHttp(url)` delegates to the remote-screen handler.
4. `#protocolIssue(request)` (line 3035). Only when `appVersion` is set. Status codes:
   - no protocol header or no app-version header: status 426, code `client_update_required`.
   - invalid protocol number or app version over 64 chars: status 400, code `protocol_error`.
5. Public routes, no bearer token needed: `GET identity`, `POST join.invitationPreview`, `POST join.server`, `POST join.account`, `POST auth.login`, `POST auth.account`.
6. `bearerToken(...)` and `store.authenticateSession(token)`. If missing or invalid: status 401, `error.team.authenticationRequired`. This check does not depend on the path.
7. `isClientUse` records client use (line 1188).
8. `#requestContext(...)` (line 3090) builds the `TeamApiRequestContext`.
9. Hidden agents: if the `/v1/agents/:id` id, or the `agentId` or `botId` query value, is in the hidden set, return 404 `error.team.agentNotFound` (lines 1196-1202 of `team-api-server.ts`).
10. Route chain. Each step is `if ((await routeX(context, deps)) === "handled") return;`. The order is fixed:
    - `#routeTeam`, `#routeRemoteScreen`, `#routeDirect`, `#routeBrowser`, `#routeFiles`.
    - 137 `await routeX(context` calls (grep count) in the middle (channels, MCP, connectors, vault, providers, storage, agent admin, host admin, agent tasks, skills, CRM, events, live voice, workflows, ...).
    - `#routeAgents` near the end.
11. If nothing handled the request, return 404 `error.team.routeNotFound`.

Each route function:
- Signature: `routeX(context: TeamApiRequestContext, deps...): Promise<RouteOutcome>`.
- First line checks method and path. If they do not match, it returns `"unmatched"`.
- It responds with `context.json(status, body)` or `context.empty(status)`, and returns that `RouteOutcome`.
- It ends with `return "unmatched"` (or the `switch` ends that way).

**Error mapping** (catch block, lines 1493-1516):

| Error class | Status | Body |
| --- | --- | --- |
| `HttpError` | its `status` | `{ error: message }` |
| `RemoteScreenError` | its `status` | `{ error, code }` |
| `AgentThreadLimitError`, `AgentSettingsRefused` | 409 | message |
| `TeamStoreError`, `McpServerError`, `AnalyticsInputError`, `AgentMemorySelectionError` | 400 | message |
| Any other error | 500 | fixed `error.team.requestFailed` (the message itself when it is a fixed source text), error logged as `Team API request failed:` |

If the response headers were already sent, the server destroys the response instead.

**Authorization helpers** (`request-helpers.ts`):
- `requireAdmin(member)` (line 258): `canAdministerServer(member.role)`, else 403 `error.team.adminRequired`.
- `requireOwner(member)` (line 262): role must be `"owner"`, else 403.
- `requireAgentLevel(context, agentId, required)` (line 278): compares `agentAccessRank(context.agentLevel(agentId))`. Else 403 `error.team.agentManageDenied` or `error.team.agentViewOnly`.
- In `route-agents.ts`, `agentWriteLevel(action)` (line 388): `OWN_ACTIONS` (`conversation/read`, `conversation/unread`) need `view`. `CHAT_ACTIONS` need `chat`. Everything else needs `manage`.
- In `route-agents.ts` (line 232), a non-GET request to `/v1/agents/:id` checks the level. The exception is `DELETE` with no action. That case is checked inside the route (line 263).

**Route file layout** (`team-api/`):

| Concern | Files |
| --- | --- |
| Shared types and helpers | `http-error.ts`, `dependencies.ts`, `request-helpers.ts`, `request-context.ts`, `client-use.ts` |
| Members, invitations, sessions, presence, account | `route-team.ts` |
| Remote screen, direct messages, browser, files | `route-remote-screen.ts`, `route-direct.ts`, `route-browser.ts`, `route-files.ts` |
| Agent collection and `/v1/agents/:agentId` | `route-agents.ts` |
| Agent sub-resources | `route-agent-*.ts` (25 files: memories, routines, conversation, queue, threads, tasks, install, publish, ...) |
| Everything else | `route-<domain>.ts` (CRM, vault, workflows, providers, connectors, host admin, ...) |

`TEAM_API_ROUTES` (`packages/contracts/src/team-api-routes.ts`, line 9) holds the paths. Examples: `analytics: "/v1/analytics"`, `identity: "/v1/identity"`, `events: "/v1/events"`, `me: "/v1/me"`, `attachments: "/v1/attachments"`, `sharedFiles: "/v1/shared-files"`. Nested objects: `join.*`, `agent.*` (builders such as `agent.duplicate(agentId)`), `agents.*` (for example `agents.usage`).

## How to change it

### Recipe A: add a local IPC endpoint (no joined-server behavior)

1. Pick the group in `packages/contracts/src/ipc-endpoints.ts` (`IPC_ENDPOINTS`, line 787). Add:
   ```ts
   myThing: request<MyThingInput, MyThingResult>()("group:my-thing"),
   ```
   Use `event<Payload>()("group:name")` for a push from main. Do not add `untypedRequest(...)`. The only exception is `browserInput.sendLiveViewInput`.
2. If the group is new, add it to `IPC_GROUP_PATHS` (line 2119). Mark the group `null` if it has no wire prefix (as `attachmentImports` does).
3. Add the parser. Use `payloadHandler(parseMyThing, ...)`. Put the parser in the domain's `src/main/ipc/<domain>-inputs.ts` or use `validation.ts` primitives. Parsers throw `Error` on bad input.
4. Add the handler to the factory in `src/main/ipc/<domain>-handlers.ts`:
   ```ts
   myThing: payloadHandler(parseMyThing, (input) => runCauseEffect(service.doThing(input))),
   ```
   Never name a channel here. The group binds it.
5. If the factory is new, add it to the spreads in `registerIpcGroups({...})` in `src/main/index.ts` (around line 840). Pass its dependencies from `registerIpcHandlers` (destructured from `ApplicationServices`, exported by `src/main/application-services.ts`). Do not import from `index.ts` in a handler file.
6. Preload: if the group uses `bridgeGroup` (`src/preload/index.ts`, line 467), add one decoder to its map. The decoder is a `FromMain` decoder in `src/preload/<domain>-decoding.ts`, or `decodeVoid`. If the group is hand-written, add a method that calls `ipcRenderer.invoke` (or `invokeAgentForServer` for server-scoped calls).
7. Renderer preview: add the method to `src/renderer/src/preview/mock-codebot.ts` or the `mock-<domain>.ts` that owns the group (for example `mock-team.ts`).
8. Types: run `bun run typecheck:node`, then `bun run typecheck:renderer`, one at a time (see the Checks section of the root `AGENTS.md`).
9. Tests: `bun run test:related -- src/main/ipc/<domain>-handlers.ts`. Coverage: `src/main/ipc-channel-coverage.test.ts`. Malformed payloads: `bun run test:ipc-input -- --allow-mutations` against a running dev app.

### Recipe B: add an endpoint that must also work on a joined server

1. Contract: add the path to `TEAM_API_ROUTES` in `packages/contracts/src/team-api-routes.ts`.
2. Capability (only for a new feature): add `MY_FEATURE_CAPABILITY = "my-feature-v1"` in `packages/contracts/src/team-protocol/my-feature-v1.ts`. Add it to the current capability list in `team-protocol/current.ts`. Gate the client on it.
3. Host route: create `src/main/team-api/route-my-feature.ts`:
   ```ts
   export async function routeMyFeature(context: TeamApiRequestContext, deps: TeamApiMyFeature | undefined): Promise<RouteOutcome> {
     const { method, url, capabilities, member, request, json } = context;
     if (method !== "POST" || url.pathname !== TEAM_API_ROUTES.myFeature) return "unmatched";
     if (!deps || !capabilities.has(MY_FEATURE_CAPABILITY)) throw new HttpError(400, sourceText("error.myFeature.serverTooOld"));
     requireAdmin(member);            // or requireOwner / requireAgentLevel as the rule needs
     const body = await readJson(request);
     return json(200, await deps.doThing(parse(parseMyFeatureInput, body)));
   }
   ```
   Follow `route-crm.ts` for the `parse` and `run` helpers. Return `"unmatched"` at the end.
4. Dependency type: add `TeamApiMyFeature` (a `Pick<...>`) in `src/main/team-api/dependencies.ts`. Add an optional field to `TeamApiOptions` (line 638).
5. Wire it: pass the service through `new TeamApiServer({...})` in `src/main/host-service.ts` (line 479).
6. Dispatcher: add `if ((await routeMyFeature(context, this.#options.myFeature)) === "handled") return;` in `#handle` in `src/main/team-api-server.ts`. Place it in a sensible spot in the chain. Earlier routes win, so a broad route placed too early can shadow it.
7. Desktop handler: in `src/main/ipc/<domain>-handlers.ts`, use `scopedHandler`:
   ```ts
   myThing: scopedHandler(parseMyThing, {
     local: (input) => runCauseEffect(service.doThing(input)),
     remote: (input, serverId) =>
       remoteServers.supportsCapability(serverId, MY_FEATURE_CAPABILITY)
         ? runCauseEffect(remoteServers.request(serverId, TEAM_API_ROUTES.myFeature, decodeMyFeatureFromHost, { method: "POST", body: input }))
         : Promise.reject(new Error(sourceText("error.myFeature.unsupported"))),
   }),
   ```
   Then update the contract (Recipe A, steps 1 to 2).
8. Add `decodeMyFeatureFromHost` in one of the `src/main/remote-*-decoding.ts` files (unverified which one fits). Add the twin `FromMain` decoder in `src/preload/` and do not alias the two (see gotchas).
9. Client gating: the renderer hides the action when the host lacks the capability.
10. Test: `bun run test:team-api-routes` (`scripts/team-api-routes-e2e.ts`). The root `AGENTS.md` says to test the host route through the Team API, not only through the local IPC path.
11. Docs: root `AGENTS.md` says a release note must say when the host must also be on the new version.

### Recipe C: add a server-scoped read with no payload

1. Same as Recipe A, but use `scopedQueryHandler({ local: () => ..., remote: (serverId) => ... })`.
2. The renderer sends `{ serverId }` only. Use the `request<AgentIpcRequest<null>, Result>` form in the contract if the group has one (see `AgentIpcRequest` in `packages/contracts/src/ipc-agent-events.ts`, line 437).

### Recipe D: add a sender-restricted handler

1. Write `authorize(event)` that throws if the sender is wrong. A model is `requireDynamicIslandSender(event.sender.id, ids, "label")` in `src/main/dynamic-island-window.ts`.
2. Bind with `authorizedHandler(authorize, decode, (event, payload) => ...)`.
3. Add the test shape from `define-ipc-group.test.ts` (`keeps a bound handler behind the sender check`).

### Recipe E: send an event to the renderer

1. Declare with `event<Payload>()("group:name")` in `ipc-endpoints.ts`.
2. In main, call `sendToRenderer(window, IPC_ENDPOINTS.group.name, payload)` from `src/main/renderer-ipc.ts`.
3. The endpoint argument must be a direct `IPC_ENDPOINTS.group.name` reference. Do not use a string or a variable (rule in `src/main/AGENTS.md`).

## Gotchas

1. The sender URL check runs before decode and before any `authorize` step. A rejected caller never gets a validation error. Keep that order when you add a binder.
2. `eventPayloadHandler` has no sender-identity check. Any app window can call it. Use `authorizedHandler` for restricted endpoints.
3. Every app window passes the same trusted URL (`codebot-app://app` in a packaged build). The URL check cannot tell the Dynamic Island or the browser dock from the main renderer. Use `authorizedHandler` for those.
4. Only `src/main/trusted-ipc.ts` may call `ipcMain.handle`. Outside tests, only `define-ipc-group.ts` may call `handleTrusted` or `handleTrustedWithEvent`. Grep for `ipcMain` in `src/main` (excluding tests) finds only `trusted-ipc.ts`.
5. Do not bind a raw `unknown` payload as a no-payload handler. `handler` requires a zero-argument function.
6. Handlers must not name channels. The group binds the channel from `IPC_ENDPOINTS`.
7. Handlers must not import from `src/main/index.ts`. `index.ts` is the dispatcher. Put new handler logic in an `*-handlers.ts` file.
8. Keep one handler file per domain. The rule is in `src/main/ipc/AGENTS.md`.
9. A `FromHost` decoder (main reads host responses) and a preload `FromMain` decoder (preload reads main events) protect different trust boundaries. Add each one on its own side. Do not share one decoder between them. `ipc-channel-coverage.test.ts` checks the names match, not that they differ.
10. A remote branch must not always throw or return empty data for a feature that can work on a server. If a part must stay local, write the reason in the PR (root `AGENTS.md`, section "Joined servers").
11. A `local` or `kind === "local"` gate for a feature that could work on a server is against the rules. Use `routeToServer` instead.
12. Some team handlers route by `remoteServers.activeServerId`, not by a payload `serverId`. Do not mix the two styles in one endpoint without a reason.
13. `supportsCapability` returns false for unknown servers. A new feature must check capability before it calls `remoteServers.request`.
14. `TEAM_API_ROUTES` builders take ids. Pass ids through `pathIdentifier` so they cannot change the path (see `request-helpers.ts` line 372).
15. A route function must end with `return "unmatched"`. The return type `Promise<RouteOutcome>` enforces the value, not the flow.
16. A wrong HTTP method returns 404, not 405. Only the dispatcher returns 404 for an unknown path. A route returns `"unmatched"` for a wrong method or path.
17. Only the dispatcher catches errors. A route throws `HttpError` (from `team-api/http-error.ts` only). An unexpected error must reach the logger and return 500 (see the catch block at lines 1493-1516).
18. Gate order is fixed: compatibility, remote-screen delegation, protocol gate, then the 401 check. Changing the order changes released wire behavior.
19. Route order in `#handle` matters. The first `"handled"` wins. A new route placed before a broad one can be shadowed, and a new route placed after `#routeAgents` may never run for agent paths.
20. Hidden agents return 404 before any route runs (`agentId` in path, `agentId` or `botId` in query). A new route that takes an agent id gets this check for free only if it uses the same path or query names.
21. `sendToRenderer` drops messages for destroyed or loading windows and does not throw for that case. Do not rely on it for delivery.
22. `oneAtATimePerKey` (`ipc/one-at-a-time.ts`) serializes work per key. It does not prevent work on different keys from interleaving.
23. Root `AGENTS.md` forbids comments in code. The `ipc/AGENTS.md` recipe does not ask for comments, but a new file must follow the rule.
24. Root `AGENTS.md` asks for narrow checks only. `ipc/AGENTS.md` lists the full typecheck steps. Run one project at a time.
25. A new host route needs a release. A joined server that is behind the new version will not have the route. The capability gate in the client prevents a broken action from showing.
26. Error text that reaches a user must use `sourceText(key, params)` from `@codebot/i18n/source`. The English text must not change, because older clients read it.
27. A repo-level lint rule that enforces "direct `IPC_ENDPOINTS` reference" in `sendToRenderer` calls was not found in `biome.json`, `tools/` or `scripts/` (checked by grep). The rule is written in `src/main/AGENTS.md` (line 27) only.
28. Biome import-boundary checks between `src/main` and renderer code are in `biome.json`: the `noRestrictedImports` rule for `src/renderer/src` and `packages/ui` forbids imports of `**/main/**`, `**/backend/**` and `**/preload/**`.
29. The `src/main/AGENTS.md` ownership table says `index.ts` keeps dispatch and lifecycle only. Do not move service construction, window creation, or teardown into the IPC handler files.
30. Event endpoints do not have a handler. They are sent with `sendToRenderer`. `registerIpcGroups` skips them.
