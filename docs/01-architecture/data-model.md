# Data Model (V1)

Status: normative for V1 implementation.

Schema version: `1`.

This document defines the records stored by DSH Environment Manager, the validation rules applied to them, and the structured results returned by tools.

TypeScript declarations below are the source of truth for the Host implementation. YAML examples illustrate the on-disk form.

---

## 1. Conventions

### 1.1 Identifiers

- Pattern: `^[a-z0-9][a-z0-9-]{0,62}$` (1–63 characters).
- One namespace per record type: environment ids, service ids, deployment ids, rule profile ids and operation binding ids are unique within their own type.
- A record's `id` must equal its file name without extension.

### 1.2 Timestamps

- ISO 8601 with timezone, stored as UTC (`2026-11-01T03:00:00.000Z`).
- `createdAt` is set once; `updatedAt` changes on every write.

### 1.3 Record envelope

```ts
interface RecordMeta {
  id: string;
  schemaVersion: 1;
  createdAt: string;
  updatedAt: string;
}
```

### 1.4 Validation policy

- Unknown fields are rejected on write (`RECORD_INVALID`).
- On read, unknown fields are preserved and reported as `UNKNOWN_FIELD` warnings, so a
  hand-edited file is inspectable before it is fixed.
- Records with an unknown `schemaVersion` are skipped on read with a warning diagnostic.
- Records failing schema validation are skipped on read with a warning; they are not deleted.
- No field may contain a plain-text secret. `credentialRef` is a reference only.

---

## 2. Enumerations

```ts
type EnvironmentCategory = 'dev' | 'test' | 'staging' | 'production' | 'custom';

type RuntimeMode = 'native' | 'docker' | 'kubernetes';

type Status = 'configured-not-verified' | 'partially-verified' | 'verified';

type MatchLevel =
  | 'deployment'
  | 'environment-service'
  | 'service'
  | 'category-mode'
  | 'global';

type Severity = 'info' | 'warning' | 'error';
```

`EnvironmentCategory` drives the production policy check. `custom` never implies production.

---

## 3. Environment

An environment is the unit of topology: roles, hosts, clusters and access endpoints travel together in one file. Hosts and clusters are embedded entities rather than top-level records; this keeps co-location edits atomic. Cross-environment host sharing is out of V1 scope (see §14).

```ts
interface LogicalRole {
  id: string;               // e.g. management, business, extension
  name: string;
  description?: string;
}

interface Host {
  id: string;
  name: string;             // hostname
  os?: string;
  ip?: string;
  sshPort?: number;         // default 22
  roles: string[];          // LogicalRole ids; many-to-many is expected
  credentialRef?: string;
  note?: string;
}

interface Cluster {
  id: string;
  name: string;
  kind: 'kubernetes' | 'docker';
  apiEndpoint?: string;     // https://...
  namespaces?: string[];
  credentialRef?: string;
  note?: string;
}

interface AccessEndpoint {
  id: string;
  kind: 'ssh' | 'web' | 'k8s-api' | 'docker' | 'custom';
  hostRef?: string;         // Host.id inside this environment
  clusterRef?: string;      // Cluster.id inside this environment
  url?: string;
  port?: number;
  credentialRef?: string;
  note?: string;
}

interface Environment extends RecordMeta {
  name: string;
  aliases: string[];
  category: EnvironmentCategory;
  description?: string;
  roles: LogicalRole[];
  hosts: Host[];
  clusters: Cluster[];
  endpoints: AccessEndpoint[];
  ruleOverrides?: RuleOverride;   // see §7
}
```

### 3.1 Co-location rule

A host that serves both the management plane and the business plane is **one** `Host` with `roles: [management, business]`.

Forbidden: two host entries with the same hostname or IP that differ only by role.

Validation must reject duplicate host ids within an environment and duplicate `ip` values within an environment.

### 3.2 YAML example

