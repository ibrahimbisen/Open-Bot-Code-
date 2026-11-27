# Testing and scripts (scripts/)

## What this area is

- `scripts/` holds the repo's E2E tests, smoke checks, benches, fakes, release tools and dev tools. About 700 entries. About 462 files are named `*-e2e.ts`.
- Tests are E2E only. Vitest is allowed only for migrations, the renderer-to-main trust boundary, secret redaction and lint or UI rule fixtures (AGENTS.md "Tests").
- An E2E script drives the real app, process or service. It ends by writing `.codebot-build/<name>/report.json`. 326 of the 462 `*-e2e.ts` files call `process.exitCode` or `process.exit`. The copy base `acp-instructions-once-e2e.ts` does not.
- `scripts/dev-automation/` drives a live dev app over Chrome DevTools Protocol (CDP). `scripts/provider-fakes/` holds fake provider CLIs that speak ACP over stdio.
- Windows support needs `.cmd` wrappers for stand-in CLIs. Only some scripts handle Windows.

## Key files

| Path | What it owns |
|---|---|
| `AGENTS.md` (section `## Tests`, line 362) | Rules: E2E only, report under `.codebot-build/`, wait for state, no `data-testid`, no markup or snapshot asserts. |
| `AGENTS.md` (section `### Local processes`, line 306) | Rules for dev apps: never kill by pattern, never drive another worktree, use `dev:automation`. |
| `docs/codebot/agent-brief.md` (section `## 5. Tests`, line ~88) | Fork-specific E2E rules: `test:<name>` entry, Windows `.cmd` stand-ins. |
| `docs/development-checks.md` (section `## Focused tests`, line 241) | How `test:changed` and `test:related` pick files. |
| `package.json` (lines ~157-161, ~224-600) | `dev:automation`, `dev:cpu`, `dev:memory`, `dev:bench`, and about 300 `test:*` keys. |
| `scripts/acp-instructions-once-e2e.ts` | Model E2E for fake-agent tests. Uses `installFakeAgent`, `runTurn`, `readJsonl`, a `CustomAgentStore` and a report in `finally`. Use it as the copy base for fake-provider tests. |
| `scripts/claude-windows-cmd-e2e.ts` | Model Windows E2E. Win32 only. Two `.cmd` wrapper variants. Uses `tasklist` and `taskkill`. |
| `scripts/channel-e2e-support.ts` | Shared helpers for E2E scripts that drive the running dev app: `connectChannelE2e`, `writeReport`, `waitFor`, `ChannelClient`. |
| `scripts/chat-visual-e2e.ts` | Model dev-app E2E with screenshots (`shot()` writes `.codebot-build/chat-visual-e2e/<label>.png`). |
| `scripts/electron-spawn-env.ts` | `withoutElectronRuntimeFlags(env)`. Removes `ELECTRON_RUN_AS_NODE` and `ELECTRON_EXTRA_LAUNCH_ARGS` before spawning an Electron child. Imported by 25 `scripts/*.ts` files (grep count), for example `browser-dialogs-e2e.ts`. |
| `scripts/script-arguments.ts` | `readScriptArguments({ usage, options, maxPositionals })`. Wraps `node:util` `parseArgs`. Unknown flags call `process.exit(2)`. `--help` / `-h` prints usage. |
| `scripts/provider-fakes/host.ts` | Shared host helpers for fake-agent tests: `installFakeAgent`, `startThread`, `runTurn`, `stopClients`, `readJsonl`, `xorCipher`. |
| `scripts/provider-fakes/acp-agent.ts` | Fake ACP server over newline-delimited JSON-RPC on stdio: `serveFakeAcpAgent`, `logEntry`, `AcpPeer`. |
| `scripts/provider-fakes/agents/*.ts` | 46 fake agent files. 39 of them call `serveFakeAcpAgent` with a handler map. Read a file, then copy it. |
| `scripts/provider-fakes/transcript-proxy.ts` | Stdio tee. Records client and agent JSON lines to `TRANSCRIPT_OUT`, redacted. |
| `scripts/provider-fakes/transcript-redaction.ts` | `createTranscriptRedactor`, `assertRedacted`, `REDACTED = "[redacted]"`, field allow-lists. |
| `scripts/provider-fakes/transcript-redaction.test.ts` | Vitest test for redaction (allowed: secret redaction). |
| `scripts/provider-fakes/transcripts/opencode-1.19.3.jsonl` | One recorded, redacted transcript sample. |
| `scripts/record-provider-transcript.ts` | Caller of `transcript-proxy.ts` (writes a shell export block with `TRANSCRIPT_OUT`). |
| `scripts/dev-automation/cli.ts` | The `dev:automation` CLI. Commands: `instances`, `pages`, `snapshot`, `click`, `type`, `screenshot`, `record`, `cpu`, `memory`. |
| `scripts/dev-automation/cdp-client.ts` | Connects to the dev app over CDP. `resolveAutomationPort`, `assertMutationAllowed`, `openDevBrowser`, `connectToDevApp`, `findRendererPages`, `matchPages`, `verifyBrowserOwnership`, `ForeignBrowserError`. |
| `scripts/dev-automation/tools.ts` | Page helpers: `parseAutomationRole`, `parseWaitTarget`, `waitForRole`, `snapshotPage`, `redactSensitiveSnapshotValues`, `clickByRole`, `typeByRole`, `resolveWritablePath`, `resolveScreenshotPath`, `reportableScreenshotPath`, `screenshotTo`. |
| `scripts/dev-automation/instance-registry.ts` | Reads and writes dev instance records (`DevInstanceRecord`), `selectDevInstance`, `describeDevInstance`. |
| `scripts/dev-automation/stack-registry.ts` | Records for the whole dev stack (`DevStackRecord`, services `api`, `remote`, `app`, `test-client`, `storybook`). Stored under `stacks/`. |
| `scripts/dev-automation/registry-files.ts` | Owner-only registry directories, `writeRegistryFile`, `isProcessAlive`, `readProcessStartedAt`, `verifyRecordedProcess` (states `live`, `gone`, `unverified`). |
| `scripts/dev-automation/port-allocation.ts` | `withDevPortAllocation`. Lock files named `port-allocation.*.lock`. Wait 10 s, stale after 30 s. |
| `scripts/dev-automation/page-url.ts` | `describeTarget` (hides paths, keeps `/`, `/index.html`, `/helper.html`), `isMainAppUrl`, `findMainPages`. |
| `scripts/dev-automation/cpu-profile.ts`, `cpu-sampling.ts` | CPU sampling of the app process tree. `profileCpu`, `compareProfiles`, `summarize`, `classifyChromiumProcess`, `parseCpuReport`. |
| `scripts/dev-automation/memory-profile.ts` (plus `summarizeMemory` and `classifyMemoryProcess` in `cpu-sampling.ts`) | Memory by process kind. `profileMemory`, `writeHeapSnapshot`. |
| `scripts/dev-automation/inspector-client.ts`, `render-metrics.ts`, `resource-sampler.ts` | Main-process inspector, render metrics and resource sampling used by benches. |
| `scripts/dev-automation/bench.ts`, `bench-scenarios.ts` (1277 lines), `bench-stats.ts`, `bench-launch.ts`, `bench-probes.ts`, `bench-hotspots.ts`, `bench-budget.ts`, `bench-auth.ts` | `dev:bench` (run with `tsx`). Scenarios, stats and comparison reports under `.codebot-build/dev-automation/bench`. No workflow file runs them (grep). |
| `scripts/dev-automation/bench-fake-codex.ts` | Fake Codex stream generator for benches. |
| `scripts/codebot/check-branding.ts` | `check:branding`. Scans tracked files (`git ls-files`) for the upstream name and server hosts. Exit 1 on findings unless `--report`. |
| `scripts/codebot/branding-allowlist.json` | Allowed paths, directories and lines for branding check. |
| `scripts/codebot/rename-upstream.ts` | Mechanical rename of upstream names in a checkout, used during the upstream sync (see `docs/codebot/upstream-sync.md`). |
| `scripts/codebot/generate-brand-icons.ts` | Generates brand icon files from `@codebot/brand` shapes. |
| `scripts/provider-live/` | Live provider tests (real accounts). Entry `scripts/provider-live-e2e.ts` runs the `e2e` framework on `scripts/provider-live/e2e.config.ts` (`test:provider-live`). Files: `live-agent.ts`, `own-tools-first.e2e.ts`, `provider-answers.e2e.ts`, `start-app.ts`, `targets.ts`. Not fakes. |
| `.github/workflows/ci.yml` | CI. Runs 188 `bun run test:*` lines (188 distinct) on `ubuntu-latest`. |
| `.github/workflows/windows-process-launcher-e2e.yml` | Windows CI. Runs `bun scripts/process-launcher-e2e.ts`. |

