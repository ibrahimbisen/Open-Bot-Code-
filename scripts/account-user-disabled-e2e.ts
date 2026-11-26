import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isNumber } from "@codebot/contracts/runtime-values";
import {
  type AccountService,
  api,
  Checks,
  closeAll,
  errorCode,
  freePort,
  providerLogin,
  registerHost,
  type SignalMock,
  type SignedIn,
  signIn,
  startAccountService,
  startRemoteSession,
  startSignalMock,
  textField,
  waitFor,
} from "./account-e2e-support";
import { type OidcMock, type OidcMockMode, startOidcMock } from "./oidc-mock-server";

const CLIENT_ID = "codebot-e2e";
const CLIENT_SECRET = "e2e-client-secret-8c1d4e7a2f90";
const WEBHOOK_SECRET = "e2e-signal-webhook-secret-with-48-bytes-minimum-0123456789";
const ALICE = { user: "alice", password: "alice-password-1" };
const BOB = { user: "bob", password: "bob-password-2" };
const CAROL = { user: "carol", password: "carol-password-3" };

const checks = new Checks();

interface Stack {
  mock: OidcMock;
  signal: SignalMock;
  service: AccountService;
}

const resources: { mocks: OidcMock[]; services: AccountService[]; signals: SignalMock[] } = {
  mocks: [],
  services: [],
  signals: [],
};

async function startStack(mode: OidcMockMode, environment: Record<string, string> = {}): Promise<Stack> {
  const port = await freePort();
  const mock = await startOidcMock({
    mode,
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    redirectUri: `http://127.0.0.1:${port}/v1/auth/oidc/callback`,
    users: [
      { id: ALICE.user, password: ALICE.password, displayName: "Alice Example", email: "alice@example.com" },
      { id: BOB.user, password: BOB.password, displayName: "Bob Example", email: null },
      { id: CAROL.user, password: CAROL.password, displayName: "Carol Example", email: null },
    ],
  });
  const signal = await startSignalMock(WEBHOOK_SECRET);
  const service = await startAccountService({
    port,
    provider: mode === "oidc" ? { issuerUrl: mock.origin } : { nextcloudUrl: mock.origin },
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    environment: {
      REMOTE_SIGNAL_URL: "ws://127.0.0.1:9/v1/signal",
      REMOTE_AUTH_WEBHOOK_URL: `${signal.origin}/internal/auth-events`,
      REMOTE_AUTH_WEBHOOK_SECRET: WEBHOOK_SECRET,
      ...environment,
    },
  });
  resources.mocks.push(mock);
  resources.signals.push(signal);
  resources.services.push(service);
  return { mock, signal, service };
}

function openDatabase(service: AccountService): Database {
  return new Database(join(service.dataDir, "account.sqlite"), { readonly: true });
}

interface IdentityState {
  status: string;
  blockedReason: string | null;
  ciphertext: string | null;
}

function identityState(service: AccountService, userId: string): IdentityState | null {
  const database = openDatabase(service);
  try {
    const row = database
      .query<{ status: string; blocked_reason: string | null; refresh_token_ciphertext: string | null }, [string]>(
        "SELECT status, blocked_reason, refresh_token_ciphertext FROM account_identities WHERE user_id = ?",
      )
      .get(userId);
    return row
      ? { status: row.status, blockedReason: row.blocked_reason, ciphertext: row.refresh_token_ciphertext }
      : null;
  } finally {
    database.close();
  }
}

function countRows(service: AccountService, sql: string, ...binds: string[]): number {
  const database = openDatabase(service);
  try {
    const row = database.query<{ n: number }, string[]>(sql).get(...binds);
    return row?.n ?? -1;
  } finally {
    database.close();
  }
}

function meStatus(service: AccountService, token: string): Promise<number> {
  return api(service.origin, "/v1/me", { token }).then((answer) => answer.status);
}

function waitForRejected(service: AccountService, token: string, description: string): Promise<number> {
  return waitFor(description, async () => {
    const status = await meStatus(service, token);
    return status === 401 ? status : null;
  });
}

function dataFileBytes(service: AccountService): string {
  let text = "";
  for (const name of ["account.sqlite", "account.sqlite-wal"]) {
    try {
      text += readFileSync(join(service.dataDir, name)).toString("latin1");
    } catch {
      text += "";
    }
  }
  return text;
}

async function loginAgain(service: AccountService, who: { user: string; password: string }) {
  const started = await api(service.origin, "/v1/auth/oidc/start", {
    body: {
      redirectUri: "http://127.0.0.1:4000/callback",
      codeChallenge: "A".repeat(43),
      state: "state-value-for-the-test-00",
    },
  });
  const authorizationUrl = textField(started.body, "authorizationUrl");
  const result = await providerLogin(authorizationUrl, who);
  return result.submitted.status;
}

