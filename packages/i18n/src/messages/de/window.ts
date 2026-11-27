import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/window";

export const messages = {
  "window.localHostTitle": "Lokaler OpenBot Code-Host",
  "window.localClientTitle": "Lokaler OpenBot Code-Client",
  "window.computerUsePermissionTitle": "Computersteuerung aktivieren",
  "window.rendererStoppedTitle": "OpenBot Code funktioniert nicht mehr",
  "window.rendererStoppedBody":
    "Das Fenster wurde mehrmals beendet. Deine Chats sind gespeichert, und deine Agenten arbeiten weiter.",
  "window.rendererStoppedReload": "Neu laden",
} as const satisfies PartialTranslation<typeof source>;
