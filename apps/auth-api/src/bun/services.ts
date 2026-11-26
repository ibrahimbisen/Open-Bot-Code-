import { RemoteControlPlane } from "../server/remote-control-plane";
import type { WorkerBindings } from "../server/types";
import type { AccountConfig } from "./config";
import { createErrorResponder, type ErrorResponder } from "./http/responses";
import type { Logger } from "./logging";
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
  remote: RemoteControlPlane;
}

function optional(value: string | null): { value: string } | null {
  return value === null ? null : { value };
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
    const present = optional(value);
    if (present) bindings[name] = present.value;
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
  const bindings = accountBindings(input.config, input.database, input.avatars);
  return {
    config: input.config,
    logger: input.logger,
    database: input.database,
    bindings,
    background: input.background,
    respondToError: createErrorResponder(input.logger),
    remote: new RemoteControlPlane(bindings, { schedule: input.background.schedule }),
  };
}
