# CodeBot

[![License](https://img.shields.io/badge/license-PolyForm_Noncommercial_1.0.0-blue.svg)](LICENSE)

CodeBot is a desktop app for coding with AI agents. It runs on macOS, Windows and Linux. It is for
internal use by its owner and his team. Do not sell it and do not use it for commercial work.

You work in projects. A project is a folder with its own agents and chats. Many projects can run
chats at the same time. Replies are short. An agent stays in the folders of its project.

CodeBot is a fork of an open-source project that NOTICE names. The agent engine, the provider adapters (Claude Code, Codex, Grok,
OpenCode, Gemini, ACP and local models), the SQLite database and the typed API between the engine and
the screen are the same. See [License and attribution](#license-and-attribution).

> [!WARNING]
> An agent can read and change files and run commands. Pick the access level of a project with care.
> **Normal** is the default. **Open** gives the agent full access to the computer. See the
> [folder lock](docs/codebot/folder-lock.md).

## What CodeBot adds

- Projects with a main folder, more folders, agents, chats and a chat history list.
- Split panels for chats, files, changes and the browser.
- A file tree with git status, a git panel, an editor and previews.
- Short replies: the final answer, a one-line summary of the work, and a Details button.
- A command menu that reads the slash commands from the engine.
- Folder lock: Strict, Normal or Open.
- Optional sign-in with Nextcloud on your own server. Without it the app uses a local profile.
- Updates from a folder on your own server.
- Themes, local model servers and a switch for each hidden feature.

The [user guide](docs/codebot/user-guide.md) explains each part.

## Documents

| Document | Content |
| --- | --- |
| [User guide](docs/codebot/user-guide.md) | How to use CodeBot |
| [Home server](docs/codebot/home-server.md) | Account service, Nextcloud, Signal, TURN and the update server |
| [Updates and releases](docs/codebot/updates.md) | The update folder and the one-command release |
| [Unsigned builds](docs/codebot/unsigned-builds.md) | How to open an unsigned build |
| [Folder lock](docs/codebot/folder-lock.md) | How the lock works |
| [Themes](docs/codebot/themes.md) | Palette files |
| [Local models](docs/codebot/local-models.md) | Local model servers and the status bar |
| [PRD status](docs/codebot/prd-status.md) | Each requirement with its proof |
| [Windows test status](docs/codebot/windows-test-status.md) | Result of each check on Windows |
| [Engine reference](docs/codebot/engine-reference.md) | Provider setup, data folders and other engine text |

## Install

CodeBot supports macOS 13 or newer (Apple silicon and Intel), Windows 10 or newer (x64), and Linux
(x64 and arm64, AppImage).

Get the installer from the update folder of your team (see [home server](docs/codebot/home-server.md)),
or build it yourself (see [Build an installer](#build-an-installer)). The file names are:

| System | File |
| --- | --- |
| Windows | `CodeBot-<version>-x64.exe` |
| macOS | `CodeBot-<version>-arm64.dmg` or `CodeBot-<version>-x64.dmg` |
| Linux | `CodeBot-<version>-x86_64.AppImage` or `CodeBot-<version>-arm64.AppImage` |

1. Windows: run the installer. It lets you pick the folder.
2. macOS: open the DMG and drag CodeBot to Applications.
3. Linux: run `chmod +x CodeBot-*.AppImage`, then start the file.

A build that is not signed shows a warning the first time. See
[unsigned builds](docs/codebot/unsigned-builds.md). For Linux notes (AppArmor, FUSE), see the
[engine reference](docs/codebot/engine-reference.md#linux-notes).

CodeBot needs one agent CLI to talk to a model: Claude Code, Codex or another provider. CodeBot can
download a provider CLI from its vendor (Download in onboarding or in Settings). Sign in with your own
account. Setup for each provider is in the [engine reference](docs/codebot/engine-reference.md#agent-setup).

## Build, run and test from source

Needs: [Bun](https://bun.sh) 1.4.2, Node.js 24 (`.nvmrc`) and Git. On Windows, Claude Code also needs
Git for Windows. Use Git Bash or PowerShell.

Install Bun 1.4.2 on macOS or Linux:

```bash
curl -fsSL https://bun.com/install | bash -s "bun-v1.4.2"
```

Install it on Windows (PowerShell):

```powershell
iex "& {$(irm https://bun.com/install.ps1)} -Version 1.4.2"
```

Then, in the repository folder:

```bash
bun install --frozen-lockfile
bun run dev
```

`bun install` runs the `postinstall` script, which fetches Electron. The first install takes a few
minutes. `bun run dev` starts the development stack and the app, with hot reload of the screen. It uses
its own development profile, not your real profile. Stop it with `bun run dev:stop`. Do not stop it
with `pkill` or `taskkill` by name: `dev:status` and `dev:stop` find only the processes of this checkout.

Check and test. These commands work the same on Windows, macOS and Linux. Run them one at a time,
because each one uses much memory:

| Command | What it does |
| --- | --- |
| `bun run typecheck:node` | Type check of the engine, the main process, the preload bridge and the scripts |
| `bun run typecheck:renderer` | Type check of the screen |
| `bun run lint` | Biome check of the whole repository |
| `bun run check:ui` | UI rules: primitives, tokens and no hard-coded text |
| `bun run i18n:check` | Check of the translation catalogs |
| `bun run build` | Build of the main process, the preload bridge and the screen into `out/` |
| `bun run test:desktop` | All unit tests (Vitest) |
| `bun run test:<name>` | One feature test, for example `test:folder-lock`, `test:app-update` or `test:themes`. It writes `.codebot-build/<name>/report.json` |
| `bun run check:branding` | Fails when a line still names the upstream product or its servers |
| `bun run check:doc-links` | Checks the links between the documents |

`bun run check` runs the whole offline set and takes long. The result of each check on Windows is in
[windows-test-status.md](docs/codebot/windows-test-status.md).

A test or a dev run that starts the app uses the profile of the user who runs it. To keep your real
data safe, run it with a different `HOME` and `APPDATA` (on Windows also `USERPROFILE` and
`LOCALAPPDATA`). Build agents use `cb_sandbox` for this (see [agent-brief.md](docs/codebot/agent-brief.md)).

### Build an installer

Each command builds for the computer that you run it on. An unsigned build needs no certificate.

| System | Command | Output in `dist/` |
| --- | --- | --- |
| Windows x64 | `bun run dist:win` | `CodeBot-<version>-x64.exe` |
| macOS | `bun run dist:mac` | DMG and ZIP files, with no signature and no notarization |
| Linux x64 | `bun run dist:linux` | `CodeBot-<version>-x86_64.AppImage` |
| Linux arm64 | `bun run dist:linux:arm64` | `CodeBot-<version>-arm64.AppImage` |

`bun run package:win`, `bun run package` (macOS) and `bun run package:linux` build an unpacked app
folder for a quick test. To put a release on your update server, see
[updates and releases](docs/codebot/updates.md).

## Data folders

CodeBot keeps its data in `~/CodeBot` (agent workspaces, shared files, downloads) and in the Electron
user data folder named `CodeBot` (`%APPDATA%\CodeBot` on Windows, `~/Library/Application Support/CodeBot`
on macOS, `~/.config/CodeBot` on Linux). The database is `codebot.db` in that folder. Provider CLIs keep
their own sign-in in their own folders (`~/.claude`, `~/.codex`). The full list is in the
[engine reference](docs/codebot/engine-reference.md#local-data-and-network-boundaries).

CodeBot sends no analytics. Only the optional account service, your update server and the providers
that you choose get requests. See [PRIVACY.md](PRIVACY.md).

## Commands

This table comes from the upstream README. Rows for the account API on Cloudflare, billing, the public
site and the status page describe parts that CodeBot removes (packages W02b and W03). Do not use them.
Use `bun run dev` for the desktop app. Use `bun run storybook` for shared UI test data.

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start the local Auth API, Signal service, and Electron client with renderer HMR on its app profile. Ports are allocated through the dev registry, so a sibling worktree never takes one this stack won. It refuses a second stack in the same worktree unless you pass `--force`. Each worktree opens a profile of its own, keyed to its path; `--shared` opens the shared `CodeBot Dev` profile instead. The main window opens behind the active app and does not take the keyboard focus, also after each `src/main` rebuild, so a stack that an agent starts does not interrupt your work in another app. In this mode the main window is not throttled when other windows cover it, so automation stays fast; `--foreground` opens it in front with focus, as before. `--isolated` is still accepted and changes nothing. A profile that you used before stays on disk unchanged. `--hosting=test` signs the app in to the `test` account Worker, on a profile that all worktrees share, so that a hosted server is a real VM; see [docs/hosted-servers.md](docs/hosted-servers.md#real-servers-from-a-development-build). A profile that does not exist yet is seeded with the showcase data of `bun run dev:seed` before the client starts, so a first start never opens an empty app; an existing profile is left as it is. An isolated profile still shares the computer's provider CLI store, so it does not download the pinned CLIs again. Before it starts, it runs `bun install --frozen-lockfile` and `bun run api:migrate:local` only when `bun.lock`, a workspace `package.json`, a patch, or a migration changed since their last successful run. The stamps are in `node_modules` and `apps/auth-api/.wrangler/state/v3/d1`, and each `bun install` writes the install stamp too; delete one to run its step again. |
| `bun run preview` | Preview the built Electron client with the green preview icon. |
| `bun run mobile:go` | Start the mobile app in Expo Go and clear the Metro cache. When the branch name ends in `-<number>`, such as `mobile-triage-12555`, Expo Go shows the server as `Issue #12555`. Set `CODEBOT_EXPO_SESSION_NAME` to use a different name. |
| `bun mobile:ios` | Build and launch the iOS simulator app without RocketSim. |
| `bun run dev:mobile` | Start or reuse this worktree's `bun run dev` stack, build and launch the iOS simulator app, and pair them without a QR scan. The desktop issues a Mobile Connect ticket over CDP, and `simctl openurl` opens the link in the development build, which accepts only loopback or private-network account services. Other arguments go to `bun mobile:ios`. `--pair-only` pairs an app that already runs; `--simulator=<udid>` chooses one of several booted simulators. It stops when the Metro port is already in use, because another worktree's Metro would serve the same app id; pass `--port=<n>` then. |
| `bun run mobile:ios:build:local` | Build a production iOS `.ipa` locally for upload with Transporter. See [TestFlight setup](apps/mobile/README.md#local-testflight-build). |
| `bun run mobile:ios:release:testflight` | Start the GitHub Actions iOS build from `main` and upload to TestFlight. Requires authenticated GitHub CLI. See [iOS release setup](apps/mobile/README.md#github-actions-testflight-release). |
| `bun mobile:ios:rocketsim` | Start RocketSim and build and launch the iOS simulator app with RocketSim Connect. See [mobile setup](apps/mobile/README.md#development). |
| `bun run mobile:go:tunnel` | Start the mobile app in Expo Go through a Metro tunnel and clear the cache. The CodeBot API and Signal still need their own reachable addresses. |
| `bun run dev:api` | Start the TanStack Start API and its local D1 database on `127.0.0.1:3100`. |
| `bun run --cwd apps/browser-extension build` | Build the Chrome extension into `apps/browser-extension/dist`; load that folder in `chrome://extensions` with **Load unpacked**. With `-- --mode development` and `VITE_CODEBOT_API_URL=<local Auth API>`, it uses the local stack. `bun scripts/browser-extension-e2e.ts` drives it against `bun run dev`. |
| `bun run dev:apns-key -- <AuthKey_ID.p8> [KEY_ID]` | Save an Apple Push Notification service key in ignored development state, so the local Auth API sends iPhone Live Activity updates. The local server forwards them to Apple over HTTP/2. Restart `bun run dev` after it. |
| `bun run api:start` | Build and preview the Cloudflare Worker locally. |
| `bun run api:images` | Draw the article artwork into `apps/auth-api/content-art/` after you add an article or change a title. Commit the result; the site build fails until it matches. Needs Electron and a GPU, so run it on your own machine. |
| `bun run api:migrate:local` | Apply D1 migrations to the local development database. |
| `bun run api:migrate:remote` | Apply D1 migrations to the configured remote database. |
| `bun run api:deploy` | Build and deploy the account API to Cloudflare Workers. It sets the Stripe, boat, claim and OpenPanel secret sets that are in the production environment. A set that is not there keeps the value that the Worker has. |
| `bun run api:stripe:bootstrap` | Create or update the Stripe plan catalog and the Customer Portal settings from `STRIPE_SECRET_KEY` in the encrypted `apps/auth-api/.env.dev` (shell values replace it). It refuses a live key unless you add `--live`. For local webhooks, run `stripe listen --forward-to localhost:<API port>/v1/stripe/webhook` and set the signing secret in `STRIPE_WEBHOOK_SECRET`. See [Billing](docs/architecture/servers.md#billing). |
| `bun run hosting:setup --target=production\|test` | Set up the Stripe catalog, the Customer Portal, and the Stripe and boat webhooks of one account server, and store the webhook signing secrets: production in the `cloudflare-production` GitHub Environment, test in the encrypted `apps/auth-api/.env.dev`. See [hosted servers](docs/hosted-servers.md#production). |
| `bun run hosting:template` | Build the boat named snapshot that new hosted servers start from. Needs `BOAT_TEMPLATE_API_KEY` and `--version`, `--appimage-url`, `--appimage-sha256` and `--auth-api-url`. See [hosted servers](docs/hosted-servers.md). |
| `bun run status:smoke` | Run the status page smoke test: update runs against a local fake service, the status webhooks against a local receiver, one read-only run against the live checks, and the built page in Chrome. It writes `.codebot-build/status-page/report.json`. |
| `bun run remote:up` | Build and start the self-hosted Signal, coturn, and ACME stack. |
| `bun run remote:check` | Check the Remote API and both Docker Compose configurations. |
| `bun run remote:check:compose` | Validate both Docker Compose configurations alone, without a running daemon. |
| `bun run remote:update` | Update Signal, then drain and update the single coturn instance. |
| `bun run dev:all` | Start the Auth API, Signal service, and single local Electron instance. |
| `bun run dev:slack` | Start the same stack as `bun run dev`, with two `cloudflared` quick tunnels, one to Signal and one to the local account API, so that Slack can send the development Slack app's events and install return to the agents on this computer. It reads `CODEBOT_DEV_SLACK_SIGNING_SECRET` from the ignored `.env.slack-dev`, and needs `SLACK_ROUTE_PRIVATE_JWK` and `SLACK_ROUTE_KEY_ID` in the shell environment. Takes the same options as `bun run dev`, such as `--shared`. See [docs/messaging.md](docs/messaging.md#test-slack-locally). |
| `bun run dev:test-client` | Start the Auth API, Signal service, local instance, and an isolated second client for team testing. |
| `bun run dev:seed` | Replace only the app development profile with durable showcase data. `--if-missing` keeps an existing profile, which is how `bun run dev` seeds a first start. `--scale=agents:N,messages:M,channels:C,channelMessages:K,attachments:A` adds generated agents, chat history, channel history and large images to the showcase data, for memory and CPU measurements. |
| `bun run dev:reset` | Delete the local app, test-client, and legacy host development state. It refuses while a dev app has one of these profiles open. |
| `bun run dev:status` | Print, as JSON, every dev stack and dev app instance live on this machine: services, ports, pids, which of them belong to this worktree, and which are orphaned - a supervisor that is gone with its children still holding the ports. Each recorded process carries the state a stop command acts on: `live`, `gone` with `groupLive` for a survivor of a dead leader, and `unverified` for a pid this machine cannot date. `registryDirectory` is the directory it read: `~/Library/Caches/CodeBot/dev` on macOS, `$XDG_RUNTIME_DIR/codebot-dev` (else `~/.cache/codebot/dev`) on Linux, `%LOCALAPPDATA%\CodeBot\codebot-dev-instances` on Windows, or `CODEBOT_DEV_REGISTRY_DIR` when set. It does not depend on `TMPDIR`. |
| `bun run dev:verify` | Print a stable JSON verification plan for this worktree: `ready`/`reasons` for safe checks, setup state, changed files and affected surfaces, nearby tests, runtime state, `qa.required`/`qa.ready`/`qa.reasons`, the renderer QA loop, safe `runnableCommands`, and all suggested `commands`. Add `--run` to execute only the safe non-mutating checks in the plan. Renderer QA follows `snapshot → action with --wait-for → snapshot → screenshot` when appearance matters. |
| `bun run dev:extension` | Open Chrome for Testing with the browser extension for this worktree's running `bun run dev` stack: it builds the extension for the stack's Auth API, loads it in a profile of its own (`.codebot-build/dev-extension-chrome`), and signs the side panel in to the dev host's account. Chrome stays open. Run it again after an extension change: it rebuilds the extension and reloads it in the open Chrome. `--fresh` starts with an empty profile, `--signed-out` leaves the side panel signed out, `--email=<address>` signs in another account, and `--browser=<path>` names the browser (default: Playwright's Chromium; branded Chrome does not load an unpacked extension from the command line). |
| `bun run dev:restart-client` | Restart only the test client of this worktree's `dev:test-client` stack. The host and the other services stay live. The supervisor stops its own test-client child by PID and starts it again. Not on Windows. |
| `bun run dev:stop` | Stop this worktree's dev stack, children included, using the pids in the registry rather than a process-name pattern. It signals only a pid whose start time still matches the record, so a recycled pid is never sent SIGTERM; anything it cannot confirm is reported, left running and kept in the registry, and the command exits non-zero. `--pid=<supervisor pid>` stops one other stack, `--all` stops every stack on the machine. |
| `bun run dev:forget` | Drop this worktree's stack record without signalling anything, for the one case `dev:stop` refuses to resolve on its own. It is also the only command that reads a dead record: nothing else deletes one, because a reader that removes what it judged can remove a record the supervisor rewrote in between. Takes the same `--pid=` and `--all`. |
| `bun run storybook` | Start Storybook on a port allocated through the same registry, so two worktrees never announce one port. `CODEBOT_STORYBOOK_PORT` moves where the search starts; `--port` is refused. |
| `bun run build-storybook` | Build static Storybook. CI sets `CODEBOT_STORYBOOK_CHECK=true` to skip automatic prop documentation during its build check. |
| `bun run dev:automation` | Drive the running dev app over CDP: `instances`, `pages`, `snapshot`, `screenshot`, `record` (a `.webm` video of one page under `.codebot-build/dev-automation/`; `--duration=<ms>`, default 60000, maximum 90000; SIGINT stops it early; needs Playwright's ffmpeg: `bun node_modules/playwright-core/cli.js install ffmpeg`), `click`/`type` by accessible role. `--page=<target-id\|url-substring>` aims at any window, including embedded browser views; `--wait-for=<role>,<name>` settles on an accessible target instead of polling; mutations need `--allow-mutations` and a named instance (this worktree's record, `--instance=<id>` or `--port=`). |
| `bun run dev:cpu` | Measure idle CPU on the running dev app, per process kind and per page. `--duration=<ms>` (default 60000), `--interval=<ms>` (default 5000), `--label=<name>`, `--out=<name>.json` (always under `.codebot-build/dev-automation/cpu/`, and refused if it would leave that directory or pass through a symbolic link) and `--compare=<file>` for a before/after delta. Read-only. Take a baseline before a change and a second run after it: only the difference between two runs on the same machine is a result, because a dev build carries the Vite server and the source maps as well. |
| `bun run dev:memory` | Measure the running dev app's memory once: resident memory per process kind (main, renderer, GPU, provider CLIs and their MCP servers), with the dev tooling kept out of the app total, plus JS heap and DOM counters per page. `--label=<name>`, `--out=<name>.json` (always under `.codebot-build/dev-automation/memory/`) and `--heap-snapshot=<target-id\|url-substring>` to also write a V8 heap snapshot of one page to that directory. Read-only. |
| `bun run dev:bench` | Run repeatable RAM and CPU scenarios on the built app (`bun run build` first). Each run seeds a bench profile of its own, starts the built app, samples the process tree every second (resident memory, macOS physical footprint and CPU per process kind, provider memory per CLI) with the main-process and page heaps, drives the scenario, and reads a settled state after garbage collection. `--scenario=<id\|prefix\|all>` (required; without it the command lists the scenarios), `--runs=<n>` (default 3; the report shows the median and range), `--label=<name>`, `--compare=<report.json>`, `--cpu-profile` (records the app window's JavaScript for 15 s after the first run settles, as a `.cpuprofile` for DevTools), `--frames` (counts frames slower than 17 ms and 50 ms while the scenario runs; the loop keeps the renderer drawing, so CPU readings rise) and `--call-counts` (V8 call counts per function while the scenario runs, top 25 in a `-call-counts.json` file; slows JavaScript). Every run also reports the startup marks (`startup.*`, ms) and the app window's layout and style recalculation counts, script and task time, and long tasks (`render.*`). Reports go to `.codebot-build/dev-automation/bench/`. Turn scenarios (`s5` to `s9`) use the real claude, opencode and grok CLIs and spend model quota. `s14-agents-100` streams 96 agents at once with a fake Codex (`scripts/dev-automation/bench-fake-codex.ts`) and spends no quota; it reports main-process CPU and event-loop delay and the app window's busy time and lag while the agents stream (`stream.*`), and with `CODEBOT_BENCH_PROFILE_STREAM=1` it writes a `.cpuprofile` of the main process and of the app window for that time. It never touches a dev instance or your own profile, and `bun run dev:stop` stops an app a failed run left behind. |
| `bun run perf:remote` | Measure how fast a remote client gets into the workspace, and which host requests it sends before and after that point. Start `CODEBOT_DEV_SYNC_PROFILE=1 bun run dev:test-client` in this worktree first. The web runs sign in to `/app` as the dev host user and open it in a new browser context each time; the desktop run reads the cold start of the test client, and with `--allow-mutations` each further run reloads its window. `--clients=desktop-start` restarts only the test client (with `--allow-mutations`) and measures from its main process start. `--latency=<ms>` delays the web page's requests and data channel; start the stack with `CODEBOT_DEV_RTT_MS=<ms>` for the same delay in the desktop client, and with `CODEBOT_DEV_CLIENT_TRANSPORT=webrtc` to connect the test client over WebRTC as the dev host user. `--runs=<n>` (default 5), `--label=<name>`, `--clients=web,desktop,desktop-start`, `--api=<url>`, `--compare=<report.json>`, `--browser-executable=<path>`. Writes `report.json` and `waterfall.md` to `.codebot-build/remote-sync-perf/<label>/`. See [remote connect measurement](docs/architecture/servers.md#remote-connect-measurement). |
| `bun run check` | Run Biome, both typechecks, offline tests, the browser smoke test, and the production build. |
| `bun run typecheck` | Check all 15 projects in parallel with a separate incremental cache for each project in this worktree. |
| `bun run knip:check` | Find unused files, exports, and types, unused or unlisted dependencies, and unresolved imports in all workspaces. CI runs it. |
| `bun run check:ui` | Check the renderer against the design system: shared primitives, Kobalte and Lucide confined to `@codebot/ui`, palette tokens instead of colour, size, radius and transition literals. Checks renderer and shared UI source. |
| `bun run check:assets` | Fail when a tracked image or video file is outside the product asset directories. Pull request screenshots go in the pull request body. |
| `bun run check:doc-links` | Fail when a link in a tracked Markdown file names a Markdown file that does not exist, or an anchor that the file does not have. |
| `bun run verify:preload` | After `bun run build`, run the built preload with a fake Electron. Fail when it loads a module that a sandboxed preload cannot load, uses `import()`, or exposes a method that `IPC_ENDPOINTS` does not name. |
| `bun run types:ratchet` | Hold each TypeScript option in `tools/typescript/type-baseline.json` to its error count per file in every project that extends `tsconfig.base.json`. A new error fails. Add `--write` after a fix to lower the baseline, or `--add=<option>` to start an option at its current counts. |
| `bun run i18n:check` | Check the translation catalogs: key prefixes, placeholders, plural forms, ambiguous source text, unused keys, and new untranslated keys that `packages/i18n/untranslated.json` does not list. `--fix` puts translated keys in the English order and removes translated keys from `untranslated.json`. `--json` writes `.codebot-build/i18n-report.json`. See [docs/i18n.md](docs/i18n.md). |
| `bun run test:backend` | Run backend tests only. |
| `bun run test:changed` | Run, on one worker, only the desktop and mobile test files that import a file changed since `origin/main`, including staged, unstaged and untracked files. It stops with an error when `origin/main` is missing. A change to a vitest config, a setup file or `package.json` selects no test. See [docs/development-checks.md](docs/development-checks.md#focused-tests). |
| `bun run test:related -- <source>...` | Run, on one worker, only the test files that import the named source files. |
| `bun run test:browser-agent-session` | Check that an agent with its own browser session, and the agents of a named browser profile, keep their cookies and storage apart, across popups, a restart, a deleted profile, and a clear. |
| `bun run test:browser-profile-agents` | Check that the shared profile, an agent's own session, a named profile, and the delete of a named profile change the stored browser profile of an agent, and that the choice stays after a restart. |
| `bun run test:browser-takeover-deadline` | Run the real attention registry past a provider's tool-call deadline (#9689): a password or takeover card stays open after its call gets the waiting answer, the next call for the tab waits on the same card, a result between calls reaches that call, and the end of the turn closes the card. With no provider deadline, a takeover or a question that the user does not answer in the time limit ends its call; the takeover card stays open past the turn, and the user's later result reaches the agent once as a new message. A Claude question detaches at the limit in the same way. A secret question, or a question in a chat that cannot get a late answer, expires at the limit. A secure fill that fails gives the page to the user and tells the agent only a fixed reason (#10536). Offline; writes `.codebot-build/browser-takeover-deadline-e2e/report.json`. |
| `bun run test:browser` | Run the complete local embedded-browser smoke test, including cross-process persistence. Use `--scenario=controls`, `--scenario=tool-boundary`, `--scenario=evaluation`, `--scenario=wait-deadlines`, or `--scenario=popups` for one isolated scenario. |
| `bun run test:codex` | Probe the real CLI handshake and account without starting a paid turn. |
| `bun run test:durations` | Re-record how long each desktop test file takes. CI splits its shards by this table, so run it when the two shards stop finishing together. |
| `bun run cua-driver:doctor` | Print, as JSON, which `cua-driver` binary CodeBot would use for Computer Use, and the driver's own `doctor` report. Read-only, and it starts no daemon. `CODEBOT_CUA_DRIVER_PATH` selects a different binary in a checkout; an installed application runs only the driver it was released with. |
| `bun run prepare:cua-driver` | Write the pinned Computer Use driver to `build/cua-driver/<platform>/<arch>`, verifying every SHA-256 in `native-runtime.lock.json`. Name another target with `bun scripts/install-cua-driver.ts <platform> <arch>`. Every packaging command runs this first. |
| `bun run pin:cua-driver <version>` | Print a new `cuaDriver` block for `native-runtime.lock.json` from a published `cua-driver` release. Downloads the release assets of all five targets and hashes each shipped file. |
| `bun run package` | Build an unpacked local application for the architecture of this Mac. |
| `bun run package:verify` | Build and verify the real app bundle for this Mac, icon, metadata, ASAR, and fuses. |
| `bun run package:win` | Build an unpacked local Windows x64 application on Windows. |
| `bun run package:win:verify` | Build and verify the Windows x64 application on Windows. |
| `bun run package:linux` | Build an unpacked local Linux x64 application on Linux. |
| `bun run package:linux:arm64` | Build an unpacked local Linux arm64 application on arm64 Linux. |
| `bun run package:linux:verify` | Build and verify the Linux x64 application on Linux. Run it under `xvfb-run -a` without a display. |
| `bun scripts/create-github-app.ts [--org <org>]` | Create the CodeBot GitHub App from `scripts/github-app/manifest.json` with the manifest flow. Prints the Client ID for `src/main/github-connector-config.ts` and writes the app secrets to `~/.config/codebot/github-app-<slug>.json` (mode 0600). Enable Device Flow in the app settings after the run. |
| `bun run release:preflight` | Verify version, Git state, and GitHub release secrets before tagging. |
| `bun run dist:mac` | Build unsigned local DMG and ZIP update artifacts for this Mac. |
| `bun run dist:win` | Build an unsigned Windows x64 NSIS installer on Windows. |
| `bun run dist:linux` | Build an unsigned Linux x64 AppImage on Linux. |
| `bun run dist:linux:arm64` | Build an unsigned Linux arm64 AppImage on arm64 Linux. |
| `bun run release:patch` | Create the next patch version commit and tag. |
| `bun run mobile:release` | Open the mobile release menu: prepare a version, build it, mark it available or skipped on a store (with its flags), write the Discord highlights, and see the live state. Each step that changes files opens its pull request. |
| `bun run mobile:release:patch` | Move the iPhone app notes from `apps/mobile/changelog.d` into `apps/mobile/CHANGELOG.md` and set the next patch version in `app.json`. Also `mobile:release:minor` and `mobile:release:major`. |
| `bun run mobile:ota:check` | Show the native runtime version of this checkout and the mobile store builds that can get it as an over-the-air update. Read-only. Over-the-air updates are removed in the mobile app (see [removed features](apps/mobile/README.md#removed-features)). |
| `bun run mobile:ota:publish -- --platform <ios\|android\|all> --message <text>` | Start the `Mobile OTA update` workflow for the current branch (`main` or `mobile-hotfix/*`): it sends the JavaScript bundle to the phones of the store builds with the same runtime version, with no store review. `--rollout <1-100>` limits the phones, `--dry-run` publishes nothing. `mobile:ota:rollout` changes the percentage, `mobile:ota:rollback` takes the update back, and `mobile:ota:status` shows what the update server gives each store build. |
| `bun run mobile:release:ota -- --base <store build tag> --platform <ios\|android\|all>` | Move the note files that are new since the store build into an over-the-air section of `apps/mobile/CHANGELOG.md`, such as `1.5.0.1`. The store version does not change. |
| `bun run test:mobile-ota` | Run the mobile update server (`apps/mobile-updates`) on a local R2 bucket with the real publish commands, and ask for updates as a phone does: signatures, file hashes, rollout, rollback and the publish guard. Offline; writes `.codebot-build/mobile-ota-e2e/report.json`. |
| `bun run mobile:release:published <ios\|android\|both>` | Write today's date for a store that made the mobile build available. `/changelog` shows each store, and a store that still reviews the build as "In review". Also raises that store's flags in `mobile-features-config.ts`. Add `--version x.y.z` for a version that is not in `app.json`, and `--skip-older` to mark the older versions that the store still reviews as skipped. |
| `bun run test:acp-directories` | Run three fake ACP agents through the `acp` provider driver: new, load and resume requests carry the workspace roots as `additionalDirectories` only when the agent advertises them. Offline; writes `.codebot-build/acp-additional-directories-e2e/report.json`. |
| `bun run test:custom-agents` | Run two fake ACP agents through the agent store, Check agent (with its model list) and the `acp` provider router: equal session ids, restart and resume, switch, and delete. Offline; writes `.codebot-build/custom-acp-agent-e2e/report.json`. |
| `bun run test:mcp-tool-consent` | Run the real Codex app-server with a fake model, a real MCP server and the real attention registry: tool consent at Ask first and Full access, Always allow and a restart, refusals, and the requests that stay with the user (forms, sign-in, look-alikes). Needs a Codex CLI; offline; writes `.codebot-build/mcp-tool-consent-e2e/report.json`. |
| `bun run test:ui-blocks` | Run the real attention registry and Team API codecs on `ask_ui` blocks: answers from the owner, an admin, a member and a released client, the member and local script refusal for privileged actions, a secret form value that is never stored, skip and expiry, and the `ui-blocks-v1` wire on protocols 6 and 7. Offline; writes `.codebot-build/ui-blocks-e2e/report.json`. |
| `bun run test:filesystem` | **Online/manual:** run real full-access Codex and Claude filesystem turns across private and shared workspaces. |
| `bun run test:imagegen` | **Online/manual:** run a real full-access image-generation turn. |
| `bun run test:workspace-only` | **Online/manual:** run real Workspace only Codex, Claude, Grok and OpenCode turns that try to write outside; writes a JSON report per provider to `.codebot-build/workspace-only-smoke/`. Add `--provider <id>` for one, and `--model <id>` to choose its model. |
| `bun run test:provider-detection` | Run local detection, Load models and endpoint Edit against fake OpenAI-compatible servers on this computer: no key in a scan, no redirect, the stored key only to its own origin. Offline; writes `.codebot-build/provider-detection-e2e/report.json`. |
| `bun run test:storage-live` | **Online/manual:** verify isolated Codex and Claude turns in a temporary SQLite database. |

Publishing never creates a second CodeBot instance. The host keeps its Team API on loopback. A hidden,
sandboxed Electron page connects it to invited clients through WebRTC. Signal carries only connection
setup messages. Team data uses direct DataChannels when possible and the project coturn service when
direct ICE fails. Cloudflare stores accounts, configuration, memberships, invitations, logical session
records, and public assets. It does not carry chats, files, commands, or remote desktop media.

The development runner advertises both Mobile Connect and its Signal service on the preferred private
LAN interface. Restart the runner after changing networks so newly generated QR codes contain the
current address.

`mobile:go:tunnel` exposes only the Expo development server. It does not expose the local account
API, Signal, or TURN. A phone on 5G cannot use the default LAN addresses. For a test across networks,
use a VPN that connects both devices, or provide HTTPS and WSS endpoints that forward to this dev
stack's account API and Signal ports. Set `CODEBOT_MOBILE_AUTH_API_URL` to the reachable account API
origin and `REMOTE_SIGNAL_URL` to the reachable Signal URL, including `/v1/signal`, before starting
`bun run dev`. Use the ports reported by `bun run dev:status`; they can differ between worktrees.
If direct WebRTC cannot connect, `TURN_HOST` must name a reachable coturn service and
`TURN_SHARED_SECRET` must match that service. An HTTP tunnel cannot forward TURN traffic.
Generate and scan a new Mobile Connect code after changing the account API address; an existing
mobile session retains its original address.

Mobile sign-out removes the local login even when the account API is unavailable. The app keeps
only the credential in secure storage for revocation retries at startup, on return to the foreground,
and on the next connection attempt. Remote revocation completes when the account API is reachable.

For manual team testing, `bun run dev:test-client` starts a complete two-client harness. The second
client uses the `CodeBot Dev Test Client wt-<hash>` profile of this worktree (`CodeBot Dev Test Client`
with `--shared`) and renderer port 5174. `dev:reset` removes the shared one and the legacy
`CodeBot Dev Host` profile. It does not remove the downloaded
provider CLIs, which the whole computer shares. Press `Ctrl+C` in the runner terminal
to stop only the processes started by that runner, or run `bun run dev:stop` from the worktree once
that terminal is gone. Never stop a dev stack with `pkill -f electron` or `pkill -f bun`: on a
machine running several worktrees those kill the other checkouts' work mid-write, which is what
`dev:status` and `dev:stop` exist to make unnecessary.

Set `CODEBOT_DEV_ICE_TRANSPORT_POLICY=relay` before this command to force Team API traffic through
coturn. This test option works only with the development renderer. Production always starts with `all`.
Set `CODEBOT_DEV_SYNC_PROFILE=1` as well to let `bun run perf:remote` read the host requests of the
desktop client.
Set `CODEBOT_DEV_AWAY_SECONDS=<seconds>` to change the time without input on the computer after which
a phone gets the notifications of a host (30 seconds by default), for example `5` to test it. The host
and the desktop client of the stack both read it. A packaged app ignores it.

The normal `check` command is offline and uses a fake App Server. Manual smoke scripts may use the
signed-in subscription and must not run in CI.

Local agents run with the providers' unrestricted execution modes. Each agent starts in its own
persistent `~/CodeBot/Agents/<agent-id>` workspace and also receives `~/CodeBot/Shared`; routine command
and filesystem work in both locations runs without CodeBot adding another permission boundary.
Because these modes are intentionally unrestricted, they also permit host access outside those
directories when the provider and operating system allow it.


## Security

Read [SECURITY.md](SECURITY.md) before you report a vulnerability. Do not put credentials, private
files or conversations in a report.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md).

## License and attribution

Copyright 2026 Synthetify Labs spółka z ograniczoną odpowiedzialnością.

CodeBot is a fork and keeps the copyright notice of the original project (see [docs/codebot/README.md](docs/codebot/README.md)). It is licensed under the
[PolyForm Noncommercial License 1.0.0](LICENSE). The license allows noncommercial use, changes and
copies, and it requires that each copy keeps the license text and the notices. Do not remove the
[LICENSE](LICENSE) file or the [NOTICE](NOTICE) file. NOTICE also holds the notices of the
third-party parts that CodeBot includes. Commercial use needs a separate license from the copyright
owner.

CodeBot is an independent project. It is not affiliated with, endorsed by, or sponsored by OpenAI,
Anthropic or any other provider that it can use. Their names describe compatibility only.
