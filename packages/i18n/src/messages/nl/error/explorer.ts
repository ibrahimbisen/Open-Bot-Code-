import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/explorer";

export const messages = {
  "error.explorer.outside": "Dit pad hoort niet bij de mappen van het project.",
  "error.explorer.notFound": "Het bestand of de map bestaat niet.",
  "error.explorer.rootProtected": "Een projectmap kan hier niet worden hernoemd of verwijderd.",
  "error.explorer.invalidName": "Deze naam is niet geldig voor een bestand of een map.",
  "error.explorer.notFile": "Dit pad is geen bestand.",
  "error.explorer.notDirectory": "Dit pad is geen map.",
  "error.explorer.exists": "Er staat al een bestand of map met de naam {name} in deze map.",
  "error.explorer.unknownAgent": "De agent van deze bestandsboom bestaat niet.",
  "error.explorer.gitTimeout": "Een Git-opdracht duurde te lang en is gestopt.",
  "error.explorer.gitFailed": "Git meldde een fout: {detail}",
  "error.explorer.serverUnsupported": "Deze server kan geen bestanden tonen. Werk de server bij.",
  "error.explorer.clientUnsupported": "Deze versie van OpenBot Code kan de bestanden van een server niet tonen.",
  "error.explorer.remoteFailed": "De server kon deze bestandsactie niet voltooien. Probeer het opnieuw.",
} as const satisfies PartialTranslation<typeof source>;
