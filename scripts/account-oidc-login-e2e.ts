import {
  type AccountService,
  api,
  browserGet,
  browserPost,
  Checks,
  clientState,
  closeAll,
  errorCode,
  freePort,
  hiddenField,
  loopbackReceiver,
  numberField,
  objectField,
  pkcePair,
  providerLogin,
  providerSubmit,
  startAccountService,
  textField,
  waitFor,
} from "./account-e2e-support";
import { type IdTokenFault, type OidcMock, type OidcMockMode, startOidcMock } from "./oidc-mock-server";

const CLIENT_ID = "codebot-e2e";
const CLIENT_SECRET = "e2e-client-secret-4f9a2c7d1b8e";
const UPSTREAM_NAME = ["open", "bot"].join("");
const ALICE = { user: "alice", password: "alice-password-1" };
const BOB = { user: "bob", password: "bob-password-2" };
const CAROL = { user: "Carol.Admin", password: "carol-password-3" };
const DAVE = { user: "dave@corp.example", password: "dave-password-4" };

const checks = new Checks();
const secrets = new Set<string>([CLIENT_SECRET]);

interface Stack {
  mode: OidcMockMode;
  mock: OidcMock;
  service: AccountService;
  port: number;
}

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
      { id: CAROL.user, password: CAROL.password, displayName: "Carol Admin", email: "carol@example.com" },
      { id: DAVE.user, password: DAVE.password, displayName: "Dave", email: null },
    ],
  });
  const service = await startAccountService({
    port,
    provider: mode === "oidc" ? { issuerUrl: mock.origin } : { nextcloudUrl: mock.origin },
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    environment,
  });
  return { mode, mock, service, port };
}

interface StartedLogin {
  authorizationUrl: string;
  expiresAt: number;
  state: string;
  verifier: string;
}

async function startLogin(stack: Stack, redirectUri: string): Promise<StartedLogin> {
  const pkce = pkcePair();
  const state = clientState();
  const started = await api(stack.service.origin, "/v1/auth/oidc/start", {
    body: { redirectUri, codeChallenge: pkce.challenge, state },
  });
  const authorizationUrl = textField(started.body, "authorizationUrl");
  if (started.status !== 200 || !authorizationUrl) {
    throw new Error(`The sign-in did not start: ${started.status} ${errorCode(started) ?? ""}`);
  }
  return { authorizationUrl, expiresAt: numberField(started.body, "expiresAt"), state, verifier: pkce.verifier };
}

async function callbackLocation(login: StartedLogin, credentials: { user: string; password: string }): Promise<URL> {
  const provider = await providerLogin(login.authorizationUrl, credentials);
  if (provider.submitted.status !== 302 || !provider.submitted.location) {
    throw new Error(`The provider did not redirect: ${provider.submitted.status}`);
  }
  const callback = await browserGet(provider.submitted.location);
  if (callback.status !== 302 || !callback.location) {
    throw new Error(`The account service did not redirect: ${callback.status}`);
  }
  return new URL(callback.location);
}

