import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/lock";

export const messages = {
  "error.lock.claudeStrictNoSandbox":
    "Strict a besoin du bac à sable de Claude, que Claude ne peut pas démarrer sur cet ordinateur : {reason}. Choisis Normal ou Ouvert dans les réglages du projet, ou choisis un autre fournisseur.",
  "error.lock.claudeNoSandboxStrict":
    "Strict a besoin du bac à sable de Claude, que Claude ne peut pas démarrer sur cet ordinateur. Choisis Normal ou Ouvert dans les réglages du projet, ou choisis un autre fournisseur.",
  "error.lock.providerNeedsMacOrLinux":
    "{provider} ne peut pas garder un agent dans les dossiers de son projet sur cet ordinateur, donc OpenBot Code ne le démarre pas en {level}. Choisis Ouvert dans les réglages du projet, ou choisis Claude ou Codex.",
  "error.lock.providerToolMissing":
    "{level} a besoin de {tool}, qu'OpenBot Code n'a pas trouvé. Installe-le ou choisis Ouvert dans les réglages du projet.",
  "error.lock.containerMissing":
    "Strict avec conteneur a besoin de Docker ou de Podman, qu'OpenBot Code n'a pas trouvés. Installe l'un des deux ou choisis Normal dans les réglages du projet.",
  "error.lock.containerFailed":
    "Le conteneur de ce projet n'a pas démarré : {reason}. Choisis Normal dans les réglages du projet ou répare l'outil de conteneurs.",
  "error.lock.codexStrictNeedsSandbox":
    "Strict a besoin du bac à sable de Codex, que Codex ne peut pas démarrer sur cet ordinateur. Choisis Normal ou Ouvert dans les réglages du projet, ou choisis un autre fournisseur.",
  "error.lock.commandAsk":
    "Le bac à sable du système n'est pas disponible pour cet agent, donc cette commande a besoin de ton approbation.",
} as const satisfies PartialTranslation<typeof source>;
