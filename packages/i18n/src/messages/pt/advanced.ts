import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/advanced";

export const messages = {
  "advanced.tab.title": "Recursos avançados",
  "advanced.tab.description": "Ative recursos que ficam ocultos por padrão.",
  "advanced.section.title": "Recursos ocultos",
  "advanced.section.description":
    "Cada interruptor mostra ou oculta um recurso em {server}. Um recurso desativado não tem botões, configurações nem ferramentas de agente. Seus dados permanecem.",
  "advanced.adminOnly": "Somente um proprietário ou administrador deste servidor pode alterar estes interruptores.",
  "advanced.loadFailed": "O OpenBot Code não conseguiu ler os interruptores deste servidor.",
  "advanced.saveFailed": "O OpenBot Code não conseguiu salvar o interruptor.",
  "advanced.routines.title": "Rotinas",
  "advanced.routines.description":
    "Tarefas agendadas e webhooks. Adiciona Agenda à barra esquerda e Rotinas às configurações do agente.",
  "advanced.channels.title": "Canais",
  "advanced.channels.description": "Vários agentes em um chat. Adiciona Canais à barra esquerda.",
  "advanced.marketplace.title": "Marketplace",
  "advanced.marketplace.description": "Skills, agentes e plugins para instalar. Adiciona o botão Marketplace.",
  "advanced.chatApps.title": "Slack, Discord, Telegram e WhatsApp",
  "advanced.chatApps.description": "Conecte agentes a apps de chat. Adiciona os conectores de apps de chat.",
  "advanced.chatApps.open.title": "Conexões de apps de chat",
  "advanced.chatApps.open.description": "Conecte Slack, Discord, Telegram ou WhatsApp.",
  "advanced.chatApps.open.action": "Abrir",
  "advanced.computerUse.title": "Computer Use",
  "advanced.computerUse.description":
    "Permite que um agente veja e controle apps neste computador. Adiciona as configurações de Computer Use.",
  "advanced.remoteDesktop.title": "Área de trabalho remota",
  "advanced.remoteDesktop.description": "Controle a tela deste computador a partir de outro dispositivo.",
} as const satisfies PartialTranslation<typeof source>;
