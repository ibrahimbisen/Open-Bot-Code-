import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/appUpdate";

export const messages = {
  "appUpdate.server.title": "Servidor de actualizaciones",
  "appUpdate.server.description":
    "Déjalo vacío para recibir actualizaciones de las versiones de OpenBot Code en GitHub. Para usar tu propio servidor, introduce la URL de la carpeta que tiene los instaladores y los archivos de actualización.",
  "appUpdate.server.urlLabel": "URL del servidor de actualizaciones",
  "appUpdate.server.placeholder": "https://example.com/codebot-updates/",
  "appUpdate.server.source.settings": "OpenBot Code recibe las actualizaciones de esta URL.",
  "appUpdate.server.source.environment":
    "OpenBot Code recibe las actualizaciones de {url}. Esta URL viene de la variable de entorno CODEBOT_UPDATE_URL.",
  "appUpdate.server.source.build":
    "OpenBot Code recibe las actualizaciones de {url}. Esta URL viene de esta compilación de OpenBot Code.",
  "appUpdate.server.source.none":
    "No hay servidor de actualizaciones configurado. OpenBot Code no busca actualizaciones.",
  "appUpdate.server.saveFailed": "OpenBot Code no pudo guardar la URL del servidor de actualizaciones.",
  "appUpdate.server.loadFailed": "OpenBot Code no pudo leer la URL del servidor de actualizaciones.",
  "appUpdate.autoRestart.title": "Reiniciar automáticamente cuando esté inactivo",
  "appUpdate.autoRestart.description":
    "OpenBot Code se reinicia para instalar una actualización descargada cuando ningún agente trabaja. Los miembros de tus servidores se desconectan durante un momento.",
} as const satisfies PartialTranslation<typeof source>;
