import { createRequire } from 'node:module'
import { EnvManagerError, type ErrorCode } from '../domain/errors.js'
import { LIMITS, isRecordKind } from '../domain/constants.js'
import { parseRecord, parseRecordInput, withTimestamps } from '../domain/schemas.js'
import type {
  Actor,
  AnyRecord,
  CredentialDirectory,
  CredentialStatus,
  Diagnostic,
  FindHit,
  FindResult,
  GetResult,
  ListResult,
  MetaResult,
  OperationBinding,
  OperationResolution,
  RecordKind,
  RecordSummary,
  RegistrySnapshot,
  RemoveOptions,
  RemoveResult,
  ResolveRequest,
  RouteRequest,
  SaveOptions,
  SaveResult,
  ServiceContext,
  SessionContext,
  SkillDirectory,
  ValidationReport,
} from '../domain/types.js'
import { RegistryLoader, lookup, lookupByRef } from '../registry/registry.js'
import { findReferences } from '../registry/integrity.js'
import { resolveContext } from '../resolver/resolve.js'
import { resolveOperation } from '../router/router.js'
import { SessionStore } from '../session/session.js'
import { parseYamlText, stringifyRecord } from '../storage/records.js'
import { deleteRecordFile, readRecordRaw, writeRecordFile } from '../storage/records.js'
import { ensureLayout } from '../storage/atomic.js'
import type { Logger } from '../logger.js'

const require = createRequire(import.meta.url)
const packageJson = require('../../package.json') as { version: string }

export const VERSION = packageJson.version

export interface AppOptions {
  dataDir: string
  maxRecords: number
  writePolicy: {
    allowUiProductionWrites: boolean
  }
  skills: SkillDirectory | null
  credentials: CredentialDirectory | null
  logger: Logger
  defaults?: { environmentId?: string }
}

export interface SaveContext {
  actor?: Actor
}

export interface GetContextOptions {
  actor?: Actor
}

export interface ResolveOutcome {
  context: ServiceContext
  warnings: Diagnostic[]
}

function notFoundCode(kind: RecordKind): string {
  switch (kind) {
    case 'environment':
      return 'ENV_NOT_FOUND'
    case 'service':
      return 'SERVICE_NOT_FOUND'
    case 'deployment':
      return 'DEPLOYMENT_NOT_FOUND'
    case 'ruleProfile':
      return 'RULE_PROFILE_NOT_FOUND'
    case 'operationBinding':
      return 'BINDING_NOT_FOUND'
  }
}

function recordName(record: AnyRecord): string {
  const named = record as { name?: string }
  if (named.name) return named.name
  return record.id
}

function summaryOf(kind: RecordKind, record: AnyRecord): RecordSummary {
  let summary: string | undefined
  switch (kind) {
    case 'environment': {
      const env = record as import('../domain/types.js').Environment
      const accounts = env.hosts.reduce((total, host) => total + (host.accounts?.length ?? 0), 0)
      summary = `${env.category} · ${env.hosts.length} hosts · ${accounts} accounts · ${env.loginRecords?.length ?? 0} logins`
      break
    }
    case 'service': {
      const service = record as import('../domain/types.js').Service
      summary = `${service.category} · ${service.deployModes.join(', ')}`
      break
    }
    case 'deployment': {
      const deployment = record as import('../domain/types.js').Deployment
      summary = `${deployment.environmentId}/${deployment.serviceId} · ${deployment.runtimeMode}`
      break
    }
    case 'ruleProfile': {
      const profile = record as import('../domain/types.js').RuleProfile
      summary = `${Object.keys(profile.variables ?? {}).length} variables · ${
        Object.keys(profile.paths ?? {}).length
      } paths`
      break
    }
    case 'operationBinding': {
      const binding = record as OperationBinding
      summary = `${binding.operation} → ${binding.skill.name}`
      break
    }
  }
  return { kind, id: record.id, name: recordName(record), summary }
}

function errorDiagnostic(code: string, message: string, details?: Record<string, unknown>): Diagnostic {
  return { code, severity: 'error', message, details }
}

export class App {
  private readonly loader: RegistryLoader
  private readonly sessions: SessionStore

  constructor(private readonly options: AppOptions) {
    this.loader = new RegistryLoader(options.dataDir)
    this.sessions = new SessionStore(options.dataDir)
  }

  get dataDir(): string {
    return this.options.dataDir
  }

  async init(): Promise<void> {
    await ensureLayout(this.options.dataDir)
  }

