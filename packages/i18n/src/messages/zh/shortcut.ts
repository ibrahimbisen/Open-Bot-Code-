import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/shortcut";

export const messages = {
  "shortcut.command.newChat": "新建聊天",
  "shortcut.command.switchProject": "切换到下一个项目",
  "shortcut.command.splitPanel": "拆分面板",
  "shortcut.command.closePanel": "关闭面板",
  "shortcut.command.openCommandMenu": "打开命令菜单",
} as const satisfies PartialTranslation<typeof source>;
