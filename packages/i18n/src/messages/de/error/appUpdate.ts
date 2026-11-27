import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/appUpdate";

export const messages = {
  "error.appUpdate.noServer":
    "Es ist kein Update-Server festgelegt. Gib die URL des Update-Servers unter Einstellungen > Updates ein.",
  "error.appUpdate.urlInvalid": "Die URL des Update-Servers ist ungültig. Verwende eine URL, die mit https:// beginnt.",
  "error.appUpdate.urlCredentials": "Entferne Benutzernamen und Passwort aus der URL des Update-Servers.",
  "error.appUpdate.urlInsecure":
    "Verwende https:// für die URL des Update-Servers. http:// ist nur für einen Computer in deinem eigenen Netzwerk erlaubt.",
  "error.appUpdate.urlNotSaved": "OpenBot Code konnte die URL des Update-Servers nicht speichern. Versuche es erneut.",
  "error.appUpdate.manualDownload":
    "Dieser Mac-Build ist nicht signiert, deshalb kann OpenBot Code Updates nicht selbst installieren. Wähle Herunterladen, um die Download-Seite zu öffnen, und installiere die neue Version dann von Hand.",
} as const satisfies PartialTranslation<typeof source>;
