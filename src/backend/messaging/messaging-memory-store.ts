import { INPUT_LIMITS } from "@codebot/contracts/input-limits";
import type { MemoryEntry } from "@codebot/contracts/ipc";
import { sourceText } from "@codebot/i18n/source";
import type { CodeBotDatabase } from "../codebot-database";
import { MemoryStore, type MemoryTables } from "../memory-store";

const MESSAGING_MEMORY_TABLES: MemoryTables = {
  table: "projection_messaging_memories",
  ownerColumn: "connection_id",
  ownerKey: "connectionId",
  aggregateType: "messaging-memory",
  limit: () => INPUT_LIMITS.messagingMemories,
  limitMessage: (limit) => sourceText("error.messaging.memoryLimit", { limit }),
};

export class MessagingMemoryStore extends MemoryStore {
  constructor(database: CodeBotDatabase) {
    super(database, MESSAGING_MEMORY_TABLES);
  }

  saveFromTool(
    connectionId: string,
    input: { text: string; memoryId?: string; sourceTurnId: string; commandId: string },
  ): MemoryEntry {
    const memory = this.saveAutomaticEntry(connectionId, input);
    if (!memory) throw new Error(sourceText("error.backend.memoryGone"));
    return memory;
  }
}
