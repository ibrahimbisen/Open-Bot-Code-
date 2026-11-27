# Engine map: agents, threads, tasks, waits, data tables and the database

## What this area is

- The backend part that stores agents, their side threads (called **tasks** on the wire), open waits, and per-agent data tables.
- It also holds `codebot.db`: the event log, the projection tables built from it, and the migrations that change its schema.
- `codebot.db` is the source of truth. Nothing copies it before an upgrade (`src/backend/AGENTS.md`).
- Agent data tables (`agent-data/`) live in other SQLite files. A separate host process owns those files.

## Key files

| Path | What it owns |
| --- | --- |
| `src/backend/codebot-database.ts` | `CodeBotDatabase` facade (691 lines). Builds the controllers in `database/`. Public surface used by callers. |
| `src/backend/codebot-database-schema.ts` | `migrateCodeBotDatabase`, `codeBotDatabaseNeedsMigration`, `LATEST_SCHEMA_VERSION`, migration runner, FK and quick_check checks. |
| `src/backend/codebot-database-schema-history.json` | Recorded schema per version (`"8"` onward). Read by the parity test. |
| `src/backend/codebot-database-schema-parity.test.ts` | Builds a new DB from empty and compares it with the history file, version by version. |
| `src/backend/codebot-database.test.ts` | Main database test file (4300 lines). Marked as a protected Vitest area. |
| `src/backend/codebot-database-events-migration.test.ts` | Events migration test. |
| `src/backend/migrations/migration.ts` | `CodeBotMigration` type: `version`, `name`, `disableForeignKeys?`, `vacuumAfterCommit?`, `up(db, appliedAt)`. |
| `src/backend/migrations/registry.ts` | Ordered `MIGRATIONS` array. Imports `0008` to `0069` (62 entries). |
| `src/backend/migrations/0008-baseline.ts` | Frozen version 8 baseline. Creates `orchestration_events`, `orchestration_command_receipts`, and the first `projection_*` tables. |
| `src/backend/migrations/0034-agent-waits.ts` | Creates `agent_waits`. |
| `src/backend/migrations/0038-agent-tasks.ts` | Creates `projection_agent_tasks` (later dropped by 47). |
| `src/backend/migrations/0047-agent-threads.ts` | Creates `projection_agent_threads`, copies tasks into it, drops `projection_agent_tasks`. |
| `src/backend/migrations/0048-agent-thread-branch.ts` | Adds branch columns to `projection_agent_threads`. |
| `src/backend/migrations/0054-agent-thread-routine.ts` | Adds `routine_id TEXT` to `projection_agent_threads` and the unique index `agent_threads_routine` on `(agent_id, routine_id)`. |
| `src/backend/migrations/0015-agent-usage.ts`, `0016-...`, `0058-agent-skill-loads.ts` | `agent_usage_records`, `agent_usage_checkpoints`, `agent_usage_activity`, `agent_usage_skill_loads`. |
| `src/backend/migrations/0032-agent-memory-selection.ts` | `agent_memory_selections`. |
| `src/backend/migrations/0060-agent-memory-site.ts` | Adds a `site` column and the index `agent_memories_site` to `projection_agent_memories`. |
| `src/backend/migrations/0065-thread-event-compaction.ts`, `0064-provider-history-compaction.ts` | 0065 creates the `thread_event_compaction` table (one row per thread). 0064 changes no table. It is a marker: CodeBot then stores a hash of each imported Codex and Claude item in `provider_history_staging`. |
| `src/backend/migrations/0069-messaging-sender-mode.ts` | Latest migration at the time of mapping. |
| `src/backend/migration-harness.ts` | Harness for released-schema upgrade tests: `releasedDatabaseCases`, `seedEveryTable`, `ROW_CHANGES`, `ROW_VALUES`, `healthProblems`, `readTableRows`. |
| `src/backend/released-schemas/releases.json` | Index of released schemas. |
| `src/backend/released-schemas/v0.1.12.sql`, `v0.1.15.sql`, `v0.1.18.sql`, `v0.2.1.sql` | Released new-install schema files (four at mapping time). |
| `src/backend/database/database-core.ts` | `DatabaseCore`: opens `codebot.db`, WAL, `dispatch`, `commandResult`, `deleteEventsAndReceipt`, `statement`, `connection`. |
| `src/backend/database/sqlite-transaction.ts` | `withTransaction` (sync, savepoints when nested) and `withTransactionAsync`. |
| `src/backend/database/statement-cache.ts` | `cachedStatement`, `forgetStatements`. |
| `src/backend/database/database-rows.ts` | `databaseRow`, `databaseRows`, `requiredStringColumn`, `decodeConversationMessageJson`. |
| `src/backend/database/agent-roster.ts` | `AgentRoster`: `listAgents`, `getAgent`, `replaceAgents`, `hardDeleteAgent`, `ensureThreadProjection`. Stores agents in `projection_agents.agent_json`. |
| `src/backend/database/agent-usage.ts` | `AgentUsage`: usage records and checkpoints. |
| `src/backend/database/agent-history-queries.ts` | Read queries over agent history. |
| `src/backend/database/conversation-queries.ts`, `conversation-writer.ts` | Read and write of thread messages (`projection_thread_messages`). |
| `src/backend/database/thread-replay.ts` | `ThreadReplay.rebuildThreadProjection(threadId)`: rebuilds one thread from events. |
| `src/backend/database/thread-message-fold.ts`, `thread-message-order.ts` | The replay fold and the message ordering (`refreshThreadOrder`). |
| `src/backend/database/thread-event-compaction.ts` | `ThreadEventCompaction.compactNext`: background removal of old `changedMessages` data. Started at boot and repeated every 6 hours by `src/backend/agent/boot-recovery.ts` (`THREAD_EVENT_COMPACTION_INTERVAL`). |
| `src/backend/database/thread-summaries.ts` | `ThreadSummaries`, `StoredThreadSummary`. |
| `src/backend/database/provider-sessions.ts`, `provider-history-store.ts` | Provider session rows and imported provider history staging. |
| `src/backend/database/mailbox-projection.ts` | Mailbox projection (`projection_mailbox_messages`, deliveries). |
| `src/backend/agent-store.ts` | `AgentStore`: agent records (`list`, `get`, `createAgent`, `duplicateAgent`, `saveReviewedProfile`, `setHidden`, `setAvatar`). |
| `src/backend/agent-threads/agent-thread-store.ts` | `AgentThreadStore`: data access for `projection_agent_threads` (task and thread records, branch, rename, close, reopen, delete). Exports `AgentThreadRecord`, `AgentThreadInput`, `AgentThreadBranchInput`, `ThreadListPosition`, `copyBranchMessages`. |
| `src/backend/agent-tasks/agent-tasks.ts` | `AgentTasks` (1143 lines): behavior of side threads. Tool names `start_task`, `message_task`, `close_task`. Branch, report, close, reopen, limits. Error classes `AgentTaskBranchFailed`, `AgentThreadLimitError`. |
| `src/backend/agent-waits/agent-wait-store.ts` | `AgentWaitStore`: SQL access to `agent_waits` (`list`, `get`, `open`, ...). Errors `AgentWaitError`, `AgentWaitLimitError`. |
| `src/backend/agent-waits/agent-waits.ts` | `AgentWaits`: tools `await_event`, `close_wait`, `list_waits`; `wokenWaitsPromptText`. |
| `src/backend/agent/thread-lifecycle.ts` | `ThreadLifecycle` (about 1700 lines): provider thread sessions, handoffs, runtime refresh, MCP sets. `ThreadOperationFailed`. |
| `src/backend/agent/turn-lifecycle.ts` | `TurnLifecycle` (about 3900 lines): one turn of a thread. `TurnHooks`, `TurnTiming`, `DeliveryStart`, `TurnOperationFailed`. |
| `src/backend/agent/turn-traces.ts` | `TurnTraces`: per-turn trace steps. `traceMessage`, `ToolOutcome`. |
| `packages/contracts/src/ipc-conversation-trace.ts` | Trace types (`ConversationTraceStep`, `ConversationTurnTrace`), step kinds, and the limits `CONVERSATION_TRACE_STEP_LIMIT` and `CONVERSATION_TRACE_TEXT_LIMIT` (both 500). |
| `src/backend/agent/turn-slots.ts`, `turn-context.ts` | `TurnSlots` (concurrency slots), `TurnContext`. |
| `src/backend/agent/thread-items.ts` | Helpers that map provider items to thread items and tool usage (`toThreadItem`, `toolUsage`, `codeBotTool`, `toolActivity`). |
| `src/backend/agent/thread-file-history.ts` | `ThreadFileHistory`, shell path helpers. |
| `src/backend/agent/history-tools.ts` | `codebot.history_search` and `codebot.history_read` (see agents doc). |
| `src/backend/agent/delete-agent-tool.ts`, `agent-removal.ts` | Agent deletion paths. |
| `src/backend/agent-data/agent-tables.ts` | `AgentTables` (396 lines): per-agent user tables. Provisions `codebot_metadata`, claims new tables, forgets removed ones. |
| `src/backend/agent-data/agent-database-rules.ts` | `checkAgentSql(sql, mode)`, `schemaChange`, `checkAgentParameters`. SQL scanner and keyword rules. |
| `src/backend/agent-data/agent-database-protocol.ts` | Wire types and `AGENT_DATABASE_LIMITS`, `AGENT_DATABASE_SCHEMA_VERSION = 1`, `AGENT_DATABASE_METADATA_TABLE`. |
| `src/backend/agent-data/agent-database-supervisor.ts` | `AgentDatabaseSupervisor`: starts and restarts the host process, kills it on deadline, re-queues work. |
| `src/backend/agent-data/agent-database-host.ts` | Host process entry (463 lines). Imports only `node:*` and `effect` at runtime. |
| `src/backend/agent-data/agent-database-version.test.ts` | Version test for the host. |
| `src/backend/projects/project-context.ts` | `AgentProjectContext` type, `setAgentProjectContextSource`, `agentProjectContext(agentId)`. A module-level source hook. |
| `src/backend/AGENTS.md` | Rules for migrations, transactions, size, the database host. Read before any DB change. |
| `docs/architecture/agents.md` | Product rules for threads, tasks, waits, routines, workflows (1654 lines). Section "Agent threads" starts at line 729. |
| `docs/architecture/events.md` | Covers **webhook routines** (route lifecycle, inbound requests). It does not describe the orchestration event log. |

