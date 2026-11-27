import { createHmac } from "node:crypto";
import { isDynamicRecord } from "@codebot/contracts/runtime-values";
import { createLocalJWKSet, jwtVerify } from "jose";
import {
  type AccountService,
  api,
  Checks,
  closeAll,
  errorCode,
  freePort,
  numberField,
  registerHost,
  type SignalMock,
  type SignedIn,
  signIn,
  startAccountService,
  startRemoteSession,
  startSignalMock,
  textField,
} from "./account-e2e-support";
import { type OidcMock, startOidcMock } from "./oidc-mock-server";

const CLIENT_ID = "codebot-e2e";
const CLIENT_SECRET = "e2e-client-secret-5d7a1c9e3b40";
const WEBHOOK_SECRET = "e2e-signal-webhook-secret-with-48-bytes-minimum-0123456789";
const SIGNAL_URL = "ws://127.0.0.1:9/v1/signal";
const MEMBER_NAMES = ["bob", "carol", "dave", "erin", "frank", "grace"];
const PASSWORD = (name: string) => `${name}-password-1`;
const UPSTREAM_NAME = ["open", "bot"].join("");

const checks = new Checks();
const resources: { mocks: OidcMock[]; services: AccountService[]; signals: SignalMock[] } = {
  mocks: [],
  services: [],
  signals: [],
};

const REMOVED_ROUTES: readonly { method: string; path: string; why: string }[] = [
  { method: "POST", path: "/v1/auth/email/start", why: "email code sign-in" },
  { method: "POST", path: "/v1/auth/email/verify", why: "email code sign-in" },
  { method: "POST", path: "/v1/mobile-auth/email/verify", why: "email code sign-in on the phone" },
  { method: "POST", path: "/v1/auth/company/start", why: "company sign-in" },
  { method: "POST", path: "/v1/auth/company/exchange", why: "company sign-in" },
  { method: "POST", path: "/v1/mobile-auth/company/exchange", why: "company sign-in on the phone" },
  { method: "GET", path: "/scim/v2/Users", why: "SCIM" },
  { method: "POST", path: "/v1/team-invitations/email", why: "invitation by email" },
  { method: "GET", path: "/v1/me/billing", why: "billing" },
  { method: "POST", path: "/v1/me/credits/checkout", why: "credits" },
  { method: "GET", path: "/v1/me/license", why: "license" },
  { method: "POST", path: "/v1/stripe/webhook", why: "payment webhook" },
  { method: "GET", path: "/v2/hosting/plans", why: "hosted servers" },
  { method: "POST", path: "/v2/remote/hosts/any-host/checkout", why: "paid server checkout" },
  { method: "PUT", path: "/v2/remote/hosts/any-host/company-sign-in", why: "company sign-in setup" },
];