## How it works

### E2E script shape

- Filename: `scripts/<name>-e2e.ts`. Smoke checks use `-smoke.ts`. Benches use `-bench.ts`.
- Run with `bun`. Top-level `await` is used. No test runner.
- Imports: `node:assert/strict`, `node:fs/promises`, `node:os` (`tmpdir`), `node:path`. Source code comes from `../src/backend/...`, `../src/main/...` and `@codebot/*` packages.
- Output path constant: `const OUT = resolve(import.meta.dirname, "../.codebot-build/<name>-e2e");`
- Temp root: `mkdtemp(join(tmpdir(), "codebot-<name>-e2e-"))`. Removed in `finally`.
- Report object: `{ passed: boolean, ... }`. Set `passed = true` only at the end of `try`.
- `finally` stops clients, removes the temp root, writes `OUT/report.json`, and prints the report to stdout.
- Failures use `assert.ok` / `assert.equal` with a message that starts with the mode or case name (for example `"context: the first prompt has the instructions."`).

### report.json

- Path: `.codebot-build/<name>/report.json`. Written with `JSON.stringify(report, null, 2) + "\n"`.
- Required key in practice: `passed` (boolean). 357 of the `scripts/*-e2e.ts` files contain `passed: boolean`. Other keys are per script (`variants`, `agents`, `screenshots`, `pageErrors`, `failure`).
- `docs/codebot/agent-brief.md` says the shape is `{ "passed", "checks": [...] }`. About 88 `*-e2e.ts` files contain a `checks` field. Follow the scripts (see Gotchas).
- `writeReport(name, report)` in `scripts/channel-e2e-support.ts` writes the same file for dev-app scripts.
- Screenshots are saved under the same `.codebot-build/<name>/` folder. The report lists their paths.

