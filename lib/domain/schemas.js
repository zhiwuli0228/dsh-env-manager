import { z } from 'zod';
import { ID_PATTERN, PARAMETER_KEY_PATTERN, SCHEMA_VERSION, WRITE_OPERATIONS } from './constants.js';
const idSchema = z.string().regex(ID_PATTERN, 'Must match ^[a-z0-9][a-z0-9-]{0,62}$');
const runtimeModeSchema = z.enum(['native', 'docker', 'kubernetes']);
const hostKindSchema = z.enum(['vm', 'physical', 'k8s-all-in-one', 'k8s-worker', 'pod-host']);
const hostAccessSchema = z.enum(['ssh', 'kubectl', 'docker']);
const clusterTopologySchema = z.enum(['all-in-one', 'separate', 'external']);
const timestampSchema = z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Must be an ISO-8601 timestamp');
const scalarSchema = z.union([z.string(), z.number(), z.boolean()]);
const loginProtocolSchema = z.enum(['ssh', 'rdp', 'web', 'k8s-api', 'docker', 'custom']);
const loginAuthTypeSchema = z.enum(['password', 'private-key', 'agent', 'token', 'other']);
const webLoginUrlSchema = z
    .string()
    .url()
    .refine((value) => /^https?:\/\//i.test(value), 'Must be an http(s) URL');
function hostAccountSchema(mode) {
    return o({
        id: z.string().min(1),
        username: z.string().min(1),
        purpose: z.string().optional(),
        protocol: loginProtocolSchema.optional(),
        loginUrl: webLoginUrlSchema.optional(),
        port: z.number().int().min(1).max(65535).optional(),
        authType: loginAuthTypeSchema.optional(),
        credentialRef: z.string().min(1).optional(),
        lastLoginAt: timestampSchema.optional(),
        lastLoginFrom: z.string().optional(),
        note: z.string().optional(),
    }, mode);
}
function loginRecordSchema(mode) {
    return o({
        id: z.string().min(1),
        at: timestampSchema,
        username: z.string().min(1),
        hostRef: z.string().min(1).optional(),
        accountId: z.string().min(1).optional(),
        protocol: loginProtocolSchema.optional(),
        sourceIp: z.string().optional(),
        result: z.enum(['success', 'failure']),
        note: z.string().optional(),
    }, mode);
}
function o(shape, mode) {
    return mode === 'read' ? z.looseObject(shape) : z.strictObject(shape);
}
function metaShape(input) {
    return {
        id: idSchema,
        schemaVersion: z.literal(SCHEMA_VERSION),
        createdAt: input ? timestampSchema.optional() : timestampSchema,
        updatedAt: input ? timestampSchema.optional() : timestampSchema,
    };
}
function logSourceSchema(mode) {
    return z.discriminatedUnion('kind', [
        o({ kind: z.literal('file'), path: z.string().min(1) }, mode),
        o({ kind: z.literal('container-stdout'), container: z.string().min(1) }, mode),
        o({
            kind: z.literal('pod-logs'),
            namespace: z.string().min(1),
            workload: z.string().min(1),
        }, mode),
    ]);
}
function classLocationSchema(mode) {
    return o({
        kind: z.enum(['build-output', 'deployed-dir', 'jar-entry']),
        path: z.string().min(1),
        entryPrefix: z.string().optional(),
    }, mode);
}
function ruleOverrideSchema(mode) {
    return o({
        variables: z.record(z.string().min(1), scalarSchema).optional(),
        paths: z.record(z.string().min(1), z.string()).optional(),
        logSources: z
            .object({
            native: logSourceSchema(mode).optional(),
            docker: logSourceSchema(mode).optional(),
            kubernetes: logSourceSchema(mode).optional(),
        })
            .optional(),
        classLocations: z
            .object({
            native: classLocationSchema(mode).optional(),
            docker: classLocationSchema(mode).optional(),
            kubernetes: classLocationSchema(mode).optional(),
        })
            .optional(),
    }, mode);
}
function environmentFields(mode) {
    return {
        name: z.string().min(1),
        aliases: z.array(z.string().min(1)).default([]),
        category: z.enum(['dev', 'test', 'staging', 'production', 'custom']),
        description: z.string().optional(),
        roles: z
            .array(o({
            id: z.string().min(1),
            name: z.string().min(1),
            description: z.string().optional(),
        }, mode))
            .min(1, 'At least one logical role is required'),
        hosts: z
            .array(o({
            id: z.string().min(1),
            name: z.string().min(1),
            kind: hostKindSchema.default('vm'),
            os: z.string().optional(),
            platform: z.string().optional(),
            ip: z.string().optional(),
            publicIp: z.string().optional(),
            sshPort: z.number().int().min(1).max(65535).optional(),
            roles: z.array(z.string().min(1)).min(1, 'At least one host role is required'),
            access: z.array(hostAccessSchema).max(3).optional(),
            clusterRef: z.string().min(1).optional(),
            adminUser: z.string().optional(),
            isActive: z.boolean().optional(),
            credentialRef: z.string().min(1).optional(),
            accounts: z.array(hostAccountSchema(mode)).max(50).optional(),
            note: z.string().optional(),
        }, mode))
            .default([]),
        clusters: z
            .array(o({
            id: z.string().min(1),
            name: z.string().min(1),
            kind: z.enum(['kubernetes', 'docker']),
            topology: clusterTopologySchema.optional(),
            apiEndpoint: z.string().optional(),
            namespaces: z.array(z.string().min(1)).optional(),
            credentialRef: z.string().min(1).optional(),
            note: z.string().optional(),
        }, mode))
            .default([]),
        endpoints: z
            .array(o({
            id: z.string().min(1),
            kind: z.enum(['ssh', 'web', 'k8s-api', 'docker', 'custom']),
            hostRef: z.string().min(1).optional(),
            clusterRef: z.string().min(1).optional(),
            url: z.string().optional(),
            port: z.number().int().min(1).max(65535).optional(),
            credentialRef: z.string().min(1).optional(),
            note: z.string().optional(),
        }, mode))
            .default([]),
        loginRecords: z.array(loginRecordSchema(mode)).max(200).optional(),
        ruleOverrides: ruleOverrideSchema(mode).optional(),
    };
}
function serviceFields(mode) {
    return {
        name: z.string().min(1),
        aliases: z.array(z.string().min(1)).default([]),
        category: z.string().min(1),
        description: z.string().optional(),
        git: o({
            url: z.string().min(1),
            defaultBranch: z.string().min(1).default('main'),
            modulePath: z.string().optional(),
        }, mode),
        build: o({
            tool: z.enum(['maven', 'gradle', 'npm', 'custom']),
            command: z.string().optional(),
        }, mode).optional(),
        artifact: o({
            name: z.string().min(1),
            path: z.string().optional(),
        }, mode).optional(),
        deployModes: z.array(runtimeModeSchema).min(1),
        ruleProfileRefs: z.array(z.string().min(1)).default([]),
    };
}
function deploymentFields(mode) {
    const native = o({
        kind: z.literal('native'),
        hostRef: z.string().min(1),
        installDir: z.string().optional(),
        serviceName: z.string().optional(),
        processMatch: z.string().optional(),
    }, mode);
    const docker = o({
        kind: z.literal('docker'),
        hostRef: z.string().min(1),
        containerName: z.string().optional(),
        image: z.string().optional(),
        volumes: z.array(z.string()).optional(),
    }, mode);
    const kubernetes = o({
        kind: z.literal('kubernetes'),
        clusterRef: z.string().min(1),
        namespace: z.string().min(1),
        workload: o({
            kind: z.enum(['Deployment', 'StatefulSet', 'DaemonSet', 'CronJob', 'Pod']),
            name: z.string().min(1),
        }, mode),
        container: z.string().optional(),
    }, mode);
    return {
        name: z.string().optional(),
        environmentId: z.string().min(1),
        serviceId: z.string().min(1),
        runtimeMode: runtimeModeSchema,
        location: z.discriminatedUnion('kind', [native, docker, kubernetes]),
        variables: z.record(z.string().min(1), scalarSchema).optional(),
        ruleOverrides: ruleOverrideSchema(mode).optional(),
    };
}
function ruleProfileFields(mode) {
    return {
        name: z.string().optional(),
        description: z.string().optional(),
        variables: z.record(z.string().min(1), scalarSchema).optional(),
        paths: z.record(z.string().min(1), z.string()).optional(),
        logSources: z
            .object({
            native: logSourceSchema(mode).optional(),
            docker: logSourceSchema(mode).optional(),
            kubernetes: logSourceSchema(mode).optional(),
        })
            .optional(),
        classLocations: z
            .object({
            native: classLocationSchema(mode).optional(),
            docker: classLocationSchema(mode).optional(),
            kubernetes: classLocationSchema(mode).optional(),
        })
            .optional(),
    };
}
function operationBindingFields(mode) {
    return {
        operation: z.string().min(1),
        match: o({
            environmentId: z.string().min(1).optional(),
            serviceId: z.string().min(1).optional(),
            deploymentId: z.string().min(1).optional(),
            deploymentMode: runtimeModeSchema.optional(),
            serviceCategory: z.string().min(1).optional(),
        }, mode),
        skill: o({
            name: z.string().min(1),
            expectedSource: z.string().min(1).nullable().optional(),
            expectedProvider: z.string().min(1).nullable().optional(),
        }, mode),
        parameters: z.record(z.string().regex(PARAMETER_KEY_PATTERN), scalarSchema).optional(),
        policy: o({
            requiresApproval: z.boolean().default(true),
            allowProduction: z.boolean().default(false),
        }, mode),
        enabled: z.boolean().default(true),
    };
}
function fieldsOf(kind, mode) {
    switch (kind) {
        case 'environment':
            return environmentFields(mode);
        case 'service':
            return serviceFields(mode);
        case 'deployment':
            return deploymentFields(mode);
        case 'ruleProfile':
            return ruleProfileFields(mode);
        case 'operationBinding':
            return operationBindingFields(mode);
    }
}
export function matchShape(match) {
    const keys = Object.keys(match).filter((key) => match[key] !== undefined);
    const has = (key) => keys.includes(key);
    if (has('deploymentId')) {
        const allowed = new Set(['deploymentId', 'environmentId', 'serviceId']);
        return keys.every((key) => allowed.has(key)) ? 'deployment' : null;
    }
    if (has('environmentId') && has('serviceId')) {
        const allowed = new Set(['environmentId', 'serviceId']);
        return keys.every((key) => allowed.has(key)) ? 'environment-service' : null;
    }
    // Environment-scoped operations (e.g. deploy-environment) target the whole
    // environment, not one service.
    if (has('environmentId')) {
        return keys.length === 1 ? 'environment' : null;
    }
    if (has('serviceId')) {
        return keys.length === 1 ? 'service' : null;
    }
    if (has('serviceCategory') && has('deploymentMode')) {
        return keys.length === 2 ? 'category-mode' : null;
    }
    if (keys.length === 0)
        return 'global';
    return null;
}
function crossCheck(kind, value, ctx) {
    const add = (path, message) => ctx.addIssue({ code: 'custom', message, path: path ? path.split('.') : [] });
    const unique = (items, label, path) => {
        const seen = new Set();
        for (const [index, item] of items.entries()) {
            if (seen.has(item.id))
                add(`${path}[${index}].id`, `Duplicate ${label} id "${item.id}"`);
            seen.add(item.id);
        }
    };
    if (kind === 'environment') {
        const env = value;
        unique(env.roles ?? [], 'role', 'roles');
        unique(env.hosts ?? [], 'host', 'hosts');
        unique(env.clusters ?? [], 'cluster', 'clusters');
        unique(env.endpoints ?? [], 'endpoint', 'endpoints');
        const roleIds = new Set((env.roles ?? []).map((role) => role.id));
        const clusterIds = new Set((env.clusters ?? []).map((cluster) => cluster.id));
        const k8sNodeKinds = new Set(['k8s-all-in-one', 'k8s-worker']);
        for (const [index, host] of (env.hosts ?? []).entries()) {
            for (const role of host.roles) {
                if (!roleIds.has(role))
                    add(`hosts[${index}].roles`, `Unknown role "${role}"`);
            }
            if (k8sNodeKinds.has(host.kind || 'vm') && !host.clusterRef) {
                add(`hosts[${index}].clusterRef`, 'K8s nodes must reference a cluster');
            }
            if (host.clusterRef && !clusterIds.has(host.clusterRef)) {
                add(`hosts[${index}].clusterRef`, `Unknown cluster "${host.clusterRef}"`);
            }
            if (host.access && new Set(host.access).size !== host.access.length) {
                add(`hosts[${index}].access`, 'Duplicate host access method');
            }
        }
        const seenIps = new Set();
        for (const [index, host] of (env.hosts ?? []).entries()) {
            if (!host.ip)
                continue;
            if (seenIps.has(host.ip))
                add(`hosts[${index}].ip`, `Duplicate host ip "${host.ip}"`);
            seenIps.add(host.ip);
        }
        const hostIds = new Set((env.hosts ?? []).map((host) => host.id));
        for (const [index, endpoint] of (env.endpoints ?? []).entries()) {
            if (endpoint.hostRef && !hostIds.has(endpoint.hostRef)) {
                add(`endpoints[${index}].hostRef`, `Unknown host "${endpoint.hostRef}"`);
            }
            if (endpoint.clusterRef && !clusterIds.has(endpoint.clusterRef)) {
                add(`endpoints[${index}].clusterRef`, `Unknown cluster "${endpoint.clusterRef}"`);
            }
        }
    }
    if (kind === 'deployment') {
        const deployment = value;
        if (deployment.runtimeMode !== deployment.location.kind) {
            add('location.kind', 'location.kind must equal runtimeMode');
        }
    }
    if (kind === 'operationBinding') {
        const binding = value;
        if (matchShape(binding.match) === null) {
            add('match', 'match must be one of: deployment, environment-service, service, category-mode, global');
        }
        if (binding.parameters && Object.keys(binding.parameters).length > 50) {
            add('parameters', 'At most 50 parameters are allowed');
        }
    }
}
const cache = new Map();
function schemaFor(kind, mode, input) {
    const key = `${kind}:${mode}:${input ? 'input' : 'record'}`;
    const cached = cache.get(key);
    if (cached)
        return cached;
    const schema = o({ ...metaShape(input), ...fieldsOf(kind, mode) }, mode).superRefine((value, ctx) => crossCheck(kind, value, ctx));
    cache.set(key, schema);
    return schema;
}
function issuesFrom(error) {
    return error.issues.slice(0, 50).map((issue) => ({
        path: issue.path.map(String).join('.'),
        message: issue.message,
    }));
}
export function normalizeRecordInput(kind, raw) {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw))
        return raw;
    const value = { ...raw };
    switch (kind) {
        case 'environment': {
            value.aliases ??= [];
            value.roles ??= [];
            value.hosts ??= [];
            value.clusters ??= [];
            value.endpoints ??= [];
            break;
        }
        case 'service': {
            value.aliases ??= [];
            value.ruleProfileRefs ??= [];
            break;
        }
        case 'ruleProfile':
            break;
        case 'deployment':
            break;
        case 'operationBinding': {
            value.enabled ??= true;
            const existing = (value.policy ?? {});
            const operation = typeof value.operation === 'string' ? value.operation : '';
            value.policy = {
                requiresApproval: existing.requiresApproval ?? WRITE_OPERATIONS.has(operation),
                allowProduction: existing.allowProduction ?? false,
            };
            break;
        }
    }
    return value;
}
export function parseRecordInput(kind, raw) {
    const result = schemaFor(kind, 'write', true).safeParse(normalizeRecordInput(kind, raw));
    if (!result.success)
        return { ok: false, issues: issuesFrom(result.error) };
    return { ok: true, record: result.data };
}
export function parseRecord(kind, raw) {
    const result = schemaFor(kind, 'write', false).safeParse(raw);
    if (!result.success)
        return { ok: false, issues: issuesFrom(result.error) };
    return { ok: true, record: result.data };
}
export function parseRecordLoose(kind, raw) {
    const result = schemaFor(kind, 'read', false).safeParse(raw);
    if (!result.success)
        return { ok: false, issues: issuesFrom(result.error) };
    return { ok: true, record: result.data };
}
export function withTimestamps(record, previous, now = new Date().toISOString()) {
    return {
        ...record,
        createdAt: previous?.createdAt ?? record.createdAt ?? now,
        updatedAt: now,
    };
}
/** Top-level unknown keys, used for read-side `UNKNOWN_FIELD` warnings. */
export function unknownTopLevelKeys(kind, raw) {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw))
        return [];
    const allowed = new Set(Object.keys({ ...metaShape(false), ...fieldsOf(kind, 'read') }));
    return Object.keys(raw).filter((key) => !allowed.has(key));
}
//# sourceMappingURL=schemas.js.map