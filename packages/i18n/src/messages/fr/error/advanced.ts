import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/advanced";

export const messages = {
  "error.advanced.unsupported":
    "Ce serveur ne prend pas en charge les interrupteurs de fonctions avancées. Mets le serveur à jour.",
  "error.advanced.invalidChange": "La modification de la fonction avancée n'est pas valide.",
  "error.advanced.featureOff":
    "Cet outil n'est pas disponible car la fonction est désactivée. L'utilisateur peut l'activer dans Réglages > Fonctions avancées.",
} as const satisfies PartialTranslation<typeof source>;
