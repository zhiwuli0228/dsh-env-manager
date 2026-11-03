import { defineTool } from '@deepseek-ai/dsh-tools';
import { EnvManagerError, asEnvManagerError } from '../domain/errors.js';
import { ENVIRONMENT_SCOPED_OPERATIONS, RECORD_KINDS, isRecordKind } from '../domain/constants.js';
const kindProperty = {
    type: 'string',
    enum: RECORD_KINDS,
    description: 'Record kind.',
};
function text(value) {
    return [{ type: 'text', text: value }];
}
function diagnosticsSchema() {
    return {
        type: 'array',
        items: { type: 'json', description: 'Diagnostic with code, severity and message.' },
    };
}
function sessionOutputSchema() {
    return {
        type: 'object',
        additionalProperties: false,
        properties: {
            sessionId: { type: 'string', required: true, description: 'Calling session id.' },
            defaultEnvironmentId: {
                oneOf: [{ type: 'string' }, { type: 'null' }],
                required: true,
                description: 'Default environment, or null.',
            },
            persisted: { type: 'boolean', required: true, description: 'Whether the value is on disk.' },
        },
    };
}
function warningsSchema() {
    return diagnosticsSchema();
}
async function approval(ctx, exec, toolName, reason) {
    const agent = exec.agent;
    if (!agent) {
        throw new EnvManagerError('SESSION_CONTEXT_UNAVAILABLE', 'This operation requires a session-scoped agent');
    }
    const service = ctx.get('approval');
    if (!service) {
        throw new EnvManagerError('POLICY_DENIED', 'Approval service is unavailable; failing closed');
    }
    let outcome;
    try {
        outcome = await service.request({
            agent,
            toolName,
            callId: exec.callId,
            reason,
            displayReason: { en: reason, zh: reason },
            signal: exec.signal,
        });
    }
    catch (error) {
        throw new EnvManagerError('POLICY_DENIED', `Approval could not be requested: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (outcome !== 'allowed-once') {
        throw new EnvManagerError('POLICY_DENIED', `Approval ${outcome}`, { outcome });
    }
}
function sessionIdOf(exec) {
    const agent = exec.agent;
    if (!agent) {
        throw new EnvManagerError('SESSION_CONTEXT_UNAVAILABLE', 'This operation requires a session-scoped agent');
    }
    const id = agent.session?.header?.id ?? agent.id;
    if (!id) {
        throw new EnvManagerError('SESSION_CONTEXT_UNAVAILABLE', 'The calling agent has no session id');
    }
    return String(id);
}
function sessionValue(context) {
    return {
        sessionId: context.sessionId,
        defaultEnvironmentId: context.defaultEnvironmentId,
        persisted: context.persisted,
    };
}
export function createToolDefinitions(options) {
    const { ctx, app, defaults, writePolicy } = options;
    async function environmentIdFor(exec, explicit) {
        if (explicit)
            return explicit;
        const context = await app.getContext(sessionIdOf(exec));
        if (context.defaultEnvironmentId)
            return context.defaultEnvironmentId;
        if (defaults.environmentId)
            return defaults.environmentId;
        return undefined;
    }
    const envList = defineTool({
        name: 'env_list',
        description: 'Use when the caller needs an inventory or wants to discover record ids before a specific call.',
        parameters: {
            kind: {
                type: 'string',
                enum: RECORD_KINDS,
                description: 'Limit the list to one record kind.',
            },
            query: {
                type: 'string',
                description: 'Case-insensitive filter over id and name.',
            },
        },
        output: {
            schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    items: { type: 'array', items: { type: 'json' }, required: true },
                    warnings: { ...diagnosticsSchema(), required: true },
                },
            },
            render: (_args, value) => {
                const items = value.items;
                return text(`${items.length} record(s): ${items.slice(0, 8).map((item) => `${item.kind}/${item.id}`).join(', ')}${items.length > 8 ? ', …' : ''}`);
            },
        },
        async execute(args) {
            try {
                const kinds = args.kind ? [args.kind] : [...RECORD_KINDS];
                const items = [];
                const warnings = [];
                for (const kind of kinds) {
                    const result = await app.list(kind);
                    const needle = args.query ? String(args.query).toLowerCase() : '';
                    items.push(...result.items.filter((item) => !needle || item.id.toLowerCase().includes(needle) || item.name.toLowerCase().includes(needle)));
                    warnings.push(...result.warnings);
                }
                items.sort((a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id));
                return { items, warnings: warnings.slice(0, 20) };
            }
            catch (error) {
                throw asEnvManagerError(error);
            }
        },
    });
    const envGet = defineTool({
        name: 'env_get',
        description: 'Use when the caller already has an id and needs the full record and its YAML.',
        parameters: {
            kind: { ...kindProperty, required: true },
            id: { type: 'string', required: true, description: 'Record id, e.g. test-a.' },
        },
        output: {
            schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    record: { type: 'json', required: true },
                    yaml: { type: 'string', required: true },
                },
            },
            render: (_args, value) => {
                const result = value;
                return text(`Record ${result.record.id}: ${result.yaml.length} bytes of YAML.`);
            },
        },
        async execute(args) {
            try {
                return await app.get(args.kind, args.id);
            }
            catch (error) {
                throw asEnvManagerError(error);
            }
        },
    });
    const envFind = defineTool({
        name: 'env_find',
        description: 'Use when the caller has a name or fragment and wants candidate ids; prefer this over guessing an id.',
        parameters: {
            query: { type: 'string', required: true, description: 'Name, id or fragment.' },
        },
        output: {
            schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    hits: { type: 'array', items: { type: 'json' }, required: true },
                },
            },
            render: (_args, value) => {
                const hits = value.hits;
                return text(hits.length ? `${hits.length} match(es): ${hits.map((hit) => `${hit.kind}/${hit.id}`).join(', ')}` : 'No matches.');
            },
        },
        async execute(args) {
            try {
                return await app.find(args.query);
            }
            catch (error) {
                throw asEnvManagerError(error);
            }
        },
    });
    const envResolve = defineTool({
        name: 'env_resolve',
        description: 'Use when the caller needs concrete paths, log sources, class locations or variables for a service. This is the authoritative answer; never reconstruct paths from templates. An environment is optional: without one the result is the service-level context (service and global rule layers only).',
        parameters: {
            environmentId: {
                type: 'string',
                description: 'Optional; defaults to the session environment. Omit to resolve the service-level context.',
            },
            serviceId: { type: 'string', required: true, description: 'Service id or alias.' },
            deploymentId: { type: 'string', description: 'Optional; selects one deployment and its environment.' },
        },
        output: {
            schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    context: { type: 'json', required: true },
                    warnings: { ...warningsSchema(), required: true },
                },
            },
            render: (_args, value) => {
                const result = value;
                const scope = result.context.environmentId ? ` in ${result.context.environmentId}` : '';
                const mode = result.context.runtimeMode ? ` (${result.context.runtimeMode})` : '';
                return text(`Resolved ${result.context.serviceId}${scope}${mode}: ${Object.keys(result.context.paths).length} paths, ${Object.keys(result.context.variables).length} variables, ${result.warnings.length} warning(s).`);
            },
        },
        async execute(args, exec) {
            try {
                const environmentId = await environmentIdFor(exec, args.environmentId);
                const resolved = await app.resolve({
                    environmentId,
                    serviceId: args.serviceId,
                    deploymentId: args.deploymentId,
                });
                return { context: resolved.context, warnings: resolved.warnings };
            }
            catch (error) {
                throw asEnvManagerError(error);
            }
        },
    });
    const envResolveOperation = defineTool({
        name: 'env_resolve_operation',
        description: 'Use before acting: ask which Skill handles an operation for this context and what parameters it expects. This tool does not execute the Skill. Operations always run inside an environment: select one first (env_set_context or environmentId); without an environment routing fails instead of downgrading to a lower binding.',
        parameters: {
            operation: { type: 'string', required: true, description: 'Standard or custom operation id.' },
            environmentId: {
                type: 'string',
                description: 'Defaults to the session environment; required unless deploymentId supplies one.',
            },
            serviceId: { type: 'string', description: 'Service id; required unless the operation is environment-scoped (e.g. deploy-environment) or deploymentId supplies one.' },
            deploymentId: { type: 'string', description: 'Deployment id; supplies the service and environment when omitted.' },
        },
        output: {
            schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    resolution: { type: 'json', required: true },
                },
            },
            render: (_args, value) => {
                const resolution = value.resolution;
                return text(`${resolution.operation}: binding ${resolution.matchedBindingId ?? 'none'}, skill ${resolution.skill?.name ?? 'none'} (available: ${String(resolution.skill?.available)}).`);
            },
        },
        async execute(args, exec) {
            try {
                const environmentScoped = ENVIRONMENT_SCOPED_OPERATIONS.has(args.operation);
                if (!args.serviceId && !args.deploymentId && !environmentScoped) {
                    throw new EnvManagerError('INVALID_ARGUMENT', 'Pass serviceId or deploymentId so the operation can be bound to a service');
                }
                const environmentId = await environmentIdFor(exec, args.environmentId);
                const resolution = await app.route({
                    operation: args.operation,
                    environmentId,
                    serviceId: args.serviceId,
                    deploymentId: args.deploymentId,
                });
                return { resolution };
            }
            catch (error) {
                throw asEnvManagerError(error);
            }
        },
    });
    const envGetContext = defineTool({
        name: 'env_get_context',
        description: 'Use to check what environment the current session defaults to.',
        parameters: {},
        output: {
            schema: sessionOutputSchema(),
            render: (_args, value) => {
                const context = value;
                return text(context.defaultEnvironmentId
                    ? `Session default: ${context.defaultEnvironmentId}.`
                    : 'Session default: none.');
            },
        },
        async execute(_args, exec) {
            try {
                const context = await app.getContext(sessionIdOf(exec));
                return sessionValue(context);
            }
            catch (error) {
                throw asEnvManagerError(error);
            }
        },
    });
    const envSetContext = defineTool({
        name: 'env_set_context',
        description: 'Use when the user says to work on an environment and later calls should omit environmentId. Passing null clears the default.',
        parameters: {
            environmentId: {
                oneOf: [{ type: 'string' }, { type: 'null' }],
                required: true,
                description: 'Environment id, or null to clear.',
            },
        },
        output: {
            schema: sessionOutputSchema(),
            render: (_args, value) => {
                const context = value;
                return text(context.defaultEnvironmentId
                    ? `Session default set to ${context.defaultEnvironmentId}.`
                    : 'Session default cleared.');
            },
        },
        async execute(args, exec) {
            try {
                const sessionId = sessionIdOf(exec);
                const context = await app.setContext(sessionId, args.environmentId);
                return sessionValue(context);
            }
            catch (error) {
                throw asEnvManagerError(error);
            }
        },
    });
    const envSave = defineTool({
        name: 'env_save',
        description: 'Use to create or replace a record. Prefer env_get first, edit the YAML, then save the whole record; never send a partial patch.',
        parameters: {
            kind: { ...kindProperty, required: true },
            record: { type: 'json', required: true, description: 'Complete record object.' },
            dryRun: { type: 'boolean', description: 'Validate without writing.' },
        },
        output: {
            schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    id: { type: 'string', required: true },
                    kind: { type: 'string', required: true },
                    created: { type: 'boolean', required: true },
                    dryRun: { type: 'boolean', required: true },
                    warnings: { ...warningsSchema(), required: true },
                },
            },
            render: (_args, value) => {
                const result = value;
                return text(`${result.dryRun ? 'Validated' : result.created ? 'Created' : 'Updated'} ${result.kind} ${result.id}.`);
            },
        },
        async execute(args, exec) {
            try {
                if (!isRecordKind(args.kind)) {
                    throw new EnvManagerError('INVALID_ARGUMENT', `Unknown record kind "${args.kind}"`);
                }
                if (writePolicy.requireApprovalForProductionSave &&
                    (await app.needsProductionApproval(args.kind, args.record))) {
                    await approval(ctx, exec, 'env_save', `Write production record ${args.record?.id ?? '(new)'}`);
                }
                return await app.save(args.kind, args.record, {
                    dryRun: Boolean(args.dryRun),
                    actor: 'agent',
                });
            }
            catch (error) {
                throw asEnvManagerError(error);
            }
        },
    });
    const envDelete = defineTool({
        name: 'env_delete',
        description: 'Use only when the user explicitly asks to remove a record.',
        parameters: {
            kind: { ...kindProperty, required: true },
            id: { type: 'string', required: true, description: 'Record id.' },
            confirm: {
                type: 'boolean',
                required: true,
                description: 'true deletes after approval; false only reports blockers.',
            },
        },
        output: {
            schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    id: { type: 'string', required: true },
                    kind: { type: 'string', required: true },
                    deleted: { type: 'boolean', required: true },
                    blockers: { ...diagnosticsSchema(), required: true },
                },
            },
            render: (_args, value) => {
                const result = value;
                return text(result.deleted
                    ? `Deleted ${result.kind} ${result.id} (backup kept).`
                    : `${result.kind} ${result.id} not deleted; ${result.blockers.length} blocker(s).`);
            },
        },
        async execute(args, exec) {
            try {
                if (!args.confirm) {
                    return await app.remove(args.kind, args.id, 'agent', { dryRun: true });
                }
                if (writePolicy.requireApprovalForDelete) {
                    await approval(ctx, exec, 'env_delete', `Delete ${args.kind} ${args.id}`);
                }
                return await app.remove(args.kind, args.id, 'agent');
            }
            catch (error) {
                throw asEnvManagerError(error);
            }
        },
    });
    const envValidate = defineTool({
        name: 'env_validate',
        description: 'Use after hand-editing YAML or before trusting a resolve result.',
        parameters: {},
        output: {
            schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    ok: { type: 'boolean', required: true },
                    counts: { type: 'json', required: true },
                    diagnostics: { ...diagnosticsSchema(), required: true },
                },
            },
            render: (_args, value) => {
                const report = value;
                return text(report.ok
                    ? `Registry valid; ${report.diagnostics.length} diagnostic(s).`
                    : `Registry invalid; ${report.diagnostics.length} diagnostic(s).`);
            },
        },
        async execute() {
            try {
                const report = await app.validate();
                return {
                    ok: report.ok,
                    counts: {
                        environment: report.counts.environments ?? 0,
                        service: report.counts.services ?? 0,
                        deployment: report.counts.deployments ?? 0,
                        ruleProfile: report.counts.ruleProfiles ?? 0,
                        operationBinding: report.counts.operationBindings ?? 0,
                    },
                    diagnostics: report.diagnostics,
                };
            }
            catch (error) {
                throw asEnvManagerError(error);
            }
        },
    });
    return [
        envList,
        envGet,
        envFind,
        envResolve,
        envResolveOperation,
        envGetContext,
        envSetContext,
        envSave,
        envDelete,
        envValidate,
    ];
}
//# sourceMappingURL=tools.js.map