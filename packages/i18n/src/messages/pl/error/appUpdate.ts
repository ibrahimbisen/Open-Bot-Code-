import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/appUpdate";

export const messages = {
  "error.appUpdate.noServer":
    "Nie ustawiono serwera aktualizacji. Wpisz adres URL serwera aktualizacji w Ustawienia > Aktualizacje.",
  "error.appUpdate.urlInvalid":
    "Adres URL serwera aktualizacji jest nieprawidłowy. Użyj adresu, który zaczyna się od https://.",
  "error.appUpdate.urlCredentials": "Usuń nazwę użytkownika i hasło z adresu URL serwera aktualizacji.",
  "error.appUpdate.urlInsecure":
    "Użyj https:// dla adresu URL serwera aktualizacji. http:// jest dozwolone tylko dla komputera w Twojej własnej sieci.",
  "error.appUpdate.urlNotSaved": "OpenBot Code nie mógł zapisać adresu URL serwera aktualizacji. Spróbuj ponownie.",
  "error.appUpdate.manualDownload":
    "Ta wersja dla Maca nie jest podpisana, więc OpenBot Code nie może sam instalować aktualizacji. Wybierz Pobierz, aby otworzyć stronę pobierania, a potem zainstaluj nową wersję ręcznie.",
} as const satisfies PartialTranslation<typeof source>;
