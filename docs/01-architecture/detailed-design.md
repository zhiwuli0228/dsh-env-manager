# Detailed Design (V1)

> Status: normative implementation design for V1. It refines
> [`design.md`](design.md) into module-level contracts and depends on the verified
> runtime facts in [`api-verification.md`](api-verification.md).
> Record shapes are defined in [`data-model.md`](data-model.md); do not restate or
> extend them here without updating that document.

## 1. Scope

This document specifies:

1. the plugin configuration and its effective defaults;
2. every Host module's public interface and internal algorithm;
3. the exact `defineTool` contract for all ten tools;
4. the plugin-owned HTTP API used by the Client panel;
5. error mapping, limits, concurrency and test obligations.

UI screens and copy are in [`ui-design.md`](ui-design.md); build and packaging are in
[`design.md`](design.md) §15 and [`implementation-plan.md`](implementation-plan.md).

## 2. Conventions

- Host: TypeScript, ESM, `strict`.
- Runtime validation: Zod. Tool parameter validation: DSH's schema DSL (F3).
- Files: YAML 1.2 via the `yaml` package; no anchors/aliases are emitted.
- Time: ISO-8601 UTC with milliseconds, produced by `new Date().toISOString()`.
- Paths: POSIX separators inside resolved values; OS-native paths only at the
  filesystem boundary.
- All expected failures are `EnvManagerError extends HarnessError` (F5) with a code
  from `data-model.md` §11.

## 3. Configuration

```ts
// src/config.ts
import z from '@deepseek-ai/schemastery'

export const Config = z.object({
  dataDir: z.string().description('Registry directory; relative paths resolve against the profile directory.'),
  maxRecords: z.natural().default(2000),
  writePolicy: z.object({
    allowUiProductionWrites: z.boolean().default(false),
    requireApprovalForDelete: z.boolean().default(true),
    requireApprovalForProductionSave: z.boolean().default(true),
  }).default({}),
  defaults: z.object({
    environmentId: z.string().default(''),
  }).default({}),
})
```

| Field | Default | Meaning |
|---|---|---|
| `dataDir` | profile data dir | Registry root; see §4.1 |
| `maxRecords` | 2000 | hard cap per record kind; exceeding it fails a write |
| `writePolicy.allowUiProductionWrites` | false | allow the HTTP API to write production records |
| `writePolicy.requireApprovalForDelete` | true | `env_delete` asks the human first |
| `writePolicy.requireApprovalForProductionSave` | true | `env_save` on a production environment asks first |
| `defaults.environmentId` | empty | fallback when neither an argument nor the session default exists |

Rules:

- The config schema is schemastery (F1/F18), not Zod. Do not add a second config path.
- Config is read-only at runtime; there is no write API. The Client shows effective
  values only.
- A blank `dataDir` means "use the resolution order in §4.1", not "current directory".

## 4. Storage

### 4.1 Data directory resolution

```text
1. config.dataDir, if set:
     absolute  -> use as-is
     relative  -> path.resolve(profileDir, config.dataDir)
2. profileDir from ctx.get('profileContext')?.dir
     -> <profileDir>/data/dsh-env-manager
3. process.env.DSH_PROFILE_DIR
     -> <DSH_PROFILE_DIR>/data/dsh-env-manager
4. process.cwd()/data/dsh-env-manager
```

`profileDir` may be unavailable in an embedded host; step 3 and 4 keep the plugin
usable. The resolved absolute path is memoized for the process lifetime, logged once,
and reported by `env_get_context` and the UI overview. It is never derived from model
input.

### 4.2 Layout

```text
<dataDir>/
├── environments/<environmentId>.yaml
├── services/<serviceId>.yaml
├── deployments/<deploymentId>.yaml
├── rules/<ruleProfileId>.yaml
├── operations/<bindingId>.yaml
├── sessions/<sessionId>.json
└── .backups/<kind>/<id>/<timestamp>.yaml      (rolling, max 5)
```

- The file name is always `<id>.yaml`; the record `id` must equal the file stem.
- `sessions/` and `.backups/` are never scanned as registry records.
- Directories are created lazily by the first write; a missing root on read yields an
  empty registry, not an error.

### 4.3 Id and path safety

```ts
const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,62}$/
```

`resolveRecordPath(kind, id)` rejects a non-matching id **before** touching the
filesystem, then verifies `path.resolve(dir, id + '.yaml')` starts with
`path.resolve(dir) + path.sep`. Session ids are validated as `[A-Za-z0-9_-]{1,128}`
and hashed only if they fail that pattern.

