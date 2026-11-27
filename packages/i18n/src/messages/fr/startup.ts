import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/startup";

export const messages = {
  "startup.failedTitle": "OpenBot Code n’a pas pu démarrer",
  "startup.failedBody":
    "{message}\n\nVos données locales n’ont pas été réinitialisées ni écrasées. Consultez le guide de dépannage pour savoir comment récupérer la situation.",
  "startup.archiveChangedTitle": "Des fichiers d’OpenBot Code ont été modifiés",
  "startup.archiveChangedBody":
    "Un autre programme a modifié le fichier app.asar d’OpenBot Code. OpenBot Code fonctionne maintenant, mais il ne s’ouvrira plus après sa fermeture.\n\nPour le réparer, réinstallez OpenBot Code. Vos données locales sont conservées.",
  "startup.archiveChangedDownload": "Télécharger OpenBot Code",
  "startup.filesDamagedBody":
    "Certains fichiers d’OpenBot Code sont endommagés ou manquants.\n\nPour le réparer, réinstallez OpenBot Code. Vos données locales sont conservées.",
  "startup.newerDataUpdatingTitle": "Mise à jour d’OpenBot Code",
  "startup.newerDataUpdatingBody":
    "Une version plus récente d’OpenBot Code a enregistré vos données. OpenBot Code installe la dernière version, puis se rouvre.\n\nVos données locales n’ont pas été réinitialisées ni écrasées.",
  "startup.newerDataTitle": "Installez la dernière version d’OpenBot Code",
  "startup.newerDataBody":
    "Une version plus récente d’OpenBot Code a enregistré vos données, et cette version ({version}) ne peut pas les ouvrir. Installez la dernière version pour ouvrir vos données.\n\nVos données locales n’ont pas été réinitialisées ni écrasées.",
  "startup.newerDataDownload": "Télécharger OpenBot Code",
  "startup.newerDataGuide": "Ouvrir le guide",
  "startup.newerDataQuit": "Quitter",
  "startup.newerDataLoopTitle": "La dernière version d’OpenBot Code ne s’est pas ouverte",
  "startup.newerDataLoopBody":
    "Une version plus récente d’OpenBot Code a enregistré vos données, et cette version ({version}) ne peut pas les ouvrir. OpenBot Code {loopVersion} s’est arrêté avant de s’ouvrir plusieurs fois de suite : il n’est donc pas réinstallé.\n\nInstallez une version plus récente que {loopVersion} dès qu’elle est disponible. Pour obtenir de l’aide, ouvrez le guide.\n\nVos données locales n’ont pas été réinitialisées ni écrasées.",
  "startup.newerDataReleases": "Voir les versions",
  "startup.recoveryWindowTitle": "Récupération d’OpenBot Code",
  "startup.recoveryTitle": "OpenBot Code ne s’est pas ouvert",
  "startup.recoveryBody": {
    one: "OpenBot Code {version} s’est arrêté avant de s’ouvrir, {count} fois de suite. Vos données locales n’ont pas été réinitialisées ni écrasées.",
    other:
      "OpenBot Code {version} s’est arrêté avant de s’ouvrir, {count} fois de suite. Vos données locales n’ont pas été réinitialisées ni écrasées.",
  },
  "startup.recoveryHint":
    "Réessayez, ou installez la dernière version qui s’est ouverte. Pour obtenir de l’aide, exportez le diagnostic et envoyez le fichier avec votre rapport.",
  "startup.recoveryHintLatest":
    "OpenBot Code n’a trouvé aucune version antérieure capable d’ouvrir vos données. Réessayez, ou installez la dernière version. Pour obtenir de l’aide, exportez le diagnostic et envoyez le fichier avec votre rapport.",
  "startup.recoveryRetry": "Réessayer",
  "startup.recoveryPreviousVersion": "Télécharger la version précédente",
  "startup.recoveryLatestVersion": "Télécharger la dernière version",
  "startup.recoveryExportDiagnostics": "Exporter le diagnostic",
  "startup.recoveryOpenDataFolder": "Ouvrir le dossier des données",
  "startup.recoveryQuit": "Quitter",
  "startup.recoveryDiagnosticsSaved": "Le fichier de diagnostic est enregistré.",
  "startup.recoveryActionFailed": "OpenBot Code n’a pas pu effectuer cette action.",
} as const satisfies PartialTranslation<typeof source>;
