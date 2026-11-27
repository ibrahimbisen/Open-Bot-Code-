import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/advanced";

export const messages = {
  "advanced.tab.title": "الميزات المتقدمة",
  "advanced.tab.description": "فعّل الميزات المخفية افتراضيًا.",
  "advanced.section.title": "الميزات المخفية",
  "advanced.section.description":
    "يعرض كل مفتاح ميزة على {server} أو يخفيها. الميزة المعطّلة ليس لها أزرار ولا إعدادات ولا أدوات للوكيل. تبقى بياناتك.",
  "advanced.adminOnly": "يستطيع مالك هذا الخادم أو مشرفه فقط تغيير هذه المفاتيح.",
  "advanced.loadFailed": "تعذّر على OpenBot Code قراءة مفاتيح هذا الخادم.",
  "advanced.saveFailed": "تعذّر على OpenBot Code حفظ المفتاح.",
  "advanced.routines.title": "الروتينات",
  "advanced.routines.description":
    "مهام مجدولة وخطافات ويب. يضيف الجدولة إلى الشريط الأيسر والروتينات إلى إعدادات الوكيل.",
  "advanced.channels.title": "القنوات",
  "advanced.channels.description": "عدة وكلاء في محادثة واحدة. يضيف القنوات إلى الشريط الأيسر.",
  "advanced.marketplace.title": "Marketplace",
  "advanced.marketplace.description": "مهارات ووكلاء وإضافات للتثبيت. يضيف زر Marketplace.",
  "advanced.chatApps.title": "Slack وDiscord وTelegram وWhatsApp",
  "advanced.chatApps.description": "اربط الوكلاء بتطبيقات الدردشة. يضيف موصّلات تطبيقات الدردشة.",
  "advanced.chatApps.open.title": "اتصالات تطبيقات الدردشة",
  "advanced.chatApps.open.description": "اربط Slack أو Discord أو Telegram أو WhatsApp.",
  "advanced.chatApps.open.action": "فتح",
  "advanced.computerUse.title": "Computer Use",
  "advanced.computerUse.description":
    "يتيح للوكيل رؤية التطبيقات على هذا الكمبيوتر والتحكم بها. يضيف إعدادات Computer Use.",
  "advanced.remoteDesktop.title": "سطح المكتب البعيد",
  "advanced.remoteDesktop.description": "تحكّم في شاشة هذا الكمبيوتر من جهاز آخر.",
} as const satisfies PartialTranslation<typeof source>;