### 4.4 Atomic write protocol

```ts
async function writeRecord(kind, id, record) {
  const target = resolveRecordPath(kind, id)
  await mkdir(dirname(target), { recursive: true })
  const tmp = join(dirname(target), `.${id}.${process.pid}.${randomUUID()}.tmp`)
  const text = stringifyYaml(record)
  const handle = await open(tmp, 'w')
  try {
    await handle.writeFile(text, 'utf8')
    await handle.sync()
  } finally {
    await handle.close()
  }
  await rotateBackup(kind, id, target)   // copy previous file, prune to 5
  await rename(tmp, target)              // atomic replace on POSIX and Windows
  return { file: target, bytes: Buffer.byteLength(text) }
}
```

Guarantees:

- A reader never sees a partially written record.
- A crash before `rename` leaves an ignorable `.tmp` file; startup cleanup removes
  `*.tmp` older than one hour.
- Backup failure does not block the write; it is reported as a warning.
- `writeRecord` is serialized per target path by an in-process promise chain (§4.8).

### 4.5 Read protocol

```ts
async function readRecord(kind, id): Promise<ReadResult> {
  const target = resolveRecordPath(kind, id)
  let text
  try { text = await readFile(target, 'utf8') }
  catch (e) { if (e.code === 'ENOENT') return { found: false }; throw e }
  const parsed = parseYamlDocument(text)          // throws RECORD_INVALID
  return { found: true, raw: parsed, text }
}
```

Invalid YAML, a non-object document, an id/filename mismatch, or a schema failure
produces a `Diagnostic` and the record is treated as absent for that request. The file
is never rewritten or deleted.

Unknown keys are preserved on read and reported as an `UNKNOWN_FIELD` warning, but
`env_save` rejects them (`RECORD_INVALID`) so a typo cannot enter the store. Storage
therefore parses twice: `.passthrough()` on read, strict on save.

### 4.6 Delete

```text
1. Resolve the target and confirm it exists.
2. Ask the registry whether any record references it (§6.3).
3. If referenced -> RECORD_IN_USE listing referrers.
4. Otherwise rotate a backup, then unlink the file.
```

Deleting a session file is a plain unlink and needs no reference check.

### 4.7 Session files

```json
{
  "schemaVersion": 1,
  "sessionId": "01J...",
  "defaultEnvironmentId": "test-a",
  "updatedAt": "2026-11-01T03:00:00.000Z"
}
```

Written with the same temp+rename protocol. A corrupt or unreadable file is reported
as `persisted: false` and treated as "no default"; it is not deleted.

### 4.8 Concurrency

- One serialized chain per file path (`Map<string, Promise<void>>`), released when the
  chain drains.
- Registry loads are deduplicated: concurrent callers share one in-flight load.
- No cross-process lock in V1. Two DSH processes writing the same file can lose one
  update; the backup makes the loss recoverable. Documented as a limitation.

### 4.9 Limits

| Limit | Value | Failure |
|---|---|---|
| records per kind | `maxRecords` (2000) | `RECORD_LIMIT_EXCEEDED` |
| record YAML bytes | 1 MiB | `RECORD_TOO_LARGE` |
| session file bytes | 64 KiB | `SESSION_CONTEXT_UNPERSISTED` |

## 5. Domain

```ts
// src/domain/types.ts
export type RecordKind = 'environment' | 'service' | 'deployment' | 'ruleProfile' | 'operationBinding'
export type AnyRecord = Environment | Service | Deployment | RuleProfile | OperationBinding
```

`src/domain/schemas.ts` exports one Zod schema per record plus:

```ts
export function parseRecord(kind: RecordKind, value: unknown, origin: string):
  { ok: true; record: AnyRecord } | { ok: false; diagnostic: Diagnostic }
```

Validation responsibilities:

- `RecordMeta`: id pattern, `schemaVersion === 1`, ISO timestamps, `updatedAt >= createdAt`.
- Cross-field rules from `data-model.md`: at least one `deployModes`, host role ids
  exist, `location.kind === runtimeMode`, unique host id / ip / cluster id /
  endpoint id, unique account id per host, `loginRecords[].hostRef`/`accountId`
  resolve within the environment, `paths` keys and variable names match
  `[A-Za-z_][A-Za-z0-9_]*`.
- `structural` shape only. Referential integrity is the registry's job (§6.3), because
  it needs the whole snapshot.

