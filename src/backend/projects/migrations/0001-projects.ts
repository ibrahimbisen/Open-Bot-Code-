import type { ProjectMigration } from "./migration";

export const PROJECT_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS cb_projects (
    project_id TEXT NOT NULL PRIMARY KEY CHECK(length(project_id) BETWEEN 1 AND 128),
    name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 80),
    color TEXT CHECK(color IS NULL OR length(color) = 7),
    main_folder TEXT NOT NULL CHECK(length(main_folder) BETWEEN 1 AND 4096),
    additional_folders_json TEXT NOT NULL DEFAULT '[]'
      CHECK(json_valid(additional_folders_json) AND json_type(additional_folders_json) = 'array'),
    access_level TEXT NOT NULL DEFAULT 'normal' CHECK(access_level IN ('strict', 'normal', 'open')),
    default_runtime_json TEXT
      CHECK(default_runtime_json IS NULL
        OR (json_valid(default_runtime_json) AND json_type(default_runtime_json) = 'object')),
    reply_rule TEXT CHECK(reply_rule IS NULL OR length(reply_rule) BETWEEN 1 AND 2000),
    instructions TEXT NOT NULL DEFAULT '' CHECK(length(instructions) <= 32000),
    agent_ids_json TEXT NOT NULL DEFAULT '[]'
      CHECK(json_valid(agent_ids_json) AND json_type(agent_ids_json) = 'array'),
    owner_id TEXT CHECK(owner_id IS NULL OR length(owner_id) BETWEEN 1 AND 128),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    archived_at TEXT,
    last_event_sequence INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS cb_projects_created ON cb_projects(created_at, project_id);
  CREATE TABLE IF NOT EXISTS cb_project_chats (
    thread_id TEXT NOT NULL PRIMARY KEY CHECK(length(thread_id) BETWEEN 1 AND 255),
    runtime_json TEXT
      CHECK(runtime_json IS NULL OR (json_valid(runtime_json) AND json_type(runtime_json) = 'object')),
    user_archived INTEGER NOT NULL DEFAULT 0 CHECK(user_archived IN (0, 1)),
    pinned INTEGER NOT NULL DEFAULT 0 CHECK(pinned IN (0, 1)),
    unseen_outcome TEXT CHECK(unseen_outcome IS NULL OR unseen_outcome IN ('completed', 'failed')),
    updated_at TEXT NOT NULL,
    last_event_sequence INTEGER NOT NULL
  ) WITHOUT ROWID;
  CREATE INDEX IF NOT EXISTS cb_project_chats_unseen ON cb_project_chats(unseen_outcome)
    WHERE unseen_outcome IS NOT NULL;
`;

export const migration: ProjectMigration = {
  version: 1,
  name: "projects",
  up: (db) => db.exec(PROJECT_TABLES_SQL),
};
