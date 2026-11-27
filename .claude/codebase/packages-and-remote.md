# Packages and remote: logging, team client, telemetry, user errors, WhatsApp, Signal, TURN, Docker, Nix

## What this area is

- This area holds five shared packages (`packages/logging`, `packages/team-client`, `packages/telemetry`, `packages/user-errors`, `packages/whatsapp`) and the remote control plane (`remote/`).
- `remote/` runs Signal (WebSocket relay for SDP and ICE) and TURN (coturn). Team files, chats and video do not go through Signal, per `remote/README.md`.
- `packages/team-client` is the client side of that path: directory, WebRTC peer, recovery, framing and host key pinning. It is shared by desktop, mobile and the browser extension.
- `docker/`, `nix/` and the `docs/self-hosting*.md`, `docs/self-hosted-server.md`, `docs/docker.md` files cover the Linux server and Docker install (Phase 2).
- Two different things are called "Signal". `packages/whatsapp/src/signal/` is the Signal Protocol (end-to-end crypto for WhatsApp). `remote/api/src/signal-service.ts` is the Signal WebSocket relay. See Gotchas.

## Key files

### packages/logging (`@codebot/logging`)

| Path | What it owns |
| --- | --- |
| `packages/logging/src/index.ts` | `createCodeBotLogger(prefix, sink?, level?)`, `resolveLogLevel`, `teeLogLines`, all redaction functions (`redactText`, `redactSecrets`, `redactPostText`, `redactValue`, `toLogValue`, `toSecretSafeValue`, `containsSecret`), secret registry (`registerSecretValue`, `registerSecretValues`, `registerPublicValues`, `isSecretName`), types `LogValue`, `LogLevel`. Re-exports `Logger` and `dummyLogger` from `ts-log`. |
| `packages/logging/src/identifiers.ts` | `maskIdentifiers(value)`: masks hosts, IPs, UUIDs, long IDs and `/Users/<name>` or `/home/<name>` folders. |
| `packages/logging/src/redaction.test.ts` | Vitest cases for the redaction rules. |
| `packages/logging/src/identifiers.test.ts` | Vitest cases for `maskIdentifiers`. |

### packages/team-client (`@codebot/team-client`)

About 14,300 lines in `packages/team-client/src/`. Each module has its own subpath in `packages/team-client/package.json` `exports`. The root `index.ts` exports only a subset.

| Path | What it owns |
| --- | --- |
| `packages/team-client/src/remote-directory.ts` | `RemoteTeamDirectoryClient` (class). Host list, members, invites, owner transfer, bootstrap, `startSession`, `endSession`, `previewInvite`, `acceptInvite`. Host key pinning (`#trustedHostKey`, `#pinHostKey`). `watchRemoteDirectory`, `createRemoteDirectoryRefresh`, `REMOTE_ACCOUNT_CHECK_INTERVAL_MS` (15 min). |
| `packages/team-client/src/remote-peer.ts` | `createRemoteTeamPeer` (WebRTC peer and Signal socket, about 2,500 lines). `createRemoteCommandMailbox`, `decodeRemoteTeamCommand`, `RemoteTeamPeerActions`, `RemoteHostProtocols`, `REMOTE_PEER_LOST_AFTER_MS`. |
| `packages/team-client/src/remote-recovery.ts` | `createRemoteConnectionRecovery`, `createRemoteReadRefresh`, `remoteConnectionFailureDetails`, `remoteRecoveryMessage`, `startRemoteRequestDeadline`, `remoteWorkspaceReadTimeout`. Constants `REMOTE_RETRY_INTERVAL_MS` (2 s), `REMOTE_RETRY_LIMIT` (5), `REMOTE_RETRY_COOLDOWN_MS` (30 s), `REMOTE_REQUEST_MAX_WAIT_MILLISECONDS` (60 s). Type `RemoteConnectionStage` (`preferences`, `connection`, `compatibility`, `agents`, `reads`). |
| `packages/team-client/src/webrtc-framing.ts` | `encodeTeamWebRtcPayload`, class `TeamWebRtcPayloadDecoder`. Frames big payloads for WebRTC messages. Wire format of Team protocol v2. |
| `packages/team-client/src/ice-diagnostics.ts` | `iceServerErrorDetail`, `iceCandidateRoute`, `knownIceCandidateRoute`. Labels ICE routes (host, srflx, relay). |
| `packages/team-client/src/host-key-handover.ts` | `remoteHostFingerprint(publicKey)` (base64url SHA-256 of the PEM text), `followHostKeyHandovers`, `hostKeyChangedAt`. Follows signed host key handovers. |
| `packages/team-client/src/ed25519.ts` | `createEd25519Identity`, `signEd25519`, `verifyEd25519Pem` (uses `@noble/ed25519`). |
| `packages/team-client/src/effect-boundary.ts` | `runTeamEffect`. Runs Effect code at the boundary. |
| `packages/team-client/src/index.ts` | Root barrel. Exports `TeamClientFetch` type, `readAgentAnalytics`, `readHostAnalytics`, `createRemoteAccountRefresh`, `runTeamEffect`, `saveReviewedAgentProfile`, and `export *` from host-key-handover, remote-directory, remote-recovery, request-id, runtime-attention, webrtc-framing, workspace-preferences. |
| `packages/team-client/AGENTS.md` | Local rules for this package. Read it before you edit. |
| Other modules | `routine-schedule*.ts`, `routine-calendar*.ts`, `routines-once.ts`, `usage-series.ts`, `profile-stats.ts`, `plan-limits.ts`, `dynamic-island-*.ts`, `live-activity-*.ts`, `push-notification-seal.ts`, `agent-tasks.ts`, `stored-files.ts`, `workflow-decoding.ts`, `crm-decoding.ts`, `file-upload.ts`, `file-download.ts`, `browser-view.ts`, `marketplace-catalog.ts`, `sync-profile.ts`, `profile-save.ts`, `team-api-requests.ts`, `team-admin-requests.ts`, `hosted-server-wake.ts`, `remote-path-check.ts`, `remote-account-refresh.ts`, `request-id.ts`, `retry-operation-id.ts`. |

