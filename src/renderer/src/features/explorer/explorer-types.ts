import type { ExplorerGitChange } from "@codebot/contracts/ipc";

export interface ExplorerDiffTarget {
  root: string;
  path: string;
  name: string;
  originalPath: string | null;
  hash: string | null;
  change: ExplorerGitChange;
  label: string | null;
}
