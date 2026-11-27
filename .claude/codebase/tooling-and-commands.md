# Tooling and commands

## What this area is

This area holds the root configuration of the CodeBot repository, the `tools/` folder, and the Git hook.
It also holds the `bun run` scripts in `package.json`.
Most scripts start a file in `scripts/`.
The main checks are Biome, knip, the TypeScript projects, Vitest, the UI check and the translation check.
Read this file before you run a check, add a script, or change a build.

## Key files

| Path | What it owns |
| --- | --- |
| `package.json` | Workspaces (`apps/*`, `packages/*`, `remote/api`), the version catalog, every `bun run` script, dependencies and devDependencies, and `patchedDependencies`. |
| `bunfig.toml` | Bun install rules: `exact = true`, `linker = "hoisted"`, `minimumReleaseAge = 259200` (3 days), and `minimumReleaseAgeExcludes` (`effect`, `@norbert_bodziony/bloub`, `@near-intents-agent-api/sdk`). |
| `biome.json` | Biome 2.5.13 formatter and linter rules, the grit plugin lists, the per-path overrides, and the ignore list. |
| `knip.config.ts` | knip entry points, project scopes per workspace, `ignoreIssues`, `ignoreBinaries`, `ignoreDependencies`, and the CSS `@import` compiler. |
| `electron.vite.config.ts` | electron-vite build for `main`, `preload` and `renderer`: entry inputs, externals, plugins, dev port, and the bench build flag. |
| `electron-builder.yml` | Packaging for macOS (DMG and ZIP), Windows (NSIS, x64), and Linux (AppImage, x64 and arm64). It holds the app id, the fuses, the update feed, `files`, `asarUnpack` and `extraResources`. |
| `electron-builder.windows-signing.yml` | Extends `electron-builder.yml`. It adds `forceCodeSigning` and `win.azureSignOptions`. `.github/workflows/release.yml` passes it to `bun run dist:win --config`. |
| `tsconfig.json` | Solution file. It has no `files` and refers to `tsconfig.node.json` and `tsconfig.web.json`. |
| `tsconfig.base.json` | Shared compiler options. `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noUnusedLocals`, `noUnusedParameters`, `isolatedModules`, `skipLibCheck`. |
| `tsconfig.node.json` | Node project. `types: ["node"]`, `verbatimModuleSyntax`. Includes the root configs, `scripts/**`, `tools/vitest/**`, `src/backend`, `src/main`, `src/preload`, `packages/contracts/src`, `packages/logging/src`. |
| `tsconfig.web.json` | Renderer project. ES2022, `jsx: "preserve"`, `jsxImportSource: "@solidjs/web"`, Vite and Vitest types. Includes `src/renderer`, `packages/contracts/src`, `packages/ui/src`. |
| `tsconfig.storybook.json` | Storybook project. Extends `tsconfig.web.json`, adds Node types, includes `.storybook` and `src/renderer/src/env.d.ts`. |
| `tsconfig.*.tsbuildinfo` (root) | Incremental build caches written by `tsc` or tsrs. Do not edit. `*.tsbuildinfo` is in `.gitignore`. |
| `vitest.config.ts` | Two Vitest projects, `node` and `renderer`, plus the balanced sequencer and the hermetic setup files. |
| `.githooks/pre-commit` | Git pre-commit hook. Runs `check:staged`, then the release-note checks, then `check:ui` and `scripts/staged-typecheck.ts` for code, then the schema parity test. |
| `tools/agent-context/budget.json` | Byte budgets for `check:agent-context`. Read by `scripts/agent-context-budget.ts`. |
| `tools/biome/anti-slop/rules/*.grit` | 22 GritQL rules for Biome. Each rule has one fixture in `tools/biome/anti-slop/fixtures/*.fixture.ts`. |
| `tools/biome/anti-slop/fixtures/*.fixture.ts` | Positive cases marked `// flag` and negative cases. Checked by `scripts/anti-slop-rules.test.ts`. |
| `tools/typescript/type-baseline.json` | Per-file error counts for TypeScript options that are not on yet. Read by `scripts/type-ratchet.ts` (rules in `scripts/debt-ratchet.ts`). |
| `tools/ui-foundation/*.grit` | Three GritQL rules: `no-desktop-preload.grit`, `no-hardcoded-ui-text.grit`, `no-story-play.grit`. |
| `tools/ui-foundation/fixtures/renderer/` | Bad fixtures. Every check must fail here. |
| `tools/ui-foundation/fixtures/renderer-clean/` | Good fixtures. No check may fail here. |
| `tools/vitest/hermetic-setup.ts` | First setup file of both Vitest projects. Removes credential variables and moves `HOME` and related paths to a temporary folder. |
| `tools/vitest/hermetic-global-setup.ts` | Global setup for the `renderer` project. Moves `HOME` in the main process before the worker threads start. |
| `tools/vitest/hermetic-environment.ts` | Shared helper for the two hermetic files above. |
| `tools/vitest/balanced-sequencer.ts` | Vitest sequencer. Orders files by the timing table in `tools/vitest/test-durations.json`. |
| `tools/vitest/test-durations.json` | Per-file durations. Re-record with `bun run test:durations`. |
| `docs/development-checks.md` | Design notes for every check, CI coverage, lane rules, the type ratchet, the agent context budget, and why each rule exists. |
| `README.md` (section `## Commands`, line 396) | Command table for users and agents. Every new user-facing command goes here. |
| `scripts/install-git-hooks.ts` | Runs `git config core.hooksPath .githooks`. Called by the `prepare` script. |
| `scripts/type-checker.ts` | Runs tsrs when a binary exists for the platform, else `node_modules/typescript/bin/tsc`. Used by `typecheck:node`, `typecheck:renderer`, `typecheck:storybook` and `types:ratchet`. |
| `scripts/staged-typecheck.ts` | Picks the `typecheck:*` projects that can see a staged file. Supports `--dry-run`. |
| `scripts/ui-foundation-check.ts` | Runs `check:ui`. |
| `scripts/i18n-check.ts` | Runs `i18n:check`. |
| `scripts/dev-services.ts` | Starts the dev stack. Accepts the targets `api`, `app`, `test-client`, `all`, and the flags listed in "Commands". |
| `scripts/dev-stack.ts` | Runs `dev:status`, `dev:stop`, `dev:forget`, `dev:restart-client`. |
| `scripts/dev-automation/cli.ts` | Runs `dev:automation`, `dev:cpu`, `dev:memory`. |
| `scripts/dev-automation/bench.ts` | Runs `dev:bench`. Scenarios are in `scripts/dev-automation/bench-scenarios.ts`. |
| `scripts/dev-worktree-vite-plugin.ts` | Vite plugin used by `electron.vite.config.ts`. |
| `packages/i18n/src/vite-plugin.ts` | `lazyLanguageCatalogs()` plugin used by `electron.vite.config.ts`. |
| `.github/workflows/ci.yml` | Source of truth for CI jobs (read only the table in `docs/development-checks.md`; `ci.yml` itself was not read). |

