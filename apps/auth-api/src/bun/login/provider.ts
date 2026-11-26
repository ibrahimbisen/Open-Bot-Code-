import { type DynamicRecord, isBoolean, isDynamicRecord, isString } from "@codebot/contracts/runtime-values";
import { Effect, Result, Schema } from "effect";
import { createRemoteJWKSet, customFetch, jwtVerify } from "jose";
import type { AccountConfig } from "../config";

const PROVIDER_TIMEOUT_MS = 10_000;
const DISCOVERY_TTL_MS = 60 * 60_000;
const ID_TOKEN_ALGORITHMS = ["RS256", "RS384", "RS512", "PS256", "PS384", "PS512", "ES256", "ES384", "ES512", "EdDSA"];
const NEXTCLOUD_AUTHORIZE_PATH = "/apps/oauth2/authorize";
const NEXTCLOUD_TOKEN_PATH = "/apps/oauth2/api/v1/token";
const NEXTCLOUD_USER_PATH = "/ocs/v2.php/cloud/user?format=json";

export type ProviderFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export type ProviderRejection = "grant_revoked" | "unauthorized" | "user_missing" | "user_disabled" | "subject_changed";

export class ProviderRejected extends Schema.TaggedError<ProviderRejected>()("ProviderRejected", {
  reason: Schema.Literals(["grant_revoked", "unauthorized", "user_missing", "user_disabled", "subject_changed"]),
}) {}

export class ProviderUnavailable extends Schema.TaggedError<ProviderUnavailable>()("ProviderUnavailable", {
  step: Schema.String,
  detail: Schema.String,
}) {}

export class ProviderLoginRefused extends Schema.TaggedError<ProviderLoginRefused>()("ProviderLoginRefused", {
  code: Schema.Literals(["provider_rejected", "token_invalid", "identity_missing"]),
}) {}

export type ProviderFailure = ProviderRejected | ProviderUnavailable | ProviderLoginRefused;

export interface ProviderIdentity {
  issuer: string;
  subject: string;
  username: string | null;
  name: string | null;
}

export interface ProviderGrant {
  identity: ProviderIdentity;
  refreshToken: string | null;
}

interface ProviderEndpoints {
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userinfoEndpoint: string | null;
  jwksUri: string | null;
  basicAuth: boolean;
}

interface TokenAnswer {
  accessToken: string;
  refreshToken: string | null;
  idToken: string | null;
  userId: string | null;
}

interface JsonAnswer {
  status: number;
  body: DynamicRecord | null;
}

function unavailable(step: string, detail: string): ProviderUnavailable {
  return new ProviderUnavailable({ step, detail });
}

function textOrNull(value: unknown): string | null {
  return isString(value) && value.trim() ? value.trim() : null;
}

export class IdentityProvider {
  readonly #login: AccountConfig["login"];
  readonly #fetch: ProviderFetch;
  readonly #now: () => number;
  #endpoints: { value: ProviderEndpoints; loadedAt: number } | null = null;
  #keys: { uri: string; resolve: ReturnType<typeof createRemoteJWKSet> } | null = null;

  constructor(login: AccountConfig["login"], options: { fetch?: ProviderFetch; now?: () => number } = {}) {
    this.#login = login;
    this.#fetch = options.fetch ?? ((input, init) => fetch(input, init));
    this.#now = options.now ?? Date.now;
  }

  get kind(): AccountConfig["login"]["provider"]["kind"] {
    return this.#login.provider.kind;
  }

