# CodeBot decisions

This file records each choice that the build team made for the owner. The PRD is the source of truth;
a decision here fills a gap in the PRD or selects one of several possible designs.

## Repository

- **D1. Base.** CodeBot starts from OpenBot `main` at commit `100c60e89` (2026-11-26, version 0.79.0).
  The download in the owner's Downloads folder was the same tree. The upstream history is in this
  repository. The tag `openbot-baseline` marks the upstream commit.
- **D2. Remote.** The remote `origin` is the upstream OpenBot repository. Its push URL is disabled.
  CodeBot has no remote of its own. Nothing is pushed.
- **D3. Rename.** The rename from OpenBot to CodeBot is mechanical and complete: product text, package
  names, identifiers, environment variables, folders, file names, protocol scheme and bundle IDs.
  `scripts/codebot/rename-upstream.ts` makes the rename. Both names have 7 letters, so byte budgets
  and fixed-width data do not change. The script keeps LICENSE and NOTICE, the upstream domains, the
  upstream GitHub paths and the accounts that the upstream project owns. Later work removes each
  remaining upstream server reference. `bun run check:branding` fails when one is left.
- **D4. Upstream sync.** The branch `upstream-renamed` holds the script result for an upstream commit.
  `main` merges that branch. See [upstream-sync.md](upstream-sync.md).
- **D5. Release tags.** CodeBot release tags are `codebot-v<version>`, so they cannot collide with an
  upstream tag. `codebot-v0.79.0` marks the mechanical rename. `check:migrations` compares with the
  newest `codebot-v*` tag.
- **D6. Hooks.** The mechanical rename commit did not run the pre-commit hook, because it is a script
  result. All other commits run the hook.

## Product

- **D7. Removed with the upstream cloud.** These parts need servers that only the upstream company
  runs, so CodeBot removes them: billing, plans, license purchase, credits and paid media generation,
  hosted servers, hosted sites, referral, analytics, telemetry and error reports, the NEAR wallet
  relay, feedback to the upstream issue tracker, the public website, the browser client at `/app`,
  the browser extension, the status page, and mobile over-the-air updates.
- **D8. Account service.** `apps/auth-api` stays as the account service code, but it runs as a Bun
  process with SQLite on the home server. Nextcloud is the identity provider through OpenID Connect.
  The Cloudflare Worker build, the email-code login and the public site are removed.
- **D9. Login is optional.** With no account service set, CodeBot makes no account request and works
  with a local profile.
- **D10. Projects.** A project is a new record: name, color, main folder, more folders, access level,
  default model, reply rule and instructions. Each agent of a project is an existing agent record
  with a `projectId`. Each chat is an existing agent thread ("task"). A chat can set its own model.
  The working directory of a project agent is the project main folder.
- **D11. Project storage.** Project tables are in the main SQLite database, in a second migration
  chain with its own version table. The upstream migration chain stays unchanged, so an upstream
  migration never takes a CodeBot version number.
- **D12. Layout.** The main area is a dock layout. Each panel holds a chat, a file, a diff or the
  browser. The fixed right panel is removed for project chats.
- **D13. Folder lock.** Open is the upstream "Full access". Normal adds the prompt rule, the provider
  write sandbox and a block of file-tool reads outside the allowed folders. Strict adds the provider
  OS sandbox with read isolation, or a container. A provider that cannot lock on the current OS is
  refused in Normal and Strict; it is not run without the lock.
- **D14. Hidden features.** Each hidden feature has a switch in Settings > Advanced features. When a
  feature is off, its buttons, its settings rows and its agent tools are not offered.
- **D15. Updates.** electron-updater uses the generic provider. The feed URL comes from the build
  configuration and can be changed in settings.
- **D16. Tests.** New tests are E2E scripts under `scripts/`, as the upstream rules require. They run
  on Windows, macOS and Linux. Vitest files are only for migrations and the trust boundary.

- **D17. Analytics call sites.** The analytics and telemetry engine is removed: no collection, no
  storage, no upload, no consent screens. The call sites in feature code stay and call functions that
  do nothing. Thus an upstream change that adds or moves a tracking call still merges, and nothing is
  sent. A test proves that the functions make no network request and no file write.

- **D18. Visible name.** The owner decided on 2026-11-26 that the visible product name is
  "OpenBot Code" (app name, window title, menus, about screen, installer names, i18n text). Internal
  identifiers stay `codebot`: package names, app ID `app.codebot.desktop`, scheme, code names and
  data folders. The display rename is one pass after the work packages merge, so build agents keep
  writing "CodeBot" until then. `check:branding` must then allow the exact visible name and still
  fail on upstream server references.
- **D19. Keep the OpenBot look.** The owner decided on 2026-11-26 that the app keeps the OpenBot
  look: the same layout, spacing, fonts, components and current dark theme as the default. New
  features use the existing `@codebot/ui` primitives and `--codebot-*` tokens and look like they
  belong to OpenBot. The new themes (16.2, 16.3) are extra choices, not a redesign. Do not restyle
  existing screens.

## Work packages

| Package | Scope |
| --- | --- |
| W00 | Fork, rename, repository tools |
| W01 | RAM and CPU measurement on Windows, baseline |
| W02 | Remove analytics, billing and other upstream cloud features from the desktop |
| W03 | Self-hosted account service with Nextcloud login, Signal and TURN |
| W04 | Desktop account flow: optional login, local profile, service URLs |
| W05 | Advanced features switches |
| W06 | Application updates from the home server |
| W07 | Engine: projects, agents of a project, chats, per-chat model |
| W08 | Slash commands |
| W09 | Folder lock |
| W10 | Short replies |
| W11 | File tree, git, previews, editor, diff |
| W12 | Main layout: left bar, chat list, dock panels |
| W13 | Status bar, usage, local model servers |
| W14 | Agent content in split panels, auto-close, pin, browser panel |
| W15 | Keyboard shortcuts |
| W16 | Themes |
| W17 | Server mode (Phase 2) |
| W18 | Mobile app |
| W19 | Documents |
| W20 | Test harness on Windows |
| W21 | Checks, screenshots, corrections |