## How it works

### Install and setup

- `packageManager` is `bun@1.4.2`. `engines.node` is `>=24.0.0`. `.nvmrc` pins the Node version.
- `prepare` runs `bun scripts/install-git-hooks.ts`. It sets `core.hooksPath` to `.githooks`.
- `postinstall` runs, in order: `scripts/electron-dist-cache.ts restore`, `scripts/install-electron.ts`,
  `scripts/electron-dist-cache.ts save`, `scripts/stamp-install.ts`.
- `bun install --frozen-lockfile` is the install command for a fresh worktree.
- `dev:prepare` and `dev:bootstrap` both run `scripts/prepare-dev-environment.ts`.

### Build

- `build` is `electron-vite build`. It writes `out/`.
- `build:bench` is the same with `CODEBOT_BENCH_BUILD=1`. This adds perf probes and a `bench-build.json` file.
- `electron.vite.config.ts` builds three targets:
  - `main`: inputs `src/main/start.ts`, `src/main/index.ts`, `src/backend/agent-data/agent-database-host.ts`,
    `src/main/voice-transcription-host.ts`, `src/main/voice-speech-host.ts`, `src/main/process-launcher-host.ts`,
    `src/backend/database/usage-report-worker.ts`. External: `jimp`, `sharp`, `audio-decode`, `link-preview-js`.
  - `preload`: inputs `src/preload/index.ts`, `src/preload/team-webrtc.ts`, `src/preload/browser-page.ts`.
    Output is CommonJS with `.cjs` names.
  - `renderer`: HTML inputs `src/renderer/index.html`, `helper.html`, `browser-pip.html`,
    `browser-pip-controls.html`, `browser-window.html`, `team-webrtc.html`, `server-setup.html`.
- `main` externalizes dependencies except the `@codebot/*` workspace packages (`brand`, `contracts`, `i18n`,
  `logging`, `team-client`, `telemetry`, `user-errors`, `whatsapp`). Those are bundled into `out/`.