Consumers (counted by import): `apps/mobile` (100 files), `src/renderer` (65), `src/main` (30), `packages/ui` (21), `src/backend` (12), `apps/browser-extension` (12).

### packages/telemetry (`@codebot/telemetry`)

| Path | What it owns |
| --- | --- |
| `packages/telemetry/src/events.ts` | Schemas: `CauseCode`, `Operation`, `NotificationMetadata`, `FailureProperties`, `Report`. Functions: `safeReport`, `safeProperties`, `classifyFailure`, `httpStatusCause`, `structuredCause`, `operationForCode`, `isCauseCode`, `isReportProfileId`. Const `ANALYTICS_GENERATIONS` (desktop_host 22, desktop 14, web 2, mobile 5). |
| `packages/telemetry/src/queue.ts` | `ReportQueue` (class). Local queue of reports with a lock. `REPORT_LIMIT` (1,000), `REPORT_BYTES` (1 MiB), `REPORT_TTL` (7 days). `ReportStorage` (interface) and `ReportTransport` (type). `TelemetryFailure`, `telemetryIO`. |
| `packages/telemetry/src/transport.ts` | `openPanelTransport(options)`. Posts `type: "track"` to `https://analytics.openbot.run/api/track` (default endpoint). Accepts HTTP 200 or 202 as success. |
| `packages/telemetry/src/node.ts` | `fileReportStorage(path)`. Writes JSON with mode 0600 through a `.tmp` file and rename. |
| `packages/telemetry/src/browser.ts` | `indexedReportStorage(name)`. IndexedDB store, guarded by `navigator.locks`. |
| `packages/telemetry/src/install-id.ts` | `newAnalyticsInstallId`, `currentAnalyticsInstallId`. Install ID expires after 395 days. |
| `packages/telemetry/src/analytics-region.ts` | `analyticsOnByDefault(countryCode, timeZone)`. A fixed list of country and time zone pairs where analytics starts on. |
| `packages/telemetry/src/index.ts` | Root barrel. |

Wiring: `src/main/application-services.ts` (around line 3710) builds a `ReportQueue` with `openPanelTransport`. `src/renderer/src/error-reports.ts` builds one too, with a client ID hard-coded in that file (public ID, not copied here).

Event definitions and the event catalogue live in `ANALYTICS.md` (root). This package only holds the failure report shape.

### packages/user-errors (`@codebot/user-errors`)

| Path | What it owns |
| --- | --- |
| `packages/user-errors/src/index.ts` | `classifyUserError(error)` returns a `UserErrorKind` (`auth`, `permission`, `file-permission`, `rate-limit`, `network`, `timeout`, `storage`, `not-found`, `read-only`, `conflict`, `service`, `clock`, `interrupted`, `unknown`). `userErrorMessage(error, fallback, locale)`, `userErrorDetails(error, fallback, locale)`. Copy keys `error.kind.*` come from `@codebot/i18n/source`. |
| `packages/user-errors/src/reference.ts` | `errorReference`, `referenceFrom`, `safeReference`, `referenceCarrierName`, `errnoCode`, `normalizeMessage`, `NETWORK_MESSAGE`. Builds short references such as `network/fetch`, `errno/ENOSPC` or `http/503`. |

### packages/whatsapp (`@codebot/whatsapp`)

| Path | What it owns |
| --- | --- |
| `packages/whatsapp/README.md` | Why the package is a fork. Clean-room rules for `src/signal/`. Checks to run. |
| `packages/whatsapp/vendor/baileys/` | Baileys v7.0.0-rc14, patched. `CODEBOT-PATCHES.md` lists every change. License MIT. |
| `packages/whatsapp/vendor/baileys/types/` | Declarations made by `bun run vendor:types` (script `scripts/build-vendor-types.ts`). |
| `packages/whatsapp/src/signal/` | CodeBot's own Signal Protocol code (`session-cipher.ts`, `session-builder.ts`, `group-cipher.ts`, `sender-key-record.ts`, `curve.ts`, `kdf.ts`, `crypto.ts`, `protobuf.ts` and others). PolyForm Noncommercial. |
| `packages/whatsapp/src/signal-repository.ts` | `makeCodeBotSignalRepository(...)`. Plugged into the fork instead of libsignal. |
| `packages/whatsapp/src/auth-store.ts` | `WhatsAppAuthStore` (class), `newStoreKey`, `WhatsAppStoreLocked`, `WhatsAppStoreUnreadable`. One linked device. Uses `node:sqlite` (`DatabaseSync`), WAL, exclusive locking. Values are sealed with AES-256-GCM. |
| `packages/whatsapp/docs/signal-protocol-notes.md` | Facts-only spec for `src/signal/`. Holds no code. |
| `packages/whatsapp/test-vectors/*.json` | Known-answer data (sender keys, session out-of-order, session pkmsg, signatures, x25519). |
| `packages/whatsapp/scripts/build-vendor-types.ts` | Builds `vendor/baileys/types/`. |

