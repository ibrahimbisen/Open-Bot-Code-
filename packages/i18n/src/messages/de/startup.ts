import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/startup";

export const messages = {
  "startup.failedTitle": "CodeBot konnte nicht starten",
  "startup.failedBody":
    "{message}\n\nDeine lokalen Daten wurden weder zurückgesetzt noch überschrieben. Schritte zur Wiederherstellung findest du in der Anleitung zur Fehlerbehebung.",
  "startup.archiveChangedTitle": "CodeBot-Dateien wurden geändert",
  "startup.archiveChangedBody":
    "Ein anderes Programm hat die CodeBot-Datei app.asar geändert. CodeBot läuft jetzt, startet aber nicht mehr, wenn du es beendest.\n\nInstalliere CodeBot erneut, um es zu reparieren. Deine lokalen Daten bleiben erhalten.",
  "startup.archiveChangedDownload": "CodeBot laden",
  "startup.filesDamagedBody":
    "Einige CodeBot-Dateien sind beschädigt oder fehlen.\n\nInstalliere CodeBot erneut, um es zu reparieren. Deine lokalen Daten bleiben erhalten.",
  "startup.newerDataUpdatingTitle": "CodeBot wird aktualisiert",
  "startup.newerDataUpdatingBody":
    "Eine neuere Version von CodeBot hat deine Daten gespeichert. CodeBot installiert die neueste Version und startet dann neu.\n\nDeine lokalen Daten wurden nicht zurückgesetzt oder überschrieben.",
  "startup.newerDataTitle": "Neueste CodeBot-Version installieren",
  "startup.newerDataBody":
    "Eine neuere Version von CodeBot hat deine Daten gespeichert, und diese Version ({version}) kann sie nicht öffnen. Installiere die neueste Version, um deine Daten zu öffnen.\n\nDeine lokalen Daten wurden nicht zurückgesetzt oder überschrieben.",
  "startup.newerDataDownload": "CodeBot laden",
  "startup.newerDataGuide": "Anleitung öffnen",
  "startup.newerDataQuit": "Beenden",
  "startup.newerDataLoopTitle": "Das neueste CodeBot hat sich nicht geöffnet",
  "startup.newerDataLoopBody":
    "Eine neuere Version von CodeBot hat deine Daten gespeichert, und diese Version ({version}) kann sie nicht öffnen. CodeBot {loopVersion} wurde mehrmals hintereinander vor dem Öffnen beendet und wird daher nicht erneut installiert.\n\nInstalliere eine Version neuer als {loopVersion}, sobald eine verfügbar ist. Für Hilfe öffne die Anleitung.\n\nDeine lokalen Daten wurden nicht zurückgesetzt oder überschrieben.",
  "startup.newerDataReleases": "Versionen anzeigen",
  "startup.recoveryWindowTitle": "CodeBot-Wiederherstellung",
  "startup.recoveryTitle": "CodeBot wurde nicht geöffnet",
  "startup.recoveryBody": {
    one: "CodeBot {version} wurde {count} Mal in Folge vor dem Öffnen beendet. Deine lokalen Daten wurden nicht zurückgesetzt oder überschrieben.",
    other:
      "CodeBot {version} wurde {count} Mal in Folge vor dem Öffnen beendet. Deine lokalen Daten wurden nicht zurückgesetzt oder überschrieben.",
  },
  "startup.recoveryHint":
    "Versuche es erneut oder installiere die letzte Version, die sich geöffnet hat. Für Hilfe exportiere die Diagnosedaten und sende die Datei mit deinem Bericht.",
  "startup.recoveryHintLatest":
    "CodeBot hat keine frühere Version gefunden, die deine Daten öffnen kann. Versuche es erneut oder installiere die neueste Version. Für Hilfe exportiere die Diagnosedaten und sende die Datei mit deinem Bericht.",
  "startup.recoveryRetry": "Wiederholen",
  "startup.recoveryPreviousVersion": "Vorherige Version laden",
  "startup.recoveryLatestVersion": "Neueste Version laden",
  "startup.recoveryExportDiagnostics": "Diagnose exportieren",
  "startup.recoveryOpenDataFolder": "Datenordner öffnen",
  "startup.recoveryQuit": "Beenden",
  "startup.recoveryDiagnosticsSaved": "Die Diagnosedatei ist gespeichert.",
  "startup.recoveryActionFailed": "CodeBot konnte diese Aktion nicht ausführen.",
} as const satisfies PartialTranslation<typeof source>;