- `CODEBOT_DEV_RENDERER_PORT` sets the renderer dev server port. It must be an integer from 1024 to 65535.
  The port is strict.

### Package and distribute

| Script | What it runs |
| --- | --- |
| `package` | `voice:prepare-runtime`, `prepare:remote-desktop-runtime`, `verify:remote-desktop-runtime`, `prepare:cua-driver`, `build`, then `electron-builder --dir --mac --config.mac.identity=null --config.mac.notarize=false`. |
| `package:verify` | `package`, then `verify:package` (`scripts/verify-macos-package.ts`). |
| `package:win` | `voice:prepare-runtime`, `prepare-remote-desktop-runtime.ts win32 x64`, `verify-remote-desktop-runtime --windows`, `install-cua-driver.ts win32 x64`, `build`, then `electron-builder --dir --win --x64 --publish never`. |
| `package:win:verify` | `package:win`, then `verify:package:win` (`scripts/verify-windows-package.ts`). |
| `package:linux` | Same chain for Linux x64, `electron-builder --dir --linux --x64`. |
| `package:linux:arm64` | `voice:prepare-runtime`, `install-cua-driver.ts linux arm64`, `build`, `electron-builder --dir --linux --arm64 --publish never`. |
| `package:linux:verify` | `package:linux`, then `verify:package:linux`. |
| `dist:mac` | The same chain as `package`, then `electron-builder --mac` (DMG and ZIP, not `--dir`), with the same two `--config.mac` overrides. |
| `dist:win` | `voice:prepare-runtime`, `prepare-remote-desktop-runtime.ts win32 x64`, `verify-remote-desktop-runtime --windows`, `install-cua-driver.ts win32 x64`, `build`, then `electron-builder --win nsis --x64 --publish never`. |
| `dist:linux` | `voice:prepare-runtime`, `prepare-remote-desktop-runtime.ts linux x64`, `verify-remote-desktop-runtime --linux`, `install-cua-driver.ts linux x64`, `build`, then `electron-builder --linux AppImage --x64 --publish never`. |
| `dist:linux:arm64` | `voice:prepare-runtime`, `install-cua-driver.ts linux arm64`, `build`, then `electron-builder --linux AppImage --arm64 --publish never`. |
| `dist:release` | The `dist:mac` chain, then `electron-builder --mac --publish never`. It omits the two `--config.mac` overrides, so the build signs and notarizes as `electron-builder.yml` says. |
| `verify:preload` | Runs after `build`. Loads each preload bundle in `node:vm` with a fake Electron. Checks `window.codebot` against `IPC_ENDPOINTS`. (`scripts/verify-preload-bundle.ts`) |
| `verify:update-artifacts` | `scripts/verify-update-artifacts.ts`. |

Notes on `electron-builder.yml`:

- `appId` is `app.codebot.desktop`. `productName` is `CodeBot`. `asar` is `true`.
- `publish` uses the GitHub provider, owner `nightly-labs`, repo `codebot`.
- `electronUpdaterCompatibility` is `">=2.16"`.
- Fuses: `runAsNode: false`, `enableNodeOptionsEnvironmentVariable: false`, `enableNodeCliInspectArguments: false`,
  `enableEmbeddedAsarIntegrityValidation: true`, `onlyLoadAppFromAsar: true`, `grantFileProtocolExtraPrivileges: false`.
- `asarUnpack` keeps the four `out/main/*-host.js` files out of the archive, plus `effect` and `koffi`.
- `files` excludes Claude Agent SDK binaries for other platforms, `effect/src`, and `*.map` files.
- `mac` target: `dmg` and `zip`. `notarize: true` in the file. The package scripts turn it off with a flag.
- `win` target: `nsis`, x64.
- `linux` target: `AppImage`, x64 and arm64.
- `extraResources` copies managed skills, plugin catalog, agent import data, the CLI bundle, the agent runtime,
  icons and licenses. Platform sections add the voice runtime, the remote desktop runtime, and the cua-driver.

### Checks (fast, per-project)

