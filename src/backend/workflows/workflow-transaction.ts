import type { CodeBotDatabase } from "../codebot-database";
import { withTransaction } from "../database/sqlite-transaction";

export function workflowTransaction<T>(database: CodeBotDatabase, work: () => T): T {
  return withTransaction(database.connection, work);
}
