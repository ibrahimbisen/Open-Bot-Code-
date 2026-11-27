import { createHash, randomBytes } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { isDynamicRecord, isString } from "@codebot/contracts/runtime-values";
import { exportJWK, generateKeyPair, SignJWT } from "jose";

export type OidcMockMode = "oidc" | "nextcloud";

export interface OidcMockUser {
  id: string;
  password: string;
  displayName: string;
  email: string | null;
  emailVerified?: boolean;
  enabled?: boolean;
}

export interface OidcMockOptions {
  mode: OidcMockMode;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  users: OidcMockUser[];
  port?: number;
  issueRefreshTokens?: boolean;
}

export interface OidcMockRequest {
  method: string;
  path: string;
  status: number;
}

export type IdTokenFault = "nonce" | "signature" | "audience" | "issuer" | "expired";

export interface OidcMock {
  readonly mode: OidcMockMode;
  readonly origin: string;
  readonly port: number;
  readonly requests: OidcMockRequest[];
  readonly issuedRefreshTokens: string[];
  setUser(user: OidcMockUser): void;
  disableUser(id: string): void;
  enableUser(id: string): void;
  deleteUser(id: string): void;
  setRefreshTokens(issue: boolean): void;
  breakNextIdToken(fault: IdTokenFault): void;
  pause(): Promise<void>;
  resume(): Promise<void>;
  close(): Promise<void>;
}

interface StoredUser {
  id: string;
  password: string;
  displayName: string;
  email: string | null;
  emailVerified: boolean;
  enabled: boolean;
}

interface PendingAuthorization {
  redirectUri: string;
  state: string;
  nonce: string | null;
  codeChallenge: string | null;
  scope: string;
}

interface IssuedCode extends PendingAuthorization {
  userId: string;
  expiresAt: number;
}

interface AccessToken {
  userId: string;
  expiresAt: number;
}

const CODE_SECONDS = 60;
const ACCESS_TOKEN_SECONDS = 900;
const BODY_LIMIT = 64 * 1024;

const PATHS = {
  oidc: {
    authorize: ["/authorize"],
    token: ["/token"],
    user: ["/userinfo"],
  },
  nextcloud: {
    authorize: ["/apps/oauth2/authorize", "/index.php/apps/oauth2/authorize"],
    token: ["/apps/oauth2/api/v1/token", "/index.php/apps/oauth2/api/v1/token"],
    user: ["/ocs/v2.php/cloud/user"],
  },
} as const;