`parseRecord` never throws for bad data; it returns a diagnostic with `path` pointing
at the failing field.

Tool input is parsed by `parseRecordInput`, which is identical except `createdAt` and
`updatedAt` are optional. The app then calls `finalizeRecord(record, previous?)` to
stamp them before `parseRecord` and before writing.

## 6. Registry

### 6.1 Snapshot

```ts
interface RegistrySnapshot {
  environments: Map<string, Environment>
  services: Map<string, Service>
  deployments: Map<string, Deployment>
  ruleProfiles: Map<string, RuleProfile>
  operationBindings: Map<string, OperationBinding>
  byAlias: Map<string, string>          // "service:<alias>" -> id
  diagnostics: Diagnostic[]
  loadedAt: string
}
```

`byAlias` keys are `${kind}:${alias}` and resolve aliases for `env_get`/`env_find`.
Duplicate aliases are a warning; the first record wins, sorted by file name for
determinism.

### 6.2 Load algorithm

```text
for each kind directory (environments, services, deployments, rules, operations):
  entries = readdir(dir, { withFileTypes: true })
  files   = entries where isFile() and name endsWith('.yaml') and not name startsWith('.')
  sort files by name
  for each file:
    read + parse
    parseRecord -> on failure: diagnostic (file, code, path, message); skip
    if map already has record.id: diagnostic DUPLICATE_ID; skip later file
    else insert
refresh byAlias and run integrity checks
```

A missing kind directory is normal (empty). An unreadable directory is an error
diagnostic, and the snapshot keeps the other kinds.

### 6.3 Referential integrity

| Reference | Rule | Code |
|---|---|---|
| `deployment.environmentId` | environment exists | `ENV_NOT_FOUND` |
| `deployment.serviceId` | service exists | `SERVICE_NOT_FOUND` |
| `deployment.location.hostRef` | host exists in that environment | `HOST_NOT_FOUND` |
| `deployment.location.clusterRef` | cluster exists in that environment | `CLUSTER_NOT_FOUND` |
| `service.ruleProfileRefs[]` | rule profile exists | `RULE_PROFILE_NOT_FOUND` |
| operation binding `match.environmentId` | environment exists | `ENV_NOT_FOUND` |
| operation binding `match.serviceId` | service exists | `SERVICE_NOT_FOUND` |
| operation binding `match.deploymentId` | deployment exists | `DEPLOYMENT_NOT_FOUND` |
| any `credentialRef` | non-empty string matching the agreed ref pattern | `RECORD_INVALID` |

Integrity failures are **diagnostics**, not load failures: the registry still serves
the other records, and `env_validate` reports the broken references. A resolve or
route that needs a missing record fails with the specific code.

### 6.4 Reload policy

V1 reloads the registry at the start of every application request. Rationale: users
edit YAML by hand, and a stale cache is worse than a few milliseconds. Concurrent
requests share one in-flight load. A snapshot is replaced only after a successful
load; a load that throws keeps the previous snapshot and reports an error diagnostic.

Performance target: 500 records load in under 100 ms on a local SSD. If that is
missed, add an mtime-keyed cache in a follow-up, not in V1.

## 7. Resolver

### 7.1 Template parsing

```ts
type TemplatePart =
  | { kind: 'literal'; text: string }
  | { kind: 'ref'; path: string }

function parseTemplate(text: string): TemplatePart[]
```

Scanner rules:

1. Find `${`. Text before it is a literal.
2. Find the next `}`. A missing `}` is `RULE_TEMPLATE_INVALID`.
3. The inner text must match `^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$`;
   otherwise `RULE_TEMPLATE_INVALID`.
4. Anything that is not `${…}` is literal text, including a lone `$`.
5. No nesting, escaping, calls, operators, or env access.
6. Template length is capped at 2048 characters.

### 7.2 Namespaces

| Reference | Resolves to |
|---|---|
| `env.id`, `env.name`, `env.category` | environment record |
| `service.id`, `service.name`, `service.category` | service record |
| `service.artifact.name` | service artifact name, when declared |
| `deployment.id`, `deployment.name`, `deployment.runtimeMode` | deployment record |
| `deployment.location.<field>` | deployment location, runtime-specific |
| `<variable>` | layer variable of that name |
| `variables.<variable>` | same, explicit form |
| `paths.<pathName>` | another resolved path |

`service.artifact.name` resolves only when `artifact` exists. A reference to a
namespace that is unavailable for this context is `RULE_UNDEFINED_VARIABLE`, not an
empty string.

