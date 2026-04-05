import { env, type LogLevel } from "@/env";

type LoggerMethodT = (...args: unknown[]) => void;

type LoggerT = {
  error: LoggerMethodT;
  warn: LoggerMethodT;
  info: LoggerMethodT;
  debug: LoggerMethodT;
};

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
};

function shouldLog(level: LogLevel, configuredLevel: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] <= LOG_LEVEL_PRIORITY[configuredLevel];
}

function write(level: LogLevel, scope: string, args: unknown[]): void {
  if (!shouldLog(level, env.logLevel)) return;

  const prefix = `[${scope}]`;
  const firstArg = args[0];
  const restArgs = args.slice(1);

  const writer: LoggerMethodT =
    level === "error"
      ? console.error
      : level === "warn"
        ? console.warn
        : level === "info"
          ? console.info
          : console.debug;

  if (typeof firstArg === "string") {
    writer(`${prefix} ${firstArg}`, ...restArgs);
    return;
  }

  if (firstArg === undefined) {
    writer(prefix);
    return;
  }

  writer(prefix, firstArg, ...restArgs);
}

export function createLogger(scope: string): LoggerT {
  return {
    error: (...args: unknown[]) => write("error", scope, args),
    warn: (...args: unknown[]) => write("warn", scope, args),
    info: (...args: unknown[]) => write("info", scope, args),
    debug: (...args: unknown[]) => write("debug", scope, args),
  };
}

