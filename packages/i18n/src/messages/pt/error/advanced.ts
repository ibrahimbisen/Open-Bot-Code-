import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/advanced";

export const messages = {
  "error.advanced.unsupported":
    "Este servidor não oferece suporte aos interruptores de recursos avançados. Atualize o servidor.",
  "error.advanced.invalidChange": "A alteração do recurso avançado não é válida.",
  "error.advanced.featureOff":
    "Esta ferramenta não está disponível porque o recurso está desativado. O usuário pode ativá-lo em Configurações > Recursos avançados.",
} as const satisfies PartialTranslation<typeof source>;
