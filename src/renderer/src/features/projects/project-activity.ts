import type { AgentTask } from "@codebot/contracts/ipc";
import type { ProjectActivity } from "./projects-port";

export interface ProjectActivityInput {
  tasks: readonly AgentTask[];
  waitsForInput: (task: AgentTask) => boolean;
  unread: (task: AgentTask) => number;
  seen: (task: AgentTask) => boolean;
}

const ACTIVITY_RANK = {
  idle: 0,
  done: 1,
  working: 2,
  error: 3,
  "needs-input": 4,
} as const satisfies Record<ProjectActivity, number>;

export function chatActivity(task: AgentTask, input: Omit<ProjectActivityInput, "tasks">): ProjectActivity {
  if (task.state === "closed") return "idle";
  if (input.waitsForInput(task)) return "needs-input";
  if (task.state === "running" || task.state === "queued") return "working";
  if (task.outcome === "failed" && !input.seen(task)) return "error";
  return input.unread(task) > 0 ? "done" : "idle";
}

export function projectActivityOf(input: ProjectActivityInput): ProjectActivity {
  let activity: ProjectActivity = "idle";
  for (const task of input.tasks) {
    const next = chatActivity(task, input);
    if (ACTIVITY_RANK[next] > ACTIVITY_RANK[activity]) activity = next;
  }
  return activity;
}