async function timerScenario(mode: OidcMockMode): Promise<void> {
  const stack = await startStack(mode, { ACCOUNT_REVALIDATE_SECONDS: "1" });
  const { mock, signal, service } = stack;
  const alice = await signIn(service, ALICE);
  const bob = await signIn(service, BOB);
  const carol = await signIn(service, CAROL);

  const stored = identityState(service, alice.userId);
  const firstRefreshToken = mock.issuedRefreshTokens[0] ?? "";
  checks.add(
    `${mode}: the refresh token is stored encrypted, not as plain text`,
    stored?.status === "active" &&
      !!stored.ciphertext &&
      stored.ciphertext !== firstRefreshToken &&
      !dataFileBytes(service).includes(firstRefreshToken) &&
      firstRefreshToken.length > 16,
    { status: stored?.status, ciphertextLength: stored?.ciphertext?.length },
  );

  const host = await registerHost(service.origin, alice.sessionToken, "Alice host");
  const sessionId = await startRemoteSession(service.origin, alice.sessionToken, host.hostId);
  const ticketBefore = await api(service.origin, `/v2/remote/hosts/${host.hostId}/ticket`, {
    body: { machineToken: host.machineToken },
  });
  checks.add(`${mode}: an active owner gets a host ticket`, ticketBefore.status === 200, ticketBefore.status);

  const ciphertextBefore = stored?.ciphertext ?? "";
  await waitFor(`${mode}: the timer rotates the refresh token`, async () => {
    const state = identityState(service, alice.userId);
    return state?.ciphertext && state.ciphertext !== ciphertextBefore && mock.issuedRefreshTokens.length >= 6
      ? state
      : null;
  });
  checks.add(
    `${mode}: the timer asks the provider, rotates the stored token, and the sessions stay valid`,
    (await meStatus(service, alice.sessionToken)) === 200 && (await meStatus(service, bob.sessionToken)) === 200,
    { issued: mock.issuedRefreshTokens.length },
  );

  mock.disableUser(ALICE.user);
  const status = await waitForRejected(service, alice.sessionToken, `${mode}: a disabled user loses the session`);
  checks.add(`${mode}: a disabled user loses the session without another sign-in`, status === 401, status);
  const blocked = identityState(service, alice.userId);
  checks.add(
    `${mode}: the identity is blocked and the stored refresh token is removed`,
    blocked?.status === "blocked" && blocked.ciphertext === null && !!blocked.blockedReason,
    blocked,
  );
  checks.add(
    `${mode}: every session of the user is revoked`,
    countRows(
      service,
      "SELECT COUNT(*) AS n FROM auth_sessions WHERE user_id = ? AND revoked_at IS NULL",
      alice.userId,
    ) === 0,
  );
  checks.add(
    `${mode}: the remote sessions of the user end`,
    countRows(
      service,
      "SELECT COUNT(*) AS n FROM remote_sessions WHERE user_id = ? AND ended_at IS NULL",
      alice.userId,
    ) === 0,
  );
  const ended = await waitFor(`${mode}: Signal gets the end of the remote session`, async () =>
    signal.events.find((event) => event.body.type === "remote-session-ended" && event.body.sessionId === sessionId),
  );
  const changed = await waitFor(`${mode}: Signal gets the new auth epoch of the host`, async () =>
    signal.events.find(
      (event) =>
        event.body.type === "remote-auth-changed" &&
        event.body.hostId === host.hostId &&
        isNumber(event.body.authEpoch) &&
        event.body.authEpoch > 1,
    ),
  );
  checks.add(
    `${mode}: Signal receives signed events that end the session and change the host epoch`,
    ended.signatureValid && changed.signatureValid && isNumber(changed.body.authEpoch) && changed.body.authEpoch > 1,
    { ended: ended.body, changed: changed.body },
  );
  const ticketAfter = await api(service.origin, `/v2/remote/hosts/${host.hostId}/ticket`, {
    body: { machineToken: host.machineToken },
  });
  checks.add(
    `${mode}: the host of a disabled owner gets no ticket`,
    ticketAfter.status === 403 && errorCode(ticketAfter) === "account_disabled",
    { status: ticketAfter.status, code: errorCode(ticketAfter) },
  );
  const sessionAfter = await api(service.origin, "/v2/remote/sessions", {
    token: alice.sessionToken,
    body: { hostId: host.hostId },
  });
  checks.add(`${mode}: the old token cannot start a remote session`, sessionAfter.status === 401, sessionAfter.status);
  checks.add(
    `${mode}: a user who is not disabled keeps the access`,
    (await meStatus(service, bob.sessionToken)) === 200 && (await meStatus(service, carol.sessionToken)) === 200,
  );
  const refused = await loginAgain(service, ALICE);
  checks.add(`${mode}: the disabled user cannot sign in again`, refused !== 302, refused);

  mock.enableUser(ALICE.user);
  const back = await signIn(service, ALICE);
  const reactivated = identityState(service, back.userId);
  checks.add(
    `${mode}: an enabled user signs in again and gets the same account back`,
    back.userId === alice.userId &&
      reactivated?.status === "active" &&
      (await meStatus(service, back.sessionToken)) === 200,
    { same: back.userId === alice.userId, status: reactivated?.status },
  );

  mock.deleteUser(BOB.user);
  await waitForRejected(service, bob.sessionToken, `${mode}: a removed user loses the session`);
  const removed = identityState(service, bob.userId);
  checks.add(
    `${mode}: a user who is removed at the provider loses the access`,
    removed?.status === "blocked" && (await meStatus(service, bob.sessionToken)) === 401,
    removed,
  );
  checks.add(
    `${mode}: a user who stays active is not affected by the removal of another`,
    (await meStatus(service, carol.sessionToken)) === 200,
  );

  const leaked = [CLIENT_SECRET, WEBHOOK_SECRET, alice.sessionToken, ...mock.issuedRefreshTokens].filter((secret) =>
    service.logs.some((line) => line.includes(secret)),
  );
  checks.add(`${mode}: the log has no secret, token or refresh token`, leaked.length === 0, { leaked: leaked.length });
  await stopAndCheck(mode, service);
}

