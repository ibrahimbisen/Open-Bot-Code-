import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/localServer";

export const messages = {
  "localServer.settings.title": "Servidores locales",
  "localServer.settings.description":
    "Máquinas de modelos en tu red, como un DGX Spark. Cada máquina es una entrada aparte.",
  "localServer.settings.add": "Añadir máquina",
  "localServer.settings.empty":
    "Todavía no hay máquina local. Añade la dirección de un servidor de modelos para usarlo en un proyecto o un chat.",
  "localServer.settings.edit": "Editar {name}",
  "localServer.settings.remove": "Quitar {name}",
  "localServer.settings.refresh": "Comprobar ahora",
  "localServer.settings.statusOff": "Estado desactivado",
  "localServer.settings.models": { one: "{count} modelo", other: "{count} modelos" },
  "localServer.scan.title": "Encontrar una máquina",
  "localServer.scan.description":
    "Introduce un nombre de host o una dirección IP. OpenBot Code busca Ollama, LM Studio y vLLM en sus puertos habituales.",
  "localServer.scan.host": "Host o dirección",
  "localServer.scan.placeholder": "spark-1.local",
  "localServer.scan.action": "Buscar",
  "localServer.scan.scanning": "Buscando",
  "localServer.scan.none": "No se encontró ningún servidor de modelos en este host.",
  "localServer.scan.needsKey": "Necesita una clave de API",
  "localServer.scan.add": "Añadir {name}",
  "localServer.dialog.addTitle": "Añadir una máquina local",
  "localServer.dialog.editTitle": "Editar {name}",
  "localServer.dialog.description":
    "OpenBot Code lee la lista de modelos y el estado desde la dirección compatible con OpenAI de la máquina.",
  "localServer.field.name": "Nombre",
  "localServer.field.namePlaceholder": "DGX Spark 1",
  "localServer.field.baseUrl": "Dirección del servidor",
  "localServer.field.baseUrlPlaceholder": "http://192.168.1.41:8000/v1",
  "localServer.field.apiKey": "Clave de API (opcional)",
  "localServer.field.apiKeyKept": "Guardada. Déjalo vacío para conservarla.",
  "localServer.field.gpuUrl": "Dirección de estado de GPU (opcional)",
  "localServer.field.gpuUrlPlaceholder": "http://192.168.1.41:9101/gpu",
  "localServer.field.gpuUrlHelp":
    "Una dirección JSON, de exportador nvidia-smi o de exportador DCGM que muestre la carga y la memoria de la GPU.",
  "localServer.field.gpuUsesKey": "Enviar la clave de API a la dirección de estado de GPU",
  "localServer.field.gpuUsesKeyHelp": "Solo para una dirección con el mismo origen que la dirección del servidor.",
  "localServer.field.monitored": "Mostrar el estado de esta máquina",
  "localServer.field.monitoredHelp":
    "OpenBot Code comprueba la máquina de vez en cuando y la muestra en la barra de estado.",
  "localServer.error.nameRequired": "Introduce un nombre.",
  "localServer.error.gpuUrlInvalid": "Introduce una dirección http o https sin nombre de usuario ni contraseña.",
  "localServer.error.gpuKeyOtherOrigin":
    "La dirección de estado de GPU debe tener el mismo origen que la dirección del servidor.",
  "localServer.test.action": "Probar",
  "localServer.test.testing": "Probando",
  "localServer.test.online": "En línea. {models} encontrados.",
  "localServer.test.onlineKind": "{kind} está en línea. {models} encontrados.",
  "localServer.test.gpuFound": "Estado de GPU leído: {count}",
  "localServer.test.gpuCount": { one: "{count} GPU", other: "{count} GPU" },
  "localServer.test.offline": "Sin conexión. {error}",
  "localServer.test.gpuFailed": "Falló el estado de GPU: {error}",
  "localServer.dialog.saving": "Guardando",
  "localServer.dialog.saveFailed": "OpenBot Code no pudo guardar esta máquina.",
  "localServer.remove.title": "¿Quitar {name}?",
  "localServer.remove.description":
    "OpenBot Code deja de usar esta máquina. Los proyectos y chats que usan sus modelos necesitan otro modelo.",
  "localServer.remove.failed": "OpenBot Code no pudo quitar esta máquina.",
} as const satisfies PartialTranslation<typeof source>;
