import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { CentralAuthState, HostStatus } from "@codebot/contracts/ipc";
import { createCodeBotLogger } from "@codebot/logging";
import { Effect } from "effect";
import { runCauseEffect } from "../src/backend/effect-boundary";
import { ServerMode, type ServerModeOptions } from "../src/main/server-mode";
import { ServerSetupPage } from "../src/main/server-setup-page";

const logger = createCodeBotLogger("server-setup-page-e2e");
const ROOT = resolve(import.meta.dirname, "..");
const OUT = resolve(ROOT, ".codebot-build/server-setup-page-e2e");

const EMAIL = "owner@example.com";
const CODE = "K7PQ-R2MX";
const CHALLENGE = "challenge-e2e";

let account: CentralAuthState = { status: "signed_out" };
let session = false;
const centralAuth: ServerModeOptions["centralAuth"] = {
  getState: () => structuredClone(account),
  hasSession: () => session,
  retry: () =>
    Effect.sync(() => {
      if (account.status === "error" && session) {
        account = { status: "signed_in", user: { id: "user-e2e", email: EMAIL, name: null, avatarUrl: null } };
      } else if (account.status === "error") {
        account = { status: "signed_out" };
      }
      return structuredClone(account);
    }),
  canPersistSession: () => true,
  redeemServerClaim: () => Effect.succeed(null),
  logout: () =>
    Effect.sync(() => {
      account = { status: "signed_out" };
      session = false;
      return structuredClone(account);
    }),
  createMobileConnect: () => Effect.die(new Error("The setup page must not make a Mobile Connect code.")),
};

let hostStatus: HostStatus = {
  phase: "idle",
  configured: false,
  enabledOnLaunch: false,
  serverId: null,
  serverName: null,
  apiUrl: null,
  logoUrl: null,
  appearance: null,
  apiOnline: false,
  remoteDesktopReady: false,
  remoteDesktopScreenRecordingDenied: false,
  remoteDesktopNeedsX11Session: false,
  remoteDesktopUnattended: false,
  remoteDesktopActiveSessions: 0,
  remoteDesktopMaxSessions: 0,
  message: null,
};
const host: ServerModeOptions["host"] = {
  getStatus: () => structuredClone(hostStatus),
  configure: (input) =>
    Effect.sync(() => {
      hostStatus = { ...hostStatus, configured: true, serverName: input.serverName, serverId: "server-e2e" };
      return structuredClone(hostStatus);
    }),
  updateIdentity: (input) =>
    Effect.sync(() => {
      hostStatus = { ...hostStatus, serverName: input.serverName ?? hostStatus.serverName };
      return structuredClone(hostStatus);
    }),
  start: () =>
    Effect.sync(() => {
      hostStatus = { ...hostStatus, phase: "starting" };
      setTimeout(() => {
        hostStatus = { ...hostStatus, phase: "online", apiOnline: true };
      }, 1000);
      return structuredClone(hostStatus);
    }),
  getMobileConnectHost: () => null,
  refreshRegistration: () => Effect.void,
};

const runtime = await mkdtemp(join(tmpdir(), "codebot-setup-page-"));
const rendererRoot = join(runtime, "renderer");
mkdirSync(rendererRoot);
writeFileSync(join(rendererRoot, "server-setup.html"), "<!doctype html><title>setup</title>");
const serverMode = new ServerMode({
  environment: { controlSocketPath: join(runtime, "control.sock"), setupPagePort: null },
  version: "0.0.0-e2e",
  centralAuth,
  host,
  memory: null,
  onError: (message, error) => logger.warn(message, error),
});
const port = await freePort();
const page = new ServerSetupPage({
  port,
  address: "127.0.0.1",
  rendererRoot,
  request: serverMode.setupRequest,
  onError: (message, error) => logger.warn(message, error),
});
await runCauseEffect(page.listen());
const origin = `http://127.0.0.1:${port}`;

