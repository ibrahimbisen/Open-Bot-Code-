import type { DatabaseSync } from "node:sqlite";

export interface ProjectMigration {
  readonly version: number;
  readonly name: string;
  readonly up: (db: DatabaseSync, appliedAt: string) => void;
}