## How it works

### Event log and projections

- Writes go through `CodeBotDatabase`, which calls `DatabaseCore.dispatch(commandId, events, project)`.
- `dispatch` does this, in one transaction (`withTransaction`):
  1. Reads `orchestration_command_receipts` for `commandId`. If a receipt exists, it returns the saved `result_json`. This makes retries safe.
  2. Inserts each event into `orchestration_events` (`event_id`, `command_id`, `aggregate_type`, `aggregate_id`, `event_type`, `occurred_at`, `payload_json`) and keeps the sequences.
  3. Calls `project(db, sequences)`. The projector writes the `projection_*` rows inside the same transaction.
  4. If any event row kept this `commandId`, it writes the receipt (`accepted_at`, `first_sequence`, `last_sequence`, `result_json`).
- `commandResult(commandId)` reads a receipt. `deleteEventsAndReceipt(commandId)` removes both for one command.
- `aggregate_type` and `aggregate_id` name what an event is about (for example, a thread or an agent).
- Projection tables are plain tables: `projection_agents` (with `agent_json`), `projection_threads`, `projection_agent_threads`, `projection_thread_messages`, `projection_turns`, `projection_deliveries`, `projection_mailbox_messages`, `projection_queue_state`, `projection_thread_reads`, `projection_thread_activities`, `projection_provider_sessions`, `projection_agent_routines`, and others (see `0008-baseline.ts`).
- `ThreadReplay.rebuildThreadProjection` rebuilds one thread's projection from its events. It runs inside a `dispatch` transaction.
- `thread-event-compaction.ts` removes old `changedMessages` items that a replay does not need. The rule uses `thread-message-fold.ts`. Run `bun scripts/thread-event-compaction-e2e.ts` after a change to the fold.

