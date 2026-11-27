import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/project";

export const messages = {
  "error.project.serverTooOld":
    "Ten serwer nie obsługuje projektów. Zaktualizuj OpenBot Code na komputerze, na którym działa.",
  "error.project.remoteFailed": "Serwer nie mógł dokończyć tej operacji na projekcie. Spróbuj ponownie.",
  "error.project.replyUnsupported": "Ten serwer nie może udostępniać ustawień odpowiedzi. Zaktualizuj serwer.",
  "error.project.replyFailed": "Serwer nie mógł zapisać reguły odpowiedzi. Spróbuj ponownie.",
  "error.project.notFound": "Ten projekt już nie istnieje.",
  "error.project.archived": "Ten projekt jest zarchiwizowany. Najpierw go przywróć.",
  "error.project.nameRequired": "Nadaj projektowi nazwę.",
  "error.project.limit": "Osiągnięto maksymalną liczbę projektów ({limit}). Najpierw usuń jakiś projekt.",
  "error.project.agentLimit": "Projekt może mieć najwyżej {limit} agentów.",
  "error.project.agentRequired": "Projekt potrzebuje co najmniej jednego agenta.",
  "error.project.agentNotFound": "Ten agent nie należy do projektu.",
  "error.project.agentNameRequired": "Nadaj agentowi nazwę.",
  "error.project.runtimeProviderMismatch":
    "Czat może używać innego modelu dostawcy swojego agenta. Aby użyć innego dostawcy, rozpocznij czat z agentem tego dostawcy.",
  "error.project.chatNotFound": "Ten czat już nie istnieje.",
  "error.project.cursorInvalid": "Ta część listy czatów nie jest już prawidłowa. Wczytaj czaty ponownie.",
  "error.project.folderMissing": "Ten folder nie istnieje.",
  "error.project.folderProtected": "OpenBot Code nie może użyć tego folderu. Wybierz inny folder.",
  "error.project.mainFolderMissing":
    "Brakuje głównego folderu tego projektu: {path}. Przywróć folder albo wybierz nowy folder główny.",
} as const satisfies PartialTranslation<typeof source>;
