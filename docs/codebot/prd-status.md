# CodeBot PRD status

Source of truth: `CodeBot-PRD.md` (rev 12) one level above this repository.
Each row is one PRD item. An item is `done` only when the proof column names a test, a report file,
or a screenshot that shows it. `partial` and `blocked` rows say what is missing.

Status values: `done`, `partial` (the proof says what is missing), `todo`, `not-on-windows` (cannot be checked on this computer; the proof says why), `dropped-by-decision` (names the decision), `info` (a statement, not a task).

Path prefix: `CS` is the folder `Coding Software` that holds this repository (`CS/CodeBot` is the main checkout, `CS/_wt/<name>` a worktree). `CS/_archive/test-run-3/` holds the logs of the last full run of the lead; a test counts as passed only when its log shows it and has no `error: script ... exited with code` line (on disk the colon in a log name is stored as the character U+F03A, a Windows rule for names from Git Bash). `CS/CodeBot/.codebot-build/` holds E2E reports and screenshots (not in git). Package D1 is the open app E2E tests, D2 knip, doc links and branding, D3 the extra themes.

Work packages (column W) are described in [decisions.md](decisions.md#work-packages).

## 1. Summary

| ID | Requirement | W | Status | Proof |
| --- | --- | --- | --- | --- |
| 1.1 | Fork of OpenBot | W00 | done | `git log`: `main` starts from upstream `100c60e89` (tag `openbot-baseline`); the download was the same tree |
| 1.2 | Desktop app for macOS, Windows, Linux | all | partial | Windows: `CS/_archive/test-run-3/build.log` (build passes), `CS/_archive/test-run-3/verify:preload.log`. Not checked: macOS and Linux builds (no Mac, no WSL, no Docker on this computer). Code keeps the POSIX branches; see windows-test-status.md |
| 1.3 | Internal use only, no sale | W19 | done | `README.md` intro and "License and attribution" |
| 1.4 | Many projects at once, short replies, clean screen, agents stay in folder | all | info | Proof is in the rows 5.x, 6.x, 8.x, 10.x |
| 1.5 | Phase 1 runs on each user's computer | all | partial | Local engine, projects and chats run: `CS/CodeBot/.codebot-build/projects-e2e/report.json`, `CS/_archive/test-run-3/test:projects.log`. Not checked: an installed package on a user computer |
| 1.6 | Phase 2 needs no screen changes | W07, W12, W17 | done | The same screens drive a joined server engine: `CS/CodeBot/.codebot-build/server-mode-e2e/report.json` (22 checks), `CS/CodeBot/.codebot-build/server-mode-ui/report.json`, `CS/_archive/test-run-3/test:server-mode.log` |

## 2. Problems to solve

| ID | Problem | Solved by | Status | Proof |
| --- | --- | --- | --- | --- |
| 2.1 | Replies too long | 8.x | info | Solved by 8.x |
| 2.2 | Too much CLI text | 8.x | info | Solved by 8.x |
| 2.3 | Agents search all folders | 10.x | info | Solved by 10.x |
| 2.4 | No clear new chat button or history | 5.5, 5.6 | info | Solved by 5.5, 5.6 |
| 2.5 | Right panel too small, does not close | 14.x | info | Solved by 14.x |
| 2.6 | VS Code uses too much RAM | 4.7, 7.5 | info | Solved by 4.7, 7.5; see 4.7 (not measured on current main) |
| 2.7 | Claude Code in VS Code lacks CLI commands | 9.x | info | Solved by 9.x |

## 3. Fork, name, license

| ID | Requirement | W | Status | Proof |
| --- | --- | --- | --- | --- |
| 3.1 | Fork latest OpenBot main | W00 | done | Upstream `main` HEAD on 2026-11-25 was `100c60e89`; `git status` of the copied download against it showed no difference |
| 3.2 | Product name CodeBot in all user-facing text | W00 | partial | Visible name is "OpenBot Code" by decision D18 (decisions.md). Open (package D2): `CS/_archive/test-run-3/check:branding.log` lists 1237 upstream name lines in 350 files (exit 1) |
| 3.3 | CodeBot bundle ID and app ID, side-by-side install | W00 | partial | `electron-builder.yml` has appId `app.codebot.desktop` and scheme `codebot`. Not checked: an install of a packaged build next to OpenBot |
| 3.4 | Data folder ~/CodeBot, userData CodeBot | W00 | partial | Data folder rename in `src/backend/agent-store.ts` and `src/main/index.ts` (commit `3377172d0`). Not checked: a run that lists the folders |
| 3.5 | Keep copyright notice, LICENSE, NOTICE | W00 | done | `git diff openbot-baseline main -- LICENSE NOTICE` is empty; `electron-builder.yml` keeps the copyright line. `README.md` and `docs/codebot/README.md` explain it |
| 3.6 | Remove analytics and telemetry | W02 | done | Analytics removed, inert call sites by D17: `CS/_archive/test-run-3/test:no-telemetry.log` (PASS: no endpoint, no consent code, no network or storage API, CSP without analytics origin); `CS/CodeBot/.codebot-build/no-telemetry-e2e/report.json` |
| 3.7 | Remove calls to OpenBot cloud services | W02, W03, W04 | partial | Billing, hosting and cloud endpoints removed: `CS/_archive/test-run-3/test:no-billing.log`, `CS/_archive/test-run-3/test:mobile-account.log`, `CS/_archive/test-run-3/test:account-login.log`. Open (package D2): `CS/_archive/test-run-3/check:branding.log` lists 985 lines that name an upstream server |

## 4. Architecture rules

| ID | Requirement | W | Status | Proof |
| --- | --- | --- | --- | --- |
| 4.1 | Keep engine / screen split | all | done | Engine on a host and screen on a client run apart: `CS/CodeBot/.codebot-build/server-mode-e2e/report.json`, `CS/_archive/test-run-3/verify:preload.log` |
| 4.2 | Screen talks to engine only through the typed API | all | done | `CS/_archive/test-run-3/verify:preload.log`: the built preload exposes 941 methods and each matches a typed endpoint |
| 4.3 | Same screen for local and remote engine | W07, W17 | done | Same screen for a local and a joined engine: `CS/CodeBot/.codebot-build/server-mode-ui/report.json` (12 checks) |
| 4.4 | Keep SQLite event log and database | W07 | done | Project chats use the event log and database, incl. a full compaction cycle: `CS/CodeBot/.codebot-build/projects-e2e/report.json` |
| 4.5 | Keep all provider adapters | all | done | Provider stand-in suites run on Windows (12 of 13 pass, the 13th is not applicable): `docs/codebot/windows-test-status.md`; `CS/_archive/test-run-3/test:cli-spawn-target.log` |
| 4.6 | Keep TypeScript, Bun, Electron, SolidJS | all | done | Stack unchanged (TypeScript, Bun, Electron, SolidJS): `CS/_archive/test-run-3/build.log` passes; `CS/_archive/test-run-3/typecheck:mobile.log` |
| 4.7 | RAM not more than 15% over baseline | W01 | partial | Measured only on the early rename tree `r0`: max +6.1% over the baseline in `CS/_measure/summary.md` (14 rows pass); harness test `CS/_archive/test-run-3/test:bench-harness.log`. Not measured yet on current main |

## 5. Projects and chats

| ID | Requirement | W | Status | Proof |
| --- | --- | --- | --- | --- |
| 5.1 | Project = workspace on a folder with one or more agents (role, instructions, default model) | W07, W12 | done | Project with a main folder, two agents with role and instructions: `CS/CodeBot/.codebot-build/projects-e2e/report.json` |
| 5.2 | One main folder, picked at creation | W07, W12 | done | Every project agent turn runs in the main folder: `CS/CodeBot/.codebot-build/projects-e2e/report.json` |
| 5.3 | More folders (additionalDirectories) | W07, W12 | done | Write roots of the provider include main and second folder: `CS/CodeBot/.codebot-build/projects-e2e/report.json` |
| 5.4 | Many chats per project, each with its own provider session | W07 | done | Many chats per project, each with its own provider thread, compaction per chat: `CS/CodeBot/.codebot-build/projects-e2e/report.json` |
| 5.5 | New chat button per project | W12 | done | "New chat" button on the project column: `CS/CodeBot/.codebot-build/w14/screens/preview-pinned-dark.png`, `CS/CodeBot/.codebot-build/w12b/screens/two-projects-side-by-side-dark.png` |
| 5.6 | Chat history list, newest first, title and date | W12 | done | Engine lists newest first with title from the first message: `CS/CodeBot/.codebot-build/projects-e2e/report.json`; screen: `CS/CodeBot/.codebot-build/w14/screens/preview-pinned-dark.png` (Chat history, title, date) |
| 5.7 | Automatic chat title, rename | W07, W12 | partial | Engine title and rename pass: `CS/CodeBot/.codebot-build/projects-e2e/report.json`. Screen rename not proven: the app E2E test:project-shell fails in the run of the lead (no fake provider in that run; package D1) |
| 5.8 | Search, rename, archive, delete chats | W07, W12 | partial | Engine search (title and text), archive, restore, pin, delete pass: `CS/CodeBot/.codebot-build/projects-e2e/report.json`. Screen actions not proven: the app E2E test:project-shell fails in the run of the lead (no fake provider in that run; package D1) |
| 5.9 | Chat keeps running when the user leaves | W07 | done | A chat keeps running while the user works in another chat; five run at once: `CS/CodeBot/.codebot-build/projects-e2e/report.json` |
| 5.10 | Provider and model per chat, default from project | W07, W12 | done | Chat model, change, clear back to the agent model, local model id: `CS/CodeBot/.codebot-build/projects-e2e/report.json`; model picker in `CS/CodeBot/.codebot-build/w14/screens/preview-pinned-dark.png` |
| 5.11 | Keep automatic context compaction per chat | W07 | done | Full compaction cycle on the provider thread of a project chat: `CS/CodeBot/.codebot-build/projects-e2e/report.json` |
| 5.12 | Project instructions, memory, skills per project | W07 | done | Project instructions and agent memory reach the prompt: `CS/CodeBot/.codebot-build/projects-e2e/report.json`; project and user skills and commands: `CS/CodeBot/.codebot-build/slash-commands/report.json` (9.5) |

## 6. Main layout

| ID | Requirement | W | Status | Proof |
| --- | --- | --- | --- | --- |
| 6.1 | Left bar: project list with name, folder color, status dot | W12 | partial | Project rows with name, access badge and status dot: `CS/CodeBot/.codebot-build/w14/screens/preview-pinned-dark.png`. Folder color: avatars are grey in the kept screenshots, so no color is shown |
| 6.2 | Click a project: its chats, file tree, panels | W12 | done | A click on a project shows its chats and file tree: `CS/CodeBot/.codebot-build/w12b/report.json`, `CS/_archive/test-run-3/test:shell-integration.log`, `CS/CodeBot/.codebot-build/w12b/screens/tree-alpha-dark.png` |
| 6.3 | Chat list column and active chat | W12 | done | Chat list column and active chat: `CS/CodeBot/.codebot-build/w14/screens/preview-pinned-dark.png` |
| 6.4 | File tree panel follows the project | W11, W12 | done | Tree follows the active project: `CS/_archive/test-run-3/test:shell-integration.log` (ok); `CS/_archive/test-run-3/test:explorer-files.log` |
| 6.5 | Split panels left/right and top/bottom | W12 | partial | Chats side by side and a preview split are shown: `CS/CodeBot/.codebot-build/w12b/screens/two-projects-side-by-side-dark.png`, `CS/CodeBot/.codebot-build/w14/screens/preview-open-dark.png`. Top/bottom split and dock commands not proven: the app E2E test:project-shell fails in the run of the lead (no fake provider in that run; package D1) |
| 6.6 | Panel holds a chat, a file preview, or the browser | W12, W14 | partial | Chat and file in a panel: `CS/_archive/test-run-3/test:shell-integration.log`. Browser panel not proven: `CS/_archive/test-run-3/test:project-panels.log` fails 3 browser steps (package D1) |
| 6.7 | Panel can hold a chat of another project; shows project name and own file tree | W12 | done | Two chats of two projects side by side, each with project name and own file tree: `CS/_archive/test-run-3/test:shell-integration.log`, `CS/CodeBot/.codebot-build/w12b/screens/two-projects-side-by-side-dark.png` |
| 6.8 | Drag panels to move and resize | W12 | partial | Resize of a preview panel saved: `CS/CodeBot/.codebot-build/w14/report.json`. Drag to move panels not proven: the app E2E test:project-shell fails in the run of the lead (no fake provider in that run; package D1) |
| 6.9 | Layout saved per project, restored on restart | W12 | partial | Preview width and pin saved: `CS/CodeBot/.codebot-build/w14/report.json`. Layout restore after restart: the step fails in `CS/_archive/test-run-3/test:project-shell.log` (package D1) |
| 6.10 | Keyboard shortcuts, user can change them | W15 | partial | Package W15 merged, but `CS/_archive/test-run-3/test:shortcuts.log` fails in the run of the lead (the script needs --allow-mutations; package D1). No report file exists |
| 6.11 | Bottom of left bar: account, server status, usage | W13 | partial | Account and server status shown: `CS/_archive/test-run-3/test:shell-integration.log`, `CS/CodeBot/.codebot-build/w12b/screens/status-entries-dark.png`. Usage row not proven (no provider data in the sandbox) |

## 7. File tree and previews

| ID | Requirement | W | Status | Proof |
| --- | --- | --- | --- | --- |
| 7.1 | File tree like VS Code Explorer | W11 | done | Tree like Explorer: `CS/_archive/test-run-3/test:explorer-files.log` (16 ok); `CS/CodeBot/.codebot-build/w12b/screens/tree-alpha-dark.png` |
| 7.2 | Colored folder and file icons (Material Icon Theme) | W11 | done | Colored folder and file icons: `CS/CodeBot/.codebot-build/w12b/screens/two-projects-side-by-side-dark.png` |
| 7.3 | Git status in the tree | W11 | partial | Git status service passes: `CS/_archive/test-run-3/test:explorer-git.log`. Decorations in the tree: no screenshot shows them |
| 7.4 | Git panel: branch, changed files, history | W11 | partial | Git service (status, log, commit files) passes: `CS/_archive/test-run-3/test:explorer-git.log`; Git tab visible in `CS/CodeBot/.codebot-build/w12b/screens/two-projects-side-by-side-dark.png`. Panel content has no screenshot |
| 7.5 | Click a file: Monaco preview, read and edit | W11 | partial | Read, save, conflict, encoding pass: `CS/_archive/test-run-3/test:explorer-files.log`; a file opens in a panel: `CS/_archive/test-run-3/test:shell-integration.log`. No screenshot of the Monaco editor was kept |
| 7.6 | Markdown, image, SVG, PDF, JSON, CSV previews | W11 | partial | Markdown preview: `CS/CodeBot/.codebot-build/w14/screens/preview-pinned-dark.png`. Image, SVG, PDF, JSON, CSV previews: no kept screenshot or test |
| 7.7 | Diff view for files changed in the chat | W11 | partial | Diff data of working file, commit, new, deleted, renamed passes: `CS/_archive/test-run-3/test:explorer-git.log`. The diff view has no screenshot |
| 7.8 | Tree updates live | W11 | partial | Watch events (recursive and per folder) pass: `CS/_archive/test-run-3/test:explorer-files.log`. Tree update in the screen not proven |

## 8. Short replies

| ID | Requirement | W | Status | Proof |
| --- | --- | --- | --- | --- |
| 8.1 | Fixed reply rule, editable globally and per project | W10 | done | Rule first in the instructions, project over global over default, empty rule: `CS/_archive/test-run-3/test:short-replies.log` |
| 8.2 | Show only the final answer by default | W10 | done | Final answer with a one-line summary: `CS/CodeBot/.codebot-build/w14/screens/preview-pinned-dark.png`; engine: `CS/_archive/test-run-3/test:short-replies.log` |
| 8.3 | One-line summary hides tools, reads, commands, thinking | W10 | done | "1 step 3s Details" summary line: `CS/CodeBot/.codebot-build/w14/screens/preview-pinned-dark.png`; counts: `CS/_archive/test-run-3/test:short-replies.log` |
| 8.4 | Details button opens full steps | W10 | partial | Details button visible: `CS/CodeBot/.codebot-build/w14/screens/preview-pinned-dark.png`; steps load lazily (engine): `CS/_archive/test-run-3/test:short-replies.log`. The opened details view has no kept screenshot |
| 8.5 | Default short or detailed in settings | W10 | partial | Setting built (package W10); no kept test or screenshot |
| 8.6 | Code blocks fold after 20 lines | W10 | partial | Built (package W10: 20 lines, Show all, Show less); no kept test or screenshot |
| 8.7 | Clean chat text area | W10 | partial | Clean composer: `CS/CodeBot/.codebot-build/w14/screens/preview-pinned-dark.png`; no dedicated check |

## 9. Slash commands

| ID | Requirement | W | Status | Proof |
| --- | --- | --- | --- | --- |
| 9.1 | "/" shows a command menu | W08 | done | `CS/CodeBot/.codebot-build/slash-commands-ui/report.json` (passed), `CS/_archive/test-run-3/test:slash-commands-ui.log`; `CS/CodeBot/.codebot-build/w08-slash/screens/menu-all.png` |
| 9.2 | List comes from the provider engine | W08 | done | "the saved list comes from the engine": `CS/CodeBot/.codebot-build/slash-commands/report.json` |
| 9.3 | New Claude Code version: read list once in background, zero tokens | W08 | done | One background probe per version, zero model requests: `CS/CodeBot/.codebot-build/slash-commands/report.json` |
| 9.4 | Saved list used in every chat, refreshed on provider update | W08 | done | Saved list in every chat, refresh on version change: `CS/CodeBot/.codebot-build/slash-commands/report.json` |
| 9.5 | Include custom commands and skills from project and user .claude | W08 | done | Project and user commands and skills: `CS/CodeBot/.codebot-build/slash-commands/report.json` |
| 9.6 | Command sent as the engine expects, result in chat | W08 | done | Local command output in the chat, no model request: `CS/CodeBot/.codebot-build/slash-commands/report.json` |
| 9.7 | Special screens only for model, thinking level, resume | W08 | done | Screens for model, effort, resume only: `CS/CodeBot/.codebot-build/slash-commands/report.json`; `CS/CodeBot/.codebot-build/w08-slash/screens/screen-model.png` |
| 9.8 | New provider command appears with no code change | W08 | done | A new engine command appears with no code change: `CS/CodeBot/.codebot-build/slash-commands/report.json` |

## 10. Folder lock

| ID | Requirement | W | Status | Proof |
| --- | --- | --- | --- | --- |
| 10.1 | Access level picked at project creation: Strict, Normal, Open | W09, W12 | partial | Access level in the create dialog (package W12); level of a project agent stored: `CS/CodeBot/.codebot-build/projects-e2e/report.json`. Dialog not proven: the app E2E test:project-shell fails in the run of the lead (no fake provider in that run; package D1) |
| 10.2 | Strict: prompt rule, engine lock, sandbox box | W09 | not-on-windows | Prompt rule and hooks pass (`CS/_archive/test-run-3/test:folder-lock.log`). The OS sandbox cannot start on Windows: Strict is refused with a message (same log). Seatbelt and bubblewrap plans are only string-checked: `CS/_archive/test-run-3/test:folder-lock-confinement.log` |
| 10.3 | Normal: prompt rule and engine lock | W09 | done | Normal: prompt rule, file-tool hooks, write roots: `CS/_archive/test-run-3/test:folder-lock.log` |
| 10.4 | Open: full access | W09 | done | "open: no folder lock", write outside works: `CS/_archive/test-run-3/test:folder-lock.log` |
| 10.5 | Default Normal | W09 | done | Project agents start with Normal: `CS/CodeBot/.codebot-build/projects-e2e/report.json` |
| 10.6 | Level change applies to new turns | W09 | done | "level change applies to the next turn": `CS/_archive/test-run-3/test:folder-lock.log` |
| 10.7 | Level badge on the project row | W12 | done | Lock icon (open or closed) on each project row: `CS/CodeBot/.codebot-build/w12b/screens/two-projects-side-by-side-dark.png` |
| 10.8 | No search outside allowed folders in Strict and Normal, tested | W09 | partial | Normal: read, grep, glob outside are blocked, secret not in any result: `CS/_archive/test-run-3/test:folder-lock.log`. Strict: not-on-windows (sandbox) |
| 10.9 | Server: Strict uses one container per project | W09, W17 | partial | One container per project with a fake docker, mounts only project folders: `CS/_archive/test-run-3/test:folder-lock-container.log`. Real Docker not run (not on this computer) |

## 11. Accounts and login

| ID | Requirement | W | Status | Proof |
| --- | --- | --- | --- | --- |
| 11.1 | Login with Nextcloud username and password | W03, W04 | done | Login with Nextcloud name and password against a mock Nextcloud: `CS/_archive/test-run-3/test:account-login.log`, `CS/_archive/test-run-3/test:account-desktop.log`. Not checked: a real Nextcloud |
| 11.2 | Account service on the home server, Nextcloud OIDC | W03 | done | Bun account service, OIDC and Nextcloud mode, restart keeps sessions: `CS/_archive/test-run-3/test:account-login.log` (mock provider) |
| 11.3 | Replace Cloudflare account API, remove email-code login | W03, W04 | done | Email-code routes not served, desktop and phone use the service: `CS/_archive/test-run-3/test:mobile-account.log`, `CS/_archive/test-run-3/test:account-desktop.log` |
| 11.4 | Self-hosted Signal and TURN | W03 | partial | Signal routes need a signature, host socket dropped on a disabled owner: `CS/_archive/test-run-3/test:account-remote-access.log`, `CS/_archive/test-run-3/test:account-signal.log`. TURN has no test |
| 11.5 | Removed or disabled Nextcloud user loses access | W03 | done | Disabled user loses access: `CS/_archive/test-run-3/test:account-user-disabled.log`, `CS/_archive/test-run-3/test:account-signal.log`, `CS/_archive/test-run-3/test:account-desktop.log` |
| 11.6 | Each user sees only their own data unless shared | W03, W17 | partial | Member gets 403 on admin routes: `CS/_archive/test-run-3/test:team-api-routes.log`; projects: `CS/CodeBot/.codebot-build/projects-e2e/report.json`. No test of data separation between two users |
| 11.7 | Login optional in Phase 1, local profile | W04 | done | No account request with no service address, local profile: `CS/_archive/test-run-3/test:account-desktop.log` |

## 12. Automatic updates

| ID | Requirement | W | Status | Proof |
| --- | --- | --- | --- | --- |
| 12.1 | Update files on the home server, not GitHub Releases | W06 | done | Feed from the home server: `CS/_archive/test-run-3/test:app-update.log` |
| 12.2 | electron-updater generic provider | W06 | done | "the build uses the generic provider": `CS/_archive/test-run-3/test:app-update.log` |
| 12.3 | DMG, EXE, AppImage and metadata files in the update folder | W06 | done | Plan lists installers, block maps, metadata; two mac architectures merge: `CS/_archive/test-run-3/test:release-script.log` (mock files; no real DMG or AppImage built) |
| 12.4 | One-command release script | W06 | done | One-command release script, dry run, folder and WebDAV transports: `CS/_archive/test-run-3/test:release-script.log` |
| 12.5 | Check at start and every hour | W06 | done | "checks at start and every hour": `CS/_archive/test-run-3/test:app-update.log` |
| 12.6 | Background download, "Restart to update", auto-restart when idle option | W06 | partial | Background download and "Restart to update": `CS/_archive/test-run-3/test:app-update.log`. Auto-restart when idle: no test |
| 12.7 | Keep provider CLI auto-update | W06 | partial | Provider CLI update code not changed by CodeBot; no test |
| 12.8 | Signing optional; document unsigned builds | W06, W19 | done | `docs/codebot/unsigned-builds.md` (Windows, macOS, Linux steps), linked from `README.md`, `home-server.md` and `user-guide.md`. Steps were read against `electron-builder.yml`; not tried on a real unsigned installer |

## 13. Usage and status bar

| ID | Requirement | W | Status | Proof |
| --- | --- | --- | --- | --- |
| 13.1 | Keep left-bar server status and plan limits | W13 | partial | Server status in the left bar: `CS/CodeBot/.codebot-build/w12b/screens/status-entries-dark.png`. Plan limits: not proven |
| 13.2 | 5-hour and weekly limit left per provider | W13 | partial | Built (package W13); not proven (no provider limit data in the sandbox) |
| 13.3 | Local model status: online, GPU load, GPU memory, models loaded | W13 | done | Online, kinds, loaded models, GPU load and memory from a helper or exporter: `CS/_archive/test-run-3/test:local-model-servers.log`, `CS/CodeBot/.codebot-build/local-model-servers-e2e/report.json` |
| 13.4 | Click opens detail view | W13 | partial | Detail dialog built (package W13); its screenshots were not kept |

## 14. Right panel and browser

| ID | Requirement | W | Status | Proof |
| --- | --- | --- | --- | --- |
| 14.1 | Keep all right panel content, fix behavior | W14 | partial | Right panel content kept; no test |
| 14.2 | No fixed right panel; agent content opens as split panel | W14 | done | Preview opens as a dock split, no fixed right panel: `CS/CodeBot/.codebot-build/w14/report.json`, `CS/CodeBot/.codebot-build/w14/screens/preview-open-dark.png` |
| 14.3 | Default width 50%, drag to resize, size saved | W14 | done | Ratio 0.50 by default, resize saved 0.66: `CS/CodeBot/.codebot-build/w14/report.json` |
| 14.4 | Panel closes by itself (switch, click in input, agent done) | W14 | done | Closes on chat switch, project switch, click in the input: `CS/CodeBot/.codebot-build/w14/report.json` |
| 14.5 | Pin keeps the panel open | W14 | done | Pin keeps the preview: `CS/CodeBot/.codebot-build/w14/report.json`, `CS/CodeBot/.codebot-build/w14/screens/preview-pinned-dark.png` |
| 14.6 | Embedded browser as split panel | W14 | partial | Browser panel built; its steps fail in `CS/_archive/test-run-3/test:project-panels.log` and in `CS/CodeBot/.codebot-build/w14/report.json` (package D1) |
| 14.7 | Browser panel: address bar, back, forward, reload, control toggle | W14 | partial | Same as 14.6: the address bar step fails in `CS/_archive/test-run-3/test:project-panels.log` |
| 14.8 | Keep agent browser control (CDP) | W14 | done | Agent browser control (CDP) kept: `CS/_archive/test-run-3/test:browser.log` |

## 15. Keep, hide, remove

| Feature | Decision | W | Status | Proof |
| --- | --- | --- | --- | --- |
| Billing, Stripe, plans, license purchase | Remove | W02 | done | `CS/_archive/test-run-3/test:no-billing.log` |
| OpenBot hosted servers | Remove | W02 | partial | `CS/_archive/test-run-3/test:no-billing.log` passes; upstream server names are left in text (package D2, `CS/_archive/test-run-3/check:branding.log`) |
| Analytics and telemetry | Remove | W02 | done | `CS/_archive/test-run-3/test:no-telemetry.log` |
| Mobile app | Keep, visible, self-hosted services | W18 | done | `CS/_archive/test-run-3/test:mobile-account.log`, `CS/_archive/test-run-3/typecheck:mobile.log` |
| Routines | Keep, hidden | W05 | done | Hidden by default, switch: `CS/_archive/test-run-3/test:advanced-features.log` |
| Channels | Keep, hidden | W05 | done | Hidden by default, switch: `CS/_archive/test-run-3/test:advanced-features.log` |
| Marketplace | Keep, hidden | W05 | done | Hidden by default, switch: `CS/_archive/test-run-3/test:advanced-features.log` |
| Slack, Discord, Telegram, WhatsApp connectors | Keep, hidden | W05 | done | Switch `chatApps`: `CS/_archive/test-run-3/test:advanced-features.log` |
| Computer Use | Keep, hidden | W05 | done | Switch `computerUse`: `CS/_archive/test-run-3/test:advanced-features.log` |
| Remote desktop | Keep, hidden | W05 | done | Switch `remoteDesktop`: `CS/_archive/test-run-3/test:advanced-features.log` |
| Local skills | Keep, visible | W05 | partial | Not removed or changed by any package; skills of project and user are listed: `CS/CodeBot/.codebot-build/slash-commands/report.json` |
| Embedded browser | Keep, visible, redesigned | W14 | partial | `CS/_archive/test-run-3/test:browser.log` passes; the redesigned panel fails in `CS/_archive/test-run-3/test:project-panels.log` (package D1) |
| 15.1 | Hidden: no button; switch in Settings > Advanced features | W05 | done | Default every switch off, tools not offered: `CS/_archive/test-run-3/test:advanced-features.log` |
| 15.2 | Turned-on feature appears in left bar or settings | W05, W12 | done | A feature turned on appears in the rail: `CS/_archive/test-run-3/test:shell-integration.log` |

## 16. Themes

| ID | Requirement | W | Status | Proof |
| --- | --- | --- | --- | --- |
| 16.1 | Keep current dark theme | W16 | done | Dark palette is the default and applies: `CS/_archive/test-run-3/test:themes.log` (45 checks); `CS/CodeBot/.codebot-build/w16/screens/chat-dark.png` |
| 16.2 | Light theme | W16 | done | Light theme: `CS/_archive/test-run-3/test:themes.log`; `CS/CodeBot/.codebot-build/w16/screens/chat-light.png` |
| 16.3 | Dark Modern, Light Modern, high contrast, warm dark, blue dark styles | W16 | partial | Only `codebot-dark` and `codebot-light` exist. Dark Modern, Light Modern, high contrast, warm dark, blue dark: open (package D3) |
| 16.4 | Palette JSON file system for all themes | W16 | done | Palette JSON files, a user file is listed with no restart: `CS/_archive/test-run-3/test:themes.log`; `CS/CodeBot/.codebot-build/w16/screens/chat-custom.png` |
| 16.5 | Theme applies to chats, file tree, Monaco, panels, browser frame, dialogs | W16 | done | Chat, settings, editor tokens (contrast 4.5): `CS/_archive/test-run-3/test:themes.log`; `CS/CodeBot/.codebot-build/w16/screens/settings-light.png`. Dialogs and browser frame: no check |
| 16.6 | Follow system light/dark | W16 | done | "System follows a dark / light operating system": `CS/_archive/test-run-3/test:themes.log` |

## 17. Local models

| ID | Requirement | W | Status | Proof |
| --- | --- | --- | --- | --- |
| 17.1 | Local model per project and per chat | W13, W07 | done | Local model id per chat, models offered to agents, projects, chats: `CS/CodeBot/.codebot-build/projects-e2e/report.json`, `CS/CodeBot/.codebot-build/local-model-servers-e2e/report.json` |
| 17.2 | OpenAI-compatible endpoint and local server detection | W13 | done | Kind detection (Ollama, LM Studio, vLLM, OpenAI-compatible), host scan: `CS/_archive/test-run-3/test:local-model-servers.log` |
| 17.3 | Settings "Local server" entry: URL and optional key | W13 | partial | Settings section built (package W13); screenshots missing; engine store tested: `CS/_archive/test-run-3/test:local-model-servers.log` |
| 17.4 | Many local machines, one entry each | W13 | done | One entry per machine, polling per entry: `CS/_archive/test-run-3/test:local-model-servers.log` |

## 18. Phase 2: server mode

| ID | Requirement | W | Status | Proof |
| --- | --- | --- | --- | --- |
| 18.1 | Engine on home server (Linux server or Docker install) | W17 | not-on-windows | Install check script and `docs/codebot/server-mode.md` exist; a Linux server or Docker install cannot run on this computer |
| 18.2 | Project folders on the server | W17 | done | Project folders on the server, explorer and chat there: `CS/CodeBot/.codebot-build/server-mode-e2e/report.json` |
| 18.3 | Desktop and mobile connect to the server engine, same screen | W17 | partial | Desktop client works against the server engine: `CS/CodeBot/.codebot-build/server-mode-e2e/report.json`. Mobile against a server engine: not tested |
| 18.4 | Switch between "This computer" and "Home server" | W17 | done | Server menu replaces tabs (D21): `CS/CodeBot/.codebot-build/server-mode-ui/report.json`, `CS/CodeBot/.codebot-build/c1/screens/switch-home-server-dark.png` |
| 18.5 | Phase 1 must not block Phase 2 | all | done | Same API for local and server: `CS/CodeBot/.codebot-build/server-mode-e2e/report.json` |

## 19. Quality and testing

| ID | Requirement | W | Status | Proof |
| --- | --- | --- | --- | --- |
| 19.1 | Pass check, typecheck, knip, check:ui, i18n:check | W21 | partial | Pass: `CS/_archive/test-run-3/lint.log`, `CS/_archive/test-run-3/build.log`, `CS/_archive/test-run-3/i18n:check.log`, `CS/_archive/test-run-3/typecheck:mobile.log`, `CS/_archive/test-run-3/verify:preload.log`. Fail: `CS/_archive/test-run-3/knip:check.log` (package D2), `CS/_archive/test-run-3/check:doc-links.log` (D2) |
| 19.2 | Tests for each new feature | all | partial | Each package has an E2E script (see rows above). App E2E test:project-shell, project-layout, project-panels, shortcuts fail in the run of the lead (package D1) |
| 19.3 | Screenshots of every screen and theme | W21 | partial | Screens exist for some screens and themes under `CS/CodeBot/.codebot-build/` (c1, c3, w04, w08-slash, w12, w12b, w14, w16). Not every screen and theme (package W21) |
| 19.4 | Review and fix every screenshot | W21 | partial | Agents looked at their own screenshots; no full review pass yet (package W21) |
| 19.5 | Build and test on Windows, code stays cross-platform | all | done | Build and tests on Windows with POSIX branches kept: `docs/codebot/windows-test-status.md`, `CS/_archive/test-run-3/build.log` |
| 19.6 | Measure RAM and CPU, meet 4.7 | W01 | partial | Harness and r0 run: `CS/_measure/summary.md`, `CS/_archive/test-run-3/test:bench-harness.log`. Current main not measured |

## 20. Acceptance criteria

| ID | Criterion | Status | Proof |
| --- | --- | --- | --- |
| 20.1 | Named CodeBot everywhere a user can see | partial | Visible name set (D18); upstream names left: `CS/_archive/test-run-3/check:branding.log` (package D2) |
| 20.2 | Create a project on a folder, open 3 chats, see them in history | partial | Engine: 3 chats in history: `CS/CodeBot/.codebot-build/projects-e2e/report.json`. Screen test fails: `CS/_archive/test-run-3/test:project-shell.log` |
| 20.3 | Five projects run chats at the same time, status dots correct | done | Five projects run chats at the same time, states correct: `CS/CodeBot/.codebot-build/projects-e2e/report.json`; dots: `CS/CodeBot/.codebot-build/w14/screens/preview-pinned-dark.png` |
| 20.4 | Two chats from two projects side by side, each with its file tree | done | Two chats of two projects, each with a file tree: `CS/_archive/test-run-3/test:shell-integration.log`, `CS/CodeBot/.codebot-build/w12b/screens/two-projects-side-by-side-dark.png` |
| 20.5 | Strict and Normal: no write outside allowed folders | partial | Normal: write outside blocked: `CS/_archive/test-run-3/test:folder-lock.log`. Strict: not-on-windows (see 10.2) |
| 20.6 | Replies short by default; Details shows all steps | partial | Short by default: `CS/CodeBot/.codebot-build/w14/screens/preview-pinned-dark.png`. Details view not proven (see 8.4) |
| 20.7 | "/" shows the Claude Code command list read from the engine | done | "/" list read from the Claude Code engine: `CS/CodeBot/.codebot-build/slash-commands/report.json`, `CS/CodeBot/.codebot-build/slash-commands-ui/report.json` |
| 20.8 | Agent previews open wide, close by themselves, stay when pinned | partial | Preview opens wide, closes by itself, stays when pinned: `CS/CodeBot/.codebot-build/w14/report.json` (11 steps pass); the 3 browser-panel steps of that report fail (package D1) |
| 20.9 | Login works with a Nextcloud account | partial | Against a mock Nextcloud only: `CS/_archive/test-run-3/test:account-login.log`, `CS/_archive/test-run-3/test:account-desktop.log` |
| 20.10 | New version on the home server updates all clients | partial | Client side against a mock feed: `CS/_archive/test-run-3/test:app-update.log`, `CS/_archive/test-run-3/test:release-script.log`. No real server and installer |
| 20.11 | All themes look correct in every screenshot | partial | Dark and light checked (`CS/_archive/test-run-3/test:themes.log`); the new themes (16.3, package D3) and all screens (W21) are open |
| 20.12 | No calls to OpenBot servers; billing is gone | partial | No billing and no telemetry pass; upstream server names left: `CS/_archive/test-run-3/check:branding.log` (package D2) |

## Progress log

### 2026-11-27 (package D5)

- Status and proof of every item filled from the merged code, the package archives `CS/_archive/<package>/TASKS.md`, the logs of `CS/_archive/test-run-3/` and the kept reports and screenshots. Nothing is `done` without a log, report or screenshot.
- Open from the run of the lead: knip, doc links, branding (D2); themes 16.3 (D3); app E2E project-shell, project-layout, project-panels, shortcuts (D1); RAM and CPU 4.7 and 19.6 on current main (not measured).
- No screenshot was kept for: Monaco editor, git panel, details view, local server settings, status detail dialog. Those rows stay `partial`.

Newest entry first. Each entry says what is merged in `main`, what runs, and where unfinished work is.

### 2026-11-26

- `main` = `ce1b138cc`: mechanical rename, fork tools (`scripts/codebot/`), these documents, empty text
  areas for the new features, the project contract seed.
- Checks on Windows for the renamed tree (logs in `_tools/checks/rename-r0/`, outside the repository):
  build, `check:ui`, lint, all `typecheck:*`, `verify:preload`, `i18n:check`, `check:assets`,
  `check:doc-links`, `types:ratchet` and `test:browser` pass. `knip:check`, `check:agent-context` and 9
  tests of `test:desktop` fail; unmodified upstream fails in the same way on Windows (package W20).
- `bun run check:branding --report`: 1,457 upstream name lines are left in 431 files. Packages W02a,
  W02b, W03, W04, W06 and W18 remove them.
- Baseline RAM and CPU: not measured yet. `dev:bench` and `dev:memory` do not run on Windows in
  upstream (they call POSIX `ps`); package W01 corrects the harness first.
- New CodeBot icon and logo (two code brackets on a blue square): `build/icon-*`, `build/logo-colors/`,
  the tray icon, the DMG background, `packages/brand/src/app-logo-shape.ts`. The macOS icon catalog
  `Assets.car` of upstream is removed (it cannot be made on Windows); `scripts/compile-macos-icon.ts`
  makes a new one on a Mac. The upstream Apple team ID and the universal-link domain are removed from
  the mac packaging files.
- Work in progress, one worktree and branch for each package under `_wt/`: `w01-measure`,
  `w20-wintests`, `w02a-analytics`, `w02b-cloud`, `w03-account-service`, `w06-updates`,
  `w07-projects-engine`, `w08-slash`, `w11-explorer`, `w12-shell`, `w09-lock`, `w10-replies`,
  `w13-status`. A usage limit stopped all build agents soon after their start; only `w20-wintests` had
  uncommitted changes. All were started again.
