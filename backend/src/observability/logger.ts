import { AsyncLocalStorage } from "node:async_hooks";

type LogValue = boolean | number | string | undefined;
type LogFields = Record<string, LogValue>;
type LogLevel = "error" | "info";

const logContext = new AsyncLocalStorage<LogFields>();

function emit(level: LogLevel, event: string, fields: LogFields = {}): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...logContext.getStore(),
    ...fields,
  };

  console[level === "error" ? "error" : "info"](JSON.stringify(entry));
}

export function runWithLogContext<T>(fields: LogFields, callback: () => T): T {
  return logContext.run({ ...logContext.getStore(), ...fields }, callback);
}

export const logger = {
  info(event: string, fields?: LogFields): void {
    emit("info", event, fields);
  },
  error(event: string, error: unknown, fields?: LogFields): void {
    emit("error", event, {
      ...fields,
      errorType: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  },
};
