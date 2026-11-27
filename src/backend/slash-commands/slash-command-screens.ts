import type { AgentProviderId, SlashCommandScreen } from "@codebot/contracts/ipc";

const SCREEN_COMMAND_NAMES: Readonly<Record<SlashCommandScreen, readonly string[]>> = {
  model: ["model", "models"],
  effort: ["effort", "thinking", "reasoning"],
  resume: ["resume", "sessions"],
};

const RESUME_PROVIDERS: ReadonlySet<AgentProviderId> = new Set(["claude"]);

export const HOST_RESUME_COMMAND = "resume";

export function providerListsSessions(provider: AgentProviderId): boolean {
  return RESUME_PROVIDERS.has(provider);
}

export function slashCommandScreen(provider: AgentProviderId, name: string): SlashCommandScreen | null {
  if (SCREEN_COMMAND_NAMES.model.includes(name)) return "model";
  if (SCREEN_COMMAND_NAMES.effort.includes(name)) return "effort";
  if (SCREEN_COMMAND_NAMES.resume.includes(name) && providerListsSessions(provider)) return "resume";
  return null;
}
