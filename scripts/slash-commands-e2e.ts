import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import type { AgentSummary, SlashCommandEntry } from "@codebot/contracts/ipc";
import { Schema } from "effect";
import { ClaudeAgentClient } from "../src/backend/claude-client";
import { runCauseEffect } from "../src/backend/effect-boundary";
import { SlashCommandCatalog } from "../src/backend/slash-commands/slash-command-catalog";
import { SlashCommands } from "../src/backend/slash-commands/slash-commands";

const NAME = "slash-commands";
const OUT = resolve(import.meta.dirname, `../.codebot-build/${NAME}`);
mkdirSync(OUT, { recursive: true });

interface Check {
  name: string;
  passed: boolean;
  detail?: unknown;
}
const checks: Check[] = [];
function check(name: string, passed: boolean, detail?: unknown): void {
  checks.push({ name, passed, ...(detail === undefined ? {} : { detail }) });
  if (!passed) throw new Error(`Check failed: ${name} ${JSON.stringify(detail ?? "")}`);
}

const require = createRequire(import.meta.url);
const sdkPackage = require.resolve(`@anthropic-ai/claude-agent-sdk-${process.platform}-${process.arch}/package.json`);
const executable = join(dirname(sdkPackage), process.platform === "win32" ? "claude.exe" : "claude");

const requests: string[] = [];
const server = createServer((request, response) => {
  request.resume();
  request.on("end", () => {
    requests.push(`${request.method} ${request.url}`);
    response.writeHead(400, { "content-type": "application/json" });
    response.end(JSON.stringify({ type: "error", error: { type: "invalid_request_error", message: "recorder" } }));
  });
});
await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
const address = server.address();
const port = typeof address === "object" && address ? address.port : 0;

const root = mkdtempSync(join(tmpdir(), "codebot-slash-e2e-"));
const configDir = join(root, "config");
const state = join(root, "state");
const workspace = join(root, "workspace");
for (const dir of [configDir, state, workspace]) mkdirSync(dir, { recursive: true });
const file = (path: string, lines: string[]) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${lines.join("\n")}\n`);
};
file(join(workspace, ".claude", "commands", "hello.md"), [
  "---",
  "description: Say hello from the project",
  "argument-hint: <name>",
  "---",
  "Say hello to $ARGUMENTS",
]);
file(join(workspace, ".claude", "skills", "demo", "SKILL.md"), [
  "---",
  "name: demo",
  "description: Demo skill of the project",
  "---",
  "Do the demo.",
]);
file(join(configDir, "commands", "mine.md"), ["---", "description: My user command", "---", "Do my thing"]);
file(join(configDir, "skills", "userskill", "SKILL.md"), [
  "---",
  "name: userskill",
  "description: A user skill",
  "---",
  "Do it.",
]);

const environment = () => ({
  CLAUDE_CONFIG_DIR: configDir,
  ANTHROPIC_BASE_URL: `http://127.0.0.1:${port}`,
  ANTHROPIC_API_KEY: "sk-ant-recorder-not-a-key",
  DISABLE_AUTOUPDATER: "1",
  DISABLE_TELEMETRY: "1",
  DISABLE_ERROR_REPORTING: "1",
  CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
});

const catalogPath = join(state, "slash-commands.json");
const agent: AgentSummary = {
  id: "agent-e2e",
  name: "E2E",
  title: "",
  description: "",
  notifications: false,
  provider: "claude",
  model: "default",
  reasoningEffort: "medium",
  workspacePath: workspace,
  access: "full",
  threadId: null,
  preview: "",
  updatedAt: null,
  avatarSeed: "e2e",
  avatarHue: null,
  avatarUrl: null,
};

let changes = 0;
const client = new ClaudeAgentClient(
  { executable, version: "0.0.1", source: "system" },
  undefined,
  undefined,
  60_000,
  undefined,
  undefined,
  undefined,
  undefined,
  state,
  environment,
);
const commands = new SlashCommands({
  catalog: new SlashCommandCatalog(catalogPath),
  agent: (id) => (id === agent.id ? agent : undefined),
  hasTask: () => false,
  chatOfThread: () => null,
  clientOfAgent: () => client,
  claudeClient: () => client,
  changed: () => {
    changes += 1;
  },
  fork: (work) => {
    void runCauseEffect(work);
  },
});

