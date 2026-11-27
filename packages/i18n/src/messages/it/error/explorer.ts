import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/explorer";

export const messages = {
  "error.explorer.outside": "Questo percorso non si trova nelle cartelle del progetto.",
  "error.explorer.notFound": "Il file o la cartella non esiste.",
  "error.explorer.rootProtected": "Qui non si può rinominare né eliminare una cartella del progetto.",
  "error.explorer.invalidName": "Questo nome non è valido per un file o una cartella.",
  "error.explorer.notFile": "Questo percorso non è un file.",
  "error.explorer.notDirectory": "Questo percorso non è una cartella.",
  "error.explorer.exists": "In questa cartella esiste già un file o una cartella con il nome {name}.",
  "error.explorer.unknownAgent": "L'agente di questo albero di file non esiste.",
  "error.explorer.gitTimeout": "Un comando Git ha impiegato troppo tempo ed è stato interrotto.",
  "error.explorer.gitFailed": "Git ha segnalato un errore: {detail}",
  "error.explorer.serverUnsupported": "Questo server non può mostrare i file. Aggiorna il server.",
  "error.explorer.clientUnsupported": "Questa versione di OpenBot Code non può mostrare i file di un server.",
  "error.explorer.remoteFailed": "Il server non è riuscito a completare questa azione sul file. Riprova.",
} as const satisfies PartialTranslation<typeof source>;
