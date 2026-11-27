import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/shortcut";

export const messages = {
  "shortcut.command.closePanel": "Paneli kapat",
  "shortcut.command.newChat": "Yeni sohbet",
  "shortcut.command.openCommandMenu": "Komut menüsünü aç",
  "shortcut.command.splitPanel": "Paneli böl",
  "shortcut.command.switchProject": "Sonraki projeye geç",
} as const satisfies PartialTranslation<typeof source>;