async function until<T>(label: string, read: () => T | null | undefined | false, timeoutMs = 90_000): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = read();
    if (value) return value;
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${label}.`);
    await new Promise((done) => setTimeout(done, 100));
  }
}

const SavedFile = Schema.Struct({
  engines: Schema.Array(
    Schema.Struct({
      engine: Schema.String,
      cliVersion: Schema.NullOr(Schema.String),
      engineVersion: Schema.NullOr(Schema.String),
      commands: Schema.Array(Schema.Struct({ name: Schema.String })),
    }),
  ),
});
const readSavedFile = () => {
  try {
    return Schema.decodeUnknownSync(SavedFile)(JSON.parse(readFileSync(catalogPath, "utf8")));
  } catch {
    return null;
  }
};
const savedFile = readSavedFile;
const claudeSaved = () => savedFile()?.engines.find((engine) => engine.engine === "claude") ?? null;
const names = (entries: readonly SlashCommandEntry[]) => entries.map((entry) => entry.name);
const status = (version: string) => ({
  providers: [{ id: "claude" as const, state: "available" as const, version, message: null }],
});
const providerStatus = (version: string) => commands.providerStatus(status(version));

let passed = false;
try {
  client.start();
  const empty = await runCauseEffect(commands.list({ agentId: agent.id }));
  check("9.4 before any probe the list origin is none", empty.origin === "none", empty.origin);

  providerStatus("2.1.100");
  const first = await until("the first probe to save the list", () => claudeSaved());
  check(
    "9.3 a new Claude Code version starts one background probe and saves the list",
    first.cliVersion === "2.1.100",
    {
      cliVersion: first.cliVersion,
      engineVersion: first.engineVersion,
      count: first.commands.length,
    },
  );
  check(
    "9.2 the saved list comes from the engine (many built-in commands)",
    first.commands.length >= 20,
    first.commands.length,
  );
  check("9.3 the probe sent zero requests to the model API", requests.length === 0, requests);
  check("9.3 the probe notified the UI", changes > 0, changes);

  const listed = await runCauseEffect(commands.list({ agentId: agent.id }));
  check("9.4 the saved list is used in a chat with no session", listed.origin === "saved", listed.origin);
  const byName = new Map(listed.commands.map((entry) => [entry.name, entry]));
  check("9.7 model has the model picker screen", byName.get("model")?.screen === "model", byName.get("model"));
  check("9.7 effort has the thinking level screen", byName.get("effort")?.screen === "effort", byName.get("effort"));
  check("9.7 resume has the resume screen", byName.get("resume")?.screen === "resume", byName.get("resume"));
  const plain = listed.commands.filter((entry) => entry.screen === null).length;
  check("9.7 every other command is plain text", plain === listed.commands.length - 3, {
    plain,
    total: listed.commands.length,
  });

  check("9.5 a project command is listed", byName.get("hello")?.source === "project", byName.get("hello"));
  check("9.5 the project command keeps its argument hint", byName.get("hello")?.argumentHint === "<name>");
  check("9.5 a project skill is listed", byName.get("demo")?.kind === "skill", byName.get("demo"));
  check(
    "9.5 a user command is listed",
    (byName.get("mine") ?? byName.get("user:mine"))?.source === "user",
    byName.get("mine") ?? byName.get("user:mine"),
  );
  check(
    "9.5 a user skill is listed",
    (byName.get("userskill") ?? byName.get("user:userskill"))?.source === "user",
    byName.get("userskill") ?? byName.get("user:userskill"),
  );

  providerStatus("2.1.100");
  await new Promise((done) => setTimeout(done, 1500));
  check("9.4 the same version does not probe again", requests.length === 0 && claudeSaved()?.cliVersion === "2.1.100");

  providerStatus("2.1.101");
  const refreshed = await until("the refresh after a version change", () => {
    const saved = claudeSaved();
    return saved?.cliVersion === "2.1.101" ? saved : null;
  });
  check("9.4 a provider version change refreshes the saved list", refreshed.commands.length > 0, refreshed.cliVersion);

  const dropped = "doctor";
  const trimmed: { engines: { engine: string; commands: { name: string }[] }[] } = JSON.parse(
    readFileSync(catalogPath, "utf8"),
  );
  assert.ok(Array.isArray(trimmed.engines), "The saved file has engines.");
  for (const item of trimmed.engines) {
    if (item.engine !== "claude") continue;
    assert.ok(
      item.commands.some((command) => command.name === dropped),
      "Needs a doctor command.",
    );
    item.commands = item.commands.filter((command) => command.name !== dropped);
  }
  writeFileSync(catalogPath, JSON.stringify(trimmed));
  const restarted = new SlashCommands({
    catalog: new SlashCommandCatalog(catalogPath),
    agent: (id) => (id === agent.id ? agent : undefined),
    hasTask: () => false,
    chatOfThread: () => null,
    clientOfAgent: () => client,
    claudeClient: () => client,
    changed: () => undefined,
    fork: (work) => {
      void runCauseEffect(work);
    },
  });
  const before = await runCauseEffect(restarted.list({ agentId: agent.id }));
  check("9.8 setup: the trimmed saved list lacks the command", !names(before.commands).includes(dropped));
  restarted.providerStatus(status("2.1.102"));
  await until("the new version in the saved file", () => claudeSaved()?.cliVersion === "2.1.102");
  const after = await runCauseEffect(restarted.list({ agentId: agent.id }));
  check("9.8 a command from the engine appears with no code change", names(after.commands).includes(dropped));

  const text = JSON.stringify(savedFile());
  check("9.4 the saved list survives in the file", text.includes('"claude"'));

  const notes: { method: string; params: unknown }[] = [];
  client.on("notification", (note: { method: string; params: unknown }) => notes.push(note));
  const thread = await runCauseEffect(
    client.request("thread/start", { cwd: workspace, persistSession: false }, (value) =>
      Schema.decodeUnknownSync(Schema.Struct({ thread: Schema.Struct({ id: Schema.String }) }))(value),
    ),
  );
  const threadId = thread.thread.id;
  await runCauseEffect(
    client.request("turn/start", { threadId, input: [{ type: "text", text: "/cost" }] }, (value) => value),
  );
  const done = await until("the local command turn", () => notes.find((note) => note.method === "turn/completed"));
  const texts = notes.filter((note) => note.method === "item/completed").map((note) => JSON.stringify(note.params));
  check("9.6 a local command sends no model request", requests.length === 0, requests);
  check(
    "9.6 the local command output is shown in the chat",
    texts.some((entry) => entry.includes("agentMessage")),
    {
      texts: texts.map((entry) => entry.slice(0, 200)),
      done: JSON.stringify(done.params).slice(0, 200),
    },
  );
  passed = true;
} catch (error) {
  checks.push({
    name: "error",
    passed: false,
    detail: error instanceof Error ? (error.stack ?? error.message) : String(error),
  });
} finally {
  await runCauseEffect(client.stop()).catch(() => undefined);
  server.close();
  rmSync(root, { recursive: true, force: true });
  const report = { passed, checks };
  writeFileSync(join(OUT, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!passed) process.exitCode = 1;
}
