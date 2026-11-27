import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/serverMode";

export const messages = {
  "serverMode.switch.label": "Waar agents draaien",
  "serverMode.switch.thisComputer": "Deze computer",
  "serverMode.switch.homeServer": "Thuisserver",
  "serverMode.switch.homeServerNamed": "Agents uitvoeren op {name}",
  "serverMode.switch.noHomeServer": "Nog geen thuisserver. Kies om je bij een aan te sluiten.",
  "serverMode.switch.useComputer": "Agents uitvoeren op deze computer",
  "serverMode.switch.useHomeServer": "Agents uitvoeren op de thuisserver",
} as const satisfies PartialTranslation<typeof source>;
