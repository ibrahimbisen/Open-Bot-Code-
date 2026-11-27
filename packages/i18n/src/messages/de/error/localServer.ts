import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/localServer";

export const messages = {
  "error.localServer.refused":
    "Der Modellserver unter {host} hat die Verbindung verweigert. Starte den Modellserver auf dieser Maschine.",
  "error.localServer.hostNotFound": "Die Adresse {host} wurde nicht gefunden. Prüfe den Namen der Maschine.",
  "error.localServer.timeout": "Der Modellserver unter {host} hat innerhalb von {seconds} Sekunden nicht geantwortet.",
  "error.localServer.unreachable":
    "Der Modellserver unter {host} ist nicht erreichbar. Stelle sicher, dass die Maschine eingeschaltet und in deinem Netzwerk ist.",
  "error.localServer.redirect":
    "Der Modellserver unter {host} hat eine Weiterleitung gesendet. OpenBot Code folgt keiner Weiterleitung, um den API-Schlüssel zu schützen.",
  "error.localServer.keyNeeded":
    "Der Modellserver unter {host} benötigt einen API-Schlüssel. Füge den Schlüssel dieser Maschine hinzu.",
  "error.localServer.keyRefused":
    "Der Modellserver unter {host} hat den API-Schlüssel abgelehnt. Prüfe den Schlüssel dieser Maschine.",
  "error.localServer.http": "Der Modellserver unter {host} hat mit dem HTTP-Status {status} geantwortet.",
  "error.localServer.invalidAnswer": "Der Modellserver unter {host} hat keine OpenAI-kompatible Modellliste gesendet.",
  "error.localServer.tooLarge": "Die Antwort des Modellservers unter {host} ist zu groß.",
  "error.localServer.gpuUnreachable": "Die GPU-Status-Adresse {host} ist nicht erreichbar.",
  "error.localServer.gpuTimeout":
    "Die GPU-Status-Adresse {host} hat innerhalb von {seconds} Sekunden nicht geantwortet.",
  "error.localServer.gpuRedirect":
    "Die GPU-Status-Adresse {host} hat eine Weiterleitung gesendet. OpenBot Code folgt keiner Weiterleitung.",
  "error.localServer.gpuHttp": "Die GPU-Status-Adresse {host} hat mit dem HTTP-Status {status} geantwortet.",
  "error.localServer.gpuInvalid":
    "Die GPU-Status-Adresse {host} hat keine GPU-Werte gesendet, die OpenBot Code lesen kann.",
  "error.localServer.gpuTooLarge": "Die Antwort der GPU-Status-Adresse {host} ist zu groß.",
  "error.localServer.gpuUrlInvalid":
    "Die GPU-Status-URL muss eine http- oder https-Adresse ohne Benutzernamen und Passwort sein.",
  "error.localServer.gpuKeyOtherOrigin":
    "Der API-Schlüssel darf nur dann an die GPU-Status-URL gehen, wenn diese URL denselben Ursprung wie die Basis-URL hat.",
  "error.localServer.scanHostInvalid": "Gib einen Hostnamen, eine IP-Adresse oder eine http- oder https-Adresse ein.",
} as const satisfies PartialTranslation<typeof source>;