### Waiting

- Waits poll for state. Pattern: `waitFor(page, label, read, ready, timeoutMs)` in `scripts/channel-e2e-support.ts` polls every 250 ms until `ready(value)` is true. Default timeout `WAIT_MS = 180_000`.
- Pattern for files: `scripts/claude-windows-cmd-e2e.ts` has `waitFor(what, read, timeoutMs)` that polls every 50 ms.
- Pattern for processes: check `process.kill(pid, 0)` in a loop until it throws.
- Pattern for fake-agent turns: `runTurn` resolves on the `turn/completed` notification, or rejects on exit, or after `TURN_TIMEOUT_MS = 300_000` (`scripts/provider-fakes/host.ts`).
- Pattern for the dev app: `waitForRole(page, { role, name }, timeoutMs)` (Playwright `waitFor` visible). CLI flag: `--wait-for=<role>,<name>`.

### Fake providers and mock servers

- A fake provider is a real Node program (`.ts`) run by `bun`. The app spawns it as a CLI.
- `installFakeAgent(executable, agent, env)` writes a POSIX wrapper script (`#!/bin/sh`, `export NAME=...`, then `exec "<bun>" "<absolute path>/agents/<agent>.ts" "$@"`). Mode 0755.
- ACP transport (`serveFakeAcpAgent`): reads newline-delimited JSON from stdin. For each request, it calls `handlers[method](request, peer)`. If no handler exists, it replies `{}`.
- `AcpPeer` methods: `reply(request, result)`, `fail(request, error)`, `say(sessionId, text)`, `update(sessionId, update)`, `ask(method, params)` (server-to-client request and await).
- Notifications (no `id`) go to `options.onNotification`. Requests go to `options.onRequest`.
- The process stays alive with `setInterval(() => {}, 1000)`.
- `logEntry({...})` appends one JSON line to the file named by env `FAKE_LOG`. The E2E reads it back with `readJsonl`.
- Fake behavior is set by env vars (examples from `agents/stall.ts`): `FAKE_TOOL_MS`, `FAKE_CHUNK_GAP_MS`, `FAKE_QUIET_MS`, `FAKE_RETRY_MS`, `FAKE_RATE_RETRY_MS`, `FAKE_NO_LOAD`, `FAKE_SILENT_NEW`, `FAKE_RESUME`.
- Prompt text drives behavior. In `stall.ts`, the prompt `hang` never answers, and `hang-once` hangs until a resume.
- `instructions.ts` reads env `FAKE_MODE`. Only the `context` value has its own branch in the file. `acp-instructions-once-e2e.ts` sets `silent` for the silent agent and `context` for the context and memory agents.
- Client helpers (`host.ts`): `startThread(client, params)` sends `thread/start` and returns the thread id. `runTurn(client, thread, { text, model, effort, images, timeoutMs })` sends `turn/start`, collects `item/completed` text, `error` messages and `turn/completed` status.
- `stopClients(clients)` stops each client and ignores errors.
- `xorCipher` is a test-only `CustomProviderCipher` (XOR 0x5a). Do not use it for real data.
- Mock servers: `scripts/claude-mcp-cache-bench-server.ts`, `scripts/near-wallet-fake-api.ts` and `scripts/team-webrtc-live-smoke-app/` are other stand-ins. Read their headers before reuse (not reviewed in depth).

### Transcript recording and redaction

- Use: `TRANSCRIPT_OUT=<file> bun scripts/provider-fakes/transcript-proxy.ts <executable> [args...]`.
- It spawns the real CLI and tees stdin and stdout. Each JSON line is redacted and appended to `TRANSCRIPT_OUT`.
- `TRANSCRIPT_KNOWN` (JSON array of strings) adds values to redact.
- Known values include the home dir, username, hostname and every env value whose name is secret-like (`isSecretName` from `@codebot/logging`).
- If a redacted line still has a known value, the proxy writes `<out>.failed`, kills the child and exits 1.
- `transcript-redaction.ts`: keeps only fields in `KEPT_FIELDS` and `ID_FIELDS`. IDs become pseudonyms. Values in `configOptions` and `choices` scopes are kept by name rules.

### dev:automation (drives a live dev app)

