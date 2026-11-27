import { createHash, randomBytes } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import {
  type AccountSignInDependencies,
  AccountSignInError,
  isAccountSignInReturn,
  signInWithAccountService,
} from "../apps/mobile/src/features/auth/model/account-sign-in";
import {
  decodeStoredAddresses,
  type FetchFunction,
  normalizeAccountAddress,
  normalizeSignalAddress,
  resolveServiceAddresses,
  signalOverrideFetch,
} from "../apps/mobile/src/features/auth/model/service-addresses";
import { isDynamicRecord } from "../packages/contracts/src/runtime-values";
import {
  type AccountService,
  api,
  browserGet,
  Checks,
  closeAll,
  freePort,
  objectField,
  providerLogin,
  ROOT,
  startAccountService,
  textField,
} from "./account-e2e-support";
import { type OidcMock, type OidcMockMode, startOidcMock } from "./oidc-mock-server";

const CLIENT_ID = "codebot-mobile-e2e";
const CLIENT_SECRET = "mobile-e2e-client-secret-7c1d9a";
const ALICE = { user: "alice", password: "alice-password-1" };
const BOB = { user: "bob", password: "bob-password-2" };
const DEVICE = { id: "11111111-1111-4111-8111-111111111111", name: "E2E phone", platform: "android" as const };

const checks = new Checks();

interface Stack {
  mock: OidcMock;
  service: AccountService;
}

async function startStack(mode: OidcMockMode): Promise<Stack> {
  const port = await freePort();
  const mock = await startOidcMock({
    mode,
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    redirectUri: `http://127.0.0.1:${port}/v1/auth/oidc/callback`,
    users: [
      { id: ALICE.user, password: ALICE.password, displayName: "Alice Example", email: "alice@example.com" },
      { id: BOB.user, password: BOB.password, displayName: "Bob Example", email: null },
    ],
  });
  const service = await startAccountService({
    port,
    provider: mode === "oidc" ? { issuerUrl: mock.origin } : { nextcloudUrl: mock.origin },
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
  });
  return { mock, service };
}

function phone(
  credentials: { user: string; password: string } | "cancel" | { state: string },
  seen: { authorizationUrls: string[] },
): AccountSignInDependencies {
  return {
    fetch,
    randomBytes: (length) => new Uint8Array(randomBytes(length)),
    sha256Base64: async (value) => createHash("sha256").update(value).digest("base64"),
    device: async () => DEVICE,
    openAuth: async (authorizationUrl) => {
      seen.authorizationUrls.push(authorizationUrl);
      if (credentials === "cancel") return { type: "cancel" };
      if ("state" in credentials) return { type: "success", url: `codebot://auth?code=x&state=${credentials.state}` };
      const login = await providerLogin(authorizationUrl, credentials);
      if (login.submitted.status !== 302 || !login.submitted.location) return { type: "dismiss" };
      const callback = await browserGet(login.submitted.location);
      if (callback.status !== 302 || !callback.location) return { type: "dismiss" };
      return { type: "success", url: callback.location };
    },
  };
}

