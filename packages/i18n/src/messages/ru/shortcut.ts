import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/shortcut";

export const messages = {
  "shortcut.command.newChat": "Новый чат",
  "shortcut.command.switchProject": "Перейти к следующему проекту",
  "shortcut.command.splitPanel": "Разделить панель",
  "shortcut.command.closePanel": "Закрыть панель",
  "shortcut.command.openCommandMenu": "Открыть меню команд",
} as const satisfies PartialTranslation<typeof source>;
