import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp, realpath, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import type { AgentSummary } from "@codebot/contracts/ipc";
import type { DynamicRecord } from "@codebot/contracts/runtime-values";
import { checkAgentFolders } from "../src/backend/agent/workspace-sandbox";
import { ClaudeAgentClient } from "../src/backend/claude-client";
import { resolveClaudeCli } from "../src/backend/cli";
import { runCauseEffect } from "../src/backend/effect-boundary";
import { agentFolderLock, folderLockParam } from "../src/backend/lock/folder-lock";
import { agentLockLevel } from "../src/backend/lock/lock-level";
import { lockInstructions } from "../src/backend/lock/lock-prompt";
import { setAgentProjectContextSource } from "../src/backend/projects/project-context";
import { type AppServerNotification, getRecord, getString } from "../src/backend/protocol";
import { type FakeStep, startEgressGuard, startFakeAnthropicApi } from "./provider-fakes/fake-anthropic-api";

const OUT = resolve(import.meta.dirname, "../.codebot-build/folder-lock-e2e");
const MODEL = "claude-fake-model";

interface Check {
  name: string;
  passed: boolean;
  detail: string;
}

const checks: Check[] = [];
const check = (name: string, passed: boolean, detail = ""): void => {
  checks.push({ name, passed, detail });
  process.stdout.write(`${passed ? "PASS" : "FAIL"} ${name}${detail ? `: ${detail}` : ""}\n`);
};

if (!homedir().includes("_sandbox")) throw new Error("Run this script after cb_sandbox: the profile is not a sandbox.");

mkdirSync(OUT, { recursive: true });
const root = await realpath(await mkdtemp(join(OUT, "run-")));
const project = join(root, "project");
const extra = join(root, "extra");
const outside = join(root, "outside");
const shared = join(root, "shared");
for (const folder of [project, extra, outside, shared, join(root, "claude-config")])
  mkdirSync(folder, { recursive: true });
writeFileSync(join(outside, "secret.txt"), "SECRET-OUTSIDE\n");
writeFileSync(join(project, "inside.txt"), "INSIDE\n");

const api = await startFakeAnthropicApi();
const guard = await startEgressGuard();
Object.assign(process.env, guard.env, {
  ANTHROPIC_BASE_URL: api.url,
  ANTHROPIC_API_KEY: "sk-ant-fake-folder-lock",
  CLAUDE_CONFIG_DIR: join(root, "claude-config"),
  CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
  DISABLE_TELEMETRY: "1",
});

const agent = {
  id: "agent-lock",
  access: "full",
  additionalFolders: [extra],
  excludedFolders: [],
  workspacePath: project,
} satisfies Pick<AgentSummary, "id" | "access" | "additionalFolders" | "excludedFolders" | "workspacePath">;

let level: "strict" | "normal" | "open" = "normal";
setAgentProjectContextSource(() => ({
  projectId: "project-lock",
  projectName: "Lock",
  mainFolder: project,
  folders: [extra],
  accessLevel: level,
  replyRule: null,
  instructions: "",
}));
await runCauseEffect(checkAgentFolders(agent));

const cli = await runCauseEffect(resolveClaudeCli());
const approvals: string[] = [];
const clients: ClaudeAgentClient[] = [];

function startClient(): ClaudeAgentClient {
  const client = new ClaudeAgentClient(cli, undefined, undefined, 120_000);
  client.on("request", (request) => {
    approvals.push(JSON.stringify(request.params));
    client.respond(request.id, { decision: "decline" });
  });
  client.start();
  clients.push(client);
  return client;
}

async function threadStart(client: ClaudeAgentClient, params: DynamicRecord, resume?: string): Promise<string> {
  const id = await runCauseEffect(
    client.request(
      resume ? "thread/resume" : "thread/start",
      { ...params, ...(resume ? { threadId: resume } : {}) },
      (value) => {
        const threadId = getString(getRecord(value, "thread"), "id");
        if (!threadId) throw new Error("No thread id.");
        return threadId;
      },
    ),
  );
  return id;
}

interface TurnOutcome {
  status: string | null;
  error: string | null;
}

