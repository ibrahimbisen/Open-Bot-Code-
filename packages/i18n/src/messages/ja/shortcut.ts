import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/shortcut";

export const messages = {
  "shortcut.command.newChat": "新しいチャット",
  "shortcut.command.switchProject": "次のプロジェクトに切り替え",
  "shortcut.command.splitPanel": "パネルを分割",
  "shortcut.command.closePanel": "パネルを閉じる",
  "shortcut.command.openCommandMenu": "コマンドメニューを開く",
} as const satisfies PartialTranslation<typeof source>;
