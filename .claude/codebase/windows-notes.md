# Windows notes: tools, work packages, and gotchas

Snapshot date: 2026-11-26. Sources: `_wt/*/TASKS.md` (15 files), `_tools/env.sh`, `_tools/env.ps1`,
`_tools/agents.md`, and `docs/codebot/*.md`. Nothing was built, run or installed for this note.

## What this area is

This area covers the Windows 11 build setup for the CodeBot fork (TypeScript, Bun, Electron, SolidJS).
The tool setup lives in `_tools/`. It puts a local Bun 1.4.2 on the PATH and keeps every cache inside the
"Coding Software" folder. It also redirects the user profile for app and test runs (`cb_sandbox`).
Each build agent works in its own git worktree under `_wt/<branch>` and keeps a `TASKS.md` checklist there.
This note lists the Windows faults that agents found, and the work package state at this date.

## Key files

| Path | What it owns |
| --- | --- |
| `_tools/env.sh` | Git Bash setup. Exports PATH, Bun, cache and registry variables. Defines `cb_sandbox`, `cb_free_memory_gb`, `cb_wait_for_memory`. |
| `_tools/env.ps1` | PowerShell setup. Same variables as `env.sh` (dot-source it). Defines `Use-CbSandbox` only. No memory helpers. |
| `_tools/agents.md` | Lead notes (not in the repo). Agent ids for `SendMessage` resume, package states, honesty log. |
| `_tools/bun/bun-windows-x64/bun.exe` | Local Bun binary, first on PATH after `env.sh` or `env.ps1`. |
| `_tools/cache/`, `_tools/bun-home/`, `_tools/dev-registry/` | Redirected caches (created on demand; on 2026-11-26 only `cache/bun-install` and `cache/electron` existed), Bun home (`bun-home` did not exist yet), dev instance registry (`app-*.json` records and `stacks/`). |
| `_tools/cache/electron` | `ELECTRON_CACHE` and `electron_config_cache` (both names are set, one lowercase). |
| `_tools/logs-*.txt`, `_tools/checks/`, `_tools/prompts/` | Logs of install, build and bench runs (lead's store, not repo files). |
| `_wt/<branch>/TASKS.md` | Per-package checklist. Git ignores it. Read it first after a restart. |
| `_baseline/` | Baseline tree for W01 (detached HEAD `100c60e89`, no branch). Only `scripts/dev-automation/` may change there, no commit. |
| `_wt/w20-wintests/docs/codebot/windows-test-status.md` | Suite table for Windows (step 6 of W20). Lives in the W20 worktree only. The W20 branch is not merged into main (checked 2026-11-26). |
| `CodeBot/docs/codebot/README.md` | Index of the fork documents. |
| `CodeBot/docs/codebot/agent-brief.md` | Rules for build agents: sandbox, commit cadence, checks, report format. |
| `CodeBot/docs/codebot/decisions.md` | Decisions D1 to D18 and the work package table (W00 to W21). |
| `CodeBot/docs/codebot/prd-status.md` | Each PRD item with status and proof. Source of truth is `CodeBot-PRD.md` (one level above the repo, not read here). |
| `CodeBot/docs/codebot/upstream-sync.md` | How to take upstream changes (rename first, then merge). |
| `CodeBot/.claude/codebase/*.md` | Codebase notes for agents (this file sits here). |
| `_wt/<pkg>/docs/codebot/perf/README.md` | Planned W01 baseline table (absent in the W01 worktree on 2026-11-26). |
| `_wt/w20-wintests/scripts/stand-in-program.ts` | Shared stand-in helpers: `standInPath`, `writeStandInScript`, `writeStandInLauncher` (W20 worktree). |
| `_wt/w20-wintests/scripts/test-folder.ts` | `removeTestFolder` helper (W20 worktree). |
| `_wt/w20-wintests/scripts/provider-fakes/host.ts` | Uses `writeStandInLauncher` (W20 worktree). |
| `_wt/w09-lock/docs/codebot/folder-lock.md` | Folder lock design. The W09 TASKS says to read it first. It is in the W09 worktree, not in `CodeBot/docs/codebot`. |
| `scripts/codebot/check-branding.ts` | Lists upstream name lines left (named in `agent-brief.md` and `upstream-sync.md`; not opened here). |
| `scripts/codebot/rename-upstream.ts` | Mechanical rename script used by `upstream-sync.md` (named in docs; not opened here). |
| `scripts/staged-typecheck.ts` | Pre-commit typecheck root selector. Has the Windows root bug (see Gotchas, confirmed in the code). |
| `knip.config.ts` | Knip config. W20 added electron-vite page entries for Windows (in the W20 worktree). |
| `scripts/claude-windows-cmd-e2e.ts` | Pattern for `.cmd` wrappers of stand-in CLIs (named in `agent-brief.md`; not opened here). |

## How it works

### Tool setup (Git Bash)

- Every Git Bash command starts with:
  `source "/c/Users/IbrahimBisen/Desktop/Coding Software/_tools/env.sh"`
- `env.sh` sets these variables (all under `_tools`):
  - PATH: `_tools/bun/bun-windows-x64` first.
  - `BUN_INSTALL` = `_tools\bun-home`.
  - `BUN_INSTALL_CACHE_DIR` = `_tools\cache\bun-install`.
  - `ELECTRON_CACHE`, `electron_config_cache` = `_tools\cache\electron`.
  - `ELECTRON_BUILDER_CACHE` = `_tools\cache\electron-builder`.
  - `npm_config_cache` = `_tools\cache\npm`.
  - `PLAYWRIGHT_BROWSERS_PATH` = `_tools\cache\ms-playwright`.
  - `CODEBOT_DEV_REGISTRY_DIR` and `CODEBOT_DEV_REGISTRY_DIR` = `_tools\dev-registry`.
  - `DO_NOT_TRACK=1`.
  - Exports `CB_ROOT`, `CB_ROOT_WIN`, `CB_TOOLS`, `CB_TOOLS_WIN`.

### Tool setup (PowerShell)

- Dot-source: `. 'C:\Users\IbrahimBisen\Desktop\Coding Software\_tools\env.ps1'`
- `env.ps1` sets the same cache and registry variables with `Join-Path`, and `DO_NOT_TRACK=1`.
- `env.ps1` does not set `CB_ROOT_WIN`, `CB_TOOLS_WIN`, or any `cb_*` helper. Keep the two files in step by hand.

### Profile redirection: `cb_sandbox` and `Use-CbSandbox`

- `cb_sandbox <name>` (Git Bash) and `Use-CbSandbox -Name <name>` (PowerShell) redirect the profile.
- Root folder: `Coding Software\_sandbox\<name>`. Both helpers create `AppData\Roaming` and `AppData\Local`.
- `cb_sandbox` sets: `USERPROFILE`, `HOME` (POSIX path), `HOMEDRIVE=C:`, `HOMEPATH`, `APPDATA`,
  `LOCALAPPDATA`, `CB_SANDBOX` (POSIX), `CB_SANDBOX_WIN` (Windows).
- `Use-CbSandbox` sets: `USERPROFILE`, `HOME`, `HOMEDRIVE`, `HOMEPATH`, `APPDATA`, `LOCALAPPDATA`, `CB_SANDBOX`.
  It does not set `CB_SANDBOX_WIN`.
- Electron reads `APPDATA` from the environment on Windows. This was verified (agent-brief section 2).
- The sandbox does not set `CLAUDE_CONFIG_DIR`. W08 found that the Claude SDK session functions
  (`listSessions`, `getSessionInfo`, `forkSession`) read `CLAUDE_CONFIG_DIR` only. CodeBot passes the agent's own
  `CLAUDE_CONFIG_DIR` to the SDK (`src/backend/claude-client.ts`, about lines 761 to 763). Without it, the fallback
  is `~/.claude`. In the sandbox `~` follows `USERPROFILE` (Node `os.homedir()` on Windows).

### Memory guard: `cb_wait_for_memory`

- `cb_free_memory_gb` runs `powershell.exe` with `Get-CimInstance Win32_OperatingSystem`.
- Output is GB with one decimal: the lower of `FreePhysicalMemory` and (`FreeVirtualMemory` minus 8 GB).
  Both values are KB in the CIM object. So the number is not plain free RAM.
- `cb_wait_for_memory [min_gb]` polls every 30 s. Default `min_gb` is 8.
  - On success it prints `free memory: <n> GB` and returns 0.
  - After 1800 s (30 min) it prints an error to stderr and returns 1.
- Call it before the dev app, a bench, or a full test run. W10 uses `cb_wait_for_memory 8`.
- `cb_free_memory_gb` sends stderr to `/dev/null`. If PowerShell fails, the output is empty. `awk` then reads 0,
  so the loop waits the full 30 minutes (verified by reading the code; not run).

### Worktrees and TASKS.md

- Each work package has a branch `<pkg>` and a worktree `_wt/<pkg>`. The lead's agent list is in `_tools/agents.md`.
- `TASKS.md` sits at the worktree root. Git ignores it. Agents update it before each commit.
- Rules (agent-brief section 3):
  - Commit every 30 to 45 minutes. `WIP:` is allowed when the changed files type-check.
  - Never use `--no-verify`.
  - Use `git merge main`, not rebase, when the lead asks for new main commits.
  - The worktree `cd` resets between Bash calls. Always `cd` to the worktree first.
- Bun install in a new worktree: `bun install --frozen-lockfile` (about 3 minutes).

### Pre-commit hook

- The hook runs Biome on staged files, `check:ui`, and the typecheck of affected projects.
- It needs Bun on PATH. Source `env.sh` first.
- When `root package.json` or `bun.lock` is staged, all projects are typechecked (W02a finding).
- When `packages/contracts` is staged, `typecheck:api` and `typecheck:mobile` run too (W02b F1).

### Checks before a report (agent-brief section 6)

1. `./node_modules/.bin/biome check --write --max-diagnostics=none <files>`
2. `bun run typecheck:node` (for `src/main`, `src/backend`, `src/preload`, `scripts`)
3. `bun run typecheck:renderer` (for `src/renderer`, `packages/ui`)
4. Other `typecheck` scripts of changed packages
5. `bun run check:ui` (for UI or CSS)
6. Own E2E scripts and `bun run test:related -- <files>`
7. UI work: `bun run dev:automation screenshot`, then open each PNG

## Work package state (from TASKS.md)

Lead states come from `_tools/agents.md` (2026-11-26). Its running table lists 13 packages, all "running". W21a, W05, W16, W03b and the others are in its "Not started yet" list. They may be stale.
TASKS.md states are the agents' own checklists at their last update.

| Package | Branch / worktree | Agent id (for SendMessage) | TASKS.md state |
| --- | --- | --- | --- |
| W01 measure | `w01-measure` / `_wt/w01-measure` | a06b00f2fd548c7d7 | Harness committed (per the Now line; the checklist item "Commit (WIP) the harness" is still open). Background run on codebot `s2-idle-visible` in progress; do not start another bench until `_work/w01/measure.log` says done. Open: s14/s15 runs, `dev:memory`/`dev:cpu` check, baseline runs (3 each), codebot r0 runs, `docs/codebot/perf/README.md` (not created), checks, final commit. |
| W02a analytics | `w02a-analytics` / `_wt/w02a-analytics` | a3d0ce291a2b806a2 | Survey of callers in progress. No code change yet. Baseline typecheck and knip runs not done. |
| W02b cloud removal | `w02b-cloud` / `_wt/w02b-cloud` | a4e4df2ac2f875738 | Item 5 (Referral) done in commit `22f255252`. Items 1 to 4 and 6 to 12 open. Round 1 credits removal was on disk, uncommitted, at the time of the note. Next: billing and license purchase (item 1). |
| W03a account service | `w03-account-service` / `_wt/w03-account-service` | a62b47e9b03f30a7d | Steps 1, 2, 3, 5, 6 marked done. Step 4 marked done, but its sub-items are open and "Doing now" says step 4. Open: remote-access routes on the Bun router, remove email-code login, SCIM, company sign-in routes, `account-remote-access-e2e.ts`. Base commit `ce1b138cc`. |
| W03b (not started) | n/a | n/a | Delete Cloudflare parts of `apps/auth-api`. After W03a. |
| W04 (not started) | n/a | n/a | Desktop account flow. After W02b. |
| W05 advanced | `w05-advanced` / `_wt/w05-advanced` | not in the running table (agents.md lists it as not started) | Done: `bun install`, contracts, main store, backend gate. Todo: preview mock, renderer, `advanced-features-e2e.ts`, screenshots, checks. No commit hash in TASKS.md. |
| W06 updates | `w06-updates` / `_wt/w06-updates` | ac383b0d2a335ecb4 | All steps marked done. Round 2: biome, `typecheck:node`, `typecheck:renderer`, contracts, i18n, `check:ui`, `test:app-update`, `test:release-script` pass. Not re-run: knip (out of memory in round 1) and `test:provider-runtime-blocked` (Windows stand-in issue). |
| W07a projects engine | `w07-projects-engine` / `_wt/w07-projects-engine` | a351951ac1b7c968a | Steps 1 to 3 marked done (contract, storage, service). Steps 4 (cwd, roots, prompt), 5 (chat list, search, activity), 6 (`projects-e2e.ts`, tests) and the report open. The "Now" line is stale (says commit step 1). |
| W08 slash commands | `w08-slash` / `_wt/w08-slash` | ab87fea8d2bc4d8e5 | Experiment and probe done. Survey (4 explore agents) was pending. Findings recorded. Contracts, engine, IPC, UI, E2E not started (all open). |
| W09 folder lock | `w09-lock` / `_wt/w09-lock` | aa16704202865dbb8 | Done with proof: `test:folder-lock`, `test:folder-lock-confinement`, `test:folder-lock-container` (reports under `.codebot-build/`). Not done: Codex Strict (refused), macOS and Linux branches not run on a real system. Claude sandbox is off on this Windows build, so Strict with Claude is refused here. |
| W10 short replies | `w10-replies` / `_wt/w10-replies` | a619419f327430330 | Steps 1, 1b, 1c, 1d, 1e done (engine, IPC, default style, trace fields, step details). Step 2 (UI short view) in progress. Steps 3 to 9 open. Team API additions listed for the report. |
| W11a explorer | `w11-explorer` / `_wt/w11-explorer` | a3dbaefd203166201 | Steps 1 to 7 marked done in code (WIP commits). Open: checks (step 8), UI proof (step 9), RAM and Monaco chunk numbers (step 10). The E2E runs (`explorer-files-e2e.ts`, `explorer-git-e2e.ts`) are next. |
| W12 shell UI | `w12-shell` / `_wt/w12-shell` | ae739f7ca3e8c5852 | Code written and type-checked, not yet run in the app. No runtime proof and no screenshots. Next: `cb_sandbox`, `bun run dev`, screenshots, `project-shell-e2e.ts`, stories, checks. `dockview-core@7.0.4` approved. |
| W13 status bar | `w13-status` / `_wt/w13-status` | a54c7eff767fd71e9 | Done: steps 1 to 11 (contract, store, engine `src/main/local-model-servers/`, helper script, E2E `local-model-servers-e2e.ts`, `provider-detection-e2e.ts` fix, errors, IPC wiring, UI package, settings section). Open: stories and screenshots (12, 13), `docs/codebot/local-models.md` (14, not created), checks (15), report (16). |
| W14 (not started) | n/a | n/a | Split panels, auto-close, pin, browser panel. After W12. |
| W15 (not started) | n/a | n/a | Keyboard shortcuts. After W12. |
| W16 themes | `w16-themes` / `_wt/w16-themes` | not in the running table (agents.md lists it as not started) | Done: built-in palette files seeded, Monaco tokens, hardcoded colour audit. Open: `themes-e2e.ts`, screenshots, `docs/codebot/themes.md`, checks. Run: `cb_sandbox w16-themes`, then `bun run dev`. |
| W17 (not started) | n/a | n/a | Server mode. After W07, W08, W10, W11, W13. |
| W18 (not started) | n/a | n/a | Mobile app. |
| W19 (not started) | n/a | n/a | Documents. |
| W20 Windows tests | `w20-wintests` / `_wt/w20-wintests` | a0021fdbc1ed80df8 | Steps 1 to 6 and 4b marked done. 9 vitest failures fixed. `test:desktop`: 103 files, 2298 tests pass. knip fixed (`knip:check` leaves only `src/backend/projects/project-context.ts`). `check:agent-context` exit 0. Stand-in helpers added. Suite table in W20 worktree. |
| W21a screenshots | `w21-screens` / `_wt/w21-screens` | not started | Worktree exists, no `TASKS.md`. Could not start on 2026-11-26 (20 concurrent agent limit). Prompt in `_tools/agents.md`. |
| `upstream-renamed` (worktree folder `rename`) | `_wt/rename` | n/a | Worktree exists on branch `upstream-renamed` (HEAD `3377172d0`). No `TASKS.md`. |
| W21 checks | n/a | n/a | Not started. Lead: icons, logo, integration merges, i18n list, final report. |

Main is at `443768fe6` (icons and logo), per `_tools/agents.md`. Agents started before it work from
`ce1b138cc` or `18d770560`. Merge main into each branch at integration.

## How to change it (recipes)

1. Start a Git Bash session for a run:
   ```
   source "/c/Users/IbrahimBisen/Desktop/Coding Software/_tools/env.sh"
   cb_sandbox <pkg-name>
   cb_wait_for_memory 8
   cd "/c/Users/IbrahimBisen/Desktop/Coding Software/_wt/<branch>"
   ```
   Stop the stack at the end with `bun run dev:stop`. Never stop processes by name.
2. Start a PowerShell session for the same run:
   ```
   . 'C:\Users\IbrahimBisen\Desktop\Coding Software\_tools\env.ps1'
   Use-CbSandbox -Name <pkg-name>
   ```
   There is no memory guard in PowerShell. Use the Git Bash helper for the wait.
3. Change the memory threshold: pass a different number to `cb_wait_for_memory` (for example `cb_wait_for_memory 10`).
   To change the default, edit the `min="${1:-8}"` line in `_tools/env.sh`.
4. Add an environment variable for all runs: add the line to `_tools/env.sh` and the matching `$env:` line to
   `_tools/env.ps1`. Keep the cache folders under `_tools`.
5. Add a new sandbox name: call `cb_sandbox <new-name>`. The folder `_sandbox\<new-name>` is created with
   `AppData\Roaming` and `AppData\Local`. Use a new name per package.
6. Add a stand-in provider CLI for a Windows test: use `writeStandInLauncher` from
   `scripts/stand-in-program.ts` (W20 worktree). It writes a `.cmd` wrapper. Do not use a `#!/bin/sh` file on Windows.
   Pattern: `scripts/claude-windows-cmd-e2e.ts`.
7. Start a new work package: create the worktree under `_wt/<branch>`, run `bun install --frozen-lockfile`,
   and create `TASKS.md` at the worktree root with the steps, "Now" and "Found" sections. Record the agent id
   in `_tools/agents.md`.
8. Resume an interrupted agent: `SendMessage` to the agent id from `_tools/agents.md`. Then read `TASKS.md` and
   `git log` in the worktree.
9. Edit `bun.lock` for a workspace dependency: edit by hand, then run `bun install --frozen-lockfile`.
   A plain `bun install` or `bun add` re-sorts `bun.lock` and the manifests (W03a, W11, W12 notes).
10. Add a dependency: use an exact version that is older than 3 days (see `bunfig.toml`), with an MIT,
    Apache-2.0, BSD or ISC license. Name it in the report.
11. Fix the hook root bug (`scripts/staged-typecheck.ts`): normalize `relative()` results to forward slashes
    before the root match (proposal; unverified, not tested). Owner per W02b: W20.
12. Run a Windows E2E: `bun run test:<name>`. Reports go to `.codebot-build/<name>/report.json`.
    Run one at a time when memory is low.
13. Fix a Windows test that uses a file symlink: create a directory junction instead (W20 `file-preview-pages.test.ts`
    pattern). This account cannot make file symlinks.
14. Write code that has backslashes: use the Edit or Write tool, not a Bash heredoc (see Gotchas).

## Gotchas

### Paths and quoting

- The repo path has a space. Quote every path. Use `"$CB_ROOT/..."` in shell scripts.
- Git Bash changes an argument that starts with `/` into a Windows path. Do not pass `/name` as an argument (W08).
- A Bash heredoc collapses a double backslash to one. This breaks code with `\` (W20, W02b). Use Edit or Write.
  W02b used a scratch helper (`subst.ts`) that reads `@@ path`, `<<<<`, `====`, `>>>>` blocks from a file.
- A Bash heredoc with a Python script that has many quotes can fail. Write the script to a file in `$TEMP` first (W03a).
- The `cwd` resets to the main checkout between Bash calls. `cd` to the worktree in every command (W02b).
- `cliSpawnTarget` doubles `%` in the path of a `.cmd` wrapper. Under `cmd /c`, a wrapper below a folder with `%`
  in its name cannot start (W20 product note; CodeBot code, not the tools).
- `~/proxy.conf` is `~\proxy.conf` on Windows. A test that checks the POSIX form fails (W20 fix).

### Bun and install

- Bun 1.4.2 is at `_tools/bun/bun-windows-x64/bun.exe`. The user profile Bun is not used.
- `bun install` (not frozen) re-sorts `bun.lock` and gives a diff of about 110 lines (W03a).
- `bun add` re-sorts `package.json` and `bun.lock`. W11 and W12 kept `package.json` order by hand.
- Bun loads `.env.production` of the current folder by itself. The scripts use `bun --no-env-file`. The config
  refuses values that start with `encrypted:`. Do not copy values from env files (W03a).
- `bun:sqlite` `run().changes` counts trigger rows. The adapter uses `changes()` when `total_changes()` moved (W03a).
- Bun 1.4.2: `rm` ignores `maxRetries`. `node:sqlite` `close` keeps files open while statements live. Temp folder
  cleanup then fails with EBUSY. `test:team-legacy-clients` and `test:team-protocol-v10` exit 1 on Windows for this
  reason (W11, W20).
- `dev:bench` runs under Node (`tsx`). `dev:memory` and `dev:cpu` run under Bun. koffi 3.3.5 works in both (W01).
- Upstream `dev:bench` and `dev:memory` call POSIX `ps` and do not run on Windows (`docs/codebot/prd-status.md`,
  progress log). W01 corrects the harness.
- `bun run dev:api` stops when the Auth API is not ready in 30 s (`scripts/dev-services.ts`, not owned by W01).
  A second start works because the caches are warm (W01).
- The first app start after a build takes about 10 s to `when-ready`. Later starts take 1 to 2 s (W01).

### Processes and PIDs

- `child.kill("SIGTERM")` on Windows ends only the root process. `process.kill(-pid)` throws (W01).
- `kill` ends a process with no signal handler. Account service E2E scripts stop it with the parent message
  `account-service:stop` and read the port from `account-service:ready` (W03a).
- The Windows parent PID can name a dead process whose PID was reused. The W01 tree walk keeps a handle on each
  process and compares creation times.
- `GetProcessTimes` counts CPU in 15.6 ms ticks. A settled 10 s window has steps of 0.16 % (W01).
- A Toolhelp snapshot of about 480 processes takes 13 to 19 ms (W01).
- `assertRegistryDirectoryOwnership` starts PowerShell on every call (3 to 4 s here). It ran 2 times after the spawn in
  W01, so `time.readyMs` was wrong. Fix is in the W01 harness.
- The app starts real provider CLIs found on the computer (for example `claude.exe --version`). They add to peak
  values at start (W01).
- Stop only processes that you started. Use `bun run dev:stop` for a dev stack.

### Sign-in and profile

- On Windows the session file is encrypted with a key in `Local State` of the profile (DPAPI, `os_crypt`).
  Without that key each bench run signs in again. The Auth API allows few codes in 15 minutes ("Too many sign-in
  attempts") (W01).
- The first sign-in of a new bench account gives 3 pages. Later runs have 4 (no `team-webrtc.html` on the first).
  Do one warm-up run for each tree (W01).
- Bench reports must keep the sign-in key when the profile is replaced (W01 fix in `bench.ts`).

### Sandbox and real profile

- Never read, write or start anything in `%APPDATA%\CodeBot*`, `%APPDATA%\CodeBot*`, `%USERPROFILE%\CodeBot`,
  `%USERPROFILE%\CodeBot`, `%USERPROFILE%\.claude`, `%USERPROFILE%\.codex`, or other provider folders (agent-brief).
- Existence tests count as access. A W12 survey agent checked `%APPDATA%\CodeBot*` and
  `%LOCALAPPDATA%\CodeBot\codebot-dev-instances`. Nothing existed, and nothing was read or written. The lead
  logged it and told agents that existence tests are not allowed (`_tools/agents.md` honesty log).
- The lead's Electron probe created an empty folder `%APPDATA%\electron-probe` on 2026-11-25. The lead removed it
  (`_tools/agents.md`). Run probes inside a sandbox.
- `cb_sandbox` does not set `CLAUDE_CONFIG_DIR`. The Claude SDK session functions read that variable only (W08).
  Check the value in any session-list test. CodeBot uses the agent's value, else `~/.claude` (`src/backend/claude-client.ts`).
- A second Claude account has another config folder. SDK session functions do not see it unless `CLAUDE_CONFIG_DIR` is
  set (W08).
- W20 note: other agents run suites at the same time. Temp folders named `codebot-team-*` may belong to others.
  Delete only your own folders.
- `vitest` and the E2E scripts need `cb_sandbox <name>` first (W02b, W07a, W08 notes).

### Symlinks and file modes

- This Windows account cannot create file symlinks. Use folder junctions in tests (W11, W20 `file-preview-pages.test.ts`).
  W11's E2E checks folder junctions and skips the file link case.
- `codebot-database.test.ts` expects POSIX mode `0o600`. Windows reports `0o666`. Do not assert file modes on Windows (W20).
- Recursive `fs.watch` works only on Windows and macOS. On Linux, Node uses one inotify watch per file, so W11 uses one
  watcher per expanded folder there.

### Hooks and checks

- `scripts/staged-typecheck.ts` builds roots with backslashes (from `relative()`). So a staged `src/main/**` or
  `src/renderer/**` file selects no `typecheck:node` or `typecheck:renderer` root. Run those by hand. Owner: W20 (W02b F2).
- W02b also reported the reverse in round 1: when `packages/contracts` is staged, all roots run, so the renderer
  must pass before the commit can go in (W02b round 1 note).
- `check:agent-context`: `developerInstructions()` reads `process.platform`. The baseline comes from Linux CI.
  W20 added a `platform` option (default `process.platform`) and a fixture that sets `linux`. W20 reports exit 0 with
  counts equal to its baseline. Main's `tools/agent-context/budget.json` has 16939 / 17144 (confirmed). The W10
  branch's copy has 16726 / 16931, hand-edited by W10 for its Windows delta. Which copy is kept is not decided.
- Knip (`knip 6.42.1`, electron-vite plugin): on Windows the plugin gets `C:\...\index.html` from `resolve()` and calls
  `path.posix.dirname`, which gives `.`. Thus `/src/index.tsx` resolves to the wrong root. W20 fixed
  `knip.config.ts` with page modules from `src/renderer/*.html` as plugin entries.
- Knip out of memory in W06 round 1. Re-run after the memory guard passes.
- `knip:check` leaves `src/backend/projects/project-context.ts` unused. It is a lead seam with no importer yet (W20).
- `i18n:check` fails for new keys that have no translation unless `packages/i18n/untranslated.json` lists them. The lead
  updates that file (W07, W08, W02b notes).
- Biome anti-slop rules: no `Record<string, unknown>` (use `DynamicRecord`), no function that returns `unknown`,
  no `const x: unknown = ...`, no unsafe `as` (W03a, W06, W10).
- `check-branding` lists upstream name lines. Baseline on 2026-11-26: 1,457 lines in 431 files (`docs/codebot/prd-status.md`).
  Packages W02a, W02b, W03, W04, W06 and W18 remove them.

### Stand-in programs and provider CLIs

- `bun run test:provider-runtime-blocked` does not run on Windows. Its stand-in is a `#!/bin/sh` file named
  `opencode.exe`. `uv_spawn` fails at the first scenario (W06). W20 uses `.cmd` wrappers instead.
- `bun run test:provider-detection` failed on unmodified main on Windows: the stand-in is a POSIX script (`goose`),
  and the scan looks for `goose.exe` or `goose.cmd` (W13). W13 corrected the script.
- Claude-based E2E scripts converted by W20 (11 scripts) pass on Windows. Two login-path scripts
  (`claude-session-login-path-e2e.ts`, `custom-acp-agent-login-path-e2e.ts`) exit 1 with a message on `win32` by design.
- `filesystem-smoke.ts --workspace-only`: PowerShell steps run on `win32`. `grok`, `opencode` and `cursor` are skipped
  where `canConfineProcesses()` is false (W20).
- `pi-workspace-only-smoke` and `pi-mcp-workspace-only-e2e` run only on macOS (`sandbox-exec`) (W20).
- No WSL and no Docker are on this computer. POSIX runs are not possible here. W09 used a fake `docker` for the container E2E.
- Real Claude CLI on this computer starts but is not signed in in the sandbox. Do not spend tokens. Use fake providers.
- Codex: the codex CLI is missing in the sandbox (W20 smoke).
- Fake Codex on Windows needs a `codex.cmd` wrapper (`@"<node>" "%~dp0codex.cjs" %*`). Set `CODEBOT_CODEX_PATH` to it before `bun run dev` (W12 notes).

### Sandbox profile rules

- Folder lock levels (`D13`): Open = full access. Normal adds the prompt rule, the provider write sandbox and a read
  block outside allowed folders. Strict adds the OS sandbox with read isolation, or a container. A provider that cannot
  lock on the current OS is refused in Normal and Strict (decisions.md D13).
- Strict with Claude is refused on this Windows build because the Claude sandbox is off here (W09).
- Codex Normal has no read block (Codex has no file tool). Codex Strict has no container path and is refused (W09).
- macOS and Linux lock branches (Seatbelt read rules, bubblewrap, real container) are not run on a real system (W09).
- Git reads run in the main process on a repository that an agent can write. A `.git/config` filter driver can run
  commands. `core.fsmonitor` is off. Signatures are not shown. Reported to the lead for the folder lock package (W11).

### Screens and browsers

- Chrome is not installed on this computer. Edge is at `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`.
  Story screenshots use `channel: "msedge"` (W13) and `chromium.launch({ executablePath })` (W12 notes).
- `dev:automation screenshot --out=<name>.png` writes only under `.codebot-build/dev-automation/`.
- The built app page is `codebot-app://app/index.html`. `connectToDevApp` refuses it. Use `launchBenchApp` (W12 notes).
- Dev E2E connects to `connectToDevApp(instance.remoteDebuggingPort, ...)` from the registry under
  `CODEBOT_DEV_REGISTRY_DIR` (W12 notes).
- The first dev app window opens in the background. Use `--foreground` to bring it up (W12 notes).

### Memory and concurrency

- `cb_wait_for_memory 8` before the dev app, a bench or a full test run. Several build agents share this computer (env.sh).
- The computer has 24 logical CPUs. About 9 were busy during W01 bench runs. Reports record `host.cpu` (W01).
- Concurrent subagent limit is 20. Finished explore agents may count (`_tools/agents.md`). W21a could not start for this reason.
- A full `test:desktop` run: 103 files, 2298 tests (W20). Run it after the memory guard passes.
- `dockview-core@7.0.4` is pinned. 8.x has no stylesheet without the React wrapper package (`_tools/agents.md`).

### Other Windows facts

- Electron cache and builder paths are under `_tools/cache`. A packaged build needs `app-update.yml`
  (W06). An unpackaged run uses `forceDevUpdateConfig` and `dev-app-update.yml` (W06 notes on electron-updater 6.8.11).
- NSIS: with no `publisherName` in `app-update.yml`, updates are not signature-checked. Unsigned builds update (W06).
- `apps/mobile` and `apps/auth-api` import contract modules and `@codebot/telemetry` names. Keep these names as inert
  exports until their owners are removed (W02a, W02b).
- `apps/auth-api/package.json` has `"@openpanel/web": "catalog:"`. The root catalog entry cannot be removed while that line
  exists (W02a).
- `Assets.car` of upstream macOS icons is removed. `scripts/compile-macos-icon.ts` must run on a Mac (`docs/codebot/prd-status.md`).

## Unverified points

- Docs named by TASKS.md are not in `CodeBot/docs/codebot` (checked 2026-11-26). They exist only in worktrees: `account-service.md` (W03a), `updates.md` and `unsigned-builds.md` (W06), `folder-lock.md` (W09), `themes.md` (W16), `windows-test-status.md` (W20). Not created yet: `local-models.md` (W13), `screenshots.md` (W21a), `perf/README.md` (W01).
- Merge state of the other branches. Checked 2026-11-26 with `git merge-base --is-ancestor`: `w20-wintests`, `w02b-cloud`, `w03-account-service` and `w06-updates` are not in main. Other branches not checked.
- Which `check:agent-context` baseline is kept (main 16939 / 17144, or the W10 branch 16726 / 16931). Not decided.
- Whether a sandboxed run sets `CLAUDE_CONFIG_DIR`. `cb_sandbox` does not; the agent value comes from the agent environment.
- The `staged-typecheck.ts` fix proposal (not tested).
- The exact `git worktree add` command the lead used.
- Current lead states in `_tools/agents.md` (all "running" on 2026-11-26; TASKS.md is newer for some packages).
- `_wt/w05-advanced` and `_wt/w16-themes` have no agent id in `_tools/agents.md`.
- Scripts checked for existence only, not read: `scripts/codebot/check-branding.ts`, `scripts/codebot/rename-upstream.ts`,
  `scripts/claude-windows-cmd-e2e.ts`, `scripts/dev-services.ts`. `scripts/staged-typecheck.ts` was read (the `relative()` root bug is in the code).
- Out of scope and not read: `_tools/run-checks.sh`, `_tools/logs-*`, `_tools/checks/`, `_tools/prompts/`, `CodeBot-PRD.md`.
