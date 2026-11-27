import type { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface MigrationChain {
  name: string;
  directory: string;
}

export interface MigrationReport {
  applied: { chain: string; file: string }[];
  changed: { chain: string; file: string }[];
  unknown: { chain: string; file: string }[];
  total: number;
}

interface AppliedRow {
  name: string;
  checksum: string;
}

const VERSION_TABLE = `CREATE TABLE IF NOT EXISTS account_schema_migrations (
  chain TEXT NOT NULL,
  name TEXT NOT NULL,
  checksum TEXT NOT NULL,
  applied_at INTEGER NOT NULL,
  PRIMARY KEY (chain, name)
)`;

class MigrationError extends Error {
  constructor(
    readonly chain: string,
    readonly file: string,
    cause: unknown,
  ) {
    super(`Migration ${chain}/${file} failed: ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = "MigrationError";
  }
}

export function migrateDatabase(
  sqlite: Database,
  chains: readonly MigrationChain[],
  now: () => number = Date.now,
): MigrationReport {
  sqlite.exec(VERSION_TABLE);
  const report: MigrationReport = { applied: [], changed: [], unknown: [], total: 0 };
  const readApplied = sqlite.query<AppliedRow, [string]>(
    "SELECT name, checksum FROM account_schema_migrations WHERE chain = ?",
  );
  const record = sqlite.query<null, [string, string, string, number]>(
    "INSERT INTO account_schema_migrations(chain, name, checksum, applied_at) VALUES (?, ?, ?, ?)",
  );
  for (const chain of chains) {
    if (!existsSync(chain.directory)) throw new Error(`The migration folder ${chain.directory} does not exist.`);
    const files = readdirSync(chain.directory)
      .filter((name) => name.endsWith(".sql"))
      .sort();
    const applied = new Map(readApplied.all(chain.name).map((row) => [row.name, row.checksum]));
    for (const file of files) {
      const sql = readFileSync(join(chain.directory, file), "utf8");
      const checksum = createHash("sha256").update(sql.replaceAll("\r\n", "\n")).digest("hex");
      const known = applied.get(file);
      applied.delete(file);
      report.total += 1;
      if (known !== undefined) {
        if (known !== checksum) report.changed.push({ chain: chain.name, file });
        continue;
      }
      sqlite.exec("BEGIN IMMEDIATE");
      try {
        sqlite.exec(sql);
        record.run(chain.name, file, checksum, now());
        sqlite.exec("COMMIT");
      } catch (error) {
        if (sqlite.inTransaction) sqlite.exec("ROLLBACK");
        throw new MigrationError(chain.name, file, error);
      }
      report.applied.push({ chain: chain.name, file });
    }
    for (const file of applied.keys()) report.unknown.push({ chain: chain.name, file });
  }
  return report;
}
