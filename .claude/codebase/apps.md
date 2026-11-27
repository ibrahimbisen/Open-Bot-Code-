# apps/ map

Scope: `apps/` in the CodeBot repo (CodeBot fork). Read-only map for coding agents. Facts come from files read on the day of writing. Items marked (unverified) were not confirmed.

## What this area is

- `apps/` holds the deployable surfaces of CodeBot: the account API (`auth-api`), the phone app (`mobile`), its over-the-air update server (`mobile-updates`), the public site host (`site-router`), the status page (`status`), the browser extension (`browser-extension`), and three chat-bot folders that hold only settings (`slack-app`, `discord-app`, `telegram-app`).
- The account API never stores chats, files or commands. It holds accounts, avatars, host configuration, memberships, invitations and sessions.
- The phone and extension talk to the account API and to Signal (`remote/api`, outside this scope). Hosts (the desktop CodeBot server) do the agent work.
- Only `auth-api` and `mobile` hold large code trees. The other folders are small Workers, one static page, or docs.

## Key files

| Path | What it owns |
| --- | --- |
| `apps/auth-api/AGENTS.md` | Rules for the account Worker: LAN dev allowlist, D1 migration race, Worker `fetch` binding rule, outbox rule. Read first. |
| `apps/auth-api/README.md` | Local dev, `.env.dev` / `.codebot/dev-state.json` load order, Stripe sandbox bootstrap, credits endpoints. |
| `apps/auth-api/package.json` | Scripts: `dev`, `build`, `preview`, `deploy`, `deploy:test`, `db:migrate:local`, `db:migrate:remote`, `test`, `typecheck`, `stripe:bootstrap`, `env:validate:prod`. |
| `apps/auth-api/wrangler.jsonc` | Worker name `codebot-auth-api`, entry `src/worker-entry.ts`, D1 `DB` (`codebot-auth`), R2 `AVATARS`, `SKILLS`, `SITES`, service bindings, cron triggers, rate limiter bindings, required secret names. |
| `apps/auth-api/vite.config.ts` | Vite + `@cloudflare/vite-plugin` + TanStack Start. Dev server uses `CODEBOT_API_PORT` and `CODEBOT_API_HOST`. |
| `apps/auth-api/vitest.config.ts` | Test glob `test/**/*.test.ts`, node environment. |
| `apps/auth-api/src/worker-entry.ts` | Default export: `createWorkerHandler(startHandler.fetch)`. |
| `apps/auth-api/src/server/worker-handler.ts` | `createWorkerHandler`: `fetch` and `scheduled`. Canonical host redirect, billing return, local hosted-site serve, marketplace rate limit, then the TanStack Start handler. Cron: signal-entry failover, retention prune, remote auth event delivery. |
| `apps/auth-api/src/server/auth-service.ts` | `class AuthService` (Effect.fn methods, see below). Constants `CHALLENGE_TTL_MS` (10 min), `TEAM_TICKET_TTL_MS` (2 min), `SERVER_CLAIM_TTL_MS` (15 min). |
| `apps/auth-api/src/server/d1-auth-repository.ts` | `class D1AuthRepository implements AuthRepository` and `mobileSessionStatements`. All D1 SQL for auth lives here. |
| `apps/auth-api/src/server/types.ts` | `interface AuthRepository` (line ~241) and `WorkerBindings`. |
| `apps/auth-api/src/server/request-auth.ts` | `requestAuthService`, `apiError`, `json`, `authErrorResponse`. Use these in route files. |
| `apps/auth-api/src/server/crypto.ts` | `sha256` and HKDF/HMAC helpers. Hashes codes and tokens before storage. |
| `apps/auth-api/src/server/effect-runtime.ts` | `runApiEffect`, `runApiResponse`. Wraps Effect programs for route handlers. |
| `apps/auth-api/src/server/json-body.ts` | `readJsonObject`. Throws `SyntaxError` on bad JSON. |
| `apps/auth-api/src/server/source-ip.ts` | `requestSourceIp`. Used for rate limits and audit. |
| `apps/auth-api/src/server/runtime-env.ts` | Local runtime variable loading (`readLocalRuntimeVars`). |
| `apps/auth-api/src/server/hosted-*.ts`, `boat-client.ts` | Hosted server (VM) lifecycle, pool, archives, site hosting, boat API client. |
| `apps/auth-api/src/server/billing-*.ts`, `stripe-client.ts`, `license-service.ts`, `credit-*.ts` | Stripe billing, licenses, credit wallets, credit codes and media. |
| `apps/auth-api/src/server/slack-app.ts`, `discord-app.ts`, `signal-entry-failover.ts`, `remote-control-plane.ts` | Chat-app routes, Signal entry, remote control plane. |
| `apps/auth-api/src/routes/` | TanStack file routes. 289 `.ts`/`.tsx` files total. Path = URL. 164 files under `v1/` and `v2/`. |
| `apps/auth-api/src/routes/v1/auth/` | Web sign-in: `email/start.ts`, `email/verify.ts`, `company/start.ts`, `company/callback.ts`, `company/exchange.ts`, `logout.ts`. |
| `apps/auth-api/src/routes/v1/mobile-auth/` | Phone sign-in: `email/verify.ts`, `redeem.ts`, `session.ts`, `devices.ts`, `devices/$sessionId.ts`, `ticket.ts`, `link.ts`, `company/exchange.ts`. |
| `apps/auth-api/src/routes/v1/me/` | Signed-in account: `profile.ts`, `avatar.ts`, `chat-color.ts`, `activity.ts`, `analytics.ts`, `referrals.ts`, `billing/`, `credits/`, `license/`. |
| `apps/auth-api/src/routes/v1/` (other) | `agent-templates/`, `marketplace/`, `skills/`, `sites/`, `team-auth/`, `team-hosts/`, `team-invitations/`, `team-tunnels/`, `stripe/`, `github/`, `near/`, `media/`, `feedback/`, `browser-extension/`. |
| `apps/auth-api/src/routes/v2/` | `remote/` (hosts, sessions, invites, owner transfers, Discord and Slack route tickets), `hosting/`, `server-claims/`, `slack/`, `discord/`, `admin/`. |
| `apps/auth-api/src/routes/api/browser/$.ts` | Browser API catch-all for the extension. |
| `apps/auth-api/src/routes/[.]well-known/` | Well-known files. |
| `apps/auth-api/src/routes/health/` | Health route. |
| `apps/auth-api/migrations/` | 78 D1 SQL files, `0001_google_auth.sql` to `0076_near_wallet_agents.sql` plus two `0034_*` and two `0071_*` files. Latest listed: `0076_near_wallet_agents.sql`. |
| `apps/auth-api/test/sqlite-d1.ts` | `migratedDatabase(last?)` and `migration(name)`. Applies migrations to `node:sqlite` in memory. |
| `apps/auth-api/test/*-migration.test.ts` | One test per migration family. Also `dev-network-access.test.ts`, `observed-d1-log-redaction.test.ts`. |
| `apps/auth-api/scripts/*-e2e.ts` | Scripts, not vitest files (for example `cloud-authorization-e2e.ts`, `credits-e2e.ts`, `hosted-start-wait-e2e.ts`). |
| `apps/auth-api/scripts/` | Operator tools: `credit-codes.ts`, `credit-audit.ts`, `keep-previous-assets*.ts`, `mobile-connected-devices-server.ts`. |
| `apps/auth-api/dev-network-access.ts` | `developmentNetworkRequestAllowed`. LAN allowlist for phones during dev. Set `MOBILE_LAN_PATHS`. |
| `apps/auth-api/dev-apns-proxy.ts` | Dev proxy for APNs. |
| `apps/auth-api/content-images.ts`, `render-content-images.ts`, `renderer-preview-alias.ts` | Build-time content image rendering. |
| `apps/auth-api/src/content/`, `src/components/` | Marketing pages, guides, compare pages, legal pages, changelog, download pages, teams page (SolidJS components). |
| `apps/auth-api/src/lib/` | Shared page helpers: `site-paths.ts`, `request-locale.ts`, `landing-route.ts`, `marketplace-routes.ts`, `plugins.ts`, `credits-catalog.ts`. |
| `apps/auth-api/.env.example`, `.env.dev`, `.env.production` | Env files. Do not copy values. `.env.dev` and `.env.production` are encrypted with dotenvx. |
| `apps/mobile/AGENTS.md` | Phone rules: check limits, HeroUI-first UI, native chrome, catalog text keys, sheet rules. Read first. |
| `apps/mobile/README.md` | Expo SDK 58, Bun 1.4.2, Node 24, hoisted linker, patches list, Expo Go notes. |
| `apps/mobile/DESIGN.md` | UI design system. Read before any UI change. |
| `apps/mobile/app.json` | Expo config. Over-the-air updates are off (`updates.enabled` false). No associated domain. |
| `apps/mobile/app.config.js` | Adds `googleServicesFile` when `google-services.json` exists. |
| `apps/mobile/package.json` | Name `@codebot/mobile`, version 1.4.14, entry `expo-router/entry`. Scripts: `start`, `ios`, `android`, `lint`, `codegen`, `typecheck`, `doctor`. |
| `apps/mobile/eas.json` | Build profiles. Sets `EXPO_PUBLIC_APP_ENV` to `development`, `preview`, `production`. |
| `apps/mobile/src/app/` | Expo Router routes. `_layout.tsx`, `index.tsx`, `incoming-link.tsx`, `incoming-share.tsx`, `scan-qr-code.tsx`, `+native-intent.tsx`. `(app)/` holds about 50 screen folders. |
| `apps/mobile/src/app/(app)/_layout.tsx` | Route options for the signed-in app. Sheet presentation is set here. |
| `apps/mobile/src/features/` | Feature folders: `agents`, `analytics`, `app-lock`, `app-update`, `auth`, `background-refresh`, `browser`, `channels`, `chat`, `links`, `live-activity`, `marketplace`, `onboarding`, `push-notifications`, `quick-actions`, `rating-ask`, `remote-desktop`, `search`, `servers`, `settings`, `share`, `shortcuts`, `support`, `voice`, `workflows`, `workspace`. |
| `apps/mobile/src/features/auth/api/mobile-auth.ts` | Phone auth client. Exports `redeemMobileConnectUrl`, `startMobileEmailSignIn`, `verifyMobileEmailCode`, `signInMobileWithCompany`, `readMobileSession`, `validateMobileSession`, `listMobileAccountSessions`, `revokeMobileAccountSession`, `updateMobileProfile`, `logoutMobileSession`, `requestMobileAccount`. Class `MobileEmailSignInError`, `MobileSessionExpiredError`. |
| `apps/mobile/src/features/auth/model/` | `use-email-sign-in.ts`, `company-sign-in-return.ts`, `development-connect-link.ts`. |
| `apps/mobile/src/shared/lib/` | Shared helpers: `text.ts` (`currentText`), `mobile-features.ts`, `platform.ts`, `query-client.ts`, `haptics.ts`, `network-path.ts`, `use-app-active.ts`, and others. |
| `apps/mobile/src/shared/components/` | Shared UI. |
| `apps/mobile/src/shims/` | Module shims. |
| `apps/mobile/src/uniwind-types.d.ts`, `apps/mobile/global.css` | Theme aliases (generated by `codegen`). |
| `apps/mobile/modules/` | Local Expo native modules: `android-notifications`, `app-icon`, `app-lock`, `background-refresh`, `composer-paste`, `content-capture`, `quick-actions`, `remote-viewer-proxy`, `share-extension`, `share-files`, `shortcuts`, `speech`, `theme-snapshot`. |
| `apps/mobile/plugins/` | Expo config plugins (`with-*.js`, `notification-service`, `share-extension`, `shortcuts`). |
| `apps/mobile/changelog.d/`, `CHANGELOG.md`, `release-announcement.json` | Release notes source and output. |
| `apps/mobile/fastlane/Fastfile` | iOS/Android lane definitions (unverified in detail). |
| `apps/mobile/.claude/settings.json` | Local Claude settings for the app. |
| `apps/mobile-updates/README.md` | Describes the OTA Worker. Routes, bucket layout, security model, cache times, rollout. |
| `apps/mobile-updates/src/index.ts` | Worker `default` export. `routeRequest` (Effect). `GET /manifest`, `GET /assets/<hash>`, `GET /`. Cache: `codebot-mobile-updates-v1`. Asset cache-control `public, max-age=31536000, immutable`. |
| `apps/mobile-updates/src/protocol.ts` | Constants and types: `UPDATE_PLATFORMS`, `CHANNEL_PATTERN`, `RUNTIME_VERSION_PATTERN`, `ASSET_HASH_PATTERN`, `SIGNING_KEY_ID` (`main`), `SIGNING_ALGORITHM` (`rsa-v1_5-sha256`). Functions `assetKey`, `updateKey`, `pointerKey`, `decodeStoredUpdate`, `decodeUpdatePointer`, `rolloutBucket`. Types `StoredUpdate`, `StoredDirective`, `PointerTarget`, `UpdatePointer`. |
| `apps/mobile-updates/scripts/mobile-ota-e2e.ts` | End-to-end check for the OTA flow. |
| `apps/mobile-updates/wrangler.jsonc` | Worker `codebot-mobile-updates`, entry `src/index.ts`, R2 binding `UPDATES` (private bucket). No write route. |
| `apps/site-router/README.md` | One-time Cloudflare setup, release order, three launch flags, admin block endpoint. |
| `apps/site-router/src/index.ts` | `routeRequest` (Effect), `resolveFile`, `assetResponse`, `errorPage`, `acceptsHtml`, `secureHeaders`. Serves `*.codebot.example`. Read-only (`get` only). |
| `apps/site-router/wrangler.jsonc` | Worker `codebot-site-router`, route `*.codebot.example/*`, R2 binding `SITES`, var `ACCOUNT_ORIGIN`. |
| `apps/site-router/r2-lifecycle.json` | Lifecycle rule for the sites bucket (applied by `bun run sites:lifecycle`). |
| `apps/site-router/package.json` | Scripts: `deploy` (`wrangler deploy --keep-vars`), `dev`, `typecheck`, `cf:typegen`. |
| `apps/status/src/model.ts` | Status data types (Effect Schema). `SERVICE_IDS`: `accounts`, `connections`, `hosted`, `updates`, `marketplace`. `HISTORY_DAYS` = 90. `StatusState`, `Incident`, `CheckDay`, `StatusFile`, `StateFile`. |
| `apps/status/src/StatusPage.tsx` | `StatusPage` component. `ISSUES_URL` points at GitHub issues labelled `status`. |
| `apps/status/src/main.tsx`, `index.html`, `vite.config.ts` | Vite SolidJS entry. |
| `apps/status/src/format.ts`, `status-fixture.ts`, `StatusPage.stories.tsx` | Formatting helpers, sample status data, Storybook stories. |
| `apps/status/scripts/update.ts` | Runs the probes (`api`, `signal`, `github` origins), updates the state file and writes the static output. Flags: `--state`, `--out`, `--bootstrap`, `--incidents-only`, `--dry-run`, `--now`. |
| `apps/status/scripts/notify.ts` | Turns status issue changes into notifications (HMAC signing, POST). Reads GitHub issue data. |
| `apps/status/package.json` | Scripts: `dev`, `build`, `typecheck`, `notify`, `update`. |
| `apps/browser-extension/package.json` | Name `@codebot/browser-extension`, license PolyForm-Noncommercial-1.0.0. Scripts: `dev`, `build`, `typecheck`. |
| `apps/browser-extension/vite.config.ts` | Builds the MV3 manifest (`extensionManifest`). Sets permissions, host permissions, `externally_connectable`, X content script, production URLs. |
| `apps/browser-extension/src/background.ts` | Service worker. Opens side panel on action click, handles `chrome.runtime.onMessage`, X outbox and rules. |
| `apps/browser-extension/src/main.tsx`, `App.tsx`, `sidepanel.html` | Side panel UI (SolidJS). Screens: `HomeScreen`, `ChatScreen`, `ChannelScreen`, `NewAgentScreen`, `SettingsScreen`, `SignInScreen`, `AgentSettingsScreen`, `BrowserSharing`. Also `ChatComposer.tsx`, `DictationStrip.tsx`, `NewChatItemScreens.tsx`, `host-connection.ts`, `workspace.ts`. |
| `apps/browser-extension/src/client-browser-*.ts` | Client browser executor and worker (drives the user's browser for agents). |
| `apps/browser-extension/src/x-*.ts`, `XOutboxCard.tsx` | X (Twitter) integration: content script `x-content.ts`, messages `x-messages.ts`, outbox `x-outbox.ts`, agent `x-agent.ts`. |
| `apps/browser-extension/src/offscreen.tsx`, `microphone.html`, `MicrophonePage.tsx` | Offscreen document for audio and a microphone permission page. |
| `apps/browser-extension/src/dictation.ts`, `attachment-media.ts`, `analytics.ts` | Dictation, attachments, analytics. |
| `apps/browser-extension/src/stories/` | Storybook-style fixtures for the extension screens. |
| `apps/slack-app/README.md` | Slack app setup, apply manifest steps, manual settings. |
| `apps/slack-app/production/manifest.json`, `development/manifest.json` | Slack app manifests. `.slack/` holds CLI links. |
| `apps/slack-app/LAUNCH.md` | When to turn on distribution. |
| `apps/discord-app/README.md` | Discord Developer Portal settings and secrets table. No code. |
| `apps/telegram-app/README.md` | BotFather settings, secrets table. No code. |

## How it works

### auth-api

- Runtime: Cloudflare Worker, TanStack Start (SolidJS SSR) with `@cloudflare/vite-plugin`. Compatibility flag `nodejs_compat`.
- Database: D1 `DB` binding, database `codebot-auth` (test database name `codebot-auth-test` unverified). Code uses `observedD1(...)` wrapper in `worker-handler.ts`.
- Object storage: R2 `AVATARS`, `SKILLS`, `SITES`. Mobile update bucket is separate (`mobile-updates`).
- Service bindings in `wrangler.jsonc`: `EMAIL_RELAY`, `MEDIA_GATEWAY`. `EMAIL_FALLBACK` is a `send_email` binding. Rate limiter bindings: `MARKETPLACE_*`, `SITE_REPORT_RATE_LIMITER`, `GITHUB_TOKEN_RATE_LIMITER`, `LIVE_ACTIVITY_RATE_LIMITER`, `FEEDBACK_RATE_LIMITER`.
- Cron triggers: `*/1 * * * *` is `SIGNAL_ENTRY_CRON`. The `scheduled` handler runs only the signal entry check for it. Any other cron (the `*/5 * * * *` trigger) runs hosted server ticks (when `BOAT_API_KEY` is set), remote auth event delivery and, at 00:00 UTC (`isDailyRetentionRun`), the auth data prune.
- Effect-based services. Route handlers call `requestAuthService()` and return `apiError`/`json`.
- No Bun runtime inside `apps/auth-api/src` (no `src/bun` directory found, unverified for the rest of the repo). Bun is used only for root scripts (`bun ../../scripts/...`).

### Login flow (email code)

1. `POST /v1/auth/email/start` (web and phone; `startMobileEmailSignIn` calls the same route). `AuthService.startEmailSignIn` creates a challenge with `CHALLENGE_TTL_MS` (10 minutes) and `maxAttempts: 5`.
2. The server sends an 8-character code (`ONE_TIME_CODE_LENGTH = 8`, from `packages/contracts/src/validation.ts`). The code alphabet is `ONE_TIME_CODE_ALPHABET`. Codes are generated with `crypto.getRandomValues`.
3. D1 stores a hash of the code, not the code (`crypto.ts`, `d1-auth-repository.ts`).
4. `POST /v1/auth/email/verify` calls `AuthService.verifyEmailCode`. Mobile uses `POST /v1/mobile-auth/email/verify`, which calls `verifyMobileEmailCode`.
5. On success the server issues a session token (stored hashed, per README). Mobile gets a session JSON with `sessionToken`, `apiUrl`, `user` (the `MobileSession` type in `mobile-auth.ts`). Web session form (cookie or other) is unverified.
6. Delivery uses `email-delivery.ts`, `smtp-email-delivery.ts`, and `EMAIL_RELAY`. `EMAIL_CODE_DELIVERY_BUDGET_MS` limits how long delivery may take.
7. Logout: `POST /v1/auth/logout`. Mobile: `logoutMobileSession`.

### Phone connect (Mobile Connect)

1. A signed-in desktop or browser creates a ticket through `routes/v1/mobile-auth/ticket.ts` (`POST`; the same file has a `DELETE` handler) that calls `AuthService.issueMobileAuthTicket`. The ticket TTL is `TEAM_TICKET_TTL_MS` (2 minutes) in `auth-service.ts`.
2. The app redeems it: `POST /v1/mobile-auth/redeem` with `ticket`, `deviceId`, `deviceName`, `platform` (`ios`, `android`, `unknown`). Mobile calls `redeemMobileConnectUrl` in `apps/mobile/src/features/auth/api/mobile-auth.ts`.
3. Device list and revocation: `routes/v1/mobile-auth/devices.ts` (list) and `devices/$sessionId.ts` (revoke). `devices.ts` is `GET`; `devices/$sessionId.ts` is `DELETE`. The app calls `GET /v1/mobile-auth/devices?includeDesktop=true` (seen in `mobile-auth.ts`).
4. Connect link: `POST /v1/mobile-auth/link` (`createMobileConnectLink`).

### Sessions

- `AuthService.authenticate`, `authenticateDesktopSession`, `authenticateMobileSession` check tokens.
- Account sessions list and revoke: `listAccountSessions`, `revokeAccountSession`.
- Remote auth events go to Signal (`REMOTE_AUTH_WEBHOOK_URL` or `REMOTE_AUTH_WEBHOOK_URLS`) from the `remote_auth_events` table (`migrations/0013_remote_session_lifecycle.sql`). Delivery runs from the scheduled handler (`remote-control-plane.ts`).

### Migrations

- Files: `apps/auth-api/migrations/NNNN_name.sql`. Applied by `bun run db:migrate:local` / `db:migrate:remote` (`wrangler d1 migrations apply codebot-auth`). Production deploy applies them before the new Worker.
- Two files share the numbers `0034` and `0071`. Keep the order of the `ls` output (sorted by name).
- Each migration family has a test in `test/` that uses `migratedDatabase` from `test/sqlite-d1.ts`.

### Mobile app

- Expo SDK 58, React Native 0.88.1, Expo Router. Entry `expo-router/entry`.
- Auth client: `src/features/auth/api/mobile-auth.ts`. It calls `fetch` against `apiUrl` from the session. `mobileAccountApiUrl()` returns `EXPO_PUBLIC_CODEBOT_API_URL` in `__DEV__`, otherwise `CODEBOT_CONTROL_PLANE_ORIGIN` (`https://api.codebot.example`, defined in `packages/contracts/src/invite-links.ts`).
- Session storage: `saveMobileSession` (called in `mobile-auth.ts`; its definition was not found in `apps/mobile/src`) and `readMobileSession` (secure storage, unverified detail).
- Analytics: OpenPanel at `https://analytics.codebot.example/api` (`src/features/analytics/mobile-analytics.ts`). Failure reports in `failure-reports.ts`. Both only in production env.
- Updates: `app.json` `updates.url` = `https://updates.codebot.example/manifest`. Certificate `certs/certificate.pem`. Update checks in `src/features/app-update/`.
- Text: product text uses catalog keys (`mobile.*`) through `useText()` and `currentText()` from `src/shared/lib/text.ts`.
- Voice: `src/features/voice/model/scribe-realtime.ts` and `live-voice-webrtc.ts` (WebRTC). Native modules in `modules/speech`.
- Remote desktop: `modules/remote-viewer-proxy`, feature folder `src/features/remote-desktop/`.

### mobile-updates

- Speaks the Expo Updates protocol version 1 for `expo-updates`.
- `GET /manifest`: reads headers `expo-platform`, `expo-runtime-version`, `expo-channel-name`. Looks up pointer `pointers/<channel>/<platform>/<runtime version>.json`. Returns `multipart/mixed` with a signed `manifest` part or a signed `directive` part. Returns `204` when the phone keeps its bundle.
- `GET /assets/<hash>`: returns an object from `assets/<sha256 base64url>`. Hash in the URL must match `ASSET_HASH_PATTERN` (43 characters).
- Rollout: `rolloutBucket(clientId, updateId)` gives 0-99. Pointer rollout percentage decides who gets the update.
- Signing happens in GitHub Actions (`.github/workflows/mobile-ota.yml` and `scripts/mobile-ota.ts` in the repo root). The Worker holds no key.
- Cache: pointer 30 s, update 1 day, asset 1 year. Missing objects are cached too.

### site-router

- Public read-only Worker for `*.codebot.example`. Reads `SITES` R2 bucket through `get` only.
- Path: `/_codebot/report` redirects to `<ACCOUNT_ORIGIN>/report-site?hostname=...`. Error pages are plain text, or HTML when `Accept` includes `text/html`, with a strict CSP.
- Launch flags (set in Cloudflare production vars): `SITE_PUBLISH_ENABLED` (Auth API), `SITE_SERVE_ENABLED` (router), `SITE_COOKIE_ISOLATION_READY`. Missing value means off.
- The Auth API is the only writer. It applies D1 migration `0016_hosted_sites.sql` before deploy.

### status

- Static SolidJS page. Source data is a state file that `scripts/update.ts` writes. Probes run every few minutes (`FIRST_CHECK_MINUTES` = 5, `MAX_CHECK_MINUTES` = 15). Two failed runs open an issue (`RUNS_TO_OPEN` = 2), two passing runs close it (`RUNS_TO_RECOVER` = 2). Bot login `github-actions[bot]`.
- Output: static files plus an Atom feed of incidents (`atomFeed`).

### browser-extension

- MV3 extension. Built by `vite.config.ts`, which writes `manifest.json` in `generateBundle`.
- Background: `background.ts`. Side panel: `sidepanel.html` (`side_panel.default_path`). Offscreen doc: `offscreen.html`.
- Permissions: `sidePanel`, `storage`, `identity`, `offscreen`, `alarms`, `notifications`, `tabs`, `tabGroups`, `debugger`, `downloads`.
- Host permissions: the API origin only (plus `localhost` and `127.0.0.1` in development).
- X content script: `x-content.js` on `x.com` and `twitter.com`. Rules come from `/v1/browser-extension/x-rules` (`X_PAGE_RULES_ROUTE`).
- Talks to the API at `https://api.codebot.example` and analytics at `https://analytics.codebot.example/api` in production.

### Chat-app folders (Slack, Discord, Telegram)

- No code. Only settings and manifests.
- Install routes live in `auth-api`: `POST /v2/slack/authorize`, `POST /v2/discord/authorize`, Telegram links through a one-use `t.me` link.
- Signal (`remote/api`, outside this scope) holds the bot tokens and the Gateway/webhook connection.
- Auth API holds Slack client ID and secret, Discord client ID and secret, Telegram bot ID and username, and route-ticket keys.

## How to change it

### Add an account API route

1. Create a file under `apps/auth-api/src/routes/<path>.ts`. The path is the URL, for example `routes/v1/me/example.ts` gives `/v1/me/example`.
2. Use the pattern from `routes/v1/mobile-auth/redeem.ts`:
   - `createFileRoute("/v1/...")({ server: { handlers: { POST: ({ request }) => runApiResponse(Effect.gen(...), errorMapper) } } })`.
   - Read the body with `readJsonObject(request)`.
   - Call the service with `requestAuthService()`.
   - Return `json(...)` or `apiError(status, code, message)`.
3. If a phone reaches the route on the LAN in development, add it to `MOBILE_LAN_PATHS` in `apps/auth-api/dev-network-access.ts`. Add tests in `test/dev-network-access.test.ts` for the allowed path and a nearby denied path.
4. Run the route tests with `bun run test` in `apps/auth-api` (one test file at a time, per the repo policy).

### Add a D1 migration

1. Add `apps/auth-api/migrations/0077_<name>.sql` (next free number after `0076_near_wallet_agents.sql`).
2. Make it backward compatible with the Worker that is live now (see `apps/auth-api/AGENTS.md`). No `NOT NULL` column without a default. No drop or rename that the live Worker reads. For a breaking change, use two releases.
3. Add `test/<name>-migration.test.ts`. Use `migratedDatabase(...)` and `migration(...)` from `test/sqlite-d1.ts`. Prove the old Worker writes still work on the new schema.
4. Apply locally with `bun run db:migrate:local`.

### Change the phone app UI

1. Read `apps/mobile/AGENTS.md` and `apps/mobile/DESIGN.md` first.
2. Use HeroUI Native `Typography` and `Button`. Do not import React Native `Text` in screens.
3. Use native `Stack`, `NativeTabs`, `Stack.Toolbar` for system chrome.
4. Add product text as catalog keys (`mobile.*`) and read them with `useText()` or `currentText()`.
5. Lint only changed files: `bun run lint` inside `apps/mobile` with a path, or the repo-level Biome command.

### Add a phone API call

1. Add a function in `apps/mobile/src/features/auth/api/mobile-auth.ts` (or a feature `api/` folder).
2. Use `requestMobileAccount` (for account calls) or `fetch(new URL(path, session.apiUrl))`.
3. Validate the response with a Zod schema (the file already uses `z`).
4. Map errors to `MobileSessionExpiredError` or `MobileEmailSignInError` where the caller expects them.

### Change the phone API origin in development

- Set `EXPO_PUBLIC_CODEBOT_API_URL` in the shell. It is used only when `__DEV__` is true.
- Production origin is `CODEBOT_CONTROL_PLANE_ORIGIN` in `packages/contracts/src/invite-links.ts`.

### Ship an over-the-air update

- Follow `apps/mobile/README.md#over-the-air-updates` (linked from `apps/mobile-updates/README.md`). The Worker itself has no write route. Publishing goes through GitHub Actions with the `release-mobile-ota` environment.
- Do not add a public R2 URL or a custom R2 domain to the bucket.

### Change the status page checks

1. Edit the `ORIGINS` and probe lists in `apps/status/scripts/update.ts`.
2. Edit `SERVICES` in `apps/status/src/model.ts` if you add a service. The `SERVICE_IDS` literal list must match.
3. Run `bun run update` with `--dry-run` and `--state <file> --out <dir>`. Do not run it against production state.

### Add a browser-extension permission or host

1. Edit the `permissions` or `host_permissions` arrays in `apps/browser-extension/vite.config.ts` (`extensionManifest`).
2. Keep the list minimal. The manifest is reviewed by the store.
3. Rebuild with `bun run build` (one run only, per the repo policy).

### Add a Slack, Discord or Telegram scope

- Slack: keep the bot scopes equal to `SLACK_BOT_SCOPES` in `packages/contracts/src/slack-app.ts`. Then `slack manifest validate` and `slack manifest sync` in the app folder.
- Discord: permissions are `DISCORD_BOT_PERMISSIONS` in `packages/contracts/src/discord-app.ts`. Update the Developer Portal to match.
- Telegram: settings are in BotFather, see `apps/telegram-app/README.md`.

### Add a site-router behavior

- Keep the router read-only. It must not get a write route or a second binding with write rights.
- Add a branch in `routeRequest` in `apps/site-router/src/index.ts`. Keep the headers from `secureHeaders`.

## Gotchas

- **Two different migration rules.** `apps/auth-api/migrations/` runs on D1 with the Worker deploy gap (must be backward compatible). The user's own SQLite in `src/backend` (repo root, outside this scope) is irreversible. Do not mix them. (See `apps/auth-api/AGENTS.md`.)
- **Fetch receiver bug.** Store `fetch` as `(input, init) => fetch(input, init)`. Passing the bare global `fetch` and calling it as a property throws `Illegal invocation` in workerd, even when Node tests pass.
- **Profile saves do not wait for Signal.** Only the durable outbox insert is awaited. Signal delivery uses `waitUntil` and a timeout. Failed deliveries stay in the retry outbox.
- **LAN allowlist.** Routes not in `MOBILE_LAN_PATHS` return denied to phones during dev. Desktop-only sign-in and ticket routes must stay blocked.
- **Dev env load order.** Shell values, then saved local overrides (`.codebot/dev-state.json`), then decrypted `.env.dev`, then generated defaults. An explicit empty value counts as an override.
- **Stripe bootstrap is safe to re-run** but a changed amount creates a new Price and moves the lookup key.
- **Hosted servers are on by default in `wrangler.jsonc`** (`HOSTED_SERVERS_ENABLED` = `true`, allowed IDs `*`). A local Worker with a template creates real VMs. Limit with the shell variable.
- **Site hosting is gated.** Three launch flags must be set in Cloudflare (not in the repo). Missing values mean off. Production verification fails if `SITE_HOSTING_EXPECTED_ENABLED` is absent.
- **Site router deploy uses `--keep-vars`.** Otherwise the repo defaults overwrite protected Cloudflare variables.
- **Mobile: do not run broad checks.** The user reports overloaded machines. Run one test file or lint changed files. Do not run whole-workspace typecheck or EAS builds without an explicit request.
- **Mobile: Expo patches.** Several dependencies are patched (`patches/` folder at the repository root, listed in `apps/mobile/README.md`). Changing a dependency version can drop a patch. The Android splash patch needs `buildFromSource`.
- **Mobile: Bun version.** Use Bun 1.4.2 locally. Dependency paths and patch metadata affect the runtime fingerprint.
- **Mobile: native folders are not committed** (`ios/`, `android/` absent, Expo Continuous Native Generation).
- **Mobile OTA trust.** The phone accepts only manifests signed with the key that matches `certs/certificate.pem`. A person with bucket write access can stop updates or roll back to an older signed update, but cannot add new code.
- **mobile-updates logs are off** (`observability.enabled` = false). Do not enable invocation logs: they record request headers.
- **Chat-app folders are not code.** Do not look for a runtime there. The bot tokens live in Signal, not in these folders.
- **Discord Message Content intent** needs Discord approval for verified bots or bots in 100+ servers.
- **Telegram privacy mode** must be Disable in BotFather. Removing and re-adding the bot in a group applies the change.
- **Do not copy `.env` values** into docs, code or chat. Use names only.
- **Generated files.** `apps/auth-api/src/lib/plugin-catalog.generated.ts` and `src/routeTree.gen.ts` are generated. Edit the source, not these files (unverified for each generator).
- **`tsconfig.tsbuildinfo`** files sit in several app folders. They are build cache. Do not edit them.
- **Auth-api uses cross-folder imports** (for example `../../../site-router/src/index` in `worker-handler.ts`). Changing `site-router` can change `auth-api` build.

### Mobile sign-in and service addresses (W18)

- `apps/mobile/src/features/auth/model/account-sign-in.ts`: pure Nextcloud sign-in against the account service (config check, PKCE start, browser sheet, exchange). No Expo imports, so `scripts/mobile-account-e2e.ts` runs it on Windows.
- `.../service-addresses.ts` (pure address rules, Signal override fetch) and `service-address-store.ts` (secure store, `EXPO_PUBLIC_CODEBOT_API_URL` and `EXPO_PUBLIC_CODEBOT_SIGNAL_URL` build defaults). `use-account-sign-in.ts` is the sign-in hook; `sign-in-panes.tsx` has `OptionsPane` and `ServerPane`.
- Settings > Connection (`features/settings/screens/connection-settings-screen.tsx`) edits the Signal address.
- Removed: email-code and company sign-in, billing, credits, referral, hosted server plans, analytics preference screen, rating ask, app update header and notes, OTA.
