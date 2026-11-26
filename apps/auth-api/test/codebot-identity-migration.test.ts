import { readdirSync, readFileSync } from "node:fs";
import type { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { migratedDatabase } from "./sqlite-d1";

const databases: DatabaseSync[] = [];

afterEach(() => {
  for (const database of databases.splice(0)) database.close();
});

function codebotChain(): string[] {
  return readdirSync(new URL("../migrations-codebot/", import.meta.url)).sort();
}

function applyCodebotChain(database: DatabaseSync): void {
  for (const name of codebotChain()) {
    database.exec(readFileSync(new URL(`../migrations-codebot/${name}`, import.meta.url), "utf8"));
  }
}

describe("CodeBot identity migration", () => {
  it("adds the identity tables on top of the upstream chain and keeps existing users", () => {
    const database = migratedDatabase();
    databases.push(database);
    database.exec(`
      INSERT INTO users(id, identity_key, email, name, avatar_url, created_at, updated_at)
      VALUES ('owner', 'email:owner@example.test', 'owner@example.test', 'Owner', NULL, 1, 1);
    `);
    applyCodebotChain(database);
    expect(database.prepare("SELECT COUNT(*) AS n FROM users").get()).toEqual({ n: 1 });
    const tables = database
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND (name LIKE 'account_identities' OR name LIKE 'account_login_%' OR name LIKE 'account_device_%' OR name LIKE 'account_service_%') ORDER BY name",
      )
      .all()
      .map((row) => row.name);
    expect(tables).toEqual([
      "account_device_logins",
      "account_identities",
      "account_login_codes",
      "account_login_flows",
      "account_service_state",
    ]);
  });

  it("allows one identity for each user and refuses an unknown status", () => {
    const database = migratedDatabase();
    databases.push(database);
    applyCodebotChain(database);
    database.exec(`
      INSERT INTO users(id, identity_key, email, name, avatar_url, created_at, updated_at)
      VALUES ('u1', 'identity:a#1', 'one@a', NULL, NULL, 1, 1), ('u2', 'identity:a#2', 'two@a', NULL, NULL, 1, 1);
      INSERT INTO account_identities(issuer, subject, user_id, checked_at, attempted_at, created_at, updated_at)
      VALUES ('https://a', '1', 'u1', 1, 1, 1, 1);
    `);
    const insert = (issuer: string, subject: string, user: string, status: string) =>
      database
        .prepare(
          `INSERT INTO account_identities(issuer, subject, user_id, status, checked_at, attempted_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, 1, 1, 1, 1)`,
        )
        .run(issuer, subject, user, status);
    expect(() => insert("https://a", "other", "u1", "active")).toThrow();
    expect(() => insert("https://a", "2", "u2", "paused")).toThrow();
    expect(() => insert("https://a", "2", "u2", "blocked")).not.toThrow();
  });

  it("deletes the identity when the user is deleted", () => {
    const database = migratedDatabase();
    databases.push(database);
    applyCodebotChain(database);
    database.exec(`
      INSERT INTO users(id, identity_key, email, name, avatar_url, created_at, updated_at)
      VALUES ('u1', 'identity:a#1', 'one@a', NULL, NULL, 1, 1);
      INSERT INTO account_identities(issuer, subject, user_id, checked_at, attempted_at, created_at, updated_at)
      VALUES ('https://a', '1', 'u1', 1, 1, 1, 1);
      DELETE FROM users WHERE id = 'u1';
    `);
    expect(database.prepare("SELECT COUNT(*) AS n FROM account_identities").get()).toEqual({ n: 0 });
  });
});