Connector code that uses this package: `src/backend/messaging/whatsapp/` (9 files import it), plus `src/main/application-services.ts`. See `docs/messaging.md` for the connector.

### remote/ (Signal and TURN control plane)

| Path | What it owns |
| --- | --- |
| `remote/README.md` | Main design doc: flow, tickets, Slack, GitHub, Discord, Telegram, sleeping hosted servers, production requirements, two Signal machines, TURN relays. |
| `remote/compose.yaml` | Production Compose project `codebot-remote`. Services: `acme`, `remote-api`, `coturn` (host network), `capacity-report` (host network). |
| `remote/compose.dev.yaml` | Dev Compose project `codebot-remote-dev`. `remote-api` on port 8081, `coturn` with TURN range 49152-49252. |
| `remote/.env.example` | Names and placeholder values for every variable. Do not copy real values into git. |
| `remote/.env.production` | Dotenvx-encrypted production values. Read the key names only. Decrypt through `remote/bin/dotenvx`. |
| `remote/api/src/index.ts` | Process start. Health routes `/health/live`, `/health/ready` and `/metrics` on the health port (8080). `/metrics` needs `Authorization: Bearer <REMOTE_METRICS_TOKEN>`. |
| `remote/api/src/app.ts` | Elysia app. Routes: `GET /health/turn`, `POST /internal/auth-events`, WebSocket `/v1/signal`, and the Slack, GitHub, Telegram, Discord and webhook routes. Metrics names `codebot_remote_*`. |
| `remote/api/src/config.ts` | Parses the env variables into `RemoteApiConfig` (`entry`, `signalId`, `turnHosts`, `turnPort`, `turnSecret`, and others). |
| `remote/api/src/signal-service.ts` | `SignalService` (class, about 1,760 lines). Socket admission, host and client hello, SDP and ICE relay, TURN credential handout, resume tokens, rate windows, `MAXIMUM_SOCKETS_PER_HOST` (4), `TURN_CREDENTIAL_REUSE_MILLISECONDS` (5 min), `SIGNAL_HELLO_DEADLINE_MILLISECONDS` (30 s). |
| `remote/api/src/tokens.ts` | `RemoteTokenService` (class). Verifies ES256 tickets through JWKS. Issues and checks resume tokens (`RESUME_TTL_SECONDS` = 10 min). `iceServers(claims)` makes TURN credentials. The Context service `SignalTokens` that wraps it is in `signal-service.ts`. |
| `remote/api/src/entry.ts` | `SignalEntry` (class). Entry-name rule for two Signal machines (`SIGNAL_ENTRY_HOST`, `SIGNAL_PUBLIC_IPV4`). Checks DNS every 30 s by default. |
| `remote/api/src/turn-relays.ts` | `TurnRelays` (class). Picks one TURN host for each host ID by SHA-256 rendezvous. Probes each relay every minute. |
| `remote/api/src/turn-probe.ts` | `probeTurnAllocation(host, config)`. Makes a real STUN/TURN Allocate with a short-lived credential. Error code 486 means full. |
| `remote/api/src/ingress-queue.ts` | Sealed queue for sleeping hosted servers. Limits: 10 min TTL, 64 events and 192 KiB per host. |
| `remote/api/src/discord-*.ts`, `telegram.ts`, `protocol.ts`, `capacity-report.ts` | Messaging routes, protocol helpers, and the `capacity-report` process (sends `signal_capacity` to OpenPanel every 5 min). |
| `remote/api/Dockerfile` | Bun image. Final stage copies only `packages/contracts`, `packages/i18n` and `remote/api`. Entry: `bun src/index.ts`. Exposes 8443. |
| `remote/coturn/Dockerfile` | Base `coturn/coturn:4.17.2-r0`. Copies `turnserver.conf` and `entrypoint.sh`. |
| `remote/coturn/turnserver.conf` | coturn settings: ports 3478 and 5349, relay range 16384-65535, `use-auth-secret`, `total-quota=40000`, `user-quota=64`, denied peer ranges, Prometheus on 127.0.0.1:9641. |
| `remote/coturn/entrypoint.sh` | Checks `TURN_SHARED_SECRET` (at least 32 bytes), writes `/tmp/codebot-turnserver.conf`, appends `static-auth-secret`, `external-ip`, `realm`, optional port range and TLS cert. Signals: TERM stop, USR1 drain, USR2 cert reload. Checks the cert hash every 300 s. |
| `remote/acme/renew.sh` | `lego` with the Cloudflare DNS challenge for `SIGNAL_DOMAIN`, `TURN_DOMAIN` and `ACME_EXTRA_DOMAINS`. Sets group `ACME_CERTIFICATE_GROUP_ID` (default 2000) on the certs. |
| `remote/nginx/` | `signal.codebot.run.conf`, `codebot-remote-nginx-reload.path` and `.service` (reload Nginx after cert renewal). |
| `remote/scripts/check.ts` | Runs `remote/api` checks and `docker compose config` on both compose files. `--compose` skips the API check. |
| `remote/scripts/update.ts` | Builds `remote-api`, `capacity-report` and `coturn`. Drains coturn (USR1), waits, recreates it. |
| `remote/scripts/protocol-e2e.ts` | Protocol end-to-end test (root script `test:remote-protocol`). |
| `remote/bin/dotenvx` | Wrapper for the Dotenvx CLI in `node_modules`. Uses the pinned Node if present. |
| Contracts (outside scope, used by remote) | `packages/contracts/src/signal-protocol/messages.ts` (message types, error codes, TTL constants), `decode.ts`, `ticket.ts`, `*-route.ts`, `ingress-queue.ts`, `discord-api.ts`, `auth-events.ts`. |