async function startRefusals(stack: Stack): Promise<void> {
  const { mode, service } = stack;
  const pkce = pkcePair();
  const refused: Record<string, number> = {};
  const targets = [
    "https://attacker.example.com/callback",
    "http://localhost:4000/callback",
    "http://127.0.0.1.attacker.example.com:4000/callback",
    "http://127.0.0.1/callback",
    "http://127.0.0.1:99999/callback",
    "http://user@127.0.0.1:4000/callback",
    "http://127.0.0.1:4000/callback#fragment",
    "http://127.0.0.1:4000/callback?next=1",
    "https://127.0.0.1:4000/callback",
    "codebot://other",
    "codebot://auth/extra",
    "javascript:alert(1)",
  ];
  for (const redirectUri of targets) {
    const answer = await api(service.origin, "/v1/auth/oidc/start", {
      body: { redirectUri, codeChallenge: pkce.challenge, state: clientState() },
    });
    if (answer.status !== 400 || errorCode(answer) !== "invalid_redirect_uri") refused[redirectUri] = answer.status;
  }
  checks.add(
    `${mode}: a redirect address that is not loopback or the app link is refused`,
    Object.keys(refused).length === 0,
    {
      notRefused: refused,
      tried: targets.length,
    },
  );
  const badChallenge = await api(service.origin, "/v1/auth/oidc/start", {
    body: { redirectUri: "http://127.0.0.1:4000/callback", codeChallenge: "short", state: clientState() },
  });
  const badState = await api(service.origin, "/v1/auth/oidc/start", {
    body: { redirectUri: "http://127.0.0.1:4000/callback", codeChallenge: pkce.challenge, state: "x" },
  });
  const missing = await api(service.origin, "/v1/auth/oidc/start", { body: { redirectUri: 5 } });
  checks.add(
    `${mode}: a start request with an invalid challenge, state or body is refused`,
    badChallenge.status === 400 && badState.status === 400 && missing.status === 400,
    { badChallenge: badChallenge.status, badState: badState.status, missing: missing.status },
  );
  const appLink = await api(service.origin, "/v1/auth/oidc/start", {
    body: { redirectUri: "codebot://auth", codeChallenge: pkce.challenge, state: clientState() },
  });
  checks.add(`${mode}: the app link is accepted as redirect address`, appLink.status === 200, appLink.status);
}

