import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/advanced";

export const messages = {
  "error.advanced.unsupported": "لا يدعم هذا الخادم مفاتيح الميزات المتقدمة. حدّث الخادم.",
  "error.advanced.invalidChange": "تغيير الميزة المتقدمة غير صالح.",
  "error.advanced.featureOff":
    "هذه الأداة غير متاحة لأن الميزة معطّلة. يمكن للمستخدم تفعيلها من الإعدادات > الميزات المتقدمة.",
} as const satisfies PartialTranslation<typeof source>;
