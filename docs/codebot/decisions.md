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

## Short replies (W10)

The lead agreed to these choices on 2026-11-26. The numbers are local to W10 until the lead gives them
a place in the list above.

- **D-W10.1. Reply rule.** The rule is the first line of the instructions that each provider gets, with
  the label "Reply rule, above all style guidance:". The order is: project rule, global rule, default
  rule. An empty rule gives no line. The global rule is in the preference file
  `codebot-reply-rule-v1.json` of the engine. `ThreadLifecycle` compares the rule of each session with
  the rule at the start of a turn and resumes the provider session with new instructions when the
  rule changed. It does not start a new provider session.
- **D-W10.2. Plain style is the default.** The default response style of the engine is `classic`. The
  `natural` style asks for a status line before each tool call and for more text at the end, which is
  against the reply rule. `natural` stays as a choice in Server settings.
- **D-W10.3. Step class and targets in the stored trace.** A stored tool step
  (`ConversationTraceStep` in `message.trace`) has two new optional fields: `activity` (`editing`,
  `running`, `reading`, `searching`, `browsing`, `delegating` or `working`; an open text field, an
  unknown value reads as `working`) and `targets` (at most 16 texts of at most 500 characters: file
  paths for `editing` and `reading`, the query for `searching`, the host for `browsing`). The summary
  line counts edited and read files by these paths. A multi-file change has more than one path, thus
  the field is a list and not one `target`. Old rows have no fields; the screen then gets the class
  from the label of the step. Team API clients get the fields inside `trace`; a client that does not
  know them ignores them.
- **D-W10.4. Step inputs, outputs and diffs.** The engine keeps a capped copy of the input, the
  output and the diff of each tool step at the time of the turn, for every provider. The provider
  transcripts were checked first: only Codex and Claude Code keep a transcript that can be read for
  one turn, Claude Code removes old transcripts (after 30 days by default, from its documentation; not
  checked here), each one needs its own parser, and the
  ACP providers and local models need a session replay in a provider process. Thus they do not give
  the same result "for every provider". The caps are: input 2,000 characters, output 8,000
  characters (the end of a command output, the start of other outputs), diff 16,000 characters for
  each file and 8 files for each step, 512,000 characters for each turn. A cut text has a
  `truncated` mark. Secrets are redacted before the write.
- **D-W10.5. Place of the step details.** The step details are in a separate SQLite file,
  `turn-step-details.db` in the user data folder, not in `codebot.db`: the main database then has no
  new table and no new migration, and message rows do not grow. The file keeps at most 256 MB; the
  oldest turns go first. The engine deletes the details of a thread or an agent when that thread
  history or agent is deleted. The screen loads the details of one turn through the typed endpoint
  `replies.readTurnSteps` only when the user opens "Details", and drops them when "Details" closes.

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
