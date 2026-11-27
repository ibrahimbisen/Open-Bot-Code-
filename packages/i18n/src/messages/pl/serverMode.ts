import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/serverMode";

export const messages = {
  "serverMode.switch.label": "Gdzie działają agenci",
  "serverMode.switch.thisComputer": "Ten komputer",
  "serverMode.switch.homeServer": "Serwer domowy",
  "serverMode.switch.homeServerNamed": "Uruchamiaj agentów na {name}",
  "serverMode.switch.noHomeServer": "Brak serwera domowego. Wybierz, aby dołączyć do jednego.",
  "serverMode.switch.useComputer": "Uruchamiaj agentów na tym komputerze",
  "serverMode.switch.useHomeServer": "Uruchamiaj agentów na serwerze domowym",
} as const satisfies PartialTranslation<typeof source>;
