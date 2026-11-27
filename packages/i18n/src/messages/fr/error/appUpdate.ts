import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/appUpdate";

export const messages = {
  "error.appUpdate.noServer":
    "Aucun serveur de mises à jour n'est défini. Saisis l'URL du serveur de mises à jour dans Réglages > Mises à jour.",
  "error.appUpdate.urlInvalid":
    "L'URL du serveur de mises à jour n'est pas valide. Utilise une URL qui commence par https://.",
  "error.appUpdate.urlCredentials":
    "Retire le nom d'utilisateur et le mot de passe de l'URL du serveur de mises à jour.",
  "error.appUpdate.urlInsecure":
    "Utilise https:// pour l'URL du serveur de mises à jour. http:// n'est autorisé que pour un ordinateur de ton propre réseau.",
  "error.appUpdate.urlNotSaved": "OpenBot Code n'a pas pu enregistrer l'URL du serveur de mises à jour. Réessaie.",
} as const satisfies PartialTranslation<typeof source>;