### 7.3 Layers

```ts
interface Layer {
  source: RuleSource
  variables?: Record<string, string | number | boolean>
  paths?: Record<string, string>
  logSources?: Partial<Record<RuntimeMode, LogSource>>
  classLocations?: Partial<Record<RuntimeMode, ClassLocation>>
}
```

Built from `design.md` §6.3:

1. built-in global defaults (empty in V1);
2. each `service.ruleProfileRefs` entry, in order;
3. `environment.ruleOverrides`;
4. `deployment.variables` (variables only), then `deployment.ruleOverrides`.

Flatten to a field map:

```text
variables.<name>
paths.<name>
logSources.<runtime>.<property>
classLocations.<runtime>.<property>
```

### 7.4 Merge

```ts
interface MergedField {
  key: string
  raw: string | number | boolean
  definedBy: RuleSource
  shadowed: RuleSource[]
}
```

Iterate layers in ascending order. For each field, replace the winner and append the
previous winner to `shadowed`. This is the only merge rule; there is no deep merge and
no array concatenation.

### 7.5 Evaluation

```text
1. Build the reference graph: node = merged field key; edge = each ref used by a
   string field. Constants (env/service/deployment) are not nodes.
2. DFS with an active stack. A back edge is RULE_CYCLE with the full cycle path.
3. A ref with no node and no constant is RULE_UNDEFINED_VARIABLE
   (message names the field and the ref).
4. Resolve nodes in post-order; substitute into an ordered list of parts.
5. For every resolved `paths.*` value, split on `/` and reject `..`
   (RULE_PATH_TRAVERSAL). Absolute/relative shape is otherwise preserved.
6. Convert non-string numbers/booleans to their literal text when interpolated.
7. Select `logSources[runtimeMode]` and `classLocations[runtimeMode]` after their
   strings resolve.
```

Cycle detection is iterative (explicit stack), not recursive, so a pathological graph
cannot overflow the JS stack.

### 7.6 Provenance

For every requested field:

```ts
interface ProvenanceEntry {
  field: string
  value: string | number | boolean
  definedBy: RuleSource
  inputs: Array<{ field: string; source: RuleSource }>
  shadowed: RuleSource[]
}
```

`inputs` records the source of the winning definition of each referenced field, so a
value that depends on an environment override names the environment layer. `shadowed`
comes from the merge.

`paths` and `variables` produce one entry per name. `logSource` and `classLocation` are
structured: each resolved property produces its own entry
(`logSources.kubernetes.namespace`), returned as a list so a mixed-layer object is still
explainable.

### 7.7 Public API

```ts
interface ResolveInput {
  environment: Environment
  service: Service
  deployment?: Deployment
  ruleProfiles: Map<string, RuleProfile>
}

function resolveContext(input: ResolveInput): ResolveResult
```

`ResolveResult` is `{ ok: true; context: ServiceContext } | { ok: false; diagnostics: Diagnostic[] }`.
The function is pure; it never reads files, time, or config.

## 8. Router

### 8.1 Eligibility

A binding is eligible when:

- `enabled === true`;
- `operation` equals the requested id exactly;
- every declared `match` field matches the context:

| Field | Matches |
|---|---|
| `environmentId` | context environment id |
| `serviceId` | context service id |
| `deploymentId` | context deployment id (requires a deployment) |
| `deploymentMode` | context runtime mode |
| `serviceCategory` | service category |

An empty `match` matches everything.

A binding whose `match` is not one of the five documented shapes is `RECORD_INVALID` at
load (data-model §7); the router never sees such a binding.

### 8.2 Level and selection

Rank: `deployment` 1, `environment-service` 2, `service` 3, `category-mode` 4,
`global` 5. Level is derived from which match fields are present, with
`deploymentId` winning over `environmentId`+`serviceId`, which wins over `serviceId`,
then `serviceCategory`+`deploymentMode`, then empty.

```text
eligible = filter(bindings, eligible)
if eligible is empty: BINDING_NOT_FOUND
top = min(rank)
winners = eligible where rank == top
if winners.length > 1: BINDING_CONFLICT (list every candidate)
else selected = winners[0]
```

Lower levels are ignored once a winner exists, even if they also match.

### 8.3 Skill availability

```ts
interface SkillDirectory {
  snapshot(opts): Promise<{ skills: SkillSummary[]; complete: boolean }>
}
```

Adapter over `ctx.skills` (F20):

