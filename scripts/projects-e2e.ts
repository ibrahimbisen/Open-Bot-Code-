import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { AGENT_PROVIDERS, type ProjectActivity, type ProjectChat, type ProjectDetail } from "@codebot/contracts/ipc";
import { Effect } from "effect";
import type { AgentBrowserHost } from "../src/backend/agent/turn-lifecycle";
import type { ProjectServiceEvent } from "../src/backend/projects/project-operations";

const OUT = resolve(import.meta.dirname, "../.codebot-build/projects-e2e");
const root = await mkdtemp(join(tmpdir(), "codebot-projects-"));
const userData = join(root, "user-data");
const home = join(root, "home");
const repos = join(root, "repos");
const bin = join(root, "bin");
const fakeLog = join(root, "codex.jsonl");
const releases = join(root, "releases");
const READER = "e2e-reader";

process.env.HOME = home;
process.env.USERPROFILE = home;
process.env.CODEX_HOME = join(home, ".codex");
mkdirSync(home, { recursive: true });
mkdirSync(repos, { recursive: true });
mkdirSync(bin, { recursive: true });
mkdirSync(releases, { recursive: true });

const FAKE_CODEX = `
const { appendFileSync, existsSync } = require("node:fs");
const { join } = require("node:path");
if (process.argv.includes("--version")) {
  process.stdout.write("codex-cli 0.160.1\\n");
  process.exit(0);
}
const LOG = ${JSON.stringify(fakeLog)};
const RELEASES = ${JSON.stringify(releases)};
const config = { config: { mcp_servers: {} }, layers: [{ name: { type: "user", file: "/fake/.codex/config.toml", profile: null }, version: "1", config: { mcp_servers: {} } }] };
let buffer = "";
let threads = 0;
let turns = 0;
const asking = new Map();
process.stdout.on("error", (error) => {
  if (error.code === "EPIPE") process.exit(0);
  throw error;
});
const log = (entry) => appendFileSync(LOG, JSON.stringify(entry) + "\\n");
const write = (message) => process.stdout.write(JSON.stringify(message) + "\\n");
const finish = (threadId, turnId, text) => {
  const item = { type: "agentMessage", id: "message-" + turnId, text: "Done: " + text.slice(0, 40), phase: "final_answer" };
  write({ method: "item/completed", params: { threadId, turnId, item } });
  write({ method: "turn/completed", params: { threadId, turn: { id: turnId, status: "completed" } } });
};
const fail = (threadId, turnId) => {
  write({ method: "error", params: { threadId, turnId, willRetry: false, error: { message: "The fake provider failed on purpose." } } });
  write({ method: "turn/completed", params: { threadId, turn: { id: turnId, status: "failed", error: { message: "The fake provider failed on purpose." } } } });
};
const answer = (message) => {
  const params = message.params || {};
  switch (message.method) {
    case "initialize": return write({ id: message.id, result: {} });
    case "account/read": return write({ id: message.id, result: { account: { type: "chatgpt", email: "codex@example.com" } } });
    case "account/rateLimits/read": return write({ id: message.id, result: { rateLimits: { limitId: "codex", primary: null, secondary: null }, rateLimitsByLimitId: null } });
    case "model/list": return write({ id: message.id, result: { data: [{ model: "gpt-6-luna", displayName: "GPT-6 Luna" }, { model: "gpt-6-sol", displayName: "GPT-6 Sol" }] } });
    case "plugin/list": return write({ id: message.id, result: { marketplaces: [] } });
    case "config/read": return write({ id: message.id, result: config });
    case "config/batchWrite": return write({ id: message.id, result: {} });
    case "thread/start":
      log({ method: "thread/start", pid: process.pid, params });
      return write({ id: message.id, result: { thread: { id: "thread-" + process.pid + "-" + (++threads), turns: [] } } });
    case "thread/resume":
      log({ method: "thread/resume", pid: process.pid, params });
      return write({ id: message.id, result: { thread: { id: params.threadId, turns: [] } } });
    case "thread/unsubscribe": return write({ id: message.id, result: { status: "Unsubscribed" } });
    case "thread/name/set": return write({ id: message.id, result: {} });
    case "thread/turns/list":
    case "thread/items/list": return write({ id: message.id, result: { data: [], nextCursor: null } });
    case "thread/read": return write({ id: message.id, result: { thread: { id: params.threadId, turns: [] } } });
    case "turn/start": {
      const turnId = "turn-" + process.pid + "-" + (++turns);
      const text = (params.input || []).map((item) => item.text || "").join("\\n");
      log({ method: "turn/start", pid: process.pid, turnId, text, params });
      write({ id: message.id, result: { turn: { id: turnId, status: "inProgress", items: [] } } });
      write({ method: "turn/started", params: { threadId: params.threadId, turn: { id: turnId } } });
      const hold = /\\[hold:([a-z0-9-]+)\\]/.exec(text);
      const wantsFailure = text.includes("[fail]");
      const asks = text.includes("[ask]");
      const end = () => (wantsFailure ? fail(params.threadId, turnId) : finish(params.threadId, turnId, text));
      if (asks) {
        const id = "approval-" + turnId;
        asking.set(id, end);
        return write({ id, method: "item/commandExecution/requestApproval", params: { threadId: params.threadId, turnId, itemId: "item-" + turnId, command: "echo hi", cwd: params.cwd, reason: "Needs a check." } });
      }
      if (!hold) return setTimeout(end, 20);
      const poll = setInterval(() => {
        if (!existsSync(join(RELEASES, hold[1]))) return;
        clearInterval(poll);
        end();
      }, 20);
      return;
    }
    case "turn/interrupt": {
      write({ id: message.id, result: {} });
      return write({ method: "turn/completed", params: { threadId: params.threadId, turn: { id: params.turnId, status: "interrupted" } } });
    }
    default:
      return write({ id: message.id, error: { code: -32601, message: "Method not found: " + message.method } });
  }
};
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  let newline = buffer.indexOf("\\n");
  while (newline >= 0) {
    const line = buffer.slice(0, newline);
    buffer = buffer.slice(newline + 1);
    if (line) {
      const message = JSON.parse(line);
      if (message.method && message.id !== undefined) answer(message);
      else if (message.id !== undefined && asking.has(message.id)) {
        const end = asking.get(message.id);
        asking.delete(message.id);
        end();
      }
    }
    newline = buffer.indexOf("\\n");
  }
});
`;

