import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/serverMode";

export const messages = {
  "serverMode.switch.label": "Onde os agentes são executados",
  "serverMode.switch.thisComputer": "Este computador",
  "serverMode.switch.homeServer": "Servidor doméstico",
  "serverMode.switch.homeServerNamed": "Executar agentes em {name}",
  "serverMode.switch.noHomeServer": "Nenhum servidor doméstico ainda. Escolha para entrar em um.",
  "serverMode.switch.useComputer": "Executar agentes neste computador",
  "serverMode.switch.useHomeServer": "Executar agentes no servidor doméstico",
} as const satisfies PartialTranslation<typeof source>;
