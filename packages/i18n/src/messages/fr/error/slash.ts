import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/slash";

export const messages = {
  "error.slash.resumeUnsupported": "Cet agent ne peut pas reprendre une discussion enregistrée de son moteur.",
  "error.slash.resumeEngineOff": "Le moteur ne fonctionne pas. Démarre-le et réessaie.",
  "error.slash.sessionNotFound":
    "Cette discussion enregistrée n'existe plus. Actualise la liste et choisis-en une autre.",
  "error.slash.sessionInUse": "Une discussion d'OpenBot Code utilise déjà cette discussion enregistrée.",
  "error.slash.remoteFailed": "Le serveur n'a pas pu terminer cette commande. Réessaie.",
  "error.slash.serverUnsupported": "Ce serveur ne peut pas lister les commandes slash. Mets le serveur à jour.",
} as const satisfies PartialTranslation<typeof source>;
