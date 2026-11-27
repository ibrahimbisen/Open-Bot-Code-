import type { DatabaseSync } from "node:sqlite";
import { isDynamicRecord, isNumber } from "@codebot/contracts/runtime-values";
import { createCodeBotLogger, toLogValue } from "@codebot/logging";
import { assertQuickCheckResult, NewerDatabaseError } from "../codebot-database-schema";
import { withTransaction } from "../database/sqlite-transaction";
import type { ProjectMigration } from "./migrations/migration";
import { PROJECT_MIGRATIONS } from "./migrations/registry";

const logger = createCodeBotLogger("project-schema");

const FIRST_PROJECT_SCHEMA_VERSION = 1;

export const PROJECT_SCHEMA_VERSION_TABLE = "cb_schema_migrations";

const VERSION_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS ${PROJECT_SCHEMA_VERSION_TABLE} (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL
  )
`;

export interface ProjectMigrationOptions {
  appliedAt?: string;
  migrations?: readonly ProjectMigration[];
}

export class NewerProjectSchemaError extends NewerDatabaseError {
  constructor(databaseVersion: number, supportedVersion: number) {
    super(databaseVersion, supportedVersion);
    this.message = `CodeBot project tables version ${databaseVersion} are newer than this application supports (${supportedVersion}).`;
  }
}

export function migrateProjectTables(db: DatabaseSync, options: ProjectMigrationOptions = {}): void {
  const migrations = options.migrations ?? PROJECT_MIGRATIONS;
  validateRegistry(migrations);
  const appliedAt = options.appliedAt ?? new Date().toISOString();
  const applied = readAppliedVersions(db);
  const latest = migrations[migrations.length - 1]?.version ?? 0;
  validateAppliedVersions(applied, latest);
  const current = applied.at(-1) ?? 0;
  const pending = migrations.filter((migration) => migration.version > current);

  for (const migration of pending) {
    try {
      withTransaction(db, () => {
        db.exec(VERSION_TABLE_SQL);
        const violationsBefore = countForeignKeyViolations(db);
        migration.up(db, appliedAt);
        db.prepare(`INSERT INTO ${PROJECT_SCHEMA_VERSION_TABLE}(version, name, applied_at) VALUES (?, ?, ?)`).run(
          migration.version,
          migration.name,
          appliedAt,
        );
        const added = countForeignKeyViolations(db) - violationsBefore;
        if (added > 0) throw new Error(`CodeBot project table migration produced ${added} foreign-key violation(s).`);
      });
    } catch (error) {
      logger.error(`CodeBot project table migration to version ${migration.version} failed.`, toLogValue(error));
      throw new Error(`CodeBot project table migration to version ${migration.version} failed.`, { cause: error });
    }
  }

  if (pending.length > 0) {
    assertQuickCheckResult(
      db
        .prepare("PRAGMA quick_check(20)")
        .all()
        .map((row) => (isDynamicRecord(row) ? row.quick_check : row)),
    );
  }
}

function validateRegistry(migrations: readonly ProjectMigration[]): void {
  let expected = FIRST_PROJECT_SCHEMA_VERSION;
  const names = new Set<string>();
  for (const migration of migrations) {
    if (!Number.isInteger(migration.version) || migration.version !== expected)
      throw new Error(
        `CodeBot project table migrations must be contiguous from version ${FIRST_PROJECT_SCHEMA_VERSION}; expected ${expected}.`,
      );
    if (names.has(migration.name))
      throw new Error(`CodeBot project table migration ${migration.name} is listed twice.`);
    names.add(migration.name);
    expected += 1;
  }
}

function readAppliedVersions(db: DatabaseSync): number[] {
  const hasTable = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(PROJECT_SCHEMA_VERSION_TABLE);
  if (!hasTable) return [];
  return db
    .prepare(`SELECT version FROM ${PROJECT_SCHEMA_VERSION_TABLE} ORDER BY version`)
    .all()
    .map((row) => {
      if (!isDynamicRecord(row) || !isNumber(row.version) || !Number.isInteger(row.version))
        throw new Error("CodeBot project tables contain an invalid migration version.");
      return row.version;
    });
}

function validateAppliedVersions(versions: readonly number[], latest: number): void {
  const newest = versions.at(-1) ?? 0;
  if (newest > latest) throw new NewerProjectSchemaError(newest, latest);
  const applied = new Set(versions);
  for (let version = FIRST_PROJECT_SCHEMA_VERSION; version <= newest; version += 1) {
    if (!applied.has(version))
      throw new Error(`CodeBot project table migration history is missing version ${version}.`);
  }
  if (versions.some((version) => version < FIRST_PROJECT_SCHEMA_VERSION))
    throw new Error("CodeBot project tables contain an invalid migration version.");
}

function countForeignKeyViolations(db: DatabaseSync): number {
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name GLOB 'cb_*' ORDER BY name")
    .all()
    .flatMap((row) => (isDynamicRecord(row) && typeof row.name === "string" ? [row.name] : []));
  let count = 0;
  for (const table of tables)
    count += db.prepare(`PRAGMA foreign_key_check("${table.replaceAll('"', '""')}")`).all().length;
  return count;
}
