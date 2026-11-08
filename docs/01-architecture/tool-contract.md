# Tool Contract (V1)

> Status: normative model-facing contract. Registration mechanics are in
> [`api-verification.md`](api-verification.md) F2–F5; implementation in
> [`detailed-design.md`](detailed-design.md) §11.
> An implementation whose tool schema differs from this document is a bug in one of
> them; update both in the same change.

## 1. Conventions

### 1.1 Registration

Every tool is a `defineTool` definition registered on `ctx.tools` during `apply`:

```ts
ctx.tools.register(defineTool({
  name, description, parameters,
  output: { schema, render },
  async execute(args, exec) { /* returns the declared JSON value */ },
}))
```

- The tool name is stable and matches `^env_[a-z_]+$`.
- `parameters` uses DSH's value-schema DSL, not raw JSON Schema. Property-level
  `required: true` marks required arguments. `additionalProperties` must be explicit.
- `output.schema` is the enforced JSON Schema subset: `type`, `oneOf`, `properties`,
  `required`, `additionalProperties`, `items`, `enum`, `const` plus annotations.
- `render(args, value)` returns `ContentBlock[]`. V1 emits exactly one text block: a
  one-line summary plus the ids a human needs. The canonical JSON value is what the
  model receives.
- Descriptions start with the decision rule ("Use when …"), not with a restatement of
  the name.

### 1.2 Errors

Success returns the declared value. Every expected failure throws:

```ts
class EnvManagerError extends HarnessError {
  constructor(code: ErrorCode, message: string, details?: JsonValue)
}
```

`HarnessError` is imported from `@deepseek-ai/dsh-llm` and constructed as
`super(message, code)`. DSH records `{ name, code }` beside the message, so the model
and the UI can branch on `code` without parsing text.

Rules:

- No tool returns `{ ok: false }`.
- No tool throws a bare string.
- Messages never contain a credential value, a file body, or a stack trace.
- Unexpected exceptions are wrapped as `INTERNAL_ERROR` with a redacted message.
- A cancelled call surfaces DSH's own abort error; do not translate it.

Codes are defined in [`data-model.md`](data-model.md) §13.

### 1.3 Approval

| Tool | Approval |
|---|---|
| `env_delete` | always, when `confirm: true` and `writePolicy.requireApprovalForDelete` |
| `env_save` | when the record is a production environment, or a deployment whose environment is production, and `writePolicy.requireApprovalForProductionSave` |
| `env_import` | when the bundle touches production records (an environment with `category: production`, or a record referencing a production environment/service/deployment); the tool retries once after a native `ctx.approval` grant |
| everything else | no |

Approval uses `ctx.approval.request` with the executing agent, the tool name, the call
id, an English `reason`, and a localized `displayReason`. Only `'allowed-once'` grants;
`'rejected'`, `'cancelled'` and `'unavailable'` all become `POLICY_DENIED`.

A session-scoped tool invoked without `exec.agent` fails with
`SESSION_CONTEXT_UNAVAILABLE`; it never guesses a session.

### 1.4 Session default

`env_resolve`, `env_resolve_operation` and `env_set_context` operate on the calling
agent's session. When `environmentId` is omitted, the order is:

1. the explicit argument;
2. the session default (`sessions/<sessionId>.json`);
3. `config.defaults.environmentId`;
4. `INVALID_ARGUMENT` naming both ways to supply an environment.

### 1.5 Shared value shapes

```ts
interface Diagnostic {
  severity: 'info' | 'warning' | 'error'
  code: string
  message: string
  file?: string
  path?: string
}

interface RecordSummary {
  kind: RecordKind
  id: string
  name: string
  summary?: string        // kind-specific one-liner
}

interface WarningList { warnings: Diagnostic[] }
```

`BundleDocument` and the import/export result shapes (`ImportedRecordRef`, `ImportFailure`)
are defined in [`data-model.md`](data-model.md) §9; the tool surface just passes them
through.