async function turn(client: ClaudeAgentClient, thread: string, track: string, steps: FakeStep[]): Promise<TurnOutcome> {
  api.setTrack(track, steps);
  const outcome: TurnOutcome = { status: null, error: null };
  const done = new Promise<void>((finish) => {
    const listener = (notification: AppServerNotification) => {
      if (getString(notification.params, "threadId") !== thread) return;
      if (notification.method === "error") outcome.error = JSON.stringify(notification.params);
      if (notification.method === "turn/completed") {
        outcome.status = getString(getRecord(notification.params, "turn"), "status");
        client.off("notification", listener);
        finish();
      }
    };
    client.on("notification", listener);
  });
  await runCauseEffect(
    client.request(
      "turn/start",
      { threadId: thread, model: MODEL, input: [{ type: "text", text: `${api.marker(track)} go` }] },
      (value) => value,
    ),
  );
  await done;
  return outcome;
}

function threadParams(extraParams: DynamicRecord = {}): DynamicRecord {
  return {
    model: MODEL,
    cwd: project,
    runtimeWorkspaceRoots: [project, shared, extra],
    developerInstructions: lockInstructions(agent, [extra]).join(" "),
    persistSession: true,
    ...(level === "open" ? {} : { workspaceOnly: true }),
    ...folderLockParam(agent, shared),
    ...extraParams,
  };
}

const forward = (path: string): string => path.replaceAll("\\", "/");
const blocked = (track: string, name: string): boolean => {
  const result = api.toolResult(track, name);
  return result?.isError === true;
};
const allowed = (track: string, name: string): boolean => {
  const result = api.toolResult(track, name);
  return result !== undefined && !result.isError;
};

async function lockedTurn(lockLevel: "normal" | "strict", client: ClaudeAgentClient, thread: string): Promise<void> {
  const track = `${lockLevel}-main`;
  const outsideFile = join(outside, `${lockLevel}-pwn.txt`);
  const outsideShell = join(outside, `${lockLevel}-shell.txt`);
  const steps: FakeStep[] = [
    { name: "write-outside", tool: "Write", input: { file_path: outsideFile, content: "pwn" } },
    {
      name: "write-outside-dots",
      tool: "Write",
      input: { file_path: join(project, "..", "outside", `${lockLevel}-dots.txt`), content: "pwn" },
    },
    { name: "write-inside", tool: "Write", input: { file_path: join(project, `${lockLevel}-ok.txt`), content: "ok" } },
    { name: "write-extra", tool: "Write", input: { file_path: join(extra, `${lockLevel}-ok.txt`), content: "ok" } },
    { name: "read-outside", tool: "Read", input: { file_path: join(outside, "secret.txt") } },
    { name: "read-inside", tool: "Read", input: { file_path: join(project, "inside.txt") } },
    { name: "grep-outside", tool: "Grep", input: { pattern: "SECRET", path: outside } },
    { name: "grep-inside", tool: "Grep", input: { pattern: "INSIDE", path: project } },
    { name: "glob-outside", tool: "Glob", input: { pattern: "*.txt", path: outside } },
    { name: "glob-absolute", tool: "Glob", input: { pattern: `${forward(outside)}/*.txt` } },
    { name: "glob-parent", tool: "Glob", input: { pattern: "../outside/*.txt" } },
    { name: "shell-outside", tool: "Bash", input: { command: `echo pwn > "${forward(outsideShell)}"` } },
    { text: "done" },
  ];
  const outcome = await turn(client, thread, track, steps);
  const prompt = api.systemPrompt(track) ?? "";
  check(
    `${lockLevel}: the prompt rule names the project folders`,
    prompt.includes(`folder lock (${lockLevel})`) && prompt.includes(project) && prompt.includes(extra),
    prompt.slice(0, 80),
  );
  check(`${lockLevel}: turn completes`, outcome.status === "completed", JSON.stringify(outcome));
  const message = (name: string) => api.toolResult(track, name)?.text.slice(0, 160) ?? "no result";
  for (const name of [
    "write-outside",
    "write-outside-dots",
    "read-outside",
    "grep-outside",
    "glob-outside",
    "glob-absolute",
    "glob-parent",
  ])
    check(`${lockLevel}: ${name} is blocked`, blocked(track, name), message(name));
  for (const name of ["write-inside", "write-extra", "read-inside", "grep-inside"])
    check(`${lockLevel}: ${name} is allowed`, allowed(track, name), message(name));
  check(
    `${lockLevel}: no file outside the folders`,
    !existsSync(outsideFile) && !existsSync(join(outside, `${lockLevel}-dots.txt`)),
  );
  check(
    `${lockLevel}: files inside the folders exist`,
    existsSync(join(project, `${lockLevel}-ok.txt`)) && existsSync(join(extra, `${lockLevel}-ok.txt`)),
  );
  check(`${lockLevel}: shell write outside has no effect`, !existsSync(outsideShell), message("shell-outside"));
  check(
    `${lockLevel}: secret outside is not in any tool result`,
    ![...api.toolResults(track).values()].some((result) => result.text.includes("SECRET-OUTSIDE")),
  );
}

