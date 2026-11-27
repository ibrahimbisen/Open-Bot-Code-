import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/localServer";

export const messages = {
  "error.localServer.refused": "De modelserver op {host} weigerde de verbinding. Start de modelserver op die machine.",
  "error.localServer.hostNotFound": "Het adres {host} is niet gevonden. Controleer de naam van de machine.",
  "error.localServer.timeout": "De modelserver op {host} gaf geen antwoord binnen {seconds} seconden.",
  "error.localServer.unreachable":
    "De modelserver op {host} is niet bereikbaar. Controleer of de machine aan staat en in je netwerk zit.",
  "error.localServer.redirect":
    "De modelserver op {host} stuurde een doorverwijzing. OpenBot Code volgt geen doorverwijzingen, om de API-sleutel veilig te houden.",
  "error.localServer.keyNeeded":
    "De modelserver op {host} heeft een API-sleutel nodig. Voeg de sleutel van deze machine toe.",
  "error.localServer.keyRefused":
    "De modelserver op {host} weigerde de API-sleutel. Controleer de sleutel van deze machine.",
  "error.localServer.http": "De modelserver op {host} antwoordde met HTTP-status {status}.",
  "error.localServer.invalidAnswer": "De modelserver op {host} stuurde geen OpenAI-compatibele modellenlijst.",
  "error.localServer.tooLarge": "Het antwoord van de modelserver op {host} is te groot.",
  "error.localServer.gpuUnreachable": "Het GPU-statusadres {host} is niet bereikbaar.",
  "error.localServer.gpuTimeout": "Het GPU-statusadres {host} gaf geen antwoord binnen {seconds} seconden.",
  "error.localServer.gpuRedirect":
    "Het GPU-statusadres {host} stuurde een doorverwijzing. OpenBot Code volgt geen doorverwijzingen.",
  "error.localServer.gpuHttp": "Het GPU-statusadres {host} antwoordde met HTTP-status {status}.",
  "error.localServer.gpuInvalid": "Het GPU-statusadres {host} stuurde geen GPU-waarden die OpenBot Code kan lezen.",
  "error.localServer.gpuTooLarge": "Het antwoord van het GPU-statusadres {host} is te groot.",
  "error.localServer.gpuUrlInvalid":
    "De GPU-status-URL moet een http- of https-adres zijn zonder gebruikersnaam en wachtwoord.",
  "error.localServer.gpuKeyOtherOrigin":
    "De API-sleutel mag alleen naar de GPU-status-URL als die URL dezelfde oorsprong heeft als de basis-URL.",
  "error.localServer.scanHostInvalid": "Voer een hostnaam, een IP-adres of een http- of https-adres in.",
} as const satisfies PartialTranslation<typeof source>;