### docker/

| Path | What it owns |
| --- | --- |
| `docker/Dockerfile` | Image build. Base `ubuntu:24.04` pinned by digest (ARG `BASE`). Extracts `CodeBot.AppImage` from the build context, reads `packages.txt` and `optional-packages.txt` from the AppImage's `resources/hosting/`, and copies the app to `/opt/CodeBot/app`. User `codebot` (UID 1000), home `/data`. `tini` is PID 1. |
| `docker/compose.yaml` | Single-container Compose: image `ghcr.io/nightly-labs/openbot:latest`, `seccomp=./seccomp.json`, `no-new-privileges`, `shm_size: 1g`, `stop_grace_period: 60s`, volume `codebot-data:/data`. |
| `docker/seccomp.json` | Docker default seccomp profile plus a rule that allows `clone` and `unshare` flags (for the Electron sandbox). |
| `docker/instances/codebot-instance` | Bash script (about 880 lines). Commands: `setup`, `create`, `list`, `up`, `down`, `restart`, `logs`, `upgrade [--all]`, `update-request`, `backup`, `verify`, `restore`, `backups`, `run`. |
| `docker/instances/compose.yaml` | Instance Compose with `CODEBOT_NAME`, `CODEBOT_CPUS`, `CODEBOT_MEM` (required), `CODEBOT_TAG` (default `latest`), `CODEBOT_TMP` (default `8g`). Read-only root, tmpfs folders, syslog log driver. |
| `docker/instances/codebot-firewall` and `.service` | iptables chain `CODEBOT-EGRESS` in `DOCKER-USER`, and rules for the `codebot` bridge. Runs before Docker. |
| `docker/instances/codebot-instance-update@.path` and `.service` | Watches `/srv/codebot/<name>/update-requests/update-stage` and `update-install`, and runs `codebot-instance update-request <name>` (the `.service` ExecStart). |
| `docker/instances/codebot-instance-backup@.service` and `.timer` | Scheduled backups. |
| `docker/instances/codebot-logrotate*`, `codebot-rsyslog.conf` | Log files `/var/log/codebot/<program name>.log` (rsyslog template in `codebot-rsyslog.conf`; the exact program name per container is unverified), daily or 200 MB rotation, 30 files kept. |
| `docker/instances/codebot-sysctl.conf`, `docker-codebot.conf`, `lxcfs-codebot.conf`, `lxcfs.yaml` | Host sysctl, Docker drop-in ordering, LXCFS for CPU and memory views. |
| `docker/umbrel/codebot/` | Umbrel app: `docker-compose.yml` (has placeholders `__VERSION__`, `__DIGEST__`, `__APP_ID__`), `umbrel-app.yml`, `hooks/pre-start`. Sets `CODEBOT_SETUP_PAGE_PORT=8080`. |

### nix/ and flake.nix

| Path | What it owns |
| --- | --- |
| `flake.nix` | Flake with `nixpkgs-unstable`. Systems: `x86_64-linux`, `aarch64-linux`, `aarch64-darwin`. Outputs `packages.<system>.codebot` and `default`, `overlays.default`, `formatter` (nixfmt). Allows unfree only for `codebot`. |
| `nix/package.nix` | Builds the package. Linux uses `appimageTools.extract` and `buildFHSEnv`, and removes `resources/remote-desktop-runtime`. Darwin unzips the zip asset. License PolyForm Noncommercial 1.0.0, `free = false`. |
| `nix/sources.json` | `version` (currently 0.78.0) and per-system `assets` (file name and hash). Lists `x86_64-darwin` too, which the flake does not build. |

### docs for this area

| Path | What it owns |
| --- | --- |
| `docs/self-hosting.md` | Run your own account service (Cloudflare Worker), Signal and TURN. Steps 1 to 4 and updates. |
| `docs/self-hosted-server.md` | Linux server install (`scripts/install-server.sh`), server claims, `codebot` commands, control socket, Hermes install, display size, Not confirmed list. |
| `docs/docker.md` | Container run, network, tags, data paths, instances, backups, updates, memory, environment variables, security, limits. |
| `docs/self-hosting.md` | Self-hosted Signal and TURN setup. The former `docs/remote-session-deployment.md` is deleted. |

## How it works

### Remote connection path (WebRTC, as implemented in team-client)

