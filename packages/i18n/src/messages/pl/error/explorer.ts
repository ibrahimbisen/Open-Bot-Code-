import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/explorer";

export const messages = {
  "error.explorer.outside": "Ta ścieżka nie należy do folderów projektu.",
  "error.explorer.notFound": "Plik lub folder nie istnieje.",
  "error.explorer.rootProtected": "Folderu projektu nie można tu zmienić ani usunąć.",
  "error.explorer.invalidName": "Ta nazwa nie jest prawidłowa dla pliku ani folderu.",
  "error.explorer.notFile": "Ta ścieżka nie jest plikiem.",
  "error.explorer.notDirectory": "Ta ścieżka nie jest folderem.",
  "error.explorer.exists": "W tym folderze jest już plik lub folder o nazwie {name}.",
  "error.explorer.unknownAgent": "Agent tego drzewa plików nie istnieje.",
  "error.explorer.gitTimeout": "Polecenie Git trwało zbyt długo i zostało zatrzymane.",
  "error.explorer.gitFailed": "Git zgłosił błąd: {detail}",
  "error.explorer.serverUnsupported": "Ten serwer nie może pokazać plików. Zaktualizuj serwer.",
  "error.explorer.clientUnsupported": "Ta wersja OpenBot Code nie może pokazać plików serwera.",
  "error.explorer.remoteFailed": "Serwer nie mógł dokończyć tej operacji na plikach. Spróbuj ponownie.",
} as const satisfies PartialTranslation<typeof source>;
