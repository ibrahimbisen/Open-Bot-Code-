import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/slash";

export const messages = {
  "slash.picker.label": "Opdrachten",
  "slash.picker.option": "Opdracht /{name}",
  "slash.picker.none":
    "De engine heeft zijn opdrachten nog niet gemeld. OpenBot Code leest ze wanneer de engine start.",
  "slash.picker.noMatch": "Geen opdracht komt overeen met “{query}”.",
  "slash.badge.project": "Project",
  "slash.badge.user": "Gebruiker",
  "slash.badge.plugin": "Plugin",
  "slash.badge.mcp": "MCP",
  "slash.badge.skill": "Skill",
  "slash.badge.host": "OpenBot Code",
  "slash.badge.terminal": "Alleen terminal",
  "slash.screen.close": "Sluiten",
  "slash.screen.loading": "Laden…",
  "slash.model.title": "Het model kiezen",
  "slash.model.description": "{name} gebruikt dit model vanaf het volgende bericht.",
  "slash.model.empty": "Er zijn geen modellen beschikbaar voor deze agent.",
  "slash.model.failed": "Het model is niet gewijzigd.",
  "slash.effort.title": "Denkniveau",
  "slash.effort.description": "Hoeveel {name} nadenkt voordat hij antwoordt.",
  "slash.effort.unsupported": "Het model van deze agent heeft geen denkniveaus.",
  "slash.effort.failed": "Het denkniveau is niet gewijzigd.",
  "slash.resume.title": "Een chat hervatten",
  "slash.resume.description":
    "Chats die de engine heeft opgeslagen voor de map van {name}. Een hervatte chat opent als een nieuwe chat.",
  "slash.resume.empty": "De engine heeft geen opgeslagen chats voor deze map.",
  "slash.resume.failed": "OpenBot Code kon de opgeslagen chats niet lezen.",
  "slash.resume.retry": "Opnieuw proberen",
  "slash.resume.inUse": "Open in OpenBot Code",
  "slash.resume.untitled": "Chat zonder titel",
  "slash.resume.branch": "Branch {name}",
  "slash.resume.updated": "Bijgewerkt {time}",
  "slash.resume.openFailed": "De chat is niet geopend.",
} as const satisfies PartialTranslation<typeof source>;
