import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/lock";

export const messages = {
  "error.lock.claudeStrictNoSandbox":
    "يتطلب الوضع الصارم صندوق عزل Claude، ولا يستطيع Claude تشغيله على هذا الكمبيوتر: {reason}. اختر عادي أو مفتوح في إعدادات المشروع، أو اختر مزوّدًا آخر.",
  "error.lock.claudeNoSandboxStrict":
    "يتطلب الوضع الصارم صندوق عزل Claude، ولا يستطيع Claude تشغيله على هذا الكمبيوتر. اختر عادي أو مفتوح في إعدادات المشروع، أو اختر مزوّدًا آخر.",
  "error.lock.providerNeedsMacOrLinux":
    "لا يستطيع {provider} إبقاء الوكيل داخل مجلدات مشروعه على هذا الكمبيوتر، لذا لا يشغّله OpenBot Code في وضع {level}. اختر مفتوح في إعدادات المشروع، أو اختر Claude أو Codex.",
  "error.lock.providerToolMissing":
    "يتطلب وضع {level} الأداة {tool}، ولم يجدها OpenBot Code. ثبّتها أو اختر مفتوح في إعدادات المشروع.",
  "error.lock.containerMissing":
    "يتطلب الوضع الصارم مع حاوية Docker أو Podman، ولم يجد OpenBot Code أيًّا منهما. ثبّت أحدهما أو اختر عادي في إعدادات المشروع.",
  "error.lock.containerFailed":
    "لم تبدأ الحاوية الخاصة بهذا المشروع: {reason}. اختر عادي في إعدادات المشروع، أو أصلح أداة الحاويات.",
  "error.lock.codexStrictNeedsSandbox":
    "يتطلب الوضع الصارم صندوق عزل Codex، ولا يستطيع Codex تشغيله على هذا الكمبيوتر. اختر عادي أو مفتوح في إعدادات المشروع، أو اختر مزوّدًا آخر.",
  "error.lock.commandAsk": "صندوق عزل نظام التشغيل غير متاح لهذا الوكيل، لذا يحتاج هذا الأمر إلى موافقتك.",
} as const satisfies PartialTranslation<typeof source>;
