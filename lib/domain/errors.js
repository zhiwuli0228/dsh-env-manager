import { HarnessError } from '@deepseek-ai/dsh-llm';
export class EnvManagerError extends HarnessError {
    details;
    constructor(code, message, details) {
        super(message, code);
        this.name = 'EnvManagerError';
        this.details = details;
    }
}
export function isEnvManagerError(error) {
    return error instanceof EnvManagerError;
}
export function asEnvManagerError(error) {
    if (error instanceof EnvManagerError)
        return error;
    const message = error instanceof Error ? error.message : String(error);
    return new EnvManagerError('INTERNAL_ERROR', message);
}
export function diagnostic(code, severity, message, extra) {
    return { code, severity, message, ...extra };
}
//# sourceMappingURL=errors.js.map