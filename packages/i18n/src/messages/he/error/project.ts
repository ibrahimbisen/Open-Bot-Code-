import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/project";

export const messages = {
  "error.project.serverTooOld": "השרת הזה לא תומך בפרויקטים. עדכן את OpenBot Code במחשב שמריץ אותו.",
  "error.project.remoteFailed": "השרת לא הצליח להשלים את פעולת הפרויקט. נסה שוב.",
  "error.project.replyUnsupported": "השרת הזה לא יכול לשתף הגדרות תגובה. עדכן את השרת.",
  "error.project.replyFailed": "השרת לא הצליח לשמור את כלל התגובה. נסה שוב.",
  "error.project.notFound": "הפרויקט הזה כבר לא קיים.",
  "error.project.archived": "הפרויקט הזה בארכיון. שחזר אותו קודם.",
  "error.project.nameRequired": "תן שם לפרויקט.",
  "error.project.limit": "הגעת למספר הפרויקטים המרבי ({limit}). מחק קודם פרויקט.",
  "error.project.agentLimit": "בפרויקט יכולים להיות לכל היותר {limit} סוכנים.",
  "error.project.agentRequired": "פרויקט צריך לפחות סוכן אחד.",
  "error.project.agentNotFound": "הסוכן הזה אינו חלק מהפרויקט.",
  "error.project.agentNameRequired": "תן שם לסוכן.",
  "error.project.runtimeProviderMismatch":
    "צ'אט יכול להשתמש במודל אחר של הספק של הסוכן שלו. עבור ספק אחר, התחל את הצ'אט עם סוכן של אותו ספק.",
  "error.project.chatNotFound": "הצ'אט הזה כבר לא קיים.",
  "error.project.cursorInvalid": "החלק הזה של רשימת הצ'אטים כבר לא תקף. טען את הצ'אטים שוב.",
  "error.project.folderMissing": "התיקייה הזו לא קיימת.",
  "error.project.folderProtected": "OpenBot Code לא יכול להשתמש בתיקייה הזו. בחר תיקייה אחרת.",
  "error.project.mainFolderMissing":
    "התיקייה הראשית של הפרויקט הזה חסרה: {path}. שחזר את התיקייה או בחר תיקייה ראשית חדשה.",
} as const satisfies PartialTranslation<typeof source>;
