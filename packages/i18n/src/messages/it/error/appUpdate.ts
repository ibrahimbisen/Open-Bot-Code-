import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/appUpdate";

export const messages = {
  "error.appUpdate.noServer":
    "Nessun server di aggiornamento impostato. Inserisci l'URL del server di aggiornamento in Impostazioni > Aggiornamenti.",
  "error.appUpdate.urlInvalid": "L'URL del server di aggiornamento non è valido. Usa un URL che inizia con https://.",
  "error.appUpdate.urlCredentials": "Rimuovi il nome utente e la password dall'URL del server di aggiornamento.",
  "error.appUpdate.urlInsecure":
    "Usa https:// per l'URL del server di aggiornamento. http:// è consentito solo per un computer della tua rete.",
  "error.appUpdate.urlNotSaved": "OpenBot Code non è riuscito a salvare l'URL del server di aggiornamento. Riprova.",
} as const satisfies PartialTranslation<typeof source>;
