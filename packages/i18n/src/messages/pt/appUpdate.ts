import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/appUpdate";

export const messages = {
  "appUpdate.server.title": "Servidor de atualização",
  "appUpdate.server.description":
    "Deixe vazio para receber atualizações das versões do OpenBot Code no GitHub. Para usar seu próprio servidor, insira a URL da pasta com os instaladores e os arquivos de atualização.",
  "appUpdate.server.urlLabel": "URL do servidor de atualização",
  "appUpdate.server.placeholder": "https://example.com/codebot-updates/",
  "appUpdate.server.source.settings": "O OpenBot Code busca atualizações nesta URL.",
  "appUpdate.server.source.environment":
    "O OpenBot Code busca atualizações em {url}. Esta URL vem da variável de ambiente CODEBOT_UPDATE_URL.",
  "appUpdate.server.source.build":
    "O OpenBot Code busca atualizações em {url}. Esta URL vem desta versão do OpenBot Code.",
  "appUpdate.server.source.none": "Nenhum servidor de atualização definido. O OpenBot Code não verifica atualizações.",
  "appUpdate.server.saveFailed": "O OpenBot Code não conseguiu salvar a URL do servidor de atualização.",
  "appUpdate.server.loadFailed": "O OpenBot Code não conseguiu ler a URL do servidor de atualização.",
  "appUpdate.autoRestart.title": "Reiniciar automaticamente quando ocioso",
  "appUpdate.autoRestart.description":
    "O OpenBot Code reinicia para instalar uma atualização baixada quando nenhum agente está trabalhando. Os membros dos seus servidores ficam desconectados por um curto período.",
} as const satisfies PartialTranslation<typeof source>;
