import { type DynamicRecord, isDynamicRecord, isString } from "@codebot/contracts/runtime-values";

export type AccountEnvironment = Record<string, string | undefined>;

export type LoginProviderConfig =
  | {
      kind: "oidc";
      issuerUrl: string;
      authorizationEndpoint: string | null;
      tokenEndpoint: string | null;
      userinfoEndpoint: string | null;
      jwksUri: string | null;
    }
  | {
      kind: "nextcloud-oauth2";
      nextcloudUrl: string;
      authorizationEndpoint: string | null;
      tokenEndpoint: string | null;
      userinfoEndpoint: string | null;
    };

export interface AccountConfig {
  publicUrl: string;
  listenHost: string;
  port: number;
  dataDir: string;
  trustProxy: boolean;
  secretKey: string;
  replaceSecretKey: boolean;
  ticket: { keyId: string; privateJwk: string; publicJwks: string };
  signal: {
    url: string | null;
    homes: string | null;
    webhookUrl: string | null;
    webhookUrls: string | null;
    webhookSecret: string | null;
  };
  login: {
    provider: LoginProviderConfig;
    providerName: string;
    clientId: string;
    clientSecret: string;
    scopes: string;
    flowSeconds: number;
    revalidateSeconds: number;
    revalidateGraceSeconds: number;
    ticketFreshnessSeconds: number;
  };
  minimumVersions: { desktop: string | null; host: string | null; ios: string | null; android: string | null };
  messaging: {
    slackRoutePrivateJwk: string | null;
    slackRouteKeyId: string | null;
    discordRoutePrivateJwk: string | null;
    discordRouteKeyId: string | null;
    telegramBotId: string | null;
    telegramBotUsername: string | null;
  };
}

export class AccountConfigError extends Error {
  constructor(readonly problems: readonly string[]) {
    super(`The account service configuration is not valid:\n${problems.map((problem) => `- ${problem}`).join("\n")}`);
    this.name = "AccountConfigError";
  }
}

const SECRET_NAMES = [
  "ACCOUNT_SECRET_KEY",
  "OIDC_CLIENT_SECRET",
  "REMOTE_TICKET_PRIVATE_JWK",
  "REMOTE_AUTH_WEBHOOK_SECRET",
  "SLACK_ROUTE_PRIVATE_JWK",
  "DISCORD_ROUTE_PRIVATE_JWK",
] as const;

const VERSION_PATTERN = /^[0-9]{1,4}\.[0-9]{1,4}\.[0-9]{1,6}$/u;
const KEY_ID_PATTERN = /^[A-Za-z0-9:_-]{1,128}$/u;
const SCOPE_PATTERN = /^[\x21\x23-\x5B\x5D-\x7E]+(?: [\x21\x23-\x5B\x5D-\x7E]+)*$/u;

export function accountSecretValues(environment: AccountEnvironment): string[] {
  const values: string[] = [];
  for (const name of SECRET_NAMES) {
    const value = environment[name]?.trim();
    if (!value) continue;
    values.push(value);
    if (name.endsWith("_JWK")) values.push(...privateJwkParts(value));
  }
  return values;
}

function privateJwkParts(value: string): string[] {
  const parsed = parseJsonRecord(value);
  return parsed && isString(parsed.d) ? [parsed.d] : [];
}

