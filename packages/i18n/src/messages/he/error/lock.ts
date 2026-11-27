import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/lock";

export const messages = {
  "error.lock.claudeStrictNoSandbox":
    "מצב קפדני דורש את ארגז החול של Claude, ש-Claude לא יכול להפעיל במחשב הזה: {reason}. בחר רגיל או פתוח בהגדרות הפרויקט, או בחר ספק אחר.",
  "error.lock.claudeNoSandboxStrict":
    "מצב קפדני דורש את ארגז החול של Claude, ש-Claude לא יכול להפעיל במחשב הזה. בחר רגיל או פתוח בהגדרות הפרויקט, או בחר ספק אחר.",
  "error.lock.providerNeedsMacOrLinux":
    "{provider} לא יכול להשאיר סוכן בתוך תיקיות הפרויקט שלו במחשב הזה, ולכן OpenBot Code לא מפעיל אותו במצב {level}. בחר פתוח בהגדרות הפרויקט, או בחר Claude או Codex.",
  "error.lock.providerToolMissing":
    "מצב {level} דורש את {tool}, ש-OpenBot Code לא מצא. התקן אותו או בחר פתוח בהגדרות הפרויקט.",
  "error.lock.containerMissing":
    "מצב קפדני עם קונטיינר דורש Docker או Podman, ש-OpenBot Code לא מצא. התקן אחד מהם או בחר רגיל בהגדרות הפרויקט.",
  "error.lock.containerFailed":
    "הקונטיינר של הפרויקט הזה לא הופעל: {reason}. בחר רגיל בהגדרות הפרויקט או תקן את כלי הקונטיינרים.",
  "error.lock.codexStrictNeedsSandbox":
    "מצב קפדני דורש את ארגז החול של Codex, ש-Codex לא יכול להפעיל במחשב הזה. בחר רגיל או פתוח בהגדרות הפרויקט, או בחר ספק אחר.",
  "error.lock.commandAsk": "ארגז החול של מערכת ההפעלה אינו זמין לסוכן הזה, ולכן הפקודה הזו דורשת את אישורך.",
} as const satisfies PartialTranslation<typeof source>;
