import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/explorer";

export const messages = {
  "error.explorer.outside": "Esta ruta no está en las carpetas del proyecto.",
  "error.explorer.notFound": "El archivo o la carpeta no existe.",
  "error.explorer.rootProtected": "Aquí no se puede renombrar ni eliminar una carpeta del proyecto.",
  "error.explorer.invalidName": "Este nombre no es válido para un archivo ni para una carpeta.",
  "error.explorer.notFile": "Esta ruta no es un archivo.",
  "error.explorer.notDirectory": "Esta ruta no es una carpeta.",
  "error.explorer.exists": "Ya hay un archivo o una carpeta con el nombre {name} en esta carpeta.",
  "error.explorer.unknownAgent": "El agente de este árbol de archivos no existe.",
  "error.explorer.gitTimeout": "Un comando de Git tardó demasiado y se detuvo.",
  "error.explorer.gitFailed": "Git informó de un error: {detail}",
  "error.explorer.serverUnsupported": "Este servidor no puede mostrar archivos. Actualiza el servidor.",
  "error.explorer.clientUnsupported": "Esta versión de OpenBot Code no puede mostrar los archivos de un servidor.",
  "error.explorer.remoteFailed": "El servidor no pudo terminar esta acción de archivo. Inténtalo de nuevo.",
} as const satisfies PartialTranslation<typeof source>;
