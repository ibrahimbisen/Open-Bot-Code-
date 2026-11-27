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
} as const satisfies PartialTranslation<typeof source>;
