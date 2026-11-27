import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/shortcut";

export const messages = {
  "shortcut.command.newChat": "Nouvelle discussion",
  "shortcut.command.switchProject": "Passer au projet suivant",
  "shortcut.command.splitPanel": "Diviser le panneau",
  "shortcut.command.closePanel": "Fermer le panneau",
  "shortcut.command.openCommandMenu": "Ouvrir le menu des commandes",
} as const satisfies PartialTranslation<typeof source>;
