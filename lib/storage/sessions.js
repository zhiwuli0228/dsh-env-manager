import { promises as fs } from 'node:fs';
import { LIMITS } from '../domain/constants.js';
import { sessionBackupDir, sessionPath } from './paths.js';
import { rotateBackup, serialize, writeTextAtomic } from './atomic.js';
export async function readSessionFile(dataDir, sessionId) {
    const target = sessionPath(dataDir, sessionId);
    let text;
    try {
        text = await fs.readFile(target, 'utf8');
    }
    catch (error) {
        if (error.code === 'ENOENT')
            return { status: 'missing' };
        return { status: 'corrupt', reason: error.message };
    }
    if (Buffer.byteLength(text, 'utf8') > LIMITS.sessionBytes) {
        return { status: 'corrupt', reason: 'session file exceeds 64 KiB' };
    }
    try {
        const value = JSON.parse(text);
        if (value.schemaVersion !== 1 || typeof value.sessionId !== 'string') {
            return { status: 'corrupt', reason: 'unsupported session schema' };
        }
        const defaultEnvironmentId = value.defaultEnvironmentId === null || typeof value.defaultEnvironmentId === 'string'
            ? value.defaultEnvironmentId
            : undefined;
        if (defaultEnvironmentId === undefined) {
            return { status: 'corrupt', reason: 'defaultEnvironmentId must be string or null' };
        }
        if (value.sessionId !== sessionId) {
            return { status: 'corrupt', reason: 'sessionId does not match the file name' };
        }
        return {
            status: 'ok',
            value: {
                schemaVersion: 1,
                sessionId,
                defaultEnvironmentId,
                updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : new Date().toISOString(),
            },
        };
    }
    catch (error) {
        return { status: 'corrupt', reason: error.message };
    }
}
export async function writeSessionFile(dataDir, sessionId, defaultEnvironmentId) {
    const value = {
        schemaVersion: 1,
        sessionId,
        defaultEnvironmentId,
        updatedAt: new Date().toISOString(),
    };
    const text = JSON.stringify(value, null, 2) + '\n';
    if (Buffer.byteLength(text, 'utf8') > LIMITS.sessionBytes) {
        throw new Error('session context exceeds 64 KiB');
    }
    const target = sessionPath(dataDir, sessionId);
    await serialize(target, async () => {
        await rotateBackup(target, sessionBackupDir(dataDir, sessionId), 'json');
        await writeTextAtomic(target, text);
    });
    return value;
}
//# sourceMappingURL=sessions.js.map