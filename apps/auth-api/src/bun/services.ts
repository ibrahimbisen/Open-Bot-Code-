import { Effect } from "effect";
import { AuthService } from "../server/auth-service";
import { D1AuthRepository } from "../server/d1-auth-repository";
import {
  deliverPendingRemoteAuthEvents,
  notifyAccountProfileChanged,
  RemoteControlPlane,
} from "../server/remote-control-plane";
import type { WorkerBindings } from "../server/types";
import type { AccountConfig } from "./config";
import { createErrorResponder, type ErrorResponder } from "./http/responses";
import type { Logger } from "./logging";
import { AccountGuard } from "./login/account-guard";
import { IdentityStore } from "./login/identity-store";
import { LoginService } from "./login/login-service";
import { IdentityProvider } from "./login/provider";
import { SecretBox } from "./login/secret-box";
import type { BackgroundTasks } from "./runtime/background";
import type { SqliteD1Database } from "./runtime/sqlite-d1";

export type AccountBindings = Pick<
  WorkerBindings,
  | "DB"
  | "AVATARS"
  | "REMOTE_TICKET_PRIVATE_JWK"
  | "REMOTE_TICKET_PUBLIC_JWKS"
  | "REMOTE_TICKET_KEY_ID"
  | "REMOTE_SIGNAL_URL"
  | "REMOTE_SIGNAL_HOMES"
  | "REMOTE_AUTH_WEBHOOK_URL"
  | "REMOTE_AUTH_WEBHOOK_URLS"
  | "REMOTE_AUTH_WEBHOOK_SECRET"
  | "SLACK_ROUTE_PRIVATE_JWK"
  | "SLACK_ROUTE_KEY_ID"
  | "DISCORD_ROUTE_PRIVATE_JWK"
  | "DISCORD_ROUTE_KEY_ID"
  | "TELEGRAM_BOT_ID"
  | "TELEGRAM_BOT_USERNAME"
>;

export interface AccountServices {
  config: AccountConfig;
  logger: Logger;
  database: SqliteD1Database;
  bindings: AccountBindings;
  background: BackgroundTasks;
  respondToError: ErrorResponder;
  auth: AuthService;
  remote: RemoteControlPlane;
  provider: IdentityProvider;
  identities: IdentityStore;
  login: LoginService;
  guard: AccountGuard;
  flushAuthEvents: () => void;
}

export function accountBindings(config: AccountConfig, database: D1Database, avatars: R2Bucket): AccountBindings {
  const bindings: AccountBindings = {
    DB: database,
    AVATARS: avatars,
    REMOTE_TICKET_PRIVATE_JWK: config.ticket.privateJwk,
    REMOTE_TICKET_PUBLIC_JWKS: config.ticket.publicJwks,
    REMOTE_TICKET_KEY_ID: config.ticket.keyId,
  };
  const assign = (name: Exclude<keyof AccountBindings, "DB" | "AVATARS">, value: string | null) => {
    if (value !== null) bindings[name] = value;
  };
  assign("REMOTE_SIGNAL_URL", config.signal.url);
  assign("REMOTE_SIGNAL_HOMES", config.signal.homes);
  assign("REMOTE_AUTH_WEBHOOK_URL", config.signal.webhookUrl);
  assign("REMOTE_AUTH_WEBHOOK_URLS", config.signal.webhookUrls);
  assign("REMOTE_AUTH_WEBHOOK_SECRET", config.signal.webhookSecret);
  assign("SLACK_ROUTE_PRIVATE_JWK", config.messaging.slackRoutePrivateJwk);
  assign("SLACK_ROUTE_KEY_ID", config.messaging.slackRouteKeyId);
  assign("DISCORD_ROUTE_PRIVATE_JWK", config.messaging.discordRoutePrivateJwk);
  assign("DISCORD_ROUTE_KEY_ID", config.messaging.discordRouteKeyId);
  assign("TELEGRAM_BOT_ID", config.messaging.telegramBotId);
  assign("TELEGRAM_BOT_USERNAME", config.messaging.telegramBotUsername);
  return bindings;
}

export function createAccountServices(input: {
  config: AccountConfig;
  logger: Logger;
  database: SqliteD1Database;
  avatars: R2Bucket;
  background: BackgroundTasks;
}): AccountServices {
  const { config, logger, database, background } = input;
  const bindings = accountBindings(config, database, input.avatars);
  const flushAuthEvents = () =>
    background.schedule(
      deliverPendingRemoteAuthEvents(bindings, Date.now()).pipe(
        Effect.catch(() => Effect.sync(() => logger.warn("Auth events were not delivered. The service tries again."))),
      ),
    );
  const provider = new IdentityProvider(config.login);
  const box = new SecretBox(config.secretKey);
  const identities = new IdentityStore(database, box);
  const guard = new AccountGuard({
    database,
    provider,
    identities,
    box,
    graceSeconds: config.login.revalidateGraceSeconds,
    freshnessSeconds: config.login.ticketFreshnessSeconds,
    logger,
    accessRevoked: flushAuthEvents,
  });
  return {
    config,
    logger,
    database,
    bindings,
    background,
    respondToError: createErrorResponder(logger),
    auth: new AuthService({
      repository: new D1AuthRepository(database),
      delivery: null,
      flushSessionRevocations: () => Effect.sync(flushAuthEvents),
      profileChanged: (userId) => notifyAccountProfileChanged(bindings, userId, background.schedule),
    }),
    remote: new RemoteControlPlane(bindings, { schedule: background.schedule }),
    provider,
    identities,
    login: new LoginService({ database, provider, identities, config, logger, sessionsRevoked: flushAuthEvents }),
    guard,
    flushAuthEvents,
  };
}
