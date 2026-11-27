# Engine reference (text of the upstream README)

This file holds the long text of the upstream README, renamed to CodeBot, for the parts of the engine
that CodeBot keeps: Linux notes, provider setup, local data folders, attachments, architecture, remote
desktop and the mobile commands. It is a reference, not a guide.

Some lines are old. They name GitHub Releases, Cloudflare, email-code sign-in or the upstream
install script. Packages W02b, W04 and W17 remove them. The CodeBot documents win when they differ:
[README](../../README.md), [user guide](user-guide.md), [home server](home-server.md) and
[updates](updates.md). The command table is in the [README](../../README.md#commands).

## Linux notes

The AppImage does not need libfuse2, so it also runs on Arch Linux and Omarchy. It mounts itself
with `fusermount3` from the `fuse3` package.

On Ubuntu 23.10 or newer and on Debian 13, unprivileged user namespaces are restricted by AppArmor
and CodeBot exits during launch until you install an AppArmor profile:

```bash
sudo install -m 0644 build/linux/codebot.apparmor /etc/apparmor.d/codebot
sudo systemctl reload apparmor
```

The same file ships inside the AppImage at `resources/linux/codebot.apparmor`. Edit the attachment
path in the profile if you keep the AppImage outside the usual locations. Do not start CodeBot with
`--no-sandbox`: that removes the boundary between a renderer and the rest of the computer.

On the first start from an AppImage, CodeBot writes `~/.local/share/applications/codebot.desktop`
and `~/.local/share/icons/codebot.png`, which is what lets an `codebot://` link - an invitation, or
a plugin listing - open the app and gives the launcher an icon that stays after the app exits. Delete the two files to undo it.

#### Theme palette files

CodeBot reads each `<name>.json` file in the `themes` folder of its data folder
(`~/.config/CodeBot/themes/` on Linux) and lists it under Settings > Appearance > Theme. Another
program, such as an Omarchy theme script, can write the file. CodeBot follows each change to the
file with no restart. Replace the file with a rename, so that CodeBot never reads half of it:

```json
{
  "name": "Omarchy",
  "appearance": "dark",
  "colors": {
    "canvas": "#1a1b26",
    "frame": "#13141c",
    "sidebar": "#13141c",
    "surface": "#24283b",
    "text": "#a9b1d6",
    "textMuted": "#565f89",
    "border": "#414868",
    "accent": "#7aa2f7",
    "accentForeground": "#1a1b26",
    "success": "#9ece6a",
    "warning": "#e0af68",
    "danger": "#f7768e"
  }
}
```

The file name is the palette id: lowercase letters, digits and `-`. `appearance` is `light` or
`dark`, and selects the base that the colors go over. In a dark palette, `surface` colors cards and
controls. A light palette makes them lighter than `canvas`, as the light base does, because a light
theme's `surface` is usually darker than its background. Each color is `#rrggbb` or `#rrggbbaa`.
CodeBot ignores a file with a missing or different color, and then shows the saved light, dark or
system choice. While no theme choice is saved, CodeBot shows the first palette.

Remote desktop works on Linux x64 in an X11 session,
such as Xorg or Xvfb. It does not work under Wayland, and the arm64 AppImage does not include it.

For Gemini sign-in, install a desktop browser and `xdg-utils`. Open the sign-in page in a
desktop session on the same host or VM. Google sends the callback to that host through
`127.0.0.1`; a server with no desktop cannot complete this sign-in. See
[Gemini setup](../../docs/architecture/providers.md#gemini).

#### Linux server with no screen

To run CodeBot as an always-on server of your account on a VPS or home server (Ubuntu 24.04 or
26.04 with systemd), install it from a terminal and sign in with an email code:

```bash
curl -fsSL https://raw.githubusercontent.com/nightly-labs/openbot/main/scripts/install-server.sh | sudo bash
sudo codebot login
```

Then use it from the desktop app, the iPhone app or `openbot.run/app`. See
[self-hosted servers](../../docs/self-hosted-server.md) for the options and the `codebot` commands.

#### Docker

The same server runs as a container (`linux/amd64` and `linux/arm64`). The seccomp profile lets the
Electron sandbox stay on:

```bash
curl -fsSLO https://raw.githubusercontent.com/nightly-labs/openbot/main/docker/seccomp.json
docker run -d --name codebot --restart unless-stopped \
  --security-opt seccomp=seccomp.json --security-opt no-new-privileges:true \
  --shm-size 1g --stop-timeout 60 -v codebot-data:/data \
  ghcr.io/nightly-labs/openbot:latest
docker exec -it codebot codebot login
```

See [Docker](../../docs/docker.md) for Compose, the data volume, upgrades and the security limits. For Amazon ECS,
see [AWS ECS](../../docs/aws-ecs.md). For an Umbrel home server, see [Umbrel](../../docs/umbrel.md).

### Nix

The flake installs the desktop app from the latest release on x64 or arm64 Linux and on Apple silicon:

```bash
nix run github:nightly-labs/openbot
nix profile install github:nightly-labs/openbot
```

`overlays.default` adds `pkgs.codebot`. CodeBot is not free software, so your nixpkgs must allow it,
for example with `nixpkgs.config.allowUnfreePredicate = pkg: lib.getName pkg == "codebot";`.
Nix installs CodeBot updates. CodeBot does not update itself from the Nix store. On Linux, the Nix
package does not include the remote desktop runtime, because nixpkgs does not have a library that it
needs.

> [!IMPORTANT]
> Windows releases are signed by `SYNTHETIFY LABS SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ`. Older
> releases are not code-signed. SmartScreen can still warn about a new release. Check the release
> checksum or GitHub build attestation before you run the installer.

### Agent setup

CodeBot can download a supported provider runtime when you select `Download` in onboarding,
Settings, agent setup, or the model picker. CodeBot prefers its managed CLI. Explicit `CODEBOT_*_PATH` overrides take precedence; a compatible
system CLI is used when no managed copy is available. CodeBot checks for a newer provider CLI
release at startup and every hour, and `Check for updates` in a provider's actions menu checks at
once. Updates install the latest upstream release without changing the user’s system CLI; the
version in `native-runtime.lock.json` is only the first-install fallback.

You can also install a CLI yourself.

Codex CLI on macOS:

```bash
curl -fsSL https://chatgpt.com/codex/install.sh | sh
```

Claude CLI on macOS:

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

Install Grok CLI following the [Grok Build documentation](https://docs.x.ai/build/overview), then
authenticate with `grok login` or set `XAI_API_KEY` in the environment used to launch CodeBot.

CodeBot downloads and pins the OpenCode CLI, like Codex, Claude, and Grok. OpenCode's free models
need no account and no sign-in: select OpenCode, click Connect, and CodeBot reads the models that
the CLI advertises. To use the paid OpenCode Go models, click Sign in on the OpenCode row and
paste a Go key from [opencode.ai/auth](https://opencode.ai/auth). CodeBot encrypts the key on this
computer and gives it only to the local CLI. CodeBot supports OpenCode Go only: the Zen models a
Go key does not buy stay out of the picker. Models with the Free label in the model picker need no
sign-in. Other models need a sign-in with their provider: a Go key for the `opencode-go/` models, or
`opencode auth login` in a terminal for OpenCode Zen and third-party providers. Without it, the turn
fails with an error that names the provider. If you installed OpenCode yourself, CodeBot
keeps that install and offers no download. Set `CODEBOT_OPENCODE_PATH` to select an executable
outside your shell's search path. Remote OpenCode agents require Team API v4; older clients do not
show these agents.

Gemini uses a Google AI Pro or Ultra plan. CodeBot downloads Google's Antigravity CLI on this
computer when you select Download on the Gemini row, because Google's license does not let CodeBot
include it. Sign in opens Google's sign-in page in your browser. CodeBot never uses an
`antigravity` command on your search path, because the Antigravity editor installs a command with
that name. Set `CODEBOT_ANTIGRAVITY_PATH` to select an Antigravity CLI 1.5.3 or later executable
yourself. CodeBot reads its version with `--version`. When that path is set, CodeBot uses only
it. Connect remains available in the host's local Server settings > Providers screen. Remote
settings cannot perform Google sign-in; use a browser on the host. See
[Gemini setup and download recovery](../../docs/architecture/providers.md#gemini) for the required
layout, the reported IPv6 download failure, and checks that do not change host networking.

Cursor uses a Cursor plan or a Cursor API key. CodeBot downloads and pins the Cursor CLI
(`cursor-agent`) when you select Download on the Cursor row in More providers, and starts it with
`cursor-agent acp`. Sign in opens Cursor's sign-in page in your browser. You can also set
`CURSOR_API_KEY` in the environment used to launch CodeBot. If you installed `cursor-agent`
yourself, CodeBot uses it until a download exists. CodeBot never uses the `cursor` command, which
starts the Cursor editor. Set `CODEBOT_CURSOR_PATH` to select an executable yourself. Cursor
agents stay on this computer: team members do not see them.

Cline uses a Cline account, which has free models with limits for each model. The provider of a
free model can use your prompts to train models. With a ClinePass subscription, select a model with
"(ClinePass)" in its name: it runs on the subscription, and other paid models use Cline Credits. CodeBot downloads and pins the Cline CLI (`cline`) when you
select Download on the Cline row in More providers, and starts it with `cline --acp`. Sign in opens
Cline's sign-in page in your browser. You can also set `CLINE_API_KEY` in the environment used to
launch CodeBot. If you installed `cline` 3.0.68 or newer yourself, CodeBot uses it until a download
exists. Set `CODEBOT_CLINE_PATH` to select an executable yourself. Cline agents stay on this
computer: team members do not see them.

Kimi uses a Kimi Code account. CodeBot downloads and pins the Kimi Code CLI (`kimi`) when you select
Download on the Kimi row in More providers, and starts it with `kimi acp`. Sign in runs `kimi login`,
which opens Kimi's sign-in page in your browser. If you installed `kimi` 1.52.0 or newer yourself,
CodeBot uses it until a download exists. Set `CODEBOT_KIMI_PATH` to select an executable yourself.
When a Full access Kimi agent changes its model, the CLI saves that model as its default in
`~/.kimi/config.toml`, so a Kimi session that you start in a terminal also uses it. Kimi agents run
on this computer. Team members see them when their app supports Kimi.

Devin uses a Devin account. CodeBot downloads and pins the Devin CLI (`devin`) when you select
Download on the Devin row in More providers, and starts it with `devin acp`. Sign in opens Devin's
sign-in page in your browser. If you installed `devin` yourself, CodeBot uses it until a download
exists. Set `CODEBOT_DEVIN_PATH` to select an executable yourself. Devin agents run on this computer.
Team members see them when their app supports Devin.

GitHub Copilot uses a GitHub account with a Copilot plan. CodeBot downloads and pins the GitHub
Copilot CLI (`copilot`) when you select Download on the GitHub Copilot row in More providers, and
starts it with `copilot --acp`. Sign in opens GitHub's sign-in page in your browser. The CLI keeps
the sign-in in the system keychain. If `COPILOT_GITHUB_TOKEN`, `GH_TOKEN` or `GITHUB_TOKEN` is set
for CodeBot, the CLI uses that token instead, and Disconnect cannot remove it. If you installed
`copilot` yourself, CodeBot uses it until a download exists. Set `CODEBOT_COPILOT_PATH` to select
an executable yourself. Copilot agents run on this computer. Team members see them when their app
supports GitHub Copilot.

Mistral uses a Mistral account or a Mistral API key. CodeBot downloads and pins Mistral Vibe's ACP
server (`vibe-acp`) when you select Download on the Mistral row in More providers. Sign in opens
Mistral's sign-in page in your browser. Vibe saves an API key in the system keychain, or in
`~/.vibe/.env` when there is no keychain. If `MISTRAL_API_KEY` is set for CodeBot, Vibe uses that key,
and Disconnect cannot remove it. CodeBot turns off Vibe's telemetry, and turns on Vibe's model
catalogue, so the model picker shows the models of your Mistral account, not only Mistral Medium 3.5. If you installed `vibe-acp`
yourself, CodeBot uses it until a download exists. Set `CODEBOT_MISTRAL_PATH` to select an executable
yourself. When a Full access Mistral agent changes its model or thinking level, Vibe saves it as its
default in `~/.vibe/config.toml`. Mistral agents run on this computer. Team members see them when
their app supports Mistral.

Hermes uses the Hermes Agent (`hermes`) that you install yourself, with your own `~/.hermes` (or
`$HERMES_HOME`): its memories, skills, sign-ins and `SOUL.md` apply to CodeBot agents too. CodeBot
does not update Hermes. When it is missing on macOS, Linux or a server, Download on the Hermes row runs
the official Hermes installer; on Windows, the row opens the installation guide. CodeBot
starts it with `hermes acp`. Sign in runs `hermes auth add nous` for a Nous Portal plan, or run
`hermes setup` in a terminal for other providers. The model menu lists the models of each provider
that Hermes is signed in to. Hermes reads `AGENTS.md` only in a workspace with no `.hermes.md`, and
`.agents/skills` only in a git project that `skills.trusted_project_dirs` in `config.yaml` names.
Team members see the host's Hermes agents when their app uses Team API protocol 8 or newer.

On Windows, install the native CLI and make sure `codex`, `claude`, or `grok` is available in PowerShell.
Claude Code also requires Git for Windows. Then authenticate the installed CLI and restart CodeBot.

Bun and Node.js are not required when using an installed release. Optional Computer Use works on
macOS, Windows and Linux, and the release carries the driver, so there is nothing to install. Only
macOS asks for a permission for it: Screen Recording and Accessibility.

CodeBot uses the existing local CLI login. It does not copy provider credentials. Grok's
`XAI_API_KEY` and per-session MCP bearer tokens are never persisted or logged. Each provider's terms
apply to your sign-in. See [provider terms](../../docs/provider-terms.md) for Claude subscriptions.

For setup problems, data reset, and uninstall instructions, see
[Troubleshooting](../../docs/TROUBLESHOOTING.md). CodeBot's data and network behavior is documented in
[Privacy](../../PRIVACY.md).

## Development

Development requires stable [Bun](https://bun.sh/) 1.4.2, Node.js 24 (the version in `.nvmrc`, matching
the Node that Electron bundles - run `nvm use`), and at least one supported agent CLI.

Install the exact Bun version on macOS or Linux:

```bash
curl -fsSL https://bun.com/install | bash -s "bun-v1.4.2"
```

Install it on Windows in PowerShell:

```powershell
iex "& {$(irm https://bun.com/install.ps1)} -Version 1.4.2"
```

```bash
git clone https://github.com/nightly-labs/openbot.git
cd codebot
bun install --frozen-lockfile
bun run codex:doctor
bun run dev
```

`codex:doctor` checks the CLI version, App Server handshake, and ChatGPT login without starting a
model turn. `bun run cua-driver:doctor` reports the Computer Use driver separately.

In a new git worktree, run `bun run dev:bootstrap`. It copies the files that `.worktreeinclude`
lists from the main checkout when they are missing, installs dependencies, migrates the local API,
and seeds the isolated profile. Set it as the worktree setup command of your agent harness.

On macOS, a worktree's `node_modules` uses almost no new disk space. Bun clones packages from its
cache, and the root `postinstall` clones Electron from `~/Library/Caches/CodeBot/electron-dist`.
`du` still shows the full size of each clone.
The first install of an Electron version extracts it once and saves it there. Delete the directory
to clear the cache; an entry that nobody used for 30 days is removed by the next save.

To reset only the local development state, quit the dev app and test client, then run
`bun run dev:reset`.
The command deletes the app and test-client development profiles plus the legacy host profile,
including `codebot.db` and its WAL files. It prints each profile before it deletes it, and it
deletes nothing while a dev app has one of them open. It does not change the production profile,
the worktree profiles that `bun run dev` opens (`CodeBot Dev wt-<hash>`), agent workspaces,
`~/.codex`, or `~/.claude`.

`bun run dev` seeds a development profile it creates, so a first start already shows this data.
`bun run dev:seed` replaces the shared `CodeBot Dev` profile. To use it, quit the dev app, then run:

```bash
bun run dev:seed
bun run dev --shared
```

The seeded agents run on `opencode-go/muse-spark-1.3-contributor` at medium effort while this
computer's OpenCode CLI lists it, and on `gpt-6-luna` at low effort otherwise. A dev build starts a
new agent on the same pair, so a seeded agent and one you create agree; a packaged build always uses
`gpt-6-luna`.

The seed adds agents, rich conversations, managed files and references, reactions, completed
agent exchanges, two channels with a delegated task run, channel memories and routines, and local
team chat data. It dates every record backwards from the run, so the transcripts read Today and
Yesterday. It does not add live queue items, open routine runs, or queued channel tasks, so it
starts no model turn.
Use `bun run dev:seed --dry-run` to inspect the target and fixture counts without changing files.
`dev:seed`, `dev:reset`, `dev:verify`, `dev:bench`, and `dev:automation` print their usage for
`--help` and change nothing. They stop with exit code 2 on an option that they do not know.

### Marketplace launch catalog

Seed the approved CodeBot team catalog locally with `bun run marketplace:seed:local`, then start or reuse `bun run dev`. Search **CodeBot** in Marketplace to review its Skills and Agents. This seed adds catalog records without resetting app data.

`bun run marketplace:build` creates the launch bundles. `bun run marketplace:publish:production` is a dry run; production writes require explicit flags and admin credentials. See the [catalog and publication guide](../../marketplace/production-catalog/README.md).

Skill authors can add optional `example-prompt` text to the YAML frontmatter in `SKILL.md`:

```yaml
example-prompt: Turn the latest commits into release notes.
```

The skill preview shows this text. **Try skill** appends it and a skill reference to the selected agent's draft. It does not send the message. The field accepts up to 1,000 characters after trimming. Missing or invalid values use a default example. No new package format or database migration is required.

## Local skills

Ask an agent to create a skill from a reusable workflow. It prepares a folder with `SKILL.md` and calls `create_skill`. The skill is saved in a shared local library and enabled for that agent. Other agents can add it through **Settings → Skills → Local skills**.

Agents can use `list_local_skills`, `read_local_skill`, `revise_skill`, and `install_local_skill`. Revisions require the version read by the agent and retain previous versions. Updating a library skill does not update installed copies: use the Update chip or install an exact revision. Modified installed files are protected. To publish a local skill, submit its folder separately through the marketplace.

Optional scripts, references, and assets follow the Codex skill folder structure. A PNG at `assets/icon.png` supplies the local preview logo. The built-in `codebot-skill-creator` guide explains the format and validation limits. Registration does not run scripts.

## Import agents from Grok Bot

Open **Server settings → Import** on this computer, or on a joined server in the desktop app or the browser client. Every member of a server can import, not only an owner or admin. Add the [CodeBot export agent](https://x.ai/bot/pOUBH2kQK8CKvM7nW8stG) to Grok Bot and say "Export my agents for CodeBot". It saves one `.zip` file to Downloads. Choose that file in CodeBot, select the agents, and import them.

The import adds each agent's name, instructions, avatar, skills, routines, and memories. Workspace files are copied to `imported/` in the agent's workspace if you included them. Chat history is not copied: the export agent keeps the important facts as memories. For this computer, the file is read here and is not uploaded, and it has no size limit: CodeBot reads it from disk one file at a time and skips an agent whose files do not fit in the free disk space. For a joined server, the file goes to the computer that runs that server through the encrypted host connection, in parts, so it has no size limit either; the server must have free disk space for it. A server on an older version of CodeBot takes a file of at most 100 MB. A member's import uses a skill that the server already has instead of changing it. The export skill and its format are in [`resources/agent-import/grok-bot/SKILL.md`](../../resources/agent-import/grok-bot/SKILL.md).

## macOS remote desktop permissions

For each macOS account, log in to its GUI session and open **Server Settings → Remote desktop access**.
Select **Check again** to read Sunshine's Screen Recording and Accessibility permissions, display availability,
and GUI session status. The panel names the Mac and the account that runs Sunshine. Grant permissions in
that account, including when the account was created with the tenant setup script.

After you publish a server on a Mac, an optional **Set up remote desktop** prompt opens this panel. Select **Later** to keep using the published server without remote desktop setup.

Use the permission buttons to open **System Settings → Privacy & Security** on the host. If Sunshine is
missing from a list, select **Show Sunshine in Finder** and add the bundled `Sunshine.app` with the **+** button.
macOS can attribute access to the application that starts Sunshine; enable the application named by the
system prompt. Return to CodeBot to check again. If a restart is required, end remote sessions first.
A check never restarts an active session.

Select **Test on this Mac** for a local test. If native checks are unavailable, it tests video only and disables viewer input. After the checks pass, it can test mouse and keyboard too. Select **Test remote desktop** from another computer for a remote test.
The test requires an otherwise unused remote desktop host. It opens a temporary host panel, keeps remote
input inside that panel, and asks you to click a target and type a four-digit code. Confirm that the picture
is visible, then select **Finish test**. Local input does not pass the mouse or keyboard test. The panel
expires after two minutes. Older hosts or native runtimes require an update before these checks are available.

The native runtime source change invalidates prior artifact pins. The **Remote desktop runtime** CI workflow
builds and tests the new source, then publishes and pins verified artifacts through its existing release flow.
Do not reuse old artifact hashes with the new source digest.

## Architecture

```text
Electron main
├── local Codex App Server process over stdio JSONL
├── local Claude Agent SDK session over stream JSON
├── SQLite command log and read projections
├── secure typed IPC handlers
└── sandboxed WebContentsView browser host
    ↕ typed preload bridge
SolidJS renderer

Cloudflare Workers
└── TanStack Start + Solid 2 account API
    ├── D1 accounts, email challenges, hashed sessions, and team tunnels
    └── R2 account avatars
```

- `src/main` owns the Electron lifecycle, window security, local protocol, and IPC registration.
- `src/backend` owns provider adapters, persistence, message scheduling, transfers, and the browser host.
- `src/preload` exposes only the typed `window.codebot` API.
- `src/renderer` contains the SolidJS interface.
- `apps/auth-api` contains the TanStack Start account API, one-time email codes, rate limits, and D1 migrations. It also serves the public site: the landing page, `/news`, `/guides`, and the Marketplace pages at `/marketplace` (Agents, Skills, and Apps), `/marketplace/agents/<id>`, `/marketplace/skills/<slug>`, and `/plugins/<slug>`. `/plugins` redirects to `/marketplace/apps`.
- `apps/status` contains the public status page at `status.openbot.run`, the script that the `status-page` workflow runs to check the services, and the script that sends the [status webhooks](../../docs/status-webhooks.md) of the team. GitHub hosts it, so it stays up when Cloudflare does not.
- `packages/contracts` contains process-boundary contracts, shared limits, and pure validation.
- `packages/i18n` contains the interface text in English and 14 other languages, Arabic and Hebrew with a right-to-left layout, for desktop, web and mobile. See [docs/i18n.md](../../docs/i18n.md) to add text or a language.

See [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md) for dependency direction, state ownership, and
rules for new modules.

## Chat attachments

Attach MP3 audio and MOV video through the file picker or drag and drop. The limits are 100 MB per
file, 250 MB per message, and 10 files per message. CodeBot gives the agent the original file; it does
not play, decode, transcribe, or validate the recording during import. Damaged recordings can be
attached for inspection. Analysis depends on the tools available to the agent. Other audio or video
formats attach as files of other types do (see below). Remote hosts must advertise the
`media-attachments` capability; update the host if this feature is unavailable.

MP4 video uses the same limits and rules as MOV. Remote hosts must also advertise the
`mp4-attachments` capability.

ZIP archives use the same limits. CodeBot does not extract or inspect an archive: the agent gets the
original file and extracts it with its own tools. An agent sends a ZIP archive back with
`codebot.attach_files_to_response`, and the user downloads it from the chat. Open shows a ZIP
archive in the file manager instead of opening it. Remote hosts must advertise the `zip-attachments`
capability.

SVG images use the same limits. The chat shows an SVG as an image, but the agent gets it as a file,
not as an image: providers take only raster images, so the agent reads the SVG text. Open shows an SVG
in the file manager. Remote hosts must advertise the `svg-attachments` capability.

Files of all other types use the same limits, for example VPN profiles, certificates, and
infrastructure configuration. CodeBot stores the file unchanged, with no preview, and the agent gets
its path and reads it with its own tools. Open shows the file in the file manager. Remote hosts must
advertise the `any-file-attachments` capability. An older host takes only the types above and its
list of documents, text, data, and source files.

## Local data and network boundaries

- `~/CodeBot/Agents/<agent-id>` — one working directory per agent. A profile written before the
  bot-to-agent rename holds them under `~/CodeBot/Bots`; the app moves them on first launch, and a
  workspace whose move could not run stays readable where it is.
- `~/CodeBot/Shared` — files intentionally shared between agents.
- `~/CodeBot/Shared/Transfers` — managed message snapshots and generated files. Each transfer has
  an `.codebot-transfer.json` manifest with ownership, recipients, size, and SHA-256 metadata.
- `~/CodeBot/Downloads` — embedded-browser downloads.
- Electron `userData/codebot.db` — the canonical CodeBot event log and projections for agents,
  conversations, provider session bindings, queues, reactions, and attachment indexes.
- Electron `userData/legacy-backup-v1` — unchanged copies of imported `bots.json` and
  `mailbox.json` files, when these files existed before the SQLite migration.
- `~/Library/Application Support/CodeBot/provider-runtimes` — the provider CLIs CodeBot downloads
  and pins. One store for the whole computer, outside any one profile, so every development profile
  and the packaged app read the same download. `--user-data-dir` keeps the store in that directory
  instead, so an explicitly named profile stays self-contained.
- `~/.codex` — login and thread history managed exclusively by Codex CLI.
- `~/.claude` — login and session history managed exclusively by Claude CLI.
- `~/.grok` — login and session history managed exclusively by Grok CLI.
- `~/.gemini` (or `$GEMINI_HOME`) — login and session history managed exclusively by the
  Antigravity CLI that Gemini uses.
- `~/.cursor` — login and session history managed exclusively by the Cursor CLI. A confined Cursor
  process keeps its settings in `~/.cursor/codebot-confined`, so it never changes yours.
- `~/.cline` (or `$CLINE_DIR`) — login and session history managed exclusively by the Cline CLI.
- `~/.kimi` (or `$KIMI_SHARE_DIR`) — login and session history managed exclusively by the Kimi Code CLI.
- `~/.local/share/devin`, `~/.config/devin` and `~/.devin` (or the XDG folders) — login, settings and
  session history managed exclusively by the Devin CLI.
- `~/.copilot` (or `$COPILOT_HOME`) — settings and session history managed exclusively by the GitHub
  Copilot CLI. Its sign-in is in the system keychain.
- `~/.vibe` (or `$VIBE_HOME`) — settings, logs and session history managed exclusively by Mistral
  Vibe. CodeBot makes an empty `trusted_folders.toml` there when it is missing. The sign-in is in the
  system keychain, or in `.env`.
- `~/.hermes` (or `$HERMES_HOME`) — your own Hermes Agent settings, memories, skills, sign-ins and
  session history. CodeBot reads only the change time of `auth.json`, `.env` and `config.yaml`, to
  see a sign-in.

Deleting an agent removes its workspace, owned generated attachments, and deliveries addressed only
to that agent. A transfer remains when another agent still uses the same message.

CodeBot keeps one stable local conversation when an agent changes between Codex, Grok, and Claude. Native
provider session identifiers stay private and are used only to resume provider runtime state.

The Electron renderer is never exposed as a public website. It communicates with local CLI processes
over stdio. When the owner publishes CodeBot, its authenticated Team API stays on localhost. WebRTC
protocol v3 carries RPC, events, and binary files to desktop and mobile clients. Expo Go hosts the
mobile `RTCPeerConnection` in a hidden Expo DOM component, so mobile uses the same encrypted transport
without a custom native development build. The account flow connects to
the configured HTTPS Cloudflare API. The client stores only an encrypted CodeBot session token. One-time codes expire after
10 minutes and are stored only as hashes. A daily maintenance task removes expired or consumed
authentication records from D1. The embedded browser uses a separate sandboxed Electron session and
cannot access `window.codebot` or managed local attachments.

To run your own account service, Signal and TURN, see [Self-hosted remote access](../../docs/self-hosting.md).

To trigger routines from external services, see
[Webhooks](../../docs/webhooks.md). Public webhook requests require the host to be online.

## Security

Read [SECURITY.md](../../SECURITY.md) before reporting a vulnerability. Do not put credentials, private
files, conversation contents, or sensitive diagnostics in a public issue.

Full local access is an explicit current product decision, not a security boundary. Reports are
especially useful when remote content can reach Electron privileges, managed attachment paths can
escape their roots, IPC sender validation can be bypassed, or an agent can act outside the access
described above.

## Releases

Each push to `main` makes a GitHub Release, and installed builds get updates from it (see
[releases.md](releases.md)). A folder on your own server is an optional update feed. `bun run release:patch`,
`release:minor`, or `release:major` prepares the version and changelog. Then `bun run release:codebot`
builds the installer for the computer that you run it on and uploads it and the update metadata to the
update folder (`--target-dir`, `--webdav` or `--scp`). Installed builds check the folder at start and every
hour, download in the background, and show "Restart to update". The update folder, the settings and
the unsigned-build steps are in [docs/codebot/updates.md](../../docs/codebot/updates.md) and
[docs/codebot/unsigned-builds.md](../../docs/codebot/unsigned-builds.md).

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md). Before we merge a contribution, each
author from outside the organization signs the [Contributor License Agreement](../../CLA.md), which
gives Synthetify Labs a license to use the contribution. Community behavior is governed by the
[Code of Conduct](../../CODE_OF_CONDUCT.md).