export function readAccountConfig(environment: AccountEnvironment): AccountConfig {
  const problems: string[] = [];
  const encrypted = new Set<string>();
  const read = (name: string): string | null => {
    const value = environment[name]?.trim();
    if (!value) return null;
    if (value.startsWith("encrypted:")) {
      if (!encrypted.has(name)) {
        problems.push(`${name} holds an encrypted value. Set the plain value in the environment of this service.`);
      }
      encrypted.add(name);
      return null;
    }
    return value;
  };
  const required = (name: string): string => {
    const value = read(name);
    if (value === null && !encrypted.has(name)) problems.push(`${name} is required.`);
    return value ?? "";
  };
  const integer = (name: string, fallback: number, minimum: number, maximum: number): number => {
    const value = read(name);
    if (value === null) return fallback;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
      problems.push(`${name} must be a whole number from ${minimum} to ${maximum}.`);
      return fallback;
    }
    return parsed;
  };
  const flag = (name: string): boolean => {
    const value = read(name);
    if (value === null) return false;
    if (value === "true" || value === "false") return value === "true";
    problems.push(`${name} must be true or false.`);
    return false;
  };
  const version = (name: string): string | null => {
    const value = read(name);
    if (value === null) return null;
    if (VERSION_PATTERN.test(value)) return value;
    problems.push(`${name} must be a version such as 1.2.3.`);
    return null;
  };

  const serviceUrl = (name: string, value: string | null, protocols: readonly string[]): string | null => {
    if (value === null) return null;
    const url = URL.canParse(value) ? new URL(value) : null;
    if (!url || url.username || url.password || url.hash) {
      problems.push(`${name} must be a URL with no user name, password or fragment.`);
      return null;
    }
    const secure = protocols.includes(url.protocol);
    const insecureLoopback =
      isLoopbackHost(url.hostname) && protocols.some((protocol) => insecureForm(protocol) === url.protocol);
    if (!secure && !insecureLoopback) {
      problems.push(`${name} must use ${protocols.join(" or ")}. A loopback address can use the form with no TLS.`);
      return null;
    }
    return value;
  };

  const publicUrlInput = required("ACCOUNT_PUBLIC_URL");
  let publicUrl = "";
  if (publicUrlInput) {
    const checked = serviceUrl("ACCOUNT_PUBLIC_URL", publicUrlInput, ["https:"]);
    if (checked) {
      const url = new URL(checked);
      if (url.pathname !== "/" || url.search) problems.push("ACCOUNT_PUBLIC_URL must have no path and no query.");
      else publicUrl = url.origin;
    }
  }

  const dataDir = required("ACCOUNT_DATA_DIR");
  const secretKey = required("ACCOUNT_SECRET_KEY");
  if (secretKey && new TextEncoder().encode(secretKey).byteLength < 32) {
    problems.push("ACCOUNT_SECRET_KEY must contain at least 32 bytes. Make one with the keys command.");
  }

  const keyId = required("REMOTE_TICKET_KEY_ID");
  const privateJwk = required("REMOTE_TICKET_PRIVATE_JWK");
  const publicJwks = required("REMOTE_TICKET_PUBLIC_JWKS");
  if (keyId && !KEY_ID_PATTERN.test(keyId)) problems.push("REMOTE_TICKET_KEY_ID has characters that are not allowed.");
  if (keyId && privateJwk && publicJwks) problems.push(...ticketKeyProblems(keyId, privateJwk, publicJwks));

  const signalUrl = serviceUrl("REMOTE_SIGNAL_URL", read("REMOTE_SIGNAL_URL"), ["wss:"]);
  const signalHomes = read("REMOTE_SIGNAL_HOMES");
  const webhookUrl = serviceUrl("REMOTE_AUTH_WEBHOOK_URL", read("REMOTE_AUTH_WEBHOOK_URL"), ["https:"]);
  const webhookUrls = read("REMOTE_AUTH_WEBHOOK_URLS");
  for (const entry of (webhookUrls ?? "").split(",")) {
    if (entry.trim()) serviceUrl("REMOTE_AUTH_WEBHOOK_URLS", entry.trim(), ["https:"]);
  }
  const webhookSecret = read("REMOTE_AUTH_WEBHOOK_SECRET");
  if ((webhookUrl || webhookUrls) && !webhookSecret) {
    problems.push("REMOTE_AUTH_WEBHOOK_SECRET is required when a REMOTE_AUTH_WEBHOOK_URL is set.");
  }
  if (webhookSecret && new TextEncoder().encode(webhookSecret).byteLength < 32) {
    problems.push("REMOTE_AUTH_WEBHOOK_SECRET must contain at least 32 bytes.");
  }

  const providerUrl = (name: string): string | null => serviceUrl(name, read(name), ["https:"]);
  const issuerUrl = providerUrl("OIDC_ISSUER_URL");
  const nextcloudUrl = providerUrl("NEXTCLOUD_URL");
  const endpoints = {
    authorizationEndpoint: providerUrl("OIDC_AUTHORIZATION_ENDPOINT"),
    tokenEndpoint: providerUrl("OIDC_TOKEN_ENDPOINT"),
    userinfoEndpoint: providerUrl("OIDC_USERINFO_ENDPOINT"),
  };
  const jwksUri = providerUrl("OIDC_JWKS_URI");
  let provider: LoginProviderConfig = { kind: "nextcloud-oauth2", nextcloudUrl: "", ...endpoints };
  if (read("OIDC_ISSUER_URL") && read("NEXTCLOUD_URL")) {
    problems.push("Set OIDC_ISSUER_URL or NEXTCLOUD_URL, not both. Each one selects a different login provider.");
  } else if (!read("OIDC_ISSUER_URL") && !read("NEXTCLOUD_URL")) {
    problems.push("OIDC_ISSUER_URL or NEXTCLOUD_URL is required. It selects the login provider.");
  } else if (issuerUrl) {
    provider = { kind: "oidc", issuerUrl: withoutTrailingSlash(issuerUrl), ...endpoints, jwksUri };
  } else if (nextcloudUrl) {
    if (jwksUri) problems.push("OIDC_JWKS_URI applies only with OIDC_ISSUER_URL.");
    provider = { kind: "nextcloud-oauth2", nextcloudUrl: withoutTrailingSlash(nextcloudUrl), ...endpoints };
  }
  const scopes = read("OIDC_SCOPES") ?? "openid profile email";
  if (!SCOPE_PATTERN.test(scopes)) problems.push("OIDC_SCOPES must be scope names with one space between them.");
  if (provider.kind === "oidc" && !scopes.split(" ").includes("openid")) {
    problems.push("OIDC_SCOPES must contain openid.");
  }
  const providerName = read("OIDC_PROVIDER_NAME") ?? "Nextcloud";
  if (providerName.length > 60 || hasControlCharacter(providerName)) {
    problems.push("OIDC_PROVIDER_NAME must have at most 60 characters and no control characters.");
  }

  const config: AccountConfig = {
    publicUrl,
    listenHost: read("ACCOUNT_LISTEN_HOST") ?? "127.0.0.1",
    port: integer("ACCOUNT_PORT", 3100, 0, 65_535),
    dataDir,
    trustProxy: flag("ACCOUNT_TRUST_PROXY"),
    secretKey,
    replaceSecretKey: flag("ACCOUNT_REPLACE_SECRET_KEY"),
    ticket: { keyId, privateJwk, publicJwks },
    signal: { url: signalUrl, homes: signalHomes, webhookUrl, webhookUrls, webhookSecret },
    login: {
      provider,
      providerName,
      clientId: required("OIDC_CLIENT_ID"),
      clientSecret: required("OIDC_CLIENT_SECRET"),
      scopes,
      flowSeconds: integer("ACCOUNT_LOGIN_FLOW_SECONDS", 600, 1, 3_600),
      revalidateSeconds: integer("ACCOUNT_REVALIDATE_SECONDS", 300, 1, 86_400),
      revalidateGraceSeconds: integer("ACCOUNT_REVALIDATE_GRACE_SECONDS", 86_400, 0, 365 * 86_400),
      ticketFreshnessSeconds: integer("ACCOUNT_TICKET_FRESHNESS_SECONDS", 60, 0, 3_600),
    },
    minimumVersions: {
      desktop: version("ACCOUNT_MINIMUM_VERSION_DESKTOP"),
      host: version("ACCOUNT_MINIMUM_VERSION_HOST"),
      ios: version("ACCOUNT_MINIMUM_VERSION_IOS"),
      android: version("ACCOUNT_MINIMUM_VERSION_ANDROID"),
    },
    messaging: {
      slackRoutePrivateJwk: read("SLACK_ROUTE_PRIVATE_JWK"),
      slackRouteKeyId: read("SLACK_ROUTE_KEY_ID"),
      discordRoutePrivateJwk: read("DISCORD_ROUTE_PRIVATE_JWK"),
      discordRouteKeyId: read("DISCORD_ROUTE_KEY_ID"),
      telegramBotId: read("TELEGRAM_BOT_ID"),
      telegramBotUsername: read("TELEGRAM_BOT_USERNAME"),
    },
  };
  if (problems.length > 0) throw new AccountConfigError(problems);
  return config;
}