### Agent and chat thread records

- Agent: `projection_agents` (`agent_id`, `sort_order`, `agent_json`). `AgentRoster` reads and writes it. `AgentStore` (`src/backend/agent-store.ts`) holds the agent rules, such as creating, duplicating, reviewing a profile, hiding and setting an avatar.
- Chat thread: `projection_threads` (`thread_id`, `agent_id`, `title`, `active_turn_id`, `created_at`, `updated_at`, `last_event_sequence`; created in `0008-baseline.ts`). Messages are in `projection_thread_messages`, written by `conversation-writer.ts` and read by `conversation-queries.ts`. `ThreadReplay` and `thread-message-fold.ts` rebuild the messages from events.
- Side thread (task): a `projection_agent_threads` row that has the same `thread_id` as its `projection_threads` row. See "Side threads" below.

### Connection and transactions

- `DatabaseCore.initialize` opens `join(userDataPath, "codebot.db")`, sets `journal_mode = WAL`, `foreign_keys = ON`, `busy_timeout = 5000`, `synchronous = NORMAL`, and registers two SQL functions: `codebot_collapse_whitespace` and `codebot_lowercase`.
- `DatabaseCore.connection` throws if the database is not open. `statement(sql)` uses the statement cache.
- Transactions: use `withTransaction` or `withTransactionAsync` from `database/sqlite-transaction.ts`. Raw `BEGIN`, `COMMIT`, `ROLLBACK`, `SAVEPOINT` are rejected by a Biome rule (`no-raw-sqlite-transaction`).
- A nested `withTransaction` is a savepoint. Its error rolls back only that level and is thrown again.

