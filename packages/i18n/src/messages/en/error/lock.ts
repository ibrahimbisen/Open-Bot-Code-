import { defineMessages } from "../../../message";

export const messages = defineMessages("error.lock", {
  "error.lock.claudeStrictNoSandbox":
    "Strict needs the Claude sandbox, which Claude cannot start on this computer: {reason}. Choose Normal or Open in the project settings, or choose another provider.",
  "error.lock.claudeNoSandboxStrict":
    "Strict needs the Claude sandbox, which Claude cannot start on this computer. Choose Normal or Open in the project settings, or choose another provider.",
  "error.lock.providerNeedsMacOrLinux":
    "{provider} cannot keep an agent inside its project folders on this computer, so OpenBot Code does not start it in {level}. Choose Open in the project settings, or choose Claude or Codex.",
  "error.lock.providerToolMissing":
    "{level} needs {tool}, which OpenBot Code did not find. Install it, or choose Open in the project settings.",
  "error.lock.containerMissing":
    "Strict with a container needs Docker or Podman, which OpenBot Code did not find. Install one of them, or choose Normal in the project settings.",
  "error.lock.containerFailed":
    "The container for this project did not start: {reason}. Choose Normal in the project settings, or fix the container tool.",
  "error.lock.codexStrictNeedsSandbox":
    "Strict needs the Codex sandbox, which Codex cannot start on this computer. Choose Normal or Open in the project settings, or choose another provider.",
  "error.lock.commandAsk": "The OS sandbox is not available for this agent, so this command needs your approval.",
});
