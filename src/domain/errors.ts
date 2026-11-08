import { HarnessError } from '@deepseek-ai/dsh-llm'

export type ErrorCode =
  | 'ENV_NOT_FOUND'
  | 'SERVICE_NOT_FOUND'
  | 'DEPLOYMENT_NOT_FOUND'
  | 'HOST_NOT_FOUND'
  | 'CLUSTER_NOT_FOUND'
  | 'RULE_PROFILE_NOT_FOUND'
  | 'BINDING_NOT_FOUND'
  | 'DEPLOYMENT_AMBIGUOUS'
  | 'DUPLICATE_ID'
  | 'RECORD_INVALID'
  | 'RECORD_IN_USE'
  | 'RECORD_LIMIT_EXCEEDED'
  | 'RECORD_TOO_LARGE'
  | 'INVALID_ARGUMENT'
  | 'FORBIDDEN'
  | 'STORAGE_UNWRITABLE'
  | 'SCHEMA_UNSUPPORTED'
  | 'UNKNOWN_FIELD'
  | 'RULE_TEMPLATE_INVALID'
  | 'RULE_UNDEFINED_VARIABLE'
  | 'RULE_CYCLE'
  | 'RULE_PATH_TRAVERSAL'
  | 'RULE_TYPE_MISMATCH'
  | 'OPERATION_UNKNOWN'
  | 'BINDING_CONFLICT'
  | 'SKILL_UNAVAILABLE'
  | 'SKILL_REGISTRY_UNAVAILABLE'
  | 'POLICY_DENIED'
  | 'PARAMETER_RESOLUTION_FAILED'
  | 'CREDENTIAL_MISSING'
  | 'CREDENTIAL_UNAVAILABLE'
  | 'CREDENTIAL_WRITE_FAILED'
  | 'MEMORY_BRIDGE_UNAVAILABLE'
  | 'SESSION_CONTEXT_UNAVAILABLE'
  | 'SESSION_CONTEXT_UNPERSISTED'
  | 'EXECUTION_TARGET_INVALID'
  | 'SCRIPT_NOT_FOUND'
  | 'SCRIPT_PATH_TRAVERSAL'
  | 'EXECUTION_TIMEOUT'
  | 'EXECUTION_FAILED'
  | 'APPROVAL_REQUIRED'
  | 'EXPERIENCE_NOT_FOUND'
  | 'DR_PEER_UNKNOWN'
  | 'IMPORT_INVALID'
  | 'IMPORT_TOO_LARGE'
  | 'INTERNAL_ERROR'

export class EnvManagerError extends HarnessError {
  readonly details?: Record<string, unknown>

  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(message, code)
    this.name = 'EnvManagerError'
    this.details = details
  }
}

export function isEnvManagerError(error: unknown): error is EnvManagerError {
  return error instanceof EnvManagerError
}

export function asEnvManagerError(error: unknown): EnvManagerError {
  if (error instanceof EnvManagerError) return error
  const message = error instanceof Error ? error.message : String(error)
  return new EnvManagerError('INTERNAL_ERROR', message)
}

export function diagnostic(
  code: ErrorCode,
  severity: 'info' | 'warning' | 'error',
  message: string,
  extra?: { file?: string; path?: string; details?: Record<string, unknown> },
) {
  return { code, severity, message, ...extra }
}
