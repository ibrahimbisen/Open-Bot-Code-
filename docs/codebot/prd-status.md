# CodeBot PRD status

Source of truth: `CodeBot-PRD.md` (rev 12) one level above this repository.
Each row is one PRD item. An item is `done` only when the proof column names a test, a report file,
or a screenshot that shows it. `partial` and `blocked` rows say what is missing.

Status values: `todo`, `in progress`, `partial`, `done`, `blocked`, `info` (a statement, not a task).

Work packages (column W) are described in [decisions.md](decisions.md#work-packages).

## 1. Summary

| ID | Requirement | W | Status | Proof |
| --- | --- | --- | --- | --- |
| 1.1 | Fork of OpenBot | W00 | done | `git log`: `main` starts from upstream `100c60e89` (tag `openbot-baseline`); the download was the same tree |
| 1.2 | Desktop app for macOS, Windows, Linux | all | todo | |
| 1.3 | Internal use only, no sale | W19 | todo | |
| 1.4 | Many projects at once, short replies, clean screen, agents stay in folder | all | info | |
| 1.5 | Phase 1 runs on each user's computer | all | todo | |
| 1.6 | Phase 2 needs no screen changes | W07, W12, W17 | todo | |

## 2. Problems to solve

| ID | Problem | Solved by | Status | Proof |
| --- | --- | --- | --- | --- |
| 2.1 | Replies too long | 8.x | info | |
| 2.2 | Too much CLI text | 8.x | info | |
| 2.3 | Agents search all folders | 10.x | info | |
| 2.4 | No clear new chat button or history | 5.5, 5.6 | info | |
| 2.5 | Right panel too small, does not close | 14.x | info | |
| 2.6 | VS Code uses too much RAM | 4.7, 7.5 | info | |
| 2.7 | Claude Code in VS Code lacks CLI commands | 9.x | info | |

## 3. Fork, name, license

| ID | Requirement | W | Status | Proof |
| --- | --- | --- | --- | --- |
| 3.1 | Fork latest OpenBot main | W00 | done | Upstream `main` HEAD on 2026-11-25 was `100c60e89`; `git status` of the copied download against it showed no difference |
| 3.2 | Product name CodeBot in all user-facing text | W00 | in progress | Mechanical rename `3377172d0` (73,264 replacements, 154 paths). Open: icons and logo, and the lines that `bun run check:branding` lists |
| 3.3 | CodeBot bundle ID and app ID, side-by-side install | W00 | in progress | `electron-builder.yml`: `appId: app.codebot.desktop`, scheme `codebot`. Open: install test of a packaged build |
| 3.4 | Data folder ~/CodeBot, userData CodeBot | W00 | in progress | Rename `3377172d0` (`src/backend/agent-store.ts`, `src/main/index.ts`). Open: a run that shows the folders |
| 3.5 | Keep copyright notice, LICENSE, NOTICE | W00 | done | `git diff openbot-baseline main -- LICENSE NOTICE` is empty; `electron-builder.yml` keeps the copyright line |
| 3.6 | Remove analytics and telemetry | W02 | todo | |
| 3.7 | Remove calls to OpenBot cloud services | W02, W03, W04 | todo | |

## 4. Architecture rules

| ID | Requirement | W | Status | Proof |
| --- | --- | --- | --- | --- |
| 4.1 | Keep engine / screen split | all | todo | |
| 4.2 | Screen talks to engine only through the typed API | all | todo | |
| 4.3 | Same screen for local and remote engine | W07, W17 | todo | |
| 4.4 | Keep SQLite event log and database | W07 | todo | |
| 4.5 | Keep all provider adapters | all | todo | |
| 4.6 | Keep TypeScript, Bun, Electron, SolidJS | all | todo | |
| 4.7 | RAM not more than 15% over baseline | W01 | todo | |

## 5. Projects and chats

| ID | Requirement | W | Status | Proof |
| --- | --- | --- | --- | --- |
| 5.1 | Project = workspace on a folder with one or more agents (role, instructions, default model) | W07, W12 | todo | |
| 5.2 | One main folder, picked at creation | W07, W12 | todo | |
| 5.3 | More folders (additionalDirectories) | W07, W12 | todo | |
| 5.4 | Many chats per project, each with its own provider session | W07 | todo | |
| 5.5 | New chat button per project | W12 | todo | |
| 5.6 | Chat history list, newest first, title and date | W12 | todo | |
| 5.7 | Automatic chat title, rename | W07, W12 | todo | |
| 5.8 | Search, rename, archive, delete chats | W07, W12 | todo | |
| 5.9 | Chat keeps running when the user leaves | W07 | todo | |
| 5.10 | Provider and model per chat, default from project | W07, W12 | todo | |
| 5.11 | Keep automatic context compaction per chat | W07 | todo | |
| 5.12 | Project instructions, memory, skills per project | W07 | todo | |

## 6. Main layout

| ID | Requirement | W | Status | Proof |
| --- | --- | --- | --- | --- |
| 6.1 | Left bar: project list with name, folder color, status dot | W12 | todo | |
| 6.2 | Click a project: its chats, file tree, panels | W12 | todo | |
| 6.3 | Chat list column and active chat | W12 | todo | |
| 6.4 | File tree panel follows the project | W11, W12 | todo | |
| 6.5 | Split panels left/right and top/bottom | W12 | todo | |
| 6.6 | Panel holds a chat, a file preview, or the browser | W12, W14 | todo | |
| 6.7 | Panel can hold a chat of another project; shows project name and own file tree | W12 | todo | |
| 6.8 | Drag panels to move and resize | W12 | todo | |
| 6.9 | Layout saved per project, restored on restart | W12 | todo | |
| 6.10 | Keyboard shortcuts, user can change them | W15 | todo | |
| 6.11 | Bottom of left bar: account, server status, usage | W13 | todo | |

## 7. File tree and previews

| ID | Requirement | W | Status | Proof |
| --- | --- | --- | --- | --- |
| 7.1 | File tree like VS Code Explorer | W11 | todo | |
| 7.2 | Colored folder and file icons (Material Icon Theme) | W11 | todo | |
| 7.3 | Git status in the tree | W11 | todo | |
| 7.4 | Git panel: branch, changed files, history | W11 | todo | |
| 7.5 | Click a file: Monaco preview, read and edit | W11 | todo | |
| 7.6 | Markdown, image, SVG, PDF, JSON, CSV previews | W11 | todo | |
| 7.7 | Diff view for files changed in the chat | W11 | todo | |
| 7.8 | Tree updates live | W11 | todo | |

## 8. Short replies

| ID | Requirement | W | Status | Proof |
| --- | --- | --- | --- | --- |
| 8.1 | Fixed reply rule, editable globally and per project | W10 | todo | |
| 8.2 | Show only the final answer by default | W10 | todo | |
| 8.3 | One-line summary hides tools, reads, commands, thinking | W10 | todo | |
| 8.4 | Details button opens full steps | W10 | todo | |
| 8.5 | Default short or detailed in settings | W10 | todo | |
| 8.6 | Code blocks fold after 20 lines | W10 | todo | |
| 8.7 | Clean chat text area | W10 | todo | |

## 9. Slash commands

| ID | Requirement | W | Status | Proof |
| --- | --- | --- | --- | --- |
| 9.1 | "/" shows a command menu | W08 | todo | |
| 9.2 | List comes from the provider engine | W08 | todo | |
| 9.3 | New Claude Code version: read list once in background, zero tokens | W08 | todo | |
| 9.4 | Saved list used in every chat, refreshed on provider update | W08 | todo | |
| 9.5 | Include custom commands and skills from project and user .claude | W08 | todo | |
| 9.6 | Command sent as the engine expects, result in chat | W08 | todo | |
| 9.7 | Special screens only for model, thinking level, resume | W08 | todo | |
| 9.8 | New provider command appears with no code change | W08 | todo | |

## 10. Folder lock

| ID | Requirement | W | Status | Proof |
| --- | --- | --- | --- | --- |
| 10.1 | Access level picked at project creation: Strict, Normal, Open | W09, W12 | todo | |
| 10.2 | Strict: prompt rule, engine lock, sandbox box | W09 | todo | |
| 10.3 | Normal: prompt rule and engine lock | W09 | todo | |
| 10.4 | Open: full access | W09 | todo | |
| 10.5 | Default Normal | W09 | todo | |
| 10.6 | Level change applies to new turns | W09 | todo | |
| 10.7 | Level badge on the project row | W12 | todo | |
| 10.8 | No search outside allowed folders in Strict and Normal, tested | W09 | todo | |
| 10.9 | Server: Strict uses one container per project | W09, W17 | todo | |

## 11. Accounts and login

| ID | Requirement | W | Status | Proof |
| --- | --- | --- | --- | --- |
| 11.1 | Login with Nextcloud username and password | W03, W04 | todo | |
| 11.2 | Account service on the home server, Nextcloud OIDC | W03 | todo | |
| 11.3 | Replace Cloudflare account API, remove email-code login | W03, W04 | todo | |
| 11.4 | Self-hosted Signal and TURN | W03 | todo | |
| 11.5 | Removed or disabled Nextcloud user loses access | W03 | todo | |
| 11.6 | Each user sees only their own data unless shared | W03, W17 | todo | |
| 11.7 | Login optional in Phase 1, local profile | W04 | todo | |

## 12. Automatic updates

| ID | Requirement | W | Status | Proof |
| --- | --- | --- | --- | --- |
| 12.1 | Update files on the home server, not GitHub Releases | W06 | todo | |
| 12.2 | electron-updater generic provider | W06 | todo | |
| 12.3 | DMG, EXE, AppImage and metadata files in the update folder | W06 | todo | |
| 12.4 | One-command release script | W06 | todo | |
| 12.5 | Check at start and every hour | W06 | todo | |
| 12.6 | Background download, "Restart to update", auto-restart when idle option | W06 | todo | |
| 12.7 | Keep provider CLI auto-update | W06 | todo | |
| 12.8 | Signing optional; document unsigned builds | W06, W19 | todo | |

## 13. Usage and status bar

| ID | Requirement | W | Status | Proof |
| --- | --- | --- | --- | --- |
| 13.1 | Keep left-bar server status and plan limits | W13 | todo | |
| 13.2 | 5-hour and weekly limit left per provider | W13 | todo | |
| 13.3 | Local model status: online, GPU load, GPU memory, models loaded | W13 | todo | |
| 13.4 | Click opens detail view | W13 | todo | |

## 14. Right panel and browser

| ID | Requirement | W | Status | Proof |
| --- | --- | --- | --- | --- |
| 14.1 | Keep all right panel content, fix behavior | W14 | todo | |
| 14.2 | No fixed right panel; agent content opens as split panel | W14 | todo | |
| 14.3 | Default width 50%, drag to resize, size saved | W14 | todo | |
| 14.4 | Panel closes by itself (switch, click in input, agent done) | W14 | todo | |
| 14.5 | Pin keeps the panel open | W14 | todo | |
| 14.6 | Embedded browser as split panel | W14 | todo | |
| 14.7 | Browser panel: address bar, back, forward, reload, control toggle | W14 | todo | |
| 14.8 | Keep agent browser control (CDP) | W14 | todo | |

## 15. Keep, hide, remove

| Feature | Decision | W | Status | Proof |
| --- | --- | --- | --- | --- |
| Billing, Stripe, plans, license purchase | Remove | W02 | todo | |
| OpenBot hosted servers | Remove | W02 | todo | |
| Analytics and telemetry | Remove | W02 | todo | |
| Mobile app | Keep, visible, self-hosted services | W18 | todo | |
| Routines | Keep, hidden | W05 | todo | |
| Channels | Keep, hidden | W05 | todo | |
| Marketplace | Keep, hidden | W05 | todo | |
| Slack, Discord, Telegram, WhatsApp connectors | Keep, hidden | W05 | todo | |
| Computer Use | Keep, hidden | W05 | todo | |
| Remote desktop | Keep, hidden | W05 | todo | |
| Local skills | Keep, visible | W05 | todo | |
| Embedded browser | Keep, visible, redesigned | W14 | todo | |
| 15.1 | Hidden: no button; switch in Settings > Advanced features | W05 | todo | |
| 15.2 | Turned-on feature appears in left bar or settings | W05, W12 | todo | |

## 16. Themes

| ID | Requirement | W | Status | Proof |
| --- | --- | --- | --- | --- |
| 16.1 | Keep current dark theme | W16 | todo | |
| 16.2 | Light theme | W16 | todo | |
| 16.3 | Dark Modern, Light Modern, high contrast, warm dark, blue dark styles | W16 | todo | |
| 16.4 | Palette JSON file system for all themes | W16 | todo | |
| 16.5 | Theme applies to chats, file tree, Monaco, panels, browser frame, dialogs | W16 | todo | |
| 16.6 | Follow system light/dark | W16 | todo | |

## 17. Local models

| ID | Requirement | W | Status | Proof |
| --- | --- | --- | --- | --- |
| 17.1 | Local model per project and per chat | W13, W07 | todo | |
| 17.2 | OpenAI-compatible endpoint and local server detection | W13 | todo | |
| 17.3 | Settings "Local server" entry: URL and optional key | W13 | todo | |
| 17.4 | Many local machines, one entry each | W13 | todo | |

## 18. Phase 2: server mode

| ID | Requirement | W | Status | Proof |
| --- | --- | --- | --- | --- |
| 18.1 | Engine on home server (Linux server or Docker install) | W17 | todo | |
| 18.2 | Project folders on the server | W17 | todo | |
| 18.3 | Desktop and mobile connect to the server engine, same screen | W17 | todo | |
| 18.4 | Switch between "This computer" and "Home server" | W17 | todo | |
| 18.5 | Phase 1 must not block Phase 2 | all | todo | |

## 19. Quality and testing

| ID | Requirement | W | Status | Proof |
| --- | --- | --- | --- | --- |
| 19.1 | Pass check, typecheck, knip, check:ui, i18n:check | W21 | todo | |
| 19.2 | Tests for each new feature | all | todo | |
| 19.3 | Screenshots of every screen and theme | W21 | todo | |
| 19.4 | Review and fix every screenshot | W21 | todo | |
| 19.5 | Build and test on Windows, code stays cross-platform | all | todo | |
| 19.6 | Measure RAM and CPU, meet 4.7 | W01 | todo | |

## 20. Acceptance criteria

| ID | Criterion | Status | Proof |
| --- | --- | --- | --- |
| 20.1 | Named CodeBot everywhere a user can see | todo | |
| 20.2 | Create a project on a folder, open 3 chats, see them in history | todo | |
| 20.3 | Five projects run chats at the same time, status dots correct | todo | |
| 20.4 | Two chats from two projects side by side, each with its file tree | todo | |
| 20.5 | Strict and Normal: no write outside allowed folders | todo | |
| 20.6 | Replies short by default; Details shows all steps | todo | |
| 20.7 | "/" shows the Claude Code command list read from the engine | todo | |
| 20.8 | Agent previews open wide, close by themselves, stay when pinned | todo | |
| 20.9 | Login works with a Nextcloud account | todo | |
| 20.10 | New version on the home server updates all clients | todo | |
| 20.11 | All themes look correct in every screenshot | todo | |
| 20.12 | No calls to OpenBot servers; billing is gone | todo | |

## Progress log

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
- Work in progress, one worktree and branch for each package under `_wt/`: `w01-measure`,
  `w20-wintests`, `w02a-analytics`, `w02b-cloud`, `w03-account-service`, `w06-updates`,
  `w07-projects-engine`, `w08-slash`, `w11-explorer`, `w12-shell`. A usage limit stopped all build
  agents soon after their start; only `w20-wintests` had uncommitted changes. All were started again.
