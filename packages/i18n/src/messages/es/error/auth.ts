import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/auth";

export const messages = {
  "error.auth.serviceUnavailable":
    "OpenBot Code no pudo acceder al servicio de cuentas. Comprueba que la API esté en funcionamiento e inténtalo de nuevo.",
  "error.auth.sessionTimeout":
    "OpenBot Code no respondió a tiempo. Comprueba tu conexión a internet y vuelve a intentarlo.",
  "error.auth.networkBlocked":
    "Un cortafuegos o proxy de esta red impidió que OpenBot Code accediera a {host}. Pide al administrador de la red que permita {host} e inténtalo de nuevo.",
  "error.auth.signInFirst": "Primero inicia sesión en OpenBot Code.",
  "error.auth.accountServiceNotConfigured": "Introduce primero la dirección de tu servicio de cuentas.",
  "error.auth.accountServiceUrlInvalid":
    "La dirección del servicio de cuentas debe empezar por https:// y no tener ruta.",
  "error.auth.accountServiceFixed":
    "La variable de entorno CODEBOT_AUTH_API_URL define el servicio de cuentas. Quítala para cambiar la dirección aquí.",
  "error.auth.signInFailed": "El inicio de sesión no terminó. Inténtalo de nuevo.",
  "error.auth.signInCancelled": "El inicio de sesión se canceló o se rechazó.",
  "error.auth.signInTimeout": "El inicio de sesión tardó demasiado. Empiézalo de nuevo.",
  "error.auth.signInBrowserFailed": "OpenBot Code no pudo abrir tu navegador para el inicio de sesión.",
  "error.auth.signInUnavailable": "Este OpenBot Code no puede abrir un navegador para el inicio de sesión.",
  "error.auth.signInRequired": "Es necesario iniciar sesión.",
  "error.auth.chatColorUnavailable":
    "El servicio de cuentas todavía no admite colores de chat. Inténtalo de nuevo más tarde.",
  "error.auth.accountChangedDuringRegister":
    "La cuenta con sesión iniciada cambió mientras se registraba este servidor.",
  "error.auth.hostCredentialUnavailable":
    "La credencial del host remoto no está disponible. Registra el host de nuevo.",
  "error.auth.serviceError": "El servicio de cuentas devolvió un error.",
  "error.auth.serviceUnreachable":
    "OpenBot Code no pudo acceder al servicio de cuentas. Comprueba tu conexión e inténtalo de nuevo.",
  "error.auth.serviceTimeout": "El servicio de cuentas no respondió a tiempo. Inténtalo de nuevo.",
  "error.auth.serviceStatus": "El servicio de cuentas devolvió un error ({status}). Inténtalo de nuevo más tarde.",
  "error.auth.deliveryTimeout":
    "OpenBot Code no pudo confirmar la entrega a tiempo. El código aún puede llegar; comprueba la entrega antes de enviarlo de nuevo.",
} as const satisfies PartialTranslation<typeof source>;