  private async snapshot(): Promise<RegistrySnapshot> {
    await this.init()
    return this.loader.load()
  }

  private counts(snapshot: RegistrySnapshot): Record<string, number> {
    return {
      environments: snapshot.environments.size,
      services: snapshot.services.size,
      deployments: snapshot.deployments.size,
      ruleProfiles: snapshot.ruleProfiles.size,
      operationBindings: snapshot.operationBindings.size,
    }
  }

  private warnings(snapshot: RegistrySnapshot): Diagnostic[] {
    return snapshot.diagnostics
      .filter((item) => item.severity !== 'info')
      .slice(0, LIMITS.maxWarnings)
  }

  async meta(): Promise<MetaResult> {
    const snapshot = await this.snapshot()
    return {
      dataDir: this.options.dataDir,
      version: VERSION,
      counts: this.counts(snapshot),
      warnings: this.warnings(snapshot),
    }
  }

  async list(kind: RecordKind): Promise<ListResult> {
    const snapshot = await this.snapshot()
    const map = this.mapFor(snapshot, kind)
    const items = [...map.values()]
      .map((record) => summaryOf(kind, record))
      .sort((a, b) => a.id.localeCompare(b.id))
    return { items, warnings: this.warnings(snapshot) }
  }

  async get(kind: RecordKind, id: string): Promise<GetResult> {
    const snapshot = await this.snapshot()
    const record = lookup(snapshot, kind, id)
    if (!record) {
      throw new EnvManagerError(notFoundCode(kind) as ErrorCode, `${kind} "${id}" was not found`, {
        kind,
        id,
      })
    }
    const raw = await readRecordRaw(this.options.dataDir, kind, id)
    if (!raw.found || !raw.text) {
      throw new EnvManagerError('INTERNAL_ERROR', `${kind} "${id}" disappeared during read`)
    }
    return { record, yaml: raw.text }
  }

  async find(query: string): Promise<FindResult> {
    const snapshot = await this.snapshot()
    const needle = query.trim().toLowerCase()
    if (!needle) return { hits: [] }
    const hits: FindHit[] = []
    for (const kind of ['environment', 'service', 'deployment', 'ruleProfile', 'operationBinding'] as const) {
      for (const record of this.mapFor(snapshot, kind).values()) {
        const named = record as { name?: string; aliases?: string[]; category?: string }
        let field: FindHit['field'] | null = null
        if (record.id.toLowerCase().includes(needle)) field = 'id'
        else if (named.name?.toLowerCase().includes(needle)) field = 'name'
        else if (named.aliases?.some((alias) => alias.toLowerCase().includes(needle))) {
          field = 'alias'
        } else if (named.category?.toLowerCase().includes(needle)) field = 'category'
        if (field) {
          hits.push({ kind, id: record.id, name: recordName(record), field })
        }
        if (hits.length >= 25) break
      }
    }
    hits.sort((a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id))
    return { hits }
  }

  async saveYaml(
    kind: RecordKind,
    yaml: string,
    options: SaveOptions & SaveContext = {},
  ): Promise<SaveResult> {
    const parsed = parseYamlText(yaml, `${kind}.yaml`)
    return this.save(kind, parsed, options)
  }

