import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/advanced";

export const messages = {
  "error.advanced.unsupported": "Ten serwer nie obsługuje przełączników funkcji zaawansowanych. Zaktualizuj serwer.",
  "error.advanced.invalidChange": "Zmiana funkcji zaawansowanej jest nieprawidłowa.",
  "error.advanced.featureOff":
    "To narzędzie jest niedostępne, ponieważ funkcja jest wyłączona. Użytkownik może ją włączyć w Ustawienia > Funkcje zaawansowane.",
} as const satisfies PartialTranslation<typeof source>;
