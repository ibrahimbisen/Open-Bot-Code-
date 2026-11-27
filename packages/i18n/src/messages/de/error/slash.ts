import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/slash";

export const messages = {
  "error.slash.resumeUnsupported": "Dieser Agent kann einen gespeicherten Chat seiner Engine nicht fortsetzen.",
  "error.slash.resumeEngineOff": "Die Engine läuft nicht. Starte sie und versuche es erneut.",
  "error.slash.sessionNotFound":
    "Dieser gespeicherte Chat ist nicht mehr vorhanden. Aktualisiere die Liste und wähle einen anderen.",
  "error.slash.sessionInUse": "Ein Chat in OpenBot Code verwendet diesen gespeicherten Chat bereits.",
  "error.slash.remoteFailed": "Der Server konnte diesen Befehl nicht abschließen. Versuche es erneut.",
  "error.slash.serverUnsupported": "Dieser Server kann Slash-Befehle nicht auflisten. Aktualisiere den Server.",
} as const satisfies PartialTranslation<typeof source>;