`RecordKind = 'environment' | 'service' | 'deployment' | 'ruleProfile' | 'operationBinding'`.

## 2. Read tools

### 2.1 `env_list`

Use when the caller needs an inventory or wants to discover ids before a specific call.

```ts
parameters: {
  kind: {
    type: 'string',
    required: false,
    enum: ['environment', 'service', 'deployment', 'ruleProfile', 'operationBinding'],
    description: 'Restrict to one record kind.',
  },
  query: {
    type: 'string',
    required: false,
    description: 'Case-insensitive match over id, name and alias.',
  },
}
```

Returns:

```json
{ "items": [ { "kind": "environment", "id": "test-a", "name": "Test A", "summary": "test · 2 hosts" } ],
  "warnings": [] }
```

- Sorted by kind, then id.
- An empty registry is `{ "items": [], "warnings": [] }`, not an error.
- Registry diagnostics are summarized in `warnings` (at most 20, with a count of the
  rest).

Errors: `INVALID_ARGUMENT` for an unknown `kind`.

Render: `"5 environments, 2 services (2 warnings)."`

### 2.2 `env_get`

Use when the caller already has an id and needs the full record.

```ts
parameters: {
  kind: { type: 'string', required: true, enum: [/* five kinds */] },
  id: { type: 'string', required: true, description: 'Record id, e.g. test-a.' },
}
```

Returns:

```json
{ "record": { "id": "test-a", "schemaVersion": 1, "...": "..." },
  "yaml": "id: test-a\n..." }
```

- `record` is the parsed document; `yaml` is the on-disk text (helpful for edits).
- Unknown fields in the file are preserved in both.

Errors: `ENV_NOT_FOUND`, `SERVICE_NOT_FOUND`, `DEPLOYMENT_NOT_FOUND`,
`RULE_PROFILE_NOT_FOUND`, `BINDING_NOT_FOUND` depending on `kind`;
`INVALID_ARGUMENT` for a malformed id (fails before any I/O).

Render: `"environment test-a (Test A), updated 2026-11-01."`

### 2.3 `env_find`

Use when the caller has a name or fragment and wants candidate ids. Prefer this over
guessing an id.

```ts
parameters: {
  query: {
    type: 'string',
    required: true,
    description: 'Fragment of an id, name, alias or category (min 2 characters).',
  },
}
```

Returns:

```json
{ "hits": [ { "kind": "service", "id": "aicoservice", "name": "Aico Service", "field": "alias" } ] }
```

- Matching is case-insensitive over `id`, `name`, `aliases`, `category`.
- Ranked: exact id, prefix id, name, alias, category. At most 25 hits.
- No hit is not an error.

Errors: `INVALID_ARGUMENT` when `query` is shorter than 2 characters.

Render: `"3 matches for \"aico\"."`

### 2.4 `env_resolve`

Use when the caller needs concrete paths, log sources, class locations or variables
for a service. This is the authoritative answer; do not reconstruct paths from templates.
The environment is optional: without one the result is the service-level context
(service and global rule layers only).

```ts
parameters: {
  environmentId: { type: 'string', required: false, description: 'Optional; defaults to the session environment. Omit to resolve the service-level context.' },
  serviceId: { type: 'string', required: true },
  deploymentId: {
    type: 'string',
    required: false,
    description: 'Optional; selects one deployment and supplies its environment. Required when the service has more than one binding in the environment and no environment id is given; a single binding is selected automatically.',
  },
}
```

Returns the Service Context from `data-model.md` §10.2, including `provenance` and
`warnings`. With no environment, `credentials` is empty and
`environmentId`/`deploymentId`/`runtimeMode`/`location` are absent.

Errors: `ENV_NOT_FOUND`, `SERVICE_NOT_FOUND`, `DEPLOYMENT_NOT_FOUND`,
`DEPLOYMENT_AMBIGUOUS` (lists candidates), `RULE_*`, `PARAMETER_RESOLUTION_FAILED`.

