import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/slash";

export const messages = {
  "error.slash.resumeUnsupported": "Questo agente non può riprendere una chat salvata dal suo motore.",
  "error.slash.resumeEngineOff": "Il motore non è in esecuzione. Avvialo e riprova.",
  "error.slash.sessionNotFound": "Questa chat salvata non esiste più. Aggiorna l'elenco e sceglierne un'altra.",
  "error.slash.sessionInUse": "Una chat di OpenBot Code usa già questa chat salvata.",
  "error.slash.remoteFailed": "Il server non è riuscito a completare questo comando. Riprova.",
  "error.slash.serverUnsupported": "Questo server non può elencare i comandi slash. Aggiorna il server.",
} as const satisfies PartialTranslation<typeof source>;
