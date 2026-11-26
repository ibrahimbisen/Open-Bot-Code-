import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/window";

export const messages = {
  "window.localHostTitle": "CodeBot – المضيف المحلي",
  "window.localClientTitle": "CodeBot – العميل المحلي",
  "window.computerUsePermissionTitle": "تشغيل التحكم في الحاسوب",
  "window.rendererStoppedTitle": "توقف CodeBot عن العمل",
  "window.rendererStoppedBody": "توقفت النافذة عدة مرات. محادثاتك محفوظة، ووكلاؤك يواصلون العمل.",
  "window.rendererStoppedReload": "إعادة التحميل",
} as const satisfies PartialTranslation<typeof source>;