Render: `"Resolved aicoservice in test-a (kubernetes): 7 paths, 2 variables, 1 warning."`
(without an environment: `"Resolved aicoservice: 7 paths, 2 variables, 0 warnings."`)

### 2.5 `env_resolve_operation`

Use before acting: ask which Skill handles an operation for this context and what
parameters it expects. This tool **does not execute** the Skill.

```ts
parameters: {
  operation: {
    type: 'string',
    required: true,
    description: 'deploy | redeploy | restart | rollback | collect-logs | health-check | … (standard id or a bound custom id).',
  },
  environmentId: { type: 'string', required: false, description: 'Defaults to the session environment; required unless deploymentId supplies one.' },
  serviceId: { type: 'string', required: false, description: 'Service id; required unless the operation is environment-scoped (deploy-environment) or deploymentId supplies one.' },
  deploymentId: { type: 'string', required: false, description: 'Deployment id; supplies the service and environment when omitted.' },
}
```

- `serviceId` / `deploymentId` are required unless the operation is environment-scoped
  (`deploy-environment` targets the environment, not a service). `environmentId` falls
  back to the session default and is otherwise required — routing an operation without an
  environment fails (`INVALID_ARGUMENT` / `ENVIRONMENT_REQUIRED`) instead of downgrading
  to a lower binding.

Returns `OperationResolution` from `data-model.md` §10.3:

```json
{
  "ok": true,
  "operation": "redeploy",
  "requested": { "environmentId": "test-a", "serviceId": "aicoservice", "deploymentId": "deploy-001" },
  "matchedBindingId": "binding-001",
  "matchLevel": "environment-service",
  "skill": { "name": "redeploy-k8s-service", "available": true, "source": "project-dsh", "provider": "dsh-skills" },
  "parameters": { "namespace": "dv-sop", "workload": "aicoservice", "cluster": "k8s-01" },
  "policy": { "requiresApproval": true, "allowProduction": false },
  "diagnostics": []
}
```

Errors: `ENV_NOT_FOUND`, `SERVICE_NOT_FOUND`, `DEPLOYMENT_NOT_FOUND`,
`DEPLOYMENT_AMBIGUOUS`, `BINDING_NOT_FOUND`, `BINDING_CONFLICT` (lists every candidate),
`SKILL_UNAVAILABLE`, `POLICY_DENIED`, `OPERATION_UNKNOWN`, `PARAMETER_RESOLUTION_FAILED`.

Incomplete Skill catalog: `skill.available: "unknown"` plus a
`SKILL_REGISTRY_UNAVAILABLE` warning; the call still succeeds.

Render: `"redeploy aicoservice/test-a → redeploy-k8s-service (approval required)."`

### 2.6 `env_get_context`

Use to check what environment the current session defaults to.

```ts
parameters: {}
```

Returns:

```json
{ "sessionId": "01J…", "defaultEnvironmentId": "test-a", "persisted": true }
```

Errors: `SESSION_CONTEXT_UNAVAILABLE` when there is no owning agent.

Render: `"Session default: test-a."`

### 2.7 `env_set_context`

Use when the user says "work on test-a" and later calls should omit `environmentId`.

```ts
parameters: {
  environmentId: {
    oneOf: [{ type: 'string' }, { type: 'null' }],
    required: true,
    description: 'Environment id, or null to clear the session default.',
  },
}
```

Returns the same shape as `env_get_context`. Writing an unknown environment fails with
`ENV_NOT_FOUND`.

A file write failure returns `persisted: false` plus a `SESSION_CONTEXT_UNPERSISTED`
warning; it does not throw, because the process-local cache still honors the choice for
this process.

Render: `"Session default set to test-a."` / `"Session default cleared."`

## 3. Management tools

### 3.1 `env_save`

Use to create or replace a record. Prefer `env_get` first, edit the YAML, then save the
whole record; do not send a partial patch.