| Condition | Result |
|---|---|
| `ctx.skills` absent | `available: 'unknown'` + `SKILL_REGISTRY_UNAVAILABLE` warning, `ok: true` |
| `complete === false` | same |
| name not found | `ok: false`, `SKILL_UNAVAILABLE` |
| `expectedSource` set and `source` differs | `ok: false`, `SKILL_UNAVAILABLE` |
| `expectedProvider` set and `provider` differs | `ok: false`, `SKILL_UNAVAILABLE` |
| otherwise | `available: true` |

Digest pinning is not supported: DSH's catalog exposes no digest. The record field is
removed in this design revision; do not reintroduce it without a provider that can
verify it.

### 8.4 Policy

```text
write = operation in WRITE_OPERATIONS
requiresApproval = policy.requiresApproval ?? write
if context.environmentCategory === 'production' and policy.allowProduction !== true:
    POLICY_DENIED
else: return policy
```

`requiresApproval` and `allowProduction` are returned to the caller; V1 does not
execute the Skill. A future executor must enforce them, not just display them.

### 8.5 Parameters

- Strings are templates resolved through the same engine, with the context namespaces
  and `paths.*`.
- Numbers and booleans are stringified.
- A null, array, or object value is `PARAMETER_RESOLUTION_FAILED`.
- At most 50 parameters; keys must match `[A-Za-z_][A-Za-z0-9_]*`.

### 8.6 Public API

```ts
function resolveOperation(input: {
  operation: string
  context: ServiceContext
  bindings: OperationBinding[]
  skills: SkillDirectory | null
}): OperationResolution
```

Pure except for `skills.snapshot()`, which is an injected async capability. Tests use
a fake directory.

## 9. Session store

```ts
interface SessionContext {
  sessionId: string
  defaultEnvironmentId: string | null
  persisted: boolean
}
```

- `get(sessionId)`: read `sessions/<id>.json`; missing → `null` default; corrupt →
  `persisted: false`.
- `set(sessionId, environmentId)`: validate the environment exists, then write the
  file; a write failure returns `persisted: false` and `SESSION_CONTEXT_UNPERSISTED`.
- `set(..., null)` writes `defaultEnvironmentId: null` (an explicit clear).
- Two sessions never share a file.
- A process-local `Map<sessionId, string | null>` caches the last value. `get` prefers
  the file and falls back to the cache when the file is missing or corrupt; a failed
  write still updates the cache so the current process honors the choice. The cache is
  not durable and is empty after a restart.

## 10. Application service

`src/app/app.ts` is the single place where storage, registry, resolver, router and
session are composed. Tools and HTTP both call it; neither contains business logic.

```ts
interface App {
  meta(): Promise<MetaResult>
  list(kind: RecordKind): Promise<ListResult>
  get(kind: RecordKind, id: string): Promise<GetResult>
  find(query: string): Promise<FindResult>
  save(kind: RecordKind, record: unknown, options?: SaveOptions): Promise<SaveResult>
  saveYaml(kind: RecordKind, yaml: string, options?: SaveOptions): Promise<SaveResult>
  remove(kind: RecordKind, id: string, actor: Actor, options?: RemoveOptions): Promise<RemoveResult>
  validate(): Promise<ValidationReport>
  resolve(input: ResolveRequest): Promise<ResolveResult>
  route(input: RouteRequest): Promise<OperationResolution>
  setCredential(ref: string, value: string): Promise<{ ref: string; configured: true }>
  unsetCredential(ref: string): Promise<{ ref: string; removed: true }>
  getContext(sessionId: string): Promise<SessionContext>
  setContext(sessionId: string, environmentId: string | null): Promise<SessionContext>
}

interface SaveOptions { dryRun?: boolean }
interface RemoveOptions { dryRun?: boolean }
```

Rules:

- `save` validates with Zod, sets `createdAt` (create only) and `updatedAt`, checks the
  record cap, writes, then reloads the registry. Timestamps supplied by the caller are
  ignored; the stored record always carries both.
- A schema failure throws `RECORD_INVALID` with
  `details.issues: [{ path, message }]`, where `path` is a record-relative field path
  (`hosts[1].ip`). The UI renders these as inline diagnostics.
- `save` returns `created: boolean` by comparing existence before the write.
- `save` re-runs integrity checks after the write and returns warnings for broken
  references; it does not roll back, because the record is individually valid.
- `remove` refuses when referenced (`RECORD_IN_USE`) and supports a dry-run flag used
  by the UI's confirmation dialog.
