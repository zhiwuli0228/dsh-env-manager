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

Codes are defined in [`data-model.md`](data-model.md) §11.

### 1.3 Approval

| Tool | Approval |
|---|---|
| `env_delete` | always, when `confirm: true` and `writePolicy.requireApprovalForDelete` |
| `env_save` | when the record is a production environment, or a deployment whose environment is production, and `writePolicy.requireApprovalForProductionSave` |
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
`RULE_PROFILE_NOT_FOUND`, `BINDING_NOT_FOUND` depending on `kind`; `INVALID_ARGUMENT`
for a malformed id (fails before any I/O).

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

Returns the Service Context from `data-model.md` §8.2, including `provenance` and
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
  environmentId: { type: 'string', required: false },
  serviceId: { type: 'string', required: false },
  deploymentId: { type: 'string', required: false },
}
```

- At least one of `serviceId` / `deploymentId` is required; `environmentId` falls back
  to the session default and is otherwise optional — without an environment only
  `service` / `category-mode` / `global` bindings are eligible.

Returns `OperationResolution` from `data-model.md` §8.3:

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

## 4. Cross-tool rules

1. **Ids are data, not paths.** A tool never accepts a filesystem path.
2. **No credentials.** `credentialRef` status is reported as
   `{ ref, configured, source }`; values are never resolved.
3. **No execution.** No tool runs a Skill, a shell command, or a network request.
4. **Determinism.** Same registry and inputs produce the same result; no random ids,
   no wall-clock ordering.
5. **Read-only means read-only.** `env_validate`, `env_get_context`, `env_list`,
   `env_get`, `env_find`, `env_resolve`, `env_resolve_operation` never write a file.
6. **Fail closed.** A conflict, missing Skill, broken reference or production denial is
   an error, never a fallback.

## 5. Non-goals for V1 tools

- Executing an operation or invoking a Skill.
- Writing operation records to memory.
- Bulk import/export.
- Editing plugin configuration.
- Reading or writing session context for a session other than the caller's.
- Any network or shell access.