function token(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    request.on("data", (chunk: Buffer) => {
      size += chunk.byteLength;
      if (size > BODY_LIMIT) {
        reject(new Error("The request body is too large."));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

function loginForm(requestId: string, problem: string | null): string {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Mock sign-in</title></head>
<body>
<h1>Mock identity provider</h1>
${problem ? `<p id="problem">${escapeHtml(problem)}</p>` : ""}
<form method="post" action="">
<input type="hidden" name="request" value="${escapeHtml(requestId)}">
<label>User name <input name="user" autocomplete="username"></label>
<label>Password <input name="password" type="password" autocomplete="current-password"></label>
<button type="submit">Log in</button>
</form>
</body>
</html>
`;
}

export async function startOidcMock(options: OidcMockOptions): Promise<OidcMock> {
  const { publicKey, privateKey } = await generateKeyPair("RS256", { extractable: true });
  const foreignKey = await generateKeyPair("RS256");
  let nextIdTokenFault: IdTokenFault | null = null;
  const keyId = `mock-${token(6)}`;
  const publicJwk = { ...(await exportJWK(publicKey)), kid: keyId, alg: "RS256", use: "sig" };
  const users = new Map<string, StoredUser>();
  const pending = new Map<string, PendingAuthorization>();
  const codes = new Map<string, IssuedCode>();
  const accessTokens = new Map<string, AccessToken>();
  const refreshTokens = new Map<string, string>();
  const requests: OidcMockRequest[] = [];
  const issuedRefreshTokens: string[] = [];
  const paths = PATHS[options.mode];
  let issueRefreshTokens = options.issueRefreshTokens ?? true;
  let origin = "";
  let port = options.port ?? 0;

  const storeUser = (user: OidcMockUser) => {
    users.set(user.id, {
      id: user.id,
      password: user.password,
      displayName: user.displayName,
      email: user.email,
      emailVerified: user.emailVerified ?? user.email !== null,
      enabled: user.enabled ?? true,
    });
  };
  for (const user of options.users) storeUser(user);

  const forgetGrants = (userId: string) => {
    for (const [value, owner] of refreshTokens) if (owner === userId) refreshTokens.delete(value);
    for (const [value, access] of accessTokens) if (access.userId === userId) accessTokens.delete(value);
  };

  const send = (response: ServerResponse, status: number, headers: Record<string, string>, body: string) => {
    response.writeHead(status, { "Cache-Control": "no-store", ...headers });
    response.end(body);
    return status;
  };
  const sendJson = (response: ServerResponse, status: number, body: unknown) =>
    send(response, status, { "Content-Type": "application/json" }, JSON.stringify(body));
  const sendHtml = (response: ServerResponse, status: number, body: string) =>
    send(response, status, { "Content-Type": "text/html; charset=utf-8" }, body);

  const clientAuthenticated = (request: IncomingMessage, form: URLSearchParams): boolean => {
    const header = request.headers.authorization ?? "";
    if (header.startsWith("Basic ")) {
      const [id = "", secret = ""] = Buffer.from(header.slice("Basic ".length), "base64").toString("utf8").split(":");
      return decodeURIComponent(id) === options.clientId && decodeURIComponent(secret) === options.clientSecret;
    }
    return form.get("client_id") === options.clientId && form.get("client_secret") === options.clientSecret;
  };

  const bearerUser = (request: IncomingMessage): StoredUser | null => {
    const header = request.headers.authorization ?? "";
    if (!header.startsWith("Bearer ")) return null;
    const access = accessTokens.get(header.slice("Bearer ".length));
    if (!access || access.expiresAt <= Date.now()) return null;
    return users.get(access.userId) ?? null;
  };

  const tokenAnswer = async (user: StoredUser, nonce: string | null) => {
    const accessToken = token();
    accessTokens.set(accessToken, { userId: user.id, expiresAt: Date.now() + ACCESS_TOKEN_SECONDS * 1_000 });
    const answer: Record<string, string | number> = {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_SECONDS,
    };
    if (issueRefreshTokens) {
      const refreshToken = token();
      refreshTokens.set(refreshToken, user.id);
      issuedRefreshTokens.push(refreshToken);
      answer.refresh_token = refreshToken;
    }
    if (options.mode === "nextcloud") {
      answer.user_id = user.id;
      return answer;
    }
    const fault = nextIdTokenFault;
    nextIdTokenFault = null;
    const issuedAt = Math.floor(Date.now() / 1_000) - (fault === "expired" ? 3_600 : 0);
    answer.id_token = await new SignJWT({
      ...(nonce ? { nonce: fault === "nonce" ? "another-nonce" : nonce } : {}),
      name: user.displayName,
      preferred_username: user.id,
      ...(user.email ? { email: user.email, email_verified: user.emailVerified } : {}),
    })
      .setProtectedHeader({ alg: "RS256", kid: keyId, typ: "JWT" })
      .setIssuer(fault === "issuer" ? `${origin}/another` : origin)
      .setSubject(user.id)
      .setAudience(fault === "audience" ? "another-client" : options.clientId)
      .setIssuedAt(issuedAt)
      .setExpirationTime(issuedAt + 600)
      .sign(fault === "signature" ? foreignKey.privateKey : privateKey);
    return answer;
  };

  const authorizeStart = (url: URL, response: ServerResponse): number => {
    const redirectUri = url.searchParams.get("redirect_uri") ?? "";
    const state = url.searchParams.get("state") ?? "";
    if (
      url.searchParams.get("response_type") !== "code" ||
      url.searchParams.get("client_id") !== options.clientId ||
      redirectUri !== options.redirectUri ||
      !state
    ) {
      return sendHtml(response, 400, '<!doctype html><p id="problem">The authorization request is not valid.</p>');
    }
    const challenge = url.searchParams.get("code_challenge");
    if (challenge !== null && url.searchParams.get("code_challenge_method") !== "S256") {
      return sendHtml(response, 400, '<!doctype html><p id="problem">Only S256 is supported.</p>');
    }
    const requestId = token(16);
    pending.set(requestId, {
      redirectUri,
      state,
      nonce: url.searchParams.get("nonce"),
      codeChallenge: challenge,
      scope: url.searchParams.get("scope") ?? "",
    });
    return sendHtml(response, 200, loginForm(requestId, null));
  };

  const authorizeFinish = (form: URLSearchParams, response: ServerResponse): number => {
    const requestId = form.get("request") ?? "";
    const authorization = pending.get(requestId);
    if (!authorization) {
      return sendHtml(response, 400, '<!doctype html><p id="problem">This sign-in is not valid any more.</p>');
    }
    const user = users.get(form.get("user") ?? "");
    if (!user || user.password !== form.get("password")) {
      return sendHtml(response, 401, loginForm(requestId, "Wrong user name or password."));
    }
    if (!user.enabled) return sendHtml(response, 403, loginForm(requestId, "This user is disabled."));
    pending.delete(requestId);
    const code = token();
    codes.set(code, { ...authorization, userId: user.id, expiresAt: Date.now() + CODE_SECONDS * 1_000 });
    const location = new URL(authorization.redirectUri);
    location.searchParams.set("code", code);
    location.searchParams.set("state", authorization.state);
    return send(response, 302, { Location: location.toString() }, "");
  };

  const grantError = (response: ServerResponse): number =>
    sendJson(response, 400, { error: options.mode === "nextcloud" ? "invalid_request" : "invalid_grant" });

  const tokenRequest = async (
    request: IncomingMessage,
    form: URLSearchParams,
    response: ServerResponse,
  ): Promise<number> => {
    if (!clientAuthenticated(request, form)) return sendJson(response, 401, { error: "invalid_client" });
    const grantType = form.get("grant_type");
    if (grantType === "authorization_code") {
      const value = form.get("code") ?? "";
      const code = codes.get(value);
      codes.delete(value);
      if (!code || code.expiresAt <= Date.now() || form.get("redirect_uri") !== code.redirectUri) {
        return grantError(response);
      }
      if (code.codeChallenge !== null) {
        const verifier = form.get("code_verifier") ?? "";
        if (createHash("sha256").update(verifier).digest("base64url") !== code.codeChallenge) {
          return grantError(response);
        }
      }
      const user = users.get(code.userId);
      if (!user?.enabled) return grantError(response);
      return sendJson(response, 200, await tokenAnswer(user, code.nonce));
    }
    if (grantType === "refresh_token") {
      const value = form.get("refresh_token") ?? "";
      const userId = refreshTokens.get(value);
      refreshTokens.delete(value);
      const user = userId ? users.get(userId) : undefined;
      if (!user) return grantError(response);
      if (!user.enabled && options.mode === "oidc") return grantError(response);
      return sendJson(response, 200, await tokenAnswer(user, null));
    }
    return sendJson(response, 400, { error: "unsupported_grant_type" });
  };

  const userRequest = (request: IncomingMessage, response: ServerResponse): number => {
    const user = bearerUser(request);
    if (options.mode === "nextcloud") {
      if (!user?.enabled) {
        return sendJson(response, 401, {
          ocs: { meta: { status: "failure", statuscode: 997, message: "Current user is not logged in" }, data: [] },
        });
      }
      return sendJson(response, 200, {
        ocs: {
          meta: { status: "ok", statuscode: 200, message: "OK" },
          data: {
            enabled: user.enabled,
            id: user.id,
            email: user.email,
            displayname: user.displayName,
            "display-name": user.displayName,
            groups: [],
            language: "en",
          },
        },
      });
    }
    if (!user?.enabled) return sendJson(response, 401, { error: "invalid_token" });
    return sendJson(response, 200, {
      sub: user.id,
      name: user.displayName,
      preferred_username: user.id,
      ...(user.email ? { email: user.email, email_verified: user.emailVerified } : {}),
    });
  };

  const adminRequest = (path: string, body: string, response: ServerResponse): number => {
    const match = /^\/__admin\/users\/([^/]+)\/(disable|enable|delete)$/u.exec(path);
    if (match) {
      const id = decodeURIComponent(match[1] ?? "");
      const action = match[2];
      if (action === "disable") api.disableUser(id);
      else if (action === "enable") api.enableUser(id);
      else api.deleteUser(id);
      return sendJson(response, 200, { ok: true });
    }
    if (path === "/__admin/users") {
      const parsed = JSON.parse(body);
      if (!isDynamicRecord(parsed) || !isString(parsed.id) || !isString(parsed.password)) {
        return sendJson(response, 400, { error: "invalid_user" });
      }
      storeUser({
        id: parsed.id,
        password: parsed.password,
        displayName: isString(parsed.displayName) ? parsed.displayName : parsed.id,
        email: isString(parsed.email) ? parsed.email : null,
      });
      return sendJson(response, 200, { ok: true });
    }
    return sendJson(response, 404, { error: "not_found" });
  };

  const handle = async (request: IncomingMessage, response: ServerResponse): Promise<number> => {
    const url = new URL(request.url ?? "/", origin);
    const path = url.pathname;
    const method = request.method ?? "GET";
    const isPath = (candidates: readonly string[]) => candidates.includes(path);
    if (method === "GET" && isPath(paths.authorize)) return authorizeStart(url, response);
    if (method === "POST" && isPath(paths.authorize)) {
      return authorizeFinish(new URLSearchParams(await readBody(request)), response);
    }
    if (method === "POST" && isPath(paths.token)) {
      return tokenRequest(request, new URLSearchParams(await readBody(request)), response);
    }
    if (method === "GET" && isPath(paths.user)) return userRequest(request, response);
    if (method === "POST" && path.startsWith("/__admin/")) return adminRequest(path, await readBody(request), response);
    if (options.mode === "oidc" && method === "GET") {
      if (path === "/.well-known/openid-configuration") {
        return sendJson(response, 200, {
          issuer: origin,
          authorization_endpoint: `${origin}/authorize`,
          token_endpoint: `${origin}/token`,
          userinfo_endpoint: `${origin}/userinfo`,
          jwks_uri: `${origin}/jwks`,
          response_types_supported: ["code"],
          grant_types_supported: ["authorization_code", "refresh_token"],
          subject_types_supported: ["public"],
          id_token_signing_alg_values_supported: ["RS256"],
          token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post"],
          scopes_supported: ["openid", "profile", "email"],
          code_challenge_methods_supported: ["S256"],
        });
      }
      if (path === "/jwks") return sendJson(response, 200, { keys: [publicJwk] });
    }
    return sendJson(response, 404, { error: "not_found" });
  };

  let server: Server | null = null;
  const listen = (): Promise<void> =>
    new Promise((resolve, reject) => {
      const next = createServer((request, response) => {
        const path = new URL(request.url ?? "/", "http://mock.invalid").pathname;
        handle(request, response).then(
          (status) => requests.push({ method: request.method ?? "GET", path, status }),
          () => {
            if (!response.headersSent) response.writeHead(500);
            response.end();
            requests.push({ method: request.method ?? "GET", path, status: 500 });
          },
        );
      });
      next.once("error", reject);
      next.listen(port, "127.0.0.1", () => {
        const address = next.address();
        if (address === null || typeof address === "string") {
          reject(new Error("The mock provider has no port."));
          return;
        }
        port = address.port;
        origin = `http://127.0.0.1:${port}`;
        server = next;
        resolve();
      });
    });
  const stopListening = (): Promise<void> =>
    new Promise((resolve) => {
      const current = server;
      server = null;
      if (!current) {
        resolve();
        return;
      }
      current.close(() => resolve());
      current.closeAllConnections();
    });

  const api: OidcMock = {
    mode: options.mode,
    get origin() {
      return origin;
    },
    get port() {
      return port;
    },
    requests,
    issuedRefreshTokens,
    setUser: storeUser,
    disableUser(id) {
      const user = users.get(id);
      if (!user) return;
      user.enabled = false;
      if (options.mode === "oidc") forgetGrants(id);
    },
    enableUser(id) {
      const user = users.get(id);
      if (user) user.enabled = true;
    },
    deleteUser(id) {
      users.delete(id);
      forgetGrants(id);
    },
    setRefreshTokens(issue) {
      issueRefreshTokens = issue;
    },
    breakNextIdToken(fault) {
      nextIdTokenFault = fault;
    },
    pause: stopListening,
    resume: listen,
    close: stopListening,
  };
  await listen();
  return api;
}

