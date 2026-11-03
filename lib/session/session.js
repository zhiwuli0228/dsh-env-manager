import { readSessionFile, writeSessionFile } from '../storage/sessions.js';
/**
 * Per-session default environment. The file is authoritative; a process-local
 * cache keeps the current process consistent when a write fails.
 */
export class SessionStore {
    dataDir;
    cache = new Map();
    constructor(dataDir) {
        this.dataDir = dataDir;
    }
    async get(sessionId) {
        const read = await readSessionFile(this.dataDir, sessionId);
        if (read.status === 'ok') {
            this.cache.set(sessionId, read.value.defaultEnvironmentId);
            return {
                context: {
                    sessionId,
                    defaultEnvironmentId: read.value.defaultEnvironmentId,
                    persisted: true,
                },
                diagnostics: [],
            };
        }
        const cached = this.cache.get(sessionId);
        const fallback = cached ?? null;
        const diagnostics = read.status === 'corrupt'
            ? [
                {
                    code: 'SESSION_CONTEXT_UNPERSISTED',
                    severity: 'warning',
                    message: `Session context file for ${sessionId} is unreadable (${read.reason}); using no default`,
                },
            ]
            : [];
        return {
            context: { sessionId, defaultEnvironmentId: fallback, persisted: false },
            diagnostics,
        };
    }
    async set(sessionId, environmentId) {
        this.cache.set(sessionId, environmentId);
        try {
            await writeSessionFile(this.dataDir, sessionId, environmentId);
            return {
                context: { sessionId, defaultEnvironmentId: environmentId, persisted: true },
                diagnostics: [],
            };
        }
        catch (error) {
            return {
                context: { sessionId, defaultEnvironmentId: environmentId, persisted: false },
                diagnostics: [
                    {
                        code: 'SESSION_CONTEXT_UNPERSISTED',
                        severity: 'warning',
                        message: `Session default was updated in memory but not persisted: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
            };
        }
    }
}
//# sourceMappingURL=session.js.map