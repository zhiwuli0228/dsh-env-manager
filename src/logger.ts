export interface Logger {
  debug(message: string, details?: unknown): void
  info(message: string, details?: unknown): void
  warn(message: string, details?: unknown): void
  error(message: string, details?: unknown): void
}

export const consoleLogger: Logger = {
  debug: (message, details) => console.debug(`[dsh-env-manager] ${message}`, details ?? ''),
  info: (message, details) => console.info(`[dsh-env-manager] ${message}`, details ?? ''),
  warn: (message, details) => console.warn(`[dsh-env-manager] ${message}`, details ?? ''),
  error: (message, details) => console.error(`[dsh-env-manager] ${message}`, details ?? ''),
}

export const silentLogger: Logger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
}