```yaml
id: test-a
schemaVersion: 1
name: Test Environment A
aliases: [ta, test-a]
category: test
description: Main test environment for aicoservice
roles:
  - id: management
    name: Management Plane
  - id: business
    name: Business Plane
hosts:
  - id: host-001
    name: test-a-node-01
    os: ubuntu-22.04
    ip: 10.0.1.10
    sshPort: 22
    roles: [management, business]
    credentialRef: cred-test-a-root
clusters:
  - id: k8s-01
    name: test-a-k8s
    kind: kubernetes
    apiEndpoint: https://10.0.1.20:6443
    namespaces: [dv-sop]
    credentialRef: cred-test-a-kubeconfig
endpoints:
  - id: ep-ssh-01
    kind: ssh
    hostRef: host-001
    port: 22
    credentialRef: cred-test-a-root
  - id: ep-web-01
    kind: web
    url: https://test-a.example.internal
createdAt: 2026-11-01T03:00:00.000Z
updatedAt: 2026-11-01T03:00:00.000Z
```

---

## 4. Service

A service is environment-independent. Deployment placement lives in §5.

```ts
interface GitInfo {
  url: string;
  defaultBranch: string;    // default main
  modulePath?: string;      // monorepo subpath
}

interface BuildInfo {
  tool: 'maven' | 'gradle' | 'npm' | 'custom';
  command?: string;
}

interface ArtifactInfo {
  name: string;             // e.g. aicoservice.jar
  path?: string;            // template allowed
}

interface Service extends RecordMeta {
  name: string;
  aliases: string[];
  category: string;         // free-form service category, e.g. backend
  description?: string;
  git: GitInfo;
  build?: BuildInfo;
  artifact?: ArtifactInfo;
  deployModes: RuntimeMode[];   // at least one
  ruleProfileRefs: string[];    // ordered; later profiles win on field conflicts
}
```

### 4.1 YAML example

```yaml
id: aicoservice
schemaVersion: 1
name: Aico Service
aliases: [aicoservice]
category: backend
description: Core AI coordination service
git:
  url: https://git.example.internal/team/aicoservice.git
  defaultBranch: main
build:
  tool: maven
artifact:
  name: aicoservice.jar
deployModes: [native, docker, kubernetes]
ruleProfileRefs: [java-common, company-default]
createdAt: 2026-11-01T03:00:00.000Z
updatedAt: 2026-11-01T03:00:00.000Z
```

---

## 5. Deployment Binding

A deployment binding states which service runs where. A service may have several bindings in the same environment; `(environmentId, serviceId)` is therefore not unique.

```ts
interface NativeLocation {
  kind: 'native';
  hostRef: string;              // Host.id in the referenced environment
  installDir?: string;
  serviceName?: string;         // systemd unit or Windows service name
  processMatch?: string;        // process command-line fragment
}

interface DockerLocation {
  kind: 'docker';
  hostRef: string;
  containerName?: string;
  image?: string;
  volumes?: string[];
}

interface KubernetesLocation {
  kind: 'kubernetes';
  clusterRef: string;           // Cluster.id in the referenced environment
  namespace: string;
  workload: {
    kind: 'Deployment' | 'StatefulSet' | 'DaemonSet' | 'CronJob' | 'Pod';
    name: string;
  };
  container?: string;
}

type DeploymentLocation =
  | NativeLocation
  | DockerLocation
  | KubernetesLocation;

interface DeploymentBinding extends RecordMeta {
  name?: string;
  environmentId: string;
  serviceId: string;
  runtimeMode: RuntimeMode;
  location: DeploymentLocation;
  variables?: Record<string, string | number | boolean>;
  ruleOverrides?: RuleOverride;
}
```

Validation: `runtimeMode` must equal `location.kind`; the referenced host/cluster must exist in the referenced environment; the service must list `runtimeMode` in `deployModes`.

### 5.1 YAML example

```yaml
id: deploy-001
schemaVersion: 1
name: aicoservice-test-a
environmentId: test-a
serviceId: aicoservice
runtimeMode: kubernetes
location:
  kind: kubernetes
  clusterRef: k8s-01
  namespace: dv-sop
  workload:
    kind: Deployment
    name: aicoservice
  container: aicoservice
variables:
  replicaCount: 2
createdAt: 2026-11-01T03:00:00.000Z
updatedAt: 2026-11-01T03:00:00.000Z
```

---

## 6. Rule Profile

A rule profile is a shared template bundle. Overrides live on the environment (§3) and the deployment (§5).

