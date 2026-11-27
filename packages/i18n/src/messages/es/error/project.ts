import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/project";

export const messages = {
  "error.project.serverTooOld":
    "Este servidor no admite proyectos. Actualiza OpenBot Code en el ordenador que lo ejecuta.",
  "error.project.remoteFailed": "El servidor no pudo terminar esta acción del proyecto. Inténtalo de nuevo.",
  "error.project.replyUnsupported": "Este servidor no puede compartir los ajustes de respuesta. Actualiza el servidor.",
  "error.project.replyFailed": "El servidor no pudo guardar la regla de respuesta. Inténtalo de nuevo.",
  "error.project.notFound": "Este proyecto ya no existe.",
  "error.project.archived": "Este proyecto está archivado. Restáuralo primero.",
  "error.project.nameRequired": "Dale un nombre al proyecto.",
  "error.project.limit": "Tienes el número máximo de proyectos ({limit}). Elimina primero un proyecto.",
  "error.project.agentLimit": "Un proyecto puede tener como máximo {limit} agentes.",
  "error.project.agentRequired": "Un proyecto necesita al menos un agente.",
  "error.project.agentNotFound": "Este agente no forma parte del proyecto.",
  "error.project.agentNameRequired": "Dale un nombre al agente.",
  "error.project.runtimeProviderMismatch":
    "Un chat puede usar otro modelo del proveedor de su agente. Para otro proveedor, inicia el chat con un agente de ese proveedor.",
  "error.project.chatNotFound": "Este chat ya no existe.",
  "error.project.cursorInvalid": "Esta parte de la lista de chats ya no es válida. Vuelve a cargar los chats.",
  "error.project.folderMissing": "Esta carpeta no existe.",
  "error.project.folderProtected": "OpenBot Code no puede usar esta carpeta. Elige otra carpeta.",
  "error.project.mainFolderMissing":
    "Falta la carpeta principal de este proyecto: {path}. Restaura la carpeta o elige una nueva carpeta principal.",
  "error.project.ownerOnly": "Solo la persona que creó este proyecto puede usarlo.",
  "error.project.memberFolder": "Usa una carpeta de tu propio espacio de proyectos en este servidor.",
  "error.project.memberOpenAccess":
    "Solo un propietario o administrador puede dar a un proyecto acceso completo a este ordenador.",
} as const satisfies PartialTranslation<typeof source>;
