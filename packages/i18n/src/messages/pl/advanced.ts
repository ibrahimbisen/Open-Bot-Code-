import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/advanced";

export const messages = {
  "advanced.tab.title": "Funkcje zaawansowane",
  "advanced.tab.description": "Włącz funkcje, które są domyślnie ukryte.",
  "advanced.section.title": "Ukryte funkcje",
  "advanced.section.description":
    "Każdy przełącznik pokazuje lub ukrywa funkcję na {server}. Wyłączona funkcja nie ma przycisków, ustawień ani narzędzi agenta. Twoje dane pozostają.",
  "advanced.adminOnly": "Tylko właściciel lub administrator tego serwera może zmieniać te przełączniki.",
  "advanced.loadFailed": "OpenBot Code nie mógł odczytać przełączników tego serwera.",
  "advanced.saveFailed": "OpenBot Code nie mógł zapisać przełącznika.",
  "advanced.routines.title": "Rutyny",
  "advanced.routines.description":
    "Zaplanowane zadania i webhooki. Dodaje Harmonogram do lewego paska i Rutyny do ustawień agenta.",
  "advanced.channels.title": "Kanały",
  "advanced.channels.description": "Wiele agentów w jednym czacie. Dodaje Kanały do lewego paska.",
  "advanced.marketplace.title": "Marketplace",
  "advanced.marketplace.description": "Skille, agenci i wtyczki do zainstalowania. Dodaje przycisk Marketplace.",
  "advanced.chatApps.title": "Slack, Discord, Telegram i WhatsApp",
  "advanced.chatApps.description": "Połącz agentów z aplikacjami czatu. Dodaje złącza aplikacji czatu.",
  "advanced.chatApps.open.title": "Połączenia z aplikacjami czatu",
  "advanced.chatApps.open.description": "Połącz Slack, Discord, Telegram lub WhatsApp.",
  "advanced.chatApps.open.action": "Otwórz",
  "advanced.computerUse.title": "Computer Use",
  "advanced.computerUse.description":
    "Pozwala agentowi widzieć i sterować aplikacjami na tym komputerze. Dodaje ustawienia Computer Use.",
  "advanced.remoteDesktop.title": "Pulpit zdalny",
  "advanced.remoteDesktop.description": "Steruj ekranem tego komputera z innego urządzenia.",
} as const satisfies PartialTranslation<typeof source>;
