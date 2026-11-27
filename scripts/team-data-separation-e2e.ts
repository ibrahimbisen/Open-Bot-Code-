import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { AGENT_PROVIDERS } from "@codebot/contracts/ipc";
import { isDynamicRecord } from "@codebot/contracts/runtime-values";
import { TEAM_API_ROUTES } from "@codebot/contracts/team-api-routes";
import {
  TEAM_APP_VERSION_HEADER,
  TEAM_CAPABILITIES_HEADER,
  TEAM_PROTOCOL_VERSION_HEADER,
} from "@codebot/contracts/team-protocol";
import { AGENT_ACCESS_ROUTES } from "@codebot/contracts/team-protocol/agent-access-v1";
import { AGENT_TASKS_ROUTES } from "@codebot/contracts/team-protocol/agent-tasks-v1";
import { encodeTeamCapabilitiesV10, teamCapabilitiesForProtocol } from "@codebot/contracts/team-protocol/current";
import { EXPLORER_ROUTES } from "@codebot/contracts/team-protocol/explorer-v1";
import { PROJECTS_V1_ROUTES } from "@codebot/contracts/team-protocol/projects-v1";
import { TEAM_ABSENT_CAPABILITIES_HEADER, TEAM_PROTOCOL_V10 } from "@codebot/contracts/team-protocol/v10";
import { plugin } from "bun";
import { Effect } from "effect";
import type { AgentBrowserHost } from "../src/backend/agent/turn-lifecycle";
import type { TeamApiBrowser } from "../src/main/team-api/dependencies";
import { writeFakeCodex } from "./dev-automation/bench-fake-codex";