- `resolve` and `route` take explicit ids; the **tool layer** supplies the session
  default when the model omits an id.
- `Actor` is `'agent' | 'ui'`; the UI actor cannot write production unless
  `writePolicy.allowUiProductionWrites` is true.
- `resolve` fills `context.credentials` through an injected
  `CredentialDirectory { describe(ref); set(ref, value); unset(ref) }`. The Host
  adapter calls `ctx.credentials.describe`; tests use a fake. A missing ref yields
  `{ ref, configured: false }` plus `CREDENTIAL_MISSING`; no value is ever requested.
- `setCredential` accepts only `env-manager/<environmentId>/<accountId>` refs and a
  non-empty value, forwards them to `ctx.credentials.set`, and returns only
  `{ ref, configured: true }`. It never writes the value to a record or log.
  `unsetCredential` uses the same namespace check and calls `ctx.credentials.unset`.
  A missing service yields `CREDENTIAL_UNAVAILABLE`; provider failures yield
  `CREDENTIAL_WRITE_FAILED` without exposing the provider message to the UI.

## 11. Tools

### 11.1 Shared shape

```ts
function toolOutput<T extends JsonSchemaNode>(schema: T, render: Renderer): ToolOutputDefinition
```

- Every tool returns a plain object matching its declared schema; DSH validates it.
- Every failure throws `EnvManagerError`; no tool returns `{ ok: false }`.
- `render` emits one text block: a one-line summary plus the essential ids. The
  canonical JSON value is what the model receives.

`EnvManagerError`:

```ts
class EnvManagerError extends HarnessError {
  constructor(code: ErrorCode, message: string, details?: JsonValue) {
    super(message, code)
    this.details = details
  }
}
```

### 11.2 Tool table

| Tool | Parameters | Returns | Session | Approval |
|---|---|---|---|---|
| `env_list` | `kind?`, `query?` | `{ items, warnings }` | no | no |
| `env_get` | `kind`, `id` | `{ record, yaml }` | no | no |
| `env_find` | `query` | `{ hits }` | no | no |
| `env_resolve` | `environmentId?`, `serviceId`, `deploymentId?` | `{ context, warnings }` | default env | no |
| `env_resolve_operation` | `operation`, `environmentId?`, `serviceId?`, `deploymentId?` | `{ resolution }` | yes | no |
| `env_get_context` | — | `{ sessionId, defaultEnvironmentId, persisted }` | yes | no |
| `env_set_context` | `environmentId \| null` | same | yes | no |
| `env_save` | `kind`, `record`, `dryRun?` | `{ id, kind, created, dryRun, warnings }` | no | production env |
| `env_delete` | `kind`, `id`, `confirm` | `{ id, kind, deleted, blockers }` | no | yes |
| `env_validate` | — | `{ ok, counts, diagnostics }` | no | no |

### 11.3 Parameter definitions

```ts
const kindSchema = {
  type: 'string',
  enum: ['environment', 'service', 'deployment', 'ruleProfile', 'operationBinding'],
  description: 'Record kind.',
} as const
```

`env_list`:

```ts
parameters: {
  kind: { ...kindSchema, required: false },
  query: { type: 'string', required: false, description: 'Case-insensitive match over id, name and alias.' },
}
```

`env_get`: `kind` and `id` required, `id` description names the id pattern.

`env_find`: `query` required, min length 2.

`env_resolve`: `serviceId` required; `environmentId` and `deploymentId` optional.
Resolving an environment/service pair with more than one deployment and no
`deploymentId` returns `DEPLOYMENT_AMBIGUOUS` listing candidates; zero deployments
returns `DEPLOYMENT_NOT_FOUND`.

`env_resolve_operation`: `operation` required, `enum` of the 13 standard ids plus a
free-form custom id — model-visible enum lists only the standard ids; a custom id is
rejected by the schema unless it is declared in a binding. Because the DSL cannot
express "either enum or binding-declared", the parameter is a plain string with the
standard ids in the description and is validated in `execute`
(`OPERATION_UNKNOWN` when neither standard nor bound).

`env_set_context`: `environmentId` is `oneOf` string / `null`.

`env_save`: `record` is `{ type: 'json', required: true, description: 'Complete record object.' }`.
Zod still validates it; the JSON parameter only avoids duplicating every record schema
in the model-facing tool. `dryRun: true` validates and returns the same shape without
writing; a schema failure still throws `RECORD_INVALID`.

`env_delete`: `confirm` is a required boolean. `false` performs a dry run: it returns
`deleted: false` plus `blockers` and writes nothing.

