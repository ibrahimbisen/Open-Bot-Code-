import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/slash";

export const messages = {
  "error.slash.resumeUnsupported": "הסוכן הזה לא יכול להמשיך צ'אט שמור מהמנוע שלו.",
  "error.slash.resumeEngineOff": "המנוע לא פועל. הפעל אותו ונסה שוב.",
  "error.slash.sessionNotFound": "הצ'אט השמור הזה כבר לא קיים. רענן את הרשימה ובחר אחר.",
  "error.slash.sessionInUse": "צ'אט ב-OpenBot Code כבר משתמש בצ'אט השמור הזה.",
  "error.slash.remoteFailed": "השרת לא הצליח להשלים את הפקודה הזו. נסה שוב.",
  "error.slash.serverUnsupported": "השרת הזה לא יכול להציג פקודות סלאש. עדכן את השרת.",
} as const satisfies PartialTranslation<typeof source>;
