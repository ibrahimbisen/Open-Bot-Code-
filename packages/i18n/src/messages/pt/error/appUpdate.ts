import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/appUpdate";

export const messages = {
  "error.appUpdate.noServer":
    "Nenhum servidor de atualização definido. Informe a URL do servidor de atualização em Configurações > Atualizações.",
  "error.appUpdate.urlInvalid": "A URL do servidor de atualização não é válida. Use uma URL que comece com https://.",
  "error.appUpdate.urlCredentials": "Remova o nome de usuário e a senha da URL do servidor de atualização.",
  "error.appUpdate.urlInsecure":
    "Use https:// para a URL do servidor de atualização. http:// só é permitido para um computador na sua própria rede.",
  "error.appUpdate.urlNotSaved":
    "O OpenBot Code não conseguiu salvar a URL do servidor de atualização. Tente novamente.",
} as const satisfies PartialTranslation<typeof source>;