### Migration runner

- `migrateCodeBotDatabase(db, options)` in `codebot-database-schema.ts`:
  1. `validateMigrationRegistry()`: versions must be contiguous from 8, starting at 8.
  2. Reads `schema_migrations`. `validateAppliedVersions` throws if a version below the newest is missing. A newer DB throws `NewerDatabaseError`.
  3. Runs each pending migration (`version > current` and `<= throughVersion`) in order.
  4. Each migration runs in `runMigration`: optional `PRAGMA foreign_keys = OFF` (only when `disableForeignKeys`), then `withTransaction` with `migration.up`, the `schema_migrations` insert, and `assertForeignKeys`. A new FK violation throws and rolls back. The FK setting is restored in `finally`.
  5. If `vacuumAfterCommit` is set and the DB is not new, it runs `wal_checkpoint(TRUNCATE)`, `VACUUM`, `wal_checkpoint(TRUNCATE)`. A VACUUM failure only logs a warning.
  6. If any migration ran, or the DB was not closed cleanly, it runs `quick_check(20)`. A failure throws the localized `error.backend.databaseIntegrity`.
- New databases run the same list from version 8. Every migration uses `CREATE ... IF NOT EXISTS`, so there is one build path (`src/backend/AGENTS.md`).
- `LATEST_SCHEMA_VERSION` is the last registry entry: **69** at mapping time.

### Schema history and parity

- `codebot-database-schema-history.json` stores each object's normalized SQL, keyed by version (for example `"8"`, with keys such as `"index agent_memories_agent"`).
- `codebot-database-schema-parity.test.ts` checks that a new DB matches the recorded history. If a new version is missing, the test prints the entry to add.
- A red test on an old recorded version means a shipped migration changed. Revert the migration. Do not edit its entry.
- A migration that alters, rebuilds or indexes a large table needs its version in `MEASURED_LARGE_TABLE_CHANGES` (per `AGENTS.md`, lines 99-104). The constant is not defined in `src/`, `scripts/` or `packages/` at check time, so no code enforces this rule that was found.

### Frozen migrations and CI

- `scripts/check-frozen-migrations.ts` (npm script `check:migrations`) compares `src/backend/migrations/` with the migrations in the newest `codebot-v*` release tag, using `git ls-tree` and `git show`.
- `scripts/frozen-migrations.ts` holds the shared logic (`frozenMigrationProblems`, `MIGRATIONS_DIR`).
- `scripts/check-frozen-migrations.test.ts` tests that script.
- Released schema fixtures: `scripts/released-schema-fixtures.ts` (writes `src/backend/released-schemas/releases.json`). `scripts/released-schema-versions.ts` lists versions.
- Large DB test: `scripts/migration-large-db-e2e.ts --from=<last version>`. Default size 1.5 GB; `--full` is 17 GB.

### Migration harness (released upgrade test)

- `released-schema-upgrade-migration.test.ts` upgrades each shipped release DB to the latest version.
- `migration-harness.ts`:
  - `releasedDatabaseCases()` lists the cases.
  - `buildReleasedDatabase`, `buildDatabaseAtVersion`, `latestAppliedVersion`.
  - `seedEveryTable(db)` puts generic rows in every table, from column types and CHECK rules (`readColumnConstraints`, `genericValue`).
  - `ROW_CHANGES` (per version): functions that make the same row change the migration makes.
  - `ROW_VALUES`: extra row values that only a new value can trigger.
  - `expectedRowsAfterUpgrade`, `actualRows`, `sortedRows`: the comparison.
  - `healthProblems`: `integrity_check`, `foreign_key_check`, and an FTS `integrity-check` insert.
  - `readTableShapes`, `readNormalizedDeclarations`: compare schema with a new install.
- Each migration also needs a focused test file (`src/backend/<name>-migration.test.ts`).

### Agents, roster and usage

