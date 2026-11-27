import { jsonPayloadCodecs } from "./json-payload-codec";

export const EXPLORER_CAPABILITY = "explorer-v1";

export const EXPLORER_ROUTES = {
  roots: "/v1/explorer/roots",
  list: "/v1/explorer/list",
  stat: "/v1/explorer/stat",
  read: "/v1/explorer/read",
  write: "/v1/explorer/write",
  create: "/v1/explorer/create",
  rename: "/v1/explorer/rename",
  trash: "/v1/explorer/trash",
  gitStatus: "/v1/explorer/git/status",
  gitLog: "/v1/explorer/git/log",
  gitCommitFiles: "/v1/explorer/git/commit-files",
  gitDiff: "/v1/explorer/git/diff",
} as const;

export type ExplorerOperation = keyof typeof EXPLORER_ROUTES;

export const EXPLORER_CODECS = jsonPayloadCodecs(EXPLORER_ROUTES);