| Script | What it runs | Time (from docs) |
| --- | --- | --- |
| `typecheck:node` | `scripts/type-checker.ts --noEmit -p tsconfig.node.json` | under 10 s |
| `typecheck:renderer` | `scripts/type-checker.ts --noEmit -p tsconfig.web.json` | under 10 s |
| `typecheck:storybook` | Same with `tsconfig.storybook.json` | short |
| `typecheck:contracts`, `typecheck:brand`, `typecheck:logging`, `typecheck:user-errors`, `typecheck:i18n`, `typecheck:telemetry`, `typecheck:team-client` | `bun run --cwd <package> typecheck` | short |
| `typecheck:api`, `typecheck:sites`, `typecheck:updates`, `typecheck:remote`, `typecheck:status`, `typecheck:extension` | Same, for the matching app or service | short |
| `typecheck:mobile` | Runs `apps/mobile` `typecheck`, which first runs `scripts/mobile-codegen.ts` when its inputs changed. | short |
| `typecheck` | `bun run --parallel 'typecheck:*'`. Runs every project at once. Do not run it locally (see Gotchas). | heavy |
| `desktop:typecheck` | `typecheck:node`, `typecheck:renderer`, `typecheck:contracts`, `typecheck:brand`, `typecheck:storybook`, in parallel. | |
| `lint` | `biome check --max-diagnostics=none .`. Full repository. | heavy |
| `check:staged` | `biome check --write --staged --files-ignore-unknown=true --no-errors-on-unmatched`. | fast |
| `check:ui` | `scripts/ui-foundation-check.ts`. Design-system rules for the renderer and `packages/ui`. | medium |
| `i18n:check` | `scripts/i18n-check.ts`. Catalog keys, placeholders, plural forms, unused and untranslated keys. Supports `--fix`. | |
| `types:ratchet` | `scripts/type-ratchet.ts`. Holds TypeScript options to `tools/typescript/type-baseline.json`. | about 2 s (tsrs) or 4 s (tsc) |
| `check:agent-context` | `scripts/agent-context-budget.ts`. Holds the agent context byte counts to `tools/agent-context/budget.json`. Writes `.codebot-build/agent-context-budget/report.json`. | |
| `check:migrations` | `scripts/check-frozen-migrations.ts`. Compares `src/backend/migrations/` with the newest `codebot-v*` tag in the local repository. `--tag` names another tag. It does not fetch. | |
| `check:assets` | `scripts/check-image-assets.ts`. Fails for an image or video outside the allowed asset folders. | |
| `check:doc-links` | `scripts/check-doc-links.ts`. Checks relative links and `#anchor` targets in tracked Markdown files. | |
| `check:app-minimum-version` | `scripts/check-app-minimum-version.ts`. | |
| `check:branding` | `scripts/codebot/check-branding.ts`. | |
| `knip:check` | `knip`, using `knip.config.ts`. Finds unused files, exports, types, dependencies, unresolved imports and binaries. About 6 s. | |
| `check:desktop:static` | `check:ui`, `lint`, `desktop:typecheck`, `build`, `verify:preload`. | CI runs it. |
| `check:desktop` | `check:desktop:static`, then `test:browser`. | CI splits the two halves. |
| `check:api` | `typecheck:api`, `test:api`, and a set of `test:*` API and hosted scripts, then `api:build:check`. | CI |
| `check` | `check:desktop` and `check:api` in parallel, then `test:desktop`. | Do not run locally. |

Notes:

- The name is `knip:check`. The root package has no script named `knip`. Run it as `bun run knip:check`.
- `desktop:typecheck` does not include `typecheck:api`, `typecheck:mobile` or the others.

### Tests

| Script | What it runs |
| --- | --- |
| `test:desktop` | `vitest run`. Both Vitest projects. |
| `test:api` | `bun run --cwd apps/auth-api test`. |
| `test` | `test:desktop`, then `test:api`. |
| `test:backend` | `vitest run src/backend`. |
| `test:changed` | Checks that `origin/main` and a merge base exist. Then runs `vitest run --changed origin/main --maxWorkers=1`. |
| `test:related` | `vitest related --run --maxWorkers=1`. Use as `bun run test:related -- <source>...`. |
| `test:durations` | `scripts/test-durations.ts`. Re-records `tools/vitest/test-durations.json`. |
| `test:browser` | `scripts/browser-smoke.ts`. Starts the real Electron binary. Needs a display (CI uses `xvfb-run -a`). |
| `test:*` (many entries) | Named E2E scripts under `scripts/*-e2e.ts` (about 460 files) and `apps/auth-api/scripts/*-e2e.ts` (26 files). Each drives a real app, process or service and writes a report. |

Vitest details (from `vitest.config.ts`):

