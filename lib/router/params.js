import { EnvManagerError } from '../domain/errors.js';
import { parseTemplate, templateIsSingleRef } from '../resolver/template.js';
export function buildParameterConstants(context) {
    const constants = new Map();
    constants.set('env.id', context.environmentId);
    constants.set('env.name', context.environmentName);
    constants.set('env.category', context.environmentCategory);
    constants.set('service.id', context.serviceId);
    constants.set('service.name', context.serviceName);
    constants.set('service.category', context.serviceCategory);
    constants.set('deployment.id', context.deploymentId);
    if (context.deploymentName)
        constants.set('deployment.name', context.deploymentName);
    constants.set('deployment.runtimeMode', context.runtimeMode);
    for (const [name, field] of Object.entries(context.paths)) {
        constants.set(`paths.${name}`, String(field.value));
    }
    const location = context.location;
    for (const [key, value] of Object.entries(location)) {
        if (value === null || value === undefined)
            continue;
        if (typeof value === 'object') {
            for (const [childKey, childValue] of Object.entries(value)) {
                if (childValue !== null && childValue !== undefined && typeof childValue !== 'object') {
                    constants.set(`deployment.location.${key}.${childKey}`, String(childValue));
                }
            }
        }
        else {
            constants.set(`deployment.location.${key}`, String(value));
        }
    }
    if (context.artifact?.name)
        constants.set('service.artifact.name', context.artifact.name);
    return constants;
}
export function resolveParameters(parameters, context) {
    if (!parameters)
        return {};
    const constants = buildParameterConstants(context);
    const result = {};
    for (const [key, raw] of Object.entries(parameters)) {
        if (raw === null || typeof raw === 'object') {
            throw new EnvManagerError('PARAMETER_RESOLUTION_FAILED', `Parameter ${key} must be a string, number or boolean`, { parameter: key });
        }
        if (typeof raw !== 'string') {
            result[key] = String(raw);
            continue;
        }
        try {
            const parts = parseTemplate(raw, `parameters.${key}`);
            const single = templateIsSingleRef(parts);
            if (single) {
                const value = constants.get(single);
                if (value === undefined) {
                    throw new EnvManagerError('PARAMETER_RESOLUTION_FAILED', `Parameter ${key} references unknown value "\${${single}}"`, { parameter: key, ref: single });
                }
                result[key] = value;
                continue;
            }
            let text = '';
            for (const part of parts) {
                if (part.kind === 'text') {
                    text += part.value;
                    continue;
                }
                const value = constants.get(part.name);
                if (value === undefined) {
                    throw new EnvManagerError('PARAMETER_RESOLUTION_FAILED', `Parameter ${key} references unknown value "\${${part.name}}"`, { parameter: key, ref: part.name });
                }
                text += value;
            }
            result[key] = text;
        }
        catch (error) {
            if (error instanceof EnvManagerError)
                throw error;
            throw new EnvManagerError('PARAMETER_RESOLUTION_FAILED', `Parameter ${key} could not be resolved: ${error instanceof Error ? error.message : String(error)}`, { parameter: key });
        }
    }
    return result;
}
//# sourceMappingURL=params.js.map