import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/advanced";

export const messages = {
  "error.advanced.unsupported":
    "Deze server ondersteunt de schakelaars voor geavanceerde functies niet. Werk de server bij.",
  "error.advanced.invalidChange": "De wijziging van de geavanceerde functie is ongeldig.",
  "error.advanced.featureOff":
    "Deze tool is niet beschikbaar omdat de functie uit staat. De gebruiker kan hem aanzetten via Instellingen > Geavanceerde functies.",
} as const satisfies PartialTranslation<typeof source>;
