import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  AGENT_PROVIDERS,
  isProjectActivityList,
  isProjectChat,
  isProjectChatSearchPage,
  isProjectChatsPage,
  isProjectDetail,
  isProjectFolderChange,
  isProjectSummary,
  isProjectSummaryList,
  type ProjectActivity,
  type ProjectChat,
  type ProjectDetail,
} from "@codebot/contracts/ipc";
import { TEAM_API_ROUTES } from "@codebot/contracts/team-api-routes";
import {
  TEAM_APP_VERSION_HEADER,
  TEAM_CAPABILITIES_HEADER,
  TEAM_PROTOCOL_VERSION_HEADER,
} from "@codebot/contracts/team-protocol";
import { encodeTeamCapabilitiesV10, teamCapabilitiesForProtocol } from "@codebot/contracts/team-protocol/current";
import {
  PROJECTS_V1_CAPABILITY,
  PROJECTS_V1_CODECS,
  PROJECTS_V1_ROUTES,
  type ProjectsWireEvent,
  projectsWireEvent,
} from "@codebot/contracts/team-protocol/projects-v1";
import { TEAM_PROTOCOL_V1_WEBSOCKET } from "@codebot/contracts/team-protocol/v1";
import { TEAM_ABSENT_CAPABILITIES_HEADER, TEAM_PROTOCOL_V10 } from "@codebot/contracts/team-protocol/v10";
import { sourceText } from "@codebot/i18n/source";
import { plugin } from "bun";
import { Effect } from "effect";
import type { AgentBrowserHost } from "../src/backend/agent/turn-lifecycle";
import type { ProjectServiceEvent } from "../src/backend/projects/project-operations";
import type { TeamApiBrowser } from "../src/main/team-api/dependencies";

