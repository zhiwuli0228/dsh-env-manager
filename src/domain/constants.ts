import type { RecordKind } from './types.js'

export const SCHEMA_VERSION = 1

export const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,62}$/
export const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/
export const PARAMETER_KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/
export const TEMPLATE_REF_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$/

export const RECORD_KINDS: readonly RecordKind[] = [
  'environment',
  'service',
  'deployment',
  'ruleProfile',
  'operationBinding',
]

export const KIND_DIRECTORIES: Record<RecordKind, string> = {
  environment: 'environments',
  service: 'services',
  deployment: 'deployments',
  ruleProfile: 'rules',
  operationBinding: 'operations',
}

export const STANDARD_OPERATIONS = [
  'install',
  'deploy',
  'redeploy',
  'replace',
  'restart',
  'upgrade',
  'rollback',
  'uninstall',
  'collect-logs',
  'health-check',
  'inspect',
  'upload',
  'download',
] as const

export const WRITE_OPERATIONS: ReadonlySet<string> = new Set([
  'install',
  'deploy',
  'redeploy',
  'replace',
  'restart',
  'upgrade',
  'rollback',
  'uninstall',
  'upload',
])

export const LIMITS = {
  recordBytes: 1024 * 1024,
  sessionBytes: 64 * 1024,
  templateLength: 2048,
  maxParameters: 50,
  maxDiagnostics: 200,
  maxWarnings: 20,
  backupCount: 5,
  maxSnapshotRecords: 5000,
} as const

export function isRecordKind(value: string): value is RecordKind {
  return (RECORD_KINDS as readonly string[]).includes(value)
}
