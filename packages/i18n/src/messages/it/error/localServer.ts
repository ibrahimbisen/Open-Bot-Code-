import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/localServer";

export const messages = {
  "error.localServer.refused":
    "Il server di modelli su {host} ha rifiutato la connessione. Avvia il server di modelli su quella macchina.",
  "error.localServer.hostNotFound": "L'indirizzo {host} non è stato trovato. Controlla il nome della macchina.",
  "error.localServer.timeout": "Il server di modelli su {host} non ha risposto entro {seconds} secondi.",
  "error.localServer.unreachable":
    "Il server di modelli su {host} non è raggiungibile. Assicurati che la macchina sia accesa e nella tua rete.",
  "error.localServer.redirect":
    "Il server di modelli su {host} ha inviato un reindirizzamento. OpenBot Code non segue i reindirizzamenti, per proteggere la chiave API.",
  "error.localServer.keyNeeded":
    "Il server di modelli su {host} richiede una chiave API. Aggiungi la chiave di questa macchina.",
  "error.localServer.keyRefused":
    "Il server di modelli su {host} ha rifiutato la chiave API. Controlla la chiave di questa macchina.",
  "error.localServer.http": "Il server di modelli su {host} ha risposto con lo stato HTTP {status}.",
  "error.localServer.invalidAnswer":
    "Il server di modelli su {host} non ha inviato un elenco di modelli compatibile con OpenAI.",
  "error.localServer.tooLarge": "La risposta del server di modelli su {host} è troppo grande.",
  "error.localServer.gpuUnreachable": "L'indirizzo di stato GPU {host} non è raggiungibile.",
  "error.localServer.gpuTimeout": "L'indirizzo di stato GPU {host} non ha risposto entro {seconds} secondi.",
  "error.localServer.gpuRedirect":
    "L'indirizzo di stato GPU {host} ha inviato un reindirizzamento. OpenBot Code non segue i reindirizzamenti.",
  "error.localServer.gpuHttp": "L'indirizzo di stato GPU {host} ha risposto con lo stato HTTP {status}.",
  "error.localServer.gpuInvalid":
    "L'indirizzo di stato GPU {host} non ha inviato valori GPU leggibili da OpenBot Code.",
  "error.localServer.gpuTooLarge": "La risposta dell'indirizzo di stato GPU {host} è troppo grande.",
  "error.localServer.gpuUrlInvalid":
    "L'URL di stato GPU deve essere un indirizzo http o https senza nome utente e password.",
  "error.localServer.gpuKeyOtherOrigin":
    "La chiave API può andare all'URL di stato GPU solo se quell'URL ha la stessa origine dell'URL di base.",
  "error.localServer.scanHostInvalid": "Inserisci un nome host, un indirizzo IP o un indirizzo http o https.",
} as const satisfies PartialTranslation<typeof source>;