async function fullLogin(stack: Stack): Promise<string> {
  const { mode, service, mock } = stack;
  const config = await api(service.origin, "/v1/auth/config");
  const loginConfig = objectField(config.body, "login");
  checks.add(
    `${mode}: /v1/auth/config gives the login kind and the provider name with no session`,
    config.status === 200 && loginConfig?.kind === "oidc" && loginConfig.providerName === "Mock Cloud",
    config.body,
  );

  const receiver = await loopbackReceiver();
  try {
    const login = await startLogin(stack, receiver.redirectUri);
    const authorization = new URL(login.authorizationUrl);
    checks.add(
      `${mode}: the authorization address is at the provider and names the callback of the service`,
      authorization.origin === mock.origin &&
        authorization.searchParams.get("redirect_uri") === `${service.origin}/v1/auth/oidc/callback` &&
        authorization.searchParams.get("client_id") === CLIENT_ID &&
        authorization.searchParams.get("response_type") === "code" &&
        authorization.searchParams.get("code_challenge_method") === "S256" &&
        Boolean(authorization.searchParams.get("code_challenge")),
      { origin: authorization.origin, path: authorization.pathname },
    );
    checks.add(
      `${mode}: the service uses its own state, not the state of the client`,
      Boolean(authorization.searchParams.get("state")) && authorization.searchParams.get("state") !== login.state,
    );
    if (mode === "oidc") {
      checks.add(
        "oidc: the authorization request has a nonce and the openid scope",
        Boolean(authorization.searchParams.get("nonce")) &&
          (authorization.searchParams.get("scope") ?? "").split(" ").includes("openid"),
        authorization.searchParams.get("scope"),
      );
    }
    checks.add(
      `${mode}: the pending login expires about 10 minutes after the start`,
      login.expiresAt > Date.now() + 9 * 60_000 && login.expiresAt < Date.now() + 11 * 60_000,
      login.expiresAt - Date.now(),
    );

    const form = await browserGet(login.authorizationUrl);
    const request = hiddenField(form.html, "request") ?? "";
    const wrong = await providerSubmit(login.authorizationUrl, request, { user: ALICE.user, password: "wrong" });
    checks.add(
      `${mode}: a wrong password stays on the login page of the provider and gives no redirect`,
      form.status === 200 && wrong.status === 401 && wrong.location === null && wrong.html.includes('id="problem"'),
      { form: form.status, wrong: wrong.status },
    );
    const right = await providerSubmit(login.authorizationUrl, hiddenField(wrong.html, "request") ?? "", ALICE);
    checks.add(
      `${mode}: the correct password redirects to the callback of the account service`,
      right.status === 302 && (right.location ?? "").startsWith(`${service.origin}/v1/auth/oidc/callback?`),
      right.status,
    );
    const providerCode = new URL(right.location ?? service.origin).searchParams.get("code") ?? "";
    secrets.add(providerCode);
    const callback = await browserGet(right.location ?? "");
    checks.add(
      `${mode}: the callback redirects the browser to the loopback address of the client`,
      callback.status === 302 && (callback.location ?? "").startsWith(`${receiver.redirectUri}?`),
      callback.status,
    );
    await browserGet(callback.location ?? "");
    const params = await receiver.next();
    const code = params.get("code") ?? "";
    secrets.add(code);
    checks.add(
      `${mode}: the client receives a login code and its own state`,
      code.length >= 32 && params.get("state") === login.state && !params.has("error"),
      { state: params.get("state") === login.state, keys: [...params.keys()] },
    );

    const replayed = await browserGet(right.location ?? "");
    checks.add(
      `${mode}: a second use of the callback address gives an error page and no redirect`,
      replayed.status === 400 && replayed.location === null && replayed.html.includes("<h1>"),
      replayed.status,
    );

    const otherVerifier = await api(service.origin, "/v1/auth/oidc/exchange", {
      body: { code, codeVerifier: pkcePair().verifier },
    });
    checks.add(
      `${mode}: an exchange with a wrong code verifier is refused`,
      otherVerifier.status === 400 && errorCode(otherVerifier) === "invalid_login_code",
      { status: otherVerifier.status, code: errorCode(otherVerifier) },
    );
    const exchanged = await api(service.origin, "/v1/auth/oidc/exchange", {
      body: { code, codeVerifier: login.verifier },
    });
    const sessionToken = textField(exchanged.body, "sessionToken");
    secrets.add(sessionToken);
    const user = objectField(exchanged.body, "user");
    checks.add(
      `${mode}: the exchange with the correct verifier gives a session token and the user`,
      exchanged.status === 200 &&
        sessionToken.length >= 32 &&
        textField(user, "id").length === 36 &&
        textField(user, "email") === "alice@127.0.0.1" &&
        textField(user, "name") === "Alice Example" &&
        user !== null &&
        "avatarUrl" in user &&
        "chatColor" in user &&
        "analyticsEnabled" in user,
      { status: exchanged.status, user },
    );
    const reused = await api(service.origin, "/v1/auth/oidc/exchange", {
      body: { code, codeVerifier: login.verifier },
    });
    checks.add(
      `${mode}: a login code works one time only`,
      reused.status === 400 && errorCode(reused) === "invalid_login_code",
      reused.status,
    );

    const me = await api(service.origin, "/v1/me", { token: sessionToken });
    const anonymous = await api(service.origin, "/v1/me");
    const forged = await api(service.origin, "/v1/me", { token: "not-a-session-token-0123456789abcdef" });
    checks.add(
      `${mode}: /v1/me gives the signed-in user and refuses a request with no or a wrong token`,
      me.status === 200 &&
        textField(me.body, "id") === textField(user, "id") &&
        textField(me.body, "email") === "alice@127.0.0.1" &&
        anonymous.status === 401 &&
        forged.status === 401,
      { me: me.status, anonymous: anonymous.status, forged: forged.status },
    );

    const second = await startLogin(stack, receiver.redirectUri);
    const secondLocation = await callbackLocation(second, ALICE);
    await browserGet(secondLocation.toString());
    const secondParams = await receiver.next();
    const secondExchange = await api(service.origin, "/v1/auth/oidc/exchange", {
      body: { code: secondParams.get("code") ?? "", codeVerifier: second.verifier },
    });
    const secondToken = textField(secondExchange.body, "sessionToken");
    secrets.add(secondToken);
    const firstStill = await api(service.origin, "/v1/me", { token: sessionToken });
    checks.add(
      `${mode}: a second sign-in of the same provider user gives the same account and a new session`,
      secondExchange.status === 200 &&
        textField(objectField(secondExchange.body, "user"), "id") === textField(user, "id") &&
        secondToken !== sessionToken &&
        firstStill.status === 200,
      { status: secondExchange.status },
    );
    return sessionToken;
  } finally {
    await receiver.close();
  }
}

