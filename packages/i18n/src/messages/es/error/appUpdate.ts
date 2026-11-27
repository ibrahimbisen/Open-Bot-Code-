import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/appUpdate";

export const messages = {
  "error.appUpdate.noServer":
    "No hay servidor de actualizaciones configurado. Introduce la URL del servidor de actualizaciones en Ajustes > Actualizaciones.",
  "error.appUpdate.urlInvalid":
    "La URL del servidor de actualizaciones no es válida. Usa una URL que empiece por https://.",
  "error.appUpdate.urlCredentials":
    "Quita el nombre de usuario y la contraseña de la URL del servidor de actualizaciones.",
  "error.appUpdate.urlInsecure":
    "Usa https:// para la URL del servidor de actualizaciones. http:// solo se permite para un ordenador de tu propia red.",
  "error.appUpdate.urlNotSaved":
    "OpenBot Code no pudo guardar la URL del servidor de actualizaciones. Inténtalo de nuevo.",
} as const satisfies PartialTranslation<typeof source>;
