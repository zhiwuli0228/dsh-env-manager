import { INTERPRETER_BY_EXTENSION } from '../domain/constants.js'
import { WRITE_OPERATIONS } from '../domain/constants.js'
import { EnvManagerError } from '../domain/errors.js'
import type {
  Diagnostic,
  ExecutionTarget,
  Host,
  MatchLevel,
  OperationBinding,
  OperationPolicy,
  OperationResolution,
  ResolvedSkillReference,
  ResolvedTarget,
  ServiceContext,
  SkillDirectory,
  SkillSummary,
} from '../domain/types.js'
import { matchShape } from '../domain/schemas.js'
import { interpolateText, resolveArgv, resolveParameters } from './params.js'

const RANK: Record<MatchLevel, number> = {
  deployment: 1,
  'environment-service': 2,
  environment: 3,
  service: 4,
  'category-mode': 5,
  global: 6,
}

export interface RouterInput {
  operation: string
  context: ServiceContext
  bindings: OperationBinding[]
  skills: SkillDirectory | null
  /** Environment hosts, used to prepare remote targets. Never includes credential values. */
  hosts?: Host[]
  signal?: AbortSignal
}

function matches(binding: OperationBinding, context: ServiceContext): boolean {
  const match = binding.match
  // Operations always run inside an environment (resolveOperation enforces this), so
  // environment-scoped predicates compare directly. A deployment-scoped predicate needs
  // a deployment context; without one it simply does not match and a lower level wins.
  if (match.environmentId && match.environmentId !== context.environmentId) return false
  if (match.deploymentId && match.deploymentId !== context.deploymentId) return false
  if (match.deploymentMode && match.deploymentMode !== context.runtimeMode) return false
  if (match.serviceId && match.serviceId !== context.serviceId) return false
  if (match.serviceCategory && match.serviceCategory !== context.serviceCategory) return false
  return true
}

function levelOf(binding: OperationBinding): MatchLevel | null {
  const shape = matchShape(binding.match as Record<string, unknown>)
  return (shape as MatchLevel | null) ?? null
}

function skillDiagnostic(
  code: string,
  message: string,
  severity: 'warning' | 'error',
  details?: Record<string, unknown>,
): Diagnostic {
  return { code, severity, message, details }
}

async function checkSkill(
  ref: import('../domain/types.js').SkillReference,
  binding: OperationBinding,
  context: ServiceContext,
  skills: SkillDirectory | null,
  signal?: AbortSignal,
): Promise<{
  skill: ResolvedSkillReference
  diagnostics: Diagnostic[]
  ok: boolean
}> {
  if (!skills) {
    return {
      skill: { name: ref.name, available: 'unknown' },
      diagnostics: [
        skillDiagnostic(
          'SKILL_REGISTRY_UNAVAILABLE',
          'Skill catalog is unavailable; availability could not be verified',
          'warning',
          { skill: ref.name },
        ),
      ],
      ok: true,
    }
  }
  let snapshot
  try {
    snapshot = await skills.snapshot({ signal })
  } catch (error) {
    return {
      skill: { name: ref.name, available: 'unknown' },
      diagnostics: [
        skillDiagnostic(
          'SKILL_REGISTRY_UNAVAILABLE',
          `Skill catalog could not be read: ${error instanceof Error ? error.message : String(error)}`,
          'warning',
          { skill: ref.name },
        ),
      ],
      ok: true,
    }
  }
  if (!snapshot.complete) {
    return {
      skill: { name: ref.name, available: 'unknown' },
      diagnostics: [
        skillDiagnostic(
          'SKILL_REGISTRY_UNAVAILABLE',
          'Skill discovery did not complete; availability could not be verified',
          'warning',
          { skill: ref.name },
        ),
      ],
      ok: true,
    }
  }
  const found: SkillSummary | undefined = snapshot.skills.find((item) => item.name === ref.name)
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
    }
  }
  if (ref.expectedSource && found.source !== ref.expectedSource) {
    return {
      skill: { name: ref.name, source: found.source, provider: found.provider, available: false },
      diagnostics: [
        skillDiagnostic(
          'SKILL_UNAVAILABLE',
          `Skill "${ref.name}" has source "${found.source}"; expected "${ref.expectedSource}"`,
          'error',
          { skill: ref.name, expectedSource: ref.expectedSource, actualSource: found.source },
        ),
      ],
      ok: false,
    }
  }
  if (ref.expectedProvider && found.provider !== ref.expectedProvider) {
    return {
      skill: { name: ref.name, source: found.source, provider: found.provider, available: false },
      diagnostics: [
        skillDiagnostic(
          'SKILL_UNAVAILABLE',
          `Skill "${ref.name}" has provider "${found.provider}"; expected "${ref.expectedProvider}"`,
          'error',
          {
            skill: ref.name,
            expectedProvider: ref.expectedProvider,
            actualProvider: found.provider,
          },
        ),
      ],
      ok: false,
    }
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
  }
}

