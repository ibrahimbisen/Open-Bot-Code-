import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/lock";

export const messages = {
  "error.lock.claudeStrictNoSandbox":
    "O modo Estrito exige o sandbox do Claude, que o Claude não consegue iniciar neste computador: {reason}. Escolha Normal ou Aberto nas configurações do projeto, ou escolha outro provedor.",
  "error.lock.claudeNoSandboxStrict":
    "O modo Estrito exige o sandbox do Claude, que o Claude não consegue iniciar neste computador. Escolha Normal ou Aberto nas configurações do projeto, ou escolha outro provedor.",
  "error.lock.providerNeedsMacOrLinux":
    "{provider} não consegue manter um agente dentro das pastas do projeto neste computador, então o OpenBot Code não o inicia em {level}. Escolha Aberto nas configurações do projeto ou escolha Claude ou Codex.",
  "error.lock.providerToolMissing":
    "{level} exige {tool}, que o OpenBot Code não encontrou. Instale-o ou escolha Aberto nas configurações do projeto.",
  "error.lock.containerMissing":
    "O modo Estrito com contêiner exige Docker ou Podman, que o OpenBot Code não encontrou. Instale um deles ou escolha Normal nas configurações do projeto.",
  "error.lock.containerFailed":
    "O contêiner deste projeto não iniciou: {reason}. Escolha Normal nas configurações do projeto ou corrija a ferramenta de contêiner.",
  "error.lock.codexStrictNeedsSandbox":
    "O modo Estrito exige o sandbox do Codex, que o Codex não consegue iniciar neste computador. Escolha Normal ou Aberto nas configurações do projeto, ou escolha outro provedor.",
  "error.lock.commandAsk":
    "O sandbox do sistema não está disponível para este agente, então este comando precisa da sua aprovação.",
} as const satisfies PartialTranslation<typeof source>;
