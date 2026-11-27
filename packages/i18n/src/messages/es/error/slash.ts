import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/slash";

export const messages = {
  "error.slash.resumeUnsupported": "Este agente no puede reanudar un chat guardado de su motor.",
  "error.slash.resumeEngineOff": "El motor no se está ejecutando. Inícialo e inténtalo de nuevo.",
  "error.slash.sessionNotFound": "Este chat guardado ya no existe. Actualiza la lista y elige otro.",
  "error.slash.sessionInUse": "Un chat de OpenBot Code ya usa este chat guardado.",
  "error.slash.remoteFailed": "El servidor no pudo terminar este comando. Inténtalo de nuevo.",
  "error.slash.serverUnsupported": "Este servidor no puede listar comandos con barra. Actualiza el servidor.",
} as const satisfies PartialTranslation<typeof source>;
