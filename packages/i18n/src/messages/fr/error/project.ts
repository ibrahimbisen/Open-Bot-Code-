import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/project";

export const messages = {
  "error.project.serverTooOld":
    "Ce serveur ne prend pas en charge les projets. Mets à jour OpenBot Code sur l'ordinateur qui l'exécute.",
  "error.project.remoteFailed": "Le serveur n'a pas pu terminer cette action sur le projet. Réessaie.",
  "error.project.replyUnsupported": "Ce serveur ne peut pas partager les réglages de réponse. Mets le serveur à jour.",
  "error.project.replyFailed": "Le serveur n'a pas pu enregistrer la règle de réponse. Réessaie.",
  "error.project.notFound": "Ce projet n'existe plus.",
  "error.project.archived": "Ce projet est archivé. Restaure-le d'abord.",
  "error.project.nameRequired": "Donne un nom au projet.",
  "error.project.limit": "Tu as atteint le nombre maximal de projets ({limit}). Supprime d'abord un projet.",
  "error.project.agentLimit": "Un projet peut avoir au plus {limit} agents.",
  "error.project.agentRequired": "Un projet a besoin d'au moins un agent.",
  "error.project.agentNotFound": "Cet agent ne fait pas partie du projet.",
  "error.project.agentNameRequired": "Donne un nom à l'agent.",
  "error.project.runtimeProviderMismatch":
    "Une discussion peut utiliser un autre modèle du fournisseur de son agent. Pour un autre fournisseur, démarre la discussion avec un agent de ce fournisseur.",
  "error.project.chatNotFound": "Cette discussion n'existe plus.",
  "error.project.cursorInvalid":
    "Cette partie de la liste des discussions n'est plus valide. Recharge les discussions.",
  "error.project.folderMissing": "Ce dossier n'existe pas.",
  "error.project.folderProtected": "OpenBot Code ne peut pas utiliser ce dossier. Choisis un autre dossier.",
  "error.project.mainFolderMissing":
    "Le dossier principal de ce projet est introuvable : {path}. Restaure le dossier ou choisis un nouveau dossier principal.",
} as const satisfies PartialTranslation<typeof source>;