1. The app signs in through the account Worker (`api.openbot.run`, or a self-hosted one). The app keeps the session.
2. `RemoteTeamDirectoryClient.startSession(hostId)` creates a session. `#ticket(sessionId, clientPublicKey)` calls `POST /v2/remote/sessions/<id>/ticket` and gets `signalUrl` and a signed ticket.
3. The host and the client open `WSS /v1/signal` (see `remote/README.md`, Flow). Signal checks the ES256 ticket with JWKS (`tokens.ts`).
4. `createRemoteTeamPeer` (in `remote-peer.ts`) sends a `hello`. Signal replies with `ready`, and the TURN `iceServers`. Signal then relays `offer`, `ice-candidate`, `ice-restart` and `turn-refresh` messages. Message types are in `packages/contracts/src/signal-protocol/messages.ts`.
5. The client makes an `RTCPeerConnection` with `bundlePolicy: "max-bundle"` and creates ordered data channels. Channel keys come from `TEAM_PROTOCOL_V2_CHANNELS` in `packages/contracts/src/team-protocol/webrtc-framing.ts` (`rpc`, `events`, `files`; labels `codebot-team-v2-rpc`, `codebot-team-v2-events`, `codebot-team-v2-files`). The desktop channel label is `codebot.remote-desktop.signal.v1`.
6. The client pins the host public key by fingerprint and follows signed handovers (`host-key-handover.ts`, `RemoteTeamDirectoryClient.#trustedHostKey`). `remote-peer.ts` imports `teamProtocolV2AuthenticationTranscript` for the peer authentication step. The exact signing and check order is unverified here.
7. Large payloads go through `encodeTeamWebRtcPayload`. Frames are 17-byte headers (magic `0x4f425732`, message ID, total bytes, offset, type). The decoder keeps at most 16 assemblies, 8 MiB buffered, and drops them after 30 s.
8. ICE picks a direct path, or `relay` through coturn. Cloudflare is not on the data path.

### Timers and limits (client side, `remote-peer.ts`)

- `SIGNAL_IDLE_CLOSE_MS` = 120 s. `DEFAULT_RECONNECT_GRACE_MS` from `SIGNAL_DEFAULT_RECONNECT_GRACE_MS` = 30 s. `SUSPEND_MARGIN_MS` = 10 s.
- `REMOTE_PEER_LOST_AFTER_MS` = idle close (120 s) + reconnect grace (30 s) + suspend margin (10 s), so 160 s with the default grace. The live value per peer uses the grace in `state.reconnectGraceMs`.
- TURN credentials last `SIGNAL_TURN_CREDENTIAL_TTL_SECONDS` = 3,600 s. The client asks for a refresh every `SIGNAL_TURN_REFRESH_INTERVAL_MS` (75% of TTL, 45 min). Its ICE servers are reused for half the TTL (`ICE_SERVERS_REUSE_MS`, 30 min).
- Signal message limit: `SIGNAL_MESSAGE_BYTES_LIMIT` = 64 KiB.
- Reconnect backoff: `signalRetryDelay` (first try 0.5 to 4 s, then exponential up to 30 s).
- Signal errors have a fixed list: `authentication_required`, `invalid_message`, `host_unavailable`, `host_busy`, `permission_denied`, `rate_limited`, `session_revoked`, `protocol_error` (`SIGNAL_ERROR_CODES`).

### Recovery (`remote-recovery.ts`)

- `createRemoteConnectionRecovery` retries with a delay that doubles from `REMOTE_RETRY_INTERVAL_MS` (2 s): 2 s, 4 s, 8 s, 16 s. Each delay gets up to 20% random jitter. After `REMOTE_RETRY_LIMIT` (5) attempts the phase is `cooldown` and the wait is `REMOTE_RETRY_COOLDOWN_MS` (30 s). Then the attempt count resets.
- Failure stage is one of `RemoteConnectionStage`. `remoteConnectionFailureDetails` gives a message and a reference from `@codebot/user-errors/reference`.

### Signal server (`remote/api`)

- Process start: `remote/api/src/index.ts` and `app.ts` create and wire `SignalService`, `SignalTokens`, `TurnRelays` and `SignalEntry` (construction order not read in full).
- Admission: host and client sockets open with a `hello` message (`packages/contracts/src/signal-protocol/messages.ts`). Tickets are checked in `tokens.ts`. Limits: `REMOTE_MAX_CONNECTIONS_PER_USER` (default 32), `REMOTE_MAX_CONNECTIONS_PER_IP` (32), `REMOTE_MAX_MESSAGES_PER_MINUTE` (600). A host keeps at most 4 sockets.
- Resume: a resume token is valid for 10 min. Signal caches it in memory. After a restart the cache is empty, so the first reconnect makes one signed call to the control plane (`REMOTE_CONTROL_PLANE_URL`).
- TURN credentials (`tokens.ts`, `iceServers`): username `<expiry-unix-seconds>:<sessionId>`, password is the base64 HMAC-SHA1 of the username with `TURN_SHARED_SECRET`. This is the coturn REST auth model (`use-auth-secret`). Returned URLs: `stun:`, `turn:` UDP and TCP on `TURN_PORT`, `turns:` on `TURN_TLS_PORT`.
- Relay choice: `TurnRelays.pick(hostId)` hashes each available relay with the host ID and picks the highest score. A host and its clients get the same relay. A peer gets one relay.
- Relay health: each relay is probed once a minute by a real Allocate (`turn-probe.ts`). `/health/turn` reports only the relay of `TURN_HOST` (cached 1 min). Metric `codebot_remote_turn_relay_available{host=...}` shows each relay.
- Two Signal machines: `SignalEntry` (`entry.ts`) resolves `SIGNAL_ENTRY_HOST` and checks whether `SIGNAL_PUBLIC_IPV4` is in the answer. Two misses in a row end the entry role. Metric `codebot_remote_signal_entry` shows 1 or 0.
- Sleeping hosted servers: `ingress-queue.ts` keeps sealed events for at most 10 min, 64 events and 192 KiB per host, when the host has sent a queue key.
- Restart behavior: Signal has no database. Rooms and presence exist only in memory. Replacing Signal closes its WebSocket sockets. Existing WebRTC data channels stay up (`remote/README.md`, `docs/self-hosting.md`).

