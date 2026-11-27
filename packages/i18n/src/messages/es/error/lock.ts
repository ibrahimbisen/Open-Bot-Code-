import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/lock";

export const messages = {
  "error.lock.claudeStrictNoSandbox":
    "Estricto necesita el sandbox de Claude, que Claude no puede iniciar en este ordenador: {reason}. Elige Normal o Abierto en los ajustes del proyecto, o elige otro proveedor.",
  "error.lock.claudeNoSandboxStrict":
    "Estricto necesita el sandbox de Claude, que Claude no puede iniciar en este ordenador. Elige Normal o Abierto en los ajustes del proyecto, o elige otro proveedor.",
  "error.lock.providerNeedsMacOrLinux":
    "{provider} no puede mantener a un agente dentro de las carpetas de su proyecto en este ordenador, así que OpenBot Code no lo inicia en {level}. Elige Abierto en los ajustes del proyecto, o elige Claude o Codex.",
  "error.lock.providerToolMissing":
    "{level} necesita {tool}, que OpenBot Code no encontró. Instálalo o elige Abierto en los ajustes del proyecto.",
  "error.lock.containerMissing":
    "Estricto con contenedor necesita Docker o Podman, que OpenBot Code no encontró. Instala uno de ellos o elige Normal en los ajustes del proyecto.",
  "error.lock.containerFailed":
    "El contenedor de este proyecto no se inició: {reason}. Elige Normal en los ajustes del proyecto o repara la herramienta de contenedores.",
  "error.lock.codexStrictNeedsSandbox":
    "Estricto necesita el sandbox de Codex, que Codex no puede iniciar en este ordenador. Elige Normal o Abierto en los ajustes del proyecto, o elige otro proveedor.",
  "error.lock.commandAsk":
    "El sandbox del sistema operativo no está disponible para este agente, así que este comando necesita tu aprobación.",
} as const satisfies PartialTranslation<typeof source>;
