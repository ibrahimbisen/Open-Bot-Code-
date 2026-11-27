import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/shortcut";

export const messages = {
  "shortcut.command.newChat": "Nieuwe chat",
  "shortcut.command.switchProject": "Naar het volgende project gaan",
  "shortcut.command.splitPanel": "Het paneel splitsen",
  "shortcut.command.closePanel": "Het paneel sluiten",
  "shortcut.command.openCommandMenu": "Het opdrachtenmenu openen",
} as const satisfies PartialTranslation<typeof source>;
