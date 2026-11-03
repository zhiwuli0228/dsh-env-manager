import { EnvManagerError } from '../domain/errors.js';
import { parseTemplate, refsOf, templateIsSingleRef } from './template.js';
import { buildLayers, mergeLayers } from './merge.js';
const ERROR_CODES = new Set([
    'RULE_TEMPLATE_INVALID',
    'RULE_UNDEFINED_VARIABLE',
    'RULE_CYCLE',
    'RULE_PATH_TRAVERSAL',
]);
function flattenConstants(value, prefix, out) {
    if (value === undefined || value === null || Array.isArray(value))
        return;
    if (typeof value === 'object') {
        for (const [key, child] of Object.entries(value)) {
            flattenConstants(child, `${prefix}.${key}`, out);
        }
        return;
    }
    out.set(prefix, String(value));
}
function buildConstants(environment, service, deployment) {
    const constants = new Map();
    if (environment) {
        constants.set('env.id', environment.id);
        constants.set('env.name', environment.name);
        constants.set('env.category', environment.category);
    }
    constants.set('service.id', service.id);
    constants.set('service.name', service.name);
    constants.set('service.category', service.category);
    if (service.artifact) {
        constants.set('service.artifact.name', service.artifact.name);
        if (service.artifact.path)
            constants.set('service.artifact.path', service.artifact.path);
    }
    if (deployment) {
        constants.set('deployment.id', deployment.id);
        if (deployment.name)
            constants.set('deployment.name', deployment.name);
        constants.set('deployment.runtimeMode', deployment.runtimeMode);
        flattenConstants(deployment.location, 'deployment.location', constants);
    }
    return constants;
}
function errorDiagnostic(error, path) {
    if (error instanceof EnvManagerError) {
        return {
            code: error.code,
            severity: 'error',
            message: error.message,
            path,
            details: error.details,
        };
    }
    return {
        code: 'INTERNAL_ERROR',
        severity: 'error',
        message: error instanceof Error ? error.message : String(error),
        path,
    };
}
export function resolveContext(input) {
    const { environment, service, deployment, ruleProfiles } = input;
    const diagnostics = [];
    const activeDeployment = deployment;
    const { layers, missingProfiles } = buildLayers(service, environment, activeDeployment, ruleProfiles);
    for (const ref of missingProfiles) {
        diagnostics.push({
            code: 'RULE_PROFILE_NOT_FOUND',
            severity: 'error',
            message: `Service ${service.id} references missing rule profile ${ref}`,
            path: 'ruleProfileRefs',
        });
    }
    const { fields } = mergeLayers(layers);
    const constants = buildConstants(environment, service, activeDeployment);
    const partsCache = new Map();
    const resolved = new Map();
    const state = new Map();
    const stack = [];
    function partsFor(field) {
        const cached = partsCache.get(field.key);
        if (cached)
            return cached;
        const parts = parseTemplate(String(field.raw), field.key);
        partsCache.set(field.key, parts);
        return parts;
    }
    function fieldKeyFor(ref) {
        if (fields.has(ref))
            return ref;
        if (!ref.includes('.') && fields.has(`variables.${ref}`))
            return `variables.${ref}`;
        return undefined;
    }
    function resolveRef(name) {
        const constant = constants.get(name);
        if (constant !== undefined)
            return { value: constant };
        const key = fieldKeyFor(name);
        if (!key) {
            throw new EnvManagerError('RULE_UNDEFINED_VARIABLE', `Undefined variable "\${${name}}"`, {
                ref: name,
            });
        }
        const resolvedValue = resolveField(key);
        return { value: resolvedValue.value, source: resolvedValue.definedBy };
    }
    function resolveField(key) {
        const cached = resolved.get(key);
        if (cached)
            return cached;
        if (state.get(key) === 'visiting') {
            const start = stack.indexOf(key);
            const cycle = [...stack.slice(start === -1 ? 0 : start), key].join(' -> ');
            throw new EnvManagerError('RULE_CYCLE', `Rule cycle detected: ${cycle}`, { cycle });
        }
        const field = fields.get(key);
        if (!field) {
            throw new EnvManagerError('RULE_UNDEFINED_VARIABLE', `Undefined variable "\${${key}}"`, {
                ref: key,
            });
        }
        if (stack.length > 200) {
            throw new EnvManagerError('RULE_TEMPLATE_INVALID', 'Rule nesting exceeds 200 levels', {
                field: key,
            });
        }
        state.set(key, 'visiting');
        stack.push(key);
        try {
            if (typeof field.raw !== 'string') {
                const scalarResult = {
                    value: field.raw,
                    definedBy: field.definedBy,
                    inputs: [],
                    shadowed: field.shadowed,
                };
                resolved.set(key, scalarResult);
                state.set(key, 'done');
                return scalarResult;
            }
            const parts = partsFor(field);
            const single = templateIsSingleRef(parts);
            const inputs = [];
            const values = [];
            let direct;
            if (single) {
                const ref = resolveRef(single);
                direct = ref.value;
                if (ref.source)
                    inputs.push({ name: single, source: ref.source });
            }
            else {
                for (const part of parts) {
                    if (part.kind === 'text') {
                        values.push(part.value);
                        continue;
                    }
                    const ref = resolveRef(part.name);
                    values.push(String(ref.value));
                    if (ref.source)
                        inputs.push({ name: part.name, source: ref.source });
                }
            }
            const value = direct ?? values.join('');
            if (key.startsWith('paths.')) {
                if (String(value).replace(/\\/g, '/').split('/').includes('..')) {
                    throw new EnvManagerError('RULE_PATH_TRAVERSAL', `Resolved path for ${key} contains ".."`, { field: key, value });
                }
            }
            const result = {
                value,
                definedBy: field.definedBy,
                inputs,
                shadowed: field.shadowed,
            };
            resolved.set(key, result);
            state.set(key, 'done');
            return result;
        }
        catch (error) {
            state.delete(key);
            throw error;
        }
        finally {
            stack.pop();
        }
    }
    function toField(key) {
        try {
            const value = resolveField(key);
            return {
                value: value.value,
                provenance: {
                    field: key,
                    value: value.value,
                    definedBy: value.definedBy,
                    inputs: value.inputs,
                    shadowed: value.shadowed,
                },
            };
        }
        catch (error) {
            diagnostics.push(errorDiagnostic(error, key));
            return null;
        }
    }
    const variables = {};
    for (const key of fields.keys()) {
        if (!key.startsWith('variables.'))
            continue;
        const field = toField(key);
        if (field)
            variables[key.slice('variables.'.length)] = field;
    }
    const paths = {};
    for (const key of fields.keys()) {
        if (!key.startsWith('paths.'))
            continue;
        const field = toField(key);
        if (field)
            paths[key.slice('paths.'.length)] = field;
    }
    function structured(prefix) {
        const runtime = activeDeployment?.runtimeMode;
        if (!runtime)
            return undefined;
        const propertyPrefix = `${prefix}.${runtime}.`;
        const keys = [...fields.keys()].filter((key) => key.startsWith(propertyPrefix));
        if (keys.length === 0)
            return undefined;
        const value = {};
        const provenance = [];
        for (const key of keys) {
            const field = toField(key);
            if (!field)
                continue;
            value[key.slice(propertyPrefix.length)] = field.value;
            provenance.push(field.provenance);
        }
        if (Object.keys(value).length === 0)
            return undefined;
        return { value: value, provenance };
    }
    const logSource = structured('logSources');
    const classLocation = structured('classLocations');
    if (diagnostics.some((item) => item.severity === 'error')) {
        return { ok: false, diagnostics };
    }
    const context = {
        ...(environment
            ? {
                environmentId: environment.id,
                environmentName: environment.name,
                environmentCategory: environment.category,
            }
            : {}),
        serviceId: service.id,
        serviceName: service.name,
        serviceCategory: service.category,
        ...(activeDeployment
            ? {
                deploymentId: activeDeployment.id,
                deploymentName: activeDeployment.name,
                runtimeMode: activeDeployment.runtimeMode,
                location: activeDeployment.location,
            }
            : {}),
        source: {
            gitUrl: service.git?.url,
            defaultBranch: service.git?.defaultBranch,
            modulePath: service.git?.modulePath,
        },
        artifact: service.artifact
            ? { name: service.artifact.name, path: service.artifact.path }
            : undefined,
        variables,
        paths,
        logSource,
        classLocation,
        ruleProfiles: [...service.ruleProfileRefs],
        status: 'configured-not-verified',
        credentials: [],
        diagnostics,
    };
    return { ok: true, context };
}
export { refsOf, ERROR_CODES };
//# sourceMappingURL=resolve.js.map