async function loginAs(
  stack: Stack,
  credentials: { user: string; password: string },
): Promise<{ status: number; email: string; name: string; id: string; sessionToken: string }> {
  const receiver = await loopbackReceiver();
  try {
    const login = await startLogin(stack, receiver.redirectUri);
    await browserGet((await callbackLocation(login, credentials)).toString());
    const params = await receiver.next();
    const exchanged = await api(stack.service.origin, "/v1/auth/oidc/exchange", {
      body: { code: params.get("code") ?? "", codeVerifier: login.verifier },
    });
    const user = objectField(exchanged.body, "user");
    const sessionToken = textField(exchanged.body, "sessionToken");
    secrets.add(sessionToken);
    return {
      status: exchanged.status,
      email: textField(user, "email"),
      name: textField(user, "name"),
      id: textField(user, "id"),
      sessionToken,
    };
  } finally {
    await receiver.close();
  }
}

async function accountAddresses(stack: Stack): Promise<void> {
  const { mode, service } = stack;
  const bob = await loginAs(stack, BOB);
  const bobMe = await api(service.origin, "/v1/me", { token: bob.sessionToken });
  checks.add(
    `${mode}: a provider user with no email address can sign in`,
    bob.status === 200 && bob.email === "bob@127.0.0.1" && bob.name === "Bob Example" && bobMe.status === 200,
    { status: bob.status, email: bob.email },
  );
  const carol = await loginAs(stack, CAROL);
  const dave = await loginAs(stack, DAVE);
  checks.add(
    `${mode}: the account address comes from the provider user ID and the provider host, not from the mailbox`,
    carol.email === "carol.admin@127.0.0.1" && dave.email === "dave=40corp.example@127.0.0.1",
    { carol: carol.email, dave: dave.email },
  );
  checks.add(`${mode}: each provider user gets its own account`, new Set([bob.id, carol.id, dave.id]).size === 3);
}

async function callbackFailures(stack: Stack): Promise<void> {
  const { mode, service, mock } = stack;
  const unknown = await browserGet(`${service.origin}/v1/auth/oidc/callback?code=abc&state=${"s".repeat(43)}`);
  checks.add(
    `${mode}: a callback with an unknown state gives an error page and no redirect`,
    unknown.status === 400 && unknown.location === null && !unknown.html.toLowerCase().includes(UPSTREAM_NAME),
    unknown.status,
  );

  const receiver = await loopbackReceiver();
  try {
    const cancelled = await startLogin(stack, receiver.redirectUri);
    const state = new URL(cancelled.authorizationUrl).searchParams.get("state") ?? "";
    const denied = await browserGet(
      `${service.origin}/v1/auth/oidc/callback?error=access_denied&state=${encodeURIComponent(state)}`,
    );
    const deniedLocation = new URL(denied.location ?? service.origin);
    checks.add(
      `${mode}: a refusal at the provider redirects to the client with an error and no code`,
      denied.status === 302 &&
        deniedLocation.searchParams.get("error") === "provider_refused" &&
        deniedLocation.searchParams.get("state") === cancelled.state &&
        !deniedLocation.searchParams.has("code"),
      denied.status,
    );

    const forgedCode = await startLogin(stack, receiver.redirectUri);
    const forgedState = new URL(forgedCode.authorizationUrl).searchParams.get("state") ?? "";
    const forged = await browserGet(
      `${service.origin}/v1/auth/oidc/callback?code=${"c".repeat(43)}&state=${encodeURIComponent(forgedState)}`,
    );
    const forgedLocation = new URL(forged.location ?? service.origin);
    checks.add(
      `${mode}: a provider code that the provider does not know gives an error and no login code`,
      forged.status === 302 &&
        forgedLocation.searchParams.get("error") === "provider_rejected" &&
        !forgedLocation.searchParams.has("code"),
      { status: forged.status, error: forgedLocation.searchParams.get("error") },
    );

    mock.setRefreshTokens(false);
    const noRefresh = await startLogin(stack, receiver.redirectUri);
    const noRefreshLocation = await callbackLocation(noRefresh, ALICE);
    mock.setRefreshTokens(true);
    checks.add(
      `${mode}: a sign-in with no refresh token from the provider is refused`,
      noRefreshLocation.searchParams.get("error") === "refresh_token_missing" &&
        !noRefreshLocation.searchParams.has("code"),
      noRefreshLocation.searchParams.get("error"),
    );

    if (mode !== "oidc") return;
    const faults: IdTokenFault[] = ["signature", "issuer", "audience", "nonce", "expired"];
    const accepted: string[] = [];
    for (const fault of faults) {
      const login = await startLogin(stack, receiver.redirectUri);
      mock.breakNextIdToken(fault);
      const location = await callbackLocation(login, ALICE);
      if (location.searchParams.get("error") !== "token_invalid" || location.searchParams.has("code")) {
        accepted.push(fault);
      }
    }
    checks.add(
      "oidc: an ID token with a wrong signature, issuer, audience, nonce or expiry is refused",
      accepted.length === 0,
      { accepted, tried: faults },
    );
  } finally {
    await receiver.close();
  }
}