- `projection_agents.agent_json` holds the whole `AgentSummary` as JSON. `AgentRoster` reads it with `listAgents` and `getAgent`. `replaceAgents(commandId, agents, eventType, modelChange?)` writes the roster through `dispatch`.
- `hardDeleteAgent(commandId, agentId, threadId, remainingAgents)` deletes an agent. Most tables keyed by agent id have **no foreign key**, so this method deletes their rows by hand (see `agent_waits` in `0034`).
- Agent usage: `agent_usage_records`, `agent_usage_checkpoints`, `agent_usage_activity` (0015), `agent_usage_skill_loads` (0058). Read by `database/agent-usage.ts` and `database/usage-report.ts`.
- Agent memory selection: `agent_memory_selections` (0032).

### Side threads (the "task" model)

- A side thread is one row in `projection_agent_threads` (migration 47). The wire still calls it a task.
- Key columns (from `0047-agent-threads.ts`): `thread_id` (PK, FK to `projection_threads`, cascade delete), `agent_id`, `legacy_task_id` (unique; the old task id), `origin` (`user` or `agent`), `title`, `title_source` (`auto`, `agent`, `user`), `outcome` (`completed`, `failed`, `interrupted`, or null), `error`, `created_at`, `updated_at`, `archived_at`, `last_event_sequence`.
- Indexes: `agent_threads_open` (agent, `updated_at` desc, where not archived) and `agent_threads_agent` (agent, `created_at` desc).
- Task id on the wire = `legacy_task_id ?? thread_id`.
- Migration 38 created `projection_agent_tasks`. Migration 47 copied rows that have a live thread, then dropped the table. Rows with no thread were not copied.
- Migration 48 adds `branch_source_thread_id`, `branch_source_message_id`, `branch_through_message_id` (all set, or none). The copy of a branch is a new side thread.
- Migration 54 adds `routine_id` and the unique index `agent_threads_routine` on `(agent_id, routine_id)`. `AgentThreadStore.threadForRoutine` and `AgentTasks.routineThread` use it.
- `AgentThreadStore` (`agent-thread-store.ts`) methods: `task`, `threadForRoutine`, `taskForThread`, `list`, `archivedPage`, `recent`, `executionThreads`, `openExecutionThreads`, `openTaskIds`, `taskIdsForAgent`, `threadIdsForAgent`, `titles`, `branchFor`, `branchSource`, `branch`, `create`, `rename`, `retitle`, `setOutcome`, `setError`, `touch`, `close`, `reopen`, `delete`, `deleteForAgent`.
- `AgentTasks` (`agent-tasks.ts`) implements `TaskLanes` for the drain scheduler. It owns:
  - tool names: `start_task`, `message_task`, `close_task` (schemas `startTaskToolSchema`, `messageTaskToolSchema`, `closeTaskToolSchema`);
  - limits: 8 unfinished and 8 kept finished tasks started by an agent (`AGENT_STARTED_UNFINISHED_TASKS`, `AGENT_STARTED_FINISHED_KEPT`), a per-agent limit of running task turns (`agentTaskLimit`), and an open-task cap from `INPUT_LIMITS.agentTasks` (50);
  - progress publish throttle `PROGRESS_PUBLISH_MS = 150`;
  - `branch`, `close`, `reopen`, `rename`, `delete`, `discard`, `turnEnd`, `markStopped`, `event`, `snapshot`, `archivedPage`, `read`.
- Closing a task sets `archived_at`. Reopening clears it. A closed task takes no more messages.
- A task's provider error goes into its `error` column. The next turn clears it.

### Waits

- A wait is work that an agent stopped while it waits for something outside the turn.
- Table `agent_waits` (migration 34): `wait_id` (PK), `agent_id` (no FK), `request_delivery_id`, `request_text`, `note`, `routine_id` (FK to `projection_agent_routines`, set null on delete), `created_at`, `woken_at`, `wake_delivery_id`.
- Every row is an open wait. Closing or cancelling deletes the row.
- `AgentWaitStore`: `list(agentId)` (ordered by `created_at`, `wait_id`), `get`, `open`, and related writes.
- `AgentWaits`: tools `await_event`, `close_wait`, `list_waits` (names in `AWAIT_EVENT_TOOL`, `CLOSE_WAIT_TOOL`, `LIST_WAITS_TOOL`). Limit: `INPUT_LIMITS.agentWaits`. A "near limit" note appears 3 slots before the limit (`NEAR_LIMIT_MARGIN = 3`).
- Methods: `list`, `cancel`, `sideThreadOfWait`, `markWoken(agentId, waitIds, deliveryId)`, `countByAgent`, `wokenBy(deliveryId)`, `handleTool`.

