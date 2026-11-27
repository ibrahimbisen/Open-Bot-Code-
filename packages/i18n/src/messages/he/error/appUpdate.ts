import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/appUpdate";

export const messages = {
  "error.appUpdate.noServer": "לא הוגדר שרת עדכונים. הזן את כתובת ה-URL של שרת העדכונים בהגדרות > עדכונים.",
  "error.appUpdate.urlInvalid": "כתובת ה-URL של שרת העדכונים אינה תקינה. השתמש בכתובת שמתחילה ב-https://.",
  "error.appUpdate.urlCredentials": "הסר את שם המשתמש והסיסמה מכתובת ה-URL של שרת העדכונים.",
  "error.appUpdate.urlInsecure": "השתמש ב-https:// עבור כתובת ה-URL של שרת העדכונים. http:// מותר רק למחשב ברשת שלך.",
  "error.appUpdate.urlNotSaved": "OpenBot Code לא הצליח לשמור את כתובת ה-URL של שרת העדכונים. נסה שוב.",
  "error.appUpdate.manualDownload":
    "גרסת Mac זו אינה חתומה, ולכן OpenBot Code לא יכול להתקין עדכונים בעצמו. בחר הורדה כדי לפתוח את דף ההורדה, ואז התקן את הגרסה החדשה ידנית.",
} as const satisfies PartialTranslation<typeof source>;
