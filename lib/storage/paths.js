import path from 'node:path';
import { createHash } from 'node:crypto';
import { ID_PATTERN, KIND_DIRECTORIES, SESSION_ID_PATTERN } from '../domain/constants.js';
export function resolveDataDir(configured, profileDir, cwd, home) {
    const value = configured.trim();
    if (!value)
        return path.join(profileDir, 'data');
    if (value.startsWith('~'))
        return path.join(home, value.slice(1));
    return path.isAbsolute(value) ? value : path.resolve(profileDir || cwd, value);
}
export function kindDir(dataDir, kind) {
    return path.join(dataDir, KIND_DIRECTORIES[kind]);
}
export function isValidId(id) {
    return ID_PATTERN.test(id);
}
export function resolveRecordPath(dataDir, kind, id) {
    if (!isValidId(id)) {
        throw new Error(`Invalid record id: ${JSON.stringify(id)}`);
    }
    const dir = kindDir(dataDir, kind);
    const target = path.resolve(dir, `${id}.yaml`);
    const root = path.resolve(dir) + path.sep;
    if (!target.startsWith(root))
        throw new Error(`Record path escapes ${dir}`);
    return target;
}
export function sessionFileName(sessionId) {
    if (SESSION_ID_PATTERN.test(sessionId))
        return `${sessionId}.json`;
    const digest = createHash('sha256').update(sessionId).digest('hex');
    return `s-${digest}.json`;
}
export function sessionPath(dataDir, sessionId) {
    return path.join(dataDir, 'sessions', sessionFileName(sessionId));
}
export function backupsDir(dataDir) {
    return path.join(dataDir, '.backups');
}
export function backupDir(dataDir, kind, id) {
    return path.join(backupsDir(dataDir), KIND_DIRECTORIES[kind], id);
}
export function sessionBackupDir(dataDir, sessionId) {
    const name = SESSION_ID_PATTERN.test(sessionId)
        ? sessionId
        : createHash('sha256').update(sessionId).digest('hex');
    return path.join(backupsDir(dataDir), 'sessions', name);
}
//# sourceMappingURL=paths.js.map