- Global options: `globals: true`, `restoreMocks: true`, `vmMemoryLimit: "1GiB"`,
  `sequence.sequencer: BalancedSequencer`, `forceRerunTriggers: []`, `execArgv` disables `ExperimentalWarning`.
- Project `node`: environment `node`, pool default (isolated forks), setup `tools/vitest/hermetic-setup.ts`.
  Includes `src/backend/**`, `src/main/**`, `src/preload/**`, `src/renderer/**/*.test.ts`, `scripts/**`,
  `packages/logging/**`, `apps/mobile/src/**` (only `*.test.ts`). Excludes `*.dom.test.ts`.
- Project `renderer`: environment `jsdom`, pool `vmThreads`, global setup `tools/vitest/hermetic-global-setup.ts`,
  setup `hermetic-setup.ts` and `src/renderer/src/setupTests.ts`. Includes `src/renderer/**/*.test.tsx` and
  `**/*.dom.test.ts`.
- Test timeout comes from `TEST_TIMEOUT_MS` in `src/backend/test-deadlines.ts`.
- Excluded paths: `apps/auth-api/**`, `tests/visual/**`, `.codebot-build/**`, `**/.worktrees/**`,
  `**/.claude/worktrees/**`, `**/.codex/**`.

### Git hook

`.githooks/pre-commit` runs these steps in order:

1. Finds the fully staged and partly staged files.
2. Runs `bun run check:staged`. Biome fixes the working-tree copy of each staged file.
3. Stages the fixes again for the fully staged files only.
   If Biome changed a partly staged file, it stops the commit and names the file.
4. If `package.json` is staged: `bun scripts/check-release-notes.ts --staged`.
5. If `apps/mobile/app.json` is staged: `--staged --mobile`.
6. If `apps/mobile/CHANGELOG.md` is staged: `--staged --ota`.
7. For each staged `changelog.d/*.md` or `apps/mobile/changelog.d/*.md` (not the README files):
   `--staged --fragments`.
8. If a code file is staged (`.ts`, `.tsx`, `.mts`, `.cts`, `.js`, `.mjs`, `.cjs`, `.css`, `.grit`, `tsconfig*.json`,
   `package.json`, `biome.json`, `apps/mobile/app.json`, `bun.lock`):
   - `bun run check:ui`
   - `bun scripts/staged-typecheck.ts`
9. If a schema file is staged (`src/backend/codebot-database-schema.ts`, its parity test, a migration in
   `src/backend/migrations/`, or `codebot-database-schema-history.json`):
   `bun run test:desktop -- src/backend/codebot-database-schema-parity.test.ts`.

The hook does not run `lint` or the full typecheck. Do not skip it with `--no-verify`.

### Dev stack

The dev scripts start the local stack and drive it. `scripts/dev-services.ts` starts the services, and `scripts/dev-stack.ts` and `scripts/dev-automation/cli.ts` run the other commands.

| Script | What it runs |
| --- | --- |
| `dev` | `scripts/dev-services.ts app`. Starts `api`, `remote` and `app`. |
| `dev:all` | `scripts/dev-services.ts all`. Same services as `dev`. |
| `dev:test-client` | `scripts/dev-services.ts test-client`. Starts the same services and a second `test-client` app. |
| `dev:api` | `scripts/dev-services.ts api`. Starts only `api`. |
| `dev:slack` | `scripts/dev-services.ts app --slack`. Adds the Slack tunnels. |
| `dev:prepare`, `dev:bootstrap` | `scripts/prepare-dev-environment.ts`. |
| `dev:stop` | `scripts/dev-stack.ts stop`. Stops this worktree's stack by the PIDs in the registry. `--pid=<supervisor pid>` stops another stack, `--all` stops every stack. It exits non-zero when it cannot confirm a PID. |
| `dev:status` | `scripts/dev-stack.ts status`. Prints the stack records as JSON. |
| `dev:forget` | `scripts/dev-stack.ts forget`. Drops a stack record without sending a signal. |
| `dev:restart-client` | `scripts/dev-stack.ts restart-client`. Sends `SIGUSR2` to the supervisor to restart only the test client. Not on Windows. |
| `dev:automation` | `scripts/dev-automation/cli.ts`. Commands: `instances`, `pages`, `snapshot`, `click`, `type`, `screenshot`, `record`, `cpu`, `memory`. `click` and `type` need `--allow-mutations`. |
| `dev:cpu` | `scripts/dev-automation/cli.ts cpu`. Measures idle CPU of the running dev app. |
| `dev:memory` | `scripts/dev-automation/cli.ts memory`. Measures the memory of the running dev app once. |
| `dev:bench` | `tsx scripts/dev-automation/bench.ts`. Runs the scenarios of `scripts/dev-automation/bench-scenarios.ts` on the built app. Needs `bun run build`. |
| `dev:bench:hotspots` | `tsx scripts/dev-automation/bench-hotspots.ts`. Summarizes the bench reports. |
| `dev:seed` | `tsx scripts/seed-dev-state.ts`. Replaces the app development profile with showcase data. |
| `dev:reset` | `tsx scripts/reset-dev-state.ts`. Deletes the app, test-client and legacy host development state. It refuses while a dev app has the profile open. |