export async function resolveOperation(input: RouterInput): Promise<OperationResolution> {
  const { operation, context, bindings, skills, signal } = input
  const requested = {
    ...(context.environmentId !== undefined ? { environmentId: context.environmentId } : {}),
    serviceId: context.serviceId,
    deploymentId: context.deploymentId,
  }
  const base: OperationResolution = {
    ok: false,
    operation,
    requested,
    diagnostics: [],
  }

  // No downgrade: an operation must never silently fall back to service/global
  // bindings when no environment was selected. The caller must pick one first.
  if (context.environmentId === undefined) {
    return {
      ...base,
      diagnostics: [
        skillDiagnostic(
          'ENVIRONMENT_REQUIRED',
          `An environment is required to route "${operation}"; select one first (env_set_context) or pass environmentId`,
          'error',
          { operation },
        ),
      ],
    }
  }

  const candidates = bindings.filter(
    (binding) => binding.enabled && binding.operation === operation && matches(binding, context),
  )
  if (candidates.length === 0) {
    return {
      ...base,
      diagnostics: [
        skillDiagnostic(
          'BINDING_NOT_FOUND',
          `No enabled operation binding matches "${operation}" for ${context.environmentId}/${
            context.serviceId ?? '(environment)'
          }`,
          'error',
          { operation },
        ),
      ],
    }
  }

  const ranked = candidates
    .map((binding) => ({ binding, level: levelOf(binding) }))
    .filter((item): item is { binding: OperationBinding; level: MatchLevel } => item.level !== null)
  if (ranked.length === 0) {
    return {
      ...base,
      diagnostics: [
        skillDiagnostic('RECORD_INVALID', 'Matching bindings do not have a valid match shape', 'error'),
      ],
    }
  }
  ranked.sort((a, b) => RANK[a.level] - RANK[b.level])
  const topRank = RANK[ranked[0]!.level]
  const winners = ranked.filter((item) => RANK[item.level] === topRank)
  if (winners.length > 1) {
    return {
      ...base,
      diagnostics: [
        skillDiagnostic(
          'BINDING_CONFLICT',
          `Operation "${operation}" has ${winners.length} bindings at the same priority (${winners[0]!.level})`,
          'error',
          {
            candidates: winners.map((item) => item.binding.id),
            level: winners[0]!.level,
          },
        ),
      ],
    }
  }

  const selected = winners[0]!
  const selectedBinding = selected.binding

  const policy: OperationPolicy = {
    requiresApproval:
      selectedBinding.policy?.requiresApproval ?? WRITE_OPERATIONS.has(operation),
    allowProduction: selectedBinding.policy?.allowProduction ?? false,
  }
  const diagnostics: Diagnostic[] = []
  let ok = true
  if (context.environmentCategory === 'production' && policy.allowProduction !== true) {
    ok = false
    diagnostics.push(
      skillDiagnostic(
        'POLICY_DENIED',
        `Operation "${operation}" is not allowed in production by binding ${selectedBinding.id}`,
        'error',
        { binding: selectedBinding.id, environmentId: context.environmentId },
      ),
    )
  }

  let parameters: Record<string, string> | undefined
  try {
    parameters = resolveParameters(selectedBinding.parameters, context)
  } catch (error) {
    ok = false
    diagnostics.push(
      error instanceof EnvManagerError
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
          },
    )
  }

  let skill: ResolvedSkillReference | undefined
  let target: ResolvedTarget | undefined
  const skillRef = selectedBinding.skill
  if (skillRef) {
    const skillResult = await checkSkill(skillRef, selectedBinding, context, skills, signal)
    diagnostics.push(...skillResult.diagnostics)
    skill = skillResult.skill
    ok = ok && skillResult.ok
    target = { mode: 'skill', skill: skillResult.skill }
  } else if (selectedBinding.execute) {
    const resolved = resolveExecutionTarget(
      selectedBinding.execute,
      parameters ?? {},
      context,
      input.hosts,
      selectedBinding.id,
    )
    if (!resolved.ok) {
      ok = false
      diagnostics.push(...resolved.diagnostics)
    } else {
      target = resolved.target
    }
  } else {
    ok = false
    diagnostics.push(
      skillDiagnostic(
        'EXECUTION_TARGET_INVALID',
        `Binding ${selectedBinding.id} declares neither a skill nor an execute target`,
        'error',
        { binding: selectedBinding.id },
      ),
    )
  }

  return {
    ok,
    operation,
    requested,
    matchedBindingId: selectedBinding.id,
    matchLevel: selected.level,
    skill,
    target,
    parameters,
    policy,
    diagnostics,
  }
}

