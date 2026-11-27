import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/project";

export const messages = {
  "error.project.serverTooOld":
    "Este servidor não oferece suporte a projetos. Atualize o OpenBot Code no computador que o executa.",
  "error.project.remoteFailed": "O servidor não conseguiu concluir esta ação do projeto. Tente novamente.",
  "error.project.replyUnsupported":
    "Este servidor não consegue compartilhar configurações de resposta. Atualize o servidor.",
  "error.project.replyFailed": "O servidor não conseguiu salvar a regra de resposta. Tente novamente.",
  "error.project.notFound": "Este projeto não existe mais.",
  "error.project.archived": "Este projeto está arquivado. Restaure-o primeiro.",
  "error.project.nameRequired": "Dê um nome ao projeto.",
  "error.project.limit": "Você atingiu o número máximo de projetos ({limit}). Exclua um projeto primeiro.",
  "error.project.agentLimit": "Um projeto pode ter no máximo {limit} agentes.",
  "error.project.agentRequired": "Um projeto precisa de pelo menos um agente.",
  "error.project.agentNotFound": "Este agente não faz parte do projeto.",
  "error.project.agentNameRequired": "Dê um nome ao agente.",
  "error.project.runtimeProviderMismatch":
    "Um chat pode usar outro modelo do provedor do seu agente. Para outro provedor, inicie o chat com um agente desse provedor.",
  "error.project.chatNotFound": "Este chat não existe mais.",
  "error.project.cursorInvalid": "Esta parte da lista de chats não é mais válida. Carregue os chats novamente.",
  "error.project.folderMissing": "Esta pasta não existe.",
  "error.project.folderProtected": "O OpenBot Code não pode usar esta pasta. Escolha outra pasta.",
  "error.project.mainFolderMissing":
    "A pasta principal deste projeto está ausente: {path}. Restaure a pasta ou escolha uma nova pasta principal.",
} as const satisfies PartialTranslation<typeof source>;
