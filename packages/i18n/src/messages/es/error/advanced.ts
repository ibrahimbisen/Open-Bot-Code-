import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/advanced";

export const messages = {
  "error.advanced.unsupported":
    "Este servidor no admite los interruptores de funciones avanzadas. Actualiza el servidor.",
  "error.advanced.invalidChange": "El cambio de la función avanzada no es válido.",
  "error.advanced.featureOff":
    "Esta herramienta no está disponible porque la función está desactivada. El usuario puede activarla en Ajustes > Funciones avanzadas.",
} as const satisfies PartialTranslation<typeof source>;