- Scripts: `dev:automation` = `bun scripts/dev-automation/cli.ts`. Also `dev:cpu` and `dev:memory`. `dev:bench` and `dev:bench:hotspots` use `tsx`.
- Usage line (from `cli.ts`): `bun scripts/dev-automation/cli.ts <instances|pages|snapshot|click|type|screenshot|record|cpu|memory> [flags]`.
- Prerequisite: a dev app runs in this worktree (`bun run dev`). The CLI does not start the app.
- Target selection order:
  1. `--instance=<id>`, or `--port=<port>` (not both).
  2. `CODEBOT_DEV_REMOTE_DEBUGGING_PORT` env (default port `9333`, range 1024 to 65535; constant `DEFAULT_DEV_AUTOMATION_PORT`).
  3. Registry match by worktree (`selectDevInstance`, match kinds `instance-id`, `worktree`, `foreign`).
- A `--port` that belongs to another worktree logs a warning. Mutations then change that instance's profile.
- Connection (`connectToDevApp`):
  1. `openDevBrowser` reads `http://127.0.0.1:<port>/json/version` and `/json/list`, then calls `chromium.connectOverCDP` (playwright-core).
  2. If the port is not Electron or has no renderer, it checks owner PID with `SystemInfo.getProcessInfo` (`verifyBrowserOwnership`). Foreign ports throw `ForeignBrowserError`.
  3. Page choice: `findRendererPages` keeps pages where `window.codebot` is an object, optionally filtered by expected renderer port. With `--page=<target-id|url-substring>`, `matchPages` is used.
  4. More than one match throws with the list of target ids.
- Read-only commands: `instances`, `pages`, `snapshot`, `screenshot`, `record`, `cpu`, `memory`.
- Mutating commands: `click`, `type`. They call `assertMutationAllowed`: needs `--allow-mutations` and a named instance (`--instance` or `--port`). Otherwise the CLI throws.
- Flags (from `cli.ts`): `--role`, `--name`, `--text`, `--submit`, `--exact`, `--wait-for=<role>,<name>`, `--timeout` (default 10000, max 120000), `--out`, `--page`, `--service` (`app` or `test-client`), `--duration`, `--interval`, `--label`, `--compare`, `--heap-snapshot`.
- `snapshot`: `page.ariaSnapshot({ depth: 30 })`, then redaction (`redactSensitiveSnapshotValues`, which hides controls named with password, token, OTP, API key and similar), then `redactText`. Output capped at 20000 characters.
- `screenshot`: default file `.codebot-build/dev-automation/screenshot-<ms>.png`. `--out` must end in `.png` and stay inside that folder. Symlinks on the path are refused.
- `record`: `page.screencast` to `.webm`. Default 60000 ms, max 90000 ms. Stops early on SIGINT or SIGTERM.
- `cpu`: default 60000 ms duration (max 600000), interval 5000 ms (min 1000). Output in `.codebot-build/dev-automation/cpu/`. `--compare` adds a delta.
- `memory`: output in `.codebot-build/dev-automation/memory/`. `--heap-snapshot=<target-id|url-substring>` writes `heap-<ms>.heapsnapshot` into the same `memory/` folder, and the report gets its path.
- `click` and `type` take `--role` (values from `AUTOMATION_ROLES` in `tools.ts`), then `--name`. `click` on a `switch` role presses Space. `type` fills then optionally presses Enter.
- Output is JSON on stdout. Logs go to stderr through `createCodeBotLogger("dev-automation", ...)`.

### Registry and process safety (dev-automation)

- Instance records: `<service>-<pid>.json` in the registry directory. Stack records under `stacks/`.
- Registry directory (`devRuntimeDirectory` in `src/main/development-runtime-directory.ts`):
  - Windows: `%LOCALAPPDATA%\CodeBot\codebot-dev-instances`.
  - macOS: `~/Library/Caches/CodeBot/dev`.
  - Linux: `$XDG_RUNTIME_DIR/codebot-dev` or `~/.cache/codebot/dev`.
  - Override: env `CODEBOT_DEV_REGISTRY_DIR` (must be absolute).
- Directory ownership is checked (`assertRegistryDirectoryOwnership`). Files are written as owner-only.
- A record is live only if `isLiveRecordedProcess` says so. `startedAt` is compared with the process start time.
- Ports held by live stacks are reserved (`heldDevStackPorts`). Dead records do not reserve ports.

### test:<name> entries and CI

- Each E2E script that is run by a named command has a key in `package.json`: `"test:<name>": "bun scripts/<name>-e2e.ts"`. Some keys chain two scripts with `&&`.
- About 306 `"test:` lines exist in `package.json`. Some are not E2E (for example `test:desktop`, `test:changed`, `test:related`, `test:durations`, `test:api`).
- `.github/workflows/ci.yml` has 188 lines that run `bun run test:*`. All jobs in that file use `runs-on: ubuntu-latest`. Across all workflow files, 191 distinct `bun run test:*` commands appear.
- Adding a `test:<name>` key does not register it with CI. Add a step to `ci.yml` too, if CI must run it. Example step: `- name: Run the ACP instructions once E2E test` then `run: bun run test:acp-instructions-once`.
- Some E2E scripts have no `test:*` key (for example `scripts/chat-visual-e2e.ts`, `scripts/channel-chat-e2e.ts`). They are run by hand (unverified how).
- `scripts/speech-voice-select-e2e.ts` is an example of a `test:*` key that passes `--allow-mutations`.

