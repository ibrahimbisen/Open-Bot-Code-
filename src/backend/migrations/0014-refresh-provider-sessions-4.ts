import { refreshProviderSessionsForDynamicTools } from "./0009-refresh-provider-sessions-1";
import type { CodeBotMigration } from "./migration";

export const migration: CodeBotMigration = {
  version: 14,
  name: "refresh-provider-sessions-4",
  up: refreshProviderSessionsForDynamicTools,
};
