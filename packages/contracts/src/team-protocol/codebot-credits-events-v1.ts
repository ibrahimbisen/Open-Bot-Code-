import { isDynamicRecord } from "../runtime-values";

export const CODEBOT_CREDITS_EVENTS_CAPABILITY = "codebot-credits-events-v1";

export type CodeBotCreditsEvent = { type: "codebot-credits-changed" };

export function codeBotCreditsEvent(value: unknown): CodeBotCreditsEvent | null {
  if (!isDynamicRecord(value) || value.type !== "codebot-credits-changed") return null;
  return { type: "codebot-credits-changed" };
}
