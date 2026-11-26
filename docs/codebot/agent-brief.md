# Brief for CodeBot build agents

Read this file in full before you change anything. Your task message gives you a work package, the
PRD item IDs that you own, a worktree and a branch.

## 1. Source of truth

- PRD: `C:\Users\IbrahimBisen\Desktop\Coding Software\CodeBot-PRD.md`. Read it in full. Each numbered
  item is a requirement.
- Decisions already made: [decisions.md](decisions.md). Do not change a decision; tell the lead if a
  decision blocks you.
- Repository rules: the root `AGENTS.md` and the `AGENTS.md` of each directory that you change. They
  apply unless the PRD or this brief says otherwise. Two differences from `AGENTS.md`:
  - You run the checks named in section 6 yourself. There is no CI.
  - Tests must run on Windows too (section 5).

## 2. Computer and tools

- Windows 11. Git Bash and PowerShell are available. Bun is not installed for the user; a local copy
  is in `_tools`. In Git Bash, start every command with:
  `source "/c/Users/IbrahimBisen/Desktop/Coding Software/_tools/env.sh"`
  In PowerShell: `. 'C:\Users\IbrahimBisen\Desktop\Coding Software\_tools\env.ps1'`
- The path has a space. Quote every path.
- **Write only below `C:\Users\IbrahimBisen\Desktop\Coding Software`** (and the system temp folder).
  The owner has a real OpenBot installation with real data on this computer. Never read, write or
  start anything in `%APPDATA%\OpenBot*`, `%APPDATA%\CodeBot*`, `%USERPROFILE%\OpenBot`,
  `%USERPROFILE%\CodeBot`, `%USERPROFILE%\.claude`, `%USERPROFILE%\.codex` or any other provider
  folder of the real profile. Never start, stop or change the installed OpenBot.
- **Before you start the app, a dev script, an E2E script or vitest, redirect the profile:**
  `cb_sandbox <your-package-name>` (Git Bash) or `Use-CbSandbox <your-package-name>` (PowerShell).
  This sets `USERPROFILE`, `HOME`, `APPDATA` and `LOCALAPPDATA` to
  `_sandbox\<name>`, so userData, `~/CodeBot`, `~/.claude` and the dev profiles are isolated.
  Electron on Windows reads `APPDATA` from the environment; this was verified.
- Do not install global software. Do not change the global git configuration. Do not push, publish,
  deploy or send anything to an external service.
- Do not spend model tokens: use fake providers and mock servers. A real provider CLI can be on this
  computer; in a sandbox profile it is not signed in.
- Stop every process that you start. Use `bun run dev:stop` for a dev stack. Never stop a process by
  name pattern.

## 3. Git

- Work only in your worktree and on your branch. Do not touch other worktrees or the `main` branch.
- Run `bun install --frozen-lockfile` once in a new worktree (about 3 minutes).
- **Commit at least every 30 to 45 minutes of work, also when the work is not complete.** A usage
  limit can stop you at any time; uncommitted work can be lost. An incomplete commit is correct on
  your branch when its message starts with `WIP:` and the tree still type-checks for the files that
  you changed.
- Keep a checklist in `TASKS.md` at the root of your worktree (git ignores it): the steps of your
  package, which are done, what you do now, and what you found. Update it before each commit. If you
  are started again, read `TASKS.md` and `git log` first and continue from there.
- Write commit messages in Simplified Technical English. End each message with:
  ```
  Co-Authored-By: Claude <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01AEe9xCzbDZDdjjgf2o9XVz
  ```
- The pre-commit hook runs Biome on staged files, `check:ui` and the typecheck of the affected
  projects. It needs Bun on `PATH`, so source `env.sh` first. Do not use `--no-verify`. If the hook
  fails for a reason that is not yours, tell the lead in your report.
- Do not add release notes in `changelog.d/`; the lead writes them.
- When the lead asks you to bring in new `main` commits, use `git merge main`, not a rebase.

## 4. Code rules

- No comments in code or configuration (see `AGENTS.md`, "Comments").
- All text that a user reads comes from the i18n catalogs. Each package has its own English module
  in `packages/i18n/src/messages/en/` (your task names it, for example `project.ts` with keys
  `project.*`). **Add keys only to your English module.** Do not edit the other locales or
  `packages/i18n/untranslated.json`; the lead updates them. Errors from the main process or backend
  use `sourceText(key)` with keys in your `en/error/<area>.ts` module.
- UI: use the primitives of `@codebot/ui`, the `--codebot-*` design tokens, and the patterns in
  `src/renderer/AGENTS.md` and `docs/ui-foundation.md`. `bun run check:ui` has zero budgets.
- IPC: follow `packages/contracts/AGENTS.md`, `src/main/ipc/AGENTS.md` and `src/preload/AGENTS.md`.
  Each new endpoint needs the contract, the handler, the preload bridge and the preview mock in
  `src/renderer/src/preview/`.
- Keep the code cross-platform. No Windows-only path, shell, tool or library. Use `node:path`. Put
  OS-specific code behind a platform check that also has macOS and Linux branches. Do not remove
  macOS or Linux code.
- Never add a call to an upstream server, and never add the upstream product name in any case. The
  check `bun scripts/codebot/check-branding.ts --report` lists what is left.
- Add a dependency only when it is needed. Use an exact version that is older than 3 days
  (`bunfig.toml`), with an MIT, Apache-2.0, BSD or ISC license. Name it in your report.
- Database: do not add a file to `src/backend/migrations/` and do not change an existing table.
  CodeBot tables use the project migration chain (decision D11); ask the lead if you need a table.
- Put new CodeBot code in new files and new directories where you can. Keep each edit of an existing
  file small. This keeps merges with other agents and with upstream simple.

## 5. Tests

- Add an E2E script for each feature: `scripts/<name>-e2e.ts`, with a `test:<name>` entry in
  `package.json`. The script drives the real service, process or app, and writes
  `.codebot-build/<name>/report.json` with `{ "passed": true|false, "checks": [...] }`.
- The script must pass on Windows and must also be correct for macOS and Linux. A stand-in program
  for a provider CLI needs a `.cmd` wrapper on Windows (pattern: `scripts/claude-windows-cmd-e2e.ts`).
- Vitest files are only for migrations, the trust boundary and secret redaction.
- Wait for a state or an event, not for elapsed time.

## 6. Checks before you report

Run these one at a time, and fix what fails:

1. `./node_modules/.bin/biome check --write --max-diagnostics=none <changed files>`
2. `bun run typecheck:node` when you changed `src/main`, `src/backend`, `src/preload` or `scripts`.
3. `bun run typecheck:renderer` when you changed `src/renderer` or `packages/ui`.
4. The `typecheck` script of each other package that you changed.
5. `bun run check:ui` when you changed UI or CSS.
6. Your E2E scripts, and each existing test that covers the code you changed
   (`bun run test:related -- <source files>`).
7. For UI work: start the app in your sandbox, take screenshots with `bun run dev:automation
   screenshot`, open each PNG and look at it. Fix what is broken, cut off, misaligned, too small or
   hard to read. Put the final screenshots in `.codebot-build/<package>/screens/` and list them.

## 7. Report

End with a short report in plain language:

- What you built, by PRD item ID, with the proof for each item: the test name and report path, or the
  screenshot path.
- Each item that is not done or only partly done, with the exact reason.
- Each choice that you made where the PRD or this brief was not specific.
- Each shared file that you changed outside your own area.
- New dependencies.
- Your branch name and last commit.

Be exact about what you verified and what you did not. Do not call an item done without proof.