plugin({
  name: "projects-e2e-electron-boundary",
  setup(build) {
    class Inert {}
    build.module("electron", () => ({
      loader: "object",
      exports: {
        app: { getPath: () => tmpdir(), getVersion: () => "0.0.0-e2e", isPackaged: false, on: () => undefined },
        BrowserWindow: Object.assign(class extends Inert {}, { getAllWindows: () => [] }),
        MessageChannelMain: class extends Inert {},
        Notification: Object.assign(class extends Inert {}, { isSupported: () => false }),
        clipboard: {},
        dialog: {},
        ipcMain: { handle: () => undefined, removeHandler: () => undefined, on: () => undefined },
        nativeImage: {},
        net: {},
        powerMonitor: { on: () => undefined },
        safeStorage: { isEncryptionAvailable: () => false },
        screen: {},
        session: {},
        shell: { openExternal: async () => undefined },
        systemPreferences: {},
        webContents: { getAllWebContents: () => [] },
      },
    }));
  },
});

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
    case "thread/compact/start":
      log({ method: "thread/compact/start", pid: process.pid, params });
      write({ id: message.id, result: {} });
      return setTimeout(() => {
        const turnId = "compact-" + Date.now();
        write({ method: "turn/started", params: { threadId: params.threadId, turn: { id: turnId, status: "inProgress" } } });
        write({ method: "item/completed", params: { threadId: params.threadId, turnId, item: { type: "contextCompaction", id: "item-" + turnId } } });
        write({ method: "turn/completed", params: { threadId: params.threadId, turn: { id: turnId, status: "completed" } } });
      }, 30);
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
const { TeamApiServer } = await import("../src/main/team-api-server");
const { AGENT_ACCESS_FILE, AgentAccessStore } = await import("../src/main/agent-access-store");
const { TeamStore } = await import("../src/main/team-store");

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

  const modelProject = await run(
    projects.create(
      {
        name: "Model switch",
        mainFolder: await makeRepo("models"),
        agents: [{ name: "Switcher", role: "Any" }],
      },
      null,
    ),
  );
  const switcher = nth(modelProject.agents, 0);
  const marked = (marker: string) =>
    fakeEntries().filter((entry) => entry.method === "turn/start" && entry.text?.includes(marker));
  const defaultChat = await startChat(modelProject, 0, "Default model [m-default]");
  await until("the default chat ends", () => chatOf(defaultChat.agentId, defaultChat.taskId).state === "idle");
  const chosen = {
    provider: switcher.runtime.provider,
    model: "gpt-6-sol",
    reasoningEffort: switcher.runtime.reasoningEffort,
  };
  const chosenChat = await run(
    projects.startChat(
      { projectId: modelProject.project.id, agentId: switcher.id, text: "Chosen model [m-chosen]", runtime: chosen },
      sender,
    ),
  );
  await until("the chosen chat ends", () => chatOf(chosenChat.agentId, chosenChat.taskId).state === "idle");
  pass(
    "A chat started with a model uses it, and a chat without one uses the model of its agent",
    marked("[m-default]")[0]?.params.model === switcher.runtime.model &&
      marked("[m-chosen]")[0]?.params.model === "gpt-6-sol" &&
      chatOf(chosenChat.agentId, chosenChat.taskId).runtime?.model === "gpt-6-sol" &&
      chatOf(defaultChat.agentId, defaultChat.taskId).runtime === null,
    { default: marked("[m-default]")[0]?.params.model, chosen: marked("[m-chosen]")[0]?.params.model },
  );
  const local = { ...chosen, model: "local-llama-3" };
  await run(projects.setChatRuntime({ agentId: defaultChat.agentId, taskId: defaultChat.taskId, runtime: local }));
  await run(
    agents.sendMessage(
      { agentId: defaultChat.agentId, taskId: defaultChat.taskId, text: "Second turn [m-local]" },
      sender,
    ),
  );
  await until("the second turn runs", () => marked("[m-local]").length === 1);
  pass(
    "The model of a chat can change later, a local model id passes through, and the next turn uses it",
    marked("[m-local]")[0]?.params.model === "local-llama-3" &&
      marked("[m-local]")[0]?.params.threadId === marked("[m-default]")[0]?.params.threadId,
    marked("[m-local]")[0]?.params.model,
  );
  await until("the second turn ends", () => chatOf(defaultChat.agentId, defaultChat.taskId).state === "idle");
  await run(projects.setChatRuntime({ agentId: defaultChat.agentId, taskId: defaultChat.taskId, runtime: null }));
  await run(
    agents.sendMessage(
      { agentId: defaultChat.agentId, taskId: defaultChat.taskId, text: "Third turn [m-back]" },
      sender,
    ),
  );
  await until("the third turn runs", () => marked("[m-back]").length === 1);
  pass(
    "Clearing the model of a chat goes back to the model of the agent",
    marked("[m-back]")[0]?.params.model === switcher.runtime.model,
  );
  const otherProvider = AGENT_PROVIDERS.find((provider) => provider !== switcher.runtime.provider);
  assert.ok(otherProvider);
  const refused = await Effect.runPromise(
    Effect.result(
      projects.setChatRuntime({
        agentId: defaultChat.agentId,
        taskId: defaultChat.taskId,
        runtime: { ...chosen, provider: otherProvider },
      }),
    ),
  );
  pass(
    "A model of another provider is refused with a clear message",
    refused._tag === "Failure" &&
      refused.failure.cause instanceof Error &&
      refused.failure.cause.message === sourceText("error.project.runtimeProviderMismatch"),
    refused._tag === "Failure" ? String(refused.failure.cause) : "accepted",
  );

  const compactChat = await startChat(modelProject, 0, "Long work [c-start]");
  await until("the chat to compact ends", () => chatOf(compactChat.agentId, compactChat.taskId).state === "idle");
  await run(agents.compactTaskContext({ agentId: compactChat.agentId, taskId: compactChat.taskId }));
  const compactStart = await waitFor("the compact request", () =>
    fakeEntries().find((entry) => entry.method === "thread/compact/start"),
  );
  pass(
    "Context compaction of a project chat runs on the provider thread of that chat",
    compactStart.params.threadId === marked("[c-start]")[0]?.params.threadId,
    compactStart.params,
  );
  await until("the compaction cycle finishes", () => chatOf(compactChat.agentId, compactChat.taskId).state === "idle");
  await run(
    agents.sendMessage(
      { agentId: compactChat.agentId, taskId: compactChat.taskId, text: "After compaction [c-after]" },
      sender,
    ),
  );
  await until("the turn after compaction runs", () => marked("[c-after]").length === 1);
  await until("the turn after compaction ends", () => chatOf(compactChat.agentId, compactChat.taskId).state === "idle");
  pass(
    "A project chat survives the full compaction cycle and keeps its provider thread",
    marked("[c-after]")[0]?.params.threadId === marked("[c-start]")[0]?.params.threadId,
    marked("[c-after]")[0]?.params.threadId,
  );

  const parking = await run(
    projects.create(
      {
        name: "Many chats",
        mainFolder: await makeRepo("many"),
        agents: [{ name: "Counter", role: "Any" }],
      },
      null,
    ),
  );
  const crowd: ProjectChat[] = [];
  for (let index = 0; index < 50; index += 1) {
    const chat = await startChat(parking, 0, `Chat number ${index} [k-${index}]`);
    crowd.push(chat);
    await until(`chat ${index} ends`, () => chatOf(chat.agentId, chat.taskId).state === "idle");
  }
  const openCount = (agentId: string) =>
    agents.listTasks(agentId).tasks.filter((task) => task.state !== "closed").length;
  const counter = nth(parking.agents, 0);
  const fiftyFirst = await startChat(parking, 0, "The fifty-first chat [k-last]");
  await until("the fifty-first chat ends", () => chatOf(fiftyFirst.agentId, fiftyFirst.taskId).state === "idle");
  const oldest = nth(crowd, 0);
  const isOpen = (taskId: string) => agents.listTasks(counter.id).tasks.some((task) => task.id === taskId);
  const isParked = (taskId: string) =>
    JSON.stringify(agents.listArchivedTasks({ agentId: counter.id, before: null })).includes(taskId);
  const parkedView = projects.listChats({ projectId: parking.project.id, archived: "include", limit: 100 }).chats;
  pass(
    "The fifty-first chat opens, the oldest idle chat is parked, and the parked chat stays in the history",
    openCount(counter.id) === 50 &&
      !isOpen(oldest.taskId) &&
      isParked(oldest.taskId) &&
      parkedView.some((chat) => chat.taskId === oldest.taskId && !chat.archived) &&
      projects.listChats({ projectId: parking.project.id, limit: 100 }).chats.length === 51,
    {
      open: openCount(counter.id),
      parked: isParked(oldest.taskId),
      inView: parkedView.some((chat) => chat.taskId === oldest.taskId && !chat.archived),
      total: projects.listChats({ projectId: parking.project.id, limit: 100 }).chats.length,
      includeTotal: parkedView.length,
    },
  );
  await run(
    agents.sendMessage({ agentId: oldest.agentId, taskId: oldest.taskId, text: "Back again [k-again]" }, sender),
  );
  await until("the parked chat runs again", () =>
    fakeEntries().some((entry) => entry.method === "turn/start" && entry.text?.includes("[k-again]")),
  );
  await until("the parked chat ends", () => chatOf(oldest.agentId, oldest.taskId).state === "idle");
  pass(
    "A message in a parked chat opens it again and the open count stays at the limit",
    isOpen(oldest.taskId) && openCount(counter.id) === 50,
    { open: openCount(counter.id) },
  );

  const teamDir = join(root, "team");
  mkdirSync(teamDir, { recursive: true });
  const OWNER = { username: "owner-user", password: "owner-password-123" };
  const MEMBER = { username: "member-user", password: "member-password-123" };
  const team = new TeamStore(join(teamDir, "codebot-team-server-v2.json"));
  const access = new AgentAccessStore(join(teamDir, AGENT_ACCESS_FILE));
  await run(team.initialize());
  assert.equal(await run(access.load()), true, "The roles file did not load.");
  await run(team.configure("E2E Host", OWNER.username, OWNER.password));
  const stubBrowser: TeamApiBrowser = {
    listTabs: () => [],
    getControlState: () => ({ sessions: [] }),
    open: unused,
    activate: unused,
    navigate: unused,
    reload: unused,
    stop: unused,
    answerPermission: unused,
    takeUserControl: unused,
    startTeach: unused,
    stopTeach: () => [],
    releaseUserControl: () => {},
    releaseUserControlHeldBy: () => {},
    releaseUserControlRefused: () => {},
    close: unused,
    capturePreview: unused,
    setVisible: unused,
    getDisplayState: () => ({ tabs: [], activeTabId: null }),
    loadUrl: unused,
    isPrivate: () => false,
    startView: unused,
    dispatchViewInput: unused,
    copyViewSelection: unused,
    answerViewDialog: unused,
    importSignIn: unused,
    answerHttpSignIn: unused,
  };
  const server = new TeamApiServer({
    store: team,
    agents,
    mailbox,
    browser: stubBrowser,
    sidebarLayout: sidebar,
    appVersion: "0.0.0-e2e",
    hiddenAgents: agents,
    agentAccess: access,
    projects,
  });
  const port = await Effect.runPromise(server.start());
  try {
    const capabilityHeaders = (protocol: number, capabilities: readonly string[]): Record<string, string> => {
      if (protocol < TEAM_PROTOCOL_V10) return { [TEAM_CAPABILITIES_HEADER]: capabilities.join(",") };
      const lists = encodeTeamCapabilitiesV10(capabilities);
      return {
        [TEAM_CAPABILITIES_HEADER]: lists.capabilities.join(","),
        [TEAM_ABSENT_CAPABILITIES_HEADER]: lists.absent.join(","),
      };
    };
    const call = async (
      method: string,
      path: string,
      input: { token?: string; body?: unknown; capabilities?: readonly string[]; protocol?: number } = {},
    ): Promise<{ status: number; body: unknown }> => {
      const protocol = input.protocol ?? TEAM_PROTOCOL_V10;
      const headers: Record<string, string> = {
        Accept: "application/json",
        [TEAM_PROTOCOL_VERSION_HEADER]: String(protocol),
        [TEAM_APP_VERSION_HEADER]: "0.0.0-e2e",
        ...capabilityHeaders(protocol, input.capabilities ?? teamCapabilitiesForProtocol(protocol)),
      };
      if (input.body !== undefined) headers["Content-Type"] = "application/json";
      if (input.token) headers.Authorization = `Bearer ${input.token}`;
      const response = await fetch(`http://127.0.0.1:${port}${path}`, {
        method,
        headers,
        body: input.body === undefined ? null : JSON.stringify(input.body),
      });
      const text = await response.text();
      return { status: response.status, body: text ? JSON.parse(text) : null };
    };
    const login = async (credentials: { username: string; password: string }) => {
      const response = await call("POST", TEAM_API_ROUTES.auth.login, { body: credentials });
      assert.equal(response.status, 200, `Sign-in returned ${response.status}.`);
      const body = response.body;
      const token = typeof body === "object" && body !== null && "sessionToken" in body ? body.sessionToken : null;
      assert.equal(typeof token, "string");
      return String(token);
    };
    const ownerToken = await login(OWNER);
    const wire = async (
      path: string,
      token: string,
      input?: unknown,
      capabilities?: readonly string[],
    ): Promise<{ status: number; body: unknown }> => {
      const body = input === undefined ? {} : { input };
      const codec = PROJECTS_V1_CODECS.get(path);
      assert.ok(codec, `No projects-v1 codec for ${path}.`);
      codec.request(body);
      const response = await call("POST", path, {
        token,
        body,
        ...(capabilities ? { capabilities } : {}),
      });
      codec.response(response.status, response.body);
      return response;
    };
    const ok = async <T>(path: string, input: unknown, guard: (value: unknown) => value is T): Promise<T> => {
      const response = await wire(path, ownerToken, input);
      assert.equal(
        response.status,
        200,
        `${path} returned ${response.status}: ${JSON.stringify(response.body).slice(0, 300)}`,
      );
      assert.ok(guard(response.body), `${path} returned a body that the client decoder refuses.`);
      return response.body;
    };

    const member = await (async () => {
      const invite = await run(team.createInvite("member"));
      const joined = await call("POST", TEAM_API_ROUTES.join.server, {
        body: { inviteToken: invite.token, ...MEMBER },
      });
      assert.equal(joined.status, 201, `Join returned ${joined.status}.`);
      return login(MEMBER);
    })();

    const compatibility = await call("GET", TEAM_API_ROUTES.compatibility, { protocol: TEAM_PROTOCOL_V10 });
    const served = JSON.stringify(compatibility.body);
    pass(
      "The host reports the projects-v1 capability to a protocol 10 client",
      compatibility.status === 200 && served.includes(PROJECTS_V1_CAPABILITY),
      { status: compatibility.status, body: served.slice(0, 300) },
    );

    const refusedMember = await wire(PROJECTS_V1_ROUTES.list, member);
    const withoutCapability = await wire(
      PROJECTS_V1_ROUTES.list,
      ownerToken,
      undefined,
      teamCapabilitiesForProtocol(TEAM_PROTOCOL_V10).filter((capability) => capability !== PROJECTS_V1_CAPABILITY),
    );
    const viaGet = await call("GET", PROJECTS_V1_ROUTES.list, { token: ownerToken });
    pass(
      "A member gets 403, a client without the capability gets 400, and a GET gets 404",
      refusedMember.status === 403 &&
        withoutCapability.status === 400 &&
        JSON.stringify(withoutCapability.body).includes(sourceText("error.project.serverTooOld")) &&
        viaGet.status === 404,
      [refusedMember.status, withoutCapability.status, viaGet.status],
    );

    const remoteFolder = await makeRepo("remote-main");
    const remoteExtra = await makeRepo("remote-extra");
    const eventSocket = new WebSocket(`ws://127.0.0.1:${port}${TEAM_API_ROUTES.events}`, [
      TEAM_PROTOCOL_V1_WEBSOCKET,
      `codebot-token.${ownerToken}`,
    ]);
    await new Promise<void>((resolveOpen, reject) => {
      eventSocket.addEventListener("open", () => resolveOpen(), { once: true });
      eventSocket.addEventListener("error", () => reject(new Error("The event socket did not open.")), { once: true });
    });
    const wireEvents: ProjectsWireEvent[] = [];
    eventSocket.addEventListener("message", (message) => {
      const decoded = projectsWireEvent(JSON.parse(String(message.data)));
      if (decoded) wireEvents.push(decoded);
    });
    const scoped = new Promise<void>((resolveScope) => {
      eventSocket.addEventListener("message", function onScope(message) {
        if (JSON.parse(String(message.data))?.type !== "runtime-snapshot") return;
        eventSocket.removeEventListener("message", onScope);
        resolveScope();
      });
    });
    eventSocket.send(
      JSON.stringify({
        type: "agent-event-scope",
        includeConversations: false,
        capabilities: ["agent-runtime-snapshots", PROJECTS_V1_CAPABILITY],
      }),
    );
    await scoped;
    const createdRemote = await ok(
      PROJECTS_V1_ROUTES.create,
      { name: "Remote project", mainFolder: remoteFolder, agents: [{ name: "Rem", role: "Any" }] },
      isProjectDetail,
    );
    await until("the event socket gets a projects event", () =>
      wireEvents.some((event) => event.type === "projects-changed" && event.projectId === createdRemote.project.id),
    );
    const listedRemote = await ok(PROJECTS_V1_ROUTES.list, undefined, isProjectSummaryList);
    const gotRemote = await ok(PROJECTS_V1_ROUTES.get, createdRemote.project.id, isProjectDetail);
    pass(
      "Over the Team API a project is created, listed and read, and each body passes the client decoder",
      listedRemote.some((project) => project.id === createdRemote.project.id) &&
        gotRemote.folders[0]?.path === remoteFolder &&
        gotRemote.agents.length === 1,
      createdRemote.project.id,
    );
    const renamedRemote = await ok(
      PROJECTS_V1_ROUTES.update,
      { projectId: createdRemote.project.id, name: "Remote renamed" },
      isProjectDetail,
    );
    const addedFolder = await ok(
      PROJECTS_V1_ROUTES.addFolder,
      { projectId: createdRemote.project.id, path: remoteExtra },
      isProjectFolderChange,
    );
    const extraAgent = await ok(
      PROJECTS_V1_ROUTES.createAgent,
      { projectId: createdRemote.project.id, name: "Second", role: "Tests" },
      isProjectDetail,
    );
    pass(
      "Over the Team API a project is renamed, gets a second folder and a second agent",
      renamedRemote.project.name === "Remote renamed" &&
        addedFolder.outcome === "added" &&
        extraAgent.agents.length === 2,
      { outcome: addedFolder.outcome, agents: extraAgent.agents.length },
    );
    const remoteAgent = nth(extraAgent.agents, 0);
    const remoteChat = await ok(
      PROJECTS_V1_ROUTES.startChat,
      { projectId: createdRemote.project.id, agentId: remoteAgent.id, text: "Remote chat [t-remote]" },
      isProjectChat,
    );
    await until("the remote chat ends", () => chatOf(remoteChat.agentId, remoteChat.taskId).state === "idle");
    const remoteTurn = fakeEntries().find(
      (entry) => entry.method === "turn/start" && entry.text?.includes("[t-remote]"),
    );
    pass(
      "A chat started over the Team API runs in the main folder of the project",
      remoteTurn !== undefined && resolve(String(remoteTurn.params.cwd)) === resolve(remoteFolder),
      remoteTurn?.params.cwd,
    );
    const chatsPage = await ok(
      PROJECTS_V1_ROUTES.listChats,
      { projectId: createdRemote.project.id },
      isProjectChatsPage,
    );
    const searchPage = await ok(
      PROJECTS_V1_ROUTES.searchChats,
      { query: "remote chat", projectId: createdRemote.project.id },
      isProjectChatSearchPage,
    );
    const withRuntime = await ok(
      PROJECTS_V1_ROUTES.setChatRuntime,
      {
        agentId: remoteChat.agentId,
        taskId: remoteChat.taskId,
        runtime: { ...remoteAgent.runtime, model: "gpt-6-sol" },
      },
      isProjectChat,
    );
    const pinnedRemote = await ok(
      PROJECTS_V1_ROUTES.setChatPinned,
      { agentId: remoteChat.agentId, taskId: remoteChat.taskId, pinned: true },
      isProjectChat,
    );
    const archivedRemote = await ok(
      PROJECTS_V1_ROUTES.setChatArchived,
      { agentId: remoteChat.agentId, taskId: remoteChat.taskId, archived: true },
      isProjectChat,
    );
    const activityRemote = await ok(PROJECTS_V1_ROUTES.listActivity, undefined, isProjectActivityList);
    pass(
      "Over the Team API chats are listed, searched, given a model, pinned and archived, and the activity lists the project",
      chatsPage.chats.length === 1 &&
        searchPage.matches.length > 0 &&
        withRuntime.runtime?.model === "gpt-6-sol" &&
        pinnedRemote.pinned &&
        archivedRemote.archived &&
        activityRemote.some((entry) => entry.projectId === createdRemote.project.id),
    );
    const bad = await wire(PROJECTS_V1_ROUTES.get, ownerToken, "no-such-project");
    pass(
      "An unknown project answers 400 with the translated message",
      bad.status === 400 && JSON.stringify(bad.body).includes(sourceText("error.project.notFound")),
      bad.body,
    );
    await until(
      "the event socket gets chat and activity events",
      () =>
        wireEvents.some((event) => event.type === "project-chats-changed") &&
        wireEvents.some((event) => event.type === "project-activity-changed"),
    );
    pass(
      "Over the Team API the host sends project, chat and activity events that the client decoder accepts",
      wireEvents.some((event) => event.type === "projects-changed") &&
        wireEvents.some((event) => event.type === "project-chats-changed") &&
        wireEvents.some((event) => event.type === "project-activity-changed"),
      wireEvents.map((event) => event.type),
    );
    eventSocket.close();
    const memoryText = "The release owner of this project is Grace.";
    const memory = agents.createMemory({ agentId: remoteChat.agentId, text: memoryText });
    agents.setMemoryInclusion({
      agentId: remoteChat.agentId,
      changes: [
        {
          memoryId: memory.id,
          inclusion: "essential",
          expectedRevision:
            agents.getMemorySelection(remoteChat.agentId).selections.find((entry) => entry.memoryId === memory.id)
              ?.revision ?? 0,
        },
      ],
    });
    const entriesBefore = fakeEntries().length;
    const startsBefore = fakeEntries().filter((entry) => entry.method === "thread/start").length;
    const memoryChat = await run(
      projects.startChat(
        { projectId: createdRemote.project.id, agentId: remoteChat.agentId, text: "Who owns releases?" },
        sender,
      ),
    );
    await until(
      "the memory chat starts a provider session and ends",
      () =>
        fakeEntries().filter((entry) => entry.method === "thread/start").length > startsBefore &&
        chatOf(memoryChat.agentId, memoryChat.taskId).state === "idle",
    );
    const newStarts = fakeEntries()
      .filter((entry) => entry.method === "thread/start")
      .slice(startsBefore);
    pass(
      "The memory of a project agent reaches the prompt of a new chat of the project",
      JSON.stringify(fakeEntries().slice(entriesBefore)).includes("Grace"),
      newStarts.length,
    );
    const archivedProject = await ok(PROJECTS_V1_ROUTES.archive, createdRemote.project.id, isProjectSummary);
    const restoredProject = await ok(PROJECTS_V1_ROUTES.restore, createdRemote.project.id, isProjectSummary);
    const deleted = await wire(PROJECTS_V1_ROUTES.delete, ownerToken, createdRemote.project.id);
    pass(
      "Over the Team API a project is archived, restored and deleted",
      archivedProject.archivedAt !== null &&
        restoredProject.archivedAt === null &&
        deleted.status === 200 &&
        projects.find(createdRemote.project.id) === null,
      [archivedProject.archivedAt, restoredProject.archivedAt, deleted.status, deleted.body],
    );
  } finally {
    await Effect.runPromise(server.stop()).catch(() => undefined);
  }

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
