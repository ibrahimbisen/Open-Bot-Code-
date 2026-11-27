# Server mode (Phase 2, W17)

PRD items 1.6, 4.3 and 18.1 to 18.5. In Phase 2 the agent engine runs on your home server and each
computer keeps only the screen. Phase 2 is not required for the first release. This file says what
works now, how to set up the engine on a home server, and what is not proven.

## How it works

CodeBot has two parts: the engine (agents, chats, files, folder lock) and the screen. The screen talks
to the engine only through the typed API. The upstream product already lets one screen use more than
one engine: the local engine of the computer ("local") and each joined server (a remote engine behind
the Team API). Server mode uses this path and adds no second one.

- The screen calls an endpoint with a server id: `local` or the id of a joined server. The main process
  of the desktop runs the call on the local engine, or sends it to the Team API of the joined server
  (`routeToServer`, `scopedHandler`).
- The home server is a normal CodeBot engine that starts in server mode on Linux. A desktop joins it
  as a server, with an invite or the sign-in of the account service (see `account-service.md`).
- The switch "This computer / Home server" (18.4) selects `local` or the joined server. It sets the
  active server of the screen; the rest of the screen does not change.

## What the screen can do on a joined server

| Feature | Team API capability | Host route file | Client branch |
| --- | --- | --- | --- |
| Projects, project agents, chats, activity events | `projects-v1` | `src/main/team-api/route-projects.ts` | `src/main/ipc/project-handlers.ts` (W07) |
| File explorer: roots, list, stat, read, save, create, rename, trash, Git status, log, diff | `explorer-v1` | `route-explorer.ts` | `explorer-handlers.ts` |
| Slash commands, saved chats, resume | `slash-commands-v1` | `route-slash-commands.ts` | `slash-command-handlers.ts` |
| Reply rule and step details of a reply | `reply-rule-v1`, `turn-step-details-v1` | `route-replies.ts` | `reply-handlers.ts` |
| Folder lock level | `projects-v1` (access level of the project) | enforced by the engine on the server | none needed |
| Status of the engine and usage | existing `/v1/agents/status` and usage routes | existing | existing |

The new routes need an administrator of the server. A member gets 403 and a client without the
capability gets 400 with a catalog message. The contracts are in `packages/contracts/src/team-protocol/`
(`explorer-v1.ts`, `slash-commands-v1.ts`, `replies-v1.ts`).

Limits on a joined server:

- "Show in folder" is refused. The file manager of the desktop cannot show a folder of the server.
- The file tree does not update by itself (no remote watch). The screen shows the state of the last read.
- The explorer gives no preview address for images, PDF, audio and video of the server: the address
  of the preview protocol exists only on the computer that runs the engine. Text files work.
- A file read over WebRTC is limited by the frame budget of the Team API. Large text files need HTTPS.
- Slash command changes (`slash-commands:changed`) come only from the local engine. On a server the
  list loads again when the chat changes.
- The local model servers in the status bar are entries of the computer of the screen, not of the
  home server. This is on purpose: a model server (Ollama, a DGX) is reached from the screen computer.
- The folder picker of "New project" opens the folder dialog of the desktop. On a joined server the
  main folder is a path on the server: type it, or use the explorer of the server.

## Home server engine setup (18.1)

The engine on the server is the Linux build of CodeBot (AppImage) in server mode. There are two ways.

### A. Linux install (systemd)

1. Build or download the Linux release and put it in your update folder (see `updates.md`): the files
   `latest-linux.yml` or `latest-linux-arm64.yml` and `CodeBot-<version>-x86_64.AppImage` or
   `-arm64.AppImage`. An AppImage can only be built on Linux (electron-builder).
2. On the server (Ubuntu 24.04 or newer, systemd, apt):
   `sudo bash install-server.sh --update-url https://updates.example.com/codebot`
   Options: `--user <name>`, `--auth-api-url <origin>` (your account service, `account-service.md`),
   `--display-size <W>x<H>`, `--name <name>`. The script reads the manifest, checks the SHA-512,
   unpacks the release and runs `resources/hosting/codebot-server-setup`. The service is
   `codebot.service`; the engine starts with `CODEBOT_SERVER=1`.