### Turn traces

- `TurnTraces` keeps one running trace per turn id in memory (`Map`). It is not stored in the database.
- Lifecycle: `begin(turnId, startedAt)`, then `observe(turnId, itemId, kind, event)` for each item, `toolOutcomes(turnId)`, then `take(turnId, endedAt)` returns `ConversationTurnTrace` (`startedAt`, `endedAt`, `steps`). `drop` and `clear` discard it.
- Each step has `id`, `kind`, `startedAt`, `endedAt` (set on first complete), and `failed`. Tool steps may also have `text`, `command` (redacted), `recipientAgentIds`, `error`.
- Limits: `CONVERSATION_TRACE_STEP_LIMIT` (500 steps) and `CONVERSATION_TRACE_TEXT_LIMIT` (500, text length). Both are in `packages/contracts/src/ipc-conversation-trace.ts`. The step kinds are `reasoning`, `tool` and `message`.
- `observe` ignores an empty item id or one longer than `INPUT_LIMITS.identifier`. A new step past the limit is dropped.
- `traceMessage(...)` builds trace data for a message (exported function).

### Thread and turn lifecycle

- `ThreadLifecycle` (`agent/thread-lifecycle.ts`) owns provider thread sessions for chat and side threads: approval policy, pending handoff (`consumePendingHandoff`), runtime refresh holds (`holdRuntimeRefresh`, `runtimeRefreshPending`), session rotation (`rotatesSession`), session retirement (`retireProviderSession`), MCP server sets and tool runtimes, and busy checks (`mainContextBusy`, `providerContextBusy`, `mainRunsBackgroundWork`).
- `TurnLifecycle` (`agent/turn-lifecycle.ts`) runs one turn: deliveries (`DeliveryStart`), timing (`TurnTiming`), failure causes (`FAILOVER_CAUSES`), streaming deltas (`isStreamingDelta`), and browser host hooks (`AgentBrowserHost`).
- `TurnSlots` limits concurrent turns across the server. `TurnContext` holds per-turn context.
- Hold reasons for a waiting task message (from `docs/architecture/agents.md`): `task-limit`, `agent-restarting`, `usage-limit`, `server-busy`, `agent-busy`, `one-turn`, `pending-runtime`.
- A queued provider change is stored as `pendingRuntime` on the agent. It applies when the drain starts the next message. The chat, task and channel sessions then get a handoff.

### Agent data tables (per-agent SQL)

- Agents can create their own SQLite tables through a tool. These live outside `codebot.db`.
- `AgentTables` (`agent-tables.ts`) keeps a `codebot_metadata` table with `table_name`, `owner_agent_id`, `created_at`. It claims new tables for an agent and forgets dropped ones. It uses an `AgentDatabaseSupervisor` to send each statement.
- `checkAgentSql(sql, mode)` (`agent-database-rules.ts`) scans the SQL and allows statements by mode:
  - `read`: `SELECT`, `VALUES`, `EXPLAIN`, and `WITH` whose final target is one of those;
  - `write`: also `INSERT`, `REPLACE`, `UPDATE`, `DELETE`, `CREATE`, `ALTER`, `DROP`.
  - Refused keywords are in `REFUSALS`. Parameter counts are checked by `checkAgentParameters`.
- `schemaChange(sql)` returns `create`, `drop`, `alter`, or null.
- `AGENT_DATABASE_LIMITS` (`agent-database-protocol.ts`): `maxSqlLength` 20000, `maxParameters` 100, `maxParameterBytes` 1,000,000, `maxRows` 500, `maxResultBytes` 256,000, `maxCellChars` 2000, `maxPageCount` 65,536, `statementDeadlineMs` 5000, `hostStartDeadlineMs` 15000, `queueWaitMs` 20000, `busyTimeoutMs` 2000.
- The host (`agent-database-host.ts`):
  - keeps at most `MAX_OPEN_DATABASES` = 8 open handles;
  - allows only the virtual table modules `fts5`, `fts5vocab`, `rtree`, `rtreecheck`;
  - denies the functions `load_extension`, `readfile`, `writefile`, `edit`, `fts3_tokenizer`;
  - checks `SCHEMA_VERSION` (1) and the table owner through `codebot_metadata`.
- The supervisor (`agent-database-supervisor.ts`) kills the host process at the deadline (`kill()` on the host handle) and re-sends queued work to a new host. A packaged build runs the host as an Electron `utilityProcess` (`AgentDatabaseHostProcess` seam).

