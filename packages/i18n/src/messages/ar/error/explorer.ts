import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/explorer";

export const messages = {
  "error.explorer.outside": "هذا المسار ليس ضمن مجلدات المشروع.",
  "error.explorer.notFound": "الملف أو المجلد غير موجود.",
  "error.explorer.rootProtected": "لا يمكن إعادة تسمية مجلد المشروع أو حذفه هنا.",
  "error.explorer.invalidName": "هذا الاسم غير صالح لملف أو مجلد.",
  "error.explorer.notFile": "هذا المسار ليس ملفًا.",
  "error.explorer.notDirectory": "هذا المسار ليس مجلدًا.",
  "error.explorer.exists": "يوجد ملف أو مجلد باسم {name} في هذا المجلد بالفعل.",
  "error.explorer.unknownAgent": "وكيل شجرة الملفات هذه غير موجود.",
  "error.explorer.gitTimeout": "استغرق أمر Git وقتًا طويلًا فأُوقف.",
  "error.explorer.gitFailed": "أبلغ Git عن خطأ: {detail}",
  "error.explorer.serverUnsupported": "لا يستطيع هذا الخادم عرض الملفات. حدّث الخادم.",
  "error.explorer.clientUnsupported": "لا يستطيع هذا الإصدار من OpenBot Code عرض ملفات الخادم.",
  "error.explorer.remoteFailed": "تعذّر على الخادم إكمال إجراء الملف هذا. حاول مرة أخرى.",
} as const satisfies PartialTranslation<typeof source>;