  async save(
    kind: RecordKind,
    raw: unknown,
    options: SaveOptions & SaveContext = {},
  ): Promise<SaveResult> {
    if (!isRecordKind(kind)) {
      throw new EnvManagerError('INVALID_ARGUMENT', `Unknown record kind "${kind}"`)
    }
    const parsed = parseRecordInput(kind, raw)
    if (!parsed.ok) {
      throw new EnvManagerError('RECORD_INVALID', 'Record failed validation', {
        issues: parsed.issues,
      })
    }
    const snapshot = await this.snapshot()
    let previous: { createdAt: string } | undefined
    try {
      const rawPrevious = await readRecordRaw(this.options.dataDir, kind, parsed.record.id)
      if (rawPrevious.found) {
        const prior = parseRecord(kind, rawPrevious.raw)
        if (prior.ok) previous = { createdAt: prior.record.createdAt }
      }
    } catch {
      previous = undefined
    }
    const finalized = withTimestamps(parsed.record, previous)
    const checked = parseRecord(kind, finalized)
    if (!checked.ok) {
      throw new EnvManagerError('RECORD_INVALID', 'Record failed validation', {
        issues: checked.issues,
      })
    }
    const record = checked.record
    const created = !(await readRecordRaw(this.options.dataDir, kind, record.id)).found
    if (created && this.mapFor(snapshot, kind).size >= this.options.maxRecords) {
      throw new EnvManagerError(
        'RECORD_LIMIT_EXCEEDED',
        `The ${kind} registry is at its ${this.options.maxRecords}-record limit`,
        { kind, maxRecords: this.options.maxRecords },
      )
    }

    if (options.actor === 'ui' && this.isProductionRecord(kind, record, snapshot)) {
      if (!this.options.writePolicy.allowUiProductionWrites) {
        throw new EnvManagerError(
          'FORBIDDEN',
          'The panel cannot write production records unless writePolicy.allowUiProductionWrites is true',
          { kind, id: record.id },
        )
      }
    }

    const text = stringifyRecord(record)
    if (Buffer.byteLength(text, 'utf8') > LIMITS.recordBytes) {
      throw new EnvManagerError(
        'RECORD_TOO_LARGE',
        `Record exceeds ${LIMITS.recordBytes} bytes`,
        { kind, id: record.id },
      )
    }

    if (options.dryRun) {
      return {
        id: record.id,
        kind,
        created,
        dryRun: true,
        warnings: this.warnings(snapshot),
      }
    }

    try {
      await writeRecordFile(this.options.dataDir, kind, record)
    } catch (error) {
      if (error instanceof EnvManagerError) throw error
      throw new EnvManagerError('STORAGE_UNWRITABLE', `Could not write ${kind} "${record.id}"`, {
        reason: error instanceof Error ? error.message : String(error),
      })
    }
    const reloaded = await this.snapshot()
    return {
      id: record.id,
      kind,
      created,
      dryRun: false,
      warnings: this.warnings(reloaded),
    }
  }

  async remove(
    kind: RecordKind,
    id: string,
    actor: Actor,
    options: RemoveOptions = {},
  ): Promise<RemoveResult> {
    const snapshot = await this.snapshot()
    const record = lookup(snapshot, kind, id)
    if (!record) {
      throw new EnvManagerError(notFoundCode(kind) as ErrorCode, `${kind} "${id}" was not found`, {
        kind,
        id,
      })
    }
    if (actor === 'ui' && this.isProductionRecord(kind, record, snapshot)) {
      if (!this.options.writePolicy.allowUiProductionWrites) {
        throw new EnvManagerError(
          'FORBIDDEN',
          'The panel cannot delete production records unless writePolicy.allowUiProductionWrites is true',
          { kind, id },
        )
      }
    }
    const referrers = findReferences(snapshot, kind, id)
    const blockers = referrers.map((ref) =>
      errorDiagnostic('RECORD_IN_USE', `${ref.kind} "${ref.id}" references ${kind} "${id}"`, {
        referrer: ref,
      }),
    )
    if (options.dryRun) {
      return { id, kind, deleted: false, blockers }
    }
    if (blockers.length > 0) {
      throw new EnvManagerError('RECORD_IN_USE', `${kind} "${id}" is still referenced`, {
        kind,
        id,
        blockers,
      })
    }
    try {
      await deleteRecordFile(this.options.dataDir, kind, id)
    } catch (error) {
      throw new EnvManagerError('STORAGE_UNWRITABLE', `Could not delete ${kind} "${id}"`, {
        reason: error instanceof Error ? error.message : String(error),
      })
    }
    return { id, kind, deleted: true, blockers: [] }
  }

  async validate(): Promise<ValidationReport> {
    const snapshot = await this.snapshot()
    return {
      ok: !snapshot.diagnostics.some((item) => item.severity === 'error'),
      counts: this.counts(snapshot),
      diagnostics: snapshot.diagnostics,
    }
  }

  /**
   * Store one SSH/web credential in the DSH credential service and return only
   * its reference. Registry YAML must never contain the value itself.
   */
  async setCredential(ref: string, value: string): Promise<{ ref: string; configured: boolean }> {
    const cleanRef = String(ref || '').trim()
    if (!/^env-manager\/[A-Za-z0-9._-]{1,80}\/[A-Za-z0-9._-]{1,80}$/.test(cleanRef)) {
      throw new EnvManagerError(
        'INVALID_ARGUMENT',
        'Credential ref must look like env-manager/<environmentId>/<accountId>',
      )
    }
    if (typeof value !== 'string' || value.length === 0 || value.length > 8192) {
      throw new EnvManagerError('INVALID_ARGUMENT', 'Credential value must be between 1 and 8192 characters')
    }
    if (!this.options.credentials) {
      throw new EnvManagerError(
        'CREDENTIAL_UNAVAILABLE',
        'The DSH credential service is unavailable; the password was not stored',
      )
    }
    try {
      await this.options.credentials.set(cleanRef, value)
    } catch {
      this.options.logger.warn(`Credential write failed for ${cleanRef}`)
      throw new EnvManagerError(
        'CREDENTIAL_WRITE_FAILED',
        'Could not store the credential in the DSH credential service',
      )
    }
    return { ref: cleanRef, configured: true }
  }

