import { Database, type SQLQueryBindings, type Statement } from "bun:sqlite";
import type { DynamicRecord } from "@codebot/contracts/runtime-values";

interface Execution<Row> {
  columns: string[];
  rows: Row[];
  changes: number;
  lastRowId: number;
  durationMs: number;
}

interface ChangeCounters {
  total: number;
  changes: number;
  last_row_id: number;
}

export interface SqliteD1Database extends D1Database {
  readonly sqlite: Database;
  transaction<A>(work: () => A): A;
  close(): void;
}

export function openSqliteDatabase(filePath: string): Database {
  const sqlite = new Database(filePath, { create: true });
  sqlite.exec("PRAGMA journal_mode = WAL");
  sqlite.exec("PRAGMA synchronous = NORMAL");
  sqlite.exec("PRAGMA foreign_keys = ON");
  sqlite.exec("PRAGMA busy_timeout = 5000");
  return sqlite;
}

export function sqliteD1(sqlite: Database): SqliteD1Database {
  return new SqliteDatabase(sqlite);
}

function toBinding(value: unknown): SQLQueryBindings {
  if (value === null || typeof value === "string" || typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  throw new TypeError(`D1_TYPE_ERROR: Type '${typeof value}' not supported for value '${String(value)}'`);
}

class SqliteStatement implements D1PreparedStatement {
  constructor(
    readonly database: SqliteDatabase,
    readonly sql: string,
    readonly values: readonly SQLQueryBindings[] = [],
  ) {}

  bind(...values: unknown[]): D1PreparedStatement {
    return new SqliteStatement(this.database, this.sql, values.map(toBinding));
  }

  first<T>(column?: string): Promise<T | null> {
    return this.database.settle(() => {
      if (column === undefined) return this.database.execute<T>(this.sql, this.values).rows[0] ?? null;
      const row = this.database.execute<{ [name: string]: T }>(this.sql, this.values).rows[0];
      if (!row) return null;
      if (!(column in row)) throw new Error(`D1_COLUMN_NOTFOUND: Column not found (${column})`);
      return row[column] ?? null;
    });
  }

  run<T>(): Promise<D1Result<T>> {
    return this.database.settle(() => this.database.result(this.database.execute<T>(this.sql, this.values)));
  }

  all<T>(): Promise<D1Result<T>> {
    return this.run<T>();
  }

  raw<T = unknown[]>(options: { columnNames: true }): Promise<[string[], ...T[]]>;
  raw<T = unknown[]>(options?: { columnNames?: false }): Promise<T[]>;
  raw(options?: { columnNames?: boolean }): Promise<unknown[]> {
    return this.database.settle(() => {
      const execution = this.database.execute<DynamicRecord>(this.sql, this.values);
      const rows = execution.rows.map((row) => execution.columns.map((column) => row[column]));
      return options?.columnNames ? [execution.columns, ...rows] : rows;
    });
  }
}

class SqliteDatabase implements SqliteD1Database {
  readonly #counters: Statement<ChangeCounters, []>;
  #closed = false;

  constructor(readonly sqlite: Database) {
    this.#counters = sqlite.query<ChangeCounters, []>(
      "SELECT total_changes() AS total, changes() AS changes, last_insert_rowid() AS last_row_id",
    );
  }

  prepare(query: string): D1PreparedStatement {
    return new SqliteStatement(this, query);
  }

  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
    return this.settle(() =>
      this.transaction(() =>
        statements.map((statement) => {
          if (!(statement instanceof SqliteStatement) || statement.database !== this) {
            throw new Error("A batch statement is not from this database.");
          }
          return this.result(this.execute<T>(statement.sql, statement.values));
        }),
      ),
    );
  }

  exec(query: string): Promise<D1ExecResult> {
    return this.settle(() => {
      const started = performance.now();
      this.sqlite.exec(query);
      return { count: query.split(";").filter((part) => part.trim()).length, duration: performance.now() - started };
    });
  }

  withSession(): D1DatabaseSession {
    throw new Error("D1 sessions are not available on SQLite.");
  }

  dump(): Promise<ArrayBuffer> {
    return Promise.reject(new Error("D1 dump is not available on SQLite."));
  }

  transaction<A>(work: () => A): A {
    if (this.sqlite.inTransaction) return work();
    this.sqlite.exec("BEGIN IMMEDIATE");
    try {
      const value = work();
      this.sqlite.exec("COMMIT");
      return value;
    } catch (error) {
      if (this.sqlite.inTransaction) this.sqlite.exec("ROLLBACK");
      throw error;
    }
  }

  close(): void {
    if (this.#closed) return;
    this.#closed = true;
    this.sqlite.exec("PRAGMA optimize");
    this.sqlite.close();
  }

  settle<A>(work: () => A): Promise<A> {
    try {
      if (this.#closed) throw new Error("The account database is closed.");
      return Promise.resolve(work());
    } catch (error) {
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
  }

  execute<Row>(sql: string, values: readonly SQLQueryBindings[]): Execution<Row> {
    const started = performance.now();
    const before = this.#readCounters();
    const statement = this.sqlite.query<Row, SQLQueryBindings[]>(sql);
    const rows = statement.all(...values);
    const after = this.#readCounters();
    return {
      columns: statement.columnNames,
      rows,
      changes: after.total > before.total ? after.changes : 0,
      lastRowId: after.last_row_id,
      durationMs: performance.now() - started,
    };
  }

  result<Row>(execution: Execution<Row>): D1Result<Row> {
    return {
      success: true,
      results: execution.rows,
      meta: {
        duration: execution.durationMs,
        changes: execution.changes,
        last_row_id: execution.lastRowId,
        changed_db: execution.changes > 0,
        size_after: 0,
        rows_read: execution.rows.length,
        rows_written: execution.changes,
      },
    };
  }

  #readCounters(): ChangeCounters {
    return this.#counters.get() ?? { total: 0, changes: 0, last_row_id: 0 };
  }
}
