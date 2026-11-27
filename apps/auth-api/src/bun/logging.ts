import { createCodeBotLogger, type Logger, type LogValue, registerSecretValues, toLogValue } from "@codebot/logging";
import { type AccountEnvironment, accountSecretValues } from "./config";

export type { Logger };

export function createAccountLogger(environment: AccountEnvironment, sink?: (line: string) => void): Logger {
  registerSecretValues(accountSecretValues(environment));
  return createCodeBotLogger("account", sink);
}

interface ConsoleMethods {
  log: typeof console.log;
  info: typeof console.info;
  warn: typeof console.warn;
  error: typeof console.error;
  debug: typeof console.debug;
}

export function routeConsoleToLogger(logger: Logger): () => void {
  const original: ConsoleMethods = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  };
  const forward =
    (write: (message?: LogValue, ...params: LogValue[]) => void) =>
    (...values: unknown[]): void => {
      const [message, ...params] = values.map(toLogValue);
      write(message, ...params);
    };
  console.log = forward(logger.info);
  console.info = forward(logger.info);
  console.warn = forward(logger.warn);
  console.error = forward(logger.error);
  console.debug = forward(logger.debug);
  return () => {
    Object.assign(console, original);
  };
}
