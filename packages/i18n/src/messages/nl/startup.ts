import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/startup";

export const messages = {
  "startup.failedTitle": "OpenBot Code kan niet starten",
  "startup.failedBody":
    "{message}\n\nJe lokale gegevens zijn niet gereset of overschreven. Bekijk de handleiding voor probleemoplossing voor herstelstappen.",
  "startup.archiveChangedTitle": "OpenBot Code-bestanden zijn gewijzigd",
  "startup.archiveChangedBody":
    "Een ander programma heeft het OpenBot Code-bestand app.asar gewijzigd. OpenBot Code werkt nu, maar opent niet meer nadat je het afsluit.\n\nInstalleer OpenBot Code opnieuw om het te herstellen. Je lokale gegevens blijven bewaard.",
  "startup.archiveChangedDownload": "OpenBot Code downloaden",
  "startup.filesDamagedBody":
    "Sommige OpenBot Code-bestanden zijn beschadigd of ontbreken.\n\nInstalleer OpenBot Code opnieuw om het te herstellen. Je lokale gegevens blijven bewaard.",
  "startup.newerDataUpdatingTitle": "OpenBot Code wordt bijgewerkt",
  "startup.newerDataUpdatingBody":
    "Een nieuwere versie van OpenBot Code heeft je gegevens opgeslagen. OpenBot Code installeert de nieuwste versie en opent daarna opnieuw.\n\nJe lokale gegevens zijn niet gereset of overschreven.",
  "startup.newerDataTitle": "Installeer de nieuwste OpenBot Code",
  "startup.newerDataBody":
    "Een nieuwere versie van OpenBot Code heeft je gegevens opgeslagen, en deze versie ({version}) kan ze niet openen. Installeer de nieuwste versie om je gegevens te openen.\n\nJe lokale gegevens zijn niet gereset of overschreven.",
  "startup.newerDataDownload": "OpenBot Code downloaden",
  "startup.newerDataGuide": "Gids openen",
  "startup.newerDataQuit": "Stoppen",
  "startup.newerDataLoopTitle": "De nieuwste OpenBot Code opende niet",
  "startup.newerDataLoopBody":
    "Een nieuwere versie van OpenBot Code heeft je gegevens opgeslagen, en deze versie ({version}) kan ze niet openen. OpenBot Code {loopVersion} stopte meerdere keren achter elkaar voordat het opende, dus het wordt niet opnieuw geïnstalleerd.\n\nInstalleer een versie nieuwer dan {loopVersion} zodra er een beschikbaar is. Open de gids voor hulp.\n\nJe lokale gegevens zijn niet gereset of overschreven.",
  "startup.newerDataReleases": "Versies tonen",
  "startup.recoveryWindowTitle": "OpenBot Code-herstel",
  "startup.recoveryTitle": "OpenBot Code is niet geopend",
  "startup.recoveryBody": {
    one: "OpenBot Code {version} stopte voordat het openging, {count} keer achter elkaar. Je lokale gegevens zijn niet gewist of overschreven.",
    other:
      "OpenBot Code {version} stopte voordat het openging, {count} keer achter elkaar. Je lokale gegevens zijn niet gewist of overschreven.",
  },
  "startup.recoveryHint":
    "Probeer het opnieuw, of installeer de laatste versie die wel opende. Exporteer voor hulp de diagnose en stuur het bestand mee met je melding.",
  "startup.recoveryHintLatest":
    "OpenBot Code vond geen eerdere versie die je gegevens kan openen. Probeer het opnieuw, of installeer de nieuwste versie. Exporteer voor hulp de diagnose en stuur het bestand mee met je melding.",
  "startup.recoveryRetry": "Opnieuw",
  "startup.recoveryPreviousVersion": "Vorige versie downloaden",
  "startup.recoveryLatestVersion": "Nieuwste versie downloaden",
  "startup.recoveryExportDiagnostics": "Diagnose exporteren",
  "startup.recoveryOpenDataFolder": "Gegevensmap openen",
  "startup.recoveryQuit": "Stoppen",
  "startup.recoveryDiagnosticsSaved": "Het diagnosebestand is opgeslagen.",
  "startup.recoveryActionFailed": "OpenBot Code kon deze actie niet uitvoeren.",
} as const satisfies PartialTranslation<typeof source>;