### 11.4 Output schemas

Small results are precise; open records use `additionalProperties: true`.

```ts
const diagnosticSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    severity: { type: 'string', enum: ['info', 'warning', 'error'], required: true },
    code: { type: 'string', required: true },
    message: { type: 'string', required: true },
    file: { type: 'string' },
    path: { type: 'string' },
  },
}
const recordSchema = { type: 'object', additionalProperties: true }
```

`env_list` output:

```ts
{ type: 'object', additionalProperties: false, properties: {
  items: { type: 'array', required: true, items: { type: 'object', additionalProperties: false, properties: {
    kind: { type: 'string', required: true },
    id: { type: 'string', required: true },
    name: { type: 'string', required: true },
    summary: { type: 'string' },
  } } },
  warnings: { type: 'array', required: true, items: diagnosticSchema },
} }
```

`env_get` output: `{ record: recordSchema, yaml: { type: 'string', required: true } }`.

`env_resolve` output: `{ context: recordSchema, warnings: arrayOf(diagnosticSchema) }`.

`env_validate` output: counts per kind plus `diagnostics`.

### 11.5 Execution flow

```text
execute(args, exec):
  1. assert exec.signal not aborted
  2. resolve target ids (session default when allowed)
  3. call app.<operation>
  4. on EnvManagerError: rethrow
  5. on unexpected error: wrap as INTERNAL_ERROR with a redacted message
  6. return the declared value
```

Approval helper:

```ts
async function requireApproval(exec, toolName: string, reason: string): Promise<void> {
  if (!exec.agent) throw new EnvManagerError('SESSION_CONTEXT_UNAVAILABLE', '...')
  const outcome = await ctx.approval.request({
    agent: exec.agent,
    toolName,
    callId: exec.callId,
    reason,
    displayReason: { en: reason, zh: reasonZh },
    signal: exec.signal,
  })
  if (outcome !== 'allowed-once') throw new EnvManagerError('POLICY_DENIED', '...')
}
```

The `displayReason` is localized; the `reason` is the stable English fallback.

## 12. HTTP transport

### 12.1 Route

```ts
ctx.webServer.register({ kind: 'prefix', path: '/env-manager/api', handler })
```

- `POST` only; other methods → 405 with `Allow: POST`.
- `Content-Type: application/json; charset=utf-8` required.
- Body limit 2 MiB; exceeding it → 413.
- Request header `x-env-manager-request: 1` required, otherwise 403.
- If an `Origin` header is present it must equal `ctx.webServer.getOrigin()`,
  otherwise 403. No CORS headers are ever sent.
- The handler never reads cookies or credentials. A credential value may appear only in
  the `credential` request body, is forwarded directly to the credential service and is
  never logged or echoed.

### 12.2 Envelope

Request:

```json
{ "op": "record.save", "payload": { "kind": "environment", "yaml": "id: test-a\n..." } }
```

Success `200`:

```json
{ "ok": true, "data": { ... } }
```

Failure:

```json
{ "ok": false, "error": { "code": "RECORD_INVALID", "message": "...", "details": { ... } } }
```

Status map: `INVALID_ARGUMENT` 400, `POLICY_DENIED`/`FORBIDDEN` 403, `*_NOT_FOUND` 404,
`RECORD_IN_USE`/`BINDING_CONFLICT`/`DEPLOYMENT_AMBIGUOUS` 409, `RECORD_INVALID`/
`RULE_*`/`PARAMETER_*` 422, `CREDENTIAL_UNAVAILABLE` 503, anything else 500 (including
`CREDENTIAL_WRITE_FAILED`). The body always carries the code; the status is for tooling.

### 12.3 Operations

| op | payload | data |
|---|---|---|
| `meta` | — | dataDir, version, counts, warnings |
| `list` | `{ kind }` | summaries |
| `get` | `{ kind, id }` | `{ record, yaml }` |
| `find` | `{ query }` | hits |
| `save` | `{ kind, record?, yaml?, dryRun? }` | save result |
| `remove` | `{ kind, id, confirm?, dryRun? }` | remove result |
| `validate` | — | validation report |
| `resolve` | `{ environmentId, serviceId, deploymentId? }` | context |
| `route` | `{ operation, environmentId, serviceId, deploymentId? }` | resolution |
| `credential` | `{ ref, value }` | `{ ref, configured }` |
| `credentialUnset` | `{ ref }` | `{ ref, removed }` |

