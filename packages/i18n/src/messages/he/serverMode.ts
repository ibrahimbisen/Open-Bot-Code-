import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/serverMode";

export const messages = {
  "serverMode.switch.label": "היכן הסוכנים רצים",
  "serverMode.switch.thisComputer": "המחשב הזה",
  "serverMode.switch.homeServer": "שרת ביתי",
  "serverMode.switch.homeServerNamed": "הרץ סוכנים ב-{name}",
  "serverMode.switch.noHomeServer": "אין עדיין שרת ביתי. בחר כדי להצטרף לאחד.",
  "serverMode.switch.useComputer": "הרץ סוכנים במחשב הזה",
  "serverMode.switch.useHomeServer": "הרץ סוכנים בשרת הביתי",
} as const satisfies PartialTranslation<typeof source>;
