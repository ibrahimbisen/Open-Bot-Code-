import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/status/host";

export const messages = {
  "status.host.registered": "ה-OpenBot Code הזה נרשם לגישת WebRTC.",
  "status.host.keyRotated": "מפתח השרת השתנה. המכשירים המותאמים נשארים מותאמים.",
  "status.host.identityUpdated": "זהות השרת עודכנה.",
  "status.host.starting": "מפעיל את מארח ה-WebRTC…",
  "status.host.ready": "ה-OpenBot Code הזה מוכן לחיבורי WebRTC.",
  "status.host.signalLost": "מכשירים אחרים לא יכולים להגיע ל-OpenBot Code הזה כרגע. הוא מתחבר שוב.",
  "status.host.stopping": "הופך את ה-OpenBot Code הזה לפרטי…",
  "status.host.private": "ה-OpenBot Code הזה פרטי.",
  "status.host.removed": "ה-OpenBot Code הזה הוסר מהחשבון שלך. יש לפרסם אותו שוב כדי לשתף אותו.",
} as const satisfies PartialTranslation<typeof source>;
