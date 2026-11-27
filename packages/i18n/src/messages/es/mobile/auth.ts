import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/mobile/auth";

export const messages = {
  "mobile.auth.logo.animate": "Animar el logotipo de OpenBot Code",
  "mobile.auth.logo.animateHint": "Hace que el logotipo guiñe un ojo",
  "mobile.auth.scanQrCode": "Escanear código QR",
  "mobile.auth.closeScanner": "Cerrar escáner",
  "mobile.auth.scanner.connectFailed": "No se pudo conectar",
  "mobile.auth.scanner.codeFailed": "No se pudo usar este código",
  "mobile.auth.scanner.scanAgain": "Escanear de nuevo",
  "mobile.auth.scanner.connecting": "Conectando tu teléfono…",
  "mobile.auth.scanner.readingInvitation": "Leyendo la invitación…",
  "mobile.auth.scanner.scanDesktop": "Escanea el código del escritorio",
  "mobile.auth.scanner.scanInvitation": "Escanea el código de invitación",
  "mobile.auth.scanner.verifying": "Verificando el código de un solo uso.",
  "mobile.auth.scanner.checkingServer": "Comprobando la identidad del servidor.",
  "mobile.auth.scanner.keepCentered": "Mantén el código QR centrado dentro del marco.",
  "mobile.auth.scanner.connectFallback": "OpenBot Code no pudo conectar este teléfono.",
  "mobile.auth.scanner.cameraFailed": "No se pudo iniciar la cámara. Inténtalo de nuevo.",
  "mobile.auth.camera.title": "Se necesita acceso a la cámara",
  "mobile.auth.camera.pairingReason":
    "OpenBot Code usa la cámara solo para escanear el código QR de un solo uso que muestra la aplicación de escritorio.",
  "mobile.auth.camera.invitationReason": "OpenBot Code usa la cámara solo para escanear el código QR de la invitación.",
  "mobile.auth.camera.blocked":
    "El acceso a la cámara está bloqueado. Actívalo para OpenBot Code en los ajustes del dispositivo y vuelve aquí para escanear el código.",
  "mobile.auth.camera.allow": "Permitir acceso a la cámara",
  "mobile.auth.camera.openSettings": "Abrir ajustes",
  "mobile.auth.signIn.title": "Tus agentes, en cualquier lugar.",
  "mobile.auth.signIn.subtitle": "Conéctate a OpenBot Code en tu equipo.",
  "mobile.auth.signIn.helpTitle": "¿Dónde está el código QR?",
  "mobile.auth.signIn.helpStep1": "1. Abre OpenBot Code en tu equipo.",
  "mobile.auth.signIn.helpStep2": "2. Ve a Ajustes → Conexión móvil.",
  "mobile.auth.signIn.helpStep3": "3. Elige Añadir teléfono → Sí, iniciar sesión y escanea el código aquí.",
  "mobile.auth.signIn.accountButton": "Iniciar sesión con Nextcloud",
  "mobile.auth.account.title": "Iniciar sesión con Nextcloud",
  "mobile.auth.account.description":
    "Introduce la dirección de tu servicio de cuentas de OpenBot Code. Después Nextcloud te pide tu nombre de usuario y contraseña.",
  "mobile.auth.account.label": "Dirección del servicio de cuentas",
  "mobile.auth.account.placeholder": "account.example.com",
  "mobile.auth.account.signalLabel": "Dirección de Signal (opcional)",
  "mobile.auth.account.signalPlaceholder": "Dirección de Signal (opcional)",
  "mobile.auth.account.continue": "Continuar con Nextcloud",
  "mobile.auth.account.waiting": "Esperando a Nextcloud…",
  "mobile.auth.account.tryAgainIn": "Inténtalo de nuevo en {time}",
  "mobile.auth.account.useQrCode": "Escanear un código QR en su lugar",
  "mobile.auth.account.error.invalidAddress":
    "Introduce la dirección de tu servicio de cuentas, por ejemplo account.example.com.",
  "mobile.auth.account.error.invalidSignal":
    "Introduce una dirección de Signal que empiece por wss://, o deja el campo vacío.",
  "mobile.auth.account.error.notAccountService": "Esta dirección no es un servicio de cuentas de OpenBot Code.",
  "mobile.auth.account.error.startFailed":
    "El servicio de cuentas no pudo iniciar el inicio de sesión. Inténtalo de nuevo.",
  "mobile.auth.account.error.loginFailed": "El inicio de sesión no terminó. Inténtalo de nuevo.",
  "mobile.auth.account.error.wait": "Demasiados intentos de inicio de sesión. Espera antes de intentarlo de nuevo.",
  "mobile.auth.account.error.providerUnreachable":
    "El servicio de cuentas no pudo conectar con Nextcloud. Inténtalo más tarde.",
  "mobile.auth.account.error.refused": "Nextcloud no permitió este inicio de sesión.",
  "mobile.auth.done.title": "Conectado",
  "mobile.auth.done.body": "Has iniciado sesión.",
  "mobile.auth.error.sessionEnded": "Tu sesión terminó. Vuelve a iniciar sesión.",
  "mobile.auth.error.connectionInProgress": "Hay otra conexión en curso. Espera a que termine.",
  "mobile.auth.error.invalidCode": "Este no es un código válido de conexión móvil de OpenBot Code.",
  "mobile.auth.error.codeOutdated":
    "Genera un código nuevo de conexión móvil en una aplicación de escritorio actualizada.",
  "mobile.auth.error.alreadySignedIn": "Ya iniciaste sesión. Cierra la sesión antes de conectar otra cuenta.",
  "mobile.auth.error.desktopUnreachable":
    "OpenBot Code no pudo acceder a tu escritorio. Mantén ambos dispositivos en la misma red Wi-Fi y permite el acceso a la red local.",
  "mobile.auth.error.accountServiceUnreachable":
    "OpenBot Code no pudo acceder al servicio de cuentas. Comprueba tu conexión e inténtalo de nuevo.",
  "mobile.auth.error.codeExpired": "Este código de conexión móvil no es válido o caducó.",
  "mobile.auth.error.revokePreviousFailed":
    "No se pudo revocar la sesión móvil anterior. Comprueba tu conexión y vuelve a escanear.",
  "mobile.auth.error.verifyFailed": "OpenBot Code no pudo verificar esta sesión móvil.",
  "mobile.auth.error.sessionsLoadFailed": "No se pudieron cargar las sesiones de la cuenta. Inténtalo de nuevo.",
  "mobile.auth.error.useSignOut": "Usa Cerrar sesión para desconectar este dispositivo.",
  "mobile.auth.error.desktopSession": "Las sesiones de escritorio no se pueden desconectar desde el móvil.",
  "mobile.auth.error.disconnectFailed": "No se pudo desconectar esta sesión. Actualiza e inténtalo de nuevo.",
  "mobile.auth.error.nameLength": "Escribe un nombre visible de entre 3 y 20 caracteres.",
  "mobile.auth.error.photoTooLarge": "Elige una foto de menos de 512 KB.",
  "mobile.auth.error.photoInvalid": "La foto seleccionada no es válida. Elige otra imagen.",
  "mobile.auth.error.tooManyChanges": "Demasiados cambios. Espera un momento e inténtalo de nuevo.",
  "mobile.auth.error.photoConflict": "Tu foto cambió en otro dispositivo. Inténtalo de nuevo.",
  "mobile.auth.error.profileSaveFailed": "No se pudo guardar tu perfil. Comprueba tu conexión e inténtalo de nuevo.",
  "mobile.auth.error.signOutUnconfirmed":
    "No se pudo confirmar el cierre de sesión. Comprueba tu conexión e inténtalo de nuevo.",
} as const satisfies PartialTranslation<typeof source>;