function resolveExecutionTarget(
  execute: ExecutionTarget,
  parameters: Record<string, string>,
  context: ServiceContext,
  hosts: Host[] | undefined,
  bindingId: string,
):
  | { ok: true; target: ResolvedTarget }
  | { ok: false; diagnostics: Diagnostic[] } {
  const fail = (code: string, message: string, details?: Record<string, unknown>) => ({
    ok: false as const,
    diagnostics: [skillDiagnostic(code, message, 'error', { binding: bindingId, ...details })],
  })
  try {
    switch (execute.mode) {
      case 'script': {
        const extension = execute.path.split('.').pop() ?? ''
        return {
          ok: true,
          target: {
            mode: 'script',
            script: {
              path: execute.path,
              interpreter: execute.interpreter ?? INTERPRETER_BY_EXTENSION[extension] ?? 'bash',
              args: resolveArgv(execute.args ?? [], context, 'execute.script.args', parameters),
            },
            timeoutSeconds: execute.timeoutSeconds,
          },
        }
      }
      case 'command':
        return {
          ok: true,
          target: {
            mode: 'command',
            command: {
              argv: resolveArgv(execute.argv, context, 'execute.command.argv', parameters),
              ...(execute.workingDirectory ? { workingDirectory: execute.workingDirectory } : {}),
            },
            timeoutSeconds: execute.timeoutSeconds,
          },
        }
      case 'remote': {
        const host = pickHost(hosts, execute.hostRef)
        if (!host) {
          return fail(
            'HOST_NOT_FOUND',
            execute.hostRef
              ? `Remote target host "${execute.hostRef}" does not exist in environment ${context.environmentId}`
              : `Remote target needs an ssh host in environment ${context.environmentId}; none is configured`,
            { environmentId: context.environmentId, hostRef: execute.hostRef ?? null },
          )
        }
        const sshAccount = (host.accounts ?? []).find(
          (account) => account.protocol === 'ssh' && account.credentialRef,
        )
        const username =
          execute.username !== undefined
            ? interpolateText(execute.username, context, 'execute.remote.username', parameters)
            : host.adminUser ?? sshAccount?.username ?? 'root'
        return {
          ok: true,
          target: {
            mode: 'remote',
            remote: {
              hostId: host.id,
              hostName: host.name,
              address: host.publicIp ?? host.ip,
              port: host.sshPort ?? 22,
              username,
              command: interpolateText(execute.command, context, 'execute.remote.command', parameters),
              credentialRef: host.credentialRef ?? sshAccount?.credentialRef,
            },
            timeoutSeconds: execute.timeoutSeconds,
          },
        }
      }
      default:
        return fail('EXECUTION_TARGET_INVALID', `Unknown execute mode "${(execute as { mode: string }).mode}"`)
    }
  } catch (error) {
    return fail(
      error instanceof EnvManagerError ? error.code : 'PARAMETER_RESOLUTION_FAILED',
      error instanceof Error ? error.message : String(error),
    )
  }
}

function pickHost(hosts: Host[] | undefined, hostRef: string | undefined): Host | undefined {
  const list = hosts ?? []
  if (hostRef) return list.find((host) => host.id === hostRef)
  const ssh = list.find((host) => host.access?.includes('ssh'))
  return ssh ?? list[0]
}

export { RANK }