### Projects

- `src/backend/projects/project-context.ts` has one type, `AgentProjectContext` (`projectId`, `projectName`, `mainFolder`, `folders`, `accessLevel` of type `ProjectAccessLevel`, `replyRule`, `instructions`).
- A module-level source function is set with `setAgentProjectContextSource(source)`. `agentProjectContext(agentId)` calls it. Default source returns null.
- No caller of `setAgentProjectContextSource` exists in the repository (searched all `.ts` files, excluding `node_modules`, at check time). Until a caller sets a source, `agentProjectContext` returns null.
- Fork code: `projects/project-context.ts` was added in commit `ce1b138cc` ("Add the project contract types and the agent project context"). That commit comes after the rename commit `3377172d0` ("Rename CodeBot to CodeBot").

## How to change it

### Add a database migration

1. Find the newest version in `registry.ts` (69 at mapping time). Use the next integer (70 if nothing newer exists). Versions must be contiguous.
2. Create `src/backend/migrations/0070-<kebab-name>.ts` exporting `migration: CodeBotMigration` with the same `version` and `name`. Keep `name` unique.
3. Import only `node:*`, `@codebot/logging`, `./runtime-values`, earlier migrations, and `import type` from `./migration`. Copy any other helper into the file.
4. Use `CREATE ... IF NOT EXISTS` for new objects, so a new install and an upgrade match.
5. Set `disableForeignKeys: true` only when you rebuild a table that others reference. Set `vacuumAfterCommit: true` only when the migration deletes a large part of the file.
6. Add the import and the entry to the `MIGRATIONS` array in `registry.ts`.
7. Add the new version to `codebot-database-schema-history.json`. The parity test prints the entry. Do not hand-write it if the test can print it.
8. If the migration changes, moves or deletes rows, add a function to `ROW_CHANGES` in `migration-harness.ts`. If a new value must be seeded, add a `ROW_VALUES` entry.
9. Add a focused test `src/backend/<name>-migration.test.ts` with data-preservation rows, the failure path and rollback.
10. For a large table, run `bun scripts/migration-large-db-e2e.ts --from=69` and put the result in the PR.
11. Run `bun run check:migrations` (CI job `Check`). Do not edit a migration that a `codebot-v*` tag has.

### Fix a bug in a shipped migration

- Do not edit the old file. Append a new migration that repairs each affected database and leaves unaffected databases alone.
- Add fixtures for each affected released schema.

### Add a column to side threads

- Pattern: migration 48. Add `ALTER TABLE projection_agent_threads ADD COLUMN ...` in a new migration.
- Then update `AgentThreadRecord`, the row mapping in `agent-thread-store.ts`, and the public mapping in `agent-tasks.ts` (`#publicTask`).
- If the wire shape changes, update `packages/contracts/src/team-protocol/` and the route, per `AGENTS.md` (joined servers rule).

### Add a new event type to the log

1. Choose an `aggregateType`, an `aggregateId`, and an `eventType` string.
2. Call `CodeBotDatabase.dispatch(commandId, events, project)` from the store. Use a new `commandId` per user action.
3. Write the matching `projection_*` row inside `project`, so that the projection and event commit together.
4. Update `ThreadReplay` (`thread-replay.ts`) if the new event changes a thread's chat.
5. Check `thread-message-fold.ts` if it changes the chat, and run the compaction e2e script.

### Add an agent wait tool or change its rule

- Edit `src/backend/agent-waits/agent-waits.ts`: add the tool name constant and a `z.strictObject` schema, then handle it in `handleTool`.
- Keep the limit check at `INPUT_LIMITS.agentWaits`.
- `src/backend/agent/codebot-tool-router.ts` does not import the wait or task tool constants. The file that routes these tool calls to `AgentWaits` and `AgentTasks` is not yet identified.
- Test with `scripts/agent-waits-tools-e2e.ts` and `scripts/agent-waits-side-thread-e2e.ts`.

### Change agent-data SQL rules

- Edit `checkAgentSql` and its keyword sets (`READ_KEYWORDS`, `WRITE_KEYWORDS`, `WITH_TARGETS`, `REFUSALS`) in `agent-database-rules.ts`.
- Edit denied functions or vtable modules in `agent-database-host.ts` (`DENIED_FUNCTIONS`, `ALLOWED_VTABLE_MODULES`).
- Run `src/backend/agent-data/agent-database-version.test.ts` and `scripts/agent-database-host-start-e2e.ts`.

