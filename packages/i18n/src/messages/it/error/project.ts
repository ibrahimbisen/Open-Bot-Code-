import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/project";

export const messages = {
  "error.project.serverTooOld":
    "Questo server non supporta i progetti. Aggiorna OpenBot Code sul computer che lo esegue.",
  "error.project.remoteFailed": "Il server non è riuscito a completare questa azione sul progetto. Riprova.",
  "error.project.replyUnsupported":
    "Questo server non può condividere le impostazioni di risposta. Aggiorna il server.",
  "error.project.replyFailed": "Il server non è riuscito a salvare la regola di risposta. Riprova.",
  "error.project.notFound": "Questo progetto non esiste più.",
  "error.project.archived": "Questo progetto è archiviato. Ripristinalo prima.",
  "error.project.nameRequired": "Dai un nome al progetto.",
  "error.project.limit": "Hai raggiunto il numero massimo di progetti ({limit}). Elimina prima un progetto.",
  "error.project.agentLimit": "Un progetto può avere al massimo {limit} agenti.",
  "error.project.agentRequired": "Un progetto richiede almeno un agente.",
  "error.project.agentNotFound": "Questo agente non fa parte del progetto.",
  "error.project.agentNameRequired": "Dai un nome all'agente.",
  "error.project.runtimeProviderMismatch":
    "Una chat può usare un altro modello del provider del suo agente. Per un altro provider, avvia la chat con un agente di quel provider.",
  "error.project.chatNotFound": "Questa chat non esiste più.",
  "error.project.cursorInvalid": "Questa parte dell'elenco delle chat non è più valida. Ricarica le chat.",
  "error.project.folderMissing": "Questa cartella non esiste.",
  "error.project.folderProtected": "OpenBot Code non può usare questa cartella. Scegli un'altra cartella.",
  "error.project.mainFolderMissing":
    "La cartella principale di questo progetto manca: {path}. Ripristina la cartella o scegli una nuova cartella principale.",
  "error.project.ownerOnly": "Solo la persona che ha creato questo progetto può usarlo.",
  "error.project.memberFolder": "Usa una cartella nel tuo spazio progetti su questo server.",
  "error.project.memberOpenAccess":
    "Solo un proprietario o un admin può dare a un progetto accesso completo a questo computer.",
} as const satisfies PartialTranslation<typeof source>;
