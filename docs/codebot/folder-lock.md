# Folder lock (W09)

Decision D13. PRD items 10.2 to 10.6, 10.8, 10.9 and acceptance 20.5. This file describes the engine side.
The level picker and the badge belong to W12.

## Levels

| Level | Prompt rule | Write lock | Read and search lock | Shell commands |
| --- | --- | --- | --- | --- |
| Open | no | no | no | no limit |
| Normal | yes | yes, no approval can allow a write outside | file tools only (Read, Grep, Glob, LS) | provider sandbox, or the user approves each command |
| Strict | yes | yes | file tools, and an OS sandbox or container that hides the rest of the computer | in the sandbox or container only |

The level of an agent comes from its project (`agentProjectContext`, W07a seam). An agent without a project
keeps the old "Workspace only" behavior. The allowed folders are the project main folder and the added
folders. Project agents do not get the shared folder. They can read `<shared>/Transfers` (attachments).

## Where the lock is made

- `src/backend/lock/lock-level.ts`: level of an agent. `lockEnforced` replaces `workspaceAccessEnforced` in the
  engine (Codex sandbox policy, confinement, instructions, thread parameters).
- `src/backend/lock/folder-lock.ts`: `FolderLock` (level, allowed, excluded, read-only folders) and the
  thread parameter `folderLock`.
- `src/backend/lock/lock-prompt.ts`: the prompt rule (layer a). `developer-instructions.ts` adds it.
- `src/backend/lock/claude-lock.ts`: Claude. A `PreToolUse` hook denies a write outside the folders
  (also through a link or `..`), a read, search or list outside the folders, a glob that leaves its base
  folder, and a `file:` address. A deny cannot be approved. The sandbox settings add `denyRead` (personal
  folders in Normal, the whole home area and other volumes in Strict) and `allowRead` for the project.
- `src/backend/lock/claude-sandbox-probe.ts`: starts Claude once per version to learn whether its sandbox runs.
- `src/backend/lock/lock-strategy.ts`: one pure table. Input: level, provider kind, OS, tools found, container
  policy. Output: `native`, `container` or `refuse` with a reason.
- `src/backend/lock/strict-confinement.ts`: macOS read rules, Linux bubblewrap arguments.
- `src/backend/lock/container.ts`: container driver (Docker or Podman).
- `src/backend/lock/lock-runtime.ts`: refusal messages and the plan for confined providers.

## Enforcement per provider and OS

| Provider kind | Normal | Strict |
| --- | --- | --- |
| Claude (`tool-sandbox`) | hooks on all OS. Shell in the Claude sandbox when it runs, otherwise each command needs the user's approval | the Claude sandbox must run (macOS, Linux; Windows only when Claude turns it on). Else a container on Linux. Else the turn is refused |
| Codex (`command-sandbox`) | `workspace-write` policy of Codex, native on all OS | refused (Codex cannot hide folders from reads; the container path for Codex is not built) |
| Other providers (`confined-process`) | macOS Seatbelt write rules, Linux bubblewrap, refused on Windows | macOS Seatbelt with read rules, Linux bubblewrap with an empty home, container on Linux, refused on Windows |

A refusal is an error before the turn starts (`ProviderRuntime.ensureAgentClient`, and the Claude client for
its own probe). The messages are in `error.lock.*`. The agent is never started without the lock.

## Level change (10.6)

The lock is part of the Claude thread configuration, of the turn context key (`ThreadLifecycle`), of the
Codex tool fingerprint and of the key of a confined process. A change restarts the provider session with
the new lock before the next turn. A running turn keeps its lock.

## Personal folders (Normal) and hidden areas (Strict)

`personal-folders.ts` lists Desktop, Documents, Downloads, Pictures, Music, Videos, cloud folders (OneDrive,
iCloud, Dropbox and others) per OS (Windows registry shell folders, macOS names, XDG user dirs). Normal hides
those that lie outside the home folder from the Claude sandbox. Strict hides `C:\Users` (or `/Users`, `/home`)
and the other volumes.

## Container (10.9)

Phase 2 server: Strict uses one container per project. The container is named `codebot-lock-<project>-<hash>`,
runs `sleep infinity` with `--cap-drop ALL`, `--security-opt no-new-privileges`, a private `/tmp`, and
mounts only the allowed folders (read-write), the attachment folder and the engine folder (read-only).
A changed folder list removes and creates the container. Each agent process starts with `exec` in that container
(Claude through `spawnClaudeCodeProcess`, other providers through `confineSpawnTarget`). Environment variables
are passed by name. The policy is `CODEBOT_LOCK_CONTAINER=auto|always|never` or `setContainerPolicy`; the server
sets `always`. On a desktop, `auto` uses a container only on Linux, because the engine binary runs inside it.
The image comes from `CODEBOT_LOCK_CONTAINER_IMAGE` (default `ubuntu:24.04`) and must hold what the provider needs.

## Proof

- `bun run test:folder-lock`: the real Claude engine with a fake Anthropic API, level Open, Normal and Strict.
- `bun run test:folder-lock-confinement`: the strategy table, personal folders, macOS read rules, bubblewrap
  arguments, refusal on Windows.
- `bun run test:folder-lock-container`: the container driver with a fake `docker` program, and the real Claude
  engine started through it.

Run them after `cb_sandbox <name>`. Reports are in `.codebot-build/<name>/report.json`.

## Not verified here

The test computer runs Windows. The macOS Seatbelt rules, the Linux bubblewrap and the real Docker or Podman
isolation have proof of the generated rules and arguments only, not a run on those systems.
The Claude sandbox does not run on this Windows build ("feature gate off"), so Strict for Claude is refused
here, and Strict with real read isolation was not run.