  /** Remove a credential owned by this plugin; other namespaces are rejected. */
  async unsetCredential(ref: string): Promise<{ ref: string; removed: true }> {
    const cleanRef = String(ref || '').trim()
    if (!/^env-manager\/[A-Za-z0-9._-]{1,80}\/[A-Za-z0-9._-]{1,80}$/.test(cleanRef)) {
      throw new EnvManagerError(
        'INVALID_ARGUMENT',
        'Credential ref must look like env-manager/<environmentId>/<accountId>',
      )
    }
    if (!this.options.credentials) {
      throw new EnvManagerError('CREDENTIAL_UNAVAILABLE', 'The DSH credential service is unavailable')
    }
    try {
      await this.options.credentials.unset(cleanRef)
    } catch {
      this.options.logger.warn(`Credential delete failed for ${cleanRef}`)
      throw new EnvManagerError(
        'CREDENTIAL_WRITE_FAILED',
        'Could not remove the credential from the DSH credential service',
      )
    }
    return { ref: cleanRef, removed: true }
  }

  async resolve(request: ResolveRequest): Promise<ResolveOutcome> {
    const snapshot = await this.snapshot()
    const environment = lookupByRef(snapshot, 'environment', request.environmentId)
    if (!environment) {
      throw new EnvManagerError(
        'ENV_NOT_FOUND',
        `Environment "${request.environmentId}" was not found`,
        { environmentId: request.environmentId },
      )
    }
    const service = lookupByRef(snapshot, 'service', request.serviceId)
    if (!service) {
      throw new EnvManagerError(
        'SERVICE_NOT_FOUND',
        `Service "${request.serviceId}" was not found`,
        { serviceId: request.serviceId },
      )
    }
    const deployment = this.selectDeployment(snapshot, environment.id, service.id, request.deploymentId)
    const result = resolveContext({
      environment,
      service,
      deployment,
      ruleProfiles: snapshot.ruleProfiles,
    })
    if (!result.ok) {
      const first = result.diagnostics.find((item) => item.severity === 'error')
      throw new EnvManagerError(
        (first?.code as ErrorCode) ?? 'INTERNAL_ERROR',
        first?.message ?? 'Context resolution failed',
        { diagnostics: result.diagnostics },
      )
    }
    const credentials = await this.describeCredentials(environment.hosts, environment.clusters, environment.endpoints)
    const context = result.context
    const warnings: Diagnostic[] = []
    for (const credential of credentials) {
      if (!credential.configured) {
        warnings.push({
          code: 'CREDENTIAL_MISSING',
          severity: 'warning',
          message: `Credential "${credential.ref}" is not configured`,
          details: { ref: credential.ref },
        })
      }
    }
    context.credentials = credentials
    context.diagnostics = [...context.diagnostics, ...warnings]
    return { context, warnings }
  }

  async route(request: RouteRequest): Promise<OperationResolution> {
    const snapshot = await this.snapshot()
    let serviceId = request.serviceId
    if (!serviceId && request.deploymentId) {
      serviceId = snapshot.deployments.get(request.deploymentId)?.serviceId
    }
    if (!serviceId) {
      throw new EnvManagerError(
        'SERVICE_NOT_FOUND',
        'env_resolve_operation requires serviceId or a deploymentId that supplies one',
        { environmentId: request.environmentId, deploymentId: request.deploymentId },
      )
    }
    const resolved = await this.resolve({
      environmentId: request.environmentId,
      serviceId,
      deploymentId: request.deploymentId,
    })
    const resolution = await resolveOperation({
      operation: request.operation,
      context: resolved.context,
      bindings: [...snapshot.operationBindings.values()],
      skills: this.options.skills,
    })
    if (!resolution.ok) {
      const first = resolution.diagnostics.find((item) => item.severity === 'error')
      throw new EnvManagerError(
        (first?.code as ErrorCode) ?? 'INTERNAL_ERROR',
        first?.message ?? 'Operation resolution failed',
        { resolution },
      )
    }
    return resolution
  }

