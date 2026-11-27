import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/explorer";

export const messages = {
  "error.explorer.outside": "Este caminho não está nas pastas do projeto.",
  "error.explorer.notFound": "O arquivo ou a pasta não existe.",
  "error.explorer.rootProtected": "Uma pasta do projeto não pode ser renomeada nem excluída aqui.",
  "error.explorer.invalidName": "Este nome não é válido para um arquivo ou uma pasta.",
  "error.explorer.notFile": "Este caminho não é um arquivo.",
  "error.explorer.notDirectory": "Este caminho não é uma pasta.",
  "error.explorer.exists": "Já existe um arquivo ou pasta com o nome {name} nesta pasta.",
  "error.explorer.unknownAgent": "O agente desta árvore de arquivos não existe.",
  "error.explorer.gitTimeout": "Um comando do Git demorou demais e foi interrompido.",
  "error.explorer.gitFailed": "O Git relatou um erro: {detail}",
  "error.explorer.serverUnsupported": "Este servidor não consegue mostrar arquivos. Atualize o servidor.",
  "error.explorer.clientUnsupported": "Esta versão do OpenBot Code não consegue mostrar os arquivos de um servidor.",
  "error.explorer.remoteFailed": "O servidor não conseguiu concluir esta ação de arquivo. Tente novamente.",
} as const satisfies PartialTranslation<typeof source>;
