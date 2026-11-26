import type { CodeBotMigration } from "./migration";

export const V67_THREAD_MESSAGE_ORDINAL_INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS thread_messages_ordinal ON projection_thread_messages(thread_id, ordinal);
`;

export const migration: CodeBotMigration = {
  version: 67,
  name: "thread-message-ordinal-index",
  up: (db) => db.exec(V67_THREAD_MESSAGE_ORDINAL_INDEX_SQL),
};
