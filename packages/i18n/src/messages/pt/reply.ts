import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/reply";

export const messages = {
  "reply.summary.edited": { one: "editou {count} arquivo", other: "editou {count} arquivos" },
  "reply.summary.ran": { one: "executou {count} comando", other: "executou {count} comandos" },
  "reply.summary.read": { one: "leu {count} arquivo", other: "leu {count} arquivos" },
  "reply.summary.searched": { one: "pesquisou {count} vez", other: "pesquisou {count} vezes" },
  "reply.summary.browsed": { one: "abriu {count} página", other: "abriu {count} páginas" },
  "reply.summary.delegated": { one: "delegou {count} tarefa", other: "delegou {count} tarefas" },
  "reply.summary.worked": { one: "usou {count} outra ferramenta", other: "usou {count} outras ferramentas" },
  "reply.details.show": "Detalhes",
  "reply.details.hide": "Ocultar detalhes",
  "reply.details.loading": "Carregando detalhes…",
  "reply.details.input": "Entrada",
  "reply.details.output": "Saída",
  "reply.details.shortened": "Abreviado",
  "reply.details.timeline": "Linha do tempo",
  "reply.code.showAll": "Mostrar tudo ({count} linhas)",
  "reply.code.showLess": "Mostrar menos",
  "reply.view.title": "Visualização da resposta",
  "reply.view.description":
    "Curto mostra a resposta e um resumo de uma linha do trabalho. Detalhado mostra também as etapas.",
  "reply.view.short": "Curto",
  "reply.view.detailed": "Detalhado",
  "reply.rule.title": "Regra de resposta",
  "reply.rule.description": "Todo chat recebe esta regra. Os projetos podem usar sua própria regra.",
  "reply.rule.label": "Regra de respostas",
  "reply.rule.save": "Salvar regra",
  "reply.rule.reset": "Usar regra padrão",
  "reply.rule.saved": "Regra salva",
  "reply.rule.empty": "Vazio: nenhuma regra de resposta é enviada",
  "reply.rule.count": "{count} de {max} caracteres",
} as const satisfies PartialTranslation<typeof source>;