async function main(): Promise<void> {
  const port = await freePort();
  const names = ["alice", ...MEMBER_NAMES, "heidi"];
  const mock = await startOidcMock({
    mode: "oidc",
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    redirectUri: `http://127.0.0.1:${port}/v1/auth/oidc/callback`,
    users: names.map((name) => ({
      id: name,
      password: PASSWORD(name),
      displayName: `${name} Example`,
      email: null,
    })),
  });
  resources.mocks.push(mock);
  const signal = await startSignalMock(WEBHOOK_SECRET);
  resources.signals.push(signal);
  const service = await startAccountService({
    port,
    provider: { issuerUrl: mock.origin },
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    environment: {
      REMOTE_SIGNAL_URL: SIGNAL_URL,
      REMOTE_AUTH_WEBHOOK_URL: `${signal.origin}/internal/auth-events`,
      REMOTE_AUTH_WEBHOOK_SECRET: WEBHOOK_SECRET,
      ACCOUNT_REVALIDATE_SECONDS: "86400",
    },
  });
  resources.services.push(service);
  const origin = service.origin;
  const people = new Map<string, SignedIn>();

  await checks.scenario("health and keys", async () => {
    const live = await api(origin, "/health/live");
    const ready = await api(origin, "/health/ready");
    const jwks = await api(origin, "/.well-known/jwks.json");
    const keys = isDynamicRecord(jwks.body) && Array.isArray(jwks.body.keys) ? jwks.body.keys : [];
    checks.add(
      "the service answers the health routes and publishes the ticket key set",
      live.status === 200 && ready.status === 200 && jwks.status === 200 && keys.length === 1,
      { live: live.status, ready: ready.status, jwks: jwks.status },
    );
  });

  await checks.scenario("removed routes", async () => {
    const found: string[] = [];
    for (const route of REMOVED_ROUTES) {
      const answer = await api(origin, route.path, { method: route.method });
      if (answer.status !== 404) found.push(`${route.method} ${route.path} (${route.why}): ${answer.status}`);
    }
    checks.add(
      "email-code login, company sign-in, SCIM, email invitations, billing and hosted servers have no route",
      found.length === 0,
      { stillAnswering: found, checked: REMOVED_ROUTES.length },
    );
    const noToken = await api(origin, "/v2/remote/hosts");
    checks.add("a kept route needs a session token", noToken.status === 401, noToken.status);
  });

  await checks.scenario("sign in", async () => {
    for (const name of names) people.set(name, await signIn(service, { user: name, password: PASSWORD(name) }));
    const alice = people.get("alice");
    const me = alice ? await api(origin, "/v1/me", { token: alice.sessionToken }) : null;
    checks.add(
      "a user signs in with the provider account and GET /v1/me returns the profile",
      me?.status === 200 && textField(me.body, "id") === alice?.userId,
      me?.body,
    );
  });
  const alice = people.get("alice");
  if (!alice) throw new Error("The first user did not sign in.");

  await checks.scenario("profile", async () => {
    const renamed = await api(origin, "/v1/me/profile", {
      method: "PATCH",
      token: alice.sessionToken,
      body: { name: "Alice Renamed" },
    });
    const color = await api(origin, "/v1/me/chat-color", {
      method: "PUT",
      token: alice.sessionToken,
      body: { chatColor: "#3b82f6" },
    });
    const me = await api(origin, "/v1/me", { token: alice.sessionToken });
    checks.add(
      "profile name and chat color can be changed",
      renamed.status === 200 &&
        color.status === 200 &&
        textField(me.body, "name") === "Alice Renamed" &&
        textField(me.body, "chatColor") === "#3b82f6",
      { renamed: renamed.status, color: color.status, me: me.body },
    );
  });

  const host = await registerHost(origin, alice.sessionToken, "Alice home server");
  await checks.scenario("host", async () => {
    const listed = await api(origin, "/v2/remote/hosts", { token: alice.sessionToken });
    const hosts = isDynamicRecord(listed.body) && Array.isArray(listed.body.hosts) ? listed.body.hosts : [];
    const first = hosts.find((entry) => isDynamicRecord(entry) && entry.hostId === host.hostId);
    checks.add(
      "an owner registers a host and lists it with no plan limit on members",
      isDynamicRecord(first) && first.role === "owner" && numberField(first, "memberLimit") >= 100,
      first,
    );
    const stolen = await api(origin, "/v2/remote/hosts/register", {
      token: people.get("bob")?.sessionToken ?? "",
      body: { hostId: host.hostId, name: "Taken", ownerMembershipId: "member-taken" },
    });
    checks.add(
      "another user cannot register an existing host",
      stolen.status === 403 && errorCode(stolen) === "host_owner_mismatch",
      { status: stolen.status, code: errorCode(stolen) },
    );
    const badTicket = await api(origin, `/v2/remote/hosts/${host.hostId}/ticket`, {
      body: { machineToken: "not-the-host-credential" },
    });
    checks.add(
      "a wrong host credential gets no ticket",
      badTicket.status >= 400 && badTicket.status < 500,
      badTicket.status,
    );
    const hostTicket = await api(origin, `/v2/remote/hosts/${host.hostId}/ticket`, {
      body: { machineToken: host.machineToken },
    });
    const ticket = textField(hostTicket.body, "ticket");
    const keys = await api(origin, "/.well-known/jwks.json");
    let verified = false;
    let claims: unknown = null;
    if (ticket && isDynamicRecord(keys.body)) {
      const set = createLocalJWKSet({
        keys: Array.isArray(keys.body.keys) ? keys.body.keys.filter(isDynamicRecord) : [],
      });
      const result = await jwtVerify(ticket, set).catch(() => null);
      verified = result !== null;
      claims = result?.payload ?? null;
    }
    checks.add(
      "the host ticket is signed with the key of the service and names the host",
      hostTicket.status === 200 && verified && isDynamicRecord(claims) && claims.hostId === host.hostId,
      { status: hostTicket.status, claims },
    );
    checks.add(
      "the host ticket answer carries the configured self-hosted Signal address",
      textField(hostTicket.body, "signalUrl") === SIGNAL_URL,
      textField(hostTicket.body, "signalUrl"),
    );
  });

  await checks.scenario("invites and members", async () => {
    const created = await api(origin, `/v2/remote/hosts/${host.hostId}/invites`, {
      token: alice.sessionToken,
      body: { role: "member", permanent: true },
    });
    const token = textField(created.body, "token");
    checks.add("the owner makes an invitation link with no email", created.status === 201 && !!token, {
      status: created.status,
      keys: Object.keys(isDynamicRecord(created.body) ? created.body : {}),
    });
    const preview = await api(origin, "/v2/remote/invites/preview", { body: { token } });
    checks.add("the invitation can be previewed with no sign-in", preview.status === 200, preview.status);
    const accepted: string[] = [];
    for (const name of MEMBER_NAMES) {
      const person = people.get(name);
      if (!person) continue;
      const answer = await api(origin, "/v2/remote/invites/accept", { token: person.sessionToken, body: { token } });
      if (answer.status === 200) accepted.push(name);
    }
    checks.add(
      "six more users accept the invitation: no plan limits the number of members",
      accepted.length === MEMBER_NAMES.length,
      { accepted },
    );
    const members = await api(origin, `/v2/remote/hosts/${host.hostId}/members`, { token: alice.sessionToken });
    const list = isDynamicRecord(members.body) && Array.isArray(members.body.members) ? members.body.members : [];
    checks.add("the member list shows the owner and all members", list.length === MEMBER_NAMES.length + 1, {
      status: members.status,
      count: list.length,
    });
    const bobEntry = list.find((entry) => isDynamicRecord(entry) && entry.email === people.get("bob")?.email);
    const bobMembership = isDynamicRecord(bobEntry) ? textField(bobEntry, "membershipId") : "";
    const promoted = await api(origin, `/v2/remote/hosts/${host.hostId}/members/${bobMembership}`, {
      method: "PATCH",
      token: alice.sessionToken,
      body: { role: "admin" },
    });
    checks.add("the owner changes the role of a member", promoted.status === 204, promoted.status);
    const memberCannot = await api(origin, `/v2/remote/hosts/${host.hostId}/invites`, {
      token: people.get("carol")?.sessionToken ?? "",
      body: { role: "member", permanent: true },
    });
    checks.add("a plain member cannot make invitations", memberCannot.status === 403, memberCannot.status);

    const removedPerson = people.get("grace");
    const removedEntry = list.find((entry) => isDynamicRecord(entry) && entry.email === removedPerson?.email);
    const removedMembership = isDynamicRecord(removedEntry) ? textField(removedEntry, "membershipId") : "";
    const removed = await api(origin, `/v2/remote/hosts/${host.hostId}/members/${removedMembership}`, {
      method: "DELETE",
      token: alice.sessionToken,
    });
    const afterRemoval = await api(origin, "/v2/remote/sessions", {
      token: removedPerson?.sessionToken ?? "",
      body: { hostId: host.hostId },
    });
    checks.add(
      "a removed member cannot start a remote session on the host",
      removed.status === 204 && afterRemoval.status >= 400,
      { removed: removed.status, afterRemoval: afterRemoval.status },
    );
  });

  await checks.scenario("isolation", async () => {
    const heidi = people.get("heidi");
    if (!heidi) throw new Error("Missing user.");
    const listed = await api(origin, "/v2/remote/hosts", { token: heidi.sessionToken });
    const hosts = isDynamicRecord(listed.body) && Array.isArray(listed.body.hosts) ? listed.body.hosts : [];
    const members = await api(origin, `/v2/remote/hosts/${host.hostId}/members`, { token: heidi.sessionToken });
    const invites = await api(origin, `/v2/remote/hosts/${host.hostId}/invites`, { token: heidi.sessionToken });
    const removed = await api(origin, `/v2/remote/hosts/${host.hostId}`, {
      method: "DELETE",
      token: heidi.sessionToken,
    });
    const session = await api(origin, "/v2/remote/sessions", {
      token: heidi.sessionToken,
      body: { hostId: host.hostId },
    });
    const aliceHosts = await api(origin, "/v2/remote/hosts", { token: alice.sessionToken });
    const aliceList =
      isDynamicRecord(aliceHosts.body) && Array.isArray(aliceHosts.body.hosts) ? aliceHosts.body.hosts : [];
    checks.add(
      "a user who is not a member sees no host of another user and cannot read, change or open it",
      listed.status === 200 &&
        hosts.length === 0 &&
        members.status >= 400 &&
        invites.status >= 400 &&
        removed.status >= 400 &&
        session.status >= 400 &&
        aliceList.length === 1,
      {
        hosts: hosts.length,
        members: members.status,
        invites: invites.status,
        removed: removed.status,
        session: session.status,
      },
    );
    const me = await api(origin, "/v1/me", { token: heidi.sessionToken });
    checks.add(
      "each token returns only the profile of its own account",
      textField(me.body, "id") === heidi.userId && textField(me.body, "id") !== alice.userId,
    );
  });

  await checks.scenario("remote sessions", async () => {
    const carol = people.get("carol");
    if (!carol) throw new Error("Missing user.");
    const sessionId = await startRemoteSession(origin, carol.sessionToken, host.hostId);
    const ticketAnswer = await api(origin, `/v2/remote/sessions/${sessionId}/ticket`, {
      token: carol.sessionToken,
      body: { clientPublicKey: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" },
    });
    const ticket = textField(ticketAnswer.body, "ticket");
    const keys = await api(origin, "/.well-known/jwks.json");
    let claims: unknown = null;
    if (ticket && isDynamicRecord(keys.body)) {
      const set = createLocalJWKSet({
        keys: Array.isArray(keys.body.keys) ? keys.body.keys.filter(isDynamicRecord) : [],
      });
      claims = (await jwtVerify(ticket, set).catch(() => null))?.payload ?? null;
    }
    checks.add(
      "a member gets a session ticket that names the member, the host and the role",
      ticketAnswer.status === 200 &&
        isDynamicRecord(claims) &&
        claims.hostId === host.hostId &&
        claims.userId === carol.userId &&
        claims.role === "member",
      { status: ticketAnswer.status, body: ticketAnswer.body, claims },
    );
    const outsider = await api(origin, `/v2/remote/sessions/${sessionId}/ticket`, {
      token: people.get("dave")?.sessionToken ?? "",
      body: { clientPublicKey: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" },
    });
    checks.add("a session ticket is not given to another user", outsider.status >= 400, outsider.status);
    const ended = await api(origin, `/v2/remote/sessions/${sessionId}/end`, {
      method: "POST",
      token: carol.sessionToken,
    });
    checks.add("a member ends the remote session", ended.status < 300, ended.status);
  });

  await checks.scenario("mobile and logout", async () => {
    const dave = people.get("dave");
    if (!dave) throw new Error("Missing user.");
    const devices = await api(origin, "/v1/mobile-auth/devices", { token: dave.sessionToken });
    const features = await api(origin, "/v1/mobile/features");
    const ice = await api(origin, "/v1/team-hosts/ice-servers", { method: "POST", body: {} });
    checks.add(
      "the mobile device list and the feature list answer, and the old ICE route says to update the host",
      devices.status === 200 && features.status === 200 && ice.status === 426,
      { devices: devices.status, features: features.status, ice: ice.status },
    );
    const out = await api(origin, "/v1/auth/logout", { method: "POST", token: dave.sessionToken });
    const after = await api(origin, "/v1/me", { token: dave.sessionToken });
    checks.add("logout ends the session", out.status === 204 && after.status === 401, {
      logout: out.status,
      after: after.status,
    });
  });

  await checks.scenario("signed Signal routes", async () => {
    const body = JSON.stringify({ hostId: host.hostId });
    const unsigned = await api(origin, "/v2/remote/resume/validate", { body: { hostId: host.hostId } });
    const timestamp = String(Math.floor(Date.now() / 1_000));
    const goodSignature = createHmac("sha256", WEBHOOK_SECRET).update(`${timestamp}.${body}`).digest("base64url");
    const signed = await fetch(`${origin}/v2/remote/resume/validate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "CodeBot-Timestamp": timestamp,
        "CodeBot-Signature": goodSignature,
      },
      body,
    });
    const forged = await fetch(`${origin}/v2/remote/resume/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "CodeBot-Timestamp": timestamp, "CodeBot-Signature": "AAAA" },
      body,
    });
    checks.add(
      "the Signal-only routes refuse a request with no valid signature and accept a signed one",
      unsigned.status === 401 && forged.status === 401 && signed.status !== 401,
      { unsigned: unsigned.status, forged: forged.status, signed: signed.status },
    );
  });

  await checks.scenario("no upstream address", async () => {
    const text = service.logs.join("\n");
    const found = text.includes(`${UPSTREAM_NAME}.run`);
    checks.add("the service log has no upstream address", !found);
  });

  const stopped = await service.stop();
  checks.add("the service stops clean", stopped.clean, stopped);
}

let exitCode = 1;
try {
  await main();
} finally {
  await closeAll({ mocks: resources.mocks, services: resources.services });
  for (const signal of resources.signals) await signal.close().catch(() => undefined);
  exitCode = (await checks.writeReport("account-remote-access")) ? 0 : 1;
}
process.exit(exitCode);