function ticketKeyProblems(keyId: string, privateJwk: string, publicJwks: string): string[] {
  const problems: string[] = [];
  const privateKey = parseJsonRecord(privateJwk);
  if (privateKey?.kty !== "EC" || privateKey.crv !== "P-256" || !isString(privateKey.d)) {
    problems.push("REMOTE_TICKET_PRIVATE_JWK must be a P-256 private key in JWK form.");
  } else if (isString(privateKey.kid) && privateKey.kid !== keyId) {
    problems.push("REMOTE_TICKET_PRIVATE_JWK has a kid that is not REMOTE_TICKET_KEY_ID.");
  }
  const publicKeys = parseJsonRecord(publicJwks);
  const keys = publicKeys && Array.isArray(publicKeys.keys) ? publicKeys.keys.filter(isDynamicRecord) : null;
  if (!keys) {
    problems.push("REMOTE_TICKET_PUBLIC_JWKS must be a JWKS document with a keys list.");
    return problems;
  }
  if (keys.some((key) => "d" in key)) problems.push("REMOTE_TICKET_PUBLIC_JWKS must not contain a private key.");
  const active = keys.find((key) => key.kid === keyId);
  if (active?.kty !== "EC" || active.crv !== "P-256") {
    problems.push("REMOTE_TICKET_PUBLIC_JWKS must contain the P-256 public key of REMOTE_TICKET_KEY_ID.");
  } else if (privateKey && (active.x !== privateKey.x || active.y !== privateKey.y)) {
    problems.push("REMOTE_TICKET_PUBLIC_JWKS does not hold the public part of REMOTE_TICKET_PRIVATE_JWK.");
  }
  return problems;
}

function parseJsonRecord(value: string): DynamicRecord | null {
  try {
    const parsed = JSON.parse(value);
    return isDynamicRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function insecureForm(protocol: string): string {
  return protocol === "https:" ? "http:" : protocol === "wss:" ? "ws:" : protocol;
}

export function isLoopbackHost(hostname: string): boolean {
  return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "[::1]";
}

function withoutTrailingSlash(value: string): string {
  return value.replace(/\/+$/u, "");
}

function hasControlCharacter(value: string): boolean {
  return /[\p{Cc}\p{Cf}]/u.test(value);
}

export function parseEnvironmentFile(text: string): AccountEnvironment {
  const values: AccountEnvironment = {};
  for (const rawLine of text.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const name = line
      .slice(0, separator)
      .trim()
      .replace(/^export\s+/u, "");
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(name)) continue;
    values[name] = unquoted(line.slice(separator + 1).trim());
  }
  return values;
}

function unquoted(value: string): string {
  const quote = value.at(0);
  if ((quote === '"' || quote === "'") && value.length >= 2 && value.at(-1) === quote) return value.slice(1, -1);
  return value;
}