### Coturn (`remote/coturn`)

- Runs with `network_mode: host` in production Compose, so the firewall applies to it.
- The entrypoint writes `/tmp/codebot-turnserver.conf` from the base config, then appends the secret, realm, external IP and optional port range. Without a TLS cert it adds `no-tls` and `no-dtls`.
- Each allocation uses one UDP port from the relay range. Range 16384-65535 gives 49,152 ports. `total-quota=40000` stays below that.
- Drain: `remote/scripts/update.ts` stops new allocations (SIGUSR1) and waits. Cert reload uses SIGUSR2.

### Docker (`docker/`)

- Single container: `tini` (PID 1) starts `/opt/CodeBot/app/resources/hosting/codebot-container`. That script checks user namespaces, starts D-Bus, two Xvfb displays (`:0` for CodeBot, `:1` for agents and computer use), the keyring, then starts CodeBot with `CODEBOT_SERVER=1`.
- `/opt/CodeBot/hosted/mode` is `container`. The `codebot` command then uses the control socket, not systemd.
- Data lives in `/data` (volume). Config and DB are under `/data/.config/CodeBot`. Workspaces are under `/data/CodeBot`.
- Instances: `codebot-instance create <name> --cpus N --mem M --disk D` makes an ext4 image at `/srv/codebot/<name>/data.img`, mounts it at `/srv/codebot/<name>/data`, and writes `instances/<name>.env`. Its container is `codebot-<name>` on the `codebot` bridge (`172.30.0.0/16`, bridge `br-codebot`).
- Updates from the app: the container writes an empty `update-stage` or `update-install` file into its `update-requests` folder (`src/main/hosted-update-adapter.ts`). The path unit runs `codebot-instance update-request <name>` as root. How the container reads `update-status` is unverified.

### Linux server install (`docs/self-hosted-server.md`)

- `scripts/install-server.sh` downloads the latest release (`latest-linux.yml` on x86_64, `latest-linux-arm64.yml` on arm64), checks SHA-512, unpacks the AppImage, and runs `resources/hosting/codebot-server-setup`.
- The setup writes `self` to `/opt/CodeBot/hosted/mode`, links `/usr/local/bin/codebot`, installs `packages.txt` and `optional-packages.txt`, the AppArmor profile and systemd units.
- Sign-in: `sudo codebot login` (email code), or a one-time claim (`codebot login --claim`; the stdin read was not confirmed, unverified). Claims come from `POST /v2/server-claims` (app) or `POST /v2/admin/server-claims` (operator, needs admin token).
- Control socket `/run/codebot/control.sock` (mode 0600) with routes `GET /v1/status`, `POST /v1/login/start`, `POST /v1/login/verify`, `POST /v1/login/claim`, `POST /v1/name`, `POST /v1/mobile-connect`, `POST /v1/logout`.

### Nix

- `nix build .#codebot` (or `.#default`) fetches the release asset named in `nix/sources.json` for the current system. Linux runs the AppImage in an FHS environment, and the desktop file's `Exec=AppRun --no-sandbox %U` is changed to `Exec=codebot %U`.

## How to change it

### Add a Signal environment variable

1. Parse it in `remote/api/src/config.ts` (look for the `environment` object). Put a default there.
2. Add it to `remote/compose.yaml` under `remote-api.environment`. Use `${NAME:-}` for optional values, `${NAME:?...}` for required values.
3. Add the name (not a value) to `remote/.env.example`. Document it in `remote/README.md`.
4. Check: `bun run remote:check` (root script) and `bun run remote:check:compose`. For a local check, `bun remote/scripts/check.ts --compose` checks only the compose files.
5. For a production value, edit `remote/.env.production` through the Dotenvx wrapper (`remote/bin/dotenvx`, the exact edit command is unverified here). Check it with `bun run remote:env:validate`. Do not paste values into chat or docs. Production changes need approval (see `docs/self-hosting.md`).

### Add a Signal route or message

1. Add the wire type in `packages/contracts/src/signal-protocol/` (`messages.ts` for the message union, `decode.ts` for decoding). Bump the protocol only when an old client would break.
2. Handle it in `remote/api/src/signal-service.ts` (the `SignalService` class) and register any HTTP route in `remote/api/src/app.ts`.
3. Test with `bun run test:remote-protocol` (`remote/scripts/protocol-e2e.ts`).

### Add or move a TURN relay

1. Set `TURN_EXTRA_HOSTS` (comma-separated, names only) on the Signal machine that should use it. The new coturn must use the same `TURN_SHARED_SECRET` and TURN ports.
2. Open UDP 16384-65535 in the firewall of that machine (`ufw allow 16384:65535/udp comment 'CodeBot TURN relay UDP'`).
3. Check `/metrics` for `codebot_remote_turn_relay_available{host="<relay>"}` = 1.

### Change the TURN relay port range

1. Edit `min-port` and `max-port` in `remote/coturn/turnserver.conf`. For dev, set `TURN_MIN_PORT` and `TURN_MAX_PORT` (the entrypoint writes them too).
2. Open the new range in the firewall first (`docs/self-hosting.md`, coturn configuration).
3. Recreate coturn with the procedure in that doc. Do it in a quiet hour, one machine at a time.

