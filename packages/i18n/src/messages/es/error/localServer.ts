import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/localServer";

export const messages = {
  "error.localServer.refused":
    "El servidor de modelos en {host} rechazó la conexión. Inicia el servidor de modelos en esa máquina.",
  "error.localServer.hostNotFound": "No se encontró la dirección {host}. Comprueba el nombre de la máquina.",
  "error.localServer.timeout": "El servidor de modelos en {host} no respondió en {seconds} segundos.",
  "error.localServer.unreachable":
    "El servidor de modelos en {host} no es accesible. Asegúrate de que la máquina está encendida y en tu red.",
  "error.localServer.redirect":
    "El servidor de modelos en {host} envió una redirección. OpenBot Code no sigue redirecciones, para proteger la clave de API.",
  "error.localServer.keyNeeded":
    "El servidor de modelos en {host} necesita una clave de API. Añade la clave de esta máquina.",
  "error.localServer.keyRefused":
    "El servidor de modelos en {host} rechazó la clave de API. Comprueba la clave de esta máquina.",
  "error.localServer.http": "El servidor de modelos en {host} respondió con el estado HTTP {status}.",
  "error.localServer.invalidAnswer":
    "El servidor de modelos en {host} no envió una lista de modelos compatible con OpenAI.",
  "error.localServer.tooLarge": "La respuesta del servidor de modelos en {host} es demasiado grande.",
  "error.localServer.gpuUnreachable": "La dirección de estado de GPU {host} no es accesible.",
  "error.localServer.gpuTimeout": "La dirección de estado de GPU {host} no respondió en {seconds} segundos.",
  "error.localServer.gpuRedirect":
    "La dirección de estado de GPU {host} envió una redirección. OpenBot Code no sigue redirecciones.",
  "error.localServer.gpuHttp": "La dirección de estado de GPU {host} respondió con el estado HTTP {status}.",
  "error.localServer.gpuInvalid":
    "La dirección de estado de GPU {host} no envió valores de GPU que OpenBot Code pueda leer.",
  "error.localServer.gpuTooLarge": "La respuesta de la dirección de estado de GPU {host} es demasiado grande.",
  "error.localServer.gpuUrlInvalid":
    "La URL de estado de GPU debe ser una dirección http o https sin nombre de usuario ni contraseña.",
  "error.localServer.gpuKeyOtherOrigin":
    "La clave de API solo puede ir a la URL de estado de GPU cuando esa URL tiene el mismo origen que la URL base.",
  "error.localServer.scanHostInvalid": "Introduce un nombre de host, una dirección IP o una dirección http o https.",
} as const satisfies PartialTranslation<typeof source>;
