import { type ChildProcess, spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { type DynamicRecord, isDynamicRecord, isNumber, isString } from "@codebot/contracts/runtime-values";
import { generateAccountKeys } from "../apps/auth-api/src/bun/keys";
import type { OidcMock } from "./oidc-mock-server";

export const ROOT = resolve(import.meta.dirname, "..");
const SERVER_ENTRY = join(ROOT, "apps", "auth-api", "src", "bun", "server.ts");
const START_LIMIT_MS = 30_000;
const STOP_LIMIT_MS = 20_000;
const WAIT_LIMIT_MS = 30_000;
const SERVICE_VARIABLE = /^(?:ACCOUNT_|OIDC_|NEXTCLOUD_|REMOTE_|SLACK_|DISCORD_|TELEGRAM_|CODEBOT_LOG_LEVEL$)/u;

export interface Check {
  name: string;
  passed: boolean;
  detail?: unknown;
}

export class Checks {
  readonly list: Check[] = [];

  add(name: string, passed: boolean, detail?: unknown): boolean {
    this.list.push({ name, passed, ...(detail === undefined ? {} : { detail }) });
    process.stdout.write(`${passed ? "PASS" : "FAIL"} ${name}\n`);
    return passed;
  }

  async scenario(name: string, run: () => Promise<void>): Promise<void> {
    try {
      await run();
    } catch (error) {
      this.add(`${name}: the scenario finished`, false, error instanceof Error ? error.message : String(error));
    }
  }

  async writeReport(folder: string): Promise<boolean> {
    const out = join(ROOT, ".codebot-build", folder);
    await mkdir(out, { recursive: true });
    const passed = this.list.length > 0 && this.list.every((entry) => entry.passed);
    const path = join(out, "report.json");
    await writeFile(path, `${JSON.stringify({ passed, checks: this.list }, null, 2)}\n`);
    process.stdout.write(`Report: ${path}\n`);
    return passed;
  }
}

export interface AccountService {
  origin: string;
  dataDir: string;
  logs: string[];
  exited: Promise<number | null>;
  stop(): Promise<{ clean: boolean; exitCode: number | null }>;
}

export interface AccountServiceInput {
  port: number;
  provider: { issuerUrl: string } | { nextcloudUrl: string };
  clientId: string;
  clientSecret: string;
  dataDir?: string;
  environment?: Record<string, string>;
}

export function freePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      probe.close(() => {
        if (address === null || typeof address === "string") reject(new Error("No free port was found."));
        else resolvePort(address.port);
      });
    });
  });
}

export async function temporaryFolder(prefix: string): Promise<string> {
  return mkdtemp(join(tmpdir(), `${prefix}-`));
}

export async function removeFolder(path: string): Promise<void> {
  await rm(path, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}

function inheritedEnvironment(): Record<string, string> {
  const environment: Record<string, string> = {};
  for (const [name, value] of Object.entries(process.env)) {
    if (value !== undefined && !SERVICE_VARIABLE.test(name)) environment[name] = value;
  }
  return environment;
}

function readyOrigin(message: unknown): string | null {
  if (!isDynamicRecord(message) || message.type !== "account-service:ready") return null;
  return isString(message.origin) && isNumber(message.port) ? message.origin : null;
}

export async function startAccountService(input: AccountServiceInput): Promise<AccountService> {
  const dataDir = input.dataDir ?? (await temporaryFolder("codebot-account-e2e"));
  const keys = await generateAccountKeys();
  const child: ChildProcess = spawn(process.execPath, ["--no-env-file", SERVER_ENTRY], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe", "ipc"],
    env: {
      ...inheritedEnvironment(),
      ACCOUNT_PUBLIC_URL: `http://127.0.0.1:${input.port}`,
      ACCOUNT_LISTEN_HOST: "127.0.0.1",
      ACCOUNT_PORT: String(input.port),
      ACCOUNT_DATA_DIR: dataDir,
      ACCOUNT_SECRET_KEY: keys.secretKey,
      REMOTE_TICKET_KEY_ID: keys.keyId,
      REMOTE_TICKET_PRIVATE_JWK: keys.privateJwk,
      REMOTE_TICKET_PUBLIC_JWKS: keys.publicJwks,
      OIDC_CLIENT_ID: input.clientId,
      OIDC_CLIENT_SECRET: input.clientSecret,
      OIDC_PROVIDER_NAME: "Mock Cloud",
      ...("issuerUrl" in input.provider
        ? { OIDC_ISSUER_URL: input.provider.issuerUrl }
        : { NEXTCLOUD_URL: input.provider.nextcloudUrl }),
      ...input.environment,
    },
  });
  const logs: string[] = [];
  const keep = (chunk: Buffer) => {
    for (const line of chunk.toString("utf8").split(/\r?\n/u)) if (line) logs.push(line);
  };
  child.stdout?.on("data", keep);
  child.stderr?.on("data", keep);
  const exited = new Promise<number | null>((done) => child.once("exit", (code) => done(code)));
  const origin = await new Promise<string>((ready, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`The account service did not start.\n${logs.join("\n")}`)),
      START_LIMIT_MS,
    );
    child.on("message", (message: unknown) => {
      const value = readyOrigin(message);
      if (!value) return;
      clearTimeout(timer);
      ready(value);
    });
    void exited.then((code) => {
      clearTimeout(timer);
      reject(new Error(`The account service stopped with code ${String(code)}.\n${logs.join("\n")}`));
    });
  }).catch((error: unknown) => {
    child.kill();
    throw error;
  });
  let stopped: Promise<{ clean: boolean; exitCode: number | null }> | null = null;
  return {
    origin,
    dataDir,
    logs,
    exited,
    stop() {
      stopped ??= (async () => {
        if (child.exitCode !== null) return { clean: child.exitCode === 0, exitCode: child.exitCode };
        child.send({ type: "account-service:stop" });
        let timer: ReturnType<typeof setTimeout> | undefined;
        const limit = new Promise<"limit">((done) => {
          timer = setTimeout(() => done("limit"), STOP_LIMIT_MS);
        });
        const result = await Promise.race([exited, limit]);
        clearTimeout(timer);
        if (result === "limit") {
          child.kill();
          return { clean: false, exitCode: await exited };
        }
        return { clean: result === 0, exitCode: result };
      })();
      return stopped;
    },
  };
}

