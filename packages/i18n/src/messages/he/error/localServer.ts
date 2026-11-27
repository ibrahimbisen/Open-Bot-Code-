import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/localServer";

export const messages = {
  "error.localServer.refused": "שרת המודלים ב-{host} דחה את החיבור. הפעל את שרת המודלים במכונה הזו.",
  "error.localServer.hostNotFound": "הכתובת {host} לא נמצאה. בדוק את שם המכונה.",
  "error.localServer.timeout": "שרת המודלים ב-{host} לא ענה תוך {seconds} שניות.",
  "error.localServer.unreachable": "לא ניתן להגיע לשרת המודלים ב-{host}. ודא שהמכונה פועלת ונמצאת ברשת שלך.",
  "error.localServer.redirect":
    "שרת המודלים ב-{host} שלח הפניה. OpenBot Code לא עוקב אחרי הפניות, כדי לשמור על מפתח ה-API.",
  "error.localServer.keyNeeded": "שרת המודלים ב-{host} דורש מפתח API. הוסף את המפתח של המכונה הזו.",
  "error.localServer.keyRefused": "שרת המודלים ב-{host} דחה את מפתח ה-API. בדוק את המפתח של המכונה הזו.",
  "error.localServer.http": "שרת המודלים ב-{host} ענה בסטטוס HTTP {status}.",
  "error.localServer.invalidAnswer": "שרת המודלים ב-{host} לא שלח רשימת מודלים תואמת OpenAI.",
  "error.localServer.tooLarge": "התשובה של שרת המודלים ב-{host} גדולה מדי.",
  "error.localServer.gpuUnreachable": "לא ניתן להגיע לכתובת מצב ה-GPU {host}.",
  "error.localServer.gpuTimeout": "כתובת מצב ה-GPU {host} לא ענתה תוך {seconds} שניות.",
  "error.localServer.gpuRedirect": "כתובת מצב ה-GPU {host} שלחה הפניה. OpenBot Code לא עוקב אחרי הפניות.",
  "error.localServer.gpuHttp": "כתובת מצב ה-GPU {host} ענתה בסטטוס HTTP {status}.",
  "error.localServer.gpuInvalid": "כתובת מצב ה-GPU {host} לא שלחה ערכי GPU ש-OpenBot Code יכול לקרוא.",
  "error.localServer.gpuTooLarge": "התשובה של כתובת מצב ה-GPU {host} גדולה מדי.",
  "error.localServer.gpuUrlInvalid":
    "כתובת ה-URL של מצב ה-GPU חייבת להיות כתובת http או https ללא שם משתמש וללא סיסמה.",
  "error.localServer.gpuKeyOtherOrigin":
    "מפתח ה-API יכול להישלח לכתובת ה-URL של מצב ה-GPU רק אם יש לה אותו מקור (origin) כמו לכתובת הבסיס.",
  "error.localServer.scanHostInvalid": "הזן שם מארח, כתובת IP או כתובת http או https.",
} as const satisfies PartialTranslation<typeof source>;
