import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/update";

export const messages = {
  "error.update.unsupported": "Aktualizacje są dostępne w zainstalowanych wersjach desktopowych.",
  "error.update.notReady": "Aktualizacja nie jest gotowa do instalacji.",
  "error.update.restartFailed": "CodeBot nie mógł uruchomić się ponownie, aby zainstalować aktualizację.",
  "error.update.downloadStalled": "Pobieranie aktualizacji przestało odpowiadać. Spróbuj ponownie.",
  "error.update.installFailed":
    "Nie udało się zainstalować aktualizacji. Zamknij i otwórz ponownie CodeBot, a potem spróbuj ponownie.",
  "error.update.notInstalled":
    "Ostatnie ponowne uruchomienie nie zainstalowało aktualizacji. Uruchom ponownie, aby spróbować jeszcze raz.",
  "error.update.downloadFailed": "Nie udało się pobrać aktualizacji. Spróbuj ponownie.",
  "error.update.signatureNotConfirmed":
    "CodeBot nie mógł zweryfikować aktualizacji. Spróbuj ponownie. Jeśli błąd się powtarza, pobierz CodeBot ze strony openbot.run/download.",
  "error.update.checkFailed": "Nie udało się sprawdzić aktualizacji. Spróbuj ponownie.",
  "error.update.checkStalled": "Sprawdzanie aktualizacji przestało odpowiadać. Spróbuj ponownie.",
  "error.update.checkOffline":
    "Nie udało się połączyć z usługą aktualizacji. Sprawdź połączenie z internetem i spróbuj ponownie.",
  "error.update.checkUnavailable":
    "Usługa aktualizacji nie odpowiedziała. CodeBot sam spróbuje ponownie za kilka minut.",
  "error.update.checkNoRelease":
    "Nie znaleziono opublikowanej aktualizacji dla tej platformy. CodeBot sam spróbuje ponownie za kilka minut.",
  "error.update.managedByNix": "Aktualizacje tej kopii CodeBot instaluje Nix. Zaktualizuj ją przez Nix.",
  "error.update.managedByHost":
    "Aktualizacje na tym Macu instaluje host. Aktualizacja pozostaje gotowa do czasu konserwacji hosta.",
  "error.update.siblingSession":
    "Inna sesja CodeBot nadal działa z tej aplikacji. Najpierw zatrzymaj CodeBot na każdym innym koncie użytkownika macOS, a potem ponownie zainstaluj aktualizację.",
  "error.update.siblingSessionSameAccount":
    "Inny proces CodeBot nadal działa na tym koncie użytkownika. Zamknij go, a potem ponownie zainstaluj aktualizację.",
  "error.update.siblingCheckFailed": "Nie udało się sprawdzić innych sesji CodeBot. Spróbuj ponownie przed instalacją.",
  "error.update.readOnlyLocation":
    "CodeBot nie może instalować aktualizacji z tej lokalizacji. Zamknij CodeBot. W Finderze przeciągnij CodeBot do folderu Aplikacje (jeśli już tam jest, przeciągnij go na zewnątrz i z powrotem). Następnie otwórz CodeBot i zainstaluj aktualizację ponownie.",
  "error.update.appImageMissing":
    "CodeBot nie może zainstalować aktualizacji, ponieważ jego plik AppImage został przeniesiony, zmieniono jego nazwę lub go zastąpiono. Zamknij CodeBot, a następnie ponownie otwórz plik AppImage.",
  "error.update.appImageReadOnly":
    "CodeBot nie może instalować aktualizacji w folderze swojego pliku AppImage. Zamknij CodeBot, przenieś plik AppImage do folderu w swoim folderze domowym, a następnie otwórz go i ponownie zainstaluj aktualizację.",
  "error.update.remoteDisabled": "Aktualizacje od administratorów serwera są wyłączone na tym komputerze.",
  "error.update.restartStarted": "CodeBot już uruchamia się ponownie, aby zainstalować aktualizację.",
  "error.update.alreadyRestarting": "CodeBot już uruchamia się ponownie.",
} as const satisfies PartialTranslation<typeof source>;
