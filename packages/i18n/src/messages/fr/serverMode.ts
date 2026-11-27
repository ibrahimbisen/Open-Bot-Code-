import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/serverMode";

export const messages = {
  "serverMode.switch.label": "Où les agents s'exécutent",
  "serverMode.switch.thisComputer": "Cet ordinateur",
  "serverMode.switch.homeServer": "Serveur domestique",
  "serverMode.switch.homeServerNamed": "Exécuter les agents sur {name}",
  "serverMode.switch.noHomeServer": "Pas encore de serveur domestique. Choisis-en un pour le rejoindre.",
  "serverMode.switch.useComputer": "Exécuter les agents sur cet ordinateur",
  "serverMode.switch.useHomeServer": "Exécuter les agents sur le serveur domestique",
} as const satisfies PartialTranslation<typeof source>;
