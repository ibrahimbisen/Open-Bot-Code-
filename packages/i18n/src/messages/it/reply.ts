import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/reply";

export const messages = {
  "reply.summary.edited": { one: "ha modificato {count} file", other: "ha modificato {count} file" },
  "reply.summary.ran": { one: "ha eseguito {count} comando", other: "ha eseguito {count} comandi" },
  "reply.summary.read": { one: "ha letto {count} file", other: "ha letto {count} file" },
  "reply.summary.searched": { one: "ha cercato {count} volta", other: "ha cercato {count} volte" },
  "reply.summary.browsed": { one: "ha aperto {count} pagina", other: "ha aperto {count} pagine" },
  "reply.summary.delegated": { one: "ha affidato {count} attività", other: "ha affidato {count} attività" },
  "reply.summary.worked": { one: "ha usato {count} altro strumento", other: "ha usato {count} altri strumenti" },
  "reply.details.show": "Dettagli",
  "reply.details.hide": "Nascondi i dettagli",
  "reply.details.loading": "Caricamento dei dettagli…",
  "reply.details.input": "Input",
  "reply.details.output": "Output",
  "reply.details.shortened": "Abbreviato",
  "reply.details.timeline": "Cronologia",
  "reply.code.showAll": "Mostra tutto ({count} righe)",
  "reply.code.showLess": "Mostra meno",
  "reply.view.title": "Vista delle risposte",
  "reply.view.description":
    "Breve mostra la risposta e un riepilogo di una riga del lavoro. Dettagliata mostra anche i passaggi.",
  "reply.view.short": "Breve",
  "reply.view.detailed": "Dettagliata",
  "reply.rule.title": "Regola di risposta",
  "reply.rule.description": "Ogni chat riceve questa regola. I progetti possono usare una propria regola.",
  "reply.rule.label": "Regola per le risposte",
  "reply.rule.save": "Salva regola",
  "reply.rule.reset": "Usa la regola predefinita",
  "reply.rule.saved": "Regola salvata",
  "reply.rule.empty": "Vuota: non viene inviata nessuna regola di risposta",
  "reply.rule.count": "{count} di {max} caratteri",
} as const satisfies PartialTranslation<typeof source>;
