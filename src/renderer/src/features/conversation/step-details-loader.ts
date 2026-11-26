import type { TurnStepDetail } from "@codebot/contracts/ipc";
import { conversationPort } from "./conversation-port";

export type StepDetailsLoader = () => Promise<readonly TurnStepDetail[]>;

export function stepDetailsLoader(input: {
  agentId: string | undefined;
  turnId: string | undefined;
  server: { id: string; kind: string } | undefined;
  hosted: boolean;
}): StepDetailsLoader | undefined {
  const { agentId, turnId, server } = input;
  if (input.hosted || !agentId || !turnId || server?.kind !== "local") return undefined;
  return async () => (await conversationPort().replies.readTurnSteps({ agentId, turnId }, server.id)).steps;
}