```ts
interface LogSourceFile {
  kind: 'file';
  path: string;                 // template allowed
}

interface LogSourceContainer {
  kind: 'container-stdout';
  container: string;            // template allowed
}

interface LogSourcePod {
  kind: 'pod-logs';
  namespace: string;            // template allowed
  workload: string;             // template allowed
}

type LogSource = LogSourceFile | LogSourceContainer | LogSourcePod;

interface ClassLocation {
  kind: 'build-output' | 'deployed-dir' | 'jar-entry';
  path: string;                 // directory, or jar path for jar-entry
  entryPrefix?: string;         // jar-internal class prefix
}

interface RuleOverride {
  variables?: Record<string, string | number | boolean>;
  paths?: Record<string, string>;
  logSources?: Partial<Record<RuntimeMode, LogSource>>;
  classLocations?: Partial<Record<RuntimeMode, ClassLocation>>;
}

interface RuleProfile extends RecordMeta {
  name?: string;
  description?: string;
  variables?: Record<string, string | number | boolean>;
  paths?: Record<string, string>;
  logSources?: Partial<Record<RuntimeMode, LogSource>>;
  classLocations?: Partial<Record<RuntimeMode, ClassLocation>>;
}
```

`classLocation.kind` distinguishes the three real sources: build output (`target/classes`), a deployed directory of classes, or an entry inside a JAR. V1 never collapses these into one path.

### 6.1 YAML example

```yaml
id: java-common
schemaVersion: 1
description: Common Java service paths and log sources
variables:
  installRoot: /opt/company/services
paths:
  serviceHome: ${installRoot}/${service.id}
  jar: ${paths.serviceHome}/lib/${service.artifact.name}
  logDir: ${paths.serviceHome}/logs
  applicationLog: ${paths.logDir}/${service.id}.log
logSources:
  native:
    kind: file
    path: ${paths.applicationLog}
  docker:
    kind: container-stdout
    container: ${deployment.location.containerName}
  kubernetes:
    kind: pod-logs
    namespace: ${deployment.location.namespace}
    workload: ${deployment.location.workload.name}
classLocations:
  native:
    kind: deployed-dir
    path: ${paths.serviceHome}/classes
  kubernetes:
    kind: jar-entry
    path: ${paths.jar}
    entryPrefix: com/company/aico
createdAt: 2026-11-01T03:00:00.000Z
updatedAt: 2026-11-01T03:00:00.000Z
```

---

## 7. Operation Binding

```ts
interface OperationMatch {
  environmentId?: string;
  serviceId?: string;
  deploymentId?: string;
  deploymentMode?: RuntimeMode;
  serviceCategory?: string;
}

interface SkillReference {
  name: string;
  expectedSource?: string | null;    // SkillSummary.source, e.g. project-dsh
  expectedProvider?: string | null;  // SkillSummary.provider
}

interface OperationPolicy {
  requiresApproval: boolean;
  allowProduction: boolean;
}

interface OperationBinding extends RecordMeta {
  operation: string;              // standard id or custom id
  match: OperationMatch;          // empty object means global
  skill: SkillReference;
  parameters?: Record<string, string>;
  policy: OperationPolicy;
  enabled: boolean;
}
```

`match` must be one of five shapes; any other combination is `RECORD_INVALID`:

| Shape | Level |
|---|---|
| `{ deploymentId }` plus optional `environmentId`/`serviceId` | `deployment` |
| `{ environmentId, serviceId }` | `environment-service` |
| `{ serviceId }` | `service` |
| `{ serviceCategory, deploymentMode }` | `category-mode` |
| `{}` | `global` |

`environmentId` alone, `deploymentMode` alone, or `environmentId` + `deploymentMode` are
invalid: they would create a sixth level with no defined precedence.

### 7.1 Standard operation ids

```text
install, deploy, redeploy, replace, restart, upgrade, rollback, uninstall,
collect-logs, health-check, inspect, upload, download
```

Any other id is treated as a custom operation and must appear explicitly in a binding.

### 7.2 Write operations

`install`, `deploy`, `redeploy`, `replace`, `restart`, `upgrade`, `rollback`, `uninstall`, `upload` are write operations. For them, `policy.requiresApproval` defaults to `true` when the field is omitted, and a binding cannot implicitly grant production access.

### 7.3 YAML example

```yaml
id: binding-001
schemaVersion: 1
operation: redeploy
match:
  environmentId: test-a
  serviceId: aicoservice
skill:
  name: redeploy-k8s-service
  expectedSource: null
  expectedProvider: null
parameters:
  namespace: ${deployment.location.namespace}
  workload: ${deployment.location.workload.name}
  cluster: ${deployment.location.clusterRef}
policy:
  requiresApproval: true
  allowProduction: false
enabled: true
createdAt: 2026-11-01T03:00:00.000Z
updatedAt: 2026-11-01T03:00:00.000Z
```

