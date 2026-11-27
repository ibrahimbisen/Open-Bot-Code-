import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/shortcut";

export const messages = {
  "shortcut.command.newChat": "محادثة جديدة",
  "shortcut.command.switchProject": "التبديل إلى المشروع التالي",
  "shortcut.command.splitPanel": "تقسيم اللوحة",
  "shortcut.command.closePanel": "إغلاق اللوحة",
  "shortcut.command.openCommandMenu": "فتح قائمة الأوامر",
} as const satisfies PartialTranslation<typeof source>;
