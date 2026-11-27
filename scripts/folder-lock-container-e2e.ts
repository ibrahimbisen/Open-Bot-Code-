import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, realpath, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import type { AgentSummary } from "@codebot/contracts/ipc";
import { type DynamicRecord, isString } from "@codebot/contracts/runtime-values";
import { checkAgentFolders } from "../src/backend/agent/workspace-sandbox";
import { ClaudeAgentClient } from "../src/backend/claude-client";
import { resolveClaudeCli } from "../src/backend/cli";
import { runCauseEffect } from "../src/backend/effect-boundary";
import {
  containerPlan,
  ensureProjectContainer,
  findContainerTool,
  removeProjectContainer,
  setContainerPolicy,
} from "../src/backend/lock/container";
import { folderLockParam } from "../src/backend/lock/folder-lock";
import { setAgentProjectContextSource } from "../src/backend/projects/project-context";
import { type AppServerNotification, getRecord, getString } from "../src/backend/protocol";
import { type FakeStep, startEgressGuard, startFakeAnthropicApi } from "./provider-fakes/fake-anthropic-api";

const OUT = resolve(import.meta.dirname, "../.codebot-build/folder-lock-container-e2e");
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
const bin = join(root, "bin");
const state = join(root, "docker-state.json");
const log = join(root, "docker-log.jsonl");
for (const folder of [project, extra, outside, shared, bin, join(root, "claude-config")])
  mkdirSync(folder, { recursive: true });
writeFileSync(join(outside, "secret.txt"), "SECRET-OUTSIDE\n");

const FAKE_DOCKER = `
import { spawn } from "node:child_process";
import { appendFileSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
const args = process.argv.slice(2);
appendFileSync(process.env.FAKE_DOCKER_LOG, JSON.stringify(args) + "\\n");
const state = process.env.FAKE_DOCKER_STATE;
const option = (name) => { const i = args.indexOf(name); return i < 0 ? null : args[i + 1]; };
const hostPath = (path) => {
  const m = /^\\/codebot\\/([a-z])\\/(.*)$/.exec(path ?? "");
  return m ? m[1].toUpperCase() + ":/" + m[2] : path;
};
if (args[0] === "inspect") {
  if (!existsSync(state)) process.exit(1);
  const s = JSON.parse(readFileSync(state, "utf8"));
  process.stdout.write("true " + s.label + "\\n");
} else if (args[0] === "run") {
  const label = args.find((a) => a.startsWith("codebot.lock.mounts=")).split("=")[1];
  writeFileSync(state, JSON.stringify({ name: option("--name"), label }));
  process.stdout.write("fake-container-id\\n");
} else if (args[0] === "rm") {
  rmSync(state, { force: true });
} else if (args[0] === "exec") {
  const rest = args.slice(1);
  const env = [];
  let cwd = null;
  let i = 0;
  for (; i < rest.length; i += 1) {
    if (rest[i] === "--interactive") continue;
    if (rest[i] === "--workdir") { cwd = hostPath(rest[i + 1]); i += 1; continue; }
    if (rest[i] === "--env") { env.push(rest[i + 1]); i += 1; continue; }
    break;
  }
  const [name, command, ...commandArgs] = rest.slice(i);
  const child = spawn(command, commandArgs, { cwd, stdio: "inherit", env: process.env });
  child.on("exit", (code) => process.exit(code ?? 1));
} else {
  process.exit(2);
}
`;
const fakeSource = join(root, "fake-docker.ts");
writeFileSync(fakeSource, FAKE_DOCKER);
const dockerName = process.platform === "win32" ? "docker.exe" : "docker";
const compiled = spawnSync(process.execPath, ["build", "--compile", fakeSource, "--outfile", join(bin, dockerName)], {
  encoding: "utf8",
  timeout: 180_000,
});
check(
  "fake docker program was built",
  compiled.status === 0 && existsSync(join(bin, dockerName)),
  (compiled.stderr || compiled.stdout).slice(0, 300),
);

