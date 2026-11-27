import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/advanced";

export const messages = {
  "advanced.tab.title": "Erweiterte Funktionen",
  "advanced.tab.description": "Schalte Funktionen ein, die standardmäßig ausgeblendet sind.",
  "advanced.section.title": "Ausgeblendete Funktionen",
  "advanced.section.description":
    "Jeder Schalter blendet eine Funktion auf {server} ein oder aus. Eine ausgeschaltete Funktion hat keine Schaltflächen, keine Einstellungen und keine Agententools. Deine Daten bleiben erhalten.",
  "advanced.adminOnly": "Nur ein Eigentümer oder Admin dieses Servers kann diese Schalter ändern.",
  "advanced.loadFailed": "OpenBot Code konnte die Schalter dieses Servers nicht lesen.",
  "advanced.saveFailed": "OpenBot Code konnte den Schalter nicht speichern.",
  "advanced.routines.title": "Routinen",
  "advanced.routines.description":
    "Geplante Aufgaben und Webhooks. Fügt Zeitplan zur linken Leiste und Routinen zu den Agenteneinstellungen hinzu.",
  "advanced.channels.title": "Channels",
  "advanced.channels.description": "Viele Agenten in einem Chat. Fügt Channels zur linken Leiste hinzu.",
  "advanced.marketplace.title": "Marketplace",
  "advanced.marketplace.description":
    "Skills, Agenten und Plugins zum Installieren. Fügt die Marketplace-Schaltfläche hinzu.",
  "advanced.chatApps.title": "Slack, Discord, Telegram und WhatsApp",
  "advanced.chatApps.description": "Verbinde Agenten mit Chat-Apps. Fügt die Chat-App-Konnektoren hinzu.",
  "advanced.chatApps.open.title": "Chat-App-Verbindungen",
  "advanced.chatApps.open.description": "Verbinde Slack, Discord, Telegram oder WhatsApp.",
  "advanced.chatApps.open.action": "Öffnen",
  "advanced.computerUse.title": "Computer Use",
  "advanced.computerUse.description":
    "Lässt einen Agenten Apps auf diesem Computer sehen und steuern. Fügt die Einstellungen für Computer Use hinzu.",
  "advanced.remoteDesktop.title": "Remote-Desktop",
  "advanced.remoteDesktop.description": "Steuere den Bildschirm dieses Computers von einem anderen Gerät aus.",
} as const satisfies PartialTranslation<typeof source>;
