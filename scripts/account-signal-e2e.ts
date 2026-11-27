import { type ChildProcess, spawn } from "node:child_process";
import { type DynamicRecord, isDynamicRecord, isString } from "@codebot/contracts/runtime-values";
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

const CLIENT_ID = "codebot-e2e";
const CLIENT_SECRET = "e2e-client-secret-2b6f8d0a4c71";
const WEBHOOK_SECRET = "e2e-signal-webhook-secret-with-48-bytes-minimum-0123456789";
const SESSION_SECRET = "e2e-signal-session-secret-with-48-bytes-minimum-0123456789";
const TURN_SECRET = "e2e-turn-shared-secret-with-48-bytes-minimum-0123456789ab";
const TURN_HOST = "turn.codebot-test.example";
const ALICE = { user: "alice", password: "alice-password-1" };
const START_LIMIT_MS = 30_000;
const WAIT_LIMIT_MS = 20_000;

const checks = new Checks();

interface SignalProcess {
  child: ChildProcess;
  logs: string[];
  exited: Promise<number | null>;
}

interface Peer {
  messages: DynamicRecord[];
  closed: Promise<{ code: number; reason: string }>;
  send(message: DynamicRecord): void;
  next(type: string): Promise<DynamicRecord>;
  close(): void;
}

async function startSignal(input: {
  port: number;
  healthPort: number;
  jwksUrl: string;
  controlPlaneUrl: string;
}): Promise<SignalProcess> {
  const child = spawn(process.execPath, ["--no-env-file", "remote/api/src/index.ts"], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      REMOTE_TLS_DISABLED: "true",
      REMOTE_SIGNAL_HOST: "127.0.0.1",
      REMOTE_SIGNAL_PORT: String(input.port),
      REMOTE_HEALTH_PORT: String(input.healthPort),
      REMOTE_TICKET_JWKS_URL: input.jwksUrl,
      REMOTE_CONTROL_PLANE_URL: input.controlPlaneUrl,
      REMOTE_SESSION_SECRET: SESSION_SECRET,
      REMOTE_AUTH_WEBHOOK_SECRET: WEBHOOK_SECRET,
      TURN_SHARED_SECRET: TURN_SECRET,
      TURN_HOST,
    },
  });
  const logs: string[] = [];
  const keep = (chunk: Buffer) => {
    for (const line of chunk.toString("utf8").split(/\r?\n/u)) if (line) logs.push(line);
  };
  child.stdout?.on("data", keep);
  child.stderr?.on("data", keep);
  const exited = new Promise<number | null>((done) => child.once("exit", (code) => done(code)));
  const deadline = Date.now() + START_LIMIT_MS;
  for (;;) {
    const answer = await fetch(`http://127.0.0.1:${input.healthPort}/health/ready`).catch(() => null);
    if (answer?.ok) break;
    if (child.exitCode !== null || Date.now() > deadline) {
      child.kill();
      throw new Error(`Signal did not start.\n${logs.join("\n")}`);
    }
    await new Promise((next) => setTimeout(next, 200));
  }
  return { child, logs, exited };
}

async function stopSignal(signal: SignalProcess): Promise<void> {
  if (signal.child.exitCode !== null) return;
  signal.child.kill();
  await Promise.race([signal.exited, new Promise((done) => setTimeout(done, 10_000))]);
}

function connect(url: string): Promise<Peer> {
  return new Promise((ready, reject) => {
    const socket = new WebSocket(url);
    const messages: DynamicRecord[] = [];
    const waiting: { type: string; resolve: (message: DynamicRecord) => void }[] = [];
    let closeResolve: (value: { code: number; reason: string }) => void = () => undefined;
    const closed = new Promise<{ code: number; reason: string }>((done) => {
      closeResolve = done;
    });
    socket.addEventListener("message", (event) => {
      const parsed = isString(event.data) ? JSON.parse(event.data) : null;
      if (!isDynamicRecord(parsed)) return;
      messages.push(parsed);
      const index = waiting.findIndex((entry) => entry.type === parsed.type);
      const entry = index >= 0 ? waiting.splice(index, 1)[0] : undefined;
      entry?.resolve(parsed);
    });
    socket.addEventListener("close", (event) => closeResolve({ code: event.code, reason: event.reason }));
    socket.addEventListener("error", () => reject(new Error("The Signal socket failed.")));
    socket.addEventListener("open", () =>
      ready({
        messages,
        closed,
        send: (message) => socket.send(JSON.stringify(message)),
        next: (type) => {
          const found = messages.find((message) => message.type === type);
          if (found) return Promise.resolve(found);
          return new Promise((resolve, rejectNext) => {
            const timer = setTimeout(() => rejectNext(new Error(`No ${type} message arrived.`)), WAIT_LIMIT_MS);
            waiting.push({
              type,
              resolve: (message) => {
                clearTimeout(timer);
                resolve(message);
              },
            });
          });
        },
        close: () => socket.close(),
      }),
    );
  });
}

