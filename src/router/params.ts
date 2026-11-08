import { EnvManagerError } from '../domain/errors.js'
import type { ServiceContext } from '../domain/types.js'
import { parseTemplate, templateIsSingleRef } from '../resolver/template.js'

export function buildParameterConstants(context: ServiceContext): Map<string, string> {
  const constants = new Map<string, string>()
  if (context.environmentId !== undefined) constants.set('env.id', context.environmentId)
  if (context.environmentName !== undefined) constants.set('env.name', context.environmentName)
  if (context.environmentCategory !== undefined) {
    constants.set('env.category', context.environmentCategory)
  }
  if (context.serviceId !== undefined) constants.set('service.id', context.serviceId)
  if (context.serviceName !== undefined) constants.set('service.name', context.serviceName)
  if (context.serviceCategory !== undefined) {
    constants.set('service.category', context.serviceCategory)
  }
  if (context.deploymentId !== undefined) constants.set('deployment.id', context.deploymentId)
  if (context.deploymentName) constants.set('deployment.name', context.deploymentName)
  if (context.runtimeMode !== undefined) constants.set('deployment.runtimeMode', context.runtimeMode)
  for (const [name, field] of Object.entries(context.paths)) {
    constants.set(`paths.${name}`, String(field.value))
  }
  const location = context.location as unknown as Record<string, unknown> | undefined
  if (location) {
    for (const [key, value] of Object.entries(location)) {
      if (value === null || value === undefined) continue
      if (typeof value === 'object') {
        for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
          if (childValue !== null && childValue !== undefined && typeof childValue !== 'object') {
            constants.set(`deployment.location.${key}.${childKey}`, String(childValue))
          }
        }
      } else {
        constants.set(`deployment.location.${key}`, String(value))
      }
    }
  }
  if (context.artifact?.name) constants.set('service.artifact.name', context.artifact.name)
  return constants
}

/**
 * Interpolate one `${ref}` template. `extra` adds already-resolved values
 * (operation parameters) so an execution target can reference them.
 */
export function interpolateText(
  raw: string,
  context: ServiceContext,
  label: string,
  extra?: Record<string, string>,
): string {
  const constants = buildParameterConstants(context)
  if (extra) {
    for (const [name, value] of Object.entries(extra)) constants.set(name, value)
  }
  try {
    const parts = parseTemplate(raw, label)
    const single = templateIsSingleRef(parts)
    if (single) {
      const value = constants.get(single)
      if (value === undefined) {
        throw new EnvManagerError(
          'PARAMETER_RESOLUTION_FAILED',
          `${label} references unknown value "\${${single}}"`,
          { ref: single },
        )
      }
      return value
    }
    let text = ''
    for (const part of parts) {
      if (part.kind === 'text') {
        text += part.value
        continue
      }
      const value = constants.get(part.name)
      if (value === undefined) {
        throw new EnvManagerError(
          'PARAMETER_RESOLUTION_FAILED',
          `${label} references unknown value "\${${part.name}}"`,
          { ref: part.name },
        )
      }
      text += value
    }
    return text
  } catch (error) {
    if (error instanceof EnvManagerError) throw error
    throw new EnvManagerError(
      'PARAMETER_RESOLUTION_FAILED',
      `${label} could not be resolved: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

export function resolveArgv(
  argv: string[],
  context: ServiceContext,
  label: string,
  extra?: Record<string, string>,
): string[] {
  return argv.map((item, index) => interpolateText(item, context, `${label}[${index}]`, extra))
}

export function resolveParameters(
  parameters: Record<string, string | number | boolean> | undefined,
  context: ServiceContext,
): Record<string, string> {
  if (!parameters) return {}
  const result: Record<string, string> = {}
  for (const [key, raw] of Object.entries(parameters)) {
    if (raw === null || typeof raw === 'object') {
      throw new EnvManagerError(
        'PARAMETER_RESOLUTION_FAILED',
        `Parameter ${key} must be a string, number or boolean`,
        { parameter: key },
      )
    }
    if (typeof raw !== 'string') {
      result[key] = String(raw)
      continue
    }
    result[key] = interpolateText(raw, context, `parameters.${key}`)
  }
  return result
}
