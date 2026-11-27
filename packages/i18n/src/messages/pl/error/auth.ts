import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/auth";

export const messages = {
  "error.auth.serviceUnavailable":
    "OpenBot Code nie może połączyć się z usługą kont. Sprawdź, czy API działa, i spróbuj ponownie.",
  "error.auth.sessionTimeout":
    "OpenBot Code nie odpowiedział na czas. Sprawdź połączenie z internetem, a potem spróbuj ponownie.",
  "error.auth.networkBlocked":
    "Zapora lub serwer proxy w tej sieci blokuje połączenie OpenBot Code z {host}. Poproś administratora sieci o zezwolenie na {host} i spróbuj ponownie.",
  "error.auth.signInFirst": "Najpierw zaloguj się do OpenBot Code.",
  "error.auth.accountServiceNotConfigured": "Najpierw wpisz adres swojej usługi konta.",
  "error.auth.accountServiceUrlInvalid": "Adres usługi konta musi zaczynać się od https:// i nie może mieć ścieżki.",
  "error.auth.accountServiceFixed":
    "Zmienna środowiskowa CODEBOT_AUTH_API_URL ustawia usługę konta. Usuń ją, aby zmienić adres tutaj.",
  "error.auth.signInFailed": "Logowanie nie zostało ukończone. Spróbuj ponownie.",
  "error.auth.signInCancelled": "Logowanie zostało anulowane lub odrzucone.",
  "error.auth.signInTimeout": "Logowanie trwało zbyt długo. Rozpocznij je ponownie.",
  "error.auth.signInBrowserFailed": "OpenBot Code nie mógł otworzyć przeglądarki do logowania.",
  "error.auth.signInUnavailable": "Ten OpenBot Code nie może otworzyć przeglądarki do logowania.",
  "error.auth.signInRequired": "Wymagane jest zalogowanie.",
  "error.auth.chatColorUnavailable": "Usługa kont nie obsługuje jeszcze kolorów czatu. Spróbuj ponownie później.",
  "error.auth.accountChangedDuringRegister": "Zalogowane konto zmieniło się podczas rejestrowania tego serwera.",
  "error.auth.hostCredentialUnavailable": "Poświadczenie zdalnego hosta jest niedostępne. Zarejestruj hosta ponownie.",
  "error.auth.serviceError": "Usługa kont zwróciła błąd.",
  "error.auth.serviceUnreachable":
    "OpenBot Code nie może połączyć się z usługą kont. Sprawdź połączenie i spróbuj ponownie.",
  "error.auth.serviceTimeout": "Usługa kont nie odpowiedziała na czas. Spróbuj ponownie.",
  "error.auth.serviceStatus": "Usługa kont zwróciła błąd ({status}). Spróbuj ponownie później.",
  "error.auth.deliveryTimeout":
    "OpenBot Code nie zdołał na czas potwierdzić dostarczenia. Kod może jeszcze dotrzeć; sprawdź skrzynkę, zanim wyślesz go ponownie.",
} as const satisfies PartialTranslation<typeof source>;
