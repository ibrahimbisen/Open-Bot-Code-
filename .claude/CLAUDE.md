# CodeBot: start here

CodeBot (visible name "OpenBot Code", decision D18) is a fork of OpenBot: TypeScript, Bun, Electron,
SolidJS. The root `AGENTS.md` holds the repository rules and applies in full. This folder adds a
codebase map so that a new agent can find code without hours of reading.

## Read first

1. The PRD: `C:\Users\IbrahimBisen\Desktop\Coding Software\CodeBot-PRD.md`. It is the source of truth.
2. `docs/codebot/agent-brief.md`: the build rules (tools, sandbox, commits, checks, report).
3. `docs/codebot/decisions.md`: the decisions already made. Do not change them.
4. `docs/codebot/prd-status.md`: each PRD item, its status and its proof.
5. The map file for the area you change (table below). Then read the code it points to.

## Codebase map (`.claude/codebase/`)

Haiku agents wrote these files on 2026-11-26. A second pass checked their paths and names against the
code. They can still be wrong or old: confirm a path before you rely on it. "(unverified)" marks a
point that was not confirmed.

| File | Read it when you change |
| --- | --- |
| [tooling-and-commands.md](codebase/tooling-and-commands.md) | scripts, checks, builds, the pre-commit hook, dev stack commands |
| [architecture-digest.md](codebase/architecture-digest.md) | anything: the process model, the event log, Team API, the glossary |
| [main-process-a.md](codebase/main-process-a.md) | `src/main/*.ts` files that start with a to f, startup wiring |
| [main-process-b.md](codebase/main-process-b.md) | `src/main/*.ts` files that start with g to z |
| [main-subdirs-and-ipc.md](codebase/main-subdirs-and-ipc.md) | IPC handlers, Team API host routes, joined servers |
| [contracts-and-preload.md](codebase/contracts-and-preload.md) | a new endpoint: contract, preload bridge, preview mock |
| [providers.md](codebase/providers.md) | Claude Code, Codex, ACP and other provider adapters, sandbox, slash command data |
| [engine-agents-threads-db.md](codebase/engine-agents-threads-db.md) | agents, chats (threads), tasks, SQLite, migrations, trace steps |
| [engine-other.md](codebase/engine-other.md) | browser, channels, routines, CRM, skills, MCP and the hidden features |
| [renderer-core.md](codebase/renderer-core.md) | the app shell, stores, themes and palettes, CSS tokens, left bar, side panel |
| [renderer-features-a.md](codebase/renderer-features-a.md) | renderer features from `account` to `custom-providers` (chat view, composer) |
| [renderer-features-b.md](codebase/renderer-features-b.md) | renderer features from `dynamic-island` to `workflows` (settings, sidebar, usage) |
| [ui-and-i18n.md](codebase/ui-and-i18n.md) | shared UI components, `check:ui` rules, text keys |
| [packages-and-remote.md](codebase/packages-and-remote.md) | logging, team client, Signal and TURN, self-hosting, Docker |
| [apps.md](codebase/apps.md) | the account service (`apps/auth-api`), the mobile app, other apps |
| [testing-and-scripts.md](codebase/testing-and-scripts.md) | an E2E test, fake providers, mock servers, screenshots |
| [windows-notes.md](codebase/windows-notes.md) | any work on this Windows computer: tools, gotchas, worktree state |

## Rules that agents broke before

- Memory: several agents share one computer. Run `cb_wait_for_memory 12` before each typecheck,
  build, test or app start. Run checks one at a time. Stop your dev stack (`bun run dev:stop`) before
  you finish. In November 2026 parallel checks used up all memory and crashed the computer.
- Commit at least every 30 to 45 minutes (`WIP:` is permitted). A usage limit can stop you at any time.
- Keep `TASKS.md` in your worktree current. After a restart, read it and `git log` first.
- Cross-platform only: no Windows-only paths, shells or tools; keep the macOS and Linux branches.
- No calls to upstream OpenBot servers. Keep `LICENSE` and `NOTICE`.

When a map file is wrong, correct it in the same change as your code.
