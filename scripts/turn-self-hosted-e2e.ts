import { createHmac } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { decodeSignalServerMessage } from "@codebot/contracts/signal-protocol/decode";
import {
  type AccountService,
  api,
  Checks,
  closeAll,
  freePort,
  ROOT,
  registerHost,
  signIn,
  startAccountService,
  startRemoteSession,
  textField,
} from "./account-e2e-support";
import { type OidcMock, startOidcMock } from "./oidc-mock-server";
import { connect, iceUrls, type SignalProcess, startSignal, stopSignal } from "./signal-e2e-support";
import { allocateRelay, startTurnStandIn, type TurnStandIn } from "./turn-stand-in";

const CLIENT_ID = "codebot-turn-e2e";
const CLIENT_SECRET = "e2e-client-secret-7c2e94b1d05a";
const WEBHOOK_SECRET = "e2e-turn-webhook-secret-with-48-bytes-minimum-0123456789ab";
const SESSION_SECRET = "e2e-turn-session-secret-with-48-bytes-minimum-0123456789ab";
const TURN_SECRET = "e2e-turn-relay-shared-secret-with-48-bytes-minimum-01234567";
const TURN_HOST = "127.0.0.1";
const ALICE = { user: "alice", password: "alice-password-1" };
const CLIENT_SOURCES = ["packages/team-client/src", "src/main", "src/renderer/src", "src/preload"];
const ICE_LITERAL = /["'`](?:stun|turns?):(?:[a-z0-9-]+\.)+[a-z0-9-]+/iu;

const checks = new Checks();

function relayCredential(message: unknown): { username: string; credential: string } | null {
  const decoded = decodeSignalServerMessage(message);
  const servers = decoded?.type === "ready" ? decoded.iceServers : [];
  for (const server of servers) {
    if (server.username && server.credential) return { username: server.username, credential: server.credential };
  }
  return null;
}

async function sourceFiles(folder: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(join(ROOT, folder), { withFileTypes: true, recursive: true })) {
    if (!entry.isFile() || !/\.(?:ts|tsx)$/u.test(entry.name) || /\.(?:test|spec)\.tsx?$/u.test(entry.name)) continue;
    files.push(join(entry.parentPath, entry.name));
  }
  return files;
}