plugin({
  name: "team-data-separation-e2e-electron-boundary",
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

const OUT = resolve(import.meta.dirname, "../.codebot-build/team-data-separation");
const root = await mkdtemp(join(tmpdir(), "codebot-team-data-separation-"));
const userData = join(root, "user-data");
const home = join(root, "home");
process.env.HOME = home;
process.env.USERPROFILE = home;
mkdirSync(home, { recursive: true });
const fake = await writeFakeCodex(join(root, "fake-codex"), { deltaMs: 5, deltas: 3 });
Object.assign(process.env, fake.environment);

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

interface Check {
  name: string;
  passed: boolean;
  detail?: string;
}

const checks: Check[] = [];
let failure: string | undefined;

function check(name: string, passed: boolean, detail?: unknown): void {
  const text = detail === undefined ? undefined : JSON.stringify(detail).slice(0, 800);
  checks.push({ name, passed, ...(text === undefined ? {} : { detail: text }) });
  process.stdout.write(`${passed ? "PASS" : "FAIL"} ${name}${passed || !text ? "" : `: ${text}`}\n`);
}

async function waitFor<T>(label: string, read: () => Promise<T> | T, ready: (value: T) => boolean): Promise<T> {
  const deadline = Date.now() + 60_000;
  for (;;) {
    const value = await read();
    if (ready(value)) return value;
    if (Date.now() > deadline)
      throw new Error(`Timed out waiting for ${label}: ${JSON.stringify(value).slice(0, 400)}`);
    await new Promise((done) => setTimeout(done, 50));
  }
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

const database = new CodeBotDatabase(userData);
const store = new AgentStore(userData, home, database);
const mailbox = new MailboxStore(userData, store.sharedRoot, store.database);
const sidebar = new SidebarLayoutStore(join(userData, "sidebar-layout.json"));
const agents = new AgentService({
  replyRule: () => null,
  store,
  mailbox,
  browser: agentBrowser,
  sidebarLayout: sidebar,
  preferredProvider: "codex",
  offProviders: AGENT_PROVIDERS.filter((provider) => provider !== "codex"),
  timezone: () => "UTC",
});
const run = <A>(effect: Effect.Effect<A, { readonly cause: unknown }>) => runCauseEffect(effect);
let stopServer: (() => Promise<void>) | null = null;
let projectsRef: InstanceType<typeof ProjectService> | null = null;

try {
  await run(sidebar.initialize());
  await run(agents.initialize());
  const projects = new ProjectService({
    database,
    agents,
    readerId: () => "e2e-reader",
    isProtectedFolder: async () => false,
  });
  projectsRef = projects;
  await run(projects.start());
  const explorer = createExplorerService({
    folders: (scope) => explorerScopeFolders(scope, agents),
    trash: async () => undefined,
    reveal: () => undefined,
  });
  const teamDir = join(root, "team");
  mkdirSync(teamDir, { recursive: true });
  const OWNER = { username: "owner-user", password: "owner-password-123" };
  const BOB = { username: "bob-member", password: "bob-password-123" };
  const CAROL = { username: "carol-member", password: "carol-password-123" };
  const team = new TeamStore(join(teamDir, "codebot-team-server-v2.json"));
  const access = new AgentAccessStore(join(teamDir, AGENT_ACCESS_FILE));
  await run(team.initialize());
  await run(access.load());
  await run(team.configure("E2E Home Server", OWNER.username, OWNER.password));
  const server = new TeamApiServer({
    store: team,
    agents,
    mailbox,
    browser: stubBrowser,
    sidebarLayout: sidebar,
    appVersion: "0.0.0-e2e",
    hiddenAgents: agents,
    agentAccess: access,
    agentTasks: agents,
    projects,
    memberProjectsRoot: join(root, "member-projects"),
    explorer,
  });
  const port = await Effect.runPromise(server.start());
  stopServer = async () => {
    await Effect.runPromise(server.stop()).catch(() => undefined);
  };
  const lists = encodeTeamCapabilitiesV10(teamCapabilitiesForProtocol(TEAM_PROTOCOL_V10));
  const call = async (
    method: string,
    path: string,
    input: { token?: string; body?: unknown } = {},
  ): Promise<{ status: number; body: unknown; text: string }> => {
    const headers: Record<string, string> = {
      Accept: "application/json",
      [TEAM_PROTOCOL_VERSION_HEADER]: String(TEAM_PROTOCOL_V10),
      [TEAM_APP_VERSION_HEADER]: "0.0.0-e2e",
      [TEAM_CAPABILITIES_HEADER]: lists.capabilities.join(","),
      [TEAM_ABSENT_CAPABILITIES_HEADER]: lists.absent.join(","),
    };
    if (input.body !== undefined) headers["Content-Type"] = "application/json";
    if (input.token) headers.Authorization = `Bearer ${input.token}`;
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      method,
      headers,
      body: input.body === undefined ? null : JSON.stringify(input.body),
    });
    const text = await response.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }
    return { status: response.status, body, text };
  };
  const login = async (credentials: { username: string; password: string }): Promise<string> => {
    const response = await call("POST", TEAM_API_ROUTES.auth.login, { body: credentials });
    const token = isDynamicRecord(response.body) ? response.body.sessionToken : null;
    if (typeof token !== "string") throw new Error(`Sign-in returned ${response.status}.`);
    return token;
  };
  const join_ = async (credentials: { username: string; password: string }): Promise<string> => {
    const invite = await run(team.createInvite("member"));
    const joined = await call("POST", TEAM_API_ROUTES.join.server, {
      body: { inviteToken: invite.token, ...credentials },
    });
    if (joined.status !== 201) throw new Error(`Join returned ${joined.status}.`);
    return login(credentials);
  };
  const ownerToken = await login(OWNER);
  const bobToken = await join_(BOB);
  const carolToken = await join_(CAROL);
  const bobId = team.authenticate(bobToken)?.id;
  if (!bobId) throw new Error("Bob has no member id.");

  const folder = await realpath(await mkdtemp(join(root, "owner-project-")));
  writeFileSync(join(folder, "secret-plan.md"), "# The owner's secret plan\n");
  const created = await call("POST", PROJECTS_V1_ROUTES.create, {
    token: ownerToken,
    body: {
      input: {
        name: "Owner project",
        mainFolder: folder,
        accessLevel: "open",
        agents: [{ name: "Ada", role: "Developer" }],
      },
    },
  });
  const detail = isDynamicRecord(created.body) ? created.body : null;
  const project = detail && isDynamicRecord(detail.project) ? detail.project : null;
  const agentList = detail && Array.isArray(detail.agents) ? detail.agents : [];
  const firstAgent = agentList[0];
  const projectId = project && typeof project.id === "string" ? project.id : "";
  const agentId = isDynamicRecord(firstAgent) && typeof firstAgent.id === "string" ? firstAgent.id : "";
  check(
    "the owner creates a project through the Team API",
    created.status === 200 && projectId !== "" && agentId !== "",
    {
      status: created.status,
    },
  );
  const started = await call("POST", PROJECTS_V1_ROUTES.startChat, {
    token: ownerToken,
    body: { input: { projectId, agentId, text: "Owner question about the secret plan" } },
  });
  const chat = isDynamicRecord(started.body) ? started.body : null;
  const taskId = chat && typeof chat.taskId === "string" ? chat.taskId : "";
  await waitFor(
    "the owner chat ends",
    () => projects.getChat({ agentId, taskId }).state,
    (state) => state === "idle",
  );
  check("the owner starts a chat in the project and it runs", started.status === 200 && taskId !== "", {
    status: started.status,
  });

  const projectReads: [string, unknown][] = [
    [PROJECTS_V1_ROUTES.get, { input: projectId }],
    [PROJECTS_V1_ROUTES.listChats, { input: { projectId } }],
    [PROJECTS_V1_ROUTES.getChat, { input: { agentId, taskId } }],
    [PROJECTS_V1_ROUTES.searchChats, { input: { projectId, query: "secret" } }],
  ];
  const projectLists: [string, unknown][] = [
    [PROJECTS_V1_ROUTES.list, {}],
    [PROJECTS_V1_ROUTES.listActivity, {}],
    [PROJECTS_V1_ROUTES.searchChats, { input: { query: "secret" } }],
  ];
  const ownerList = await call("POST", PROJECTS_V1_ROUTES.list, { token: ownerToken, body: {} });
  check(
    "the owner sees the project in the project list",
    ownerList.status === 200 && ownerList.text.includes(projectId),
    ownerList.status,
  );
  for (const [token, who] of [
    [bobToken, "Bob"],
    [carolToken, "Carol"],
  ] as const) {
    const statuses: Record<string, number> = {};
    let leaked = false;
    for (const [path, body] of projectReads) {
      const answer = await call("POST", path, { token, body });
      statuses[path] = answer.status;
      if (answer.text.includes(projectId) || answer.text.includes("secret plan")) leaked = true;
    }
    check(
      `${who} (a member) gets 403 on every read route of the owner's project and sees no project or chat data`,
      Object.values(statuses).every((status) => status === 403) && !leaked,
      statuses,
    );
    const listStatuses: Record<string, number> = {};
    let listLeaked = false;
    for (const [path, body] of projectLists) {
      const answer = await call("POST", path, { token, body });
      listStatuses[path] = answer.status;
      if (answer.text.includes(projectId) || answer.text.includes("secret plan")) listLeaked = true;
    }
    check(
      `${who} can list their own projects, activity and chat matches, and the lists hold nothing of the owner`,
      Object.values(listStatuses).every((status) => status === 200) && !listLeaked,
      listStatuses,
    );
    const roots = await call("POST", EXPLORER_ROUTES.roots, { token, body: { input: { agentId } } });
    const read = await call("POST", EXPLORER_ROUTES.read, {
      token,
      body: { input: { scope: { agentId }, path: join(folder, "secret-plan.md") } },
    });
    check(
      `${who} gets 403 on the file tree and file reads of the owner's project`,
      roots.status === 403 && read.status === 403 && !read.text.includes("secret plan"),
      { roots: roots.status, read: read.status },
    );
    const create = await call("POST", PROJECTS_V1_ROUTES.create, {
      token,
      body: { input: { name: `${who} project`, mainFolder: folder, accessLevel: "normal", agents: [] } },
    });
    check(`${who} cannot create a project in the owner's folder`, create.status === 403, create.status);
  }

  interface ChatTarget {
    agentId: string;
    taskId: string;
    text: string;
    file: string;
  }
  const ownerChat: ChatTarget = {
    agentId,
    taskId,
    text: "Owner question about the secret plan",
    file: "secret plan",
  };
  const memberView = async (token: string, target: ChatTarget = ownerChat) => {
    const listed = await call("GET", TEAM_API_ROUTES.agents.all, { token });
    const tasks = await call("POST", AGENT_TASKS_ROUTES.list, { token, body: { agentId: target.agentId } });
    const thread = await call("POST", AGENT_TASKS_ROUTES.read, {
      token,
      body: { agentId: target.agentId, taskId: target.taskId },
    });
    const conversation = await call("GET", TEAM_API_ROUTES.agent.conversation(target.agentId), { token });
    const file = await call(
      "GET",
      `${TEAM_API_ROUTES.workspaceFiles}?botId=${encodeURIComponent(target.agentId)}&path=${encodeURIComponent("secret-plan.md")}`,
      { token },
    );
    return {
      agentListed: listed.status === 200 && listed.text.includes(target.agentId),
      tasks: tasks.status,
      tasksShowChat: tasks.text.includes(target.taskId),
      thread: thread.status,
      threadShowsText: thread.text.includes(target.text),
      conversation: conversation.status,
      file: file.status,
      fileShowsText: file.text.includes(target.file),
    };
  };
  const hidden = (view: Awaited<ReturnType<typeof memberView>>) =>
    !view.agentListed &&
    view.tasks >= 400 &&
    !view.tasksShowChat &&
    view.thread >= 400 &&
    !view.threadShowsText &&
    view.conversation >= 400 &&
    view.file >= 400 &&
    !view.fileShowsText;
  const seen = (view: Awaited<ReturnType<typeof memberView>>) =>
    view.agentListed && view.tasks === 200 && view.tasksShowChat && view.thread === 200 && view.threadShowsText;

  const bobDefault = await memberView(bobToken);
  check(
    "with no access rule, Bob does not see the owner's agent, its chats, its messages or its project files",
    hidden(bobDefault),
    bobDefault,
  );
  const carolDefault = await memberView(carolToken);
  check("with no access rule, Carol does not see the owner's agent either", hidden(carolDefault), carolDefault);

  const accessState = await call("POST", AGENT_ACCESS_ROUTES.read, { token: ownerToken, body: {} });
  const revision =
    isDynamicRecord(accessState.body) && typeof accessState.body.revision === "number" ? accessState.body.revision : 0;
  const closed = await call("POST", AGENT_ACCESS_ROUTES.set, {
    token: ownerToken,
    body: { revision, everyone: { [agentId]: "none" }, roles: [] },
  });
  check("the owner sets an explicit rule: no member has access", closed.status === 200, closed.status);

  const bobClosed = await memberView(bobToken);
  check("with the explicit rule, Bob still sees nothing of the owner's agent", hidden(bobClosed), bobClosed);

  const afterClose = await call("POST", AGENT_ACCESS_ROUTES.read, { token: ownerToken, body: {} });
  const nextRevision =
    isDynamicRecord(afterClose.body) && typeof afterClose.body.revision === "number" ? afterClose.body.revision : 0;
  const shared = await call("POST", AGENT_ACCESS_ROUTES.set, {
    token: ownerToken,
    body: {
      revision: nextRevision,
      everyone: { [agentId]: "none" },
      roles: [{ id: "shared-with-bob", name: "Shared with Bob", memberIds: [bobId], agents: { [agentId]: "view" } }],
    },
  });
  check("the owner shares the project agent with Bob only", shared.status === 200, shared.status);
  const bobShared = await memberView(bobToken);
  check("after the share, Bob sees the agent, its chat and the chat messages", seen(bobShared), bobShared);
  const carolShared = await memberView(carolToken);
  check("Carol still sees nothing of the agent that was shared with Bob only", hidden(carolShared), carolShared);
  const bobProjects = await call("POST", PROJECTS_V1_ROUTES.list, { token: bobToken, body: {} });
  const bobOwnerProject = await call("POST", PROJECTS_V1_ROUTES.get, { token: bobToken, body: { input: projectId } });
  check(
    "the share does not open the owner's project settings to Bob",
    bobProjects.status === 200 && !bobProjects.text.includes(projectId) && bobOwnerProject.status === 403,
    { list: bobProjects.status, get: bobOwnerProject.status },
  );

  const openProject = await call("POST", PROJECTS_V1_ROUTES.create, {
    token: bobToken,
    body: { input: { name: "Bob full access", mainFolder: "bob-open", accessLevel: "open", agents: [] } },
  });
  check("Bob cannot give his own project full access to the host", openProject.status === 403, openProject.status);
  const bobCreated = await call("POST", PROJECTS_V1_ROUTES.create, {
    token: bobToken,
    body: {
      input: { name: "Bob project", mainFolder: "bob-app", accessLevel: "normal", agents: [{ name: "Bea", role: "" }] },
    },
  });
  const bobDetail = isDynamicRecord(bobCreated.body) ? bobCreated.body : null;
  const bobProject = bobDetail && isDynamicRecord(bobDetail.project) ? bobDetail.project : null;
  const bobAgents = bobDetail && Array.isArray(bobDetail.agents) ? bobDetail.agents : [];
  const bobProjectId = bobProject && typeof bobProject.id === "string" ? bobProject.id : "";
  const bobFolder = bobProject && typeof bobProject.mainFolder === "string" ? bobProject.mainFolder : "";
  const bobFirstAgent = bobAgents[0];
  const bobAgentId = isDynamicRecord(bobFirstAgent) && typeof bobFirstAgent.id === "string" ? bobFirstAgent.id : "";
  check(
    "Bob (a member) creates his own project in his own project folder",
    bobCreated.status === 200 &&
      bobProjectId !== "" &&
      bobAgentId !== "" &&
      bobFolder.startsWith(join(await realpath(root), "member-projects", bobId)),
    { status: bobCreated.status, text: bobCreated.text.slice(0, 300) },
  );
  writeFileSync(join(bobFolder, "secret-plan.md"), "# Bob's own notes\n");
  const bobStarted = await call("POST", PROJECTS_V1_ROUTES.startChat, {
    token: bobToken,
    body: { input: { projectId: bobProjectId, agentId: bobAgentId, text: "Bob question about his own notes" } },
  });
  const bobChat = isDynamicRecord(bobStarted.body) ? bobStarted.body : null;
  const bobTaskId = bobChat && typeof bobChat.taskId === "string" ? bobChat.taskId : "";
  await waitFor(
    "Bob's chat ends",
    () => projects.getChat({ agentId: bobAgentId, taskId: bobTaskId }).state,
    (state) => state === "idle",
  );
  check("Bob starts a chat in his own project and it runs", bobStarted.status === 200 && bobTaskId !== "", {
    status: bobStarted.status,
  });
  const bobList = await call("POST", PROJECTS_V1_ROUTES.list, { token: bobToken, body: {} });
  const bobChats = await call("POST", PROJECTS_V1_ROUTES.listChats, {
    token: bobToken,
    body: { input: { projectId: bobProjectId } },
  });
  const bobGetChat = await call("POST", PROJECTS_V1_ROUTES.getChat, {
    token: bobToken,
    body: { input: { agentId: bobAgentId, taskId: bobTaskId } },
  });
  check(
    "Bob sees his own project and his own chat",
    bobList.status === 200 &&
      bobList.text.includes(bobProjectId) &&
      bobChats.status === 200 &&
      bobChats.text.includes(bobTaskId) &&
      bobGetChat.status === 200,
    { list: bobList.status, chats: bobChats.status, chat: bobGetChat.status },
  );
  const bobTarget: ChatTarget = {
    agentId: bobAgentId,
    taskId: bobTaskId,
    text: "Bob question about his own notes",
    file: "Bob's own notes",
  };
  const bobOwn = await memberView(bobToken, bobTarget);
  check("Bob sees the agent of his own project, its chat and its messages", seen(bobOwn), bobOwn);
  const bobRoots = await call("POST", EXPLORER_ROUTES.roots, {
    token: bobToken,
    body: { input: { agentId: bobAgentId } },
  });
  const bobReadsOwn = await call("POST", EXPLORER_ROUTES.read, {
    token: bobToken,
    body: { input: { scope: { agentId: bobAgentId }, path: join(bobFolder, "secret-plan.md") } },
  });
  check(
    "Bob opens the file tree of his own project and reads his own file",
    bobRoots.status === 200 && bobReadsOwn.status === 200 && bobReadsOwn.text.includes("own notes"),
    { roots: bobRoots.status, read: bobReadsOwn.status },
  );
  const bobReadsOwner = await call("POST", EXPLORER_ROUTES.read, {
    token: bobToken,
    body: { input: { scope: { agentId: bobAgentId }, path: join(folder, "secret-plan.md") } },
  });
  check(
    "Bob cannot read the owner's file through the file tree of his own project",
    bobReadsOwner.status >= 400 && !bobReadsOwner.text.includes("secret plan"),
    bobReadsOwner.status,
  );

  const carolOfBob = await memberView(carolToken, bobTarget);
  check("Carol does not see Bob's agent, chat, messages or files", hidden(carolOfBob), carolOfBob);
  const carolReads: Record<string, number> = {};
  let carolLeaked = false;
  for (const [path, body] of [
    [PROJECTS_V1_ROUTES.get, { input: bobProjectId }],
    [PROJECTS_V1_ROUTES.listChats, { input: { projectId: bobProjectId } }],
    [PROJECTS_V1_ROUTES.getChat, { input: { agentId: bobAgentId, taskId: bobTaskId } }],
    [PROJECTS_V1_ROUTES.startChat, { input: { projectId: bobProjectId, agentId: bobAgentId, text: "Carol here" } }],
    [EXPLORER_ROUTES.roots, { input: { agentId: bobAgentId } }],
  ] as const) {
    const answer = await call("POST", path, { token: carolToken, body });
    carolReads[path] = answer.status;
    if (answer.text.includes(bobTaskId) || answer.text.includes("own notes")) carolLeaked = true;
  }
  const carolList = await call("POST", PROJECTS_V1_ROUTES.list, { token: carolToken, body: {} });
  check(
    "Carol gets 403 on Bob's project, chats and file tree, and her project list does not show it",
    Object.values(carolReads).every((status) => status === 403) &&
      !carolLeaked &&
      carolList.status === 200 &&
      !carolList.text.includes(bobProjectId),
    { ...carolReads, list: carolList.status },
  );
  const ownerSeesBob = await call("POST", PROJECTS_V1_ROUTES.list, { token: ownerToken, body: {} });
  check(
    "the owner (an admin) still sees Bob's project",
    ownerSeesBob.status === 200 && ownerSeesBob.text.includes(bobProjectId),
    ownerSeesBob.status,
  );

  const bobAccess = await call("POST", AGENT_ACCESS_ROUTES.read, { token: ownerToken, body: {} });
  const bobRevision =
    isDynamicRecord(bobAccess.body) && typeof bobAccess.body.revision === "number" ? bobAccess.body.revision : 0;
  const sharedBob = await call("POST", AGENT_ACCESS_ROUTES.set, {
    token: ownerToken,
    body: {
      revision: bobRevision,
      everyone: { [agentId]: "none", [bobAgentId]: "view" },
      roles: [{ id: "shared-with-bob", name: "Shared with Bob", memberIds: [bobId], agents: { [agentId]: "view" } }],
    },
  });
  const carolSharedBob = await memberView(carolToken, bobTarget);
  check(
    "after the owner shares Bob's agent with everyone, Carol sees its chat",
    sharedBob.status === 200 && seen(carolSharedBob),
    carolSharedBob,
  );
  const bobStillManages = await memberView(bobToken, bobTarget);
  check("Bob still has his own agent after the share", seen(bobStillManages), bobStillManages);

  const bobAgent = await call("POST", TEAM_API_ROUTES.agents.all, {
    token: bobToken,
    body: {
      name: "Bob helper",
      description: "",
      avatarSeed: "bob-helper",
      avatarHue: null,
      initialMessage: "Bob first message to his helper",
    },
  });
  const helperId = isDynamicRecord(bobAgent.body) && typeof bobAgent.body.id === "string" ? bobAgent.body.id : "";
  const bobLists = await call("GET", TEAM_API_ROUTES.agents.all, { token: bobToken });
  const carolLists = await call("GET", TEAM_API_ROUTES.agents.all, { token: carolToken });
  const carolHelper = await call("GET", TEAM_API_ROUTES.agent.conversation(helperId), { token: carolToken });
  const bobHelper = await call("PATCH", TEAM_API_ROUTES.agent.one(helperId), {
    token: bobToken,
    body: { name: "Bob helper 2" },
  });
  check(
    "Bob creates his own agent outside a project, manages it, and Carol does not see it",
    bobAgent.status === 201 &&
      helperId !== "" &&
      bobLists.text.includes(helperId) &&
      bobHelper.status === 200 &&
      !carolLists.text.includes(helperId) &&
      carolHelper.status >= 400,
    { create: bobAgent.status, patch: bobHelper.status, carol: carolHelper.status },
  );
} catch (error) {
  failure = error instanceof Error ? (error.stack ?? error.message) : String(error);
  check("the scenario finished", false, failure);
} finally {
  if (stopServer) await stopServer();
  projectsRef?.stop();
  await run(agents.stop()).catch(() => undefined);
  database.close();
  await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => undefined);
}

const passed = checks.length > 0 && checks.every((entry) => entry.passed);
mkdirSync(OUT, { recursive: true });
const reportPath = join(OUT, "report.json");
writeFileSync(reportPath, `${JSON.stringify({ passed, checks, ...(failure ? { failure } : {}) }, null, 2)}\n`);
process.stdout.write(`Report: ${reportPath}\n`);
process.exit(passed ? 0 : 1);
