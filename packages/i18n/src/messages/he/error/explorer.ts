import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/explorer";

export const messages = {
  "error.explorer.outside": "הנתיב הזה אינו בתיקיות של הפרויקט.",
  "error.explorer.notFound": "הקובץ או התיקייה לא קיימים.",
  "error.explorer.rootProtected": "אי אפשר לשנות כאן שם של תיקיית פרויקט או למחוק אותה.",
  "error.explorer.invalidName": "השם הזה אינו תקין לקובץ או לתיקייה.",
  "error.explorer.notFile": "הנתיב הזה אינו קובץ.",
  "error.explorer.notDirectory": "הנתיב הזה אינו תיקייה.",
  "error.explorer.exists": "כבר יש בתיקייה הזו קובץ או תיקייה בשם {name}.",
  "error.explorer.unknownAgent": "הסוכן של עץ הקבצים הזה לא קיים.",
  "error.explorer.gitTimeout": "פקודת Git לקחה יותר מדי זמן ונעצרה.",
  "error.explorer.gitFailed": "Git דיווח על שגיאה: {detail}",
  "error.explorer.serverUnsupported": "השרת הזה לא יכול להציג קבצים. עדכן את השרת.",
  "error.explorer.clientUnsupported": "הגרסה הזו של OpenBot Code לא יכולה להציג את הקבצים של שרת.",
  "error.explorer.remoteFailed": "השרת לא הצליח להשלים את פעולת הקובץ. נסה שוב.",
} as const satisfies PartialTranslation<typeof source>;
