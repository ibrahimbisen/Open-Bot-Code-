import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/explorer";

export const messages = {
  "error.explorer.outside": "Dieser Pfad liegt nicht in den Ordnern des Projekts.",
  "error.explorer.notFound": "Die Datei oder der Ordner existiert nicht.",
  "error.explorer.rootProtected": "Ein Projektordner kann hier nicht umbenannt oder gelöscht werden.",
  "error.explorer.invalidName": "Dieser Name ist für eine Datei oder einen Ordner nicht gültig.",
  "error.explorer.notFile": "Dieser Pfad ist keine Datei.",
  "error.explorer.notDirectory": "Dieser Pfad ist kein Ordner.",
  "error.explorer.exists": "In diesem Ordner gibt es bereits eine Datei oder einen Ordner mit dem Namen {name}.",
  "error.explorer.unknownAgent": "Der Agent dieses Dateibaums existiert nicht.",
  "error.explorer.gitTimeout": "Ein Git-Befehl hat zu lange gedauert und wurde gestoppt.",
  "error.explorer.gitFailed": "Git hat einen Fehler gemeldet: {detail}",
  "error.explorer.serverUnsupported": "Dieser Server kann keine Dateien anzeigen. Aktualisiere den Server.",
  "error.explorer.clientUnsupported": "Diese Version von OpenBot Code kann die Dateien eines Servers nicht anzeigen.",
  "error.explorer.remoteFailed": "Der Server konnte diese Dateiaktion nicht abschließen. Versuche es erneut.",
} as const satisfies PartialTranslation<typeof source>;
