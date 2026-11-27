import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/appUpdate";

export const messages = {
  "appUpdate.server.title": "Serwer aktualizacji",
  "appUpdate.server.description":
    "Zostaw puste, aby pobierać aktualizacje z wydań OpenBot Code na GitHubie. Aby użyć własnego serwera, wpisz URL folderu z instalatorami i plikami aktualizacji.",
  "appUpdate.server.urlLabel": "Adres URL serwera aktualizacji",
  "appUpdate.server.placeholder": "https://example.com/codebot-updates/",
  "appUpdate.server.source.settings": "OpenBot Code pobiera aktualizacje z tego adresu URL.",
  "appUpdate.server.source.environment":
    "OpenBot Code pobiera aktualizacje z {url}. Ten adres pochodzi ze zmiennej środowiskowej CODEBOT_UPDATE_URL.",
  "appUpdate.server.source.build":
    "OpenBot Code pobiera aktualizacje z {url}. Ten adres pochodzi z tej wersji OpenBot Code.",
  "appUpdate.server.source.none": "Nie ustawiono serwera aktualizacji. OpenBot Code nie sprawdza aktualizacji.",
  "appUpdate.server.saveFailed": "OpenBot Code nie mógł zapisać adresu URL serwera aktualizacji.",
  "appUpdate.server.loadFailed": "OpenBot Code nie mógł odczytać adresu URL serwera aktualizacji.",
  "appUpdate.autoRestart.title": "Uruchom ponownie automatycznie, gdy aplikacja jest bezczynna",
  "appUpdate.autoRestart.description":
    "OpenBot Code uruchamia się ponownie, aby zainstalować pobraną aktualizację, gdy żaden agent nie pracuje. Członkowie Twoich serwerów są na krótko rozłączani.",
} as const satisfies PartialTranslation<typeof source>;
