import type { CodeBotDesktopApi, ReplyRuleSettings, TurnStepDetails } from "@codebot/contracts/ipc";

export interface MockReplies {
  api: CodeBotDesktopApi["replies"];
  setTurnSteps(details: TurnStepDetails): void;
}

export function createMockReplies(recorded: readonly TurnStepDetails[] = []): MockReplies {
  const settings: ReplyRuleSettings = { rule: null };
  const turns = new Map(recorded.map((details) => [details.turnId, details]));
  return {
    api: {
      getRule: async () => ({ ...settings }),
      setRule: async (change) => {
        settings.rule = change.rule;
        return { ...settings };
      },
      readTurnSteps: async ({ turnId }) => turns.get(turnId) ?? { turnId, steps: [] },
    },
    setTurnSteps: (details) => {
      turns.set(details.turnId, details);
    },
  };
}
