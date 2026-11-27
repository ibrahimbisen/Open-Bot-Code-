import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/advanced";

export const messages = {
  "advanced.tab.title": "Funzioni avanzate",
  "advanced.tab.description": "Attiva le funzioni nascoste per impostazione predefinita.",
  "advanced.section.title": "Funzioni nascoste",
  "advanced.section.description":
    "Ogni interruttore mostra o nasconde una funzione su {server}. Una funzione disattivata non ha pulsanti, impostazioni né strumenti per gli agenti. I tuoi dati restano.",
  "advanced.adminOnly": "Solo un proprietario o un amministratore di questo server può cambiare questi interruttori.",
  "advanced.loadFailed": "OpenBot Code non è riuscito a leggere gli interruttori di questo server.",
  "advanced.saveFailed": "OpenBot Code non è riuscito a salvare l'interruttore.",
  "advanced.routines.title": "Routine",
  "advanced.routines.description":
    "Attività pianificate e webhook. Aggiunge Pianificazione alla barra sinistra e Routine alle impostazioni dell'agente.",
  "advanced.channels.title": "Canali",
  "advanced.channels.description": "Molti agenti in una chat. Aggiunge Canali alla barra sinistra.",
  "advanced.marketplace.title": "Marketplace",
  "advanced.marketplace.description": "Skill, agenti e plugin da installare. Aggiunge il pulsante Marketplace.",
  "advanced.chatApps.title": "Slack, Discord, Telegram e WhatsApp",
  "advanced.chatApps.description": "Collega gli agenti alle app di chat. Aggiunge i connettori delle app di chat.",
  "advanced.chatApps.open.title": "Connessioni alle app di chat",
  "advanced.chatApps.open.description": "Collega Slack, Discord, Telegram o WhatsApp.",
  "advanced.chatApps.open.action": "Apri",
  "advanced.computerUse.title": "Computer Use",
  "advanced.computerUse.description":
    "Permette a un agente di vedere e controllare le app su questo computer. Aggiunge le impostazioni di Computer Use.",
  "advanced.remoteDesktop.title": "Desktop remoto",
  "advanced.remoteDesktop.description": "Controlla lo schermo di questo computer da un altro dispositivo.",
} as const satisfies PartialTranslation<typeof source>;
