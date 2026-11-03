export interface StoredSession {
    schemaVersion: 1;
    sessionId: string;
    defaultEnvironmentId: string | null;
    updatedAt: string;
}
export type SessionRead = {
    status: 'missing';
} | {
    status: 'ok';
    value: StoredSession;
} | {
    status: 'corrupt';
    reason: string;
};
export declare function readSessionFile(dataDir: string, sessionId: string): Promise<SessionRead>;
export declare function writeSessionFile(dataDir: string, sessionId: string, defaultEnvironmentId: string | null): Promise<StoredSession>;