### Dev-app E2E (drives the running app through CDP)

- Helper: `connectChannelE2e(command)` in `scripts/channel-e2e-support.ts`.
  - Finds exactly one dev instance with `service === "app"` and `projectRoot` equal to the current working directory. Otherwise it asserts `Start one dev app for this worktree first.`
  - Calls `assertMutationAllowed` with `allowMutations = process.argv.includes("--allow-mutations")`. So the helper always needs `--allow-mutations`, even for read-only checks.
  - Calls `connectToDevApp` with `expectedRendererPort` and `ownerPid` from the instance record.
- Returns `{ page, instance, close }`.
- Test UI by accessible role and name. Use translated names from `translateFor("en")` (from `@codebot/i18n`) when the UI has translated labels, as `chat-visual-e2e.ts` does.
- Read or call the app API through `page.evaluate(() => window.codebot.agent.<method>(...))` (types from `@codebot/contracts/ipc`).
- Screenshots: `await target.screenshot({ path })` on a locator, then push the path to `report.screenshots`.
- `page.on("pageerror", ...)` collects renderer errors into `report.pageErrors`.

### Windows

- Scripts with an explicit `process.platform === "win32"` or `!== "win32"` check: 8 files (grep, verified). They are `agent-api-keys-e2e.ts`, `agent-database-host-start-e2e.ts`, `antigravity-usage-e2e.ts`, `claude-windows-cmd-e2e.ts`, `exit-watchdog-e2e.ts`, `pi-long-instructions-e2e.ts`, `release-upgrade-e2e.ts`, `windows-home-install-update-e2e.ts`. About 44 `*-e2e.ts` files mention `process.platform` at all (verified count; the check style varies).
- `scripts/provider-fakes/host.ts` `installFakeAgent` writes only a POSIX `#!/bin/sh` wrapper. It has no Windows branch. Scripts that use it (75 files import `host.ts`) do not handle Windows wrappers, unless they write their own `.cmd` (see `pi-long-instructions-e2e.ts`).
- `claude-windows-cmd-e2e.ts` is the model for a Windows stand-in:
  - Exits 1 if not Windows: `Windows only.`
  - Two variants in `VARIANTS`:
    - `npm`: writes `node_modules/@anthropic-ai/claude-code/cli.js` and a `claude.cmd` copied from npm's wrapper text, with `SET _prog=${process.execPath}`. Not through `cmd.exe` from the app.
    - `other-wrapper`: writes `stand-in.cjs` and `claude.cmd` containing `@"<node>" "%~dp0stand-in.cjs" %*` with CRLF line endings.
  - Puts the bin folder under a directory with a space (`Jane Doe`) to test quoting.
  - Checks that the parent of the stand-in is `cmd.exe` only for the `other-wrapper` variant.
  - Checks that `--setting-sources=user,project,local` arrives as one argument.
  - Reads the stand-in's own `pid`, `ppid` and `argv` from a JSON file it writes.
  - Checks the process is gone after `client.stop()` (15 s wait).
  - Uses `tasklist /fo csv /nh /fi "PID eq <pid>"` to get the image name and `taskkill /pid <pid> /T /F` in `finally`.
- Windows process helpers in code: `scripts/dev-automation/cdp-client.ts` reads the process table with `powershell.exe -Command Get-CimInstance Win32_Process`. `registry-files.ts` has `readWindowsProcessStartedAt` and `hasWindowsChildProcess`.
- Windows CI workflows: `.github/workflows/windows-process-launcher-e2e.yml` (runs `bun scripts/process-launcher-e2e.ts`) and `.github/workflows/windows-installer-e2e.yml` (contents not read in depth). `test:claude:windows-cmd` is not referenced by any workflow (verified by grep). `ci.yml` runs `test:antigravity-windows-zip` on `ubuntu-latest`.
- Local run on Windows: `bun run test:claude:windows-cmd`.

## How to change it

### Recipe 1: Add a fake-provider E2E (copy base)

1. Copy `scripts/acp-instructions-once-e2e.ts` to `scripts/<name>-e2e.ts`. Keep the imports from `./provider-fakes/host` and `../src/backend/...`.
2. Write a fake program at `scripts/provider-fakes/agents/<name>.ts`. Start from `agents/stall.ts` or `agents/instructions.ts`. Call `serveFakeAcpAgent({ "initialize": ..., "session/new": ..., "session/prompt": ... }, { onRequest?, onNotification? })`.
3. In the E2E, call `installFakeAgent(executable, "<name>", { FAKE_LOG: join(root, "agent.jsonl") })`.
4. Register the agent with `CustomAgentStore` (as in the copy base), or start a provider client with `requireProviderDriver("acp").createClient(...)`.
5. Use `startThread` and `runTurn`. Read logs with `readJsonl<T>(join(root, "agent.jsonl"))`.
6. Assert behavior, not text layout. Build `report`. Write it in `finally`.
7. Add `"test:<name>": "bun scripts/<name>-e2e.ts"` to `package.json` (near related `test:*` keys).
8. If CI must run it, add a named step to `.github/workflows/ci.yml` next to a similar step.

