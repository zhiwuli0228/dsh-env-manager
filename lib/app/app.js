import { createRequire } from 'node:module';
import { PLUGIN_CREDENTIAL_PREFIX, isCredentialRef } from '../domain/credential-ref.js';
import { EnvManagerError } from '../domain/errors.js';
import { ENVIRONMENT_SCOPED_OPERATIONS, EXPERIENCE_LIMITS, LIMITS, WRITE_OPERATIONS, isRecordKind, } from '../domain/constants.js';
import { parseExperienceInput, parseRecord, parseRecordInput, withTimestamps } from '../domain/schemas.js';
import { executeTarget } from '../executor/executor.js';
import { nodeRunner } from '../executor/runner.js';
import { RegistryLoader, lookup, lookupByRef } from '../registry/registry.js';
import { findReferences } from '../registry/integrity.js';
import { resolveContext } from '../resolver/resolve.js';
import { resolveOperation } from '../router/router.js';
import { SessionStore } from '../session/session.js';
import { parseYamlText, stringifyRecord } from '../storage/records.js';
import { deleteRecordFile, readRecordRaw, writeRecordFile } from '../storage/records.js';
import { ExperienceStore } from '../storage/experiences.js';
import { ensureLayout } from '../storage/atomic.js';
const require = createRequire(import.meta.url);
const packageJson = require('../../package.json');
export const VERSION = packageJson.version;
function notFoundCode(kind) {
    switch (kind) {
        case 'environment':
            return 'ENV_NOT_FOUND';
        case 'service':
            return 'SERVICE_NOT_FOUND';
        case 'deployment':
            return 'DEPLOYMENT_NOT_FOUND';
        case 'ruleProfile':
            return 'RULE_PROFILE_NOT_FOUND';
        case 'operationBinding':
            return 'BINDING_NOT_FOUND';
    }
}
function recordName(record) {
    const named = record;
    if (named.name)
        return named.name;
    return record.id;
}
function summaryOf(kind, record) {
    let summary;
    switch (kind) {
        case 'environment': {
            const env = record;
            const accounts = env.hosts.reduce((total, host) => total + (host.accounts?.length ?? 0), 0);
            summary = `${env.category} · ${env.hosts.length} hosts · ${accounts} accounts · ${env.loginRecords?.length ?? 0} logins`;
            break;
        }
        case 'service': {
            const service = record;
            summary = `${service.category} · ${service.deployModes.join(', ')}`;
            break;
        }
        case 'deployment': {
            const deployment = record;
            summary = `${deployment.environmentId}/${deployment.serviceId} · ${deployment.runtimeMode}`;
            break;
        }
        case 'ruleProfile': {
            const profile = record;
            summary = `${Object.keys(profile.variables ?? {}).length} variables · ${Object.keys(profile.paths ?? {}).length} paths`;
            break;
        }
        case 'operationBinding': {
            const binding = record;
            summary = `${binding.operation} → ${binding.skill?.name ?? `execute:${binding.execute?.mode ?? 'none'}`}`;
            break;
        }
    }
    return { kind, id: record.id, name: recordName(record), summary };
}
function errorDiagnostic(code, message, details) {
    return { code, severity: 'error', message, details };
}
export class App {
    options;
    loader;
    sessions;
    experiences;
    constructor(options) {
        this.options = options;
        this.loader = new RegistryLoader(options.dataDir);
        this.sessions = new SessionStore(options.dataDir);
        this.experiences = new ExperienceStore({ dataDir: options.dataDir, logger: options.logger });
    }
    get dataDir() {
        return this.options.dataDir;
    }
    async init() {
        await ensureLayout(this.options.dataDir);
    }
    async snapshot() {
        await this.init();
        return this.loader.load();
    }
    counts(snapshot) {
        return {
            environments: snapshot.environments.size,
            services: snapshot.services.size,
            deployments: snapshot.deployments.size,
            ruleProfiles: snapshot.ruleProfiles.size,
            operationBindings: snapshot.operationBindings.size,
        };
    }
    warnings(snapshot) {
        return snapshot.diagnostics
            .filter((item) => item.severity !== 'info')
            .slice(0, LIMITS.maxWarnings);
    }
    async meta() {
        const snapshot = await this.snapshot();
        return {
            dataDir: this.options.dataDir,
            version: VERSION,
            counts: this.counts(snapshot),
            warnings: this.warnings(snapshot),
        };
    }
    async list(kind) {
        const snapshot = await this.snapshot();
        const map = this.mapFor(snapshot, kind);
        const items = [...map.values()]
            .map((record) => summaryOf(kind, record))
            .sort((a, b) => a.id.localeCompare(b.id));
        return { items, warnings: this.warnings(snapshot) };
    }
    async get(kind, id) {
        const snapshot = await this.snapshot();
        const record = lookup(snapshot, kind, id);
        if (!record) {
            throw new EnvManagerError(notFoundCode(kind), `${kind} "${id}" was not found`, {
                kind,
                id,
            });
        }
        const raw = await readRecordRaw(this.options.dataDir, kind, id);
        if (!raw.found || !raw.text) {
            throw new EnvManagerError('INTERNAL_ERROR', `${kind} "${id}" disappeared during read`);
        }
        return { record, yaml: raw.text };
    }
    async find(query) {
        const snapshot = await this.snapshot();
        const needle = query.trim().toLowerCase();
        if (!needle)
            return { hits: [] };
        const hits = [];
        for (const kind of ['environment', 'service', 'deployment', 'ruleProfile', 'operationBinding']) {
            for (const record of this.mapFor(snapshot, kind).values()) {
                const named = record;
                let field = null;
                if (record.id.toLowerCase().includes(needle))
                    field = 'id';
                else if (named.name?.toLowerCase().includes(needle))
                    field = 'name';
                else if (named.aliases?.some((alias) => alias.toLowerCase().includes(needle))) {
                    field = 'alias';
                }
                else if (named.category?.toLowerCase().includes(needle))
                    field = 'category';
                if (field) {
                    hits.push({ kind, id: record.id, name: recordName(record), field });
                }
                if (hits.length >= 25)
                    break;
            }
        }
        hits.sort((a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id));
        return { hits };
    }
    async saveYaml(kind, yaml, options = {}) {
        const parsed = parseYamlText(yaml, `${kind}.yaml`);
        return this.save(kind, parsed, options);
    }
    async save(kind, raw, options = {}) {
        if (!isRecordKind(kind)) {
            throw new EnvManagerError('INVALID_ARGUMENT', `Unknown record kind "${kind}"`);
        }
        const parsed = parseRecordInput(kind, raw);
        if (!parsed.ok) {
            throw new EnvManagerError('RECORD_INVALID', 'Record failed validation', {
                issues: parsed.issues,
            });
        }
        const snapshot = await this.snapshot();
        let previous;
        try {
            const rawPrevious = await readRecordRaw(this.options.dataDir, kind, parsed.record.id);
            if (rawPrevious.found) {
                const prior = parseRecord(kind, rawPrevious.raw);
                if (prior.ok)
                    previous = { createdAt: prior.record.createdAt };
            }
        }
        catch {
            previous = undefined;
        }
        const finalized = withTimestamps(parsed.record, previous);
        const checked = parseRecord(kind, finalized);
        if (!checked.ok) {
            throw new EnvManagerError('RECORD_INVALID', 'Record failed validation', {
                issues: checked.issues,
            });
        }
        const record = checked.record;
        const created = !(await readRecordRaw(this.options.dataDir, kind, record.id)).found;
        if (created && this.mapFor(snapshot, kind).size >= this.options.maxRecords) {
            throw new EnvManagerError('RECORD_LIMIT_EXCEEDED', `The ${kind} registry is at its ${this.options.maxRecords}-record limit`, { kind, maxRecords: this.options.maxRecords });
        }
        if (options.actor === 'ui' && this.isProductionRecord(kind, record, snapshot)) {
            if (!this.options.writePolicy.allowUiProductionWrites) {
                throw new EnvManagerError('FORBIDDEN', 'The panel cannot write production records unless writePolicy.allowUiProductionWrites is true', { kind, id: record.id });
            }
        }
        const text = stringifyRecord(record);
        if (Buffer.byteLength(text, 'utf8') > LIMITS.recordBytes) {
            throw new EnvManagerError('RECORD_TOO_LARGE', `Record exceeds ${LIMITS.recordBytes} bytes`, { kind, id: record.id });
        }
        if (options.dryRun) {
            return {
                id: record.id,
                kind,
                created,
                dryRun: true,
                warnings: this.warnings(snapshot),
            };
        }
        try {
            await writeRecordFile(this.options.dataDir, kind, record);
        }
        catch (error) {
            if (error instanceof EnvManagerError)
                throw error;
            throw new EnvManagerError('STORAGE_UNWRITABLE', `Could not write ${kind} "${record.id}"`, {
                reason: error instanceof Error ? error.message : String(error),
            });
        }
        const reloaded = await this.snapshot();
        return {
            id: record.id,
            kind,
            created,
            dryRun: false,
            warnings: this.warnings(reloaded),
        };
    }
    async remove(kind, id, actor, options = {}) {
        const snapshot = await this.snapshot();
        const record = lookup(snapshot, kind, id);
        if (!record) {
            throw new EnvManagerError(notFoundCode(kind), `${kind} "${id}" was not found`, {
                kind,
                id,
            });
        }
        if (actor === 'ui' && this.isProductionRecord(kind, record, snapshot)) {
            if (!this.options.writePolicy.allowUiProductionWrites) {
                throw new EnvManagerError('FORBIDDEN', 'The panel cannot delete production records unless writePolicy.allowUiProductionWrites is true', { kind, id });
            }
        }
        const referrers = findReferences(snapshot, kind, id);
        const blockers = referrers.map((ref) => errorDiagnostic('RECORD_IN_USE', `${ref.kind} "${ref.id}" references ${kind} "${id}"`, {
            referrer: ref,
        }));
        if (options.dryRun) {
            return { id, kind, deleted: false, blockers };
        }
        if (blockers.length > 0) {
            throw new EnvManagerError('RECORD_IN_USE', `${kind} "${id}" is still referenced`, {
                kind,
                id,
                blockers,
            });
        }
        try {
            await deleteRecordFile(this.options.dataDir, kind, id);
        }
        catch (error) {
            throw new EnvManagerError('STORAGE_UNWRITABLE', `Could not delete ${kind} "${id}"`, {
                reason: error instanceof Error ? error.message : String(error),
            });
        }
        return { id, kind, deleted: true, blockers: [] };
    }
    async validate() {
        const snapshot = await this.snapshot();
        return {
            ok: !snapshot.diagnostics.some((item) => item.severity === 'error'),
            counts: this.counts(snapshot),
            diagnostics: snapshot.diagnostics,
        };
    }
    /**
     * Store one SSH/web credential in the DSH credential service and return only
     * its reference. Registry YAML must never contain the value itself. Refs are
     * restricted to the plugin's POSIX-style `DSH_ENV_MANAGER_*` namespace: the
     * DSH store rejects any other key shape at boot, so a bad ref here would
     * break the whole credentials document, not just this entry.
     */
    async setCredential(ref, value) {
        const cleanRef = String(ref || '').trim();
        if (!isCredentialRef(cleanRef) || !cleanRef.startsWith(PLUGIN_CREDENTIAL_PREFIX)) {
            throw new EnvManagerError('INVALID_ARGUMENT', 'Credential ref must be a POSIX-style DSH_ENV_MANAGER_<ENVIRONMENT>_<ACCOUNT> name (letters, digits and underscores only)');
        }
        if (typeof value !== 'string' || value.length === 0 || value.length > 8192) {
            throw new EnvManagerError('INVALID_ARGUMENT', 'Credential value must be between 1 and 8192 characters');
        }
        if (!this.options.credentials) {
            throw new EnvManagerError('CREDENTIAL_UNAVAILABLE', 'The DSH credential service is unavailable; the password was not stored');
        }
        try {
            await this.options.credentials.set(cleanRef, value);
        }
        catch {
            this.options.logger.warn(`Credential write failed for ${cleanRef}`);
            throw new EnvManagerError('CREDENTIAL_WRITE_FAILED', 'Could not store the credential in the DSH credential service');
        }
        return { ref: cleanRef, configured: true };
    }
    /** Remove a credential owned by this plugin; other namespaces are rejected. */
    async unsetCredential(ref) {
        const cleanRef = String(ref || '').trim();
        if (!isCredentialRef(cleanRef) || !cleanRef.startsWith(PLUGIN_CREDENTIAL_PREFIX)) {
            throw new EnvManagerError('INVALID_ARGUMENT', 'Credential ref must be a POSIX-style DSH_ENV_MANAGER_<ENVIRONMENT>_<ACCOUNT> name (letters, digits and underscores only)');
        }
        if (!this.options.credentials) {
            throw new EnvManagerError('CREDENTIAL_UNAVAILABLE', 'The DSH credential service is unavailable');
        }
        try {
            await this.options.credentials.unset(cleanRef);
        }
        catch {
            this.options.logger.warn(`Credential delete failed for ${cleanRef}`);
            throw new EnvManagerError('CREDENTIAL_WRITE_FAILED', 'Could not remove the credential from the DSH credential service');
        }
        return { ref: cleanRef, removed: true };
    }
    async resolve(request) {
        const snapshot = await this.snapshot();
        const service = lookupByRef(snapshot, 'service', request.serviceId);
        if (!service) {
            throw new EnvManagerError('SERVICE_NOT_FOUND', `Service "${request.serviceId}" was not found`, { serviceId: request.serviceId });
        }
        // Environment and deployment are optional refinement layers. With neither, the
        // context is service-level (service + global rule layers only). A deployment
        // supplies its own environment when the caller did not name one.
        let environment;
        if (request.environmentId) {
            environment = lookupByRef(snapshot, 'environment', request.environmentId);
            if (!environment) {
                throw new EnvManagerError('ENV_NOT_FOUND', `Environment "${request.environmentId}" was not found`, { environmentId: request.environmentId });
            }
        }
        let deployment;
        if (request.deploymentId) {
            deployment = lookup(snapshot, 'deployment', request.deploymentId);
            if (!deployment || deployment.serviceId !== service.id) {
                throw new EnvManagerError('DEPLOYMENT_NOT_FOUND', `Deployment "${request.deploymentId}" does not bind service "${service.id}"`, { deploymentId: request.deploymentId, serviceId: service.id });
            }
            if (environment && deployment.environmentId !== environment.id) {
                throw new EnvManagerError('DEPLOYMENT_NOT_FOUND', `Deployment "${request.deploymentId}" does not bind ${environment.id}/${service.id}`, { deploymentId: request.deploymentId, environmentId: environment.id, serviceId: service.id });
            }
            environment ??= lookupByRef(snapshot, 'environment', deployment.environmentId);
            if (!environment) {
                throw new EnvManagerError('ENV_NOT_FOUND', `Deployment "${request.deploymentId}" references missing environment "${deployment.environmentId}"`, { deploymentId: request.deploymentId, environmentId: deployment.environmentId });
            }
        }
        else if (environment) {
            deployment = this.selectDeployment(snapshot, environment.id, service.id);
        }
        const result = resolveContext({
            environment,
            service,
            deployment,
            ruleProfiles: snapshot.ruleProfiles,
        });
        if (!result.ok) {
            const first = result.diagnostics.find((item) => item.severity === 'error');
            throw new EnvManagerError(first?.code ?? 'INTERNAL_ERROR', first?.message ?? 'Context resolution failed', { diagnostics: result.diagnostics });
        }
        const credentials = environment
            ? await this.describeCredentials(environment.hosts, environment.clusters, environment.endpoints)
            : [];
        const context = result.context;
        const warnings = [];
        for (const credential of credentials) {
            if (!credential.configured) {
                warnings.push({
                    code: 'CREDENTIAL_MISSING',
                    severity: 'warning',
                    message: `Credential "${credential.ref}" is not configured`,
                    details: { ref: credential.ref },
                });
            }
        }
        context.credentials = credentials;
        context.diagnostics = [...context.diagnostics, ...warnings];
        return { context, warnings };
    }
    async route(request) {
        const snapshot = await this.snapshot();
        // Operations always run inside an environment: select one (explicit, session
        // default via the tools layer, or supplied by a deployment) before routing.
        // Routing never silently downgrades to service/global bindings without one.
        if (!request.environmentId && !request.deploymentId) {
            throw new EnvManagerError('INVALID_ARGUMENT', 'An environment is required to route an operation; pass environmentId/deploymentId or select one with env_set_context first');
        }
        let environment;
        if (request.environmentId) {
            environment = lookupByRef(snapshot, 'environment', request.environmentId);
            if (!environment) {
                throw new EnvManagerError('ENV_NOT_FOUND', `Environment "${request.environmentId}" was not found`, { environmentId: request.environmentId });
            }
        }
        let serviceId = request.serviceId;
        if (request.deploymentId) {
            const deployment = lookup(snapshot, 'deployment', request.deploymentId);
            if (!deployment) {
                throw new EnvManagerError('DEPLOYMENT_NOT_FOUND', `Deployment "${request.deploymentId}" was not found`, { deploymentId: request.deploymentId });
            }
            environment ??= lookupByRef(snapshot, 'environment', deployment.environmentId);
            if (!environment) {
                throw new EnvManagerError('ENV_NOT_FOUND', `Deployment "${request.deploymentId}" references missing environment "${deployment.environmentId}"`, { deploymentId: request.deploymentId, environmentId: deployment.environmentId });
            }
            serviceId ??= deployment.serviceId;
        }
        const environmentScoped = ENVIRONMENT_SCOPED_OPERATIONS.has(request.operation);
        let context;
        if (environmentScoped) {
            // Environment-scoped operations (e.g. deploy-environment, management plane) target
            // the environment itself; a service is optional and only refines the context.
            if (serviceId) {
                context = (await this.resolve({
                    environmentId: environment.id,
                    serviceId,
                    deploymentId: request.deploymentId,
                })).context;
            }
            else {
                if (!environment) {
                    throw new EnvManagerError('ENV_NOT_FOUND', `An environment is required to route "${request.operation}"`, { operation: request.operation });
                }
                context = {
                    environmentId: environment.id,
                    environmentName: environment.name,
                    environmentCategory: environment.category,
                    source: {},
                    variables: {},
                    paths: {},
                    ruleProfiles: [],
                    status: 'configured-not-verified',
                    credentials: [],
                    diagnostics: [],
                };
            }
        }
        else {
            if (!serviceId) {
                throw new EnvManagerError('SERVICE_NOT_FOUND', 'env_resolve_operation requires serviceId or a deploymentId that supplies one', { environmentId: request.environmentId, deploymentId: request.deploymentId });
            }
            context = (await this.resolve({
                environmentId: request.environmentId,
                serviceId,
                deploymentId: request.deploymentId,
            })).context;
        }
        const resolution = await resolveOperation({
            operation: request.operation,
            context,
            bindings: [...snapshot.operationBindings.values()],
            skills: this.options.skills,
            hosts: environment?.hosts,
        });
        if (!resolution.ok) {
            const first = resolution.diagnostics.find((item) => item.severity === 'error');
            throw new EnvManagerError(first?.code ?? 'INTERNAL_ERROR', first?.message ?? 'Operation resolution failed', { resolution });
        }
        resolution.experiences = await this.relevantExperiences(request.operation, context);
        return resolution;
    }
    /**
     * Execute a routed operation. Skill targets are prepared (the agent invokes the
     * Skill); script/command targets run a bounded local process; remote targets are
     * prepared as an ssh descriptor. Every completed execution writes an experience
     * into the review queue (success → summary, failure → lesson).
     */
    async operate(request) {
        const resolution = await this.route({
            operation: request.operation,
            environmentId: request.environmentId,
            serviceId: request.serviceId,
            deploymentId: request.deploymentId,
        });
        if (!resolution.ok || !resolution.target) {
            throw new EnvManagerError('EXECUTION_TARGET_INVALID', 'The routed binding has no executable target', { resolution });
        }
        if (request.dryRun) {
            return {
                resolution,
                execution: {
                    status: 'prepared',
                    durationMs: 0,
                    prepared: { kind: resolution.target.mode },
                    diagnostics: resolution.diagnostics,
                },
                warnings: resolution.diagnostics,
            };
        }
        const snapshot = await this.snapshot();
        const environment = resolution.requested.environmentId
            ? lookupByRef(snapshot, 'environment', resolution.requested.environmentId)
            : undefined;
        const input = {
            target: resolution.target,
            policy: resolution.policy,
            writeOperation: WRITE_OPERATIONS.has(request.operation),
            environmentCategory: environment?.category,
            confirm: request.confirm === true,
            dataDir: this.options.dataDir,
            signal: request.signal,
            runner: this.options.runner ?? nodeRunner,
            logger: this.options.logger,
        };
        const execution = await executeTarget(input);
        if (execution.status === 'completed' || execution.status === 'failed') {
            const id = await this.experiences.nextId();
            const record = this.buildExperience(id, request, resolution, execution);
            await this.experiences.write(record);
            return {
                resolution,
                execution,
                experience: this.experienceSummaryOf(record),
                warnings: execution.diagnostics,
            };
        }
        return { resolution, execution, warnings: execution.diagnostics };
    }
    async listExperiences(filter = {}) {
        const records = await this.experiences.list(filter);
        return { items: records.map((record) => this.experienceSummaryOf(record)), warnings: [] };
    }
    async reviewExperience(id, action, actor, note) {
        const record = await this.experiences.read(id);
        if (!record) {
            throw new EnvManagerError('EXPERIENCE_NOT_FOUND', `Experience "${id}" was not found`, { id });
        }
        const reviewed = {
            ...record,
            status: action === 'approve' ? 'accepted' : 'rejected',
            reviewedAt: new Date().toISOString(),
            reviewedBy: actor,
            ...(note ? { reviewNote: note.slice(0, 2000) } : {}),
        };
        await this.experiences.write(reviewed);
        return reviewed;
    }
    /**
     * Add a hand-written experience (e.g. a lesson from a Skill run the agent
     * observed, or an out-of-band deployment note). Always enters the review queue
     * as `proposed`; nothing auto-applies.
     */
    async addExperience(input) {
        const now = new Date().toISOString();
        const id = await this.experiences.nextId();
        const parsed = parseExperienceInput({
            id,
            schemaVersion: 1,
            createdAt: now,
            updatedAt: now,
            executedAt: now,
            status: 'proposed',
            tags: input.tags ?? [],
            evidenceRefs: input.evidenceRefs ?? [],
            ...input,
        });
        if (!parsed.ok) {
            throw new EnvManagerError('RECORD_INVALID', 'Experience failed validation', {
                issues: parsed.issues,
            });
        }
        const finalized = withTimestamps({ ...parsed.record, id }, undefined, now);
        await this.experiences.write(finalized);
        return finalized;
    }
    /** Experiences matching an operation+scope, newest first, failures ranked first. */
    async relevantExperiences(operation, context) {
        const limit = EXPERIENCE_LIMITS.relatedOnRoute;
        const records = await this.experiences.list({ limit: 100 });
        const preview = EXPERIENCE_LIMITS.contentPreview;
        return records
            .filter((record) => record.operation === operation &&
            (record.status === 'accepted' || record.status === 'proposed') &&
            (record.environmentId === undefined ||
                record.environmentId === context.environmentId) &&
            (record.serviceId === undefined ||
                record.serviceId === context.serviceId))
            .sort((a, b) => Number(b.kind === 'failure-lesson') - Number(a.kind === 'failure-lesson') ||
            b.executedAt.localeCompare(a.executedAt))
            .slice(0, limit)
            .map((record) => ({
            ...this.experienceSummaryOf(record),
            content: record.content.length > preview ? `${record.content.slice(0, preview)}…` : record.content,
        }));
    }
    buildExperience(id, request, resolution, execution) {
        const now = new Date();
        const mode = resolution.target?.mode ?? 'skill';
        const success = execution.status === 'completed';
        const scope = `${resolution.requested.environmentId ?? '(env)'}` +
            (resolution.requested.serviceId ? `/${resolution.requested.serviceId}` : '');
        const title = success
            ? `Succeeded ${request.operation} @ ${scope}`
            : `Failed ${request.operation} @ ${scope}`;
        const parts = [];
        parts.push(`[${mode}] ${request.operation} ${success ? 'completed' : 'failed'} on ${scope} in ${Math.round(execution.durationMs / 100) / 10}s`);
        if (!success && execution.exitCode !== undefined)
            parts.push(`exit code: ${execution.exitCode}`);
        if (execution.stdout)
            parts.push(`stdout:\n${execution.stdout.slice(0, 1200)}`);
        if (execution.stderr)
            parts.push(`stderr:\n${execution.stderr.slice(0, 1200)}`);
        if (request.note)
            parts.push(`note: ${request.note.slice(0, 1000)}`);
        const content = parts.join('\n').slice(0, 8000);
        return {
            id,
            schemaVersion: 1,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            operation: request.operation,
            bindingId: resolution.matchedBindingId,
            environmentId: resolution.requested.environmentId,
            serviceId: resolution.requested.serviceId,
            deploymentId: resolution.requested.deploymentId,
            mode,
            outcome: success ? 'success' : 'failure',
            kind: success ? 'success-summary' : 'failure-lesson',
            title: title.slice(0, 120),
            content,
            tags: [request.operation, mode],
            status: 'proposed',
            evidenceRefs: [],
            executedAt: now.toISOString(),
        };
    }
    experienceSummaryOf(record) {
        return {
            id: record.id,
            kind: record.kind,
            outcome: record.outcome,
            title: record.title,
            status: record.status,
            executedAt: record.executedAt,
            content: record.content,
        };
    }
    async getContext(sessionId) {
        const result = await this.sessions.get(sessionId);
        return result.context;
    }
    async setContext(sessionId, environmentId) {
        if (environmentId !== null) {
            const snapshot = await this.snapshot();
            if (!lookupByRef(snapshot, 'environment', environmentId)) {
                throw new EnvManagerError('ENV_NOT_FOUND', `Environment "${environmentId}" was not found`, { environmentId });
            }
        }
        const result = await this.sessions.set(sessionId, environmentId);
        return result.context;
    }
    async needsProductionApproval(kind, raw) {
        const parsed = parseRecordInput(kind, raw);
        if (!parsed.ok)
            return false;
        const snapshot = await this.snapshot();
        return this.isProductionRecord(kind, parsed.record, snapshot);
    }
    mapFor(snapshot, kind) {
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
        }
    }
    selectDeployment(snapshot, environmentId, serviceId) {
        const candidates = [...snapshot.deployments.values()].filter((deployment) => deployment.environmentId === environmentId && deployment.serviceId === serviceId);
        if (candidates.length === 0)
            return undefined;
        if (candidates.length > 1) {
            throw new EnvManagerError('DEPLOYMENT_AMBIGUOUS', `${environmentId}/${serviceId} has ${candidates.length} deployments; pass deploymentId`, { candidates: candidates.map((item) => item.id) });
        }
        return candidates[0];
    }
    isProductionRecord(kind, record, snapshot) {
        if (kind === 'environment') {
            return record.category === 'production';
        }
        if (kind === 'deployment') {
            const deployment = record;
            return snapshot.environments.get(deployment.environmentId)?.category === 'production';
        }
        if (kind === 'operationBinding') {
            const binding = record;
            if (binding.match.deploymentId) {
                const deployment = snapshot.deployments.get(binding.match.deploymentId);
                return deployment
                    ? snapshot.environments.get(deployment.environmentId)?.category === 'production'
                    : false;
            }
            if (binding.match.environmentId) {
                return snapshot.environments.get(binding.match.environmentId)?.category === 'production';
            }
        }
        return false;
    }
    async describeCredentials(hosts, clusters, endpoints) {
        const refs = new Set();
        for (const host of hosts)
            if (host.credentialRef)
                refs.add(host.credentialRef);
        for (const cluster of clusters)
            if (cluster.credentialRef)
                refs.add(cluster.credentialRef);
        for (const endpoint of endpoints)
            if (endpoint.credentialRef)
                refs.add(endpoint.credentialRef);
        const out = [];
        for (const ref of [...refs].sort()) {
            if (!this.options.credentials) {
                out.push({ ref, configured: false });
                continue;
            }
            try {
                const info = await this.options.credentials.describe(ref);
                out.push({ ref, configured: info.configured, source: info.source });
            }
            catch {
                out.push({ ref, configured: false });
            }
        }
        return out;
    }
}
//# sourceMappingURL=app.js.map