import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, realpath, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import {
  AGENT_PROVIDERS,
  IPC_ENDPOINTS,
  isExplorerDirectory,
  isExplorerEntry,
  isExplorerEntryOrNull,
  isExplorerFile,
  isExplorerGitStatus,
  isExplorerRoots,
  isExplorerWriteResult,
  isProjectChat,
  isProjectChatSearchPage,
  isProjectChatsPage,
  isProjectDetail,
  isProjectSummaryList,
  isReplyRuleSettings,
  isResumableSessionList,
  isSlashCommandList,
  isTurnStepDetails,
  type ProjectChat,
  type SlashCommandList,
} from "@codebot/contracts/ipc";
import { TEAM_API_ROUTES } from "@codebot/contracts/team-api-routes";
import {
  TEAM_APP_VERSION_HEADER,
  TEAM_CAPABILITIES_HEADER,
  TEAM_PROTOCOL_VERSION_HEADER,
} from "@codebot/contracts/team-protocol";
import { encodeTeamCapabilitiesV10, teamCapabilitiesForProtocol } from "@codebot/contracts/team-protocol/current";
import { EXPLORER_CAPABILITY, EXPLORER_ROUTES } from "@codebot/contracts/team-protocol/explorer-v1";
import { PROJECTS_V1_CAPABILITY } from "@codebot/contracts/team-protocol/projects-v1";
import {
  REPLY_ROUTES,
  REPLY_RULE_CAPABILITY,
  TURN_STEP_DETAILS_CAPABILITY,
} from "@codebot/contracts/team-protocol/replies-v1";
import { SLASH_COMMANDS_CAPABILITY, SLASH_COMMANDS_ROUTES } from "@codebot/contracts/team-protocol/slash-commands-v1";
import { TEAM_ABSENT_CAPABILITIES_HEADER, TEAM_PROTOCOL_V10 } from "@codebot/contracts/team-protocol/v10";
import { sourceText } from "@codebot/i18n/source";
import { plugin } from "bun";
import { Effect } from "effect";
import type { AgentBrowserHost } from "../src/backend/agent/turn-lifecycle";
import type { TeamApiBrowser } from "../src/main/team-api/dependencies";

type IpcFn = (event: unknown, payload: unknown) => unknown;
const ipcHandlers = new Map<string, IpcFn>();

