import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/project";

export const messages = {
  "error.project.serverTooOld":
    "Deze server ondersteunt geen projecten. Werk OpenBot Code bij op de computer waarop de server draait.",
  "error.project.remoteFailed": "De server kon deze projectactie niet voltooien. Probeer het opnieuw.",
  "error.project.replyUnsupported": "Deze server kan geen antwoordinstellingen delen. Werk de server bij.",
  "error.project.replyFailed": "De server kon de antwoordregel niet opslaan. Probeer het opnieuw.",
  "error.project.notFound": "Dit project bestaat niet meer.",
  "error.project.archived": "Dit project is gearchiveerd. Herstel het eerst.",
  "error.project.nameRequired": "Geef het project een naam.",
  "error.project.limit": "Je hebt het maximumaantal projecten bereikt ({limit}). Verwijder eerst een project.",
  "error.project.agentLimit": "Een project kan maximaal {limit} agents hebben.",
  "error.project.agentRequired": "Een project heeft minstens één agent nodig.",
  "error.project.agentNotFound": "Deze agent hoort niet bij het project.",
  "error.project.agentNameRequired": "Geef de agent een naam.",
  "error.project.runtimeProviderMismatch":
    "Een chat kan een ander model van de provider van zijn agent gebruiken. Start voor een andere provider de chat met een agent van die provider.",
  "error.project.chatNotFound": "Deze chat bestaat niet meer.",
  "error.project.cursorInvalid": "Dit deel van de chatlijst is niet meer geldig. Laad de chats opnieuw.",
  "error.project.folderMissing": "Deze map bestaat niet.",
  "error.project.folderProtected": "OpenBot Code kan deze map niet gebruiken. Kies een andere map.",
  "error.project.mainFolderMissing":
    "De hoofdmap van dit project ontbreekt: {path}. Herstel de map of kies een nieuwe hoofdmap.",
} as const satisfies PartialTranslation<typeof source>;