### Add a new database controller

- Follow the rule in `src/backend/AGENTS.md`: one class per file in `database/`, kebab-case file name, an `<Name>Options` interface and `<Name>` class, `readonly #` fields, and a constructor that only assigns.
- Read `this.#core.connection` at each use. Do not cache the handle.
- Do not import `codebot-database.ts` from the controller.
- Register it in the `CodeBotDatabase` constructor and expose one method on the facade if callers need it.

### Add a thread or task query

- Add a method to `AgentThreadStore` (`agent-thread-store.ts`) with SQL against `projection_agent_threads`.
- Use `databaseRows` and `databaseRow` with a `toRecord`-style mapper. Avoid `any`.
- Keep order keys consistent with the indexes (`agent_threads_open`, `agent_threads_agent`).

## Gotchas

- **Released migrations are frozen.** `check:migrations` compares bytes with the newest `codebot-v*` tag. `AGENTS.md` says "newest `v*` release tag"; the script uses `codebot-v*`. Use the script's behavior.
- **Released migrations keep comments.** `AGENTS.md` bans new comments, but these files are exempt because the check compares them byte for byte.
- **No backup.** Do not write code that assumes a `codebot.db` backup. There is no automatic backup.
- **Large file.** One user DB can be 17 GB. Do not add a full-table rewrite or `VACUUM` without a reason. `VACUUM` needs about twice the file size in free disk.
- **Task means thread.** Code and wire use "task" for side threads. The model name is `AgentThreadRecord`. Keep wire names (`agent-tasks-v1`, `legacy_task_id`) unchanged.
- **Agent id has no foreign key** in most tables. Deleting an agent must delete rows by hand (`hardDeleteAgent`).
- **Migration 47 drops a table.** `projection_agent_tasks` no longer exists in the latest schema. Old code that queries it fails.
- **Migration 47 skips orphans.** A task row whose thread is missing is not copied. This is deliberate, so the FK check does not stop startup.
- **FK check after each migration.** A migration that adds a violation fails and rolls back. Violations that existed before the upgrade are logged but tolerated.
- **Newer DB refuses to open.** A DB whose top version is above `LATEST_SCHEMA_VERSION` throws `NewerDatabaseError`.
- **Facade line count.** `AGENTS.md` says the facade is about 560 lines. At mapping time `codebot-database.ts` has 691 lines. Do not add a new concern to it.
- **Several transaction owners.** `dispatch`, `deleteEventsAndReceipt`, `ThreadReplay.rebuildThreadProjection` (its own `withTransaction`, not `dispatch`), `ThreadEventCompaction` and the facade's `persistConversationAndMailbox` each hold a transaction. Keep each one atomic (`src/backend/AGENTS.md`, around line 142).
- **Turn traces are in memory.** `TurnTraces` is a `Map`, and `TurnLifecycle` is its caller. A restart drops open traces. Do not treat it as stored history.
- **Waits vanish when closed.** A closed or cancelled wait is deleted. There is no history table for waits.
- **Compaction is one-way.** Old `changedMessages` items are removed. A replay must still give the same chat, so change the fold and the compaction together.
- **Host process only.** `agent-database-host.ts` must import only `node:*` and `effect`. Do not add an import of the application DB or Electron.
- **Effect cannot stop blocked SQLite.** The supervisor kills the process at the deadline. A thread does not work for this.
- **`events.md` is not the event log.** It describes webhook routines. Read `docs/architecture/agents.md` for agent behavior.
- **`projects` has no caller yet.** The project context source has no caller in the repository at check time, so `agentProjectContext` always returns null.
- **Comments in this file.** The migrations and `AGENTS.md` allow comments only where a tool reads them. Keep code comment-free in changed lines.

## Unverified points

- Exact list of event types written to `orchestration_events` (not enumerated).
- `MEASURED_LARGE_TABLE_CHANGES` is not defined in `src/`, `scripts/` or `packages/` (searched at check time).
- Caller that routes wait and task tool calls to `AgentWaits` and `AgentTasks`. `codebot-tool-router.ts` does not import their constants.
- Whether every migration file listed in `registry.ts` has `disableForeignKeys` or `vacuumAfterCommit` set (only a few were read).
- Exact behavior of `thread-event-compaction.ts` (only the header rules in `AGENTS.md` were read).
- Whether `hardDeleteAgent` removes every per-agent table. It loops over a table list (`agent-roster.ts`, near line 124); the list was not read.