---

## 8. Resolved results

### 8.1 Rule source and provenance

```ts
type RuleLayer = 'global' | 'service' | 'environment' | 'deployment';

interface RuleSource {
  layer: RuleLayer;
  ruleProfileId?: string;
  recordId?: string;             // environmentId / deploymentId / serviceId
}

interface ProvenanceInput {
  name: string;                  // e.g. paths.logDir
  source: RuleSource;
}

interface ProvenanceEntry {
  field: string;                 // e.g. paths.applicationLog, logSources.kubernetes.namespace
  definedBy: RuleSource;         // layer that supplied the winning template
  inputs: ProvenanceInput[];     // referenced fields and their winning sources
  shadowed: RuleSource[];        // lower-priority definitions that lost
  value: string | number | boolean;
}

interface ResolvedField<T> {
  value: T;
  provenance: ProvenanceEntry;
}

interface ResolvedStructured<T> {
  value: T;
  provenance: ProvenanceEntry[];  // one entry per property
}
```

`definedBy` answers "where did this template come from". `inputs` answers "what influenced the final value". Both are required: an override of `paths.logDir` changes `paths.applicationLog` even though the latter was defined at the service layer.

### 8.2 Service Context

```ts
interface CredentialStatus {
  ref: string;
  configured: boolean;
  source?: string;           // where the value lives, e.g. profile-vault
}

interface ServiceContext {
  environmentId: string;
  environmentName: string;
  environmentCategory: EnvironmentCategory;
  serviceId: string;
  serviceName: string;
  serviceCategory: string;
  deploymentId: string;
  deploymentName?: string;
  runtimeMode: RuntimeMode;
  source: {
    gitUrl?: string;
    defaultBranch?: string;
    modulePath?: string;
  };
  artifact?: {
    name: string;
    path?: string;
  };
  location: DeploymentLocation;
  variables: Record<string, ResolvedField<string | number | boolean>>;
  paths: Record<string, ResolvedField<string>>;
  logSource?: ResolvedStructured<LogSource>;
  classLocation?: ResolvedStructured<ClassLocation>;
  ruleProfiles: string[];
  status: Status;
  credentials: CredentialStatus[];
  diagnostics: Diagnostic[];
}
```

`status` starts as `configured-not-verified`. Without an online check, V1 must not claim `verified`.

### 8.3 Operation Resolution

```ts
interface Diagnostic {
  code: string;
  severity: Severity;
  message: string;
  file?: string;                 // registry-relative file name
  path?: string;                 // field path, e.g. ruleProfileRefs[0]
  details?: Record<string, unknown>;
}

interface ResolvedSkillReference {
  name: string;
  source?: string | null;
  provider?: string | null;
  available: boolean | 'unknown';
}

interface OperationResolution {
  ok: boolean;
  operation: string;
  requested: {
    environmentId: string;
    serviceId?: string;
    deploymentId?: string;
  };
  matchedBindingId?: string;
  matchLevel?: MatchLevel;
  skill?: ResolvedSkillReference;
  parameters?: Record<string, string>;
  policy?: OperationPolicy;
  diagnostics: Diagnostic[];
}
```

---

## 9. Session context

```ts
interface SessionContext {
  sessionId: string;
  defaultEnvironmentId: string | null;
  persisted: boolean;
  updatedAt: string;
}
```

Session context is per session and never mutates registry records. It is stored under `sessions/` in the plugin data directory, keyed by session id.

---

## 10. Operation record (P1 boundary)

```ts
interface OperationRecord {
  id: string;
  sessionId: string;
  environmentId: string;
  serviceId?: string;
  deploymentId?: string;
  operation: string;
  skillRef?: string;
  startedAt: string;
  finishedAt?: string;
  outcome: 'success' | 'failure' | 'unknown';
  evidenceRefs: string[];        // opaque, sanitized references
  summary: string;
}
```

V1 defines the type and a no-op bridge; it does not persist operation records itself.

---

## 11. Diagnostics catalogue

