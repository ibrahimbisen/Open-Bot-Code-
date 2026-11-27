import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/advanced";

export const messages = {
  "advanced.tab.title": "יכולות מתקדמות",
  "advanced.tab.description": "הפעל יכולות שמוסתרות כברירת מחדל.",
  "advanced.section.title": "יכולות מוסתרות",
  "advanced.section.description":
    "כל מתג מציג או מסתיר יכולת ב-{server}. ליכולת כבויה אין כפתורים, הגדרות או כלי סוכן. הנתונים שלך נשמרים.",
  "advanced.adminOnly": "רק בעלים או מנהל של השרת הזה יכולים לשנות את המתגים האלה.",
  "advanced.loadFailed": "OpenBot Code לא הצליח לקרוא את המתגים של השרת הזה.",
  "advanced.saveFailed": "OpenBot Code לא הצליח לשמור את המתג.",
  "advanced.routines.title": "שגרות",
  "advanced.routines.description": "משימות מתוזמנות ו-webhooks. מוסיף תזמון לסרגל השמאלי ושגרות להגדרות הסוכן.",
  "advanced.channels.title": "ערוצים",
  "advanced.channels.description": "הרבה סוכנים בצ'אט אחד. מוסיף ערוצים לסרגל השמאלי.",
  "advanced.marketplace.title": "Marketplace",
  "advanced.marketplace.description": "סקילים, סוכנים ותוספים להתקנה. מוסיף את הכפתור Marketplace.",
  "advanced.chatApps.title": "Slack, Discord, Telegram ו-WhatsApp",
  "advanced.chatApps.description": "חבר סוכנים לאפליקציות צ'אט. מוסיף את מחברי אפליקציות הצ'אט.",
  "advanced.chatApps.open.title": "חיבורי אפליקציות צ'אט",
  "advanced.chatApps.open.description": "חבר את Slack, Discord, Telegram או WhatsApp.",
  "advanced.chatApps.open.action": "פתיחה",
  "advanced.computerUse.title": "Computer Use",
  "advanced.computerUse.description":
    "מאפשר לסוכן לראות ולשלוט באפליקציות במחשב הזה. מוסיף את ההגדרות של Computer Use.",
  "advanced.remoteDesktop.title": "שולחן עבודה מרוחק",
  "advanced.remoteDesktop.description": "שלוט במסך של המחשב הזה ממכשיר אחר.",
} as const satisfies PartialTranslation<typeof source>;
