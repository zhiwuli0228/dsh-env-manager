import type { Diagnostic, SessionContext } from '../domain/types.js';
export interface SessionResult {
    context: SessionContext;
    diagnostics: Diagnostic[];
}
/**
 * Per-session default environment. The file is authoritative; a process-local
 * cache keeps the current process consistent when a write fails.
 */
export declare class SessionStore {
    private readonly dataDir;
    private readonly cache;
    constructor(dataDir: string);
    get(sessionId: string): Promise<SessionResult>;
    set(sessionId: string, environmentId: string | null): Promise<SessionResult>;
}
