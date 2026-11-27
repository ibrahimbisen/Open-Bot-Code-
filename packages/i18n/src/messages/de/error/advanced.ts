import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/advanced";

export const messages = {
  "error.advanced.unsupported":
    "Dieser Server unterstützt die Schalter für erweiterte Funktionen nicht. Aktualisiere den Server.",
  "error.advanced.invalidChange": "Die Änderung der erweiterten Funktion ist ungültig.",
  "error.advanced.featureOff":
    "Dieses Tool ist nicht verfügbar, weil die Funktion ausgeschaltet ist. Der Benutzer kann sie unter Einstellungen > Erweiterte Funktionen einschalten.",
} as const satisfies PartialTranslation<typeof source>;