```ts
parameters: {
  kind: { type: 'string', required: true, enum: [/* five kinds */] },
  record: {
    type: 'json',
    required: true,
    description: 'Complete record; id and schemaVersion are required. Host timestamps are set by the plugin and ignored if supplied.',
  },
  dryRun: {
    type: 'boolean',
    required: false,
    description: 'Validate and report without writing.',
  },
}
```

Returns:

```json
{ "id": "test-a", "kind": "environment", "created": false, "dryRun": false,
  "warnings": [ { "severity": "warning", "code": "CREDENTIAL_MISSING", "message": "…" } ] }
```

Behavior:

- Zod validation, id/filename equality, record cap, then atomic write, then reload.
- `created` is `true` only when no file existed before.
- Broken references after the write are returned as warnings; the write is not rolled
  back because the record itself is valid.
- Production records require approval unless the config disables it.

Errors: `RECORD_INVALID` (with `details.issues`), `RECORD_LIMIT_EXCEEDED`,
`RECORD_TOO_LARGE`, `STORAGE_UNWRITABLE`, `POLICY_DENIED`.

Render: `"Saved environment test-a (updated, 1 warning)."`

### 3.2 `env_delete`

Use only when the user explicitly asks to remove a record.

```ts
parameters: {
  kind: { type: 'string', required: true, enum: [/* five kinds */] },
  id: { type: 'string', required: true },
  confirm: {
    type: 'boolean',
    required: true,
    description: 'false checks references only; true deletes after approval.',
  },
}
```

Returns:

```json
{ "id": "test-a", "kind": "environment", "deleted": true, "blockers": [] }
```

Behavior:

- `confirm: false` never deletes; it returns `blockers` describing references.
- `confirm: true` asks for approval, then refuses with `RECORD_IN_USE` when referenced.
- A backup copy is written before the unlink.

Errors: not found by kind, `RECORD_IN_USE`, `POLICY_DENIED`, `STORAGE_UNWRITABLE`.

Render: `"Deleted environment test-a (backup kept)."`

### 3.3 `env_validate`

Use after hand-editing YAML or before trusting a resolve result.

```ts
parameters: {}
```

Returns:

```json
{
  "ok": false,
  "counts": {
    "environment": 2, "service": 1, "deployment": 1,
    "ruleProfile": 1, "operationBinding": 2
  },
  "diagnostics": [
    { "severity": "error", "code": "RULE_PROFILE_NOT_FOUND",
      "message": "service aicoservice references unknown rule profile java-commn",
      "file": "services/aicoservice.yaml", "path": "ruleProfileRefs[0]" }
  ]
}
```

- Always succeeds at the tool level; `ok: false` is a report, not a failure.
- Read-only: no write, no reload side effect beyond the normal request load.

Render: `"Registry invalid: 2 errors, 1 warning."`

### 3.4 `env_operate`

Use to execute the bound target for an operation inside the selected environment. Skill
targets return a prepared reference (the agent invokes the Skill itself); local commands
and scripts run as a bounded process; remote targets return a prepared ssh command
descriptor. This tool is the only one that spawns local processes and it does so only
through a matching enabled binding — never ad hoc.

```ts
parameters: {
  operation: { type: 'string', required: true, description: 'Standard or custom operation id.' },
  environmentId: { type: 'string', description: 'Defaults to the session environment; required unless deploymentId supplies one.' },
  serviceId: { type: 'string', description: 'Service id; required unless the operation is environment-scoped or deploymentId supplies one.' },
  deploymentId: { type: 'string', description: 'Deployment id; supplies the service and environment when omitted.' },
  confirm: { type: 'boolean', description: 'true only after the user approved a gated (write) execution.' },
  dryRun: { type: 'boolean', description: 'Resolve and gate but run nothing.' },
  note: { type: 'string', description: 'Optional note stored with the experience record.' },
}
```

Returns `{ resolution, execution, experience?, warnings }`:

