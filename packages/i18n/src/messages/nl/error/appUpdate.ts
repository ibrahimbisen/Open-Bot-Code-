import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/appUpdate";

export const messages = {
  "error.appUpdate.noServer":
    "Er is geen updateserver ingesteld. Voer de URL van de updateserver in via Instellingen > Updates.",
  "error.appUpdate.urlInvalid": "De URL van de updateserver is ongeldig. Gebruik een URL die begint met https://.",
  "error.appUpdate.urlCredentials": "Verwijder de gebruikersnaam en het wachtwoord uit de URL van de updateserver.",
  "error.appUpdate.urlInsecure":
    "Gebruik https:// voor de URL van de updateserver. http:// is alleen toegestaan voor een computer in je eigen netwerk.",
  "error.appUpdate.urlNotSaved": "OpenBot Code kon de URL van de updateserver niet opslaan. Probeer het opnieuw.",
  "error.appUpdate.manualDownload":
    "Deze Mac-build is niet ondertekend, dus OpenBot Code kan updates niet zelf installeren. Kies Downloaden om de downloadpagina te openen en installeer de nieuwe versie daarna zelf.",
} as const satisfies PartialTranslation<typeof source>;
