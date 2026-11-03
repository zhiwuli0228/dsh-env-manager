export const consoleLogger = {
    debug: (message, details) => console.debug(`[dsh-env-manager] ${message}`, details ?? ''),
    info: (message, details) => console.info(`[dsh-env-manager] ${message}`, details ?? ''),
    warn: (message, details) => console.warn(`[dsh-env-manager] ${message}`, details ?? ''),
    error: (message, details) => console.error(`[dsh-env-manager] ${message}`, details ?? ''),
};
export const silentLogger = {
    debug: () => undefined,
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
};
//# sourceMappingURL=logger.js.map