Notes:

- `dev`, `dev:all` and `dev:test-client` accept `--dry-run`, `--force`, `--shared`, `--isolated`, `--hosting=test`, `--slack` and `--foreground` (`DEVELOPMENT_OPTIONS` in `scripts/dev-services.ts`).
- Default ports: API 3100, Signal 3101, Signal health 3102, renderer 5173 (app) and 5174 (test client), remote debugging 9333 (app) and 9334 (test client).

## How to change it

### Add a root script

1. Add the script to `package.json` under `scripts`.
2. If it runs a file, create the file in `scripts/` (or under the owning app or package).
   E2E scripts use the `*-e2e.ts` or `*-smoke.ts` names.
3. Add a row to the `## Commands` table in `README.md` (line 396). `AGENTS.md` lists README commands among the surfaces to check.
4. Do not add a script whose name starts with `typecheck:` unless it runs a TypeScript project.
   `typecheck` and `scripts/staged-typecheck.ts` read every `typecheck:*` name.

### Add a TypeScript project check

1. Add a `typecheck:<name>` script to `package.json`. Use `bun run --cwd <package> typecheck`
   for a workspace, or `scripts/type-checker.ts --noEmit -p <tsconfig>` for a root project.
2. `scripts/staged-typecheck.ts` finds the project from the script text and the tsconfig `include`.
   No other list is needed for a workspace package.
   A fixed extra mapping is in the table at the top of `scripts/staged-typecheck.ts` (lines 11 to 16).
3. Add the new name to the `desktop:typecheck` list only if it belongs to the desktop group.
4. Add the job to `.github/workflows/ci.yml`. The CI file was not read in this review (unverified).

### Add or change a Biome grit rule

1. Create `tools/biome/anti-slop/rules/<name>.grit`. Use the `// scope:` first line if the file needs one (see an existing rule).
2. Create `tools/biome/anti-slop/fixtures/<name>.fixture.ts`. Mark each rejected line with `// flag`.
   Add valid neighboring code that must not match.
3. Add the rule path to the right `plugins` list in `biome.json`:
   global rules in the top `plugins` list, test-only rules in the `**/*.test.ts(x)` override, renderer-only rules in
   the `src/renderer/**` override, and so on.
4. Run `scripts/anti-slop-rules.test.ts`. The file exists (verified). Run it alone.
5. A rule must match a specific syntax. Check its cost (see `docs/development-checks.md#plugin-cost`).

### Add or change a UI check rule

1. Change or add a `.grit` file in `tools/ui-foundation/`. The three existing files are listed in
   "Key files".
2. Add a bad sample in `tools/ui-foundation/fixtures/renderer/` and a good sample in `renderer-clean/`.
   Both trees are needed.
3. Run `scripts/ui-foundation-check.test.ts`. The file exists (verified in the scripts folder listing).
4. Read `docs/development-checks.md#lint-and-ui-rules` first.

### Lower or raise a type ratchet option

1. Fix the errors in the code first.
2. Run `bun run types:ratchet -- --write` to lower the count in `tools/typescript/type-baseline.json`.
3. To start a new option at its current counts: `bun run types:ratchet -- --add=<option>`.
4. When an option has no errors left, turn it on in `tsconfig.base.json` and remove it from the baseline.
5. A higher count is never accepted. Raising a count is a hand edit that a reviewer sees.

### Change the agent context budget

1. Read `docs/development-checks.md#agent-context-budget` first.
2. A lower byte count: run `bun run check:agent-context -- --write` (the `--write` flag is read by `scripts/debt-ratchet.ts`, which the script calls).
3. A higher count: edit `tools/agent-context/budget.json` by hand. Explain it in the PR.

### Add an Electron entry point or HTML page

