import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/shortcut";

export const messages = {
  "shortcut.command.newChat": "Yeni sohbet",
  "shortcut.command.switchProject": "Sonraki projeye geç",
  "shortcut.command.splitPanel": "Paneli böl",
  "shortcut.command.closePanel": "Paneli kapat",
  "shortcut.command.openCommandMenu": "Komut menüsünü aç",
} as const satisfies PartialTranslation<typeof source>;