function iceUrls(message: DynamicRecord): string[] {
  const servers = Array.isArray(message.iceServers) ? message.iceServers : [];
  const urls: string[] = [];
  for (const server of servers) {
    if (!isDynamicRecord(server)) continue;
    const list = Array.isArray(server.urls) ? server.urls : [server.urls];
    for (const url of list) if (isString(url)) urls.push(url);
  }
  return urls;
}

async function main(): Promise<void> {
  const accountPort = await freePort();
  const signalPort = await freePort();
  const healthPort = await freePort();
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
        ACCOUNT_REVALIDATE_SECONDS: "1",
      },
    });
    resources.services.push(service);
    const signal = await startSignal({
      port: signalPort,
      healthPort,
      jwksUrl: `${service.origin}/.well-known/jwks.json`,
      controlPlaneUrl: service.origin,
    });
    resources.signal = signal;
    checks.add("the self-hosted Signal starts with the key set of the account service", true);

    const alice = await signIn(service, ALICE);
    const host = await registerHost(service.origin, alice.sessionToken, "Alice home server");
    const hostTicketAnswer = await api(service.origin, `/v2/remote/hosts/${host.hostId}/ticket`, {
      body: { machineToken: host.machineToken },
    });
    const signalUrl = textField(hostTicketAnswer.body, "signalUrl");
    checks.add(
      "the host ticket names the Signal address that the owner configured",
      signalUrl === `ws://127.0.0.1:${signalPort}/v1/signal`,
      signalUrl,
    );

    const hostPeer = await connect(signalUrl);
    hostPeer.send({ type: "hello", version: 1, peer: "host", token: textField(hostTicketAnswer.body, "ticket") });
    const hostReady = await hostPeer.next("ready").catch(() => null);
    checks.add(
      "Signal accepts the host ticket of the account service",
      hostReady !== null,
      hostPeer.messages.slice(0, 3),
    );
    const urls = hostReady ? iceUrls(hostReady) : [];
    checks.add(
      "Signal gives relay credentials that point to the configured TURN host",
      urls.length > 0 && urls.every((url) => url.includes(TURN_HOST)) && urls.some((url) => url.startsWith("turn")),
      urls,
    );

    const sessionId = await startRemoteSession(service.origin, alice.sessionToken, host.hostId);
    const clientTicketAnswer = await api(service.origin, `/v2/remote/sessions/${sessionId}/ticket`, {
      token: alice.sessionToken,
      body: { clientPublicKey: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" },
    });
    const clientPeer = await connect(signalUrl);
    clientPeer.send({
      type: "hello",
      version: 1,
      peer: "client",
      token: textField(clientTicketAnswer.body, "ticket"),
    });
    const clientReady = await clientPeer.next("ready").catch(() => null);
    const hostSawClient = await hostPeer.next("peer-ready").catch(() => null);
    checks.add(
      "a client with a session ticket of the account service reaches the host through Signal",
      clientReady !== null && hostSawClient !== null && hostSawClient.userId === alice.userId,
      { client: clientPeer.messages.slice(0, 3), host: hostSawClient },
    );

    const forged = await connect(signalUrl);
    forged.send({ type: "hello", version: 1, peer: "client", token: "not-a-ticket-of-this-service" });
    const forgedResult = await Promise.race([
      forged.closed.then(() => "closed"),
      forged.next("error").then(() => "error"),
    ]).catch(() => "none");
    checks.add("Signal refuses a ticket that the account service did not sign", forgedResult !== "none", forgedResult);

    mock.disableUser(ALICE.user);
    const clientClosed = await Promise.race([
      clientPeer.closed,
      new Promise<null>((done) => setTimeout(() => done(null), WAIT_LIMIT_MS)),
    ]);
    const hostClosed = await Promise.race([
      hostPeer.closed,
      new Promise<null>((done) => setTimeout(() => done(null), WAIT_LIMIT_MS)),
    ]);
    checks.add(
      "when Nextcloud disables the user, Signal drops the client socket of that user",
      clientClosed !== null,
      clientClosed,
    );
    checks.add(
      "when Nextcloud disables the owner, Signal drops the host socket: the host epoch changed",
      hostClosed !== null,
      hostClosed,
    );
    const again = await api(service.origin, `/v2/remote/hosts/${host.hostId}/ticket`, {
      body: { machineToken: host.machineToken },
    });
    checks.add(
      "the account service gives the host of a disabled owner no new ticket",
      again.status === 403,
      again.status,
    );

    const stopped = await service.stop();
    checks.add("the account service stops clean", stopped.clean, stopped);
  } finally {
    if (resources.signal) await stopSignal(resources.signal);
    await closeAll({ mocks: [mock], services: resources.services });
  }
}

let exitCode = 1;
try {
  await main();
} catch (error) {
  checks.add("the scenario finished", false, error instanceof Error ? error.message : String(error));
} finally {
  exitCode = (await checks.writeReport("account-signal")) ? 0 : 1;
}
process.exit(exitCode);