```json
{
  "resolution": { "ok": true, "operation": "restart", "requested": { "environmentId": "test-a", "serviceId": "aicoservice" },
                  "matchedBindingId": "binding-001", "matchLevel": "environment-service",
                  "target": { "mode": "command", "command": { "argv": ["kubectl", "rollout", "restart", "aicoservice", "-n", "dv-sop"] } },
                  "policy": { "requiresApproval": true, "allowProduction": false }, "experiences": [], "diagnostics": [] },
  "execution": { "status": "completed", "exitCode": 0, "stdout": "…", "stderr": "", "durationMs": 812, "diagnostics": [] },
  "experience": { "id": "exp-20261108-034947", "kind": "success-summary", "status": "proposed" },
  "warnings": []
}
```

Behavior:

- Routes the operation exactly like `env_resolve_operation`, then runs the resolved
  target. A `script`/`command` target is spawned with `shell: false` under `<dataDir>`,
  with bounded output (64 KiB per stream), a timeout (default 600 s, max 3600 s,
  `SIGTERM` → `SIGKILL`) and `password=`-style redaction.
- A `remote` target returns a prepared ssh descriptor (`address`, `port`, `username`,
  `command`, `credentialRef`); the plugin never reads credential values, so it cannot
  open the connection itself. A `skill` target returns the prepared reference only.
- Gates: a write operation whose binding has `requiresApproval: true` refuses to run
  without `confirm: true` → `APPROVAL_REQUIRED` (the tool turns that into a native
  `ctx.approval` request and retries once with `confirm: true`); production execution is
  denied unless the binding sets `allowProduction: true` → `POLICY_DENIED`.
- Every completed or failed execution writes an experience (success → `success-summary`,
  failure → `failure-lesson`) into the review queue as `proposed`; later routes surface
  related experiences.

Errors: `ENVIRONMENT_REQUIRED`, `ENV_NOT_FOUND`, `SERVICE_NOT_FOUND`,
`DEPLOYMENT_NOT_FOUND`, `BINDING_NOT_FOUND`, `BINDING_CONFLICT`, `POLICY_DENIED`,
`APPROVAL_REQUIRED` (when approval is unavailable), `SCRIPT_NOT_FOUND`,
`SCRIPT_PATH_TRAVERSAL`, `EXECUTION_TIMEOUT`, `EXECUTION_FAILED`.

Render: `"Execution completed exit=0; experience exp-20261108-034947 (success-summary) queued."`

### 3.5 `env_experience`

Use to manage the experience review queue: list experiences, add a hand-written
lesson/summary (e.g. from a Skill run you observed), or approve/reject a proposed one.
Nothing auto-applies: accepted experiences are surfaced on later routes so the tool gets
smarter with use.

```ts
parameters: {
  action: { type: 'string', required: true, enum: ['list', 'add', 'approve', 'reject'] },
  operation: { type: 'string', description: 'Filter or set the operation id.' },
  environmentId: { type: 'string', description: 'Filter or set the environment scope.' },
  serviceId: { type: 'string', description: 'Filter or set the service scope.' },
  deploymentId: { type: 'string', description: 'Set the deployment scope (add only).' },
  bindingId: { type: 'string', description: 'Optional binding id (add only).' },
  kind: { type: 'string', enum: ['success-summary', 'failure-lesson'], description: 'Experience kind; filter for list, required for add.' },
  status: { type: 'string', enum: ['proposed', 'accepted', 'rejected'], description: 'Filter by review status (list only).' },
  outcome: { type: 'string', enum: ['success', 'failure', 'skipped'], description: 'Result that produced the experience (add only).' },
  mode: { type: 'string', enum: ['skill', 'script', 'command', 'remote'], description: 'Target mode (add only).' },
  title: { type: 'string', description: 'Short title (add only).' },
  content: { type: 'string', description: 'Narrative: what happened, why it worked or failed, what to do next time (add only).' },
  tags: { type: 'array', items: { type: 'string' }, description: 'Optional tags (add only).' },
  id: { type: 'string', description: 'Experience id (approve/reject only).' },
  note: { type: 'string', description: 'Review note (approve/reject only).' },
  limit: { type: 'number', description: 'Max list items, default 25, at most 100.' },
}
```

