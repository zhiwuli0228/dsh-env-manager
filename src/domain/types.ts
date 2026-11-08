export type RecordKind =
  | 'environment'
  | 'service'
  | 'deployment'
  | 'ruleProfile'
  | 'operationBinding'

/** DR role of an environment inside its disaster-recovery topology. */
export type DrRole = 'primary' | 'standby'

export type RuntimeMode = 'native' | 'docker' | 'kubernetes'

export type EnvironmentCategory = 'dev' | 'test' | 'staging' | 'production' | 'custom'

export type Status = 'configured-not-verified' | 'partially-verified' | 'verified'

export type Severity = 'info' | 'warning' | 'error'

export type MatchLevel =
  | 'deployment'
  | 'environment-service'
  | 'environment'
  | 'service'
  | 'category-mode'
  | 'global'

export type Actor = 'agent' | 'ui'

export interface Diagnostic {
  code: string
  severity: Severity
  message: string
  file?: string
  path?: string
  details?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export interface RecordMeta {
  id: string
  schemaVersion: 1
  createdAt: string
  updatedAt: string
}

export interface LogicalRole {
  id: string
  name: string
  description?: string
}

export type HostKind = 'vm' | 'physical' | 'k8s-all-in-one' | 'k8s-worker' | 'pod-host'

export type HostAccessMethod = 'ssh' | 'kubectl' | 'docker'

export type ClusterTopology = 'all-in-one' | 'separate' | 'external'

export interface Host {
  id: string
  name: string
  kind?: HostKind
  os?: string
  platform?: string
  ip?: string
  publicIp?: string
  sshPort?: number
  roles: string[]
  access?: HostAccessMethod[]
  clusterRef?: string
  adminUser?: string
  isActive?: boolean
  credentialRef?: string
  accounts?: HostAccount[]
  note?: string
}

export type LoginProtocol = 'ssh' | 'rdp' | 'web' | 'k8s-api' | 'docker' | 'custom'

export type LoginAuthType = 'password' | 'private-key' | 'agent' | 'token' | 'other'

export interface HostAccount {
  id: string
  username: string
  purpose?: string
  protocol?: LoginProtocol
  loginUrl?: string
  port?: number
  authType?: LoginAuthType
  credentialRef?: string
  lastLoginAt?: string
  lastLoginFrom?: string
  note?: string
}

export type LoginResult = 'success' | 'failure'

export interface LoginRecord {
  id: string
  at: string
  username: string
  hostRef?: string
  accountId?: string
  protocol?: LoginProtocol
  sourceIp?: string
  result: LoginResult
  note?: string
}

export interface Cluster {
  id: string
  name: string
  kind: 'kubernetes' | 'docker'
  topology?: ClusterTopology
  apiEndpoint?: string
  namespaces?: string[]
  credentialRef?: string
  note?: string
}

export interface AccessEndpoint {
  id: string
  kind: 'ssh' | 'web' | 'k8s-api' | 'docker' | 'custom'
  hostRef?: string
  clusterRef?: string
  url?: string
  port?: number
  credentialRef?: string
  note?: string
}

export interface LogSourceFile {
  kind: 'file'
  path: string
}

export interface LogSourceContainer {
  kind: 'container-stdout'
  container: string
}

export interface LogSourcePod {
  kind: 'pod-logs'
  namespace: string
  workload: string
}

export type LogSource = LogSourceFile | LogSourceContainer | LogSourcePod

export interface ClassLocation {
  kind: 'build-output' | 'deployed-dir' | 'jar-entry'
  path: string
  entryPrefix?: string
}

export interface RuleOverride {
  variables?: Record<string, string | number | boolean>
  paths?: Record<string, string>
  logSources?: Partial<Record<RuntimeMode, LogSource>>
  classLocations?: Partial<Record<RuntimeMode, ClassLocation>>
}

/**
 * Disaster-recovery marking carried by the environment record itself. An
 * environment is either the production/primary site or the standby/DR site of
 * a pair; `type` describes the topology (AS 主备, AA 双活, AP 主从, or a custom
 * code) and `peer` names the partner environment. The marking is metadata: it
 * never triggers writes, and no failover/switch operation exists.
 */
export interface EnvironmentDr {
  /** primary = 生产/主用, standby = 容灾/备用. */
  role: DrRole
  /** Topology code: AS | AA | AP or a custom short token (≤16 chars). */
  type: string
  /** The partner environment id, when this environment is one half of a pair. */
  peer?: string
  /** 同城 / 异地 / custom free text, optional. */
  scope?: string
  /** Recovery point objective in minutes, optional. */
  rpoMinutes?: number
  /** Recovery time objective in minutes, optional. */
  rtoMinutes?: number
  note?: string
}

export interface Environment extends RecordMeta {
  name: string
  aliases: string[]
  category: EnvironmentCategory
  description?: string
  dr?: EnvironmentDr
  roles: LogicalRole[]
  hosts: Host[]
  clusters: Cluster[]
  endpoints: AccessEndpoint[]
  loginRecords?: LoginRecord[]
  ruleOverrides?: RuleOverride
}

export interface GitInfo {
  url: string
  defaultBranch: string
  modulePath?: string
}

export interface BuildInfo {
  tool: 'maven' | 'gradle' | 'npm' | 'custom'
  command?: string
}

export interface ArtifactInfo {
  name: string
  path?: string
}

export interface Service extends RecordMeta {
  name: string
  aliases: string[]
  category: string
  description?: string
  git: GitInfo
  build?: BuildInfo
  artifact?: ArtifactInfo
  deployModes: RuntimeMode[]
  ruleProfileRefs: string[]
}

export interface NativeLocation {
  kind: 'native'
  hostRef: string
  installDir?: string
  serviceName?: string
  processMatch?: string
}

export interface DockerLocation {
  kind: 'docker'
  hostRef: string
  containerName?: string
  image?: string
  volumes?: string[]
}

export interface KubernetesLocation {
  kind: 'kubernetes'
  clusterRef: string
  namespace: string
  workload: {
    kind: 'Deployment' | 'StatefulSet' | 'DaemonSet' | 'CronJob' | 'Pod'
    name: string
  }
  container?: string
}

export type DeploymentLocation = NativeLocation | DockerLocation | KubernetesLocation

export interface Deployment extends RecordMeta {
  name?: string
  environmentId: string
  serviceId: string
  runtimeMode: RuntimeMode
  location: DeploymentLocation
  variables?: Record<string, string | number | boolean>
  ruleOverrides?: RuleOverride
}

export interface RuleProfile extends RecordMeta {
  name?: string
  description?: string
  variables?: Record<string, string | number | boolean>
  paths?: Record<string, string>
  logSources?: Partial<Record<RuntimeMode, LogSource>>
  classLocations?: Partial<Record<RuntimeMode, ClassLocation>>
}

export interface SkillReference {
  name: string
  expectedSource?: string | null
  expectedProvider?: string | null
}

export interface OperationMatch {
  environmentId?: string
  serviceId?: string
  deploymentId?: string
  deploymentMode?: RuntimeMode
  serviceCategory?: string
}

export interface OperationPolicy {
  requiresApproval: boolean
  allowProduction: boolean
}

/**
 * How a binding's operation is carried out. `skill` keeps the V1 discovery-only
 * behavior (the agent invokes the Skill); `script` and `command` run a local
 * process through the executor; `remote` is prepared as an SSH command descriptor
 * because the plugin cannot read credential values.
 */
export type ExecutionMode = 'skill' | 'script' | 'command' | 'remote'

export interface ScriptExecution {
  mode: 'script'
  /** Script path relative to `<dataDir>/scripts`; absolute paths and `..` are rejected. */
  path: string
  /** Explicit interpreter; defaults by extension (.sh→bash, .ps1→pwsh, .py→python, .js/.mjs/.cjs→node). */
  interpreter?: 'bash' | 'sh' | 'pwsh' | 'python' | 'node'
  /** Extra argv items appended to the interpreter invocation; interpolated like parameters. */
  args?: string[]
  timeoutSeconds?: number
}

export interface CommandExecution {
  mode: 'command'
  /** argv[0] is the executable; every item is interpolated. Spawned without a shell. */
  argv: string[]
  /** Working directory relative to `<dataDir>`; defaults to the data directory. */
  workingDirectory?: string
  timeoutSeconds?: number
}

export interface RemoteExecution {
  mode: 'remote'
  /** Environment host id; defaults to the first host that accepts ssh. */
  hostRef?: string
  /** SSH user or account username; may be a template. Must never be a secret. */
  username?: string
  /** Shell command executed on the host; interpolated. */
  command: string
  timeoutSeconds?: number
}

export type ExecutionTarget = ScriptExecution | CommandExecution | RemoteExecution

export interface OperationBinding extends RecordMeta {
  operation: string
  match: OperationMatch
  /** Discovery-only target: the agent invokes the named Skill. */
  skill?: SkillReference
  /** Executable target: script, local command or prepared remote command. */
  execute?: ExecutionTarget
  parameters?: Record<string, string | number | boolean>
  policy: OperationPolicy
  enabled: boolean
}

export type AnyRecord =
  | Environment
  | Service
  | Deployment
  | RuleProfile
  | OperationBinding

export type RecordByKind = {
  environment: Environment
  service: Service
  deployment: Deployment
  ruleProfile: RuleProfile
  operationBinding: OperationBinding
}

// ---------------------------------------------------------------------------
// Resolved results
// ---------------------------------------------------------------------------

export type RuleLayer = 'global' | 'service' | 'environment' | 'deployment'

export interface RuleSource {
  layer: RuleLayer
  ruleProfileId?: string
  recordId?: string
}

export interface ProvenanceInput {
  name: string
  source: RuleSource
}

export interface ProvenanceEntry {
  field: string
  definedBy: RuleSource
  inputs: ProvenanceInput[]
  shadowed: RuleSource[]
  value: string | number | boolean
}

export interface ResolvedField<T> {
  value: T
  provenance: ProvenanceEntry
}

export interface ResolvedStructured<T> {
  value: T
  provenance: ProvenanceEntry[]
}

export interface CredentialStatus {
  ref: string
  configured: boolean
  source?: string
}

export interface ServiceContext {
  environmentId?: string
  environmentName?: string
  environmentCategory?: EnvironmentCategory
  // At least one anchor is required: serviceId for service-scoped operations and
  // contexts, or environmentId for environment-scoped ones (e.g. deploy-environment).
  serviceId?: string
  serviceName?: string
  serviceCategory?: string
  deploymentId?: string
  deploymentName?: string
  runtimeMode?: RuntimeMode
  source: {
    gitUrl?: string
    defaultBranch?: string
    modulePath?: string
  }
  artifact?: {
    name: string
    path?: string
  }
  location?: DeploymentLocation
  variables: Record<string, ResolvedField<string | number | boolean>>
  paths: Record<string, ResolvedField<string>>
  logSource?: ResolvedStructured<LogSource>
  classLocation?: ResolvedStructured<ClassLocation>
  ruleProfiles: string[]
  status: Status
  credentials: CredentialStatus[]
  diagnostics: Diagnostic[]
}

export interface ResolvedSkillReference {
  name: string
  source?: string | null
  provider?: string | null
  available: boolean | 'unknown'
}

export interface ResolvedTarget {
  mode: ExecutionMode
  skill?: ResolvedSkillReference
  script?: { path: string; interpreter: string; args: string[] }
  command?: { argv: string[]; workingDirectory?: string }
  remote?: {
    hostId?: string
    hostName?: string
    address?: string
    port?: number
    username?: string
    command: string
    credentialRef?: string
  }
  timeoutSeconds?: number
}

export interface OperationResolution {
  ok: boolean
  operation: string
  requested: {
    environmentId?: string
    serviceId?: string
    deploymentId?: string
  }
  matchedBindingId?: string
  matchLevel?: MatchLevel
  skill?: ResolvedSkillReference
  target?: ResolvedTarget
  parameters?: Record<string, string>
  policy?: OperationPolicy
  /** Lessons and summaries relevant to this operation/scope, newest first. */
  experiences?: ExperienceSummary[]
  diagnostics: Diagnostic[]
}

// ---------------------------------------------------------------------------
// Executed operations and the experience loop
// ---------------------------------------------------------------------------

export type ExperienceOutcome = 'success' | 'failure' | 'skipped'

export type ExperienceKind = 'success-summary' | 'failure-lesson'

export type ExperienceStatus = 'proposed' | 'accepted' | 'rejected'

export interface ExperienceRecord extends RecordMeta {
  operation: string
  bindingId?: string
  environmentId?: string
  serviceId?: string
  deploymentId?: string
  mode: ExecutionMode
  outcome: ExperienceOutcome
  kind: ExperienceKind
  title: string
  /** Redacted, bounded (8000 chars) narrative: what happened, why it worked or failed, what to do next time. */
  content: string
  tags: string[]
  status: ExperienceStatus
  evidenceRefs: string[]
  executedAt: string
  reviewedAt?: string
  reviewedBy?: Actor
  reviewNote?: string
}

export interface ExperienceSummary {
  id: string
  kind: ExperienceKind
  outcome: ExperienceOutcome
  title: string
  status: ExperienceStatus
  executedAt: string
  content: string
}

export interface OperateRequest {
  operation: string
  environmentId?: string
  serviceId?: string
  deploymentId?: string
  /** true only after the user (or the native approval prompt) approved a gated execution. */
  confirm?: boolean
  /** Resolve and gate but do not run anything. */
  dryRun?: boolean
  /** Free-form note stored with the experience record. */
  note?: string
  signal?: AbortSignal
}

export interface ExecutionOutcome {
  status: 'prepared' | 'completed' | 'failed' | 'rejected'
  exitCode?: number
  stdout?: string
  stderr?: string
  durationMs: number
  prepared?: {
    kind: ExecutionMode
    skill?: ResolvedSkillReference
    script?: { path: string; interpreter: string }
    command?: { argv: string[]; workingDirectory?: string }
    remote?: {
      command: string
      hostId?: string
      address?: string
      port?: number
      username?: string
      credentialRef?: string
    }
  }
  diagnostics: Diagnostic[]
}

export interface OperateResult {
  resolution: OperationResolution
  execution: ExecutionOutcome
  experience?: ExperienceSummary
  warnings: Diagnostic[]
}

export interface ExperienceFilter {
  operation?: string
  environmentId?: string
  serviceId?: string
  kind?: ExperienceKind
  status?: ExperienceStatus
  limit?: number
}

export interface SessionContext {
  sessionId: string
  defaultEnvironmentId: string | null
  persisted: boolean
}

// ---------------------------------------------------------------------------
// Query / use-case results
// ---------------------------------------------------------------------------

export interface RecordSummary {
  kind: RecordKind
  id: string
  name: string
  summary?: string
}

export interface ListResult {
  items: RecordSummary[]
  warnings: Diagnostic[]
}

export interface GetResult {
  record: AnyRecord
  yaml: string
}

export interface FindHit {
  kind: RecordKind
  id: string
  name: string
  field: 'id' | 'name' | 'alias' | 'category'
}

export interface FindResult {
  hits: FindHit[]
}

export interface SaveResult {
  id: string
  kind: RecordKind
  created: boolean
  dryRun: boolean
  warnings: Diagnostic[]
}

export interface RemoveResult {
  id: string
  kind: RecordKind
  deleted: boolean
  blockers: Diagnostic[]
}

export interface ValidationReport {
  ok: boolean
  counts: Record<string, number>
  diagnostics: Diagnostic[]
}

export interface MetaResult {
  dataDir: string
  version: string
  counts: Record<string, number>
  warnings: Diagnostic[]
}

export interface SaveOptions {
  dryRun?: boolean
}

export interface RemoveOptions {
  dryRun?: boolean
}

export interface ResolveRequest {
  environmentId?: string
  serviceId: string
  deploymentId?: string
}

export interface RouteRequest {
  operation: string
  environmentId?: string
  serviceId?: string
  deploymentId?: string
}

export interface SkillSummary {
  name: string
  description?: string
  whenToUse?: string
  source?: string
  provider?: string
}

export interface SkillSnapshot {
  skills: SkillSummary[]
  complete: boolean
}

export interface SkillDirectory {
  snapshot(options?: { signal?: AbortSignal }): Promise<SkillSnapshot>
}

export interface CredentialDirectory {
  describe(ref: string): Promise<{ configured: boolean; source?: string }>
  set(ref: string, value: string): Promise<void>
  unset(ref: string): Promise<void>
}

export interface RegistrySnapshot {
  environments: Map<string, Environment>
  services: Map<string, Service>
  deployments: Map<string, Deployment>
  ruleProfiles: Map<string, RuleProfile>
  operationBindings: Map<string, OperationBinding>
  byAlias: Map<string, string>
  diagnostics: Diagnostic[]
  loadedAt: string
}

// ---------------------------------------------------------------------------
// Bulk import / export
// ---------------------------------------------------------------------------

/** A self-contained environment bundle: environments plus the records that
 * reference them. DR marking travels inside each environment (`dr`). Only
 * `credentialRef` names are ever present — never values. */
export interface BundleDocument {
  version: 1
  exportedAt?: string
  environments?: Environment[]
  services?: Service[]
  deployments?: Deployment[]
  ruleProfiles?: RuleProfile[]
  operationBindings?: OperationBinding[]
}

export type ImportConflictMode = 'skip' | 'overwrite' | 'error'

export interface ImportedRecordRef {
  kind: RecordKind
  id: string
}

export interface ImportFailure {
  kind: RecordKind
  id?: string
  index: number
  code: string
  message: string
}

export interface ImportResult {
  imported: ImportedRecordRef[]
  skipped: ImportedRecordRef[]
  failed: ImportFailure[]
  warnings: Diagnostic[]
}

export interface ImportRequest {
  document: unknown
  mode?: ImportConflictMode
  confirm?: boolean
}