async function main(): Promise<void> {
  const accountPort = await freePort();
  const signalPort = await freePort();
  const healthPort = await freePort();
  const turn: TurnStandIn = await startTurnStandIn(TURN_SECRET);
  const mock: OidcMock = await startOidcMock({
    mode: "oidc",
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    redirectUri: `http://127.0.0.1:${accountPort}/v1/auth/oidc/callback`,
    users: [{ id: ALICE.user, password: ALICE.password, displayName: "Alice Example", email: null }],
  });
  const resources: { services: AccountService[]; signal: SignalProcess | null } = { services: [], signal: null };
  try {
    const service = await startAccountService({
      port: accountPort,
      provider: { issuerUrl: mock.origin },
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      environment: {
        REMOTE_SIGNAL_URL: `ws://127.0.0.1:${signalPort}/v1/signal`,
        REMOTE_AUTH_WEBHOOK_URL: `http://127.0.0.1:${signalPort}/internal/auth-events`,
        REMOTE_AUTH_WEBHOOK_SECRET: WEBHOOK_SECRET,
      },
    });
    resources.services.push(service);
    const signal = await startSignal({
      port: signalPort,
      healthPort,
      jwksUrl: `${service.origin}/.well-known/jwks.json`,
      controlPlaneUrl: service.origin,
      sessionSecret: SESSION_SECRET,
      webhookSecret: WEBHOOK_SECRET,
      turnSecret: TURN_SECRET,
      turnHost: TURN_HOST,
      turnPort: turn.port,
    });
    resources.signal = signal;

    const health = await fetch(`http://127.0.0.1:${signalPort}/health/turn`);
    const healthBody = await health.json().catch(() => null);
    checks.add(
      "Signal probes the self-hosted TURN relay on this computer with a real Allocate and reports it ready",
      health.status === 200 && turn.allocations.some((entry) => entry.username.endsWith(":codebot-status-probe")),
      { status: health.status, body: healthBody, allocations: turn.allocations.length },
    );

    const alice = await signIn(service, ALICE);
    const host = await registerHost(service.origin, alice.sessionToken, "Alice home server");
    const hostTicket = await api(service.origin, `/v2/remote/hosts/${host.hostId}/ticket`, {
      body: { machineToken: host.machineToken },
    });
    const signalUrl = textField(hostTicket.body, "signalUrl");
    const hostPeer = await connect(signalUrl);
    hostPeer.send({ type: "hello", version: 1, peer: "host", token: textField(hostTicket.body, "ticket") });
    const hostReady = await hostPeer.next("ready").catch(() => null);
    checks.add("the host gets its ready message from Signal", hostReady !== null, hostPeer.messages.slice(0, 2));

    const sessionId = await startRemoteSession(service.origin, alice.sessionToken, host.hostId);
    const clientTicket = await api(service.origin, `/v2/remote/sessions/${sessionId}/ticket`, {
      token: alice.sessionToken,
      body: { clientPublicKey: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" },
    });
    const clientPeer = await connect(signalUrl);
    clientPeer.send({ type: "hello", version: 1, peer: "client", token: textField(clientTicket.body, "ticket") });
    const clientReady = await clientPeer.next("ready").catch(() => null);
    if (!hostReady || !clientReady) throw new Error("Signal gave no ready message.");

    const expected = new Set([
      `stun:${TURN_HOST}:${turn.port}`,
      `turn:${TURN_HOST}:${turn.port}?transport=udp`,
      `turn:${TURN_HOST}:${turn.port}?transport=tcp`,
    ]);
    for (const [peer, message] of [
      ["host", hostReady],
      ["client", clientReady],
    ] as const) {
      const decoded = decodeSignalServerMessage(message);
      const configured = decoded?.type === "ready" ? decoded.iceServers : [];
      const urls = configured.flatMap((server) => (Array.isArray(server.urls) ? server.urls : [server.urls]));
      checks.add(
        `the ${peer} connection config that the desktop decodes points only to the self-hosted TURN URL`,
        urls.length > 0 &&
          [...expected].every((url) => urls.includes(url)) &&
          urls.every((url) => new URL(url.replace(/^(stun|turns?):/u, "http://")).hostname === TURN_HOST),
        urls,
      );
      checks.add(
        `the ${peer} config decoded by the desktop is the one that Signal sent`,
        JSON.stringify(iceUrls(message)) === JSON.stringify(urls),
      );
    }

    const credential = relayCredential(clientReady);
    const expiry = Number(credential?.username.split(":", 1)[0] ?? 0);
    const nowSeconds = Math.floor(Date.now() / 1000);
    checks.add(
      "the relay credential is a short-lived coturn REST credential of the shared secret",
      (credential?.username.endsWith(`:${sessionId}`) ?? false) &&
        expiry > nowSeconds &&
        expiry <= nowSeconds + 3_600 + 5 &&
        credential?.credential ===
          createHmac("sha1", TURN_SECRET)
            .update(credential?.username ?? "")
            .digest("base64"),
      credential ? { username: credential.username, expiresInSeconds: expiry - nowSeconds } : null,
    );
    if (!credential) throw new Error("Signal gave no relay credential.");

    const relayed = await allocateRelay(TURN_HOST, turn.port, credential.username, credential.credential);
    checks.add(
      "the self-hosted TURN relay allocates a relay address for the credential that Signal issued",
      relayed.allocated && turn.allocations.some((entry) => entry.username === credential.username),
      relayed,
    );
    const forged = await allocateRelay(TURN_HOST, turn.port, credential.username, `${credential.credential}x`);
    checks.add("the relay refuses a wrong password", !forged.allocated && forged.errorCode === 401, forged);
    const stale = `${nowSeconds - 10}:${sessionId}`;
    const expired = await allocateRelay(
      TURN_HOST,
      turn.port,
      stale,
      createHmac("sha1", TURN_SECRET).update(stale).digest("base64"),
    );
    checks.add("the relay refuses an expired credential", !expired.allocated && expired.errorCode === 401, expired);

    const literals: string[] = [];
    for (const folder of CLIENT_SOURCES) {
      for (const file of await sourceFiles(folder)) {
        const text = await readFile(file, "utf8");
        text.split(/\r?\n/u).forEach((line, index) => {
          if (ICE_LITERAL.test(line)) literals.push(`${relative(ROOT, file)}:${index + 1}`);
        });
      }
    }
    checks.add(
      "the desktop has no built-in STUN or TURN host: it uses only the servers that the self-hosted Signal sends",
      literals.length === 0,
      literals,
    );

    hostPeer.close();
    clientPeer.close();
    const stopped = await service.stop();
    checks.add("the account service stops clean", stopped.clean, stopped);
  } finally {
    if (resources.signal) await stopSignal(resources.signal);
    await closeAll({ mocks: [mock], services: resources.services });
    turn.stop();
  }
}

let exitCode = 1;
try {
  await main();
} catch (error) {
  checks.add("the scenario finished", false, error instanceof Error ? error.message : String(error));
} finally {
  exitCode = (await checks.writeReport("turn-self-hosted")) ? 0 : 1;
}
process.exit(exitCode);