async function deviceFlow(stack: Stack): Promise<void> {
  const { mode, service, mock } = stack;
  const started = await api(service.origin, "/v1/auth/device/start", { method: "POST" });
  const deviceCode = textField(started.body, "deviceCode");
  const userCode = textField(started.body, "userCode");
  secrets.add(deviceCode);
  checks.add(
    `${mode}: the device start gives a device code, a user code, the page address, an interval and an expiry`,
    started.status === 200 &&
      deviceCode.length >= 32 &&
      /^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/u.test(userCode) &&
      textField(started.body, "verificationUrl") === `${service.origin}/device` &&
      numberField(started.body, "interval") >= 1 &&
      numberField(started.body, "expiresAt") > Date.now(),
    { status: started.status, userCode: userCode.length },
  );
  const pending = await api(service.origin, "/v1/auth/device/poll", { body: { deviceCode } });
  const tooFast = await api(service.origin, "/v1/auth/device/poll", { body: { deviceCode } });
  checks.add(
    `${mode}: a poll before the approval answers pending, and a poll that comes too fast is refused`,
    pending.status === 200 &&
      textField(pending.body, "status") === "pending" &&
      tooFast.status === 429 &&
      errorCode(tooFast) === "slow_down" &&
      tooFast.headers.has("Retry-After"),
    { pending: pending.status, tooFast: tooFast.status },
  );
  const unknownDevice = await api(service.origin, "/v1/auth/device/poll", {
    body: { deviceCode: "d".repeat(43) },
  });
  checks.add(
    `${mode}: a poll with an unknown device code is refused`,
    unknownDevice.status === 400 && errorCode(unknownDevice) === "device_login_invalid",
    unknownDevice.status,
  );

  const page = await fetch(`${service.origin}/device`);
  const pageHtml = await page.text();
  const policy = page.headers.get("Content-Security-Policy") ?? "";
  checks.add(
    `${mode}: the device page is plain HTML with a code field, a strict content policy and no upstream name`,
    page.status === 200 &&
      (page.headers.get("Content-Type") ?? "").startsWith("text/html") &&
      pageHtml.includes('name="code"') &&
      !pageHtml.toLowerCase().includes(UPSTREAM_NAME) &&
      !pageHtml.includes("<script") &&
      policy.includes("default-src 'none'") &&
      policy.includes("frame-ancestors 'none'") &&
      policy.includes(mock.origin) &&
      page.headers.get("X-Frame-Options") === "DENY",
    { status: page.status, policy },
  );
  const wrongCode = await browserPost(`${service.origin}/device`, { code: "ZZZZ-ZZZZ" });
  checks.add(
    `${mode}: a wrong user code shows the device page again with an error`,
    wrongCode.status === 400 && wrongCode.location === null && wrongCode.html.includes('role="alert"'),
    wrongCode.status,
  );

  const begun = await browserPost(`${service.origin}/device`, { code: userCode.toLowerCase() });
  checks.add(
    `${mode}: the correct user code sends the browser to the provider`,
    begun.status === 303 && (begun.location ?? "").startsWith(mock.origin),
    begun.status,
  );
  const provider = await providerLogin(begun.location ?? "", BOB);
  const approval = await browserGet(provider.submitted.location ?? "");
  const approvalToken = hiddenField(approval.html, "approval") ?? "";
  secrets.add(approvalToken);
  checks.add(
    `${mode}: after the provider login the service shows the approval page with the account and the code`,
    approval.status === 200 &&
      approval.location === null &&
      approvalToken.length >= 32 &&
      approval.html.includes(userCode) &&
      approval.html.includes("Bob Example") &&
      !approval.html.toLowerCase().includes(UPSTREAM_NAME),
    approval.status,
  );
  const beforeDecision = await api(service.origin, "/v1/auth/device/poll", { body: { deviceCode } });
  checks.add(
    `${mode}: the device gets no session before the user approves`,
    beforeDecision.status !== 200 || textField(beforeDecision.body, "status") === "pending",
    beforeDecision.status,
  );
  const allowed = await browserPost(`${service.origin}/device/decision`, {
    approval: approvalToken,
    decision: "allow",
  });
  const session = await waitFor("the device session", async () => {
    const poll = await api(service.origin, "/v1/auth/device/poll", { body: { deviceCode } });
    return poll.status === 200 && textField(poll.body, "sessionToken") ? poll : null;
  });
  const deviceToken = textField(session.body, "sessionToken");
  secrets.add(deviceToken);
  const me = await api(service.origin, "/v1/me", { token: deviceToken });
  checks.add(
    `${mode}: after the approval the poll gives the session of the user who approved`,
    allowed.status === 200 &&
      textField(objectField(session.body, "user"), "email") === "bob@127.0.0.1" &&
      me.status === 200 &&
      textField(me.body, "email") === "bob@127.0.0.1",
    { allowed: allowed.status, me: me.status },
  );
  const again = await api(service.origin, "/v1/auth/device/poll", { body: { deviceCode } });
  const replayedApproval = await browserPost(`${service.origin}/device/decision`, {
    approval: approvalToken,
    decision: "allow",
  });
  checks.add(
    `${mode}: a device code and an approval work one time only`,
    again.status === 400 && errorCode(again) === "device_login_invalid" && replayedApproval.status === 400,
    { again: again.status, replayedApproval: replayedApproval.status },
  );

  const second = await api(service.origin, "/v1/auth/device/start", {
    body: { deviceName: "build-server" },
  });
  const secondDeviceCode = textField(second.body, "deviceCode");
  secrets.add(secondDeviceCode);
  const secondBegin = await browserPost(`${service.origin}/device`, { code: textField(second.body, "userCode") });
  const secondProvider = await providerLogin(secondBegin.location ?? "", ALICE);
  const secondApproval = await browserGet(secondProvider.submitted.location ?? "");
  const refused = await browserPost(`${service.origin}/device/decision`, {
    approval: hiddenField(secondApproval.html, "approval") ?? "",
    decision: "refuse",
  });
  const denied = await api(service.origin, "/v1/auth/device/poll", { body: { deviceCode: secondDeviceCode } });
  checks.add(
    `${mode}: the approval page names the device, and a refusal gives the device no session`,
    secondApproval.html.includes("build-server") &&
      refused.status === 200 &&
      denied.status === 403 &&
      errorCode(denied) === "device_login_denied",
    { refused: refused.status, denied: denied.status },
  );
}