The UI cannot read or write session context; that is agent-only in V1 (§9).

### 12.4 Actor policy

`record.save` and `record.remove` run with actor `'ui'`:

- production environment save is denied unless `allowUiProductionWrites`;
- `record.remove` requires `confirm: true` unless `dryRun: true`;
- every write is logged with actor, op, kind, id and outcome (no record content).

`credential` and `credentialUnset` are UI-only, restricted to the `env-manager/`
namespace and never write to the registry. They log only the ref and outcome.

## 13. Client module

Structural contract:

```js
return {
  inject: ['slots', 'locale'],
  apply(ctx) {
    ctx.effect(() => ctx.locale.register('envManager', { en, zh }))
    ctx.slots.inject('sidebar.panellist', () => ctx.slots.register(
      { name: 'sidebar.panellist', id: 'env-manager', order: 40 }, Icon))
    ctx.slots.inject('main', () => ctx.slots.register(
      { name: 'main', key: 'env-manager' }, Panel))
  },
}
```

- All data access goes through `createApi()` in `client.js`, which posts to
  `/env-manager/api` with the required header and maps failures to a UI error object.
- The panel keeps state locally (`useState`/`useEffect`); no global store.
- Rendering and interactions are specified in [`ui-design.md`](ui-design.md).

## 14. Memory bridge

```ts
interface MemoryBridge {
  readonly available: boolean
  emit(record: OperationRecord): Promise<void>
  observe(scope: MemoryScope): Promise<readonly Observation[]>
  propose(candidate: CandidateChange): Promise<string>   // returns proposal id
}
```

V1 ships `NullMemoryBridge`: `available: false`, `emit` resolves without writing,
`observe` returns `[]`, `propose` throws `MEMORY_BRIDGE_UNAVAILABLE`. It is selected
when no memory provider is registered; a future adapter plugs in without changing the
tools because nothing in V1 calls `emit` (no execution).

## 15. Cross-cutting

### 15.1 Logging

`src/logger.ts` wraps `ctx.get('logger')` when it is callable, else `console`.
Log levels: `info` for lifecycle (dataDir, loaded counts), `warn` for skipped records,
`error` for failed loads. Records and credential refs are logged as ids only; never a
whole record, never a value.

### 15.2 Redaction

`redactValue(text)` removes anything that looks like a URL userinfo, a bearer token,
or a private key block from messages before they reach the model or the UI. Tool
results never include `credentialRef` values, only configured state.

### 15.3 Cancellation

`execute` receives `exec.signal`; long loops (registry load, resolve) check it between
files and between fields. A cancelled call surfaces DSH's own abort error unchanged.

### 15.4 Performance budgets

| Operation | Budget |
|---|---|
| registry load (500 records) | 100 ms |
| resolve (50 fields) | 5 ms |
| route with skill snapshot | 50 ms |
| HTTP round trip (local) | 150 ms |

## 16. Test obligations

| Module | Tests | From AGENTS §13 |
|---|---|---|
| `storage` | atomic write, missing file, invalid YAML, schema mismatch, backups, traversal rejection | required |
| `registry` | load/lookup, duplicate id, broken references, alias collision | required |
| `resolver` | precedence, field merge, provenance, undefined/cycle/traversal, runtime selection | required |
| `router` | each level, conflict, missing skill, source/provider mismatch, policy, parameters | required |
| `session` | set/get/clear, isolation, corrupt fallback | required |
| `tools` | output matches schema, error codes, no credential values, approval denial | required |
| `app` | save→get round trip, delete in use, validate report | new |
| `http` | auth header, origin, method, size cap, status map, production denial | new |
| `client` | manual checklist in `ui-design.md` §9 | manual |

Tests live in `tests/<module>/*.test.ts`, fixtures in `tests/fixtures/<scenario>/`.

## 17. Traceability

| Design section | Implements | Acceptance |
|---|---|---|
| §4 storage | ADR-0002 | AC-01, AC-02 |
| §7 resolver | ADR-0005 | AC-03, AC-04 |
| §8 router | ADR-0003 | AC-05…AC-07 |
| §9 session | ADR-0007 | AC-08 |
| §12 HTTP | ADR-0009 | UI manual QA (`ui-design.md` §12) |
| §11 tools | tool-contract.md | AC-02…AC-08 |

## 18. Deliberate omissions

- No cache beyond one in-flight load.
- No cross-process locking.
- No Skill execution.
- No session-event projection.
- No digest pinning.
- No plugin-side bundler.
- No database.