async function installFakeCodex(): Promise<string> {
  await writeFile(join(bin, "stand-in.cjs"), FAKE_CODEX);
  if (process.platform === "win32") {
    const wrapper = join(bin, "codex.cmd");
    await writeFile(wrapper, `@"${process.execPath}" "%~dp0stand-in.cjs" %*\r\n`);
    return wrapper;
  }
  const wrapper = join(bin, "codex");
  await writeFile(wrapper, `#!/bin/sh\nexec "${process.execPath}" "${join(bin, "stand-in.cjs")}" "$@"\n`, {
    mode: 0o755,
  });
  return wrapper;
}

process.env.CODEBOT_CODEX_PATH = await installFakeCodex();

const { AgentService } = await import("../src/backend/agent-service");
const { AgentStore } = await import("../src/backend/agent-store");
const { runCauseEffect } = await import("../src/backend/effect-boundary");
const { MailboxStore } = await import("../src/backend/mailbox-store");
const { CodeBotDatabase } = await import("../src/backend/codebot-database");
const { SidebarLayoutStore } = await import("../src/backend/sidebar-layout-store");
const { ProjectService } = await import("../src/backend/projects/project-service");

interface Check {
  name: string;
  passed: boolean;
  detail?: string;
}

const report: { passed: boolean; checks: Check[]; unverified: string[]; error?: string } = {
  passed: false,
  checks: [],
  unverified: [
    "A real provider. A stand-in Codex app-server answers each turn.",
    "The desktop screens. This check drives the engine and the project service only.",
  ],
};

function pass(name: string, condition: boolean, detail?: unknown) {
  const text = detail === undefined ? undefined : typeof detail === "string" ? detail : JSON.stringify(detail);
  report.checks.push({ name, passed: condition, ...(text === undefined ? {} : { detail: text.slice(0, 600) }) });
  assert.ok(condition, text ? `${name}: ${text}` : name);
}