Returns `{ items, warnings }` for `list`, or `{ record, warnings }` for
`add`/`approve`/`reject`. The review queue is the only apply path: `approve` and
`reject` are the only status transitions, and proposed records surface on later routes
until then.

Errors: `EXPERIENCE_NOT_FOUND`, `INVALID_ARGUMENT` (e.g. `add` without `operation`,
`kind`, `title` and `content`).

Render: `"2 experience(s)."` or `"Experience exp-20261108-034947 accepted (success-summary)."`

### 3.6 `env_import`

Use to apply a self-contained environment bundle (several environments plus their
services, deployments, rule profiles and operation bindings) in one call. DR marking is
not a separate bundle array: it travels inside each environment record's `dr` block.

```ts
parameters: {
  document: { type: 'json', required: true,
              description: 'Bundle document: { version: 1, environments: [...], services: [...], deployments: [...], ruleProfiles: [...], operationBindings: [...] }.' },
  mode: { type: 'string', enum: ['skip', 'overwrite', 'error'], description: 'Conflict mode for ids that already exist; defaults to skip.' },
  confirm: { type: 'boolean', description: 'true only after the user approved importing production records.' },
}
```

Returns:

```json
{
  "imported": [ { "kind": "environment", "id": "test-a" } ],
  "skipped": [ { "kind": "service", "id": "aicoservice" } ],
  "failed": [ { "kind": "environment", "id": "prod-a", "code": "DR_PEER_UNKNOWN", "message": "References missing DR peer \"dr-a\"" } ],
  "warnings": []
}
```

Behavior:

- Every record is parsed with the same schema as `env_save`; a per-record failure does
  not abort the rest (some records may still be imported when others fail).
- Records apply in dependency order (environment → service → deployment → ruleProfile →
  operationBinding); references resolve against the existing registry plus the ids in the
  same bundle.
- Reference problems use the same codes as single-record validation
  (`ENV_NOT_FOUND`, `SERVICE_NOT_FOUND`, `DEPLOYMENT_NOT_FOUND`,
  `RULE_PROFILE_NOT_FOUND`, `DR_PEER_UNKNOWN`); an environment whose `dr.peer` is not in
  the registry or the same bundle fails with `DR_PEER_UNKNOWN`.
- Conflict modes: `skip` (default) keeps the existing record and reports it as skipped;
  `overwrite` replaces it, preserving the existing `createdAt`; `error` fails that record
  with `RECORD_EXISTS`.
- If any candidate record is production (a production environment, or a record referencing
  a production environment/service/deployment), the call throws `APPROVAL_REQUIRED`
  unless `confirm: true`; the tool then asks `ctx.approval` and retries once.
- Passwords are never accepted: the strict record schemas reject `password` /
  `sshPassword`-style fields with `RECORD_INVALID`.
- The returned value is strict-JSON-safe; nothing is written outside `dataDir`.

Errors: `IMPORT_INVALID`, `IMPORT_TOO_LARGE`, `APPROVAL_REQUIRED`, `POLICY_DENIED`,
`FORBIDDEN` (ui actor without `writePolicy.allowUiProductionWrites`).

Example bundle snippet (DR marking lives in `environments[].dr`):

```json
{
  "version": 1,
  "environments": [
    { "id": "prod-env", "schemaVersion": 1, "name": "Production", "category": "production",
      "dr": { "role": "primary", "type": "AS", "peer": "dr-env", "scope": "同城", "rtoMinutes": 30, "rpoMinutes": 10 },
      "roles": [ { "id": "management", "name": "Management" } ], "hosts": [], "clusters": [], "endpoints": [], "loginRecords": [],
      "createdAt": "2026-11-08T00:00:00.000Z", "updatedAt": "2026-11-08T00:00:00.000Z" },
    { "id": "dr-env", "schemaVersion": 1, "name": "DR site", "category": "test",
      "dr": { "role": "standby", "type": "AS", "peer": "prod-env" },
      "roles": [ { "id": "management", "name": "Management" } ], "hosts": [], "clusters": [], "endpoints": [], "loginRecords": [],
      "createdAt": "2026-11-08T00:00:00.000Z", "updatedAt": "2026-11-08T00:00:00.000Z" }
  ]
}
```

