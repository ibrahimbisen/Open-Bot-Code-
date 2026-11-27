import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/appUpdate";

export const messages = {
  "appUpdate.server.title": "خادم التحديث",
  "appUpdate.server.description":
    "اترك هذا الحقل فارغًا للحصول على التحديثات من إصدارات OpenBot Code على GitHub. لاستخدام خادمك الخاص، أدخل عنوان URL للمجلد الذي يحتوي على المثبّتات وملفات التحديث.",
  "appUpdate.server.urlLabel": "عنوان URL لخادم التحديث",
  "appUpdate.server.placeholder": "https://example.com/codebot-updates/",
  "appUpdate.server.source.settings": "يحصل OpenBot Code على التحديثات من عنوان URL هذا.",
  "appUpdate.server.source.environment":
    "يحصل OpenBot Code على التحديثات من {url}. يأتي هذا العنوان من متغير البيئة CODEBOT_UPDATE_URL.",
  "appUpdate.server.source.build":
    "يحصل OpenBot Code على التحديثات من {url}. يأتي هذا العنوان من إصدار OpenBot Code هذا.",
  "appUpdate.server.source.none": "لم يتم تعيين خادم تحديث. لا يتحقق OpenBot Code من التحديثات.",
  "appUpdate.server.saveFailed": "تعذّر على OpenBot Code حفظ عنوان URL لخادم التحديث.",
  "appUpdate.server.loadFailed": "تعذّر على OpenBot Code قراءة عنوان URL لخادم التحديث.",
  "appUpdate.autoRestart.title": "إعادة التشغيل تلقائيًا عند الخمول",
  "appUpdate.autoRestart.description":
    "يعيد OpenBot Code التشغيل لتثبيت تحديث تم تنزيله عندما لا يعمل أي وكيل. ينقطع اتصال أعضاء خوادمك لفترة قصيرة.",
} as const satisfies PartialTranslation<typeof source>;