### Recipe 2: Skeleton for a new E2E script (copyable)

Based on the structure of `scripts/acp-instructions-once-e2e.ts`. Not run. Only verified against the file text.

```ts
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { AgentClient } from "../src/backend/agent-client";
import { runCauseEffect } from "../src/backend/effect-boundary";
import { requireProviderDriver } from "../src/backend/provider-drivers";
import { CustomAgentStore } from "../src/main/custom-agent-store";
import { installFakeAgent, readJsonl, runTurn, startThread, stopClients, xorCipher } from "./provider-fakes/host";

const OUT = resolve(import.meta.dirname, "../.codebot-build/my-feature-e2e");

interface Step {
  text: string;
  status: string | null;
}

interface Prompt {
  text: string;
}

interface Report {
  passed: boolean;
  steps: Step[];
  prompts: Prompt[];
  failure?: string;
}

const root = await mkdtemp(join(tmpdir(), "codebot-my-feature-e2e-"));
const report: Report = { passed: false, steps: [], prompts: [] };
const clients: AgentClient[] = [];

try {
  const executable = join(root, "bin", "fake-my-agent");
  const workspace = join(root, "workspace");
  await mkdir(workspace, { recursive: true });
  await installFakeAgent(executable, "my-agent", { FAKE_LOG: join(root, "agent.jsonl") });

  const store = new CustomAgentStore({ path: join(root, "custom-agents.json"), cipher: xorCipher });
  await runCauseEffect(store.load());
  await runCauseEffect(
    store.save({
      id: "my-agent",
      name: "my-agent",
      command: executable,
      args: [],
      env: [],
      usagePrompt: null,
    }),
  );

  const driver = requireProviderDriver("acp");
  const context = {
    apiKey: () => null,
    customProviders: () => [],
    mcpServers: () => [],
    customAgents: () => store.configs(),
  };
  const cli = await runCauseEffect(driver.resolveCli());
  const client = driver.createClient(cli, 20_000, context, undefined);
  clients.push(client);
  client.start();

  const model = "my-agent/default";
  const thread = await startThread(client, { model, cwd: workspace, runtimeWorkspaceRoots: [workspace] });
  for (const text of ["one", "two"]) {
    const result = await runTurn(client, thread, { model, text });
    report.steps.push({ text, status: result.status });
  }

  const prompts = await readJsonl<Prompt>(join(root, "agent.jsonl"));
  report.prompts = prompts;
  assert.deepEqual(
    prompts.map((prompt) => prompt.text),
    report.steps.map((step) => step.text),
    "my-feature: the agent gets one prompt for each turn.",
  );
  report.passed = true;
} catch (error) {
  report.failure = error instanceof Error ? error.message : String(error);
} finally {
  await stopClients(clients);
  await rm(root, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  await writeFile(join(OUT, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = report.passed ? 0 : 1;
}
```

Notes on the skeleton:
- The `catch` records `failure` and does not rethrow, so the report file is always written. The copy base rethrows through `finally` only.
- `runTurn` and `readJsonl` match the signatures in `provider-fakes/host.ts`.
- The `CustomAgentStore` constructor takes `{ path, cipher, resolve? }` (checked in `src/main/custom-agent-store.ts`). The `save` input follows the copy base; its type was not re-read.

### Recipe 3: Skeleton for a dev-app E2E (copyable)

Based on `scripts/channel-e2e-support.ts` and `scripts/chat-visual-e2e.ts`. Not run.

```ts
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { connectChannelE2e, writeReport, waitFor, WAIT_MS } from "./channel-e2e-support";

interface Report {
  passed: boolean;
  checks: Record<string, unknown>;
  screenshots: string[];
  pageErrors: string[];
}

const OUT_NAME = "my-ui-e2e";
const report: Report = { passed: false, checks: {}, screenshots: [], pageErrors: [] };
const session = await connectChannelE2e(OUT_NAME); // requires --allow-mutations
const page = session.page;
page.on("pageerror", (error) => report.pageErrors.push(error.stack ?? error.message));

try {
  // Wait for state, not time. Use roles and accessible names.
  const button = page.getByRole("button", { name: "New thread" }).first();
  await waitFor(page, "the button is visible", () => button.isVisible(), (visible) => visible, WAIT_MS);
  await button.click();
  const shot = resolve(import.meta.dirname, `../.codebot-build/${OUT_NAME}/after-click.png`);
  await page.screenshot({ path: shot });
  report.screenshots.push(shot);
  report.checks.clicked = true;
  assert.equal(report.checks.clicked, true, "my-ui: the click works.");
  report.passed = true;
} finally {
  await session.close();
  writeReport(OUT_NAME, report);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}
```

