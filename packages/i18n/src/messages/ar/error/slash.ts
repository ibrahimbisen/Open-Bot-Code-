import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/slash";

export const messages = {
  "error.slash.resumeUnsupported": "لا يستطيع هذا الوكيل استئناف محادثة محفوظة من محرّكه.",
  "error.slash.resumeEngineOff": "المحرّك لا يعمل. شغّله وحاول مرة أخرى.",
  "error.slash.sessionNotFound": "هذه المحادثة المحفوظة لم تعد موجودة. حدّث القائمة واختر أخرى.",
  "error.slash.sessionInUse": "توجد محادثة في OpenBot Code تستخدم هذه المحادثة المحفوظة بالفعل.",
  "error.slash.remoteFailed": "تعذّر على الخادم إكمال هذا الأمر. حاول مرة أخرى.",
  "error.slash.serverUnsupported": "لا يستطيع هذا الخادم سرد أوامر الشرطة المائلة. حدّث الخادم.",
} as const satisfies PartialTranslation<typeof source>;
