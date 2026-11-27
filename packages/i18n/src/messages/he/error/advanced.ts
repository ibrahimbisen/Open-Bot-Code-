import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/advanced";

export const messages = {
  "error.advanced.unsupported": "השרת הזה לא תומך במתגי היכולות המתקדמות. עדכן את השרת.",
  "error.advanced.invalidChange": "שינוי היכולת המתקדמת אינו תקין.",
  "error.advanced.featureOff": "הכלי הזה לא זמין כי היכולת כבויה. המשתמש יכול להפעיל אותה בהגדרות > יכולות מתקדמות.",
} as const satisfies PartialTranslation<typeof source>;
