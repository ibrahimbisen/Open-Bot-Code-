import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/serverMode";

export const messages = {
  "serverMode.switch.label": "أين يعمل الوكلاء",
  "serverMode.switch.thisComputer": "هذا الكمبيوتر",
  "serverMode.switch.homeServer": "الخادم المنزلي",
  "serverMode.switch.homeServerNamed": "تشغيل الوكلاء على {name}",
  "serverMode.switch.noHomeServer": "لا يوجد خادم منزلي بعد. اختر للانضمام إلى واحد.",
  "serverMode.switch.useComputer": "تشغيل الوكلاء على هذا الكمبيوتر",
  "serverMode.switch.useHomeServer": "تشغيل الوكلاء على الخادم المنزلي",
} as const satisfies PartialTranslation<typeof source>;