async function signInScenario(mode: OidcMockMode): Promise<void> {
  const stack = await startStack(mode);
  const origin = stack.service.origin;
  try {
    const seen: { authorizationUrls: string[] } = { authorizationUrls: [] };
    const result = await signInWithAccountService(origin, phone(ALICE, seen));
    const user = isDynamicRecord(result?.user) ? result.user : null;
    checks.add(
      `${mode}: the phone signs in through the account service with a Nextcloud login`,
      Boolean(result?.sessionToken) && user?.name === "Alice Example",
      { hasToken: Boolean(result?.sessionToken), user },
    );
    checks.add(
      `${mode}: the sign-in page that the phone opens is the page of the identity provider`,
      seen.authorizationUrls.length === 1 && seen.authorizationUrls[0]?.startsWith(stack.mock.origin) === true,
      { opened: seen.authorizationUrls },
    );
    const token = result?.sessionToken ?? "";
    const session = await api(origin, "/v1/mobile-auth/session", { token });
    checks.add(
      `${mode}: the session token of the phone is valid at the account service`,
      session.status === 200 && textField(session.body, "name") === "Alice Example",
      { status: session.status },
    );
    const devices = await api(origin, "/v1/mobile-auth/devices?includeDesktop=true", { token });
    const listed = isDynamicRecord(devices.body) && Array.isArray(devices.body.sessions) ? devices.body.sessions : [];
    checks.add(
      `${mode}: the account service lists the phone as a mobile session`,
      devices.status === 200 &&
        listed.some((item) => isDynamicRecord(item) && item.name === DEVICE.name && item.kind === "mobile"),
      { status: devices.status, listed },
    );
    const noEmail = await signInWithAccountService(origin, phone(BOB, { authorizationUrls: [] }));
    checks.add(
      `${mode}: a Nextcloud user with no email address signs in`,
      Boolean(noEmail?.sessionToken),
      noEmail?.user,
    );
    const cancelled = await signInWithAccountService(origin, phone("cancel", { authorizationUrls: [] }));
    checks.add(`${mode}: closing the browser sheet cancels the sign-in with no error`, cancelled === null);
    const mismatch = await signInWithAccountService(
      origin,
      phone({ state: "wrong-state-value" }, { authorizationUrls: [] }),
    ).then(
      () => null,
      (error: unknown) => error,
    );
    checks.add(
      `${mode}: a return with another state is refused`,
      mismatch instanceof AccountSignInError && mismatch.code === "state_mismatch",
      mismatch instanceof AccountSignInError ? mismatch.code : String(mismatch),
    );
    const wrongPassword = await signInWithAccountService(
      origin,
      phone({ user: ALICE.user, password: "not-the-password" }, { authorizationUrls: [] }),
    ).then(
      (value) => value,
      (error: unknown) => error,
    );
    checks.add(
      `${mode}: a wrong Nextcloud password gives no session`,
      wrongPassword === null || wrongPassword instanceof AccountSignInError,
      wrongPassword instanceof AccountSignInError ? wrongPassword.code : wrongPassword,
    );
    const config = await api(origin, "/v1/auth/config");
    checks.add(
      `${mode}: the account service names the login kind`,
      objectField(config.body, "login")?.kind === "oidc",
      config.body,
    );
    const removed = await api(origin, "/v1/auth/email/start", { body: { email: "alice@example.com" } });
    const billing = await api(origin, "/v1/me/billing/");
    const credits = await api(origin, "/v1/me/credits/");
    checks.add(
      `${mode}: the email-code login, billing and credits routes that the phone no longer uses are not served`,
      removed.status === 404 && billing.status === 404 && credits.status === 404,
      { email: removed.status, billing: billing.status, credits: credits.status },
    );
  } finally {
    await closeAll({ services: [stack.service], mocks: [stack.mock] });
  }
}

async function unreachableScenario(): Promise<void> {
  const port = await freePort();
  const deaf = await signInWithAccountService(`http://127.0.0.1:${port}`, phone(ALICE, { authorizationUrls: [] })).then(
    () => null,
    (error: unknown) => error,
  );
  checks.add(
    "an address with no service gives the unreachable error",
    deaf instanceof AccountSignInError && deaf.code === "service_unreachable",
    deaf instanceof AccountSignInError ? deaf.code : String(deaf),
  );
  const other = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    fetch: () => new Response("<html>hello</html>", { status: 200 }),
  });
  try {
    const wrong = await signInWithAccountService(
      `http://127.0.0.1:${other.port}`,
      phone(ALICE, { authorizationUrls: [] }),
    ).then(
      () => null,
      (error: unknown) => error,
    );
    checks.add(
      "an address of a server that is not an account service gives the not-account-service error",
      wrong instanceof AccountSignInError && wrong.code === "not_account_service",
      wrong instanceof AccountSignInError ? wrong.code : String(wrong),
    );
  } finally {
    await other.stop(true);
  }
}

function addressScenario(): void {
  checks.add(
    "an account address with no scheme gets https",
    normalizeAccountAddress("account.example.com") === "https://account.example.com" &&
      normalizeAccountAddress(" https://account.example.com/ ") === "https://account.example.com",
  );
  checks.add(
    "an account address with plain http is allowed only for a local network host",
    normalizeAccountAddress("http://account.example.com") === null &&
      normalizeAccountAddress("http://192.168.1.20:3100") === "http://192.168.1.20:3100" &&
      normalizeAccountAddress("http://127.0.0.1:3100") === "http://127.0.0.1:3100",
  );
  checks.add(
    "an account address with a path, a query, a password or another scheme is refused",
    normalizeAccountAddress("https://account.example.com/app") === null &&
      normalizeAccountAddress("https://account.example.com/?a=1") === null &&
      normalizeAccountAddress("https://user:pass@account.example.com") === null &&
      normalizeAccountAddress("ftp://account.example.com") === null &&
      normalizeAccountAddress("") === null,
  );
  checks.add(
    "a Signal address becomes a wss address with the default path",
    normalizeSignalAddress("signal.example.com") === "wss://signal.example.com/v1/signal" &&
      normalizeSignalAddress("https://signal.example.com/v1/signal") === "wss://signal.example.com/v1/signal" &&
      normalizeSignalAddress("ws://signal.example.com") === null &&
      normalizeSignalAddress("ws://10.0.0.4:8081/v1/signal") === "ws://10.0.0.4:8081/v1/signal",
  );
  const none = resolveServiceAddresses(null, {});
  checks.add(
    "with no stored address and no build setting there is no default service",
    none.accountUrl === null && none.signalUrl === null,
    none,
  );
  const built = resolveServiceAddresses(null, { accountUrl: "account.example.com", signalUrl: "signal.example.com" });
  const stored = resolveServiceAddresses(
    decodeStoredAddresses(JSON.stringify({ accountUrl: "https://mine.example.org" })),
    {
      accountUrl: "account.example.com",
    },
  );
  checks.add(
    "a build setting gives the default and a stored address wins",
    built.accountUrl === "https://account.example.com" &&
      built.signalUrl === "wss://signal.example.com/v1/signal" &&
      stored.accountUrl === "https://mine.example.org",
    { built, stored },
  );
  checks.add(
    "a damaged stored value is ignored",
    decodeStoredAddresses("{not json") === null && decodeStoredAddresses('"text"') === null,
  );
  checks.add(
    "the app link that ends the browser sign-in is recognised",
    isAccountSignInReturn("codebot://auth?code=a&state=b") &&
      isAccountSignInReturn("codebot://auth") &&
      !isAccountSignInReturn("codebot://join?x=1"),
  );
}

