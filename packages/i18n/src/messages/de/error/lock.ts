import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/lock";

export const messages = {
  "error.lock.claudeStrictNoSandbox":
    "Streng benötigt die Claude-Sandbox, die Claude auf diesem Computer nicht starten kann: {reason}. Wähle Normal oder Offen in den Projekteinstellungen oder wähle einen anderen Anbieter.",
  "error.lock.claudeNoSandboxStrict":
    "Streng benötigt die Claude-Sandbox, die Claude auf diesem Computer nicht starten kann. Wähle Normal oder Offen in den Projekteinstellungen oder wähle einen anderen Anbieter.",
  "error.lock.providerNeedsMacOrLinux":
    "{provider} kann einen Agenten auf diesem Computer nicht in seinen Projektordnern halten, daher startet OpenBot Code ihn nicht mit {level}. Wähle Offen in den Projekteinstellungen oder wähle Claude oder Codex.",
  "error.lock.providerToolMissing":
    "{level} benötigt {tool}, das OpenBot Code nicht gefunden hat. Installiere es oder wähle Offen in den Projekteinstellungen.",
  "error.lock.containerMissing":
    "Streng mit Container benötigt Docker oder Podman, die OpenBot Code nicht gefunden hat. Installiere eines davon oder wähle Normal in den Projekteinstellungen.",
  "error.lock.containerFailed":
    "Der Container für dieses Projekt wurde nicht gestartet: {reason}. Wähle Normal in den Projekteinstellungen oder repariere das Container-Tool.",
  "error.lock.codexStrictNeedsSandbox":
    "Streng benötigt die Codex-Sandbox, die Codex auf diesem Computer nicht starten kann. Wähle Normal oder Offen in den Projekteinstellungen oder wähle einen anderen Anbieter.",
  "error.lock.commandAsk":
    "Die Betriebssystem-Sandbox ist für diesen Agenten nicht verfügbar, daher braucht dieser Befehl deine Genehmigung.",
} as const satisfies PartialTranslation<typeof source>;
