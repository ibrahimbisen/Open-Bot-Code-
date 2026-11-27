import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/startup";

export const messages = {
  "startup.failedTitle": "OpenBot Code konnte nicht starten",
  "startup.failedBody":
    "{message}\n\nDeine lokalen Daten wurden weder zurückgesetzt noch überschrieben. Schritte zur Wiederherstellung findest du in der Anleitung zur Fehlerbehebung.",
  "startup.archiveChangedTitle": "OpenBot Code-Dateien wurden geändert",
  "startup.archiveChangedBody":
    "Ein anderes Programm hat die OpenBot Code-Datei app.asar geändert. OpenBot Code läuft jetzt, startet aber nicht mehr, wenn du es beendest.\n\nInstalliere OpenBot Code erneut, um es zu reparieren. Deine lokalen Daten bleiben erhalten.",
  "startup.archiveChangedDownload": "OpenBot Code laden",
  "startup.filesDamagedBody":
    "Einige OpenBot Code-Dateien sind beschädigt oder fehlen.\n\nInstalliere OpenBot Code erneut, um es zu reparieren. Deine lokalen Daten bleiben erhalten.",
  "startup.newerDataUpdatingTitle": "OpenBot Code wird aktualisiert",
  "startup.newerDataUpdatingBody":
    "Eine neuere Version von OpenBot Code hat deine Daten gespeichert. OpenBot Code installiert die neueste Version und startet dann neu.\n\nDeine lokalen Daten wurden nicht zurückgesetzt oder überschrieben.",
  "startup.newerDataTitle": "Neueste OpenBot Code-Version installieren",
  "startup.newerDataBody":
    "Eine neuere Version von OpenBot Code hat deine Daten gespeichert, und diese Version ({version}) kann sie nicht öffnen. Installiere die neueste Version, um deine Daten zu öffnen.\n\nDeine lokalen Daten wurden nicht zurückgesetzt oder überschrieben.",
  "startup.newerDataDownload": "OpenBot Code laden",
  "startup.newerDataGuide": "Anleitung öffnen",
  "startup.newerDataQuit": "Beenden",
  "startup.newerDataLoopTitle": "Das neueste OpenBot Code hat sich nicht geöffnet",
  "startup.newerDataLoopBody":
    "Eine neuere Version von OpenBot Code hat deine Daten gespeichert, und diese Version ({version}) kann sie nicht öffnen. OpenBot Code {loopVersion} wurde mehrmals hintereinander vor dem Öffnen beendet und wird daher nicht erneut installiert.\n\nInstalliere eine Version neuer als {loopVersion}, sobald eine verfügbar ist. Für Hilfe öffne die Anleitung.\n\nDeine lokalen Daten wurden nicht zurückgesetzt oder überschrieben.",
  "startup.newerDataReleases": "Versionen anzeigen",
  "startup.recoveryWindowTitle": "OpenBot Code-Wiederherstellung",
  "startup.recoveryTitle": "OpenBot Code wurde nicht geöffnet",
  "startup.recoveryBody": {
    one: "OpenBot Code {version} wurde {count} Mal in Folge vor dem Öffnen beendet. Deine lokalen Daten wurden nicht zurückgesetzt oder überschrieben.",
    other:
      "OpenBot Code {version} wurde {count} Mal in Folge vor dem Öffnen beendet. Deine lokalen Daten wurden nicht zurückgesetzt oder überschrieben.",
  },
  "startup.recoveryHint":
    "Versuche es erneut oder installiere die letzte Version, die sich geöffnet hat. Für Hilfe exportiere die Diagnosedaten und sende die Datei mit deinem Bericht.",
  "startup.recoveryHintLatest":
    "OpenBot Code hat keine frühere Version gefunden, die deine Daten öffnen kann. Versuche es erneut oder installiere die neueste Version. Für Hilfe exportiere die Diagnosedaten und sende die Datei mit deinem Bericht.",
  "startup.recoveryRetry": "Wiederholen",
  "startup.recoveryPreviousVersion": "Vorherige Version laden",
  "startup.recoveryLatestVersion": "Neueste Version laden",
  "startup.recoveryExportDiagnostics": "Diagnose exportieren",
  "startup.recoveryOpenDataFolder": "Datenordner öffnen",
  "startup.recoveryQuit": "Beenden",
  "startup.recoveryDiagnosticsSaved": "Die Diagnosedatei ist gespeichert.",
  "startup.recoveryActionFailed": "OpenBot Code konnte diese Aktion nicht ausführen.",
} as const satisfies PartialTranslation<typeof source>;
