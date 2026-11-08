import { readRecordRaw, listRecordIds } from '../storage/records.js';
import { parseRecordLoose, unknownTopLevelKeys } from '../domain/schemas.js';
import { KIND_DIRECTORIES, RECORD_KINDS, isRecordKind } from '../domain/constants.js';
import { checkIntegrity } from './integrity.js';
function warning(code, message, file, path) {
    return { code, severity: 'warning', message, file, path };
}
function emptySnapshot() {
    return {
        environments: new Map(),
        services: new Map(),
        deployments: new Map(),
        ruleProfiles: new Map(),
        operationBindings: new Map(),
        drGroups: new Map(),
        byAlias: new Map(),
        diagnostics: [],
        loadedAt: new Date().toISOString(),
    };
}
function mapFor(snapshot, kind) {
    switch (kind) {
        case 'environment':
            return snapshot.environments;
        case 'service':
            return snapshot.services;
        case 'deployment':
            return snapshot.deployments;
        case 'ruleProfile':
            return snapshot.ruleProfiles;
        case 'operationBinding':
            return snapshot.operationBindings;
        case 'drGroup':
            return snapshot.drGroups;
    }
}
export async function loadSnapshot(dataDir) {
    const snapshot = emptySnapshot();
    for (const kind of RECORD_KINDS) {
        const ids = await listRecordIds(dataDir, kind);
        for (const id of ids) {
            const file = `${kindDirectoryName(kind)}/${id}.yaml`;
            let raw;
            try {
                raw = await readRecordRaw(dataDir, kind, id);
            }
            catch (error) {
                snapshot.diagnostics.push({
                    code: 'RECORD_INVALID',
                    severity: 'error',
                    message: error instanceof Error ? error.message : String(error),
                    file,
                });
                continue;
            }
            if (!raw.found || raw.raw === undefined)
                continue;
            const document = raw.raw;
            if (document.schemaVersion !== 1) {
                snapshot.diagnostics.push({
                    code: 'SCHEMA_UNSUPPORTED',
                    severity: 'warning',
                    message: `Unsupported schemaVersion ${String(document.schemaVersion)}; record skipped`,
                    file,
                });
                continue;
            }
            const parsed = parseRecordLoose(kind, document);
            if (!parsed.ok) {
                snapshot.diagnostics.push({
                    code: 'RECORD_INVALID',
                    severity: 'error',
                    message: `Invalid ${kind} record: ${parsed.issues.map((issue) => `${issue.path}: ${issue.message}`).join('; ')}`,
                    file,
                    details: { issues: parsed.issues },
                });
                continue;
            }
            const record = parsed.record;
            if (record.id !== id) {
                snapshot.diagnostics.push({
                    code: 'RECORD_INVALID',
                    severity: 'error',
                    message: `Record id "${record.id}" does not match its file name "${id}"`,
                    file,
                });
                continue;
            }
            const target = mapFor(snapshot, kind);
            if (target.has(record.id)) {
                snapshot.diagnostics.push({
                    code: 'DUPLICATE_ID',
                    severity: 'error',
                    message: `Duplicate ${kind} id "${record.id}"`,
                    file,
                });
                continue;
            }
            for (const key of unknownTopLevelKeys(kind, document)) {
                snapshot.diagnostics.push(warning('UNKNOWN_FIELD', `Unknown field "${key}" is preserved but not interpreted`, file, key));
            }
            target.set(record.id, record);
            const names = new Set([record.id]);
            const maybeNamed = record;
            if (maybeNamed.name)
                names.add(maybeNamed.name);
            for (const alias of maybeNamed.aliases ?? [])
                names.add(alias);
            for (const name of names) {
                const key = `${kind}:${name.toLowerCase()}`;
                if (!snapshot.byAlias.has(key))
                    snapshot.byAlias.set(key, record.id);
            }
        }
    }
    snapshot.diagnostics.push(...checkIntegrity(snapshot));
    return snapshot;
}
function kindDirectoryName(kind) {
    return KIND_DIRECTORIES[kind];
}
export function lookup(snapshot, kind, id) {
    return mapFor(snapshot, kind).get(id);
}
/** Lookup an id that may be an id, a name, or an alias. */
export function lookupByRef(snapshot, kind, ref) {
    return (lookup(snapshot, kind, ref) ??
        snapshot.byAlias.get(`${kind}:${ref.toLowerCase()}`));
}
export class RegistryLoader {
    dataDir;
    last;
    inflight;
    constructor(dataDir) {
        this.dataDir = dataDir;
    }
    get lastSnapshot() {
        return this.last;
    }
    async load() {
        if (this.inflight)
            return this.inflight;
        const run = loadSnapshot(this.dataDir)
            .then((snapshot) => {
            this.last = snapshot;
            return snapshot;
        })
            .catch((error) => {
            if (this.last) {
                const diagnostics = [
                    ...this.last.diagnostics,
                    {
                        code: 'INTERNAL_ERROR',
                        severity: 'error',
                        message: `Registry reload failed; serving the previous snapshot: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ];
                return { ...this.last, diagnostics };
            }
            throw error;
        })
            .finally(() => {
            this.inflight = undefined;
        });
        this.inflight = run;
        return run;
    }
}
export function requireKind(value) {
    if (!isRecordKind(value))
        throw new Error(`Unknown record kind: ${value}`);
    return value;
}
//# sourceMappingURL=registry.js.map