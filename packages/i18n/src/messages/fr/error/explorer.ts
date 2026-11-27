import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/explorer";

export const messages = {
  "error.explorer.outside": "Ce chemin ne se trouve pas dans les dossiers du projet.",
  "error.explorer.notFound": "Le fichier ou le dossier n'existe pas.",
  "error.explorer.rootProtected": "Un dossier du projet ne peut pas être renommé ni supprimé ici.",
  "error.explorer.invalidName": "Ce nom n'est pas valide pour un fichier ou un dossier.",
  "error.explorer.notFile": "Ce chemin n'est pas un fichier.",
  "error.explorer.notDirectory": "Ce chemin n'est pas un dossier.",
  "error.explorer.exists": "Un fichier ou un dossier nommé {name} existe déjà dans ce dossier.",
  "error.explorer.unknownAgent": "L'agent de cette arborescence de fichiers n'existe pas.",
  "error.explorer.gitTimeout": "Une commande Git a pris trop de temps et a été arrêtée.",
  "error.explorer.gitFailed": "Git a signalé une erreur : {detail}",
  "error.explorer.serverUnsupported": "Ce serveur ne peut pas afficher de fichiers. Mets le serveur à jour.",
  "error.explorer.clientUnsupported": "Cette version d'OpenBot Code ne peut pas afficher les fichiers d'un serveur.",
  "error.explorer.remoteFailed": "Le serveur n'a pas pu terminer cette action sur le fichier. Réessaie.",
} as const satisfies PartialTranslation<typeof source>;