interface Checks {
  page?: { status: number; policy: string };
  refusals?: Record<
    "noHeader" | "crossSite" | "textPlainPost" | "logout" | "claim" | "mobileConnect" | "pathEscape" | "sourceFile",
    number
  >;
  emailSignInRemoved?: { start: number; verify: number };
  retryKeepsSession?: string | number | undefined;
}
const checks: Checks = {};
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

try {
  const pageResponse = await fetch(`${origin}/`);
  assert.equal(pageResponse.status, 200);
  const policy = pageResponse.headers.get("content-security-policy") ?? "";
  assert.match(policy, /default-src 'none'/u);
  assert.match(policy, /script-src 'self'(;|$)/u);
  assert.match(policy, /form-action 'none'/u);
  checks.page = { status: pageResponse.status, policy };

  const refusals = {
    noHeader: (await fetch(`${origin}/api/status`)).status,
    crossSite: (
      await fetch(`${origin}/api/status`, { headers: { "x-codebot-setup": "1", "sec-fetch-site": "cross-site" } })
    ).status,
    textPlainPost: (
      await fetch(`${origin}/api/login/start`, {
        method: "POST",
        headers: { "x-codebot-setup": "1", "content-type": "text/plain" },
        body: `email=${EMAIL}`,
      })
    ).status,
    logout: (await fetch(`${origin}/api/logout`, { method: "POST", headers: { "x-codebot-setup": "1" } })).status,
    claim: (await fetch(`${origin}/api/login/claim`, { method: "POST", headers: { "x-codebot-setup": "1" } })).status,
    mobileConnect: (
      await fetch(`${origin}/api/mobile-connect`, { method: "POST", headers: { "x-codebot-setup": "1" } })
    ).status,
    pathEscape: (await fetch(`${origin}/assets/..%2F..%2Fpackage.json`)).status,
    sourceFile: (await fetch(`${origin}/index.html`)).status,
  };
  assert.deepEqual(refusals, {
    noHeader: 403,
    crossSite: 403,
    textPlainPost: 403,
    logout: 404,
    claim: 404,
    mobileConnect: 404,
    pathEscape: 404,
    sourceFile: 404,
  });
  checks.refusals = refusals;

  const start = await postForm("/api/login/start", { email: EMAIL });
  assert.equal(start.status, 410);
  assert.deepEqual(await start.json(), { error: "email_sign_in_removed" });
  const verify = await postForm("/api/login/verify", { challenge: CHALLENGE, code: CODE });
  assert.equal(verify.status, 410);
  assert.deepEqual(await verify.json(), { error: "email_sign_in_removed" });
  checks.emailSignInRemoved = { start: start.status, verify: verify.status };

  account = { status: "signed_in", user: { id: "user-e2e", email: EMAIL, name: null, avatarUrl: null } };
  session = true;

  const signedIn = account;
  account = { status: "error", issue: { code: "auth_api_unavailable", message: "The account service is down." } };
  const retried = await postForm("/api/retry", {});
  const retriedValues = await retried.json();
  assert.equal(retriedValues.account, "signed_in");
  assert.deepEqual(account, signedIn);
  checks.retryKeepsSession = retriedValues.account;

  const report = {
    ok: true,
    checks,
  };
  writeFileSync(join(OUT, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  logger.info(`Setup page e2e passed. Report: ${join(OUT, "report.json")}`);
} catch (error) {
  writeFileSync(join(OUT, "report.json"), `${JSON.stringify({ ok: false, checks, error: String(error) }, null, 2)}\n`);
  throw error;
} finally {
  await runCauseEffect(page.close());
  rmSync(runtime, { recursive: true, force: true });
}

function postForm(path: string, fields: Record<string, string>): Promise<Response> {
  return fetch(`${origin}${path}`, {
    method: "POST",
    headers: { "x-codebot-setup": "1", "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields).toString(),
  });
}

function freePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      probe.close(() =>
        typeof address === "object" && address ? resolvePort(address.port) : reject(new Error("No port.")),
      );
    });
  });
}
