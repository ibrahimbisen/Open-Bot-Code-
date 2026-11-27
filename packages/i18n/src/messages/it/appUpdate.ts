import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/appUpdate";

export const messages = {
  "appUpdate.server.title": "Server di aggiornamento",
  "appUpdate.server.description":
    "La cartella sul tuo server con gli installer di OpenBot Code e i file di aggiornamento.",
  "appUpdate.server.urlLabel": "URL del server di aggiornamento",
  "appUpdate.server.placeholder": "https://example.com/codebot-updates/",
  "appUpdate.server.source.settings": "OpenBot Code riceve gli aggiornamenti da questo URL.",
  "appUpdate.server.source.environment":
    "OpenBot Code riceve gli aggiornamenti da {url}. Questo URL proviene dalla variabile d'ambiente CODEBOT_UPDATE_URL.",
  "appUpdate.server.source.build":
    "OpenBot Code riceve gli aggiornamenti da {url}. Questo URL proviene da questa versione di OpenBot Code.",
  "appUpdate.server.source.none": "Nessun server di aggiornamento impostato. OpenBot Code non cerca aggiornamenti.",
  "appUpdate.server.saveFailed": "OpenBot Code non è riuscito a salvare l'URL del server di aggiornamento.",
  "appUpdate.server.loadFailed": "OpenBot Code non è riuscito a leggere l'URL del server di aggiornamento.",
  "appUpdate.autoRestart.title": "Riavvia automaticamente quando è inattivo",
  "appUpdate.autoRestart.description":
    "OpenBot Code si riavvia per installare un aggiornamento scaricato quando nessun agente lavora. I membri dei tuoi server vengono disconnessi per poco tempo.",
} as const satisfies PartialTranslation<typeof source>;