| Code | Severity | Meaning |
|---|---|---|
| `ENV_NOT_FOUND` | error | Environment id does not exist |
| `SERVICE_NOT_FOUND` | error | Service id does not exist |
| `DEPLOYMENT_NOT_FOUND` | error | Deployment id does not exist |
| `HOST_NOT_FOUND` | error | Deployment host reference is missing in the environment |
| `CLUSTER_NOT_FOUND` | error | Deployment cluster reference is missing in the environment |
| `RULE_PROFILE_NOT_FOUND` | error | `ruleProfileRefs` names a missing profile |
| `DEPLOYMENT_AMBIGUOUS` | error | No deployment id given and several bindings match |
| `DUPLICATE_ID` | warning | Two files declare the same id; the later file is skipped |
| `BINDING_NOT_FOUND` | error | No operation binding matches the context |
| `RECORD_INVALID` | error | Record failed schema validation |
| `RECORD_IN_USE` | error | Record is still referenced and cannot be deleted |
| `RECORD_LIMIT_EXCEEDED` | error | Record count would exceed `maxRecords` |
| `RECORD_TOO_LARGE` | error | Serialized record exceeds 1 MiB |
| `INVALID_ARGUMENT` | error | Tool or request input failed validation |
| `FORBIDDEN` | error | Request rejected by transport policy |
| `STORAGE_UNWRITABLE` | error | Data directory cannot be written |
| `SCHEMA_UNSUPPORTED` | warning | Unknown `schemaVersion`, record skipped |
| `UNKNOWN_FIELD` | warning | Read-only: a field outside the schema is present |
| `RULE_TEMPLATE_INVALID` | error | Malformed `${...}` or identifier |
| `RULE_UNDEFINED_VARIABLE` | error | Template references an unknown field |
| `RULE_CYCLE` | error | Template variable cycle |
| `RULE_PATH_TRAVERSAL` | error | Resolved path contains `..` |
| `RULE_TYPE_MISMATCH` | error | Template used where a non-string value is required |
| `OPERATION_UNKNOWN` | error | Operation is neither standard nor bound |
| `BINDING_CONFLICT` | error | Multiple bindings at the highest match level |
| `SKILL_UNAVAILABLE` | error | Skill not registered, or source/provider mismatch |
| `SKILL_REGISTRY_UNAVAILABLE` | warning | Skill registry cannot be queried; availability unknown |
| `POLICY_DENIED` | error | Production policy or approval policy rejects the operation |
| `PARAMETER_RESOLUTION_FAILED` | error | Parameter template failed to resolve |
| `CREDENTIAL_MISSING` | warning | `credentialRef` has no configured value |
| `MEMORY_BRIDGE_UNAVAILABLE` | warning | Memory plugin not installed |
| `SESSION_CONTEXT_UNAVAILABLE` | error | A session-scoped tool ran without an owning agent |
| `SESSION_CONTEXT_UNPERSISTED` | warning | Session state could not be written |
| `INTERNAL_ERROR` | error | Unexpected failure, message redacted |

---

## 12. Referential integrity

Validated on every write and by `env_validate`:

1. `DeploymentBinding.environmentId` exists.
2. `DeploymentBinding.serviceId` exists.
3. `DeploymentBinding.location.hostRef` exists in that environment (native/docker).
4. `DeploymentBinding.location.clusterRef` exists in that environment (kubernetes).
5. `Service.ruleProfileRefs` all exist.
6. `Environment.hosts[].roles` reference declared roles.
7. `Environment.endpoints[].hostRef` / `clusterRef` exist in that environment.
8. `OperationBinding` match references (when present) exist.
9. `OperationBinding.skill.name` is non-empty.

Broken references are reported, never silently repaired.

---

## 13. Identity and cardinality

```text
Environment 1 ── N Host
Environment 1 ── N Cluster
Environment 1 ── N Role
Host        N ── N Role          (via Host.roles)
Host        N ── N Environment   (out of V1; hosts are embedded)
Service     1 ── N DeploymentBinding
Environment 1 ── N DeploymentBinding
Service     1 ── N RuleProfile    (ordered ruleProfileRefs)
OperationBinding N ── predicate over Environment/Service/Deployment
```

---

## 14. Out-of-scope model changes

The following are deliberately postponed:

- Extracting hosts into a top-level registry for cross-environment sharing.
- Storing discovered assets separately from declared assets.
- Vector or embedding-based retrieval for services.
- Per-user permissions inside one DSH profile.
