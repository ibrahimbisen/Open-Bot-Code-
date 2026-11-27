import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/appUpdate";

export const messages = {
  "appUpdate.server.title": "שרת עדכונים",
  "appUpdate.server.description":
    "השאר ריק כדי לקבל עדכונים מגרסאות OpenBot Code ב-GitHub. כדי להשתמש בשרת משלך, הזן את כתובת ה-URL של התיקייה שמכילה את קובצי ההתקנה וקובצי העדכון.",
  "appUpdate.server.urlLabel": "כתובת URL של שרת העדכונים",
  "appUpdate.server.placeholder": "https://example.com/codebot-updates/",
  "appUpdate.server.source.settings": "OpenBot Code מקבל עדכונים מכתובת ה-URL הזו.",
  "appUpdate.server.source.environment":
    "OpenBot Code מקבל עדכונים מ-{url}. כתובת ה-URL הזו מגיעה ממשתנה הסביבה CODEBOT_UPDATE_URL.",
  "appUpdate.server.source.build":
    "OpenBot Code מקבל עדכונים מ-{url}. כתובת ה-URL הזו מגיעה מהגרסה הזו של OpenBot Code.",
  "appUpdate.server.source.none": "לא הוגדר שרת עדכונים. OpenBot Code לא בודק עדכונים.",
  "appUpdate.server.saveFailed": "OpenBot Code לא הצליח לשמור את כתובת ה-URL של שרת העדכונים.",
  "appUpdate.server.loadFailed": "OpenBot Code לא הצליח לקרוא את כתובת ה-URL של שרת העדכונים.",
  "appUpdate.autoRestart.title": "הפעלה מחדש אוטומטית במצב סרק",
  "appUpdate.autoRestart.description":
    "OpenBot Code מופעל מחדש כדי להתקין עדכון שהורד כשאף סוכן לא עובד. חברי השרתים שלך מנותקים לזמן קצר.",
} as const satisfies PartialTranslation<typeof source>;