Render: `"Imported 1, skipped 0, failed 0."`

### 3.7 `env_export`

Use to export a self-contained environment bundle for backup or migration.

```ts
parameters: {
  environmentIds: { type: 'array', items: { type: 'string' },
                    description: 'Optional environment ids or names to include; omit for a full export.' },
}
```

Returns `{ document, counts }`: `document` is the bundle (`version: 1`, `exportedAt`,
plural-kind arrays), `counts` breaks down the numbers per kind. Omitted ids export the
whole registry; explicit ids export those environments plus everything that references
them (their deployments, the services those deployments reference, operation bindings
whose match hits a selected environment/service/deployment, and referenced rule
profiles). DR peers ride along **in both directions** — a selected environment's
`dr.peer` is added, and an environment whose `dr.peer` is selected is added too (fixpoint)
— so the bundle stays self-contained; the peer brings only its environment record, not
its deployments/services/bindings. Records carry `credentialRef` names only — an export
never contains a credential value.

Errors: `ENV_NOT_FOUND` for an unknown id.

Example subset export (`environmentIds: ["test-a"]`; `test-a`'s DR peer `test-b` rides
along, so both environment records appear):

```json
{
  "document": {
    "version": 1,
    "exportedAt": "2026-11-08T00:00:00.000Z",
    "environments": [
      { "id": "test-a", "schemaVersion": 1, "name": "Test Environment A", "category": "test", "dr": { "role": "primary", "type": "AS", "peer": "test-b" } },
      { "id": "test-b", "schemaVersion": 1, "name": "Test Environment B", "category": "test", "dr": { "role": "standby", "type": "AS", "peer": "test-a" } }
    ]
  },
  "counts": { "environments": 2, "services": 0, "deployments": 0, "ruleProfiles": 0, "operationBindings": 0 }
}
```

Render: `"Exported 7 record(s)."`

## 4. Cross-tool rules

1. **Ids are data, not paths.** A tool never accepts a filesystem path.
2. **No credentials.** `credentialRef` status is reported as
   `{ ref, configured, source }`; values are never resolved.
3. **Execution only through explicit bindings.** Only `env_operate` runs a local
   script/command target, and only when a matching enabled binding exists; no tool runs a
   Skill, an ad-hoc shell command, or a network request.
4. **Determinism.** Same registry and inputs produce the same result; no random ids,
   no wall-clock ordering.
5. **Read-only means read-only.** `env_validate`, `env_get_context`, `env_list`,
   `env_get`, `env_find`, `env_resolve`, `env_resolve_operation`, `env_export` never
   write a file.
6. **Fail closed.** A conflict, missing Skill, broken reference or production denial is
   an error, never a fallback.
7. **Bulk surface.** `env_import` and `env_export` are the only bulk read/write surface.
   Both return strict-JSON-safe values, an import reports per-record outcomes instead of
   aborting on the first failure, and an export contains `credentialRef` names only —
   never a credential value.

## 5. Non-goals for V1 tools

- Invoking a Skill. A `skill` target is discovery information; `env_operate` prepares a
  reference, it never calls the Skill.
- Running anything without a matching enabled binding: `env_operate` routes first and
  fails closed, it never guesses a target.
- Writing registry facts or operation records to memory. Only experiences (success
  summary / failure lesson) are written, and only to the plugin-owned review queue;
  operation records remain a P1 boundary.
- Partial-per-kind bundle documents: `env_import` consumes the full plural-kind shape, and
  omitting a kind means not importing it.
- Editing plugin configuration.
- Reading or writing session context for a session other than the caller's.
- Any network or shell access outside an explicit `env_operate` binding.
