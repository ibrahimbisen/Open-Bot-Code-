import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/shortcut";

export const messages = {
  "shortcut.command.newChat": "Nuova chat",
  "shortcut.command.switchProject": "Passa al progetto successivo",
  "shortcut.command.splitPanel": "Dividi il pannello",
  "shortcut.command.closePanel": "Chiudi il pannello",
  "shortcut.command.openCommandMenu": "Apri il menu dei comandi",
} as const satisfies PartialTranslation<typeof source>;
