import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/serverMode";

export const messages = {
  "serverMode.switch.label": "Dónde se ejecutan los agentes",
  "serverMode.switch.thisComputer": "Este ordenador",
  "serverMode.switch.homeServer": "Servidor doméstico",
  "serverMode.switch.homeServerNamed": "Ejecutar agentes en {name}",
  "serverMode.switch.noHomeServer": "Todavía no hay servidor doméstico. Elige uno para unirte.",
  "serverMode.switch.useComputer": "Ejecutar agentes en este ordenador",
  "serverMode.switch.useHomeServer": "Ejecutar agentes en el servidor doméstico",
} as const satisfies PartialTranslation<typeof source>;
