import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/lock";

export const messages = {
  "error.lock.claudeStrictNoSandbox":
    "Rigoroso richiede la sandbox di Claude, che Claude non può avviare su questo computer: {reason}. Scegli Normale o Aperto nelle impostazioni del progetto, oppure scegli un altro provider.",
  "error.lock.claudeNoSandboxStrict":
    "Rigoroso richiede la sandbox di Claude, che Claude non può avviare su questo computer. Scegli Normale o Aperto nelle impostazioni del progetto, oppure scegli un altro provider.",
  "error.lock.providerNeedsMacOrLinux":
    "{provider} non può tenere un agente dentro le cartelle del suo progetto su questo computer, quindi OpenBot Code non lo avvia in {level}. Scegli Aperto nelle impostazioni del progetto, oppure scegli Claude o Codex.",
  "error.lock.providerToolMissing":
    "{level} richiede {tool}, che OpenBot Code non ha trovato. Installalo oppure scegli Aperto nelle impostazioni del progetto.",
  "error.lock.containerMissing":
    "Rigoroso con container richiede Docker o Podman, che OpenBot Code non ha trovato. Installane uno oppure scegli Normale nelle impostazioni del progetto.",
  "error.lock.containerFailed":
    "Il container di questo progetto non si è avviato: {reason}. Scegli Normale nelle impostazioni del progetto oppure ripara lo strumento per i container.",
  "error.lock.codexStrictNeedsSandbox":
    "Rigoroso richiede la sandbox di Codex, che Codex non può avviare su questo computer. Scegli Normale o Aperto nelle impostazioni del progetto, oppure scegli un altro provider.",
  "error.lock.commandAsk":
    "La sandbox del sistema operativo non è disponibile per questo agente, quindi questo comando richiede la tua approvazione.",
} as const satisfies PartialTranslation<typeof source>;
