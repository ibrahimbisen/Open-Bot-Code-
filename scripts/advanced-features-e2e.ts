import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  ADVANCED_FEATURE_IDS,
  type AdvancedFeatureId,
  type AdvancedFeatureSettings,
  DEFAULT_ADVANCED_FEATURES,
  decodeAdvancedFeatureSettings,
} from "@codebot/contracts/ipc";
import { isDynamicRecord } from "@codebot/contracts/runtime-values";
import { TEAM_API_ROUTES } from "@codebot/contracts/team-api-routes";
import { TEAM_APP_VERSION_HEADER, TEAM_PROTOCOL_VERSION_HEADER } from "@codebot/contracts/team-protocol";
import {
  ADVANCED_FEATURES_CAPABILITY,
  ADVANCED_FEATURES_CODECS,
  ADVANCED_FEATURES_ROUTES,
} from "@codebot/contracts/team-protocol/advanced-features-v1";
import { teamCapabilitiesForProtocol, teamCapabilityHeaders } from "@codebot/contracts/team-protocol/current";
import { TEAM_PROTOCOL_V10 } from "@codebot/contracts/team-protocol/v10";
import { plugin } from "bun";
import { Effect } from "effect";
import type { AgentBrowserHost } from "../src/backend/agent/turn-lifecycle";
import { AgentService } from "../src/backend/agent-service";
import { AgentStore } from "../src/backend/agent-store";
import { CodeBotDatabase } from "../src/backend/codebot-database";
import { runCauseEffect } from "../src/backend/effect-boundary";
import { MailboxStore } from "../src/backend/mailbox-store";
import { SidebarLayoutStore } from "../src/backend/sidebar-layout-store";
import type { TeamApiBrowser } from "../src/main/team-api/dependencies";

const OUT = resolve(import.meta.dirname, "../.codebot-build/advanced-features");
const HOST_VERSION = "0.0.0-e2e";
const OWNER = { username: "owner-user", password: "owner-password-123" };
const MEMBER = { username: "member-user", password: "member-password-123" };
const STEP_DEADLINE_MS = 30_000;

