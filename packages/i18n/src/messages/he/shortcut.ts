import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/shortcut";

export const messages = {
  "shortcut.command.newChat": "צ'אט חדש",
  "shortcut.command.switchProject": "מעבר לפרויקט הבא",
  "shortcut.command.splitPanel": "פיצול החלונית",
  "shortcut.command.closePanel": "סגירת החלונית",
  "shortcut.command.openCommandMenu": "פתיחת תפריט הפקודות",
} as const satisfies PartialTranslation<typeof source>;
