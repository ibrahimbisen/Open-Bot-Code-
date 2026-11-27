import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  DEFAULT_REPLY_RULE,
  effectiveReplyRule,
  TURN_STEP_DETAIL_LIMITS,
  type TurnStepDetail,
} from "@codebot/contracts/ipc";
import { createFormat, translateFor } from "@codebot/i18n";
import { redactText } from "@codebot/logging";
import { turnActivityCounts, turnSummaryLine } from "../packages/ui/src/features/conversation/turn-summary";
import { replyRuleInstruction } from "../src/backend/agent/reply-rule";
import { traceStepFacts } from "../src/backend/agent/trace-step-facts";
import { stepDetail, stepDetailBytes, withinTurnBudget } from "../src/backend/agent/turn-step-details";
import type { ThreadItem } from "../src/backend/protocol";
import { TurnStepDetailsStore } from "../src/backend/turn-step-details-store";

const OUT = resolve(import.meta.dirname, "../.codebot-build/short-replies");
const SECRET = "sk-live-1234567890abcdefghijkl";

interface Check {
  name: string;
  passed: boolean;
  detail?: string;
}

const checks: Check[] = [];

async function check(name: string, run: () => void | Promise<void>): Promise<void> {
  try {
    await run();
    checks.push({ name, passed: true });
  } catch (error) {
    checks.push({ name, passed: false, detail: error instanceof Error ? error.message : String(error) });
  }
}

function threadItem(value: ThreadItem): ThreadItem {
  return value;
}

const fileChange = threadItem({
  type: "fileChange",
  id: "edit-codex",
  status: "completed",
  changes: [
    { path: "src/a.ts", kind: "update", diff: "@@ -1 +1 @@\n-old\n+new" },
    { path: "src/b.ts", kind: "update", diff: "@@ -1 +1 @@\n-1\n+2" },
  ],
});
const claudeEdit = threadItem({
  type: "toolCall",
  id: "edit-claude",
  name: "Edit",
  arguments: { file_path: "src/c.ts", old_string: "a\nb\nc", new_string: "a\nB\nc" },
});
const longOutput = `${Array.from({ length: 3000 }, (_, index) => `line ${index}`).join("\n")}\napi_key=${SECRET}\nlast line`;
const command = threadItem({
  type: "commandExecution",
  id: "run-1",
  command: "bun test",
  status: "completed",
  aggregatedOutput: longOutput,
  commandActions: [{ type: "unknown" }],
});
const readCommand = threadItem({
  type: "commandExecution",
  id: "read-1",
  command: "cat README.md",
  status: "completed",
  commandActions: [{ type: "read", path: "README.md" }],
});
const grep = threadItem({ type: "toolCall", id: "grep-1", name: "Grep", arguments: { pattern: "needle" } });
const fetchPage = threadItem({
  type: "toolCall",
  id: "fetch-1",
  name: "WebFetch",
  arguments: { url: "https://example.com/docs/page?token=1" },
});

await check("The default reply rule is the first instruction line", () => {
  const lines = replyRuleInstruction(undefined);
  assert.equal(lines.length, 1);
  assert.ok(lines[0]?.includes(DEFAULT_REPLY_RULE));
  assert.ok(DEFAULT_REPLY_RULE.startsWith("Reply short and plain."));
});

await check("A custom rule replaces the default and an empty rule sends none", () => {
  assert.ok(replyRuleInstruction("Answer in one line.")[0]?.endsWith("Answer in one line."));
  assert.deepEqual(replyRuleInstruction(""), []);
  assert.equal(effectiveReplyRule(null, null), DEFAULT_REPLY_RULE);
  assert.equal(effectiveReplyRule(null, "Global rule."), "Global rule.");
  assert.equal(effectiveReplyRule("Project rule.", "Global rule."), "Project rule.");
});

await check("A secret in a rule is redacted", () => {
  const text = replyRuleInstruction(`Use api_key=${SECRET}`)[0] ?? "";
  assert.ok(!text.includes(SECRET));
});

await check("Steps get an activity and targets", () => {
  assert.deepEqual(traceStepFacts(fileChange), { activity: "editing", targets: ["src/a.ts", "src/b.ts"] });
  assert.deepEqual(traceStepFacts(claudeEdit, ["src/c.ts"]), { activity: "editing", targets: ["src/c.ts"] });
  assert.equal(traceStepFacts(command).activity, "running");
  assert.deepEqual(traceStepFacts(readCommand), { activity: "reading", targets: ["README.md"] });
  assert.deepEqual(traceStepFacts(grep), { activity: "searching", targets: ["needle"] });
  assert.deepEqual(traceStepFacts(fetchPage), { activity: "browsing", targets: ["example.com"] });
});

