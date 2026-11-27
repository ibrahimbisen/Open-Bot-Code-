import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/localServer";

export const messages = {
  "error.localServer.refused":
    "Serwer modeli pod adresem {host} odrzucił połączenie. Uruchom serwer modeli na tej maszynie.",
  "error.localServer.hostNotFound": "Nie znaleziono adresu {host}. Sprawdź nazwę maszyny.",
  "error.localServer.timeout": "Serwer modeli pod adresem {host} nie odpowiedział w ciągu {seconds} s.",
  "error.localServer.unreachable":
    "Serwer modeli pod adresem {host} jest nieosiągalny. Upewnij się, że maszyna jest włączona i w Twojej sieci.",
  "error.localServer.redirect":
    "Serwer modeli pod adresem {host} wysłał przekierowanie. OpenBot Code nie podąża za przekierowaniami, aby chronić klucz API.",
  "error.localServer.keyNeeded": "Serwer modeli pod adresem {host} wymaga klucza API. Dodaj klucz tej maszyny.",
  "error.localServer.keyRefused": "Serwer modeli pod adresem {host} odrzucił klucz API. Sprawdź klucz tej maszyny.",
  "error.localServer.http": "Serwer modeli pod adresem {host} odpowiedział ze statusem HTTP {status}.",
  "error.localServer.invalidAnswer": "Serwer modeli pod adresem {host} nie wysłał listy modeli zgodnej z OpenAI.",
  "error.localServer.tooLarge": "Odpowiedź serwera modeli pod adresem {host} jest zbyt duża.",
  "error.localServer.gpuUnreachable": "Adres stanu GPU {host} jest nieosiągalny.",
  "error.localServer.gpuTimeout": "Adres stanu GPU {host} nie odpowiedział w ciągu {seconds} s.",
  "error.localServer.gpuRedirect":
    "Adres stanu GPU {host} wysłał przekierowanie. OpenBot Code nie podąża za przekierowaniami.",
  "error.localServer.gpuHttp": "Adres stanu GPU {host} odpowiedział ze statusem HTTP {status}.",
  "error.localServer.gpuInvalid":
    "Adres stanu GPU {host} nie wysłał wartości GPU, które OpenBot Code potrafi odczytać.",
  "error.localServer.gpuTooLarge": "Odpowiedź adresu stanu GPU {host} jest zbyt duża.",
  "error.localServer.gpuUrlInvalid":
    "Adres URL stanu GPU musi być adresem http lub https bez nazwy użytkownika i hasła.",
  "error.localServer.gpuKeyOtherOrigin":
    "Klucz API może trafić pod adres URL stanu GPU tylko wtedy, gdy ma on ten sam origin co bazowy adres URL.",
  "error.localServer.scanHostInvalid": "Wpisz nazwę hosta, adres IP albo adres http lub https.",
} as const satisfies PartialTranslation<typeof source>;
