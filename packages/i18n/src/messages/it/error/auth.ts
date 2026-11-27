import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/auth";

export const messages = {
  "error.auth.serviceUnavailable":
    "OpenBot Code non è riuscito a raggiungere il servizio account. Controlla che l'API sia in esecuzione, poi riprova.",
  "error.auth.sessionTimeout":
    "OpenBot Code non ha risposto in tempo. Controlla la connessione a internet, poi riprova.",
  "error.auth.networkBlocked":
    "Un firewall o un proxy di questa rete ha impedito a OpenBot Code di raggiungere {host}. Chiedi all'amministratore di rete di consentire {host}, poi riprova.",
  "error.auth.signInFirst": "Accedi prima a OpenBot Code.",
  "error.auth.signInRequired": "Serve l'accesso.",
  "error.auth.chatColorUnavailable": "Il servizio account non supporta ancora i colori della chat. Riprova più tardi.",
  "error.auth.accountChangedDuringRegister": "L'account connesso è cambiato durante la registrazione di questo server.",
  "error.auth.hostCredentialUnavailable":
    "La credenziale dell'host remoto non è disponibile. Registra di nuovo l'host.",
  "error.auth.serviceError": "Il servizio account ha restituito un errore.",
  "error.auth.serviceUnreachable":
    "OpenBot Code non è riuscito a raggiungere il servizio account. Controlla la connessione, poi riprova.",
  "error.auth.serviceTimeout": "Il servizio account non ha risposto in tempo. Riprova.",
  "error.auth.serviceStatus": "Il servizio account ha restituito un errore ({status}). Riprova più tardi.",
  "error.auth.deliveryTimeout":
    "OpenBot Code non ha potuto confermare la consegna in tempo. Il codice potrebbe comunque arrivare: controlla la consegna prima di inviarlo di nuovo.",
} as const satisfies PartialTranslation<typeof source>;