async function waitFor<T>(label: string, read: () => T | null | undefined | false, timeoutMs = 30_000): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = read();
    if (value) return value;
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${label}.`);
    await new Promise((done) => setTimeout(done, 25));
  }
}

interface LogEntry {
  method: string;
  pid: number;
  turnId?: string;
  text?: string;
  params: LogParams;
}

interface LogParams {
  cwd?: string;
  model?: string;
  effort?: string;
  threadId?: string;
  runtimeWorkspaceRoots?: string[];
  developerInstructions?: string;
  sandbox?: string;
  sandboxPolicy?: { type: string; writableRoots?: string[] };
}

function fakeEntries(): LogEntry[] {
  if (!existsSync(fakeLog)) return [];
  return readFileSync(fakeLog, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

const unused = () => Effect.die(new Error("Not used by this check."));
const agentBrowser: AgentBrowserHost = {
  listTabs: () => [],
  toolCanUseTab: () => false,
  beginTakeover: unused,
  endTakeover: () => {},
  userControlTabFor: () => null,
  awaitUserControlRelease: unused,
  resolveUploadTarget: unused,
  handleDynamicTool: unused,
  onChanged: () => () => {},
  onControlChanged: () => () => {},
  onDocumentChanged: () => () => {},
  clearControls: () => {},
  endControl: () => {},
  close: () => Effect.void,
  clearAgentSession: () => Effect.void,
  shareTab: () => undefined,
  unshareThread: () => undefined,
  agentTab: () => null,
};

async function makeRepo(name: string): Promise<string> {
  const path = join(repos, name);
  mkdirSync(path, { recursive: true });
  writeFileSync(join(path, "README.md"), `# ${name}\n`);
  return realpath(path);
}

const database = new CodeBotDatabase(userData);
const store = new AgentStore(userData, home, database);
const mailbox = new MailboxStore(userData, store.sharedRoot, store.database);
const sidebar = new SidebarLayoutStore(join(userData, "sidebar-layout.json"));
const agents = new AgentService({
  store,
  mailbox,
  browser: agentBrowser,
  sidebarLayout: sidebar,
  preferredProvider: "codex",
  offProviders: AGENT_PROVIDERS.filter((provider) => provider !== "codex"),
  timezone: () => "UTC",
});
const events: ProjectServiceEvent[] = [];
const sender = { id: READER, name: "Reader" };

let projects!: InstanceType<typeof ProjectService>;
let protectedFolder = "";

const run = <A>(effect: Effect.Effect<A, { readonly cause: unknown }>) => runCauseEffect(effect);

function nth<T>(list: readonly T[], index: number): T {
  const value = list[index];
  assert.ok(value !== undefined, `No item at ${index}.`);
  return value;
}

function release(tag: string) {
  writeFileSync(join(releases, tag), "go");
}

function chatOf(agentId: string, taskId: string): ProjectChat {
  return projects.getChat({ agentId, taskId });
}

function activityOf(projectId: string): ProjectActivity {
  const found = projects.listActivity().find((activity) => activity.projectId === projectId);
  assert.ok(found, `No activity for ${projectId}.`);
  return found;
}

async function startChat(detail: ProjectDetail, agentIndex: number, text: string) {
  const agent = detail.agents[agentIndex];
  assert.ok(agent, "The project has no such agent.");
  return run(projects.startChat({ projectId: detail.project.id, agentId: agent.id, text }, sender));
}

async function until(label: string, ready: () => boolean) {
  await waitFor(label, () => ready());
}

