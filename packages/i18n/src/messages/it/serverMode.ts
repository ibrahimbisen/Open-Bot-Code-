import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/serverMode";

export const messages = {
  "serverMode.switch.label": "Dove girano gli agenti",
  "serverMode.switch.thisComputer": "Questo computer",
  "serverMode.switch.homeServer": "Server di casa",
  "serverMode.switch.homeServerNamed": "Esegui gli agenti su {name}",
  "serverMode.switch.noHomeServer": "Ancora nessun server di casa. Scegli per unirti a uno.",
  "serverMode.switch.useComputer": "Esegui gli agenti su questo computer",
  "serverMode.switch.useHomeServer": "Esegui gli agenti sul server di casa",
} as const satisfies PartialTranslation<typeof source>;
