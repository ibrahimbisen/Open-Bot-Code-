import { migration as migration0001 } from "./0001-projects";
import type { ProjectMigration } from "./migration";

export const PROJECT_MIGRATIONS: readonly ProjectMigration[] = [migration0001];