function argument(args: readonly string[], name: string): string | null {
  const index = args.indexOf(name);
  return index >= 0 ? (args[index + 1] ?? null) : null;
}

async function main(args: readonly string[]): Promise<void> {
  const mode = argument(args, "--mode") === "nextcloud" ? "nextcloud" : "oidc";
  const redirectUri = argument(args, "--redirect-uri");
  if (!redirectUri) {
    throw new Error("Give --redirect-uri <account service origin>/v1/auth/oidc/callback.");
  }
  const mock = await startOidcMock({
    mode,
    port: Number(argument(args, "--port") ?? 0),
    clientId: argument(args, "--client-id") ?? "codebot",
    clientSecret: argument(args, "--client-secret") ?? "mock-client-secret",
    redirectUri,
    users: [
      { id: "alice", password: "alice-password", displayName: "Alice Example", email: "alice@example.com" },
      { id: "bob", password: "bob-password", displayName: "Bob Example", email: null },
    ],
  });
  process.stdout.write(`${JSON.stringify({ mode, origin: mock.origin, users: ["alice", "bob"] })}\n`);
  const stop = () => {
    void mock.close().then(() => process.exit(0));
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

if (import.meta.main) {
  try {
    await main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : "The mock provider did not start."}\n`);
    process.exit(1);
  }
}
