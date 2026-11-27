import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/localServer";

export const messages = {
  "localServer.settings.title": "Server locali",
  "localServer.settings.description":
    "Macchine di modelli nella tua rete, come un DGX Spark. Ogni macchina è una voce separata.",
  "localServer.settings.add": "Aggiungi macchina",
  "localServer.settings.empty":
    "Ancora nessuna macchina locale. Aggiungi l'indirizzo di un server di modelli per usarlo in un progetto o in una chat.",
  "localServer.settings.edit": "Modifica {name}",
  "localServer.settings.remove": "Rimuovi {name}",
  "localServer.settings.refresh": "Controlla ora",
  "localServer.settings.statusOff": "Stato disattivato",
  "localServer.settings.models": { one: "{count} modello", other: "{count} modelli" },
  "localServer.scan.title": "Trova una macchina",
  "localServer.scan.description":
    "Inserisci un nome host o un indirizzo IP. OpenBot Code cerca Ollama, LM Studio e vLLM sulle porte abituali.",
  "localServer.scan.host": "Host o indirizzo",
  "localServer.scan.placeholder": "spark-1.local",
  "localServer.scan.action": "Cerca",
  "localServer.scan.scanning": "Ricerca in corso",
  "localServer.scan.none": "Nessun server di modelli trovato su questo host.",
  "localServer.scan.needsKey": "Richiede una chiave API",
  "localServer.scan.add": "Aggiungi {name}",
  "localServer.dialog.addTitle": "Aggiungi una macchina locale",
  "localServer.dialog.editTitle": "Modifica {name}",
  "localServer.dialog.description":
    "OpenBot Code legge l'elenco dei modelli e lo stato dall'indirizzo compatibile con OpenAI della macchina.",
  "localServer.field.name": "Nome",
  "localServer.field.namePlaceholder": "DGX Spark 1",
  "localServer.field.baseUrl": "Indirizzo del server",
  "localServer.field.baseUrlPlaceholder": "http://192.168.1.41:8000/v1",
  "localServer.field.apiKey": "Chiave API (facoltativa)",
  "localServer.field.apiKeyKept": "Salvata. Lascia vuoto per mantenerla.",
  "localServer.field.gpuUrl": "Indirizzo di stato GPU (facoltativo)",
  "localServer.field.gpuUrlPlaceholder": "http://192.168.1.41:9101/gpu",
  "localServer.field.gpuUrlHelp":
    "Un indirizzo JSON, di exporter nvidia-smi o di exporter DCGM che mostra carico e memoria della GPU.",
  "localServer.field.gpuUsesKey": "Invia la chiave API all'indirizzo di stato GPU",
  "localServer.field.gpuUsesKeyHelp": "Solo per un indirizzo con la stessa origine dell'indirizzo del server.",
  "localServer.field.monitored": "Mostra lo stato di questa macchina",
  "localServer.field.monitoredHelp":
    "OpenBot Code controlla la macchina di tanto in tanto e la mostra nella barra di stato.",
  "localServer.error.nameRequired": "Inserisci un nome.",
  "localServer.error.gpuUrlInvalid": "Inserisci un indirizzo http o https senza nome utente e password.",
  "localServer.error.gpuKeyOtherOrigin":
    "L'indirizzo di stato GPU deve avere la stessa origine dell'indirizzo del server.",
  "localServer.test.action": "Prova",
  "localServer.test.testing": "Prova in corso",
  "localServer.test.online": "Online. {models} trovati.",
  "localServer.test.onlineKind": "{kind} è online. {models} trovati.",
  "localServer.test.gpuFound": "Stato GPU letto: {count}",
  "localServer.test.gpuCount": { one: "{count} GPU", other: "{count} GPU" },
  "localServer.test.offline": "Offline. {error}",
  "localServer.test.gpuFailed": "Stato GPU non riuscito: {error}",
  "localServer.dialog.saving": "Salvataggio",
  "localServer.dialog.saveFailed": "OpenBot Code non è riuscito a salvare questa macchina.",
  "localServer.remove.title": "Rimuovere {name}?",
  "localServer.remove.description":
    "OpenBot Code smette di usare questa macchina. I progetti e le chat che usano i suoi modelli hanno bisogno di un altro modello.",
  "localServer.remove.failed": "OpenBot Code non è riuscito a rimuovere questa macchina.",
} as const satisfies PartialTranslation<typeof source>;