export interface PkcePair {
  verifier: string;
  challenge: string;
}

export function pkcePair(): PkcePair {
  const verifier = randomBytes(48).toString("base64url");
  return { verifier, challenge: createHash("sha256").update(verifier).digest("base64url") };
}

export function clientState(): string {
  return randomBytes(24).toString("base64url");
}

export interface LoopbackReceiver {
  redirectUri: string;
  next(): Promise<URLSearchParams>;
  close(): Promise<void>;
}

export async function loopbackReceiver(path = "/auth/callback"): Promise<LoopbackReceiver> {
  const received: URLSearchParams[] = [];
  const waiting: ((params: URLSearchParams) => void)[] = [];
  const server: Server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    response.writeHead(url.pathname === path ? 200 : 404, { "Content-Type": "text/plain" });
    response.end(url.pathname === path ? "You can close this page." : "Not found");
    if (url.pathname !== path) return;
    const waiter = waiting.shift();
    if (waiter) waiter(url.searchParams);
    else received.push(url.searchParams);
  });
  const port = await new Promise<number>((listening, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") reject(new Error("The receiver has no port."));
      else listening(address.port);
    });
  });
  return {
    redirectUri: `http://127.0.0.1:${port}${path}`,
    next() {
      const ready = received.shift();
      if (ready) return Promise.resolve(ready);
      return new Promise((deliver, reject) => {
        const timer = setTimeout(() => reject(new Error("No redirect reached the receiver.")), WAIT_LIMIT_MS);
        waiting.push((params) => {
          clearTimeout(timer);
          deliver(params);
        });
      });
    },
    close: () =>
      new Promise((closed) => {
        server.close(() => closed());
        server.closeAllConnections();
      }),
  };
}

export interface BrowserStep {
  status: number;
  location: string | null;
  html: string;
}

export async function browserGet(url: string): Promise<BrowserStep> {
  const response = await fetch(url, { redirect: "manual" });
  return { status: response.status, location: response.headers.get("Location"), html: await response.text() };
}

export async function browserPost(url: string, fields: Record<string, string>): Promise<BrowserStep> {
  const response = await fetch(url, {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields),
  });
  return { status: response.status, location: response.headers.get("Location"), html: await response.text() };
}

export function hiddenField(html: string, name: string): string | null {
  const pattern = new RegExp(`<input[^>]*name="${name}"[^>]*value="([^"]*)"`, "u");
  const reversed = new RegExp(`<input[^>]*value="([^"]*)"[^>]*name="${name}"`, "u");
  return pattern.exec(html)?.[1] ?? reversed.exec(html)?.[1] ?? null;
}

export interface ProviderLoginResult {
  form: BrowserStep;
  submitted: BrowserStep;
}

