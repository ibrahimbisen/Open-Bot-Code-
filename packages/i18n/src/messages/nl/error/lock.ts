import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/lock";

export const messages = {
  "error.lock.claudeStrictNoSandbox":
    "Streng vereist de Claude-sandbox, die Claude op deze computer niet kan starten: {reason}. Kies Normaal of Open in de projectinstellingen, of kies een andere provider.",
  "error.lock.claudeNoSandboxStrict":
    "Streng vereist de Claude-sandbox, die Claude op deze computer niet kan starten. Kies Normaal of Open in de projectinstellingen, of kies een andere provider.",
  "error.lock.providerNeedsMacOrLinux":
    "{provider} kan een agent op deze computer niet binnen zijn projectmappen houden, dus OpenBot Code start hem niet in {level}. Kies Open in de projectinstellingen, of kies Claude of Codex.",
  "error.lock.providerToolMissing":
    "{level} vereist {tool}, dat OpenBot Code niet heeft gevonden. Installeer het of kies Open in de projectinstellingen.",
  "error.lock.containerMissing":
    "Streng met een container vereist Docker of Podman, die OpenBot Code niet heeft gevonden. Installeer een van beide of kies Normaal in de projectinstellingen.",
  "error.lock.containerFailed":
    "De container voor dit project is niet gestart: {reason}. Kies Normaal in de projectinstellingen of herstel de containertool.",
  "error.lock.codexStrictNeedsSandbox":
    "Streng vereist de Codex-sandbox, die Codex op deze computer niet kan starten. Kies Normaal of Open in de projectinstellingen, of kies een andere provider.",
  "error.lock.commandAsk":
    "De OS-sandbox is niet beschikbaar voor deze agent, dus deze opdracht heeft jouw goedkeuring nodig.",
} as const satisfies PartialTranslation<typeof source>;