### Add a team-client module

1. Create `packages/team-client/src/<name>.ts`. Keep it free of Electron, Node and DOM types, except WebRTC and `fetch`. Pass platform objects in as arguments.
2. Add `"./<name>": "./src/<name>.ts"` to `packages/team-client/package.json` `exports`.
3. Do not re-export `@codebot/contracts/team-protocol` from `index.ts` (see `packages/team-client/AGENTS.md`). Consumers import protocol symbols from their subpath.
4. Do not log tokens, tickets or message bodies.

### Change a shipped wire format (do not do this in place)

- Frames in `webrtc-framing.ts` belong to Team protocol v2. Older hosts and clients still use them. Put a change behind a new protocol version or capability in `packages/contracts/src/team-protocol/` (contract rules: `packages/contracts/AGENTS.md`).

### Add a redaction rule (logging)

1. Add a pattern near the other constants in `packages/logging/src/index.ts`. Add it to `applyTextRules` (text) or `redactKeyFormatsBeforeLabels` or `redactKeyFormatsAfterLabels` (key formats).
2. Add a case to `packages/logging/src/redaction.test.ts`.
3. Run `bun run --cwd packages/logging test` (vitest). Do not commit a real secret in a test; use the existing style of made-up values.

### Add a user error kind

1. Add the kind to `UserErrorKind` and the regex or code match in `classifyUserError` in `packages/user-errors/src/index.ts`.
2. Add the copy key to `USER_ERROR_COPY` (`error.kind.<name>`) and add the matching source message in `packages/i18n` (the catalogue file was not inspected; unverified).

### Add a telemetry failure code

1. Add the code to `CauseCode` in `packages/telemetry/src/events.ts`. Also add it to the private `FAILURE_CODES` set in the same file, which `safeProperties` uses to accept a failure code (otherwise it becomes `unknown`). Map `Operation` through `operationForCode`.
2. Update the event list in `ANALYTICS.md`. Each report carries `event_schema_version`, and `ANALYTICS_GENERATIONS` holds a generation number per surface.

### Self-host the account service, Signal and TURN

Follow `docs/self-hosting.md` in order:
1. Make the ticket key pair and the secrets (step 1).
2. Deploy the Worker from `apps/auth-api` with `scripts/deploy-auth-api.ts` (step 2).
3. Copy `remote/.env.example` to `remote/.env.self-hosted`, set your names and secrets, then `docker compose -f remote/compose.yaml --env-file remote/.env.self-hosted up -d --build` (step 3).
4. Start each app with `CODEBOT_AUTH_API_URL` and `CODEBOT_REMOTE_SIGNAL_URL` (step 4).

### Install the Linux server

Follow `docs/self-hosted-server.md`, section Install: `curl -fsSL .../scripts/install-server.sh | sudo bash`, then `sudo codebot login`. Options after `sudo bash -s --`: `--user`, `--auth-api-url`, `--display-size`, `--name`.

### Run CodeBot in Docker (single container)

1. Get `docker/compose.yaml` and `docker/seccomp.json` (from `main` or from a release tag).
2. `docker compose up -d`, then `docker compose exec codebot codebot login`.
3. Pin a version: change `image:` to `ghcr.io/nightly-labs/openbot:<version>`.

### Run several instances on one host

1. Copy `docker/` to the host (for example `/opt/codebot-docker`).
2. As root: `instances/codebot-instance setup`, then `create <name> --cpus N --mem M --disk D`, then `run <name> login`.
3. Upgrade: `codebot-instance upgrade <name>` (or `--all`). Backup: `codebot-instance backup <name> --verify`.

### Bump the Nix package to a new release

1. Edit `nix/sources.json`: set `version` and each asset `name` and `hash` for the four systems. (Procedure beyond this file is unverified.)
2. Check with `nix build .#codebot` (not run by this map).

### Bump Baileys

1. Follow `packages/whatsapp/vendor/baileys/CODEBOT-PATCHES.md` (copy upstream, reapply the patch list).
2. Run `bun run --cwd packages/whatsapp vendor:types`, then the checks in `packages/whatsapp/README.md`.
3. A live test with real phones is needed before a release that changes `src/signal/` or the vendor.

## Gotchas

### Names and scope

- "Signal" has two meanings. `packages/whatsapp/src/signal/` is the Signal Protocol (sessions, sender keys). `remote/api/src/signal-service.ts` and `packages/contracts/src/signal-protocol/` are the WebSocket relay for remote sessions. They are unrelated code.
- Clean-room rule: `packages/whatsapp/src/signal/` must not read libsignal or other GPL/AGPL code. Keep the spec-then-implementation split in `packages/whatsapp/README.md`.
- `packages/team-client` is shared with React Native (`apps/mobile`). Do not add a Node-only import there.

### Remote path