  async getContext(sessionId: string): Promise<SessionContext> {
    const result = await this.sessions.get(sessionId)
    return result.context
  }

  async setContext(sessionId: string, environmentId: string | null): Promise<SessionContext> {
    if (environmentId !== null) {
      const snapshot = await this.snapshot()
      if (!lookupByRef(snapshot, 'environment', environmentId)) {
        throw new EnvManagerError(
          'ENV_NOT_FOUND',
          `Environment "${environmentId}" was not found`,
          { environmentId },
        )
      }
    }
    const result = await this.sessions.set(sessionId, environmentId)
    return result.context
  }

  async needsProductionApproval(kind: RecordKind, raw: unknown): Promise<boolean> {
    const parsed = parseRecordInput(kind, raw)
    if (!parsed.ok) return false
    const snapshot = await this.snapshot()
    return this.isProductionRecord(kind, parsed.record, snapshot)
  }

  private mapFor(snapshot: RegistrySnapshot, kind: RecordKind) {
    switch (kind) {
      case 'environment':
        return snapshot.environments
      case 'service':
        return snapshot.services
      case 'deployment':
        return snapshot.deployments
      case 'ruleProfile':
        return snapshot.ruleProfiles
      case 'operationBinding':
        return snapshot.operationBindings
    }
  }

  private selectDeployment(
    snapshot: RegistrySnapshot,
    environmentId: string,
    serviceId: string,
    deploymentId?: string,
  ) {
    if (deploymentId) {
      const deployment = lookup(snapshot, 'deployment', deploymentId)
      if (
        !deployment ||
        deployment.environmentId !== environmentId ||
        deployment.serviceId !== serviceId
      ) {
        throw new EnvManagerError(
          'DEPLOYMENT_NOT_FOUND',
          `Deployment "${deploymentId}" does not bind ${environmentId}/${serviceId}`,
          { deploymentId, environmentId, serviceId },
        )
      }
      return deployment
    }
    const candidates = [...snapshot.deployments.values()].filter(
      (deployment) =>
        deployment.environmentId === environmentId && deployment.serviceId === serviceId,
    )
    if (candidates.length === 0) {
      throw new EnvManagerError(
        'DEPLOYMENT_NOT_FOUND',
        `No deployment binds ${environmentId}/${serviceId}`,
        { environmentId, serviceId },
      )
    }
    if (candidates.length > 1) {
      throw new EnvManagerError(
        'DEPLOYMENT_AMBIGUOUS',
        `${environmentId}/${serviceId} has ${candidates.length} deployments; pass deploymentId`,
        { candidates: candidates.map((item) => item.id) },
      )
    }
    return candidates[0]
  }

  private isProductionRecord(
    kind: RecordKind,
    record: AnyRecord,
    snapshot: RegistrySnapshot,
  ): boolean {
    if (kind === 'environment') {
      return (record as import('../domain/types.js').Environment).category === 'production'
    }
    if (kind === 'deployment') {
      const deployment = record as import('../domain/types.js').Deployment
      return snapshot.environments.get(deployment.environmentId)?.category === 'production'
    }
    if (kind === 'operationBinding') {
      const binding = record as OperationBinding
      if (binding.match.deploymentId) {
        const deployment = snapshot.deployments.get(binding.match.deploymentId)
        return deployment
          ? snapshot.environments.get(deployment.environmentId)?.category === 'production'
          : false
      }
      if (binding.match.environmentId) {
        return snapshot.environments.get(binding.match.environmentId)?.category === 'production'
      }
    }
    return false
  }

  private async describeCredentials(
    hosts: import('../domain/types.js').Host[],
    clusters: import('../domain/types.js').Cluster[],
    endpoints: import('../domain/types.js').AccessEndpoint[],
  ): Promise<CredentialStatus[]> {
    const refs = new Set<string>()
    for (const host of hosts) if (host.credentialRef) refs.add(host.credentialRef)
    for (const cluster of clusters) if (cluster.credentialRef) refs.add(cluster.credentialRef)
    for (const endpoint of endpoints) if (endpoint.credentialRef) refs.add(endpoint.credentialRef)
    const out: CredentialStatus[] = []
    for (const ref of [...refs].sort()) {
      if (!this.options.credentials) {
        out.push({ ref, configured: false })
        continue
      }
      try {
        const info = await this.options.credentials.describe(ref)
        out.push({ ref, configured: info.configured, source: info.source })
      } catch {
        out.push({ ref, configured: false })
      }
    }
    return out
  }
}
