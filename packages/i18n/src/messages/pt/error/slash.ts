import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/slash";

export const messages = {
  "error.slash.resumeUnsupported": "Este agente não consegue retomar um chat salvo a partir do seu motor.",
  "error.slash.resumeEngineOff": "O motor não está em execução. Inicie-o e tente novamente.",
  "error.slash.sessionNotFound": "Este chat salvo não existe mais. Atualize a lista e escolha outro.",
  "error.slash.sessionInUse": "Um chat no OpenBot Code já usa este chat salvo.",
  "error.slash.remoteFailed": "O servidor não conseguiu concluir este comando. Tente novamente.",
  "error.slash.serverUnsupported": "Este servidor não consegue listar comandos de barra. Atualize o servidor.",
} as const satisfies PartialTranslation<typeof source>;