export async function providerLogin(
  authorizationUrl: string,
  credentials: { user: string; password: string },
): Promise<ProviderLoginResult> {
  const form = await browserGet(authorizationUrl);
  const request = hiddenField(form.html, "request");
  if (form.status !== 200 || !request) return { form, submitted: form };
  return providerSubmit(authorizationUrl, request, credentials).then((submitted) => ({ form, submitted }));
}

export function providerSubmit(
  authorizationUrl: string,
  request: string,
  credentials: { user: string; password: string },
): Promise<BrowserStep> {
  const target = new URL(authorizationUrl);
  target.search = "";
  return browserPost(target.toString(), { request, user: credentials.user, password: credentials.password });
}

export interface JsonAnswer {
  status: number;
  body: unknown;
  headers: Headers;
}

export async function api(
  origin: string,
  path: string,
  init: { method?: string; token?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<JsonAnswer> {
  const response = await fetch(`${origin}${path}`, {
    method: init.method ?? (init.body === undefined ? "GET" : "POST"),
    redirect: "manual",
    headers: {
      ...(init.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
      ...init.headers,
    },
    ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
  });
  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: response.status, body, headers: response.headers };
}

export function errorCode(answer: JsonAnswer): string | null {
  const { body } = answer;
  return isDynamicRecord(body) && isDynamicRecord(body.error) && isString(body.error.code) ? body.error.code : null;
}

export function textField(value: unknown, key: string): string {
  if (!isDynamicRecord(value)) return "";
  const field = value[key];
  return isString(field) ? field : "";
}

export function numberField(value: unknown, key: string): number {
  if (!isDynamicRecord(value)) return Number.NaN;
  const field = value[key];
  return isNumber(field) ? field : Number.NaN;
}

export function objectField(value: unknown, key: string): DynamicRecord | null {
  if (!isDynamicRecord(value)) return null;
  const field = value[key];
  return isDynamicRecord(field) ? field : null;
}

export interface SignedIn {
  sessionToken: string;
  userId: string;
  email: string;
  name: string | null;
}

export async function signIn(
  service: AccountService,
  credentials: { user: string; password: string },
): Promise<SignedIn> {
  const receiver = await loopbackReceiver();
  try {
    const pkce = pkcePair();
    const state = clientState();
    const started = await api(service.origin, "/v1/auth/oidc/start", {
      body: { redirectUri: receiver.redirectUri, codeChallenge: pkce.challenge, state },
    });
    const authorizationUrl = textField(started.body, "authorizationUrl");
    if (started.status !== 200 || !authorizationUrl) throw new Error(`The sign-in did not start: ${started.status}`);
    const login = await providerLogin(authorizationUrl, credentials);
    if (login.submitted.status !== 302 || !login.submitted.location) {
      throw new Error(`The provider did not accept the sign-in: ${login.submitted.status}`);
    }
    const callback = await browserGet(login.submitted.location);
    if (callback.status !== 302 || !callback.location) {
      throw new Error(`The account service did not redirect: ${callback.status}`);
    }
    await browserGet(callback.location);
    const params = await receiver.next();
    const code = params.get("code");
    if (!code || params.get("state") !== state) throw new Error(`The redirect has no code: ${params.toString()}`);
    const exchanged = await api(service.origin, "/v1/auth/oidc/exchange", {
      body: { code, codeVerifier: pkce.verifier },
    });
    const user = objectField(exchanged.body, "user");
    const sessionToken = textField(exchanged.body, "sessionToken");
    if (exchanged.status !== 200 || !sessionToken) throw new Error(`The exchange failed: ${exchanged.status}`);
    const name = textField(user, "name");
    return { sessionToken, userId: textField(user, "id"), email: textField(user, "email"), name: name || null };
  } finally {
    await receiver.close();
  }
}

export async function waitFor<T>(
  description: string,
  read: () => Promise<T | null | undefined | false>,
  limitMs = WAIT_LIMIT_MS,
): Promise<T> {
  const deadline = Date.now() + limitMs;
  for (;;) {
    const value = await read();
    if (value) return value;
    if (Date.now() > deadline) throw new Error(`Timed out: ${description}`);
    await new Promise((next) => setTimeout(next, 100));
  }
}

export async function closeAll(resources: { mocks?: OidcMock[]; services?: AccountService[] }): Promise<void> {
  for (const service of resources.services ?? []) {
    await service.stop().catch(() => undefined);
    await removeFolder(service.dataDir).catch(() => undefined);
  }
  for (const mock of resources.mocks ?? []) await mock.close().catch(() => undefined);
}