const api = await startFakeAnthropicApi();
const guard = await startEgressGuard();
Object.assign(process.env, guard.env, {
  ANTHROPIC_BASE_URL: api.url,
  ANTHROPIC_API_KEY: "sk-ant-fake-folder-lock",
  CLAUDE_CONFIG_DIR: join(root, "claude-config"),
  CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
  DISABLE_TELEMETRY: "1",
  FAKE_DOCKER_LOG: log,
  FAKE_DOCKER_STATE: state,
  PATH: `${bin}${delimiter}${process.env.PATH ?? ""}`,
});

const calls = (): string[][] =>
  existsSync(log)
    ? readFileSync(log, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((line): string[] => {
          const parsed = JSON.parse(line);
          return Array.isArray(parsed) ? parsed.filter(isString) : [];
        })
    : [];

const agent = {
  id: "agent-container",
  access: "full",
  additionalFolders: [extra],
  excludedFolders: [],
  workspacePath: project,
} satisfies Pick<AgentSummary, "id" | "access" | "additionalFolders" | "excludedFolders" | "workspacePath">;

setAgentProjectContextSource(() => ({
  projectId: "project-container",
  projectName: "Container",
  mainFolder: project,
  folders: [extra],
  accessLevel: "strict",
  replyRule: null,
  instructions: "",
}));
await runCauseEffect(checkAgentFolders(agent));

let client: ClaudeAgentClient | null = null;
try {
  const tool = findContainerTool();
  check("the container tool is found on PATH", tool?.startsWith(bin) === true, String(tool));
  const plan = containerPlan({
    tool: tool ?? "docker",
    projectId: "project-container",
    writableFolders: [project, extra],
    readOnlyFolders: [],
    workdir: project,
  });
  await ensureProjectContainer(plan);
  await ensureProjectContainer(plan);
  const first = calls();
  const runs = first.filter((call) => call[0] === "run");
  check(
    "one container for one project: the second call reuses it",
    runs.length === 1 && first.filter((call) => call[0] === "inspect").length === 2,
    JSON.stringify(first.map((call) => call[0])),
  );
  const run = runs[0] ?? [];
  const volumes = run.flatMap((arg, index) => (arg === "--volume" ? [run[index + 1] ?? ""] : []));
  check(
    "the container sees only the project folders",
    volumes.length === 2 && volumes.every((volume) => !volume.includes("outside")),
    volumes.join(" | "),
  );
  check(
    "the container drops all capabilities and blocks privilege gain",
    run.includes("--cap-drop") && run.includes("ALL") && run.includes("no-new-privileges"),
    run.join(" "),
  );
  check(
    "the container has a private tmp and a stable name",
    run.includes("--tmpfs") && run.includes(plan.name) && plan.name.startsWith("codebot-lock-project-container-"),
    plan.name,
  );

  const widened = containerPlan({
    tool: plan.tool,
    projectId: "project-container",
    writableFolders: [project, extra, join(root, "added")],
    readOnlyFolders: [],
    workdir: project,
  });
  await ensureProjectContainer(widened);
  const afterChange = calls()
    .slice(first.length)
    .map((call) => call[0]);
  check(
    "a changed folder list recreates the container",
    afterChange.join(",") === "inspect,rm,run",
    afterChange.join(","),
  );
  await removeProjectContainer(widened);
  check("the container is removed on request", !existsSync(state));

  setContainerPolicy("always");
  const cli = await runCauseEffect(resolveClaudeCli());
  client = new ClaudeAgentClient(cli, undefined, undefined, 120_000);
  client.on("request", (request) => client?.respond(request.id, { decision: "decline" }));
  client.start();
  const params: DynamicRecord = {
    model: MODEL,
    cwd: project,
    runtimeWorkspaceRoots: [project, extra],
    developerInstructions: "",
    persistSession: true,
    workspaceOnly: true,
    ...folderLockParam(agent, shared),
  };
  const thread = await runCauseEffect(
    client.request("thread/start", params, (value) => {
      const id = getString(getRecord(value, "thread"), "id");
      if (!id) throw new Error("No thread id.");
      return id;
    }),
  );
  const track = "container-main";
  const steps: FakeStep[] = [
    { name: "write-outside", tool: "Write", input: { file_path: join(outside, "pwn.txt"), content: "pwn" } },
    { name: "write-inside", tool: "Write", input: { file_path: join(project, "ok.txt"), content: "ok" } },
    { name: "read-outside", tool: "Read", input: { file_path: join(outside, "secret.txt") } },
    { text: "done" },
  ];
  api.setTrack(track, steps);
  const outcome: { status: string | null } = { status: null };
  const done = new Promise<void>((finish) => {
    const listener = (notification: AppServerNotification) => {
      if (getString(notification.params, "threadId") !== thread || notification.method !== "turn/completed") return;
      outcome.status = getString(getRecord(notification.params, "turn"), "status");
      client?.off("notification", listener);
      finish();
    };
    client?.on("notification", listener);
  });
  await runCauseEffect(
    client.request(
      "turn/start",
      { threadId: thread, model: MODEL, input: [{ type: "text", text: `${api.marker(track)} go` }] },
      (value) => value,
    ),
  );
  await done;
  const all = calls();
  const exec = all.find((call) => call[0] === "exec");
  check(
    "turn completes with the Claude process inside the container",
    outcome.status === "completed" && exec !== undefined,
    JSON.stringify({ status: outcome.status, exec: exec?.slice(0, 6) }),
  );
  const runCall = all.filter((call) => call[0] === "run").at(-1) ?? [];
  const mounts = runCall.flatMap((arg, index) => (arg === "--volume" ? [runCall[index + 1] ?? ""] : []));
  check(
    "strict container mounts: project, extra folder, config, engine; never the outside folder",
    mounts.length >= 3 &&
      mounts.some((mount) => mount.includes("project")) &&
      mounts.every((mount) => !mount.includes("outside")),
    mounts.join(" | "),
  );
  check(
    "the engine folder is read-only in the container",
    mounts.some((mount) => mount.endsWith(":ro")),
    mounts.join(" | "),
  );
  check(
    "the Claude process is told the project folder as its working folder",
    exec?.includes("--workdir") === true && (exec[exec.indexOf("--workdir") + 1] ?? "").includes("project"),
    exec?.slice(0, 5).join(" ") ?? "",
  );
  check(
    "write outside is still blocked by the file-tool hook",
    api.toolResult(track, "write-outside")?.isError === true && !existsSync(join(outside, "pwn.txt")),
    api.toolResult(track, "write-outside")?.text.slice(0, 120) ?? "no result",
  );
  check(
    "write inside works",
    api.toolResult(track, "write-inside")?.isError === false && existsSync(join(project, "ok.txt")),
  );
  check(
    "read outside is blocked",
    api.toolResult(track, "read-outside")?.isError === true,
    api.toolResult(track, "read-outside")?.text.slice(0, 120) ?? "no result",
  );
  check(
    "no request left this computer",
    guard.attempts.length === 0 && api.unexpectedPaths().length === 0,
    JSON.stringify({ guard: guard.attempts, unexpected: api.unexpectedPaths() }),
  );
} catch (error) {
  check("script ran to the end", false, error instanceof Error ? (error.stack ?? error.message) : String(error));
} finally {
  setContainerPolicy(null);
  if (client) await runCauseEffect(client.stop()).catch(() => undefined);
  await api.close();
  await guard.close();
  const passed = checks.length > 0 && checks.every((entry) => entry.passed);
  writeFileSync(
    join(OUT, "report.json"),
    `${JSON.stringify({ passed, platform: process.platform, checks, note: "The container tool is a fake that records its calls. Real isolation needs Docker or Podman on a Linux host." }, null, 2)}\n`,
  );
  await rm(root, { recursive: true, force: true }).catch(() => undefined);
  process.stdout.write(`${passed ? "PASSED" : "FAILED"}: ${OUT}/report.json\n`);
  process.exit(passed ? 0 : 1);
}