async function appLinkLogin(stack: Stack): Promise<void> {
  const { mode, service } = stack;
  const login = await startLogin(stack, "codebot://auth");
  const location = await callbackLocation(login, ALICE);
  const code = location.searchParams.get("code") ?? "";
  secrets.add(code);
  const badDevice = await api(service.origin, "/v1/auth/oidc/exchange", {
    body: { code, codeVerifier: login.verifier, deviceId: "not-a-uuid", deviceName: "Phone", platform: "ios" },
  });
  const exchanged = await api(service.origin, "/v1/auth/oidc/exchange", {
    body: {
      code,
      codeVerifier: login.verifier,
      deviceId: crypto.randomUUID(),
      deviceName: "Test phone",
      platform: "android",
    },
  });
  const token = textField(exchanged.body, "sessionToken");
  secrets.add(token);
  const me = await api(service.origin, "/v1/me", { token });
  checks.add(
    `${mode}: a sign-in through the app link gives a session to a phone with a valid device`,
    location.protocol === "codebot:" &&
      location.host === "auth" &&
      location.searchParams.get("state") === login.state &&
      badDevice.status === 400 &&
      exchanged.status === 200 &&
      me.status === 200,
    { protocol: location.protocol, badDevice: badDevice.status, exchanged: exchanged.status, me: me.status },
  );
}

