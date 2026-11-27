import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/advanced";

export const messages = {
  "advanced.tab.title": "Geavanceerde functies",
  "advanced.tab.description": "Zet functies aan die standaard verborgen zijn.",
  "advanced.section.title": "Verborgen functies",
  "advanced.section.description":
    "Elke schakelaar toont of verbergt een functie op {server}. Een functie die uit staat heeft geen knoppen, geen instellingen en geen agenttools. Je gegevens blijven bewaard.",
  "advanced.adminOnly": "Alleen een eigenaar of beheerder van deze server kan deze schakelaars wijzigen.",
  "advanced.loadFailed": "OpenBot Code kon de schakelaars van deze server niet lezen.",
  "advanced.saveFailed": "OpenBot Code kon de schakelaar niet opslaan.",
  "advanced.routines.title": "Routines",
  "advanced.routines.description":
    "Geplande taken en webhooks. Voegt Planning toe aan de linkerbalk en Routines aan de agentinstellingen.",
  "advanced.channels.title": "Kanalen",
  "advanced.channels.description": "Veel agents in één chat. Voegt Kanalen toe aan de linkerbalk.",
  "advanced.marketplace.title": "Marketplace",
  "advanced.marketplace.description": "Skills, agents en plugins om te installeren. Voegt de Marketplace-knop toe.",
  "advanced.chatApps.title": "Slack, Discord, Telegram en WhatsApp",
  "advanced.chatApps.description": "Verbind agents met chat-apps. Voegt de connectors voor chat-apps toe.",
  "advanced.chatApps.open.title": "Verbindingen met chat-apps",
  "advanced.chatApps.open.description": "Verbind Slack, Discord, Telegram of WhatsApp.",
  "advanced.chatApps.open.action": "Openen",
  "advanced.computerUse.title": "Computer Use",
  "advanced.computerUse.description":
    "Laat een agent apps op deze computer zien en bedienen. Voegt de instellingen voor Computer Use toe.",
  "advanced.remoteDesktop.title": "Extern bureaublad",
  "advanced.remoteDesktop.description": "Bedien het scherm van deze computer vanaf een ander apparaat.",
} as const satisfies PartialTranslation<typeof source>;
