import { join, resolve } from "node:path";
import type { ConversationMessage, ConversationTraceStep, TurnStepDetail } from "@codebot/contracts/ipc";
import { AgentStore } from "../src/backend/agent-store";
import { CodeBotDatabase } from "../src/backend/codebot-database";
import { runCauseEffect } from "../src/backend/effect-boundary";
import { TURN_STEP_DETAILS_FILE, TurnStepDetailsStore } from "../src/backend/turn-step-details-store";

export const SHORT_REPLIES_TURN_ID = "short-replies-turn";

const LONG_CODE = [
  "export interface Reply {",
  ...Array.from({ length: 28 }, (_, index) => `  field${index + 1}: string;`),
  "}",
].join("\n");

const EDIT_DIFF = [
  "@@ -1,4 +1,5 @@",
  " export function total(items: number[]): number {",
  "-  return items.reduce((sum, item) => sum + item, 0);",
  "+  const sum = items.reduce((total, item) => total + item, 0);",
  "+  return Math.round(sum * 100) / 100;",
  " }",
].join("\n");

const TEST_OUTPUT = Array.from({ length: 30 }, (_, index) => `ok ${index + 1} - case ${index + 1}`).join("\n");

interface SeedStep {
  step: ConversationTraceStep;
  detail?: Omit<TurnStepDetail, "stepId">;
}

function steps(start: number): SeedStep[] {
  const at = (offset: number) => new Date(start + offset * 1000).toISOString();
  const tool = (
    id: string,
    offset: number,
    text: string,
    activity: string,
    targets: string[],
    command?: string,
  ): ConversationTraceStep => ({
    id,
    kind: "tool",
    text,
    activity,
    targets,
    startedAt: at(offset),
    endedAt: at(offset + 2),
    ...(command ? { command } : {}),
  });
  return [
    { step: { id: "think-1", kind: "reasoning", startedAt: at(0), endedAt: at(2) } },
    { step: tool("read-1", 3, "Read src/total.ts", "reading", ["src/total.ts"]) },
    {
      step: tool("edit-1", 6, "Edited src/total.ts", "editing", ["src/total.ts"]),
      detail: { diffs: [{ path: "src/total.ts", diff: EDIT_DIFF }] },
    },
    {
      step: tool("edit-2", 9, "Edited src/total.test.ts", "editing", ["src/total.test.ts"]),
      detail: {
        diffs: [
          {
            path: "src/total.test.ts",
            diff: '@@ -1,2 +1,3 @@\n test("total", () => {\n+  expect(total([0.1, 0.2])).toBe(0.3);\n });',
          },
        ],
      },
    },
    {
      step: tool("edit-3", 12, "Edited README.md", "editing", ["README.md"]),
      detail: {
        diffs: [{ path: "README.md", diff: "@@ -1 +1,2 @@\n # Totals\n+Totals are rounded to two decimals." }],
      },
    },
    {
      step: tool("run-1", 15, "Ran bun test", "running", [], "bun test"),
      detail: { input: "bun test", output: TEST_OUTPUT },
    },
    {
      step: tool("run-2", 19, "Ran bun run lint", "running", [], "bun run lint"),
      detail: { input: "bun run lint", output: "Checked 12 files. No problems found." },
    },
  ];
}

export async function seedShortReplies(profilePath: string, agentId: string): Promise<void> {
  const profile = resolve(profilePath);
  const database = new CodeBotDatabase(profile);
  const store = new AgentStore(profile, resolve(profile, ".."), database);
  await runCauseEffect(store.initialize());
  const agent = store.list().find((candidate) => candidate.id === agentId);
  if (!agent?.threadId) throw new Error(`Agent ${agentId} has no thread.`);
  const start = Date.now() - 10 * 60_000;
  const seeded = steps(start);
  const details = new TurnStepDetailsStore(join(profile, TURN_STEP_DETAILS_FILE));
  for (const { step, detail } of seeded) {
    if (!detail) continue;
    const full: TurnStepDetail = { stepId: step.id, ...detail };
    details.record({
      agentId,
      threadId: agent.threadId,
      turnId: SHORT_REPLIES_TURN_ID,
      detail: full,
      bytes: JSON.stringify(full).length,
    });
  }
  const user: ConversationMessage = {
    id: "short-replies-user",
    author: "user",
    source: "user",
    text: "Round the totals to two decimals and run the checks.",
    createdAt: new Date(start - 1000).toISOString(),
    status: "completed",
    turnId: SHORT_REPLIES_TURN_ID,
  };
  const answer: ConversationMessage = {
    id: "short-replies-answer",
    author: "assistant",
    source: "assistant",
    text: ["Totals now round to two decimals. All 30 tests pass.", "", "```ts", LONG_CODE, "```"].join("\n"),
    createdAt: new Date(start + 24_000).toISOString(),
    status: "completed",
    turnId: SHORT_REPLIES_TURN_ID,
    trace: {
      startedAt: new Date(start).toISOString(),
      endedAt: new Date(start + 24_000).toISOString(),
      steps: seeded.map(({ step }) => step),
    },
  };
  database.persistConversationChanges({
    agentId,
    threadId: agent.threadId,
    activeTurnId: null,
    changedMessages: [user, answer],
    eventType: "short-replies-seed",
  });
}

if (import.meta.main) {
  const [profile, agent] = process.argv.slice(2);
  if (!profile) throw new Error("Usage: bun scripts/short-replies-seed.ts <profile folder> [agent id]");
  await seedShortReplies(profile, agent ?? "builder");
  process.stdout.write(`seeded ${SHORT_REPLIES_TURN_ID}
`);
}