async function stopAndCheck(label: string, service: AccountService): Promise<void> {
  const stopped = await service.stop();
  checks.add(`${label}: the service stops clean`, stopped.clean, stopped);
}

async function ticketScenario(mode: OidcMockMode): Promise<void> {
  const { mock, service } = await startStack(mode, {
    ACCOUNT_REVALIDATE_SECONDS: "86400",
    ACCOUNT_TICKET_FRESHNESS_SECONDS: "0",
  });
  const alice = await signIn(service, ALICE);
  const bob = await signIn(service, BOB);
  const host = await registerHost(service.origin, alice.sessionToken, "Alice host");
  mock.disableUser(ALICE.user);
  const hostTicket = await api(service.origin, `/v2/remote/hosts/${host.hostId}/ticket`, {
    body: { machineToken: host.machineToken },
  });
  checks.add(
    `${mode}: a ticket request checks the provider first, with no timer`,
    hostTicket.status === 403 && errorCode(hostTicket) === "account_disabled",
    { status: hostTicket.status, code: errorCode(hostTicket) },
  );
  const session = await api(service.origin, "/v2/remote/sessions", {
    token: alice.sessionToken,
    body: { hostId: host.hostId },
  });
  const mobile = await api(service.origin, "/v1/mobile-auth/ticket", { token: alice.sessionToken, body: {} });
  checks.add(
    `${mode}: a remote session and a mobile ticket are refused for a disabled user`,
    session.status === 401 && mobile.status === 401,
    { session: session.status, mobile: mobile.status },
  );
  checks.add(`${mode}: another user still has access`, (await meStatus(service, bob.sessionToken)) === 200);
  await stopAndCheck(`${mode} ticket check`, service);
}

async function freshnessScenario(): Promise<void> {
  const { mock, service } = await startStack("oidc", {
    ACCOUNT_REVALIDATE_SECONDS: "86400",
    ACCOUNT_TICKET_FRESHNESS_SECONDS: "3600",
  });
  const alice = await signIn(service, ALICE);
  const host = await registerHost(service.origin, alice.sessionToken, "Alice host");
  mock.disableUser(ALICE.user);
  const before = mock.requests.length;
  const ticket = await api(service.origin, `/v2/remote/hosts/${host.hostId}/ticket`, {
    body: { machineToken: host.machineToken },
  });
  checks.add(
    "a ticket within the freshness window does not call the provider",
    ticket.status === 200 && mock.requests.length === before,
    { status: ticket.status, extraRequests: mock.requests.length - before },
  );
  await stopAndCheck("freshness", service);
}

