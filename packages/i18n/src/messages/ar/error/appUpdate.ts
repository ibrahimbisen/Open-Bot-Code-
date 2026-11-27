import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/appUpdate";

export const messages = {
  "error.appUpdate.noServer": "لم يتم تعيين خادم تحديث. أدخل عنوان URL لخادم التحديث في الإعدادات > التحديثات.",
  "error.appUpdate.urlInvalid": "عنوان URL لخادم التحديث غير صالح. استخدم عنوانًا يبدأ بـ https://.",
  "error.appUpdate.urlCredentials": "أزل اسم المستخدم وكلمة المرور من عنوان URL لخادم التحديث.",
  "error.appUpdate.urlInsecure":
    "استخدم https:// لعنوان URL لخادم التحديث. يُسمح بـ http:// فقط لكمبيوتر على شبكتك الخاصة.",
  "error.appUpdate.urlNotSaved": "تعذّر على OpenBot Code حفظ عنوان URL لخادم التحديث. حاول مرة أخرى.",
  "error.appUpdate.manualDownload":
    "إصدار Mac هذا غير موقّع، لذلك لا يستطيع OpenBot Code تثبيت التحديثات بنفسه. اختر تنزيل لفتح صفحة التنزيل، ثم ثبّت الإصدار الجديد يدويًا.",
} as const satisfies PartialTranslation<typeof source>;