plugin({
  name: "server-mode-e2e-electron-boundary",
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
        ipcMain: {
          handle: (channel: string, fn: IpcFn) => ipcHandlers.set(channel, fn),
          removeHandler: () => undefined,
          on: () => undefined,
        },
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

const OUT = resolve(import.meta.dirname, "../.codebot-build/server-mode-e2e");
const root = await mkdtemp(join(tmpdir(), "codebot-server-mode-"));
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
      const withTool = text.includes("[tool]");
      if (withTool) {
        const toolItem = { type: "commandExecution", id: "cmd-" + turnId, command: "echo hello", cwd: params.cwd, status: "completed", aggregatedOutput: "hello from the tool", exitCode: 0, commandActions: [] };
        write({ method: "item/started", params: { threadId: params.threadId, turnId, item: { ...toolItem, status: "inProgress", aggregatedOutput: "" } } });
        write({ method: "item/completed", params: { threadId: params.threadId, turnId, item: toolItem } });
      }
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
const { createExplorerService } = await import("../src/main/explorer/explorer-service");
const { explorerScopeFolders } = await import("../src/main/explorer/explorer-roots");
const { ReplyRulePreferenceStore, REPLY_RULE_PREFERENCE_FILE } = await import(
  "../src/main/reply-rule-preference-store"
);
const { registerIpcGroup } = await import("../src/main/ipc/define-ipc-group");
const { projectIpcHandlers } = await import("../src/main/ipc/project-handlers");
const { explorerIpcHandlers } = await import("../src/main/ipc/explorer-handlers");
const { slashCommandIpcHandlers } = await import("../src/main/ipc/slash-command-handlers");
const { replyIpcHandlers } = await import("../src/main/ipc/reply-handlers");
const { remoteCall } = await import("../src/main/remote-service-effects");
const { decodeAgentStatusFromHost } = await import("../src/main/remote-agent-decoding");

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
const hostRule: { current: { rule(): string | null } | null } = { current: null };
const agents = new AgentService({
  replyRule: () => hostRule.current?.rule() ?? null,
  store,
  mailbox,
  browser: agentBrowser,
  sidebarLayout: sidebar,
  preferredProvider: "codex",
  offProviders: AGENT_PROVIDERS.filter((provider) => provider !== "codex"),
  timezone: () => "UTC",
});

let projects!: InstanceType<typeof ProjectService>;
const HOME_SERVER = "home-server";
const RENDERER_URL = "http://localhost:5173";
process.env.ELECTRON_RENDERER_URL = RENDERER_URL;

const run = <A>(effect: Effect.Effect<A, { readonly cause: unknown }>) => runCauseEffect(effect);

function nth<T>(list: readonly T[], index: number): T {
  const value = list[index];
  assert.ok(value !== undefined, `No item at ${index}.`);
  return value;
}

function chatOf(agentId: string, taskId: string): ProjectChat {
  return projects.getChat({ agentId, taskId });
}

async function until(label: string, ready: () => boolean) {
  await waitFor(label, () => ready());
}

function failureText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const STAND_IN_AGENT = "claude-stand-in";
const STAND_IN_LIST: SlashCommandList = {
  agentId: STAND_IN_AGENT,
  taskId: null,
  provider: "claude",
  origin: "saved",
  engineVersion: "2.1.309",
  commands: ["compact", "model", "resume", "review"].map((name) => ({
    name,
    description: `The ${name} command`,
    argumentHint: "",
    aliases: [],
    source: "builtin",
    plugin: null,
    kind: "command",
    terminalOnly: false,
    screen: name === "model" ? "model" : name === "resume" ? "resume" : null,
  })),
};

const hostOnly = (name: string) =>
  new Proxy(Object.create(null), {
    get(_target, key) {
      throw new Error(`The client instance used its own ${name} (${String(key)}) instead of the server.`);
    },
  });

try {
  await run(sidebar.initialize());
  await run(agents.initialize());
  projects = new ProjectService({
    database,
    agents,
    readerId: () => READER,
    isProtectedFolder: async () => false,
  });
  await run(projects.start());

  const replyRule = new ReplyRulePreferenceStore(join(userData, REPLY_RULE_PREFERENCE_FILE));
  await run(replyRule.load());
  hostRule.current = replyRule;
  const trashDir = join(root, "trash");
  mkdirSync(trashDir, { recursive: true });
  const hostExplorer = createExplorerService({
    folders: (scope) => explorerScopeFolders(scope, agents),
    trash: async (path) => {
      await rename(path, join(trashDir, `${Date.now()}-${basename(path)}`));
    },
    reveal: () => undefined,
  });

  const teamDir = join(root, "team");
  mkdirSync(teamDir, { recursive: true });
  const OWNER = { username: "owner-user", password: "owner-password-123" };
  const MEMBER = { username: "member-user", password: "member-password-123" };
  const team = new TeamStore(join(teamDir, "codebot-team-server-v2.json"));
  const access = new AgentAccessStore(join(teamDir, AGENT_ACCESS_FILE));
  await run(team.initialize());
  assert.equal(await run(access.load()), true, "The roles file did not load.");
  await run(team.configure("E2E Home Server", OWNER.username, OWNER.password));
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
    explorer: hostExplorer,
    slashCommands: {
      listSlashCommands: (input) =>
        input.agentId === STAND_IN_AGENT ? Effect.succeed(STAND_IN_LIST) : agents.listSlashCommands(input),
      listResumableSessions: (agentId) => agents.listResumableSessions(agentId),
      resumeAgentSession: (input) => agents.resumeAgentSession(input),
    },
    replies: { rule: replyRule, readTurnStepDetails: (agentId, turnId) => agents.readTurnStepDetails(agentId, turnId) },
  });
  const port = await Effect.runPromise(server.start());
  try {
    const capabilityHeaders = (capabilities: readonly string[]): Record<string, string> => {
      const lists = encodeTeamCapabilitiesV10(capabilities);
      return {
        [TEAM_CAPABILITIES_HEADER]: lists.capabilities.join(","),
        [TEAM_ABSENT_CAPABILITIES_HEADER]: lists.absent.join(","),
      };
    };
    const call = async (
      method: string,
      path: string,
      input: { token?: string; body?: unknown; capabilities?: readonly string[] } = {},
    ): Promise<{ status: number; body: unknown }> => {
      const headers: Record<string, string> = {
        Accept: "application/json",
        [TEAM_PROTOCOL_VERSION_HEADER]: String(TEAM_PROTOCOL_V10),
        [TEAM_APP_VERSION_HEADER]: "0.0.0-e2e",
        ...capabilityHeaders(input.capabilities ?? teamCapabilitiesForProtocol(TEAM_PROTOCOL_V10)),
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
    const memberToken = await (async () => {
      const invite = await run(team.createInvite("member"));
      const joined = await call("POST", TEAM_API_ROUTES.join.server, {
        body: { inviteToken: invite.token, ...MEMBER },
      });
      assert.equal(joined.status, 201, `Join returned ${joined.status}.`);
      return login(MEMBER);
    })();

    const compatibility = await call("GET", TEAM_API_ROUTES.compatibility);
    const served = JSON.stringify(compatibility.body);
    const NEW_CAPABILITIES = [
      PROJECTS_V1_CAPABILITY,
      EXPLORER_CAPABILITY,
      SLASH_COMMANDS_CAPABILITY,
      REPLY_RULE_CAPABILITY,
      TURN_STEP_DETAILS_CAPABILITY,
    ];
    pass(
      "The host serves projects, explorer, slash commands, reply rule and step details to a protocol 10 client",
      compatibility.status === 200 && NEW_CAPABILITIES.every((capability) => served.includes(`"${capability}"`)),
      {
        status: compatibility.status,
        missing: NEW_CAPABILITIES.filter((capability) => !served.includes(`"${capability}"`)),
      },
    );

    const remoteServers = {
      list: () => [
        Object.assign(Object.create(null), { id: HOME_SERVER, compatibility: { capabilities: NEW_CAPABILITIES } }),
      ],
      supportsCapability: (_serverId: string, capability: string) => served.includes(`"${capability}"`),
      request: <T>(
        _serverId: string,
        path: string,
        decoder: (value: unknown) => T,
        init?: { method?: string; body?: unknown },
      ) =>
        remoteCall(async (): Promise<T> => {
          const response = await call(init?.method ?? "GET", path, {
            token: ownerToken,
            ...(init?.body === undefined ? {} : { body: init.body }),
          });
          if (response.status !== 200) {
            const body = response.body;
            throw new Error(
              typeof body === "object" && body !== null && "error" in body
                ? String(body.error)
                : `HTTP ${response.status}`,
            );
          }
          return decoder(response.body);
        }),
    };

    registerIpcGroup(
      "projects",
      projectIpcHandlers({
        projects: hostOnly("projects"),
        remoteServers: remoteServers,
        sender: () => undefined,
        getMainWindow: () => null,
        translate: hostOnly("translator"),
      }).projects,
    );
    registerIpcGroup(
      "explorer",
      explorerIpcHandlers({
        explorer: hostOnly("explorer"),
        remoteServers: remoteServers,
        windowOf: () => null,
      }).explorer,
    );
    registerIpcGroup(
      "slashCommands",
      slashCommandIpcHandlers({
        service: hostOnly("agent service"),
        remoteServers: remoteServers,
      }).slashCommands,
    );
    registerIpcGroup(
      "replies",
      replyIpcHandlers({
        replyRule: hostOnly("reply rule"),
        service: hostOnly("agent service"),
        remoteServers: remoteServers,
      }).replies,
    );

    const ipcFrame = { senderFrame: { url: `${RENDERER_URL}/` }, sender: { id: 1 } };
    const ipcHandler = (channel: string) => {
      const handler = ipcHandlers.get(channel);
      assert.ok(handler, `No IPC handler for ${channel}.`);
      return handler;
    };
    const send = async (channel: string, payload: unknown): Promise<void> => {
      await ipcHandler(channel)(ipcFrame, { serverId: HOME_SERVER, payload });
    };
    const ask = async <T>(channel: string, payload: unknown, guard: (value: unknown) => value is T): Promise<T> => {
      const value = await ipcHandler(channel)(ipcFrame, { serverId: HOME_SERVER, payload });
      assert.ok(guard(value), `${channel} returned a value that the screen decoder refuses.`);
      return value;
    };
    const rejected = async (channel: string, payload: unknown): Promise<string | null> => {
      try {
        await send(channel, payload);
        return null;
      } catch (error) {
        return failureText(error);
      }
    };

    const mainFolder = await makeRepo("home-main");
    const extraFolder = await makeRepo("home-extra");
    writeFileSync(join(mainFolder, "notes.txt"), "first line\n");
    mkdirSync(join(mainFolder, "src"), { recursive: true });
    writeFileSync(join(mainFolder, "src", "app.ts"), "export const answer = 42;\n");

    const created = await ask(
      IPC_ENDPOINTS.projects.create.channel,
      {
        name: "Home project",
        mainFolder,
        additionalFolders: [extraFolder],
        accessLevel: "normal",
        agents: [{ name: "Ada", role: "Frontend" }],
      },
      isProjectDetail,
    );
    const listed = await ask(IPC_ENDPOINTS.projects.list.channel, null, isProjectSummaryList);
    pass(
      "A project is created and listed through the client handlers on the joined server, and it exists on the server",
      isProjectDetail(created) &&
        listed.some((project) => project.id === created.project.id) &&
        projects.find(created.project.id) !== null &&
        created.folders.length === 2,
      created.project.id,
    );
    const ada = nth(created.agents, 0);

    const chat = await ask(
      IPC_ENDPOINTS.projects.startChat.channel,
      {
        projectId: created.project.id,
        agentId: ada.id,
        text: "Show the files [tool] [m-first]",
      },
      isProjectChat,
    );
    await until("the first remote chat ends", () => chatOf(chat.agentId, chat.taskId).state === "idle");
    const firstTurn = fakeEntries().find((entry) => entry.method === "turn/start" && entry.text?.includes("[m-first]"));
    const writable = firstTurn?.params.sandboxPolicy?.writableRoots?.map((path) => resolve(path)) ?? [];
    pass(
      "A chat started from the client runs on the server in the project folder, and the Normal lock gives write access only to the project folders",
      firstTurn !== undefined &&
        resolve(String(firstTurn.params.cwd)) === resolve(mainFolder) &&
        firstTurn.params.sandboxPolicy?.type === "workspaceWrite" &&
        writable.includes(resolve(mainFolder)) &&
        writable.includes(resolve(extraFolder)) &&
        !writable.includes(resolve(root)),
      { cwd: firstTurn?.params.cwd, sandbox: firstTurn?.params.sandboxPolicy },
    );

    const chatsPage = await ask(
      IPC_ENDPOINTS.projects.listChats.channel,
      {
        projectId: created.project.id,
      },
      isProjectChatsPage,
    );
    const searched = await ask(
      IPC_ENDPOINTS.projects.searchChats.channel,
      {
        query: "Show the files",
        projectId: created.project.id,
      },
      isProjectChatSearchPage,
    );
    const pinned = await ask(
      IPC_ENDPOINTS.projects.setChatPinned.channel,
      {
        agentId: chat.agentId,
        taskId: chat.taskId,
        pinned: true,
      },
      isProjectChat,
    );
    pass(
      "The chat list, the chat search and the pin work against the joined server",
      chatsPage.chats.length === 1 &&
        searched.matches.length > 0 &&
        pinned.pinned &&
        chatOf(chat.agentId, chat.taskId).pinned,
      { chats: chatsPage.chats.length, matches: searched.matches.length },
    );

    const scope = { agentId: ada.id };
    const roots = await ask(IPC_ENDPOINTS.explorer.roots.channel, scope, isExplorerRoots);
    pass(
      "The file explorer lists the two project folders of the server",
      roots.roots
        .map((entry) => resolve(entry.path))
        .sort()
        .join("|") === [resolve(mainFolder), resolve(extraFolder)].sort().join("|"),
      roots.roots,
    );
    const directory = await ask(
      IPC_ENDPOINTS.explorer.list.channel,
      {
        scope,
        path: mainFolder,
        offset: 0,
      },
      isExplorerDirectory,
    );
    const names = directory.entries.map((entry) => entry.name);
    pass(
      "The explorer lists the files of a server folder",
      names.includes("notes.txt") && names.includes("src"),
      names,
    );
    const file = await ask(
      IPC_ENDPOINTS.explorer.read.channel,
      {
        scope,
        path: join(mainFolder, "notes.txt"),
      },
      isExplorerFile,
    );
    pass(
      "The explorer reads a text file of the server and gives no local preview address",
      file.kind === "text" && file.text?.content === "first line\n" && file.url === null,
      { kind: file.kind, url: file.url },
    );
    const writeInput = (content: string) => ({
      scope,
      path: join(mainFolder, "notes.txt"),
      content,
      encoding: "utf8",
      bom: false,
      lineEnding: "lf",
      expected: { modifiedAt: file.modifiedAt, size: file.size },
    });
    const saved = await ask(
      IPC_ENDPOINTS.explorer.write.channel,
      writeInput("first line\nsecond line\n"),
      isExplorerWriteResult,
    );
    const stale = await ask(IPC_ENDPOINTS.explorer.write.channel, writeInput("lost update\n"), isExplorerWriteResult);
    pass(
      "A save through the explorer changes the file on the server, and a stale save is a conflict",
      saved.outcome === "saved" &&
        readFileSync(join(mainFolder, "notes.txt"), "utf8") === "first line\nsecond line\n" &&
        stale.outcome === "conflict",
      { saved: saved.outcome, stale: stale.outcome },
    );
    const made = await ask(
      IPC_ENDPOINTS.explorer.create.channel,
      {
        scope,
        parent: mainFolder,
        name: "todo.md",
        kind: "file",
      },
      isExplorerEntry,
    );
    const renamed = await ask(
      IPC_ENDPOINTS.explorer.rename.channel,
      {
        scope,
        path: made.path,
        name: "done.md",
      },
      isExplorerEntry,
    );
    const statted = await ask(
      IPC_ENDPOINTS.explorer.stat.channel,
      {
        scope,
        path: renamed.path,
      },
      isExplorerEntryOrNull,
    );
    await send(IPC_ENDPOINTS.explorer.trash.channel, { scope, path: renamed.path });
    pass(
      "The explorer creates, renames and trashes a file on the server",
      !existsSync(join(mainFolder, "done.md")) &&
        !existsSync(join(mainFolder, "todo.md")) &&
        renamed.name === "done.md" &&
        statted?.name === "done.md",
      { renamed: renamed.name },
    );
    const outside = await rejected(IPC_ENDPOINTS.explorer.list.channel, { scope, path: root, offset: 0 });
    pass(
      "The explorer of the server refuses a folder outside the project folders with the server message",
      outside?.includes(sourceText("error.explorer.outside")) === true,
      outside,
    );
    const gitStatus = await ask(
      IPC_ENDPOINTS.explorer.gitStatus.channel,
      {
        scope,
        root: mainFolder,
        ignored: false,
      },
      isExplorerGitStatus,
    );
    pass("The explorer reads the Git status of a server folder", typeof gitStatus.state === "string", gitStatus.state);
    const reveal = await rejected(IPC_ENDPOINTS.explorer.reveal.channel, { scope, path: join(mainFolder, "src") });
    pass(
      "Show in folder is refused on a joined server with a clear message",
      reveal?.includes(sourceText("error.explorer.clientUnsupported")) === true,
      reveal,
    );

    const remoteList = await ask(
      IPC_ENDPOINTS.slashCommands.list.channel,
      {
        agentId: ada.id,
      },
      isSlashCommandList,
    );
    const hostList = await run(agents.listSlashCommands({ agentId: ada.id }));
    pass(
      "The slash command list from the joined server is the list of the server engine",
      isSlashCommandList(remoteList) && JSON.stringify(remoteList) === JSON.stringify(hostList),
      { remote: remoteList.commands.length, host: hostList.commands.length, origin: remoteList.origin },
    );
    const standIn = await ask(
      IPC_ENDPOINTS.slashCommands.list.channel,
      { agentId: STAND_IN_AGENT },
      isSlashCommandList,
    );
    pass(
      "A list with commands, as the Claude engine gives it, reaches the client with names, screens and source",
      JSON.stringify(standIn) === JSON.stringify(STAND_IN_LIST),
      standIn.commands.map((command) => command.name),
    );
    const sessions = await ask(IPC_ENDPOINTS.slashCommands.listSessions.channel, ada.id, isResumableSessionList).then(
      (value) => ({ ok: value }),
      (error) => ({ error: failureText(error) }),
    );
    const hostSessions = await run(agents.listResumableSessions(ada.id)).then(
      (value) => ({ ok: value }),
      (error) => ({ error: failureText(error) }),
    );
    pass(
      "The saved chat list from the joined server matches the server",
      JSON.stringify(sessions) === JSON.stringify(hostSessions),
      { sessions, hostSessions },
    );

    const RULE = "Answer in two sentences [rule-home].";
    const noRule = await ask(IPC_ENDPOINTS.replies.getRule.channel, null, isReplyRuleSettings);
    const setRule = await ask(IPC_ENDPOINTS.replies.setRule.channel, { rule: RULE }, isReplyRuleSettings);
    const readBack = await ask(IPC_ENDPOINTS.replies.getRule.channel, null, isReplyRuleSettings);
    pass(
      "The reply rule of the server is read and saved from the client",
      noRule.rule === null && setRule.rule === RULE && replyRule.rule() === RULE && readBack.rule === RULE,
      { noRule, setRule, readBack },
    );
    const ruled = await ask(
      IPC_ENDPOINTS.projects.startChat.channel,
      {
        projectId: created.project.id,
        agentId: ada.id,
        text: "Say hello [m-rule]",
      },
      isProjectChat,
    );
    await until("the rule chat ends", () => chatOf(ruled.agentId, ruled.taskId).state === "idle");
    const ruleStart = fakeEntries()
      .filter((entry) => entry.method === "thread/start")
      .pop();
    pass(
      "The reply rule saved from the client is in the instructions of the next chat on the server",
      JSON.stringify(ruleStart?.params).includes(RULE),
      ruleStart?.params.developerInstructions?.slice(0, 200),
    );

    const toolTurnId = fakeEntries().find(
      (entry) => entry.method === "turn/start" && entry.text?.includes("[m-first]"),
    )?.turnId;
    const stepsEnvelope = toolTurnId
      ? await ask(
          IPC_ENDPOINTS.replies.readTurnSteps.channel,
          { agentId: chat.agentId, turnId: toolTurnId },
          isTurnStepDetails,
        )
      : null;
    pass(
      "Details of a reply on the server load through the client with the output of the tool step",
      stepsEnvelope?.steps.some((step) => step.output?.includes("hello from the tool")) === true,
      stepsEnvelope,
    );

    await send(IPC_ENDPOINTS.projects.update.channel, { projectId: created.project.id, accessLevel: "strict" });
    const strictChat = await ask(
      IPC_ENDPOINTS.projects.startChat.channel,
      { projectId: created.project.id, agentId: ada.id, text: "Strict run [m-strict]" },
      isProjectChat,
    ).then(
      (value) => ({ chat: value }),
      (error) => ({ error: failureText(error) }),
    );
    if ("chat" in strictChat) {
      await waitFor("the strict chat to stop", () => {
        const current = chatOf(strictChat.chat.agentId, strictChat.chat.taskId);
        return current.state === "idle";
      });
    }
    const strictRan = fakeEntries().some(
      (entry) => entry.method === "turn/start" && entry.text?.includes("[m-strict]"),
    );
    pass(
      "A Strict project on the server does not run an agent that it cannot lock",
      !strictRan,
      "chat" in strictChat ? chatOf(strictChat.chat.agentId, strictChat.chat.taskId).state : strictChat.error,
    );
    await send(IPC_ENDPOINTS.projects.update.channel, { projectId: created.project.id, accessLevel: "open" });
    const openChat = await ask(
      IPC_ENDPOINTS.projects.startChat.channel,
      {
        projectId: created.project.id,
        agentId: ada.id,
        text: "Open run [m-open]",
      },
      isProjectChat,
    );
    await until("the open chat ends", () => chatOf(openChat.agentId, openChat.taskId).state === "idle");
    const openTurn = fakeEntries().find((entry) => entry.method === "turn/start" && entry.text?.includes("[m-open]"));
    pass(
      "The lock level set from the client changes the lock of the next turn on the server (Open is full access)",
      openTurn !== undefined && openTurn.params.sandboxPolicy?.type !== "workspaceWrite",
      openTurn?.params.sandboxPolicy,
    );

    const status = await call("GET", TEAM_API_ROUTES.agents.status, { token: ownerToken });
    let statusDecodes = false;
    try {
      decodeAgentStatusFromHost(status.body);
      statusDecodes = true;
    } catch {
      statusDecodes = false;
    }
    pass(
      "The status of the server engine passes the client decoder",
      status.status === 200 && statusDecodes,
      status.status,
    );

    const body = { input: { agentId: ada.id } };
    const asMember = await call("POST", EXPLORER_ROUTES.roots, { token: memberToken, body });
    const withoutExplorer = teamCapabilitiesForProtocol(TEAM_PROTOCOL_V10).filter(
      (capability) => capability !== EXPLORER_CAPABILITY,
    );
    const noCapability = await call("POST", EXPLORER_ROUTES.roots, {
      token: ownerToken,
      body,
      capabilities: withoutExplorer,
    });
    const slashMember = await call("POST", SLASH_COMMANDS_ROUTES.list, {
      token: memberToken,
      body: { input: { agentId: ada.id } },
    });
    const viaGet = await call("GET", EXPLORER_ROUTES.roots, { token: ownerToken });
    const ruleMember = await call("POST", REPLY_ROUTES.updateRule, { token: memberToken, body: { rule: "x" } });
    pass(
      "A member gets 403 on the explorer, slash command and reply rule write routes, a client without the capability gets 400, and a GET gets 404",
      asMember.status === 403 &&
        slashMember.status === 403 &&
        ruleMember.status === 403 &&
        noCapability.status === 400 &&
        viaGet.status === 404,
      [asMember.status, slashMember.status, ruleMember.status, noCapability.status, viaGet.status],
    );
  } finally {
    await Effect.runPromise(server.stop()).catch(() => undefined);
  }

  report.passed = report.checks.every((entry) => entry.passed);
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