Run it with the app already running in this worktree:
`bun scripts/my-ui-e2e.ts --allow-mutations`.

Notes:
- `checks` is a free-form record in this skeleton. Real scripts use typed fields.
- `writeReport` writes to `.codebot-build/<name>/report.json`.
- Do not use `data-testid`. Do not assert CSS classes.

### Recipe 4: Drive the dev app by hand (dev:automation)

1. Start the app in this worktree: `bun run dev`. Wait until it is ready.
2. List instances: `bun run dev:automation instances`.
3. List pages: `bun run dev:automation pages`.
4. Read the UI: `bun run dev:automation snapshot --instance=<id>` (or `--port=<port>`). Read-only.
5. Take a screenshot: `bun run dev:automation screenshot --out=my-check.png`. Saved as `.codebot-build/dev-automation/my-check.png`.
6. Change the UI (needs both flags): `bun run dev:automation click --role=button --name="New thread" --instance=<id> --allow-mutations --wait-for=textbox,"Message" --timeout=10000`.
7. Record a short video: `bun run dev:automation record --out=check.webm --duration=20000`.
8. CPU sample: `bun run dev:automation cpu --duration=30000 --label=before --out=before.json`. Then `--compare=<path to before.json>` after the change.

### Recipe 5: Add a Windows `.cmd` stand-in for a provider CLI

1. Write the stand-in program as a `.cjs` file or as source text (see `claude-windows-cmd-e2e.ts`, `standIn` string).
2. Write the wrapper with CRLF line endings:
   - `@"${process.execPath}" "%~dp0stand-in.cjs" %*\r\n` (simple form).
   - Or copy the wrapper text for the real CLI from `pi-long-instructions-e2e.ts` (`@echo off`, `set "NAME=value"`, `"<bun>" "<fake>" %*`).
