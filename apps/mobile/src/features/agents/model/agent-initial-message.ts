import { agentWelcomeMessage } from "@codebot/contracts/agent-welcome";
import type { CreateAgentInput } from "@codebot/contracts/ipc";
import { appLanguageOption } from "@codebot/i18n/languages";
import type { TranslatedLocale } from "@codebot/i18n/mobile";

export type NewAgentInput = Omit<CreateAgentInput, "initialMessage"> & { firstTask?: string };

export function agentInitialMessage(
  roleDescription: string,
  task: string,
  welcome: { locale: TranslatedLocale } | null,
): string {
  if (welcome)
    return agentWelcomeMessage({
      language: appLanguageOption(welcome.locale).label,
      firstRequestFollows: task.trim().length > 0,
    });
  const parts = [roleDescription.trim() ? `Your ongoing role is: ${roleDescription.trim()}` : "", task.trim()].filter(
    Boolean,
  );
  return parts.length > 0 ? parts.join("\n\n") : "Greet me briefly.";
}
