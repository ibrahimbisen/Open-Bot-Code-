import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/shortcut";

export const messages = {
  "shortcut.command.newChat": "Nowy czat",
  "shortcut.command.switchProject": "Przełącz na następny projekt",
  "shortcut.command.splitPanel": "Podziel panel",
  "shortcut.command.closePanel": "Zamknij panel",
  "shortcut.command.openCommandMenu": "Otwórz menu poleceń",
} as const satisfies PartialTranslation<typeof source>;
