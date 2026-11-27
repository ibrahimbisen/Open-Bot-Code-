import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/appUpdate";

export const messages = {
  "appUpdate.server.title": "Update-Server",
  "appUpdate.server.description":
    "Der Ordner auf deinem Server mit den OpenBot-Code-Installern und den Update-Dateien.",
  "appUpdate.server.urlLabel": "URL des Update-Servers",
  "appUpdate.server.placeholder": "https://example.com/codebot-updates/",
  "appUpdate.server.source.settings": "OpenBot Code bezieht Updates von dieser URL.",
  "appUpdate.server.source.environment":
    "OpenBot Code bezieht Updates von {url}. Diese URL stammt aus der Umgebungsvariable CODEBOT_UPDATE_URL.",
  "appUpdate.server.source.build":
    "OpenBot Code bezieht Updates von {url}. Diese URL stammt aus diesem Build von OpenBot Code.",
  "appUpdate.server.source.none": "Es ist kein Update-Server festgelegt. OpenBot Code sucht nicht nach Updates.",
  "appUpdate.server.saveFailed": "OpenBot Code konnte die URL des Update-Servers nicht speichern.",
  "appUpdate.server.loadFailed": "OpenBot Code konnte die URL des Update-Servers nicht lesen.",
  "appUpdate.autoRestart.title": "Bei Leerlauf automatisch neu starten",
  "appUpdate.autoRestart.description":
    "OpenBot Code startet neu, um ein heruntergeladenes Update zu installieren, wenn kein Agent arbeitet. Mitglieder deiner Server werden kurz getrennt.",
} as const satisfies PartialTranslation<typeof source>;