- Signal never stores tokens, SDP, ICE, file names or messages (`remote/README.md`). Rooms and presence are in memory. Restarting Signal drops them.
- A self-hosted Signal needs a self-hosted account service with its own ticket keys. A ticket from `openbot.run` does not open a self-hosted Signal, and the reverse (`docs/self-hosting.md`).
- Signal and TURN names must be DNS only. A Cloudflare proxy hides the real IP, and the entry rule and TURN clients need that IP (`remote/README.md`, Production requirements).
- Without UDP 16384-65535 open, relay connections are slow or fail (`remote/README.md`).
- The entry name (`SIGNAL_ENTRY_HOST`) must also be DNS only. `SIGNAL_ENTRY_HOST` and `SIGNAL_PUBLIC_IPV4` must be set together, or `config.ts` throws and Signal does not start. `SIGNAL_ID` is optional, but when set it must match `^[a-z0-9-]{1,32}$`.
- A relay that is full (quota 486) gives every new peer a failed connection. Watch `codebot_remote_turn_relay_available` and the `signal_capacity` event.
- `REMOTE_MAX_CONNECTIONS_PER_USER` must be changed on the Signal server. The desktop cannot change it.
- `remote/.env.example` contains production-looking defaults (`REMOTE_TICKET_JWKS_URL`, `REMOTE_CONTROL_PLANE_URL`, `TELEGRAM_WEBHOOK_ORIGIN` point to `openbot.run`). Change them for a self-hosted install.
- `remote/.env.production` is encrypted (Dotenvx). Do not pass it to `docker compose --env-file`, because Compose does not decrypt it. Use `remote:up` (Dotenvx wrapper). Do not make a new key pair.
- The nginx file name in `remote/README.md` is `nginx/signal.openbot.run.conf`, but the file in the repo is `remote/nginx/signal.codebot.run.conf`. Use the real file name (unverified which name the server uses).
- `remote/coturn/entrypoint.sh` appends `min-port` and `max-port` after copying `turnserver.conf`, but only when `TURN_MIN_PORT` and `TURN_MAX_PORT` are set (the dev compose sets them). Then the runtime file has duplicate keys. Which value coturn keeps is unverified.
- `/health/turn` makes a real allocation every minute (cached 1 min). It can briefly take a relay slot.
- The old deployment doc `docs/remote-session-deployment.md` was deleted; it held upstream hostnames. Production-like steps need separate approval.
- The remote API image copies only `packages/contracts` and `packages/i18n` into the final stage. This works because `remote/api/src` imports only those (checked by grep). Do not import other workspace packages in `remote/api` without updating `remote/api/Dockerfile`.

### team-client

- Frames in `webrtc-framing.ts` are a shipped format (Team protocol v2). Changing them breaks older hosts and clients.
- Host keys are pinned by fingerprint (first use). A changed key stops the connection unless a signed handover (`host-key-handover.ts`) links it. The pin store is passed in as `RemoteHostKeyStore`.
- Do not log tokens, tickets, or message bodies (`packages/team-client/AGENTS.md`).

### logging and user errors

- `createCodeBotLogger` writes `warn` and `error` to stderr. `CODEBOT_LOG_LEVEL` sets the level (default `info`).
- `registerSecretValue` ignores values shorter than 8 characters unless `allowShort: true`.
- `redactPostText` masks only whole tokens. Partial matches inside a longer word are kept (see `isWholeToken` in `index.ts`).
- `userErrorMessage` returns the fallback text for technical output (stack traces, paths, `SQLITE_` codes, JSON). Use `userErrorDetails` when you need the reference too.

### telemetry

- `analyticsOnByDefault` turns analytics on only for listed country and time zone pairs (US, PR, VI, GU, MP, AS, UM, MX, AU, NZ, JP). Other regions start off.
- `ReportQueue` uses `REPORT_TTL` (7 days), `REPORT_LIMIT` (1,000 reports) and `REPORT_BYTES` (1 MiB) as its local bounds.

### Docker

- `docker/Dockerfile` needs `CodeBot.AppImage` in the build context. The release workflow (`.github/workflows/release.yml`, around line 995) copies it to `image/CodeBot.AppImage`.
- The Dockerfile expects `resources/hosting/` inside the AppImage. In the repo, the scripts are in `scripts/hosting/` (for example `scripts/hosting/codebot-container`). How they get into the AppImage is unverified.
- Host networking (`network_mode: host`) removes isolation. Local listeners on `127.0.0.1` become reachable by other host programs. Do not use it with `docker/instances`, where the firewall covers only the bridge network.
- Without `seccomp.json`, the Electron sandbox fails. Do not use `seccomp=unconfined`, `--privileged` or `--no-sandbox`.
- `--shm-size 1g` is required. Chromium falls back to `/tmp` when shared memory is smaller.
- Container data is one unit: the keyring and its password file are in `/data`. Keep one volume for one container at a time.
- `latest` moves with each release. Pin a version for a controlled upgrade. Do not roll back to an older tag: the older release cannot open a newer database.
- Packages installed outside `/data` (for example `apt-get install`) are lost on an update. Install to `~/.local` as the `codebot` user.
- `CODEBOT_DISK` in `instances/<name>.env` is information only. It does not change the image size; use the resize steps in `docs/docker.md`.
- Remote desktop and Computer Use were not tested in the container, and the arm64 release has no remote desktop runtime (`docs/docker.md`, Limits).
- Docs claim Ubuntu 26.04 tests, Debian tests and other results (see the Not confirmed sections in `docs/self-hosted-server.md` and `docs/docker.md`). Those are doc claims, not checked here (unverified).

### Nix

- `nix/sources.json` lists `x86_64-darwin`, but `flake.nix` builds only `x86_64-linux`, `aarch64-linux` and `aarch64-darwin`. The entry is unused by the flake.
- The package is not free software (`free = false`). `flake.nix` allows it through `allowUnfreePredicate` for `codebot` only.