- New `main` or `preload` entry: add it to `rollupOptions.input` in `electron.vite.config.ts`.
  For a host process that runs as its own file, also add `out/main/<name>.js` to `asarUnpack` in `electron-builder.yml`.
- New renderer HTML page: add it to `renderer.build.rollupOptions.input` in `electron.vite.config.ts`.
- Check knip after the change: `bun run knip:check`. knip's built-in electron-vite plugin finds the inputs. `knip.config.ts` does not name it.

### Add a packaged resource

1. Add a row to `extraResources` in `electron-builder.yml` (in the platform section, or the common list).
2. Check that the package scripts copy the source file. For a new build input, add a step to the matching
   `package:*` and `dist:*` scripts.
3. Run the matching verify step (`verify:package`, `verify:package:win`, `verify:package:linux`) on that platform.

### Add or change a knip ignore

1. Use `ignoreIssues` for an export or type, `ignoreBinaries` for a shell command, `ignoreDependencies` for a
   package that knip cannot see used, and `workspaces[<path>].entry` or `.project` for scope.
2. The reason for each ignore is written in `docs/development-checks.md#check-coverage` (the knip paragraph).
   `knip.config.ts` has no comments, as `AGENTS.md` requires.
3. Run `bun run knip:check`. It takes about 6 seconds.

### Add a dev target or flag

1. Dev targets are in `scripts/dev-services.ts`: the `DevelopmentService` type, the `DevelopmentTarget` type,
   the `DEVELOPMENT_OPTIONS` list, and the service list returned for each target.
2. The current mapping: `app` and `all` start `api`, `remote`, `app`. `test-client` adds `test-client`.
   `api` starts only `api`. Keep `dev`, `dev:all` and `dev:test-client` in step with this mapping.
3. Document the flag in the `dev` row of the `README.md` Commands table.

### Add a dev-automation command

1. Add the command to `scripts/dev-automation/cli.ts`. Update the `USAGE` lines at the top of the file.
2. A command that changes the app (`click`, `type`) must need `--allow-mutations`. This rule is in `AGENTS.md`.
3. Update the README row for `bun run dev:automation`.

## Gotchas

- Do not run broad checks locally. `AGENTS.md` (section Checks) says CI runs them. This includes `lint`,
  `typecheck`, `format`, `check`, `check:desktop` and a full `test:desktop`.
- `format` runs `biome check --write` over the whole repository. Use `biome check --write --max-diagnostics=none <paths>` for changed files.
- `typecheck` runs 17 projects at the same time. Use one `typecheck:<name>` project at a time instead.
- `typecheck:*` names are read by `scripts/staged-typecheck.ts` and `typecheck`. Do not name a non-TypeScript check `typecheck:*`.
- `scripts/type-checker.ts` uses tsrs on macOS arm64 and Linux. It uses `tsc` on Windows and on Intel macOS.
  tsrs follows TypeScript 7.1. The catalog `typescript` is 7.0. The two can give different errors. CI uses tsrs.
  Storybook installs `typescript@6` as `@typescript/old`, so a bare `tsc` may run TypeScript 6. The script calls `tsc` by path.
- `test:changed` needs `origin/main`. Run `git fetch origin main` first. An old base picks tests for changes already on `main`.
- `vitest.config.ts`, a setup file and `package.json` changes select no test with `test:changed`.
  `forceRerunTriggers` is `[]`. Run the affected test file by path with `bun run test:desktop -- <path>`.
- `test:desktop` is not a fast check. The `renderer` project runs with `vmThreads`. Use `--sequence.shuffle.files`
  when you change pool settings, because the renderer files share module state.
- The `node` Vitest project uses forks. Its files register IPC handlers and read per-process globals.
- The hermetic setup deletes credential-shaped variables (`*_API_KEY`, `*_TOKEN`, `*_SECRET`, `*_PASSWORD`, `ANTHROPIC_*`,
  `OPENAI_*`, `AWS_*` and others) from the test process. A test that needs a token sets it itself.
- `knip.config.ts` has no comments, but `docs/development-checks.md` says each ignore states its reason.
  The reasons are only in the doc.
- `knip` exempts the frozen Team API files `packages/contracts/src/team-protocol/v*.ts` and `*-v*.ts`.
  Do not remove their exports.
- Biome ignores `.claude/` and `.codex/` (`files.includes` has `!!.claude` and `!!.codex`). Vitest excludes `**/.claude/worktrees/**`.
  The output file of this review is in `.claude/` and is not linted.
