import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/shortcut";

export const messages = {
  "shortcut.command.newChat": "Neuer Chat",
  "shortcut.command.switchProject": "Zum nächsten Projekt wechseln",
  "shortcut.command.splitPanel": "Das Panel teilen",
  "shortcut.command.closePanel": "Das Panel schließen",
  "shortcut.command.openCommandMenu": "Das Befehlsmenü öffnen",
} as const satisfies PartialTranslation<typeof source>;
