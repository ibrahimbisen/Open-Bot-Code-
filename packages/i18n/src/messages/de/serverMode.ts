import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/serverMode";

export const messages = {
  "serverMode.switch.label": "Wo Agenten laufen",
  "serverMode.switch.thisComputer": "Dieser Computer",
  "serverMode.switch.homeServer": "Heimserver",
  "serverMode.switch.homeServerNamed": "Agenten auf {name} ausführen",
  "serverMode.switch.noHomeServer": "Noch kein Heimserver. Wähle, um einem beizutreten.",
  "serverMode.switch.useComputer": "Agenten auf diesem Computer ausführen",
  "serverMode.switch.useHomeServer": "Agenten auf dem Heimserver ausführen",
} as const satisfies PartialTranslation<typeof source>;