- The Biome ignore list also excludes `tools/biome/anti-slop` and `tools/ui-foundation/fixtures`. Fixtures are not linted.
- The `dependencies` block of `package.json` is what electron-builder copies into `app.asar`. A workspace package
  (`@codebot/*`) belongs in `devDependencies`. This is written in `docs/development-checks.md`.
- `minimumReleaseAge` is 3 days for Bun installs. Packages newer than that are not installed, except the three excluded in `bunfig.toml`.
- `tsconfig.node.json` and `tsconfig.web.json` set `verbatimModuleSyntax`. A type-only import must use `import type`.
- `exactOptionalPropertyTypes` is not on. It is tracked by the type ratchet.
- `check:ui` runs on every commit that stages a code file. It is a full-repository check, not a per-file one.
- `check:staged` changes working-tree files with Biome. The hook then restages only fully staged files. If a partly staged file changes,
  the commit stops. Stage the fix and commit again. Do not use `--no-verify`.
- The `dev`, `dev:all` and `dev:test-client` scripts use `scripts/dev-services.ts`. Their target list is in code.
  Check the code (`scripts/dev-services.ts`, lines around 99 to 102) before changing a target.
- `dev:bench` needs `bun run build` first. `dev:bench` and `dev:bench:hotspots` run through `tsx`, not `bun`.
- `dev:seed`, `dev:reset` and `dev:bench` run through `tsx`. `tsx` is a devDependency.
- `dev:reset` deletes the app, test-client and legacy host development state. It refuses while a dev app holds the profile.
- `dev:stop` uses PIDs in the registry. Never kill by process name. `dev:forget` drops a dead record without signalling.
  `dev:status` prints JSON.
- `dev:restart-client` is not supported on Windows (README).
- `electron-builder` packaging for Windows must run on Windows. The `package` and `dist:mac` scripts need macOS.
- `package` and `dist:mac` use `--config.mac.notarize=false` and `--config.mac.identity=null` on the command line. The config file
  itself says `notarize: true`.
- `check:migrations` compares with the newest `codebot-v*` tag in the local repository. It does not fetch the tag. Migrations are frozen once released.
- `apps/mobile` typecheck runs Expo and Uniwind codegen first. The codegen writes ignored files before TypeScript runs.
- The `check` script includes `check:desktop:static`, which includes `lint`, which scans the full repository.

## Unverified points

- `.github/workflows/ci.yml` was not read in full. The job table in `docs/development-checks.md` is the only source for CI jobs here.
- The exact list of `typecheck:*` scripts in `package.json` was read from the file. Their target `tsconfig` files were not checked one by one.
- `scripts/dev-verify.ts`, `scripts/dev-mobile.ts` and `scripts/dev-extension.ts` were not read. Their behavior comes from the README table and the script names. `scripts/dev-stack.ts` was read for its commands and flags only.
- The rule-by-rule meaning of each anti-slop `.grit` file was not read. Their names come from `biome.json`.
- The grit `// scope:` header convention was not checked against a current rule file.
- `scripts/check-release-notes.ts` and `scripts/staged-typecheck.ts` internals were not read in full. Their flags come from the hook and from the `--dry-run` handling in `staged-typecheck.ts`.
- `scripts/check-doc-links.ts` and `scripts/check-image-assets.ts` were not read. `scripts/check-frozen-migrations.ts` was read for its tag lookup only. Their behavior comes from `docs/development-checks.md`.
- The `--write` flag on `check:agent-context` is read by `scripts/debt-ratchet.ts` (line 18), which the script calls. Confirmed.
- The `test:*` E2E scripts (306 `test:*` entries in `package.json`; 462 `scripts/*-e2e.ts` files and 26 `apps/auth-api/scripts/*-e2e.ts` files) were counted, not run. Their behavior was not checked.
- The root `*.tsbuildinfo` files are listed as ignored by `.gitignore` line 2 (`*.tsbuildinfo`).
- The `.github/workflows/release.yml` use of `electron-builder.windows-signing.yml` was confirmed by grep (line 661). Its signing steps were not read.
- The `tools/vitest/hermetic-environment.ts` helper was confirmed as imported by the two hermetic setup files. Its credential patterns and `HOME` handling were read. The rest was not.
- The default dev ports (5173, 5174, 9333, 9334) were confirmed in `scripts/dev-services.ts` (lines 86 to 96). The registry allocation rules come from the README and were not read in `scripts/dev-automation/port-allocation.ts`.
- Whether `dev`, `dev:all` and `dev:test-client` differ in any other way than the service list was not checked.