async function restartKeepsSessions(stack: Stack, sessionToken: string): Promise<Stack> {
  const { mode, mock, port } = stack;
  const stopped = await stack.service.stop();
  checks.add(`${mode}: the service stops cleanly when it is asked to stop`, stopped.clean, stopped);
  const leaked = [...secrets].filter((secret) => secret && stack.service.logs.some((line) => line.includes(secret)));
  checks.add(`${mode}: the log has no client secret, token or code`, leaked.length === 0, {
    leaked: leaked.length,
    lines: stack.service.logs.length,
  });
  const service = await startAccountService({
    port,
    dataDir: stack.service.dataDir,
    provider: mode === "oidc" ? { issuerUrl: mock.origin } : { nextcloudUrl: mock.origin },
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
  });
  const me = await api(service.origin, "/v1/me", { token: sessionToken });
  const applied = service.logs.find((line) => line.includes("The database schema is current."));
  checks.add(
    `${mode}: after a restart on the same data folder the session is still valid and no migration runs again`,
    me.status === 200 && (applied ?? "").includes('"applied":0'),
    { me: me.status, applied },
  );
  return { ...stack, service };
}

async function modeScenarios(mode: OidcMockMode): Promise<void> {
  let stack: Stack | null = null;
  try {
    stack = await startStack(mode);
    const running = stack;
    let sessionToken = "";
    await checks.scenario(`${mode}: start refusals`, () => startRefusals(running));
    await checks.scenario(`${mode}: full login`, async () => {
      sessionToken = await fullLogin(running);
    });
    await checks.scenario(`${mode}: account addresses`, () => accountAddresses(running));
    await checks.scenario(`${mode}: callback failures`, () => callbackFailures(running));
    await checks.scenario(`${mode}: device flow`, () => deviceFlow(running));
    await checks.scenario(`${mode}: app link`, () => appLinkLogin(running));
    await checks.scenario(`${mode}: restart`, async () => {
      stack = await restartKeepsSessions(running, sessionToken);
    });
  } finally {
    if (stack) await closeAll({ services: [stack.service], mocks: [stack.mock] });
  }
}

async function expiredLogin(): Promise<void> {
  const stack = await startStack("oidc", { ACCOUNT_LOGIN_FLOW_SECONDS: "1" });
  const receiver = await loopbackReceiver();
  try {
    const login = await startLogin(stack, receiver.redirectUri);
    const provider = await providerLogin(login.authorizationUrl, ALICE);
    await waitFor("the end of the pending login", async () => Date.now() > login.expiresAt + 50);
    const callback = await browserGet(provider.submitted.location ?? "");
    const location = new URL(callback.location ?? stack.service.origin);
    checks.add(
      "an expired pending login gives the client an error and no login code",
      callback.status === 302 &&
        location.searchParams.get("error") === "login_expired" &&
        location.searchParams.get("state") === login.state &&
        !location.searchParams.has("code"),
      { status: callback.status, error: location.searchParams.get("error") },
    );
    const device = await api(stack.service.origin, "/v1/auth/device/start", { method: "POST" });
    const deviceCode = textField(device.body, "deviceCode");
    await waitFor("the end of the device login", async () => Date.now() > numberField(device.body, "expiresAt") + 50);
    const poll = await api(stack.service.origin, "/v1/auth/device/poll", { body: { deviceCode } });
    const late = await browserPost(`${stack.service.origin}/device`, { code: textField(device.body, "userCode") });
    checks.add(
      "an expired device login is refused at the poll and at the device page",
      poll.status === 410 && errorCode(poll) === "device_login_expired" && late.status === 400,
      { poll: poll.status, late: late.status },
    );
  } finally {
    await receiver.close();
    await closeAll({ services: [stack.service], mocks: [stack.mock] });
  }
}

await checks.scenario("oidc", () => modeScenarios("oidc"));
await checks.scenario("nextcloud", () => modeScenarios("nextcloud"));
await checks.scenario("expired login", expiredLogin);
if (!(await checks.writeReport("account-oidc-login-e2e"))) process.exitCode = 1;