await check("The one-line summary counts files and commands", () => {
  const steps = [
    traceStepFacts(fileChange),
    traceStepFacts(claudeEdit, ["src/c.ts"]),
    traceStepFacts(command),
    traceStepFacts(command),
  ];
  const counts = turnActivityCounts(steps);
  assert.deepEqual(counts, { editing: 3, running: 2 });
  const text = { t: translateFor("en"), format: createFormat("en", null) };
  assert.equal(turnSummaryLine(counts, text), "Edited 3 files and ran 2 commands");
  assert.equal(turnSummaryLine({ editing: 1 }, text), "Edited 1 file");
});

const redact = (text: string) => redactText(text);

await check("Step details keep a diff, cap output at the end and redact secrets", () => {
  const edit = stepDetail("edit-codex", fileChange, "editing", undefined, [], redact);
  assert.equal(edit?.diffs?.length, 2);
  assert.ok(edit?.diffs?.[0]?.diff.includes("+new"));
  const claude = stepDetail("edit-claude", claudeEdit, "editing", undefined, ["src/c.ts"], redact);
  assert.ok(claude?.diffs?.[0]?.diff.includes("+B"));
  assert.ok(claude?.diffs?.[0]?.diff.includes("-b"));
  const run = stepDetail("run-1", command, "running", undefined, [], redact);
  assert.equal(run?.input, "bun test");
  assert.equal(run?.outputTruncated, true);
  assert.ok((run?.output?.length ?? 0) <= TURN_STEP_DETAIL_LIMITS.output);
  assert.ok(run?.output?.endsWith("last line"), "The tail of the output is kept.");
  assert.ok(!run?.output?.includes(SECRET), "The secret is redacted.");
});

await check("The turn byte budget drops outputs but keeps the step", () => {
  const run = stepDetail("run-1", command, "running", undefined, [], redact);
  assert.ok(run);
  const limited = withinTurnBudget(run, TURN_STEP_DETAIL_LIMITS.turnBytes);
  assert.equal(limited.output, undefined);
  assert.equal(limited.outputTruncated, true);
  assert.ok(stepDetailBytes(limited) < stepDetailBytes(run));
});

await mkdir(OUT, { recursive: true });
const root = await mkdtemp(join(tmpdir(), "codebot-short-replies-e2e-"));
try {
  await check("Details are stored in a separate file and read lazily by turn and agent", () => {
    const path = join(root, "turn-step-details.db");
    const writer = new TurnStepDetailsStore(path);
    const run = stepDetail("run-1", command, "running", undefined, [], redact);
    const edit = stepDetail("edit-codex", fileChange, "editing", undefined, [], redact);
    assert.ok(run && edit);
    for (const detail of [run, edit])
      writer.record({ agentId: "a1", threadId: "t1", turnId: "turn-1", detail, bytes: stepDetailBytes(detail) });
    writer.record({ agentId: "a2", threadId: "t2", turnId: "turn-2", detail: edit, bytes: stepDetailBytes(edit) });
    writer.close();
    const reader = new TurnStepDetailsStore(path);
    const found: TurnStepDetail[] = reader.read("a1", "turn-1");
    assert.deepEqual(
      found.map((detail) => detail.stepId),
      ["run-1", "edit-codex"],
    );
    assert.deepEqual(reader.read("a2", "turn-1"), [], "Another agent reads nothing.");
    reader.deleteThread("t1");
    assert.deepEqual(reader.read("a1", "turn-1"), []);
    assert.equal(reader.read("a2", "turn-2").length, 1);
    reader.close();
  });

  await check("The details file prunes the oldest turns above its byte limit", async () => {
    const store = new TurnStepDetailsStore(join(root, "small.db"), 2_000);
    const big: TurnStepDetail = { stepId: "s", output: "x".repeat(900) };
    for (const turn of ["turn-a", "turn-b", "turn-c", "turn-d"]) {
      store.record({ agentId: "a1", threadId: "t1", turnId: turn, detail: big, bytes: 900 });
      await new Promise((done) => setTimeout(done, 5));
    }
    store.prune();
    assert.ok(store.storedBytes() <= 2_000);
    assert.equal(store.read("a1", "turn-d").length, 1, "The newest turn stays.");
    assert.equal(store.read("a1", "turn-a").length, 0, "The oldest turn is gone.");
    store.close();
  });
} finally {
  await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }).catch(() => undefined);
}

const passed = checks.every((entry) => entry.passed);
await writeFile(join(OUT, "report.json"), `${JSON.stringify({ passed, checks }, null, 2)}\n`);
for (const entry of checks)
  process.stdout.write(`${entry.passed ? "PASS" : "FAIL"} ${entry.name}${entry.detail ? `: ${entry.detail}` : ""}\n`);
process.exit(passed ? 0 : 1);
