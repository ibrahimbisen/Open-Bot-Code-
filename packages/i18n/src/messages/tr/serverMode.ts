import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/serverMode";

export const messages = {
  "serverMode.switch.label": "Ajanların çalıştığı yer",
  "serverMode.switch.thisComputer": "Bu bilgisayar",
  "serverMode.switch.homeServer": "Ev sunucusu",
  "serverMode.switch.homeServerNamed": "Ajanları {name} üzerinde çalıştır",
  "serverMode.switch.noHomeServer": "Henüz ev sunucusu yok. Birine katılmak için seçin.",
  "serverMode.switch.useComputer": "Ajanları bu bilgisayarda çalıştır",
  "serverMode.switch.useHomeServer": "Ajanları ev sunucusunda çalıştır",
} as const satisfies PartialTranslation<typeof source>;