try {
  protectedFolder = await makeRepo("protected");
  await run(sidebar.initialize());
  await run(agents.initialize());
  projects = new ProjectService({
    database,
    agents,
    readerId: () => READER,
    isProtectedFolder: async (path) => path === protectedFolder,
  });
  projects.subscribe((event) => events.push(event));
  await run(projects.start());

  const repoA = await makeRepo("shop");
  const docs = await makeRepo("shop-docs");

  const created = await run(
    projects.create(
      {
        name: "Web shop",
        mainFolder: repoA,
        additionalFolders: [docs],
        instructions: "Use TypeScript. Run the tests before you report.",
        replyRule: "Reply in two sentences.",
        agents: [
          { name: "Ada", role: "Frontend", instructions: "You own src/web." },
          { name: "Linus", role: "Backend" },
        ],
      },
      "owner-1",
    ),
  );
  pass("A project is created with a main folder, a second folder and two agents", created.agents.length === 2);
  pass(
    "The detail lists both folders, the main one first, and each exists",
    created.folders.length === 2 &&
      created.folders[0]?.main === true &&
      created.folders[0].path === repoA &&
      created.folders.every((folder) => folder.found),
    created.folders,
  );
  const ada = created.agents[0];
  const linus = created.agents[1];
  assert.ok(ada && linus);
  pass(
    "The agents keep their role and instructions",
    ada.role === "Frontend" && ada.instructions === "You own src/web.",
  );
  const summaries = agents.listAgents();
  const adaSummary = summaries.find((agent) => agent.id === ada.id);
  pass(
    "Each project agent is an agent record with the project id and the Normal access level",
    adaSummary?.projectId === created.project.id && adaSummary.access === "workspace",
    adaSummary?.projectId,
  );
  pass(
    "The project list holds the project",
    projects.list().some((project) => project.id === created.project.id),
  );

  const first = await startChat(created, 0, "Add a cart page to the shop");
  const second = await startChat(created, 0, "Fix the checkout total");
  const third = await startChat(created, 1, "Write the orders API");
  await until("the three chats end", () =>
    [first, second, third].every((chat) => chatOf(chat.agentId, chat.taskId).state === "idle"),
  );

  const turns = fakeEntries().filter((entry) => entry.method === "turn/start");
  const threadStarts = fakeEntries().filter((entry) => entry.method === "thread/start");
  pass(
    "A project agent runs every turn in the main folder of the project",
    turns.length >= 3 && turns.every((entry) => resolve(String(entry.params.cwd)) === resolve(repoA)),
    turns.map((entry) => entry.params.cwd),
  );
  const prompt = JSON.stringify(threadStarts.map((entry) => entry.params));
  pass(
    "The prompt carries the project instructions, the reply rule and the folders",
    prompt.includes("Run the tests before you report") &&
      prompt.includes("Reply in two sentences") &&
      prompt.includes(docs.replaceAll("\\", "\\\\")) &&
      !prompt.includes("Your working directory, for your own persistent files"),
  );
  const roots = JSON.stringify(turns.map((entry) => entry.params.runtimeWorkspaceRoots));
  pass(
    "The write roots of the provider include the main folder and the second folder",
    roots.includes(repoA.replaceAll("\\", "\\\\")) && roots.includes(docs.replaceAll("\\", "\\\\")),
    roots,
  );

  const listed = projects.listChats({ projectId: created.project.id });
  pass(
    "The chat list shows all three chats, newest first, with a title from the first message",
    listed.chats.length === 3 &&
      listed.chats.every((chat, index, all) => index === 0 || (all[index - 1]?.updatedAt ?? "") >= chat.updatedAt) &&
      [...listed.chats.map((chat) => chat.title)].sort().join("|") ===
        ["Add a cart page to the shop", "Fix the checkout total", "Write the orders API"].join("|"),
    listed.chats.map((chat) => `${chat.title} ${chat.updatedAt}`),
  );
  const paged = projects.listChats({ projectId: created.project.id, limit: 2 });
  const rest = projects.listChats({ projectId: created.project.id, limit: 2, cursor: paged.nextCursor ?? "" });
  pass(
    "The list pages by cursor without a repeat",
    paged.chats.length === 2 && paged.nextCursor !== null && rest.chats.length === 1 && rest.nextCursor === null,
  );

  const renamed = "Cart page";
  agents.renameTask({ agentId: first.agentId, taskId: first.taskId }, renamed);
  pass(
    "A chat can be renamed",
    chatOf(first.agentId, first.taskId).title === renamed &&
      projects.listChats({ projectId: created.project.id }).chats.some((chat) => chat.title === renamed),
  );
  const byTitle = projects.searchChats({ query: "cart", projectId: created.project.id });
  pass(
    "Search finds a chat by its title",
    byTitle.matches.some((match) => match.kind === "title" && match.chat.taskId === first.taskId),
    byTitle.matches.map((match) => `${match.kind}:${match.excerpt}`),
  );
  const byMessage = projects.searchChats({ query: "the orders api", projectId: created.project.id });
  pass(
    "Search finds a chat by the text of a message and returns an excerpt",
    byMessage.matches.some((match) => match.kind === "message" && match.chat.taskId === third.taskId && match.excerpt),
    byMessage.matches.map((match) => `${match.kind}:${match.excerpt}`),
  );
  const noMatch = projects.searchChats({ query: "zebra-not-there" });
  pass("Search finds nothing for an unknown word", noMatch.matches.length === 0 && noMatch.nextCursor === null);

  await run(projects.setChatArchived({ agentId: second.agentId, taskId: second.taskId, archived: true }));
  const afterArchive = projects.listChats({ projectId: created.project.id });
  const onlyArchived = projects.listChats({ projectId: created.project.id, archived: "only" });
  const withArchived = projects.listChats({ projectId: created.project.id, archived: "include" });
  pass(
    "An archived chat leaves the list, shows in the archive and stays closed",
    afterArchive.chats.length === 2 &&
      onlyArchived.chats.length === 1 &&
      onlyArchived.chats[0]?.archived === true &&
      withArchived.chats.length === 3 &&
      agents.listTasks(second.agentId).tasks.find((task) => task.id === second.taskId)?.state === "closed",
  );
  await run(projects.setChatArchived({ agentId: second.agentId, taskId: second.taskId, archived: false }));
  pass(
    "A restored chat is open and in the list again",
    projects.listChats({ projectId: created.project.id }).chats.length === 3 &&
      agents.listTasks(second.agentId).tasks.find((task) => task.id === second.taskId)?.state === "idle",
  );
  const pinned = projects.setChatPinned({ agentId: third.agentId, taskId: third.taskId, pinned: true });
  pass(
    "A pinned chat comes first",
    pinned.pinned && projects.listChats({ projectId: created.project.id }).chats[0]?.taskId === third.taskId,
  );
  projects.setChatPinned({ agentId: third.agentId, taskId: third.taskId, pinned: false });

  const deletedThread = second.threadId;
  await run(agents.deleteTask({ agentId: second.agentId, taskId: second.taskId }));
  await until(
    "the project forgets the deleted chat",
    () => !projects.listChats({ projectId: created.project.id }).chats.some((chat) => chat.taskId === second.taskId),
  );
  const rowCount = database.connection
    .prepare("SELECT COUNT(*) AS count FROM cb_project_chats WHERE thread_id = ?")
    .get(deletedThread)?.count;
  pass(
    "A deleted chat is gone from the list and from the project tables",
    rowCount === 0 &&
      events.some((event) => event.type === "chats-changed" && event.removedTaskIds.includes(second.taskId)),
  );

  const five: ProjectDetail[] = [];
  for (let index = 1; index <= 5; index += 1) {
    five.push(
      await run(
        projects.create(
          {
            name: `Project ${index}`,
            mainFolder: await makeRepo(`p${index}`),
            agents: [{ name: `Agent ${index}`, role: "" }],
          },
          null,
        ),
      ),
    );
  }
  const long: ProjectChat[] = [];
  for (const [index, detail] of five.entries())
    long.push(await startChat(detail, 0, `Work ${index + 1} [hold:p${index + 1}]`));
  await until(
    "five turns run at once",
    () =>
      fakeEntries().filter((entry) => entry.method === "turn/start" && entry.text?.includes("[hold:p")).length === 5,
  );
  const allWorking = five.every((detail) => {
    const activity = activityOf(detail.project.id);
    return activity.state === "working" && activity.working === 1;
  });
  pass(
    "Five projects run a chat each at the same time and each shows the working state",
    allWorking && long.every((chat) => chatOf(chat.agentId, chat.taskId).activity === "working"),
    five.map((detail) => activityOf(detail.project.id)),
  );

  const sameProject = await startChat(nth(five, 1), 0, "Quick question in the same project");
  await until(
    "the second chat of project 2 ends while the first still runs",
    () =>
      chatOf(sameProject.agentId, sameProject.taskId).state === "idle" &&
      chatOf(nth(long, 1).agentId, nth(long, 1).taskId).state === "running",
  );
  pass("A chat keeps running while the user works in another chat of the project", true);

  release("p1");
  const one = nth(long, 0);
  await until("project 1 is done", () => activityOf(nth(five, 0).project.id).state === "done");
  pass(
    "A finished chat that the user has not read shows done and counts one unread message",
    chatOf(one.agentId, one.taskId).activity === "done" &&
      chatOf(one.agentId, one.taskId).unreadCount > 0 &&
      activityOf(nth(five, 1).project.id).state === "working",
  );
  const lastMessage = agents.readTask(one.agentId, one.taskId).messages.at(-1);
  assert.ok(lastMessage);
  agents.markTaskRead({ agentId: one.agentId, taskId: one.taskId, throughMessageId: lastMessage.id }, READER);
  pass(
    "Reading the chat clears the done state",
    activityOf(nth(five, 0).project.id).state === "idle" &&
      chatOf(one.agentId, one.taskId).activity === "idle" &&
      chatOf(one.agentId, one.taskId).unreadCount === 0,
  );

  release("p3");
  const failing = await startChat(nth(five, 2), 0, "Break on purpose [fail]");
  await until("project 3 shows an error", () => activityOf(nth(five, 2).project.id).state === "error");
  pass(
    "A failed turn shows the error state with the message",
    chatOf(failing.agentId, failing.taskId).activity === "error" &&
      activityOf(nth(five, 2).project.id).error === 1 &&
      (chatOf(failing.agentId, failing.taskId).error ?? "").length > 0,
    chatOf(failing.agentId, failing.taskId).error,
  );

  const asking = await startChat(nth(five, 3), 0, "Run a command [ask]");
  await until("project 4 needs input", () => activityOf(nth(five, 3).project.id).state === "needs-input");
  const approval = agents.getRuntimeSnapshot().pendingApprovals[0];
  assert.ok(approval);
  pass(
    "A chat that waits for an approval shows needs-input, which outranks the other states",
    chatOf(asking.agentId, asking.taskId).activity === "needs-input",
  );
  await run(agents.respondToApproval({ requestId: approval.requestId, decision: "accept" }));
  await until("the asking chat is done", () => chatOf(asking.agentId, asking.taskId).activity === "done");
  pass(
    "After the answer the chat finishes and shows done, and the project shows working while its other chat runs",
    activityOf(nth(five, 3).project.id).state === "working",
  );

  release("p2");
  release("p4");
  release("p5");
  await until("all projects finish", () => five.every((detail) => activityOf(detail.project.id).working === 0));
  pass(
    "Every project reaches its final state: done, done, error, done, done",
    five.map((detail) => activityOf(detail.project.id).state).join(",") === "idle,done,error,done,done",
    five.map((detail) => activityOf(detail.project.id).state),
  );
  const activityEvents = events.filter((event) => event.type === "activity-changed");
  pass(
    "The engine sends an activity event for each change",
    activityEvents.length >= 8 &&
      activityEvents.some((event) => event.activity.filter((entry) => entry.state === "working").length === 5),
    activityEvents.length,
  );

  report.passed = true;
} catch (error) {
  report.error = error instanceof Error ? (error.stack ?? error.message) : String(error);
  process.exitCode = 1;
} finally {
  projects?.stop();
  await runCauseEffect(agents.stop()).catch(() => {});
  database.close();
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  await rm(root, { recursive: true, force: true }).catch(() => {});
  process.stdout.write(`${report.passed ? "PASS" : "FAIL"} ${join(OUT, "report.json")}\n`);
  if (report.error) process.stdout.write(`${report.error}\n`);
}
