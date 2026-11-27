import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { isTurnStepDetail, TURN_STEP_DETAIL_LIMITS, type TurnStepDetail } from "@codebot/contracts/ipc";
import { isString } from "@codebot/contracts/runtime-values";
import { withTransaction } from "./database/sqlite-transaction";

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS turn_step_details (
    turn_id TEXT NOT NULL,
    step_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    thread_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    bytes INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    detail_json TEXT NOT NULL,
    PRIMARY KEY (turn_id, step_id)
  );
  CREATE INDEX IF NOT EXISTS turn_step_details_thread ON turn_step_details(thread_id);
  CREATE INDEX IF NOT EXISTS turn_step_details_agent ON turn_step_details(agent_id);
  CREATE INDEX IF NOT EXISTS turn_step_details_created ON turn_step_details(created_at);
`;

export const TURN_STEP_DETAILS_FILE = "turn-step-details.db";
const DEFAULT_BYTE_LIMIT = 256 * 1024 * 1024;
const PRUNE_TARGET = 0.8;
const PRUNE_EVERY_WRITES = 200;

export interface TurnStepDetailRecord {
  agentId: string;
  threadId: string;
  turnId: string;
  detail: TurnStepDetail;
  bytes: number;
}

export class TurnStepDetailsStore {
  readonly #path: string;
  readonly #byteLimit: number;
  #database: DatabaseSync | null = null;
  #writes = 0;

  constructor(path: string, byteLimit = DEFAULT_BYTE_LIMIT) {
    this.#path = path;
    this.#byteLimit = byteLimit;
  }

  #open(): DatabaseSync {
    if (this.#database) return this.#database;
    if (this.#path !== ":memory:") mkdirSync(dirname(this.#path), { recursive: true });
    const database = new DatabaseSync(this.#path);
    database.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;");
    database.exec(SCHEMA);
    this.#database = database;
    this.prune();
    return database;
  }

  record({ agentId, threadId, turnId, detail, bytes }: TurnStepDetailRecord): void {
    const database = this.#open();
    const position = database
      .prepare("SELECT COUNT(*) AS steps FROM turn_step_details WHERE turn_id = ?")
      .get(turnId)?.steps;
    if (typeof position === "number" && position >= TURN_STEP_DETAIL_LIMITS.steps) return;
    database
      .prepare(
        `INSERT INTO turn_step_details (turn_id, step_id, agent_id, thread_id, position, bytes, created_at, detail_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(turn_id, step_id) DO UPDATE SET bytes = excluded.bytes, detail_json = excluded.detail_json`,
      )
      .run(
        turnId,
        detail.stepId,
        agentId,
        threadId,
        typeof position === "number" ? position : 0,
        bytes,
        new Date().toISOString(),
        JSON.stringify(detail),
      );
    this.#writes += 1;
    if (this.#writes % PRUNE_EVERY_WRITES === 0) this.prune();
  }

  read(agentId: string, turnId: string): TurnStepDetail[] {
    const rows = this.#open()
      .prepare("SELECT detail_json FROM turn_step_details WHERE turn_id = ? AND agent_id = ? ORDER BY position")
      .all(turnId, agentId);
    return rows.flatMap((row) => {
      const text = row.detail_json;
      if (!isString(text)) return [];
      try {
        const detail = JSON.parse(text);
        return isTurnStepDetail(detail) ? [detail] : [];
      } catch {
        return [];
      }
    });
  }

  deleteThread(threadId: string): void {
    this.#open().prepare("DELETE FROM turn_step_details WHERE thread_id = ?").run(threadId);
  }

  deleteAgent(agentId: string): void {
    this.#open().prepare("DELETE FROM turn_step_details WHERE agent_id = ?").run(agentId);
  }

  deleteTurn(turnId: string): void {
    this.#open().prepare("DELETE FROM turn_step_details WHERE turn_id = ?").run(turnId);
  }

  storedBytes(): number {
    const total = this.#open().prepare("SELECT COALESCE(SUM(bytes), 0) AS total FROM turn_step_details").get()?.total;
    return typeof total === "number" ? total : 0;
  }

  prune(): void {
    const database = this.#database;
    if (!database) return;
    let total = this.storedBytes();
    if (total <= this.#byteLimit) return;
    const target = this.#byteLimit * PRUNE_TARGET;
    withTransaction(database, () => {
      const turns = database
        .prepare(
          `SELECT turn_id, SUM(bytes) AS bytes, MIN(created_at) AS created_at FROM turn_step_details
           GROUP BY turn_id ORDER BY created_at`,
        )
        .iterate();
      const remove = database.prepare("DELETE FROM turn_step_details WHERE turn_id = ?");
      const stale: string[] = [];
      for (const turn of turns) {
        if (total <= target) break;
        if (!isString(turn.turn_id)) continue;
        stale.push(turn.turn_id);
        total -= typeof turn.bytes === "number" ? turn.bytes : 0;
      }
      for (const turnId of stale) remove.run(turnId);
    });
  }

  close(): void {
    this.#database?.close();
    this.#database = null;
  }
}
