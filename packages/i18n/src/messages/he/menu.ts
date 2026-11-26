import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/menu";

export const messages = {
  "menu.stopAllAgents": "עצירת כל הסוכנים",
  "menu.checkForUpdates": "בדיקת עדכונים…",
  "menu.preferences": "הגדרות…",
  "menu.actualSize": "גודל בפועל",
  "menu.zoomIn": "הגדלה",
  "menu.zoomOut": "הקטנה",
  "menu.closeDeveloperTools": "סגירת כלי המפתחים",
  "menu.copyLink": "העתקת קישור",
  "menu.copyImage": "העתקת תמונה",
  "menu.quit": "יציאה מ-CodeBot",
  "menu.quitConfirmTitle": "לצאת מ-CodeBot?",
  "menu.quitConfirmBody": "סוכנים ושגרות נעצרים עד שתפתח את CodeBot שוב.",
  "menu.quitConfirm": "יציאה",
  "menu.quitHint": "יש להחזיק את ⌘Q או ללחוץ עליו פעמיים כדי לצאת",
  "menu.closeWorkingTitle": {
    one: "סוכן אחד עדיין עובד",
    two: "שני סוכנים עדיין עובדים",
    other: "{count} סוכנים עדיין עובדים",
  },
  "menu.closeWorkingBody":
    "יציאה מ-CodeBot עוצרת את הסוכנים. אפשר להשאיר אותו פועל כדי שיסיימו. כדי להציג שוב את החלון, יש לפתוח את CodeBot.",
  "menu.closeKeepRunning": "להמשיך לפעול",
  "menu.trayOpen": "פתיחת CodeBot",
  "menu.trayQuit": "יציאה מ-CodeBot",
  "menu.trayTooltip": "CodeBot",
  "menu.hideDynamicIsland": "הסתרת Dynamic Island",
  "menu.undo": "ביטול",
  "menu.redo": "ביצוע חוזר",
  "menu.cut": "גזירה",
  "menu.copy": "העתקה",
  "menu.paste": "הדבקה",
  "menu.pasteAndMatchStyle": "הדבקה והתאמת סגנון",
  "menu.delete": "מחיקה",
  "menu.selectAll": "בחירת הכול",
} as const satisfies PartialTranslation<typeof source>;
