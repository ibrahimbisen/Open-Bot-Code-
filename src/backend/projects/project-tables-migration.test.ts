// @vitest-environment node
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync, type SQLOutputValue } from "node:sqlite";
import { Effect } from "effect";
import { afterEach, describe, expect, it } from "vitest";
import { CodeBotDatabase } from "../codebot-database";
import { LATEST_SCHEMA_VERSION, migrateCodeBotDatabase, NewerDatabaseError } from "../codebot-database-schema";
import type { ProjectMigration } from "./migrations/migration";
import { PROJECT_MIGRATIONS } from "./migrations/registry";
import { migrateProjectTables, NewerProjectSchemaError, PROJECT_SCHEMA_VERSION_TABLE } from "./project-schema";

const CORE_APPLIED_AT = "2026-11-01T10:00:00.000Z";
const FIRST_APPLIED_AT = "2026-11-26T10:00:00.000Z";
const SECOND_APPLIED_AT = "2026-11-27T10:00:00.000Z";
const NOW = "2026-11-26T12:00:00.000Z";

const databases: DatabaseSync[] = [];
const facades: CodeBotDatabase[] = [];
const roots: string[] = [];

afterEach(async () => {
  for (const db of databases.splice(0)) db.close();
  for (const facade of facades.splice(0)) facade.close();
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

type Contents = Record<string, Record<string, SQLOutputValue>[]>;

function coreDatabase(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  databases.push(db);
  db.exec("PRAGMA foreign_keys = ON");
  migrateCodeBotDatabase(db, { appliedAt: CORE_APPLIED_AT });
  db.prepare(
    `INSERT INTO orchestration_events
       (event_id, command_id, aggregate_type, aggregate_id, event_type, occurred_at, payload_json)
     VALUES ('event-1', 'command-1', 'agents', 'agents', 'agent.created', ?, '{"agents":[]}')`,
  ).run(NOW);
  db.prepare(
    `INSERT INTO orchestration_command_receipts (command_id, accepted_at, first_sequence, last_sequence, result_json)
     VALUES ('command-1', ?, 1, 1, 'null')`,
  ).run(NOW);
  db.prepare(
    `INSERT INTO projection_threads
       (thread_id, agent_id, title, active_turn_id, created_at, updated_at, last_event_sequence)
     VALUES ('thread-main', 'agent-1', 'Ada 界', NULL, ?, ?, 1), ('thread-chat', 'agent-1', 'Chat', NULL, ?, ?, 1)`,
  ).run(NOW, NOW, NOW, NOW);
  db.prepare(
    `INSERT INTO projection_agents
       (agent_id, thread_id, model, updated_at, sort_order, agent_json, last_event_sequence)
     VALUES ('agent-1', 'thread-main', 'model-1', ?, 0, ?, 1)`,
  ).run(NOW, JSON.stringify({ id: "agent-1", name: "Ada 界", projectId: "project-1" }));
  db.prepare(
    `INSERT INTO projection_agent_threads
       (thread_id, agent_id, legacy_task_id, origin, title, title_source, outcome, error, created_at, updated_at,
        archived_at, last_event_sequence)
     VALUES ('thread-chat', 'agent-1', NULL, 'user', 'Fix the "cart" 界', 'auto', NULL, NULL, ?, ?, NULL, 1)`,
  ).run(NOW, NOW);
  return db;
}

function tableNames(db: DatabaseSync): string[] {
  return db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all()
    .map((row) => String(row.name));
}

function contents(db: DatabaseSync, tables = tableNames(db)): Contents {
  return Object.fromEntries(
    tables
      .filter((table) => !table.startsWith("agent_memory_search"))
      .map((table) => [table, db.prepare(`SELECT * FROM "${table}"`).all()]),
  );
}

function declarations(db: DatabaseSync, projectTables: boolean): Record<string, SQLOutputValue>[] {
  return db
    .prepare(
      `SELECT type, name, tbl_name, sql FROM sqlite_master
       WHERE name NOT LIKE 'sqlite_%' AND (tbl_name GLOB 'cb_*') = ? ORDER BY type, name`,
    )
    .all(projectTables ? 1 : 0);
}

function projectVersions(db: DatabaseSync): Record<string, SQLOutputValue>[] {
  return db.prepare(`SELECT version, name, applied_at FROM ${PROJECT_SCHEMA_VERSION_TABLE} ORDER BY version`).all();
}

function coreVersions(db: DatabaseSync): number[] {
  return db
    .prepare("SELECT version FROM schema_migrations ORDER BY version")
    .all()
    .map((row) => Number(row.version));
}

function expectHealthy(db: DatabaseSync): void {
  expect(db.prepare("PRAGMA foreign_keys").get()).toEqual({ foreign_keys: 1 });
  expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  expect(db.prepare("PRAGMA integrity_check").get()).toEqual({ integrity_check: "ok" });
  expect(coreVersions(db).at(-1)).toBe(LATEST_SCHEMA_VERSION);
}

function insertProject(db: DatabaseSync, values: Record<string, SQLOutputValue> = {}): void {
  const row = {
    project_id: "project-1",
    name: "Web shop 界",
    color: "#3b82f6",
    main_folder: "C:\\Users\\dev\\Projects\\web shop",
    additional_folders_json: '["D:\\\\design \\"tokens\\""]',
    access_level: "normal",
    default_runtime_json: '{"provider":"claude","model":"model-1","reasoningEffort":"medium"}',
    reply_rule: "Reply short.",
    instructions: "Use TypeScript.",
    agent_ids_json: '["agent-1"]',
    owner_id: null,
    created_at: NOW,
    updated_at: NOW,
    archived_at: null,
    last_event_sequence: 2,
    ...values,
  };
  const columns = Object.keys(row);
  db.prepare(`INSERT INTO cb_projects (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`).run(
    ...Object.values(row),
  );
}

function insertChat(db: DatabaseSync, values: Record<string, SQLOutputValue> = {}): void {
  const row = {
    thread_id: "thread-chat",
    runtime_json: null,
    user_archived: 1,
    pinned: 1,
    unseen_outcome: "failed",
    updated_at: NOW,
    last_event_sequence: 3,
    ...values,
  };
  const columns = Object.keys(row);
  db.prepare(`INSERT INTO cb_project_chats (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`).run(
    ...Object.values(row),
  );
}

const SECOND_MIGRATION: ProjectMigration = {
  version: 2,
  name: "test-project-note",
  up: (db) => {
    db.exec("ALTER TABLE cb_projects ADD COLUMN test_note TEXT");
    db.exec("CREATE TABLE cb_test_notes (note_id TEXT NOT NULL PRIMARY KEY, project_id TEXT NOT NULL)");
    db.exec(
      "INSERT INTO cb_test_notes (note_id, project_id) SELECT 'note:' || project_id, project_id FROM cb_projects",
    );
  },
};

const THIRD_MIGRATION: ProjectMigration = {
  version: 3,
  name: "test-project-third",
  up: (db) => db.exec("CREATE TABLE cb_test_third (id TEXT NOT NULL PRIMARY KEY)"),
};

const WITH_SECOND = [...PROJECT_MIGRATIONS, SECOND_MIGRATION];

describe("project table migrations", () => {
  it("makes the project tables on a new database after the core migrations", () => {
    const db = coreDatabase();
    const coreBefore = declarations(db, false);
    const versionsBefore = coreVersions(db);

    migrateProjectTables(db, { appliedAt: FIRST_APPLIED_AT });

    expect(declarations(db, true).map((row) => `${row.type} ${row.name}`)).toEqual([
      "index cb_project_chats_unseen",
      "index cb_projects_created",
      "table cb_project_chats",
      "table cb_projects",
      `table ${PROJECT_SCHEMA_VERSION_TABLE}`,
    ]);
    expect(projectVersions(db)).toEqual([{ version: 1, name: "projects", applied_at: FIRST_APPLIED_AT }]);
    expect(declarations(db, false)).toEqual(coreBefore);
    expect(coreVersions(db)).toEqual(versionsBefore);
    expect(contents(db, ["cb_projects", "cb_project_chats"])).toEqual({ cb_projects: [], cb_project_chats: [] });
    expectHealthy(db);
  });

  it("keeps every row of the core tables", () => {
    const db = coreDatabase();
    const before = contents(db);

    migrateProjectTables(db, { appliedAt: FIRST_APPLIED_AT });

    expect(contents(db, Object.keys(before))).toEqual(before);
    expectHealthy(db);
  });

  it("upgrades from one version to the next and keeps the rows of the earlier version", () => {
    const db = coreDatabase();
    migrateProjectTables(db, { appliedAt: FIRST_APPLIED_AT });
    insertProject(db);
    insertChat(db);
    const coreBefore = contents(
      db,
      tableNames(db).filter((table) => !table.startsWith("cb_")),
    );
    const projectBefore = contents(db, ["cb_projects", "cb_project_chats"]);

    migrateProjectTables(db, { appliedAt: SECOND_APPLIED_AT, migrations: WITH_SECOND });

    expect(projectVersions(db)).toEqual([
      { version: 1, name: "projects", applied_at: FIRST_APPLIED_AT },
      { version: 2, name: "test-project-note", applied_at: SECOND_APPLIED_AT },
    ]);
    expect(contents(db, ["cb_projects", "cb_project_chats", "cb_test_notes"])).toEqual({
      cb_projects: projectBefore.cb_projects?.map((row) => ({ ...row, test_note: null })),
      cb_project_chats: projectBefore.cb_project_chats,
      cb_test_notes: [{ note_id: "note:project-1", project_id: "project-1" }],
    });
    expect(contents(db, Object.keys(coreBefore))).toEqual(coreBefore);
    expectHealthy(db);
  });

  it("rolls back a migration that fails in its change, with its version row, then retries", () => {
    const db = coreDatabase();
    migrateProjectTables(db, { appliedAt: FIRST_APPLIED_AT });
    insertProject(db);
    insertChat(db);
    const before = contents(db);
    const declared = declarations(db, true);
    const failing: ProjectMigration = {
      ...SECOND_MIGRATION,
      up: (database, appliedAt) => {
        SECOND_MIGRATION.up(database, appliedAt);
        database.exec("DELETE FROM cb_projects");
        throw new Error("late failure");
      },
    };

    expect(() =>
      migrateProjectTables(db, { appliedAt: SECOND_APPLIED_AT, migrations: [...PROJECT_MIGRATIONS, failing] }),
    ).toThrow("project table migration to version 2 failed");

    expect(contents(db)).toEqual(before);
    expect(declarations(db, true)).toEqual(declared);
    expect(projectVersions(db)).toEqual([{ version: 1, name: "projects", applied_at: FIRST_APPLIED_AT }]);
    expect(db.isTransaction).toBe(false);
    expectHealthy(db);

    migrateProjectTables(db, { appliedAt: SECOND_APPLIED_AT, migrations: WITH_SECOND });

    expect(projectVersions(db).map((row) => row.version)).toEqual([1, 2]);
    expect(db.prepare("SELECT project_id, name, test_note FROM cb_projects").all()).toEqual([
      { project_id: "project-1", name: "Web shop 界", test_note: null },
    ]);
    expectHealthy(db);
  });

  it("rolls back a migration whose version row cannot be written", () => {
    const db = coreDatabase();
    migrateProjectTables(db, { appliedAt: FIRST_APPLIED_AT });
    insertProject(db);
    const before = contents(db);
    const declared = declarations(db, true);
    db.exec(`CREATE TEMP TRIGGER fail_version BEFORE INSERT ON ${PROJECT_SCHEMA_VERSION_TABLE} WHEN new.version = 2
      BEGIN SELECT RAISE(ABORT, 'version row refused'); END;`);

    expect(() => migrateProjectTables(db, { appliedAt: SECOND_APPLIED_AT, migrations: WITH_SECOND })).toThrow(
      "project table migration to version 2 failed",
    );

    expect(contents(db)).toEqual(before);
    expect(declarations(db, true)).toEqual(declared);
    db.exec("DROP TRIGGER fail_version");
    migrateProjectTables(db, { appliedAt: SECOND_APPLIED_AT, migrations: WITH_SECOND });
    expect(projectVersions(db).map((row) => row.version)).toEqual([1, 2]);
    expectHealthy(db);
  });

  it("leaves no project table and no version table when the first migration fails", () => {
    const db = coreDatabase();
    const before = contents(db);
    const first = PROJECT_MIGRATIONS[0];
    if (!first) throw new Error("The project chain has no first migration.");
    const failing: ProjectMigration = {
      ...first,
      up: (database, appliedAt) => {
        first.up(database, appliedAt);
        throw new Error("first failure");
      },
    };

    expect(() => migrateProjectTables(db, { appliedAt: FIRST_APPLIED_AT, migrations: [failing] })).toThrow(
      "project table migration to version 1 failed",
    );

    expect(declarations(db, true)).toEqual([]);
    expect(contents(db)).toEqual(before);
    expectHealthy(db);

    migrateProjectTables(db, { appliedAt: FIRST_APPLIED_AT });
    expect(projectVersions(db).map((row) => row.version)).toEqual([1]);
  });

  it("changes nothing on a second start", () => {
    const db = coreDatabase();
    migrateProjectTables(db, { appliedAt: FIRST_APPLIED_AT });
    insertProject(db);
    insertChat(db);
    const before = contents(db);
    const declared = [...declarations(db, true), ...declarations(db, false)];

    migrateCodeBotDatabase(db, { appliedAt: SECOND_APPLIED_AT });
    migrateProjectTables(db, { appliedAt: SECOND_APPLIED_AT });

    expect(contents(db)).toEqual(before);
    expect([...declarations(db, true), ...declarations(db, false)]).toEqual(declared);
    expect(projectVersions(db)).toEqual([{ version: 1, name: "projects", applied_at: FIRST_APPLIED_AT }]);
    expectHealthy(db);
  });

  it("refuses project tables from a newer application and changes nothing", () => {
    const db = coreDatabase();
    migrateProjectTables(db, { appliedAt: FIRST_APPLIED_AT });
    insertProject(db);
    db.prepare(`INSERT INTO ${PROJECT_SCHEMA_VERSION_TABLE} (version, name, applied_at) VALUES (2, 'later', ?)`).run(
      SECOND_APPLIED_AT,
    );
    const before = contents(db);

    expect(() => migrateProjectTables(db)).toThrow(NewerProjectSchemaError);
    expect(() => migrateProjectTables(db)).toThrow(NewerDatabaseError);
    expect(() => migrateProjectTables(db)).toThrow("newer than this application supports (1)");
    expect(contents(db)).toEqual(before);
  });

  it("refuses a version history with a gap or an invalid version", () => {
    const db = coreDatabase();
    migrateProjectTables(db, {
      appliedAt: FIRST_APPLIED_AT,
      migrations: [...WITH_SECOND, THIRD_MIGRATION],
    });
    db.exec(`DELETE FROM ${PROJECT_SCHEMA_VERSION_TABLE} WHERE version = 2`);
    const before = contents(db);

    expect(() => migrateProjectTables(db, { migrations: [...WITH_SECOND, THIRD_MIGRATION] })).toThrow(
      "missing version 2",
    );
    expect(contents(db)).toEqual(before);

    db.exec(`DELETE FROM ${PROJECT_SCHEMA_VERSION_TABLE}`);
    db.exec(`INSERT INTO ${PROJECT_SCHEMA_VERSION_TABLE} (version, name, applied_at) VALUES (0, 'zero', 'now')`);
    expect(() => migrateProjectTables(db)).toThrow("invalid migration version");
  });

  it("refuses a registry that is not contiguous or names a migration two times", () => {
    const db = coreDatabase();

    expect(() => migrateProjectTables(db, { migrations: [...PROJECT_MIGRATIONS, THIRD_MIGRATION] })).toThrow(
      "must be contiguous from version 1; expected 2",
    );
    expect(() =>
      migrateProjectTables(db, { migrations: [...PROJECT_MIGRATIONS, { ...SECOND_MIGRATION, name: "projects" }] }),
    ).toThrow("is listed twice");
    expect(declarations(db, true)).toEqual([]);
  });

  it("refuses a bad project row and a bad chat row", () => {
    const db = coreDatabase();
    migrateProjectTables(db, { appliedAt: FIRST_APPLIED_AT });

    expect(() => insertProject(db, { project_id: "" })).toThrow("CHECK constraint failed");
    expect(() => insertProject(db, { name: "" })).toThrow("CHECK constraint failed");
    expect(() => insertProject(db, { name: "x".repeat(81) })).toThrow("CHECK constraint failed");
    expect(() => insertProject(db, { color: "blue" })).toThrow("CHECK constraint failed");
    expect(() => insertProject(db, { main_folder: "" })).toThrow("CHECK constraint failed");
    expect(() => insertProject(db, { additional_folders_json: "{" })).toThrow("CHECK constraint failed");
    expect(() => insertProject(db, { additional_folders_json: "{}" })).toThrow("CHECK constraint failed");
    expect(() => insertProject(db, { access_level: "locked" })).toThrow("CHECK constraint failed");
    expect(() => insertProject(db, { default_runtime_json: "[]" })).toThrow("CHECK constraint failed");
    expect(() => insertProject(db, { reply_rule: "" })).toThrow("CHECK constraint failed");
    expect(() => insertProject(db, { instructions: "x".repeat(32_001) })).toThrow("CHECK constraint failed");
    expect(() => insertProject(db, { agent_ids_json: '"agent-1"' })).toThrow("CHECK constraint failed");
    insertProject(db, { default_runtime_json: null, reply_rule: null, color: null });
    expect(() => insertProject(db)).toThrow("UNIQUE constraint failed");

    expect(() => insertChat(db, { thread_id: "" })).toThrow("CHECK constraint failed");
    expect(() => insertChat(db, { user_archived: 2 })).toThrow("CHECK constraint failed");
    expect(() => insertChat(db, { pinned: -1 })).toThrow("CHECK constraint failed");
    expect(() => insertChat(db, { unseen_outcome: "interrupted" })).toThrow("CHECK constraint failed");
    expect(() => insertChat(db, { runtime_json: "[1]" })).toThrow("CHECK constraint failed");
    insertChat(db, { unseen_outcome: null });
    expect(() => insertChat(db)).toThrow("UNIQUE constraint failed");
    expectHealthy(db);
  });

  it("keeps the project rows when a core thread or agent is deleted", () => {
    const db = coreDatabase();
    migrateProjectTables(db, { appliedAt: FIRST_APPLIED_AT });
    insertProject(db);
    insertChat(db);
    const before = contents(db, ["cb_projects", "cb_project_chats"]);

    db.exec("DELETE FROM projection_threads WHERE thread_id = 'thread-chat'");
    db.exec("DELETE FROM projection_agents WHERE agent_id = 'agent-1'");

    expect(db.prepare("SELECT thread_id FROM projection_agent_threads").all()).toEqual([]);
    expect(contents(db, ["cb_projects", "cb_project_chats"])).toEqual(before);
    expectHealthy(db);
  });

  it("runs after the core migrations when the database opens, and a restart changes nothing", async () => {
    const root = await mkdtemp(join(tmpdir(), "codebot-project-tables-"));
    roots.push(root);
    const first = new CodeBotDatabase(root);
    facades.push(first);
    await Effect.runPromise(first.initialize());
    expect(projectVersions(first.connection).map((row) => row.version)).toEqual(
      PROJECT_MIGRATIONS.map((migration) => migration.version),
    );
    expect(coreVersions(first.connection).at(-1)).toBe(LATEST_SCHEMA_VERSION);
    first.dispatch(
      "project-test-command",
      [{ aggregateType: "project", aggregateId: "project-1", eventType: "project.created", payload: { name: "界" } }],
      (db, sequences) => {
        insertProject(db, { last_event_sequence: sequences[0] ?? 0 });
        return null;
      },
    );
    expect(first.compactThreadEvents().done).toBe(true);
    const before = contents(first.connection);
    const declared = [...declarations(first.connection, true), ...declarations(first.connection, false)];
    first.close();

    const second = new CodeBotDatabase(root);
    facades.push(second);
    await Effect.runPromise(second.initialize());

    expect(contents(second.connection)).toEqual(before);
    expect([...declarations(second.connection, true), ...declarations(second.connection, false)]).toEqual(declared);
    expect(second.commandResult("project-test-command")).toBeNull();
    expect(second.hasAggregateEvents("project", "project-1")).toBe(true);
    expectHealthy(second.connection);
  });
});