  readonly issuer = Effect.fn("IdentityProvider.issuer")(function* (this: IdentityProvider) {
    return (yield* this.#resolveEndpoints()).issuer;
  });

  readonly authorizationOrigin = Effect.fn("IdentityProvider.authorizationOrigin")(function* (this: IdentityProvider) {
    return new URL((yield* this.#resolveEndpoints()).authorizationEndpoint).origin;
  });

  readonly authorizationUrl = Effect.fn("IdentityProvider.authorizationUrl")(function* (
    this: IdentityProvider,
    input: { redirectUri: string; state: string; nonce: string; codeChallenge: string },
  ) {
    const endpoints = yield* this.#resolveEndpoints();
    const url = new URL(endpoints.authorizationEndpoint);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", this.#login.clientId);
    url.searchParams.set("redirect_uri", input.redirectUri);
    url.searchParams.set("state", input.state);
    url.searchParams.set("code_challenge", input.codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");
    if (this.kind === "oidc") {
      url.searchParams.set("scope", this.#login.scopes);
      url.searchParams.set("nonce", input.nonce);
    }
    return url.toString();
  });

  readonly redeemCode = Effect.fn("IdentityProvider.redeemCode")(function* (
    this: IdentityProvider,
    input: { code: string; redirectUri: string; codeVerifier: string; nonce: string },
  ): Effect.fn.Return<ProviderGrant, ProviderFailure> {
    const endpoints = yield* this.#resolveEndpoints();
    const answer = yield* this.#tokenRequest(
      endpoints,
      new URLSearchParams({
        grant_type: "authorization_code",
        code: input.code,
        redirect_uri: input.redirectUri,
        code_verifier: input.codeVerifier,
      }),
    );
    if (answer.status !== 200 || !answer.body) return yield* new ProviderLoginRefused({ code: "provider_rejected" });
    const tokens = yield* this.#tokens(answer.body, "provider_rejected");
    const claims = tokens.idToken ? yield* this.#verifyIdToken(endpoints, tokens.idToken, input.nonce) : null;
    const identity = yield* this.#readIdentity(endpoints, tokens, claims);
    return { identity, refreshToken: tokens.refreshToken };
  });

  readonly refresh = Effect.fn("IdentityProvider.refresh")(function* (
    this: IdentityProvider,
    refreshToken: string,
    expectedSubject: string,
  ): Effect.fn.Return<{ identity: ProviderIdentity; refreshToken: string }, ProviderRejected | ProviderUnavailable> {
    const endpoints = yield* this.#resolveEndpoints();
    const answer = yield* this.#tokenRequest(
      endpoints,
      new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
    );
    if (answer.status !== 200 || !answer.body) {
      const code = answer.body && isString(answer.body.error) ? answer.body.error : "";
      const revoked =
        answer.status >= 400 &&
        answer.status < 500 &&
        (code === "invalid_grant" || (this.kind === "nextcloud-oauth2" && code === "invalid_request"));
      if (revoked) return yield* new ProviderRejected({ reason: "grant_revoked" });
      return yield* unavailable("refresh", `status ${answer.status}${code ? ` ${code.slice(0, 40)}` : ""}`);
    }
    const tokens = yield* this.#tokens(answer.body, "provider_rejected").pipe(
      Effect.mapError(() => unavailable("refresh", "The token answer has no access token.")),
    );
    const identity = yield* this.#readIdentity(endpoints, tokens, null).pipe(
      Effect.mapError((error) =>
        error instanceof ProviderLoginRefused ? unavailable("identity", "The provider gave no user.") : error,
      ),
    );
    if (identity.subject !== expectedSubject) return yield* new ProviderRejected({ reason: "subject_changed" });
    return { identity, refreshToken: tokens.refreshToken ?? refreshToken };
  });

  readonly #tokens = Effect.fn("IdentityProvider.tokens")(function* (
    body: DynamicRecord,
    code: ProviderLoginRefused["code"],
  ): Effect.fn.Return<TokenAnswer, ProviderLoginRefused> {
    const accessToken = textOrNull(body.access_token);
    if (!accessToken) return yield* new ProviderLoginRefused({ code });
    return {
      accessToken,
      refreshToken: textOrNull(body.refresh_token),
      idToken: textOrNull(body.id_token),
      userId: textOrNull(body.user_id),
    };
  });

  readonly #readIdentity = Effect.fn("IdentityProvider.readIdentity")(function* (
    this: IdentityProvider,
    endpoints: ProviderEndpoints,
    tokens: TokenAnswer,
    claims: DynamicRecord | null,
  ): Effect.fn.Return<ProviderIdentity, ProviderFailure> {
    if (this.kind === "nextcloud-oauth2") return yield* this.#nextcloudUser(endpoints, tokens);
    const claimedSubject = claims ? textOrNull(claims.sub) : null;
    if (!endpoints.userinfoEndpoint) {
      if (!claims || !claimedSubject) return yield* new ProviderLoginRefused({ code: "identity_missing" });
      return {
        issuer: endpoints.issuer,
        subject: claimedSubject,
        username: textOrNull(claims.preferred_username),
        name: textOrNull(claims.name),
      };
    }
    const answer = yield* this.#getJson("userinfo", endpoints.userinfoEndpoint, tokens.accessToken, {});
    if (answer.status === 401) return yield* new ProviderRejected({ reason: "unauthorized" });
    if (answer.status === 404) return yield* new ProviderRejected({ reason: "user_missing" });
    if (answer.status !== 200 || !answer.body) return yield* unavailable("userinfo", `status ${answer.status}`);
    const subject = textOrNull(answer.body.sub);
    if (!subject) return yield* unavailable("userinfo", "The user info has no sub.");
    if (claimedSubject && claimedSubject !== subject) return yield* new ProviderLoginRefused({ code: "token_invalid" });
    if (isBoolean(answer.body.enabled) && !answer.body.enabled) {
      return yield* new ProviderRejected({ reason: "user_disabled" });
    }
    return {
      issuer: endpoints.issuer,
      subject,
      username: textOrNull(answer.body.preferred_username) ?? (claims ? textOrNull(claims.preferred_username) : null),
      name: textOrNull(answer.body.name) ?? (claims ? textOrNull(claims.name) : null),
    };
  });

  readonly #nextcloudUser = Effect.fn("IdentityProvider.nextcloudUser")(function* (
    this: IdentityProvider,
    endpoints: ProviderEndpoints,
    tokens: TokenAnswer,
  ): Effect.fn.Return<ProviderIdentity, ProviderFailure> {
    if (!endpoints.userinfoEndpoint) return yield* unavailable("user", "No user endpoint is set.");
    const answer = yield* this.#getJson("user", endpoints.userinfoEndpoint, tokens.accessToken, {
      "OCS-APIRequest": "true",
    });
    if (answer.status === 401) return yield* new ProviderRejected({ reason: "unauthorized" });
    if (answer.status === 404) return yield* new ProviderRejected({ reason: "user_missing" });
    const ocs = answer.body && isDynamicRecord(answer.body.ocs) ? answer.body.ocs : null;
    const data = ocs && isDynamicRecord(ocs.data) ? ocs.data : null;
    if (answer.status !== 200 || !data) return yield* unavailable("user", `status ${answer.status}`);
    const subject = textOrNull(data.id);
    if (!subject) return yield* new ProviderRejected({ reason: "user_missing" });
    if (tokens.userId && tokens.userId !== subject) return yield* new ProviderLoginRefused({ code: "token_invalid" });
    if (isBoolean(data.enabled) && !data.enabled) return yield* new ProviderRejected({ reason: "user_disabled" });
    return {
      issuer: endpoints.issuer,
      subject,
      username: subject,
      name: textOrNull(data.displayname) ?? textOrNull(data["display-name"]),
    };
  });

  readonly #verifyIdToken = Effect.fn("IdentityProvider.verifyIdToken")(function* (
    this: IdentityProvider,
    endpoints: ProviderEndpoints,
    idToken: string,
    nonce: string,
  ): Effect.fn.Return<DynamicRecord, ProviderFailure> {
    if (!endpoints.jwksUri) return yield* new ProviderLoginRefused({ code: "token_invalid" });
    const keys = this.#keySet(endpoints.jwksUri);
    const verified = yield* Effect.tryPromise({
      try: () =>
        jwtVerify(idToken, keys, {
          issuer: endpoints.issuer,
          audience: this.#login.clientId,
          algorithms: ID_TOKEN_ALGORITHMS,
          clockTolerance: 60,
          requiredClaims: ["sub", "exp"],
        }),
      catch: () => new ProviderLoginRefused({ code: "token_invalid" }),
    });
    if (verified.payload.nonce !== nonce) return yield* new ProviderLoginRefused({ code: "token_invalid" });
    return verified.payload;
  });

  #keySet(uri: string): ReturnType<typeof createRemoteJWKSet> {
    if (this.#keys?.uri === uri) return this.#keys.resolve;
    const fetchKeys = this.#fetch;
    const resolve = createRemoteJWKSet(new URL(uri), {
      timeoutDuration: PROVIDER_TIMEOUT_MS,
      [customFetch]: (url, options) => fetchKeys(url, options),
    });
    this.#keys = { uri, resolve };
    return resolve;
  }

  readonly #tokenRequest = Effect.fn("IdentityProvider.tokenRequest")(function* (
    this: IdentityProvider,
    endpoints: ProviderEndpoints,
    body: URLSearchParams,
  ): Effect.fn.Return<JsonAnswer, ProviderUnavailable> {
    const headers = new Headers({ "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" });
    if (endpoints.basicAuth) {
      const pair = `${encodeURIComponent(this.#login.clientId)}:${encodeURIComponent(this.#login.clientSecret)}`;
      headers.set("Authorization", `Basic ${btoa(pair)}`);
    } else {
      body.set("client_id", this.#login.clientId);
      body.set("client_secret", this.#login.clientSecret);
    }
    return yield* this.#request("token", endpoints.tokenEndpoint, { method: "POST", headers, body });
  });

  readonly #getJson = Effect.fn("IdentityProvider.getJson")(function* (
    this: IdentityProvider,
    step: string,
    url: string,
    accessToken: string,
    extraHeaders: Readonly<Record<string, string>>,
  ): Effect.fn.Return<JsonAnswer, ProviderUnavailable> {
    return yield* this.#request(step, url, {
      method: "GET",
      headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}`, ...extraHeaders },
    });
  });

  readonly #request = Effect.fn("IdentityProvider.request")(function* (
    this: IdentityProvider,
    step: string,
    url: string,
    init: RequestInit,
  ): Effect.fn.Return<JsonAnswer, ProviderUnavailable> {
    const answer = yield* Effect.tryPromise({
      try: async () => {
        const response = await this.#fetch(url, {
          ...init,
          redirect: "manual",
          signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
        });
        const parsed: DynamicRecord | null = await response
          .json()
          .then((value) => (isDynamicRecord(value) ? value : null))
          .catch(() => null);
        return { status: response.status, body: parsed };
      },
      catch: () => unavailable(step, "The provider did not answer."),
    });
    if (answer.status >= 300 && answer.status < 400)
      return yield* unavailable(step, "The provider answered a redirect.");
    if (answer.status >= 500 || answer.status === 429) return yield* unavailable(step, `status ${answer.status}`);
    return answer;
  });

  readonly #resolveEndpoints = Effect.fn("IdentityProvider.resolveEndpoints")(function* (
    this: IdentityProvider,
  ): Effect.fn.Return<ProviderEndpoints, ProviderUnavailable> {
    const cached = this.#endpoints;
    if (cached && this.#now() - cached.loadedAt < DISCOVERY_TTL_MS) return cached.value;
    const provider = this.#login.provider;
    if (provider.kind === "nextcloud-oauth2") {
      const value: ProviderEndpoints = {
        issuer: provider.nextcloudUrl,
        authorizationEndpoint: provider.authorizationEndpoint ?? `${provider.nextcloudUrl}${NEXTCLOUD_AUTHORIZE_PATH}`,
        tokenEndpoint: provider.tokenEndpoint ?? `${provider.nextcloudUrl}${NEXTCLOUD_TOKEN_PATH}`,
        userinfoEndpoint: provider.userinfoEndpoint ?? `${provider.nextcloudUrl}${NEXTCLOUD_USER_PATH}`,
        jwksUri: null,
        basicAuth: true,
      };
      this.#endpoints = { value, loadedAt: this.#now() };
      return value;
    }
    const complete =
      provider.authorizationEndpoint && provider.tokenEndpoint && provider.userinfoEndpoint && provider.jwksUri;
    const discovered = complete ? null : yield* Effect.result(this.#discover(provider.issuerUrl));
    if (discovered && Result.isFailure(discovered)) {
      if (cached) return cached.value;
      return yield* discovered.failure;
    }
    const document = discovered ? discovered.success : null;
    const authorizationEndpoint = provider.authorizationEndpoint ?? document?.authorizationEndpoint;
    const tokenEndpoint = provider.tokenEndpoint ?? document?.tokenEndpoint;
    if (!authorizationEndpoint || !tokenEndpoint) {
      return yield* unavailable("discovery", "The provider has no authorization or token endpoint.");
    }
    const value: ProviderEndpoints = {
      issuer: document?.issuer ?? provider.issuerUrl,
      authorizationEndpoint,
      tokenEndpoint,
      userinfoEndpoint: provider.userinfoEndpoint ?? document?.userinfoEndpoint ?? null,
      jwksUri: provider.jwksUri ?? document?.jwksUri ?? null,
      basicAuth: document?.basicAuth ?? true,
    };
    this.#endpoints = { value, loadedAt: this.#now() };
    return value;
  });

  readonly #discover = Effect.fn("IdentityProvider.discover")(function* (
    this: IdentityProvider,
    issuerUrl: string,
  ): Effect.fn.Return<
    {
      issuer: string;
      authorizationEndpoint: string | null;
      tokenEndpoint: string | null;
      userinfoEndpoint: string | null;
      jwksUri: string | null;
      basicAuth: boolean;
    },
    ProviderUnavailable
  > {
    const answer = yield* this.#request("discovery", `${issuerUrl}/.well-known/openid-configuration`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (answer.status !== 200 || !answer.body) return yield* unavailable("discovery", `status ${answer.status}`);
    const document = answer.body;
    const issuer = textOrNull(document.issuer);
    if (!issuer || !URL.canParse(issuer) || new URL(issuer).origin !== new URL(issuerUrl).origin) {
      return yield* unavailable("discovery", "The issuer of the provider is not the configured issuer.");
    }
    const endpoint = (value: unknown): string | null => {
      const text = textOrNull(value);
      if (!text || !URL.canParse(text)) return null;
      const url = new URL(text);
      const allowed =
        !url.username &&
        !url.password &&
        (url.protocol === "https:" || (url.protocol === "http:" && url.origin === new URL(issuerUrl).origin));
      return allowed ? text : null;
    };
    const methods = document.token_endpoint_auth_methods_supported;
    return {
      issuer,
      authorizationEndpoint: endpoint(document.authorization_endpoint),
      tokenEndpoint: endpoint(document.token_endpoint),
      userinfoEndpoint: endpoint(document.userinfo_endpoint),
      jwksUri: endpoint(document.jwks_uri),
      basicAuth: !Array.isArray(methods) || methods.includes("client_secret_basic"),
    };
  });
}