async function signalScenario(): Promise<void> {
  const ticket = { ticket: "t", signalUrl: "wss://upstream.example/v1/signal", sessionId: "s" };
  const base: FetchFunction = async (input) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    return url.includes("/ticket")
      ? Response.json(ticket)
      : Response.json({ signalUrl: "wss://other.example", hosts: [] });
  };
  const override = "wss://signal.home.example/v1/signal";
  const wrapped = signalOverrideFetch(base, () => override);
  const changed = await (
    await wrapped("https://account.example/v2/remote/sessions/abc/ticket", { method: "POST" })
  ).json();
  const untouched = await (await wrapped("https://account.example/v2/remote/hosts/")).json();
  const plain = signalOverrideFetch(base, () => null);
  const same = await (await plain("https://account.example/v2/remote/sessions/abc/ticket", { method: "POST" })).json();
  checks.add(
    "a Signal address in the settings replaces the Signal address in a session ticket and nothing else",
    changed.signalUrl === override &&
      changed.ticket === "t" &&
      untouched.signalUrl === "wss://other.example" &&
      same.signalUrl === ticket.signalUrl,
    { changed, untouched, same },
  );
}

function listFiles(folder: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(folder)) {
    if (name === "node_modules" || name === ".expo") continue;
    const path = join(folder, name);
    if (statSync(path).isDirectory()) out.push(...listFiles(path));
    else out.push(path);
  }
  return out;
}

function sourceScenario(): void {
  const mobile = join(ROOT, "apps", "mobile");
  const upstream = ["open", "bot"].join("");
  const forbidden = new RegExp(`${upstream}\\.(run|site|ai)|workers\\.dev|openpanel`, "iu");
  const hits: string[] = [];
  for (const path of [...listFiles(join(mobile, "src")), join(mobile, "app.json")]) {
    if (!/\.(ts|tsx|json)$/u.test(path) || /\.test\.ts$/u.test(path) || /generated/u.test(path)) continue;
    const text = readFileSync(path, "utf8");
    if (forbidden.test(text)) hits.push(relative(ROOT, path));
  }
  checks.add("the mobile source and app.json name no upstream server", hits.length === 0, hits);
  const app = JSON.parse(readFileSync(join(mobile, "app.json"), "utf8"));
  const updates = objectField(objectField(app, "expo"), "updates");
  checks.add("over-the-air updates are off in app.json", updates?.enabled === false && updates.url === undefined);
  const gone = [
    "src/app/(app)/settings/billing.tsx",
    "src/app/(app)/settings/credits.tsx",
    "src/app/(app)/settings/invite.tsx",
    "src/app/(app)/hosted-server",
    "src/features/settings/screens/billing-settings-screen.tsx",
    "src/features/auth/model/use-email-sign-in.ts",
    "src/features/auth/components/email-code-input.tsx",
  ];
  const present = gone.filter((path) => existsSync(join(mobile, path)));
  checks.add(
    "the billing, credits, plan and email-code screens are removed from the mobile app",
    present.length === 0,
    present,
  );
  const layout = readFileSync(join(mobile, "src/app/(app)/_layout.tsx"), "utf8");
  checks.add("no route of the mobile app opens a hosted server plan screen", !layout.includes("hosted-server"));
}

await checks.scenario("oidc sign-in", () => signInScenario("oidc"));
await checks.scenario("nextcloud sign-in", () => signInScenario("nextcloud"));
await checks.scenario("unreachable", unreachableScenario);
await checks.scenario("addresses", async () => addressScenario());
await checks.scenario("signal", signalScenario);
await checks.scenario("source", async () => sourceScenario());
if (!(await checks.writeReport("mobile-account"))) process.exitCode = 1;
