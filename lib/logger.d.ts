export interface Logger {
    debug(message: string, details?: unknown): void;
    info(message: string, details?: unknown): void;
    warn(message: string, details?: unknown): void;
    error(message: string, details?: unknown): void;
}
export declare const consoleLogger: Logger;
export declare const silentLogger: Logger;
