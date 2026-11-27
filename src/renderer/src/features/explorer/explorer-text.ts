import type { ExplorerGitChange } from "@codebot/contracts/ipc";
import type { AppTextKey } from "@codebot/i18n";

const GIT_CHANGE_TEXT = {
  added: "explorer.git.change.added",
  modified: "explorer.git.change.modified",
  deleted: "explorer.git.change.deleted",
  renamed: "explorer.git.change.renamed",
  untracked: "explorer.git.change.untracked",
  conflicted: "explorer.git.change.conflicted",
  ignored: "explorer.git.change.ignored",
} as const satisfies Record<ExplorerGitChange, AppTextKey>;

export function explorerGitChangeText(change: ExplorerGitChange): (typeof GIT_CHANGE_TEXT)[ExplorerGitChange] {
  return GIT_CHANGE_TEXT[change];
}