async function graceScenarios(): Promise<void> {
  const tolerant = await startStack("oidc", {
    ACCOUNT_REVALIDATE_SECONDS: "1",
    ACCOUNT_REVALIDATE_GRACE_SECONDS: "86400",
  });
  const alice = await signIn(tolerant.service, ALICE);
  const requestsBefore = tolerant.mock.requests.length;
  await tolerant.mock.pause();
  await waitFor("the service logs that the provider did not answer", async () =>
    tolerant.service.logs.find((line) => line.includes("did not confirm")),
  );
  checks.add(
    "the provider is down: the sessions stay valid inside the grace time",
    (await meStatus(tolerant.service, alice.sessionToken)) === 200 &&
      identityState(tolerant.service, alice.userId)?.status === "active",
  );
  await tolerant.mock.resume();
  await waitFor("the service asks the provider again after it returns", async () =>
    tolerant.mock.requests.length > requestsBefore ? true : null,
  );
  checks.add(
    "the provider returns: the sessions are still valid",
    (await meStatus(tolerant.service, alice.sessionToken)) === 200,
  );
  await stopAndCheck("grace", tolerant.service);

  const strict = await startStack("oidc", {
    ACCOUNT_REVALIDATE_SECONDS: "86400",
    ACCOUNT_REVALIDATE_GRACE_SECONDS: "0",
    ACCOUNT_TICKET_FRESHNESS_SECONDS: "0",
  });
  const bob = await signIn(strict.service, BOB);
  await strict.mock.pause();
  const unreachable = await api(strict.service.origin, "/v1/me", { token: bob.sessionToken });
  checks.add(
    "the provider is down longer than the grace time: the service answers 503 and keeps the account",
    unreachable.status === 503 &&
      errorCode(unreachable) === "identity_provider_unreachable" &&
      identityState(strict.service, bob.userId)?.status === "active",
    { status: unreachable.status, code: errorCode(unreachable) },
  );
  await strict.mock.resume();
  checks.add(
    "the provider returns: the same session works again",
    (await meStatus(strict.service, bob.sessionToken)) === 200,
  );
  await stopAndCheck("strict grace", strict.service);
}

async function keyScenario(): Promise<void> {
  const first = await startStack("oidc", { ACCOUNT_REVALIDATE_SECONDS: "86400" });
  const { service, mock } = first;
  const alice = await signIn(service, ALICE);
  await service.stop();
  const dataDir = service.dataDir;
  const keys = service.keys;
  const port = Number(new URL(service.origin).port);
  const options = {
    port,
    provider: { issuerUrl: mock.origin },
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    dataDir,
  };
  const same = await startAccountService({ ...options, keys });
  resources.services.push(same);
  checks.add(
    "the same secret key keeps the session after a restart",
    (await meStatus(same, alice.sessionToken)) === 200,
  );
  await same.stop();
  const other = { ...keys, secretKey: `${keys.secretKey.slice(1)}x` };
  const refused = await startAccountService({ ...options, keys: other }).then(
    (started) => {
      resources.services.push(started);
      return null;
    },
    (error: unknown) => (error instanceof Error ? error.message : String(error)),
  );
  checks.add(
    "another secret key is refused at start",
    refused?.includes("ACCOUNT_SECRET_KEY") === true && refused.includes("code 78"),
    refused,
  );
  const replaced = await startAccountService({
    ...options,
    keys: other,
    environment: { ACCOUNT_REPLACE_SECRET_KEY: "true" },
  });
  resources.services.push(replaced);
  checks.add(
    "a replaced secret key ends the old sessions and blocks the old identities",
    (await meStatus(replaced, alice.sessionToken)) === 401 &&
      identityState(replaced, alice.userId)?.blockedReason === "key_replaced",
  );
  const again: SignedIn = await signIn(replaced, ALICE);
  checks.add(
    "after the key replacement the user signs in again and gets the same account",
    again.userId === alice.userId && (await meStatus(replaced, again.sessionToken)) === 200,
  );
  await replaced.stop();
}

async function main(): Promise<void> {
  for (const mode of ["oidc", "nextcloud"] as const) {
    await checks.scenario(`${mode} timer`, () => timerScenario(mode));
    await checks.scenario(`${mode} ticket`, () => ticketScenario(mode));
  }
  await checks.scenario("freshness", freshnessScenario);
  await checks.scenario("grace", graceScenarios);
  await checks.scenario("key", keyScenario);
}

let exitCode = 1;
try {
  await main();
} finally {
  await closeAll({ mocks: resources.mocks, services: resources.services });
  for (const signal of resources.signals) await signal.close().catch(() => undefined);
  const passed = await checks.writeReport("account-user-disabled");
  exitCode = passed ? 0 : 1;
}
process.exit(exitCode);
