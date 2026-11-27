import { mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { runApiEffect } from "../server/effect-runtime";
import { AccountConfigError, type AccountEnvironment, parseEnvironmentFile, readAccountConfig } from "./config";
import { methodNotAllowed, notFound, Router } from "./http/router";
import { requestSourceIp } from "./http/source-ip";
import { createAccountLogger, type Logger, routeConsoleToLogger } from "./logging";
import { checkSecretKey, SecretKeyMismatch } from "./login/key-check";
import { registerHealthRoutes } from "./routes/health";
import { registerLoginRoutes } from "./routes/login";
import { registerRemoteAccessRoutes } from "./routes/remote-access";
import { BackgroundTasks } from "./runtime/background";
import { FileBucket } from "./runtime/file-bucket";
import { acquireInstanceLock, InstanceLockError } from "./runtime/instance-lock";
import { migrateDatabase } from "./runtime/migrations";
import { Scheduler } from "./runtime/scheduler";
import { openSqliteDatabase, sqliteD1 } from "./runtime/sqlite-d1";
import { type AccountServices, createAccountServices } from "./services";

const MIGRATION_CHAINS = [
  { name: "upstream", directory: resolve(import.meta.dirname, "../../migrations") },
  { name: "codebot", directory: resolve(import.meta.dirname, "../../migrations-codebot") },
];
const DATABASE_FILE = "account.sqlite";
const LOGIN_PRUNE_INTERVAL_MS = 10 * 60_000;
const AUTH_EVENT_RETRY_INTERVAL_MS = 30_000;
const MAXIMUM_REQUEST_BYTES = 8 * 1024 * 1024;
const STOP_REQUEST_LIMIT_MS = 10_000;
const STOP_BACKGROUND_LIMIT_MS = 10_000;

export interface RunningAccountService {
  origin: string;
  port: number;
  services: AccountServices;
  routes: string[];
  stop(): Promise<void>;
}

export interface AccountServiceOptions {
  logSink?: (line: string) => void;
}

export async function startAccountService(
  environment: AccountEnvironment,
  options: AccountServiceOptions = {},
): Promise<RunningAccountService> {
  const logger = createAccountLogger(environment, options.logSink);
  const config = readAccountConfig(environment);
  mkdirSync(config.dataDir, { recursive: true, mode: 0o700 });
  const lock = acquireInstanceLock(config.dataDir);
  const sqlite = openSqliteDatabase(join(config.dataDir, DATABASE_FILE));
  const database = sqliteD1(sqlite);
  try {
    const migration = migrateDatabase(sqlite, MIGRATION_CHAINS);
    logger.info("The database schema is current.", {
      applied: migration.applied.length,
      total: migration.total,
    });
    const keyState = await runApiEffect(
      checkSecretKey(database, config.secretKey, { replace: config.replaceSecretKey, now: Date.now() }),
    ).catch((error: unknown) => {
      if (error instanceof SecretKeyMismatch) {
        throw new AccountConfigError([
          "ACCOUNT_SECRET_KEY is not the key of this database. Use the old key, or set ACCOUNT_REPLACE_SECRET_KEY=true once. All accounts must then sign in again.",
        ]);
      }
      throw error;
    });
    if (keyState === "replaced") {
      logger.warn("The secret key was replaced. All accounts must sign in again.");
    }
    for (const entry of migration.changed) logger.warn("An applied migration file has changed.", entry);
    for (const entry of migration.unknown)
      logger.warn("The database has a migration that this release does not have.", entry);
  } catch (error) {
    database.close();
    lock.release();
    throw error;
  }

  const background = new BackgroundTasks(logger);
  const scheduler = new Scheduler(logger);
  const services = createAccountServices({
    config,
    logger,
    database,
    avatars: new FileBucket(join(config.dataDir, "blobs", "avatars")),
    background,
  });
  const router = new Router();
  registerHealthRoutes(router, services);
  registerLoginRoutes(router, services, services.login);
  await registerRemoteAccessRoutes(router, services);
  scheduler.add({
    name: "login-prune",
    intervalMs: LOGIN_PRUNE_INTERVAL_MS,
    run: () => runApiEffect(services.login.prune()),
  });

  scheduler.add({
    name: "account-revalidate",
    intervalMs: config.login.revalidateSeconds * 1_000,
    run: async () => {
      await runApiEffect(services.guard.revalidateAll());
    },
  });
  scheduler.add({
    name: "auth-event-retry",
    intervalMs: AUTH_EVENT_RETRY_INTERVAL_MS,
    run: async () => {
      services.flushAuthEvents();
    },
  });

  const server = Bun.serve({
    hostname: config.listenHost,
    port: config.port,
    maxRequestBodySize: MAXIMUM_REQUEST_BYTES,
    fetch: async (request, bunServer) => {
      const url = new URL(request.url);
      const match = router.match(request.method, url.pathname);
      if (match.kind === "missing") return notFound();
      if (match.kind === "method") return methodNotAllowed(match.allowed);
      const sourceIp = requestSourceIp(request, bunServer.requestIP(request)?.address ?? null, config.trustProxy);
      try {
        return await match.handler({ request, url, params: match.params, sourceIp });
      } catch (error) {
        return services.respondToError(error);
      }
    },
    error: (error) => services.respondToError(error),
  });
  const port = server.port ?? config.port;
  logger.info("The account service listens.", { host: config.listenHost, port, publicUrl: config.publicUrl });

  let stopping: Promise<void> | null = null;
  const stop = (): Promise<void> => {
    stopping ??= (async () => {
      logger.info("The account service stops.");
      await Promise.race([server.stop(), timeoutAfter(STOP_REQUEST_LIMIT_MS)]);
      await server.stop(true);
      await scheduler.stop();
      const unfinished = await background.drain(STOP_BACKGROUND_LIMIT_MS);
      if (unfinished > 0) logger.warn("Background tasks did not finish before the stop.", { unfinished });
      database.close();
      lock.release();
      logger.info("The account service stopped.");
    })();
    return stopping;
  };

  return { origin: `http://${hostForUrl(config.listenHost)}:${port}`, port, services, routes: router.patterns(), stop };
}

function hostForUrl(host: string): string {
  if (host === "0.0.0.0") return "127.0.0.1";
  return host.includes(":") && !host.startsWith("[") ? `[${host}]` : host;
}

function timeoutAfter(milliseconds: number): Promise<void> {
  return new Promise((resolveTimeout) => {
    const timer = setTimeout(resolveTimeout, milliseconds);
    timer.unref?.();
  });
}

function processEnvironment(): AccountEnvironment {
  const file = process.env.ACCOUNT_ENV_FILE?.trim();
  if (!file) return process.env;
  return { ...parseEnvironmentFile(readFileSync(file, "utf8")), ...process.env };
}

interface ParentChannel {
  send(message: { type: string; origin?: string; port?: number }): void;
}

function parentChannel(): ParentChannel | null {
  const send = process.send?.bind(process);
  return send ? { send: (message) => void send(message) } : null;
}

async function main(): Promise<void> {
  let environment: AccountEnvironment;
  try {
    environment = processEnvironment();
  } catch {
    process.stderr.write("The file of ACCOUNT_ENV_FILE cannot be read.\n");
    process.exit(78);
  }
  let logger: Logger | null = null;
  let running: RunningAccountService;
  try {
    running = await startAccountService(environment);
    logger = running.services.logger;
  } catch (error) {
    if (error instanceof AccountConfigError || error instanceof InstanceLockError) {
      process.stderr.write(`${error.message}\n`);
      process.exit(78);
    }
    process.stderr.write(`The account service did not start: ${error instanceof Error ? error.message : "error"}\n`);
    process.exit(1);
  }
  const restoreConsole = routeConsoleToLogger(logger);
  const parent = parentChannel();
  let signals = 0;
  const shutdown = (reason: string) => {
    signals += 1;
    if (signals > 1) process.exit(1);
    logger?.info("A stop was requested.", { reason });
    void running.stop().then(
      () => {
        restoreConsole();
        parent?.send({ type: "account-service:stopped" });
        process.exit(0);
      },
      () => process.exit(1),
    );
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("message", (message) => {
    if (
      typeof message === "object" &&
      message !== null &&
      "type" in message &&
      message.type === "account-service:stop"
    ) {
      shutdown("parent");
    }
  });
  process.on("unhandledRejection", (reason) => {
    logger?.error("A promise failed with no handler.", {
      error: reason instanceof Error ? reason.name : typeof reason,
    });
  });
  parent?.send({ type: "account-service:ready", origin: running.origin, port: running.port });
}

if (import.meta.main) await main();