plugin({
  name: "advanced-features-electron-boundary",
  setup(build) {
    class Inert {}
    build.module("electron", () => ({
      loader: "object",
      exports: {
        app: { getPath: () => tmpdir(), getVersion: () => HOST_VERSION, isPackaged: false, on: () => undefined },
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

const { TeamApiServer } = await import("../src/main/team-api-server");
const { AGENT_ACCESS_FILE, AgentAccessStore } = await import("../src/main/agent-access-store");
const { TeamStore } = await import("../src/main/team-store");
const { advancedFeaturesControl, createAdvancedFeaturesPreferenceStore } = await import(
  "../src/main/advanced-features-store"
);
const gate = await import("../src/backend/agent/advanced-feature-gate");
const catalog = await import("../src/backend/agent/tool-catalog");

interface Step {
  name: string;
  passed: boolean;
  detail?: unknown;
  error?: string;
}

const report: { passed: boolean; steps: Step[] } = { passed: false, steps: [] };

async function step<T>(name: string, run: () => Promise<T> | T): Promise<T> {
  process.stdout.write(`- ${name}\n`);
  let deadline: ReturnType<typeof setTimeout> | undefined;
  try {
    const value = await Promise.race([
      Promise.resolve().then(run),
      new Promise<never>((_, reject) => {
        deadline = setTimeout(() => reject(new Error(`No result within ${STEP_DEADLINE_MS} ms.`)), STEP_DEADLINE_MS);
      }),
    ]);
    report.steps.push({ name, passed: true, detail: value ?? null });
    return value;
  } catch (error) {
    report.steps.push({ name, passed: false, error: error instanceof Error ? error.message : String(error) });
    throw error;
  } finally {
    clearTimeout(deadline);
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
const teamBrowser: TeamApiBrowser = {
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

const root = await mkdtemp(join(tmpdir(), "codebot-advanced-features-"));
const userData = join(root, "user-data");
const home = join(root, "home");
const preferencePath = join(userData, "codebot-advanced-features-v1.json");

type Host = {
  database: CodeBotDatabase;
  agents: AgentService;
  server: InstanceType<typeof TeamApiServer>;
  team: InstanceType<typeof TeamStore>;
  port: number;
  control: ReturnType<typeof advancedFeaturesControl>;
};

let host: Host | null = null;

async function startHost(): Promise<Host> {
  const database = new CodeBotDatabase(userData);
  const agentStore = new AgentStore(userData, home, database);
  const mailbox = new MailboxStore(userData, agentStore.sharedRoot, agentStore.database);
  const sidebar = new SidebarLayoutStore(join(userData, "sidebar-layout.json"));
  const team = new TeamStore(join(userData, "codebot-team-server-v2.json"));
  const access = new AgentAccessStore(join(userData, AGENT_ACCESS_FILE));
  await runCauseEffect(sidebar.initialize());
  await runCauseEffect(agentStore.initialize());
  await runCauseEffect(mailbox.initialize());
  await runCauseEffect(team.initialize());
  assert.equal(await runCauseEffect(access.load()), true, "The roles file did not load.");
  if (!team.getIdentity()) await runCauseEffect(team.configure("E2E Host", OWNER.username, OWNER.password));
  const agents = new AgentService({ store: agentStore, mailbox, browser: agentBrowser, sidebarLayout: sidebar });
  const store = createAdvancedFeaturesPreferenceStore(preferencePath);
  await Effect.runPromise(store.load());
  const control = advancedFeaturesControl(store);
  gate.configureAdvancedFeatureGate(() => control.get());
  const server = new TeamApiServer({
    store: team,
    agents,
    mailbox,
    browser: teamBrowser,
    sidebarLayout: sidebar,
    appVersion: HOST_VERSION,
    hiddenAgents: agents,
    agentAccess: access,
    admin: { advancedFeatures: control },
  });
  const port = await Effect.runPromise(server.start());
  return { database, agents, server, team, port, control };
}

async function stopHost(): Promise<void> {
  if (!host) return;
  const stopping = host;
  host = null;
  await Effect.runPromise(stopping.server.stop()).catch(() => undefined);
  await runCauseEffect(stopping.agents.stop()).catch(() => undefined);
  stopping.database.close();
}

function current(): Host {
  assert.ok(host, "The host is not running.");
  return host;
}

async function call(
  path: string,
  input: { token?: string; body?: unknown; capabilities?: readonly string[] } = {},
): Promise<{ status: number; body: unknown }> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    [TEAM_PROTOCOL_VERSION_HEADER]: String(TEAM_PROTOCOL_V10),
    [TEAM_APP_VERSION_HEADER]: HOST_VERSION,
    ...teamCapabilityHeaders(TEAM_PROTOCOL_V10, input.capabilities ?? teamCapabilitiesForProtocol(TEAM_PROTOCOL_V10)),
  };
  if (input.token) headers.Authorization = `Bearer ${input.token}`;
  const response = await fetch(`http://127.0.0.1:${current().port}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(input.body ?? {}),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

async function login(credentials: { username: string; password: string }): Promise<string> {
  const response = await call(TEAM_API_ROUTES.auth.login, { body: credentials });
  assert.equal(response.status, 200, `Sign-in returned ${response.status}: ${JSON.stringify(response.body)}`);
  assert.ok(isDynamicRecord(response.body) && typeof response.body.sessionToken === "string");
  return response.body.sessionToken;
}

function settingsOf(body: unknown): AdvancedFeatureSettings {
  const codec = ADVANCED_FEATURES_CODECS.get(ADVANCED_FEATURES_ROUTES.settings);
  assert.ok(codec);
  codec.response(200, body);
  return decodeAdvancedFeatureSettings(body);
}

const GATED_TOOLS = new Map<AdvancedFeatureId, readonly string[]>([
  ["routines", ["list_routines", "create_routine", "create_webhook_routine"]],
  ["channels", ["list_channels", "send_to_channel", "create_channel"]],
  ["marketplace", ["suggest_marketplace_app"]],
  ["chatApps", ["messaging_post", "messaging_list_places"]],
]);

function offered(): Set<string> {
  return new Set(catalog.visibleToolDefinitions("claude").map((tool) => tool.name));
}

try {
  mkdirSync(OUT, { recursive: true });
  host = await startHost();
  const ownerToken = await login(OWNER);

  const memberToken = await step("setup: an owner and a member join the server", async () => {
    const invite = await runCauseEffect(current().team.createInvite("member"));
    const joined = await call(TEAM_API_ROUTES.join.server, { body: { inviteToken: invite.token, ...MEMBER } });
    assert.equal(joined.status, 201, `Join returned ${joined.status}.`);
    return login(MEMBER);
  });

  await step("default: every switch is off and the host offers the capability", async () => {
    const read = await call(ADVANCED_FEATURES_ROUTES.settings, { token: ownerToken });
    assert.equal(read.status, 200, JSON.stringify(read.body));
    assert.deepEqual(settingsOf(read.body), { ...DEFAULT_ADVANCED_FEATURES });
    assert.ok(Object.values(DEFAULT_ADVANCED_FEATURES).every((value) => value === false));
    assert.ok(teamCapabilitiesForProtocol(TEAM_PROTOCOL_V10).includes(ADVANCED_FEATURES_CAPABILITY));
  });

  await step("agent tools: off means the hidden tools are not offered", () => {
    const names = offered();
    for (const [feature, tools] of GATED_TOOLS)
      for (const tool of tools) {
        assert.ok(gate.toolHiddenByAdvancedFeature(tool), `${tool} (${feature}) should be hidden.`);
        assert.ok(!names.has(tool), `${tool} (${feature}) is offered while off.`);
      }
    return { offeredCount: names.size };
  });

  await step("refusals: no capability gets 400, a member cannot change, bad input gets 400", async () => {
    const old = await call(ADVANCED_FEATURES_ROUTES.settings, {
      token: ownerToken,
      capabilities: teamCapabilitiesForProtocol(TEAM_PROTOCOL_V10).filter(
        (capability) => capability !== ADVANCED_FEATURES_CAPABILITY,
      ),
    });
    assert.equal(old.status, 400, JSON.stringify(old.body));
    const memberRead = await call(ADVANCED_FEATURES_ROUTES.settings, { token: memberToken });
    assert.equal(memberRead.status, 200, "A member can read the switches.");
    const memberChange = await call(ADVANCED_FEATURES_ROUTES.update, {
      token: memberToken,
      body: { feature: "routines", enabled: true },
    });
    assert.equal(memberChange.status, 403, JSON.stringify(memberChange.body));
    const invalid = await call(ADVANCED_FEATURES_ROUTES.update, {
      token: ownerToken,
      body: { feature: "nothing", enabled: true },
    });
    assert.equal(invalid.status, 400, JSON.stringify(invalid.body));
    assert.equal(current().control.get().routines, false);
  });

  for (const feature of ADVANCED_FEATURE_IDS) {
    await step(`switch ${feature}: the owner turns it on and off through the team API`, async () => {
      const on = await call(ADVANCED_FEATURES_ROUTES.update, { token: ownerToken, body: { feature, enabled: true } });
      assert.equal(on.status, 200, JSON.stringify(on.body));
      const onSettings = settingsOf(on.body);
      assert.equal(onSettings[feature], true);
      for (const other of ADVANCED_FEATURE_IDS) if (other !== feature) assert.equal(onSettings[other], false);
      const tools = GATED_TOOLS.get(feature) ?? [];
      for (const tool of tools) assert.equal(gate.toolHiddenByAdvancedFeature(tool), false, `${tool} still hidden.`);
      const off = await call(ADVANCED_FEATURES_ROUTES.update, { token: ownerToken, body: { feature, enabled: false } });
      assert.equal(off.status, 200);
      assert.deepEqual(settingsOf(off.body), { ...DEFAULT_ADVANCED_FEATURES });
      for (const tool of tools) assert.ok(gate.toolHiddenByAdvancedFeature(tool), `${tool} not hidden again.`);
    });
  }

  await step("persist: the switches survive a host restart", async () => {
    const turnOn = await call(ADVANCED_FEATURES_ROUTES.update, {
      token: ownerToken,
      body: { feature: "marketplace", enabled: true },
    });
    assert.equal(turnOn.status, 200);
    const file = decodeAdvancedFeatureSettings(JSON.parse(readFileSync(preferencePath, "utf8")));
    assert.equal(file.marketplace, true);
    await stopHost();
    host = await startHost();
    const token = await login(OWNER);
    const read = await call(ADVANCED_FEATURES_ROUTES.settings, { token });
    assert.deepEqual(settingsOf(read.body), { ...DEFAULT_ADVANCED_FEATURES, marketplace: true });
    assert.equal(gate.toolHiddenByAdvancedFeature("suggest_marketplace_app"), false);
    assert.equal(gate.toolHiddenByAdvancedFeature("list_routines"), true);
  });

  report.passed = true;
} catch (error) {
  process.stderr.write(`${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`);
} finally {
  await stopHost();
  await rm(root, { recursive: true, force: true }).catch(() => undefined);
  mkdirSync(OUT, { recursive: true });
  writeFileSync(
    join(OUT, "report.json"),
    `${JSON.stringify({ passed: report.passed, checks: report.steps }, null, 2)}\n`,
  );
  process.stdout.write(`${report.passed ? "PASSED" : "FAILED"}: ${join(OUT, "report.json")}\n`);
  process.exit(report.passed ? 0 : 1);
}
