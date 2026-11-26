import type { DatabaseSync } from "node:sqlite";
import { isDynamicRecord, isNumber } from "@codebot/contracts/runtime-values";
import { sourceText } from "@codebot/i18n/source";
import { createCodeBotLogger, toLogValue } from "@codebot/logging";
import { withTransaction } from "./database/sqlite-transaction";
import type { CodeBotMigration } from "./migrations/migration";
import { MIGRATIONS } from "./migrations/registry";

const BASELINE_SCHEMA_VERSION = 8;

export interface CodeBotMigrationOptions {
  appliedAt?: string;
  warn?: (message: string, error: unknown) => void;
  closedCleanly?: boolean;
  throughVersion?: number;
}

const logger = createCodeBotLogger("codebot-database-schema");

export const LATEST_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1]?.version ?? BASELINE_SCHEMA_VERSION;

export function codeBotDatabaseNeedsMigration(db: DatabaseSync): boolean {
  if (!hasExistingSchema(db)) return true;
  const currentVersion = latestAppliedVersion(readAppliedVersions(db));
  return MIGRATIONS.some((migration) => migration.version > currentVersion);
}

export function migrateCodeBotDatabase(db: DatabaseSync, options: CodeBotMigrationOptions = {}): void {
  validateMigrationRegistry();
  const appliedAt = options.appliedAt ?? new Date().toISOString();
  const isNewDatabase = !hasExistingSchema(db);
  const appliedVersions = readAppliedVersions(db);
  validateAppliedVersions(appliedVersions);
  const currentVersion = latestAppliedVersion(appliedVersions);
  const throughVersion = options.throughVersion ?? LATEST_SCHEMA_VERSION;
  const pending = MIGRATIONS.filter(
    (migration) => migration.version > currentVersion && migration.version <= throughVersion,
  );
  let violations: Map<string, number> | undefined;

  for (const migration of pending) {
    try {
      violations ??= readOldForeignKeyViolations(db);
      violations = runMigration(db, migration, appliedAt, violations);
    } catch (error) {
      logger.error(`CodeBot database migration to version ${migration.version} failed.`, toLogValue(error));
      throw new Error(`CodeBot database migration to version ${migration.version} failed.`, {
        cause: error,
      });
    }

    if (migration.vacuumAfterCommit && !isNewDatabase) {
      try {
        db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
        db.exec("VACUUM");
        db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
      } catch (error) {
        const warn = options.warn ?? ((message: string, cause: unknown) => logger.warn(message, toLogValue(cause)));
        warn(`CodeBot database migration to version ${migration.version} succeeded, but VACUUM failed.`, error);
      }
    }
  }

  if (pending.length > 0 || !options.closedCleanly) assertQuickCheck(db);
}

function validateMigrationRegistry(): void {
  let expectedVersion = BASELINE_SCHEMA_VERSION;
  for (const migration of MIGRATIONS) {
    if (!Number.isInteger(migration.version) || migration.version !== expectedVersion) {
      throw new Error(
        `CodeBot database migrations must be contiguous from version ${BASELINE_SCHEMA_VERSION}; expected ${expectedVersion}.`,
      );
    }
    expectedVersion += 1;
  }
}

function hasExistingSchema(db: DatabaseSync): boolean {
  return Boolean(
    db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' LIMIT 1").get(),
  );
}

function readAppliedVersions(db: DatabaseSync): number[] {
  const hasMigrationTable = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'")
    .get();
  if (!hasMigrationTable) return [];
  return db
    .prepare("SELECT version FROM schema_migrations ORDER BY version")
    .all()
    .map((row) => {
      if (!isDynamicRecord(row) || !isNumber(row.version) || !Number.isInteger(row.version)) {
        throw new Error("CodeBot database contains an invalid schema migration version.");
      }
      return row.version;
    });
}

export class NewerDatabaseError extends Error {
  constructor(databaseVersion: number, supportedVersion: number) {
    super(`CodeBot database version ${databaseVersion} is newer than this application supports (${supportedVersion}).`);
  }
}

function validateAppliedVersions(versions: number[]): void {
  const newestVersion = versions.at(-1) ?? 0;
  if (newestVersion > LATEST_SCHEMA_VERSION) {
    throw new NewerDatabaseError(newestVersion, LATEST_SCHEMA_VERSION);
  }

  const baselineAndLater = versions.filter((version) => version >= BASELINE_SCHEMA_VERSION);
  if (baselineAndLater.length === 0) return;
  const applied = new Set(baselineAndLater);
  for (let version = BASELINE_SCHEMA_VERSION; version <= newestVersion; version += 1) {
    if (!applied.has(version)) {
      throw new Error(`CodeBot database migration history is missing version ${version}.`);
    }
  }
}

function latestAppliedVersion(versions: number[]): number {
  const baselineAndLater = versions.filter((version) => version >= BASELINE_SCHEMA_VERSION);
  return baselineAndLater.at(-1) ?? BASELINE_SCHEMA_VERSION - 1;
}

function runMigration(
  db: DatabaseSync,
  migration: CodeBotMigration,
  appliedAt: string,
  violationsBefore: ReadonlyMap<string, number>,
): Map<string, number> {
  if (migration.disableForeignKeys) db.exec("PRAGMA foreign_keys = OFF");
  try {
    return withTransaction(db, () => {
      migration.up(db, appliedAt);
      db.prepare("INSERT INTO schema_migrations(version, applied_at) VALUES (?, ?)").run(migration.version, appliedAt);
      return assertForeignKeys(db, violationsBefore);
    });
  } finally {
    if (migration.disableForeignKeys) db.exec("PRAGMA foreign_keys = ON");
  }
}

function assertForeignKeys(db: DatabaseSync, before: ReadonlyMap<string, number>): Map<string, number> {
  const violations = readForeignKeyViolations(db);
  const added = [...violations]
    .map(([reference, count]) => [reference, count - (before.get(reference) ?? 0)] as const)
    .filter(([, count]) => count > 0);
  if (added.length > 0) {
    const total = added.reduce((sum, [, count]) => sum + count, 0);
    const references = added.map(([reference]) => reference).join(", ");
    throw new Error(`CodeBot database migration produced ${total} foreign-key violation(s) in ${references}.`);
  }
  return violations;
}

function readForeignKeyViolations(db: DatabaseSync): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of db.prepare("PRAGMA foreign_key_check").all()) {
    const reference = isDynamicRecord(row) ? `${String(row.table)} -> ${String(row.parent)}` : "unknown";
    counts.set(reference, (counts.get(reference) ?? 0) + 1);
  }
  return counts;
}

function readOldForeignKeyViolations(db: DatabaseSync): Map<string, number> {
  const violations = readForeignKeyViolations(db);
  if (violations.size > 0) {
    logger.warn("The CodeBot database has foreign-key violations from before this upgrade. They stay as they are.", {
      violations: Object.fromEntries(violations),
    });
  }
  return violations;
}

function assertQuickCheck(db: DatabaseSync): void {
  assertQuickCheckResult(
    db
      .prepare("PRAGMA quick_check(20)")
      .all()
      .map((row) => (isDynamicRecord(row) ? row.quick_check : row)),
  );
}

export function assertQuickCheckResult(problems: readonly unknown[]): void {
  if (problems.length === 1 && problems[0] === "ok") return;
  logger.error("The CodeBot database failed its integrity check.", { problems });
  throw new Error(sourceText("error.backend.databaseIntegrity"));
}
