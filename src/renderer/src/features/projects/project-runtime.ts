import { isKnownAgentProvider } from "@codebot/contracts/agent-providers";
import type { ProjectRuntime } from "@codebot/contracts/ipc";
import type { AgentProfile } from "@codebot/ui/data";

export const FALLBACK_RUNTIME: ProjectRuntime = { provider: "codex", model: "", reasoningEffort: "medium" };

export function runtimeOfProfile(agent: AgentProfile | undefined): ProjectRuntime {
  if (!agent) return FALLBACK_RUNTIME;
  return {
    provider: isKnownAgentProvider(agent.provider) ? agent.provider : FALLBACK_RUNTIME.provider,
    model: agent.model,
    reasoningEffort: agent.reasoningEffort,
    ...(agent.providerAccountId ? { providerAccountId: agent.providerAccountId } : {}),
  };
}