3. Put the wrapper in a folder that has a space in its name, to test quoting.
4. Pass the wrapper path as `executable` to `ClaudeAgentClient` (or the driver's `resolveCli`), with `source: "system"`.
5. Check the argv the stand-in recorded. Check that the stand-in process is gone after `stop()`.
6. Guard the script with `if (process.platform !== "win32") { ... }` only if the script is Windows-only. Otherwise write the POSIX branch too (see `pi-long-instructions-e2e.ts`).

### Recipe 6: Add a new dev:automation command

1. Add the command name to the `command` check list in `main()` in `scripts/dev-automation/cli.ts`.
2. Add any new flags to `OPTIONS` (keep alphabetical order, as the file does). Use `flagValue`, `requireFlagValue`, or `readMilliseconds` for parsing.
3. Add the command to `USAGE`.
4. For a mutating command, call `assertMutationAllowed({ command, allowMutations, instanceNamed, target })` before it runs.
5. For file output, use `resolveWritablePath(root, requested, extension, subject)`. Keep files under `.codebot-build/dev-automation/...`.
6. Keep stdout as JSON. Send logs to the `logger`.

### Recipe 7: Add a transcript-redaction rule

1. Change `KEPT_FIELDS`, `ID_FIELDS`, `CHOICE_FIELDS` or `WORD_ID` in `scripts/provider-fakes/transcript-redaction.ts`.
2. Add a case to `scripts/provider-fakes/transcript-redaction.test.ts`. This vitest file is allowed (redaction).
3. Run only that test file: `bun run test:desktop -- scripts/provider-fakes/transcript-redaction.test.ts`. The `node` project in `vitest.config.ts` includes `scripts/**/*.test.ts`.

### Recipe 8: Record a provider transcript for a replay

1. Run `scripts/record-provider-transcript.ts` with `--provider`, `--model`, `--executable` and an optional `--known`. The rest of its behavior was not reviewed in depth.
2. It writes a shell export block with `TRANSCRIPT_OUT` and calls `provider-fakes/transcript-proxy.ts`.
3. Check `<out>.failed` after the run. If present, a value of this computer leaked and was not removed.

## Gotchas

1. `report.json` shape. `docs/codebot/agent-brief.md` says `checks`. Scripts use `passed` plus their own fields. Use `passed`.
2. Dev-app scripts need one running dev app for this worktree. `connectChannelE2e` asserts exactly one match. Start `bun run dev` first.
3. `connectChannelE2e` always needs `--allow-mutations`, because it calls `assertMutationAllowed` with the flag. Read-only checks need it too.
4. The `dev:automation` CLI calls `assertMutationAllowed` only for `click` and `type` (`scripts/dev-automation/cli.ts`, around line 395). `snapshot`, `screenshot`, `pages`, `record`, `cpu` and `memory` do not call it. The dev-app helper `connectChannelE2e` calls it for every script, so those scripts need `--allow-mutations` even when they only read.
5. A mutating `dev:automation` call needs `--instance=<id>` or `--port=<port>`. A port inferred from the worktree is refused.
6. Never kill by pattern (`pkill -f`). AGENTS.md says to use `bun run dev:stop` or a PID the script started. `cli.ts` and the `dev:automation` helpers do not kill processes. The bench scripts (`bench-launch.ts`, `bench-auth.ts`) kill only child process groups they started. `claude-windows-cmd-e2e.ts` kills only its own stand-in PID with `taskkill /T /F`.
7. `--out` paths for dev-automation must stay inside `.codebot-build/dev-automation/` (or `cpu/`, `memory/`), and must end with the right extension. Symlinks on the path are refused.
8. A screenshot or record path that contains a credential-like or address-like text throws in `reportableScreenshotPath`. Choose another name.
9. `snapshot` redacts controls whose names match password, token, OTP, passcode, secret, credential or API key. Output is capped at 20000 characters.
10. `installFakeAgent` writes a POSIX `#!/bin/sh` wrapper. On Windows it does not run as a plain executable. Scripts that run on Windows need their own `.cmd` wrapper.
11. A stand-in or fake process must read its stdin and keep running. The fake ACP agent uses `setInterval(() => {}, 1000)`. Without it, the process exits and the client sees `The agent exited before the turn completed`.
12. ACP messages are newline-delimited JSON. A fake that writes a partial line breaks the client.
13. `xorCipher` in `host.ts` is test-only. It is not a real cipher.
14. Use `runTurn`'s `timeoutMs` for slow fakes. The default is 300 s.
15. `waitFor` in `channel-e2e-support.ts` polls every 250 ms and has a 180 s default. Use it instead of `sleep`. AGENTS.md says to wait for state, not time.
16. Use roles and accessible names. Do not add `data-testid`. `check:ui` allows none (AGENTS.md "Tests").
17. Use translated names from `translateFor("en")` when the UI text is translated (see `chat-visual-e2e.ts`).
18. Some E2E scripts have no `test:*` key. Some `test:*` keys are not in CI. Check both before you claim a script is covered.
19. `scripts/codebot/check-branding.ts` exits 1 on findings unless `--report` is given. Its allow-list is `branding-allowlist.json`. Do not edit the allow-list to hide a finding without a reason.
20. `scripts/codebot/rename-upstream.ts` changes many files. It belongs to the upstream sync. Do not run it for normal work (see `docs/codebot/upstream-sync.md`).
21. `scripts/provider-live/` uses real provider accounts. It is not a fake test. Do not run it for routine checks.
22. AGENTS.md "Checks" says run only narrow checks, one at a time. Run one `test:<name>` at a time.
23. `process.platform !== "win32"` guards exit early with `Windows only.` (`claude-windows-cmd-e2e.ts`). A Windows-only script run on macOS or Linux fails. Check the CI workflow before you add one.
24. Scripts use `bun`. Bench scripts (`dev:bench`, `dev:bench:hotspots`) and `dev:seed` (`tsx scripts/seed-dev-state.ts`) use `tsx`. Do not mix them up when you copy a script.
25. Temp folders come from `mkdtemp(join(tmpdir(), ...))`. Remove them in `finally` with `rm(root, { recursive: true, force: true })`.
26. Test paths with spaces. `claude-windows-cmd-e2e.ts` uses a directory named `Jane Doe` to test quoting. The repo path has a space too: `C:\Users\IbrahimBisen\Desktop\Coding Software\CodeBot`.
27. The `Windows` `cmd.exe` parent check depends on how the app starts a `.cmd` file. The `npm` variant is started without `cmd.exe` in the parent chain in the test's own expectation (`throughCmd: false`). This is the test's claim, not a general rule.
28. The `tasklist` call in `imageName` throws if the PID is gone. The test calls it only while the stand-in is still running.
29. `cdp-client.ts` and `registry-files.ts` shell out to `powershell.exe` on Windows. Calls may be slow. They have timeouts (10 s) in `cdp-client.ts`.
30. Two dev instances can exist. `selectDevInstance` returns `ambiguous` when more than one match. Name one with `--instance=<id>`.

## Unverified

- Whether all `test:*` keys in `package.json` are wired to CI. Only the names found in `.github/workflows/*.yml` were checked by grep.
- How `chat-visual-e2e.ts` and `channel-chat-e2e.ts` are run (no `test:*` key found in `package.json`).
- Whether `installFakeAgent` paths with `$` or quotes break the generated `sh` wrapper.
- Full contents of `scripts/provider-live/` (only the doc `docs/provider-live-e2e.md` was read).
- Exact behavior of `scripts/record-provider-transcript.ts` and `scripts/provider-transcript-replay-e2e.ts` (not read in depth).
- Behavior of the 7 agent files in `scripts/provider-fakes/agents/` that do not call `serveFakeAcpAgent` (only `stall.ts`, `instructions.ts` and the names were read).
- The `save` input type of `CustomAgentStore` used by Recipe 2 (copied from `acp-instructions-once-e2e.ts`, not re-read).
- The `codebot-host*.ts`, `host-manager*.ts` and `dev-services.ts` scripts (not in scope; not read).
