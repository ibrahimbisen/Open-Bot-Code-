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
