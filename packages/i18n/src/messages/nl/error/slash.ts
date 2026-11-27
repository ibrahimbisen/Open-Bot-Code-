import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/slash";

export const messages = {
  "error.slash.resumeUnsupported": "Deze agent kan een opgeslagen chat niet hervatten vanuit zijn engine.",
  "error.slash.resumeEngineOff": "De engine draait niet. Start hem en probeer het opnieuw.",
  "error.slash.sessionNotFound": "Deze opgeslagen chat bestaat niet meer. Ververs de lijst en kies een andere.",
  "error.slash.sessionInUse": "Een chat in OpenBot Code gebruikt deze opgeslagen chat al.",
  "error.slash.remoteFailed": "De server kon deze opdracht niet voltooien. Probeer het opnieuw.",
  "error.slash.serverUnsupported": "Deze server kan geen slash-opdrachten tonen. Werk de server bij.",
} as const satisfies PartialTranslation<typeof source>;