3. Sign in the server to your account service: `sudo codebot login`, or `CODEBOT_CLAIM` with the
   command that the desktop shows. Then add the server in the desktop (Add server). Updates: the server
   reads the same update folder (`codebot-update.timer`).

### B. Docker

1. Put the AppImage of the release in an empty folder as `CodeBot.AppImage`, and copy `docker/` there.
2. `docker build -f docker/Dockerfile -t codebot:latest .`
3. `docker compose -f docker/compose.yaml up -d` (the seccomp profile `docker/seccomp.json` is
   required for the Electron sandbox). Data is in the volume `codebot-data` at `/data`.
4. Sign in with `docker exec -it <container> codebot login`.

`docs/docker.md` and `docs/self-hosted-server.md` describe more options (instances, backups, firewall).
Some of their text still comes from the upstream product (hosted servers, upstream account); the
rename and removal pass is separate work.

## Project folders on the server (18.2)

A project folder is a path on the computer that runs the engine. To keep the folders in Nextcloud
storage, make the Nextcloud folder a path on the server. Two ways (not tested here):

- The server is the Nextcloud server, or can read its data folder: use a folder of the data directory.
  Files that the engine changes must be scanned again by Nextcloud (`occ files:scan`) or be on an
  external storage that Nextcloud scans.
- A mount of the Nextcloud WebDAV folder (for example `rclone mount` or `davfs2`) at a path such as
  `/srv/codebot/projects`. Use a mount with a local cache: Git and builds are slow on a plain WebDAV mount.

Then create the project from the screen with the server path as the main folder. The folder lock
works on the path that the engine sees, so mount the Nextcloud folders before the engine starts.

## Folder lock on the server (10.9)

The lock level of a project is a field of the project and the engine enforces it, so a client cannot
bypass it. Open, Normal and Strict apply to the agents on the server as on a computer (see
`folder-lock.md`). With Strict the engine uses one container per project on Linux when Docker or
Podman is installed (`CODEBOT_LOCK_CONTAINER=auto`, the default, uses a container on Linux; set
`CODEBOT_LOCK_CONTAINER=always` to require it, or `never`). The container image comes from
`CODEBOT_LOCK_CONTAINER_IMAGE`. If the engine itself runs in the Docker install above, the container
driver needs access to a Docker or Podman socket of the host. This was not tested.

## Who sees which data (11.6)

The Team API checks the role of the member for each route: the new routes need an administrator, and
the hidden agent and agent level rules of the existing routes still apply. A per-user separation of
projects for members is not part of W17.

## Proof

- `bun run test:server-mode` (`scripts/server-mode-e2e.ts`): a real engine (agent service with a fake
  Codex, project service, explorer, Team API server) and a client that uses the real IPC handlers of
  the desktop with a client that sends HTTP requests to the Team API. 22 checks: projects, chats,
  list, search, pin, explorer (read, save, conflict, create, rename, trash, outside folder, Git),
  slash commands, reply rule, the reply rule in the instructions of the next chat, step details, the
  Normal lock as a write sandbox, Strict does not run an agent that cannot be locked, Open as full access,
  status, 403, 400 and 404 answers. The client engine is a trap: any use of a local service throws.
  Report: `.codebot-build/server-mode-e2e/report.json`.
- `bun run test:server-mode-ui` (`scripts/server-mode-ui-e2e.ts`): the dev app, a second engine
  process on the same computer as the joined "home server" (the local server feature), the switch,
  a project created on the server, the left bar and the chat panel from the server, the project not
  on this computer. Screenshots: `.codebot-build/w17/screens/`.
- `bun run test:server-install` (`scripts/server-install-check.ts`): the Docker and Linux install
  files without Docker: every path in the Dockerfile exists, the AppImage target and names match the
  install script, Compose and seccomp parse, `bash -n` of 14 scripts, no upstream address.

## Not run

- `docker build` and `docker run`: this computer has no Docker.
- The Linux AppImage build, and the start of the engine in server mode on Linux and macOS.
- The install script as root (apt, systemd), `codebot login` and the update timer on a real server.
- A second computer as the home server and a joined connection over the Internet (Signal and TURN).
  The proof joins a second engine on the same computer through the local server feature (HTTP on
  localhost).
- Nextcloud storage as the project folder, and the container lock inside the Docker install.
- The desktop apps on macOS and Linux, and the mobile app.
