import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/advanced";

export const messages = {
  "error.advanced.unsupported":
    "Questo server non supporta gli interruttori delle funzioni avanzate. Aggiorna il server.",
  "error.advanced.invalidChange": "La modifica della funzione avanzata non è valida.",
  "error.advanced.featureOff":
    "Questo strumento non è disponibile perché la funzione è disattivata. L'utente può attivarla in Impostazioni > Funzioni avanzate.",
} as const satisfies PartialTranslation<typeof source>;
