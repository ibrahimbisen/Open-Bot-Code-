import type { AgentTask, ProjectActivityState } from "@codebot/contracts/ipc";

export interface ChatActivityInput {
  waitsForInput: boolean;
  unread: number;
  seen: boolean;
}

export function chatActivityOf(task: AgentTask, input: ChatActivityInput): ProjectActivityState {
  if (task.state === "closed") return "idle";
  if (input.waitsForInput) return "needs-input";
  if (task.state === "running" || task.state === "queued") return "working";
  if (task.outcome === "failed" && !input.seen) return "error";
  return input.unread > 0 ? "done" : "idle";
}