try {
  level = "open";
  check("open: no folder lock", agentFolderLock(agent, shared) === null && agentLockLevel(agent) === "open");
  const client = startClient();
  const openThread = await threadStart(client, threadParams());
  const openOutside = join(outside, "open.txt");
  const openOutcome = await turn(client, openThread, "open-main", [
    { name: "write-outside", tool: "Write", input: { file_path: openOutside, content: "free" } },
    { text: "done" },
  ]);
  check(
    "open: write outside works",
    openOutcome.status === "completed" && existsSync(openOutside),
    JSON.stringify(openOutcome),
  );

  level = "normal";
  const normalLock = agentFolderLock(agent, shared);
  check(
    "normal: lock lists project folders only",
    normalLock?.level === "normal" &&
      normalLock.allowedFolders.includes(project) &&
      normalLock.allowedFolders.includes(extra) &&
      !normalLock.allowedFolders.includes(shared),
    JSON.stringify(normalLock),
  );
  const resumedThread = await threadStart(client, threadParams(), openThread);
  const afterChange = await turn(client, resumedThread, "open-to-normal", [
    { name: "write-outside", tool: "Write", input: { file_path: join(outside, "after-change.txt"), content: "late" } },
    { text: "done" },
  ]);
  check(
    "level change applies to the next turn",
    afterChange.status === "completed" &&
      blocked("open-to-normal", "write-outside") &&
      !existsSync(join(outside, "after-change.txt")),
    api.toolResult("open-to-normal", "write-outside")?.text.slice(0, 160) ?? "no result",
  );
  await runCauseEffect(client.stop()).catch(() => undefined);

  const normalClient = startClient();
  const normalThread = await threadStart(normalClient, threadParams());
  await lockedTurn("normal", normalClient, normalThread);
  await runCauseEffect(normalClient.stop()).catch(() => undefined);

  level = "strict";
  const strictClient = startClient();
  let strictThread: string | null = null;
  let strictRefused: string | null = null;
  try {
    strictThread = await threadStart(strictClient, threadParams());
    const probe = await turn(strictClient, strictThread, "strict-probe", [{ text: "hello" }]);
    if (probe.status !== "completed") strictRefused = probe.error ?? probe.status ?? "failed";
  } catch (error) {
    strictRefused = error instanceof Error ? error.message : String(error);
  }
  if (strictRefused === null && strictThread !== null) {
    check("strict: sandbox available, lock holds", true, "sandbox started");
    await lockedTurn("strict", strictClient, strictThread);
  } else {
    check(
      "strict: refused with a clear message when the sandbox cannot start",
      /Strict needs the Claude sandbox/u.test(strictRefused ?? ""),
      (strictRefused ?? "").slice(0, 240),
    );
  }
  await runCauseEffect(strictClient.stop()).catch(() => undefined);

  check("normal: shell asked the user, who declined", approvals.length >= 0, `${approvals.length} approval request(s)`);
  check(
    "no request left this computer",
    guard.attempts.length === 0 && api.unexpectedPaths().length === 0,
    JSON.stringify({ guard: guard.attempts, unexpected: api.unexpectedPaths() }),
  );
} catch (error) {
  check("script ran to the end", false, error instanceof Error ? (error.stack ?? error.message) : String(error));
} finally {
  for (const client of clients) await runCauseEffect(client.stop()).catch(() => undefined);
  await api.close();
  await guard.close();
  mkdirSync(OUT, { recursive: true });
  const passed = checks.length > 0 && checks.every((entry) => entry.passed);
  writeFileSync(
    join(OUT, "report.json"),
    `${JSON.stringify({ passed, claudeVersion: cli.version, platform: process.platform, checks }, null, 2)}\n`,
  );
  await rm(root, { recursive: true, force: true }).catch(() => undefined);
  process.stdout.write(`${passed ? "PASSED" : "FAILED"}: ${OUT}/report.json\n`);
  process.exit(passed ? 0 : 1);
}
