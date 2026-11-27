import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/project";

export const messages = {
  "error.project.serverTooOld":
    "Dieser Server unterstützt keine Projekte. Aktualisiere OpenBot Code auf dem Computer, auf dem er läuft.",
  "error.project.remoteFailed": "Der Server konnte diese Projektaktion nicht abschließen. Versuche es erneut.",
  "error.project.replyUnsupported": "Dieser Server kann keine Antworteinstellungen teilen. Aktualisiere den Server.",
  "error.project.replyFailed": "Der Server konnte die Antwortregel nicht speichern. Versuche es erneut.",
  "error.project.notFound": "Dieses Projekt existiert nicht mehr.",
  "error.project.archived": "Dieses Projekt ist archiviert. Stelle es zuerst wieder her.",
  "error.project.nameRequired": "Gib dem Projekt einen Namen.",
  "error.project.limit": "Du hast die maximale Anzahl an Projekten erreicht ({limit}). Lösche zuerst ein Projekt.",
  "error.project.agentLimit": "Ein Projekt kann höchstens {limit} Agenten haben.",
  "error.project.agentRequired": "Ein Projekt braucht mindestens einen Agenten.",
  "error.project.agentNotFound": "Dieser Agent gehört nicht zum Projekt.",
  "error.project.agentNameRequired": "Gib dem Agenten einen Namen.",
  "error.project.runtimeProviderMismatch":
    "Ein Chat kann ein anderes Modell des Anbieters seines Agenten verwenden. Für einen anderen Anbieter starte den Chat mit einem Agenten dieses Anbieters.",
  "error.project.chatNotFound": "Dieser Chat existiert nicht mehr.",
  "error.project.cursorInvalid": "Dieser Teil der Chatliste ist nicht mehr gültig. Lade die Chats erneut.",
  "error.project.folderMissing": "Dieser Ordner existiert nicht.",
  "error.project.folderProtected": "OpenBot Code kann diesen Ordner nicht verwenden. Wähle einen anderen Ordner.",
  "error.project.mainFolderMissing":
    "Der Hauptordner dieses Projekts fehlt: {path}. Stelle den Ordner wieder her oder wähle einen neuen Hauptordner.",
} as const satisfies PartialTranslation<typeof source>;
