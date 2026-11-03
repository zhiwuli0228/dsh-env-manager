import { WRITE_OPERATIONS } from '../domain/constants.js';
import { EnvManagerError } from '../domain/errors.js';
import { matchShape } from '../domain/schemas.js';
import { resolveParameters } from './params.js';
const RANK = {
    deployment: 1,
    'environment-service': 2,
    service: 3,
    'category-mode': 4,
    global: 5,
};
function matches(binding, context) {
    const match = binding.match;
    if (match.environmentId && match.environmentId !== context.environmentId)
        return false;
    if (match.serviceId && match.serviceId !== context.serviceId)
        return false;
    if (match.deploymentId && match.deploymentId !== context.deploymentId)
        return false;
    if (match.deploymentMode && match.deploymentMode !== context.runtimeMode)
        return false;
    if (match.serviceCategory && match.serviceCategory !== context.serviceCategory)
        return false;
    return true;
}
function levelOf(binding) {
    const shape = matchShape(binding.match);
    return shape ?? null;
}
function skillDiagnostic(code, message, severity, details) {
    return { code, severity, message, details };
}
async function checkSkill(binding, context, skills, signal) {
    const ref = binding.skill;
    if (!skills) {
        return {
            skill: { name: ref.name, available: 'unknown' },
            diagnostics: [
                skillDiagnostic('SKILL_REGISTRY_UNAVAILABLE', 'Skill catalog is unavailable; availability could not be verified', 'warning', { skill: ref.name }),
            ],
            ok: true,
        };
    }
    let snapshot;
    try {
        snapshot = await skills.snapshot({ signal });
    }
    catch (error) {
        return {
            skill: { name: ref.name, available: 'unknown' },
            diagnostics: [
                skillDiagnostic('SKILL_REGISTRY_UNAVAILABLE', `Skill catalog could not be read: ${error instanceof Error ? error.message : String(error)}`, 'warning', { skill: ref.name }),
            ],
            ok: true,
        };
    }
    if (!snapshot.complete) {
        return {
            skill: { name: ref.name, available: 'unknown' },
            diagnostics: [
                skillDiagnostic('SKILL_REGISTRY_UNAVAILABLE', 'Skill discovery did not complete; availability could not be verified', 'warning', { skill: ref.name }),
            ],
            ok: true,
        };
    }
    const found = snapshot.skills.find((item) => item.name === ref.name);
    if (!found) {
        return {
            skill: { name: ref.name, available: false },
            diagnostics: [
                skillDiagnostic('SKILL_UNAVAILABLE', `Skill "${ref.name}" is not installed`, 'error', {
                    skill: ref.name,
                    operation: binding.operation,
                }),
            ],
            ok: false,
        };
    }
    if (ref.expectedSource && found.source !== ref.expectedSource) {
        return {
            skill: { name: ref.name, source: found.source, provider: found.provider, available: false },
            diagnostics: [
                skillDiagnostic('SKILL_UNAVAILABLE', `Skill "${ref.name}" has source "${found.source}"; expected "${ref.expectedSource}"`, 'error', { skill: ref.name, expectedSource: ref.expectedSource, actualSource: found.source }),
            ],
            ok: false,
        };
    }
    if (ref.expectedProvider && found.provider !== ref.expectedProvider) {
        return {
            skill: { name: ref.name, source: found.source, provider: found.provider, available: false },
            diagnostics: [
                skillDiagnostic('SKILL_UNAVAILABLE', `Skill "${ref.name}" has provider "${found.provider}"; expected "${ref.expectedProvider}"`, 'error', {
                    skill: ref.name,
                    expectedProvider: ref.expectedProvider,
                    actualProvider: found.provider,
                }),
            ],
            ok: false,
        };
    }
    return {
        skill: {
            name: ref.name,
            source: found.source,
            provider: found.provider,
            available: true,
        },
        diagnostics: [],
        ok: true,
    };
}
export async function resolveOperation(input) {
    const { operation, context, bindings, skills, signal } = input;
    const requested = {
        environmentId: context.environmentId,
        serviceId: context.serviceId,
        deploymentId: context.deploymentId,
    };
    const base = {
        ok: false,
        operation,
        requested,
        diagnostics: [],
    };
    const candidates = bindings.filter((binding) => binding.enabled && binding.operation === operation && matches(binding, context));
    if (candidates.length === 0) {
        return {
            ...base,
            diagnostics: [
                skillDiagnostic('BINDING_NOT_FOUND', `No enabled operation binding matches "${operation}" for ${context.environmentId}/${context.serviceId}`, 'error', { operation }),
            ],
        };
    }
    const ranked = candidates
        .map((binding) => ({ binding, level: levelOf(binding) }))
        .filter((item) => item.level !== null);
    if (ranked.length === 0) {
        return {
            ...base,
            diagnostics: [
                skillDiagnostic('RECORD_INVALID', 'Matching bindings do not have a valid match shape', 'error'),
            ],
        };
    }
    ranked.sort((a, b) => RANK[a.level] - RANK[b.level]);
    const topRank = RANK[ranked[0].level];
    const winners = ranked.filter((item) => RANK[item.level] === topRank);
    if (winners.length > 1) {
        return {
            ...base,
            diagnostics: [
                skillDiagnostic('BINDING_CONFLICT', `Operation "${operation}" has ${winners.length} bindings at the same priority (${winners[0].level})`, 'error', {
                    candidates: winners.map((item) => item.binding.id),
                    level: winners[0].level,
                }),
            ],
        };
    }
    const selected = winners[0];
    const selectedBinding = selected.binding;
    const skillResult = await checkSkill(selectedBinding, context, skills, signal);
    const policy = {
        requiresApproval: selectedBinding.policy?.requiresApproval ?? WRITE_OPERATIONS.has(operation),
        allowProduction: selectedBinding.policy?.allowProduction ?? false,
    };
    const diagnostics = [...skillResult.diagnostics];
    let ok = skillResult.ok;
    if (context.environmentCategory === 'production' && policy.allowProduction !== true) {
        ok = false;
        diagnostics.push(skillDiagnostic('POLICY_DENIED', `Operation "${operation}" is not allowed in production by binding ${selectedBinding.id}`, 'error', { binding: selectedBinding.id, environmentId: context.environmentId }));
    }
    let parameters;
    try {
        parameters = resolveParameters(selectedBinding.parameters, context);
    }
    catch (error) {
        ok = false;
        diagnostics.push(error instanceof EnvManagerError
            ? {
                code: error.code,
                severity: 'error',
                message: error.message,
                details: error.details,
            }
            : {
                code: 'PARAMETER_RESOLUTION_FAILED',
                severity: 'error',
                message: error instanceof Error ? error.message : String(error),
            });
    }
    return {
        ok,
        operation,
        requested,
        matchedBindingId: selectedBinding.id,
        matchLevel: selected.level,
        skill: skillResult.skill,
        parameters,
        policy,
        diagnostics,
    };
}
export { RANK };
//# sourceMappingURL=router.js.map