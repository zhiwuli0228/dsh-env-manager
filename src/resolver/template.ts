import { LIMITS, TEMPLATE_REF_PATTERN } from '../domain/constants.js'
import { EnvManagerError } from '../domain/errors.js'

export type TemplatePart =
  | { kind: 'text'; value: string }
  | { kind: 'ref'; name: string }

export function parseTemplate(text: string, field: string): TemplatePart[] {
  if (text.length > LIMITS.templateLength) {
    throw new EnvManagerError(
      'RULE_TEMPLATE_INVALID',
      `Template for ${field} exceeds ${LIMITS.templateLength} characters`,
      { field },
    )
  }
  const parts: TemplatePart[] = []
  let index = 0
  while (index < text.length) {
    const start = text.indexOf('${', index)
    if (start === -1) {
      parts.push({ kind: 'text', value: text.slice(index) })
      break
    }
    if (start > index) parts.push({ kind: 'text', value: text.slice(index, start) })
    const end = text.indexOf('}', start + 2)
    if (end === -1) {
      throw new EnvManagerError(
        'RULE_TEMPLATE_INVALID',
        `Template for ${field} has an unterminated \${...} reference`,
        { field },
      )
    }
    const name = text.slice(start + 2, end).trim()
    if (!TEMPLATE_REF_PATTERN.test(name)) {
      throw new EnvManagerError(
        'RULE_TEMPLATE_INVALID',
        `Template for ${field} has an invalid reference "\${${name}}"`,
        { field },
      )
    }
    parts.push({ kind: 'ref', name })
    index = end + 1
  }
  return parts
}

export function refsOf(parts: TemplatePart[]): string[] {
  const refs: string[] = []
  for (const part of parts) if (part.kind === 'ref') refs.push(part.name)
  return refs
}

export function templateIsSingleRef(parts: TemplatePart[]): string | null {
  if (parts.length === 1 && parts[0]?.kind === 'ref') return parts[0].name
  return null
}
