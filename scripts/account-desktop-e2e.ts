import { type ChildProcess, spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer, request as httpRequest, type Server } from "node:http";
import { join, resolve, sep } from "node:path";
import { type Browser, chromium, type Page } from "playwright-core";
import {
  type AccountService,
  browserGet,
  Checks,
  closeAll,
  freePort,
  providerLogin,
  startAccountService,
  temporaryFolder,
  waitFor,
} from "./account-e2e-support";
import { createDevelopmentServiceSpec } from "./dev-services";
import { type OidcMock, startOidcMock } from "./oidc-mock-server";

const NAME = "account-desktop";
const ROOT = resolve(import.meta.dirname, "..");
const OUT = join(ROOT, ".codebot-build", NAME);
const SCREENS = join(ROOT, ".codebot-build", "w04", "screens");
const CLIENT_ID = "codebot-desktop-e2e";
const CLIENT_SECRET = "desktop-e2e-secret-91c3d7a2f0b4";
const ALICE = { user: "alice", password: "alice-password-1" };
const APP_START_LIMIT_MS = 240_000;

const checks = new Checks();
const screenshots: string[] = [];

interface Proxy {
  origin: string;
  count: () => number;
  close: () => Promise<void>;
}

async function startCountingProxy(target: string): Promise<Proxy> {
  let requests = 0;
  const targetUrl = new URL(target);
  const server: Server = createServer((incoming, outgoing) => {
    requests += 1;
    const forwarded = httpRequest(
      {
        host: targetUrl.hostname,
        port: targetUrl.port,
        path: incoming.url,
        method: incoming.method,
        headers: incoming.headers,
      },
      (answer) => {
        outgoing.writeHead(answer.statusCode ?? 502, answer.headers);
        answer.pipe(outgoing);
      },
    );
    forwarded.on("error", () => {
      outgoing.writeHead(502);
      outgoing.end();
    });
    incoming.pipe(forwarded);
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("The proxy has no port.");
  return {
    origin: `http://127.0.0.1:${address.port}`,
    count: () => requests,
    close: () => new Promise<void>((done) => server.close(() => done())),
  };
}

function assertSandbox(): void {
  const home = process.env.USERPROFILE ?? process.env.HOME ?? "";
  if (!home.includes(`${sep}_sandbox${sep}`) && !home.includes("/_sandbox/")) {
    throw new Error("Run this test after cb_sandbox: the profile is not redirected to _sandbox.");
  }
}

async function launchApp(
  environment: NodeJS.ProcessEnv,
): Promise<{ child: ChildProcess; debugPort: number; log: string[] }> {
  const rendererPort = await freePort();
  const debugPort = await freePort();
  const childEnvironment: NodeJS.ProcessEnv = {
    ...environment,
    CODEBOT_DEV_RENDERER_PORT: String(rendererPort),
    CODEBOT_DEV_REMOTE_DEBUGGING_PORT: String(debugPort),
    CODEBOT_DEV_REMOTE_ROLE: "none",
    CODEBOT_DEV_INSTANCE_ID: "w04e2e",
    CODEBOT_DEV_WINDOW_FOCUS: "background",
  };
  delete childEnvironment.CODEBOT_AUTH_API_URL;
  const spec = createDevelopmentServiceSpec("app", childEnvironment);
  const log: string[] = [];
  const child = spawn(spec.executable, spec.args, {
    cwd: spec.cwd,
    env: spec.env,
    stdio: ["ignore", "pipe", "pipe"],
    detached: process.platform !== "win32",
    shell: process.platform === "win32" && spec.executable.endsWith(".cmd"),
  });
  const collect = (chunk: Buffer) => {
    for (const line of chunk.toString().split(/\r?\n/u)) if (line) log.push(line);
  };
  child.stdout?.on("data", collect);
  child.stderr?.on("data", collect);
  return { child, debugPort, log };
}

async function connect(debugPort: number): Promise<{ browser: Browser; page: Page }> {
  return waitFor(
    "the app window",
    async () => {
      try {
        const browser = await chromium.connectOverCDP(`http://127.0.0.1:${debugPort}`);
        for (const context of browser.contexts()) {
          for (const page of context.pages()) {
            if (!page.url().startsWith("http://localhost") && !page.url().startsWith("http://127.0.0.1")) continue;
            const ready = await page.evaluate(() => "codebot" in window).catch(() => false);
            if (ready) return { browser, page };
          }
        }
        await browser.close();
        return null;
      } catch {
        return null;
      }
    },
    APP_START_LIMIT_MS,
  );
}

async function shot(page: Page, label: string): Promise<string> {
  await mkdir(SCREENS, { recursive: true });
  const path = join(SCREENS, `${label}.png`);
  await page.screenshot({ path });
  screenshots.push(path);
  return path;
}

async function authStatus(page: Page): Promise<string> {
  return page.evaluate(async () => (await window.codebot.auth.getState()).status);
}

async function openProfileSettings(page: Page): Promise<void> {
  await page.keyboard.press("Control+,");
  await page.getByRole("tab", { name: "Profile" }).click({ timeout: 20_000 });
}

async function signInThroughBrowser(page: Page, pageFile: string, capture: boolean): Promise<string> {
  await rm(pageFile, { force: true });
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const authorizationUrl = await waitFor("the sign-in page link", async () => {
    try {
      return (await readFile(pageFile, "utf8")) || null;
    } catch {
      return null;
    }
  });
  checks.add("sign-in: the app asks the service for the Nextcloud page", authorizationUrl.startsWith(mockOrigin()), {
    host: new URL(authorizationUrl).origin,
  });
  const waiting = await authStatus(page);
  checks.add("sign-in: the app waits for the browser", waiting === "browser_sign_in", { waiting });
  if (capture) await shot(page, "04-sign-in-waiting-for-browser");
  const login = await providerLogin(authorizationUrl, ALICE);
  const location = login.submitted.location;
  if (login.submitted.status !== 302 || !location) throw new Error("The mock provider did not accept the login.");
  const callback = await browserGet(location);
  if (!callback.location) throw new Error("The account service did not redirect to the app.");
  await browserGet(callback.location);
  await waitFor("the signed-in state", async () => (await authStatus(page)) === "signed_in");
  return authorizationUrl;
}

function mockOrigin(): string {
  if (!mock) throw new Error("The mock provider is not running.");
  return mock.origin;
}

async function stopApp(child: ChildProcess | undefined): Promise<void> {
  if (!child?.pid) return;
  if (process.platform === "win32") {
    await new Promise<void>((done) => {
      const killer = spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
      killer.on("exit", () => done());
      killer.on("error", () => done());
    });
    return;
  }
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    child.kill("SIGTERM");
  }
}

let mock: OidcMock | undefined;
let service: AccountService | undefined;
let proxy: Proxy | undefined;
let app: { child: ChildProcess; debugPort: number; log: string[] } | undefined;
let browser: Browser | undefined;
let failure: string | undefined;
const pageErrors: string[] = [];

try {
  assertSandbox();
  await rm(SCREENS, { recursive: true, force: true });
  const roaming = process.env.APPDATA ?? "";
  if (!roaming.includes("_sandbox")) throw new Error("APPDATA is not in the sandbox.");
  await rm(join(roaming, "CodeBot Dev"), { recursive: true, force: true });
  const port = await freePort();
  mock = await startOidcMock({
    mode: "nextcloud",
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    redirectUri: `http://127.0.0.1:${port}/v1/auth/oidc/callback`,
    users: [{ id: ALICE.user, password: ALICE.password, displayName: "Alice Example", email: "alice@example.com" }],
  });
  service = await startAccountService({
    port,
    provider: { nextcloudUrl: mock.origin },
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    environment: { ACCOUNT_REVALIDATE_SECONDS: "2", ACCOUNT_TICKET_FRESHNESS_SECONDS: "1" },
  });
  proxy = await startCountingProxy(service.origin);
  const pageFile = join(await temporaryFolder("codebot-signin-page"), "page.txt");

  app = await launchApp({ ...process.env, CODEBOT_E2E_SIGN_IN_PAGE_FILE: pageFile });
  const connected = await connect(app.debugPort);
  browser = connected.browser;
  const page = connected.page;
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await waitFor("the signed-out state", async () => (await authStatus(page)) === "signed_out");
  await page
    .waitForFunction(() => document.querySelector(".app-loading") !== null, undefined, { timeout: 30_000 })
    .catch(() => undefined);
  await page.waitForFunction(() => document.querySelector(".app-loading") === null, undefined, { timeout: 120_000 });
  await page.getByRole("button", { name: "Continue" }).click({ timeout: 30_000 });
  await page.getByRole("button", { name: "Continue" }).waitFor({ state: "detached", timeout: 30_000 });
  await page.getByText("Use free models").click({ timeout: 30_000 });
  await page.waitForTimeout(4_000);
  await page.waitForTimeout(3_000);
  const loginText = await page.getByText("Sign in to CodeBot").count();
  checks.add("local profile: the app opens without a login screen", loginText === 0, { loginText });
  await page.waitForTimeout(2_000);
  checks.add("local profile: no request goes to the account service", proxy.count() === 0, {
    requests: proxy.count(),
  });
  await shot(page, "01-signed-out-local-profile");

  await openProfileSettings(page);
  const addressField = page.getByRole("textbox", { name: "Service address" });
  await addressField.waitFor({ timeout: 20_000 });
  const signInDisabled = await page.getByRole("button", { name: "Sign in", exact: true }).isDisabled();
  checks.add("sign-in form: Sign in is off until an address is saved", signInDisabled);
  await shot(page, "02-sign-in-form-empty");

  await addressField.fill(proxy.origin);
  await page.getByRole("button", { name: "Save" }).click();
  await waitFor("the saved address", async () => {
    const settings = await page.evaluate(() => window.codebot.auth.getServiceSettings());
    return settings.url === proxy?.origin;
  });
  checks.add("settings: the account service address is saved", true, { url: proxy.origin });
  await shot(page, "03-sign-in-form-address-saved");

  await signInThroughBrowser(page, pageFile, true);
  const user = await page.evaluate(async () => {
    const state = await window.codebot.auth.getState();
    return state.status === "signed_in" ? state.user : null;
  });
  checks.add(
    "sign-in: the Nextcloud user is signed in",
    user?.name === "Alice Example" && user.email.startsWith("alice@"),
    { user },
  );
  await page.getByText("Alice Example").and(page.locator(":visible")).first().waitFor({ timeout: 20_000 });
  await shot(page, "05-signed-in");

  const sessionFileState = await page.evaluate(async () => {
    const state = await window.codebot.auth.retry();
    return state.status;
  });
  checks.add("restart of the account runtime keeps the session", sessionFileState === "signed_in", {
    sessionFileState,
  });

  await page.getByRole("button", { name: "Sign out" }).and(page.locator(":visible")).scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Sign out" }).and(page.locator(":visible")).click();
  await waitFor("sign-out", async () => (await authStatus(page)) === "signed_out");
  const afterSignOut = await page.evaluate(() => window.codebot.auth.getServiceSettings());
  checks.add(
    "sign-out: the user returns to the local profile and the address stays",
    afterSignOut.url === proxy.origin,
  );
  await shot(page, "06-signed-out-again");
  await signInThroughBrowser(page, pageFile, false);
  checks.add("sign-in again works after a sign-out", true);

  mock.disableUser(ALICE.user);
  await new Promise((next) => setTimeout(next, 3_000));
  const afterDisable = await page.evaluate(async () => (await window.codebot.auth.retry()).status);
  const finalStatus = await waitFor("access to end for the disabled user", async () => {
    const status = await authStatus(page);
    return status === "signed_out" ? status : null;
  });
  checks.add("disabled user: the app loses the account access", finalStatus === "signed_out", { afterDisable });
  await shot(page, "07-disabled-user-signed-out");

  mock.enableUser(ALICE.user);
  const signOutServiceUrl = await page.evaluate(() => window.codebot.auth.getServiceSettings());
  checks.add("sign-out: the address stays, the profile is local again", signOutServiceUrl.url === proxy.origin);
  const realErrors = pageErrors.filter((message) => !message.includes("ViewTransition"));
  checks.add("no page errors", realErrors.length === 0, { realErrors });
} catch (error) {
  failure = error instanceof Error ? error.stack : String(error);
  checks.add("script finished", false, { failure });
} finally {
  await browser?.close().catch(() => undefined);
  await stopApp(app?.child);
  await proxy?.close().catch(() => undefined);
  await closeAll({ mocks: mock ? [mock] : [], services: service ? [service] : [] });
  await mkdir(OUT, { recursive: true });
  const report = {
    passed: checks.list.length > 0 && checks.list.every((entry) => entry.passed),
    checks: checks.list,
    screenshots,
    failure,
    appLog: app?.log.slice(-60),
  };
  await writeFile(join(OUT, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${report.passed ? "PASS" : "FAIL"}: report in ${join(OUT, "report.json")}\n`);
  if (!report.passed) process.exitCode = 1;
}
