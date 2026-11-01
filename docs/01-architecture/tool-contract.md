# Tool Contract (V1)

Status: normative for V1.

This document defines the Agent tools exposed by DSH Environment Manager. Schemas are expressed as TypeScript types for readability; the implementation validates the same shapes with Zod.

---

## 1. Conventions

### 1.1 Result envelope

Every tool returns JSON:

```ts
type ToolResult<T> =
  | { ok: true; data: T; diagnostics?: Diagnostic[] }
  | { ok: false; error: ToolError };

interface ToolError {
  code: string;          // see data-model §11
  message: string;       // human readable, no secrets
  details?: Record<string, unknown>;
}
```

### 1.2 Rules

- Tool handlers are thin: validate → call module → format.
- Tools never read files directly; they use `registry` / `storage`.
- Tools never return credential values; only `{ ref, status }`.
- Tools never return absolute file contents or stack traces.
- Response size is bounded: list tools cap at 200 items and include `truncated: true` when capped.
- `environmentId` may be omitted where allowed; the session default is then used. If neither exists, the error names both options.

### 1.3 Registration

Tools are registered with `ctx.tools.register(...)` inside `apply`, and their cleanup is returned through `ctx.effect`.

---

## 2. Read tools

### 2.1 `env_list`

Purpose: list environments visible in the profile.

Input:

```ts
interface EnvListInput {
  category?: EnvironmentCategory;
  query?: string;        // matches name or alias, case-insensitive
  limit?: number;        // default 50, max 200
}
```

Output:

```ts
interface EnvironmentSummary {
  environmentId: string;
  name: string;
  aliases: string[];
  category: EnvironmentCategory;
  hostCount: number;
  clusterCount: number;
  serviceCount: number;  // distinct services with deployments here
  roleIds: string[];
}

interface EnvListData {
  environments: EnvironmentSummary[];
  truncated: boolean;
}
```

Errors: `RECORD_INVALID` diagnostics are returned in `diagnostics`, not as failure.

### 2.2 `env_get`

Purpose: read one environment, including topology and credential status.

Input:

```ts
interface EnvGetInput {
  environmentId: string;
}
```

Output:

```ts
interface EnvironmentDetail {
  environmentId: string;
  name: string;
  aliases: string[];
  category: EnvironmentCategory;
  description?: string;
  roles: LogicalRole[];
  hosts: HostView[];
  clusters: ClusterView[];
  endpoints: EndpointView[];
  ruleOverrides?: RuleOverride;
  deployments: DeploymentSummary[];
}

interface HostView {
  id: string;
  name: string;
  os?: string;
  ip?: string;
  sshPort?: number;
  roles: string[];
  credential?: CredentialStatus;
}

interface ClusterView {
  id: string;
  name: string;
  kind: 'kubernetes' | 'docker';
  apiEndpoint?: string;
  namespaces?: string[];
  credential?: CredentialStatus;
}

interface EndpointView {
  id: string;
  kind: string;
  hostRef?: string;
  clusterRef?: string;
  url?: string;
  port?: number;
  credential?: CredentialStatus;
}

interface DeploymentSummary {
  deploymentId: string;
  serviceId: string;
  runtimeMode: RuntimeMode;
  name?: string;
}
```

Errors: `ENV_NOT_FOUND`.

### 2.3 `env_find`

Purpose: search across environments, services, hosts and endpoints.

Input:

```ts
interface EnvFindInput {
  query: string;         // required, min length 2
  kinds?: Array<'environment' | 'service' | 'host' | 'cluster' | 'endpoint'>;
  limit?: number;        // default 30, max 100
}
```

Output:

```ts
interface EnvFindHit {
  kind: 'environment' | 'service' | 'host' | 'cluster' | 'endpoint';
  id: string;
  label: string;
  environmentId?: string;
  matchedOn: 'name' | 'alias' | 'id' | 'ip' | 'url';
}

interface EnvFindData {
  hits: EnvFindHit[];
  truncated: boolean;
}
```

Matching is literal, case-insensitive substring. No fuzzy scoring in V1.

### 2.4 `env_resolve`

Purpose: build the Service Context for a service in an environment.

Input:

```ts
interface EnvResolveInput {
  environmentId?: string;
  serviceId: string;
  deploymentId?: string;
}
```

Resolution of `environmentId`:

1. Explicit value wins.
2. Otherwise the session default.
3. Otherwise `ENV_NOT_FOUND` with a message naming both options.

`deploymentId`:

- Explicit value wins.
- Omitted and exactly one binding matches → used.
- Omitted and several bindings match → `DEPLOYMENT_AMBIGUOUS` listing ids, runtime modes and names.

Output: `ServiceContext` (see [data-model.md](./data-model.md) §8.2).

Errors:

- `ENV_NOT_FOUND`
- `SERVICE_NOT_FOUND`
- `DEPLOYMENT_NOT_FOUND`
- `DEPLOYMENT_AMBIGUOUS`
- `RULE_*` for template failures

Note: rule failures are errors because the caller asked for resolved values. The response still includes whatever fields resolved successfully.

### 2.5 `env_resolve_operation`

Purpose: route an operation to its bound Skill and map parameters.

Input:

```ts
interface EnvResolveOperationInput {
  environmentId?: string;
  serviceId: string;
  deploymentId?: string;
  operation: string;     // standard id or custom id
}
```

Output: `OperationResolution` (see [data-model.md](./data-model.md) §8.3).

Behavior:

- Resolves the context first; context-resolution errors propagate.
- Selects the highest eligible match level; conflicts are errors.
- Checks Skill availability as described in design §7.3.
- Evaluates policy as described in design §7.4.
- Never returns a Skill name when `ok` is false.

Errors:

- context errors as in `env_resolve`
- `BINDING_CONFLICT`
- `SKILL_UNAVAILABLE`
- `POLICY_DENIED`
- `PARAMETER_RESOLUTION_FAILED`

### 2.6 `env_get_context`

Purpose: read the session default environment.

Input: none.

Output:

```ts
interface SessionContextData {
  defaultEnvironmentId?: string;
  updatedAt?: string;
  persisted: boolean;
}
```

`persisted: false` means the value is in memory only; a warning diagnostic `SESSION_CONTEXT_UNPERSISTED` is included.

### 2.7 `env_set_context`

Purpose: set or clear the session default environment.

Input:

```ts
interface EnvSetContextInput {
  environmentId: string | null;
}
```

Output: `SessionContextData`.

Validation: the environment must exist (`ENV_NOT_FOUND`). Passing `null` clears.

Isolation: only the current session is affected.

---

## 3. Management tools

Management tools change registry state. They validate before writing and never write partial records.

### 3.1 `env_save`

Purpose: create or replace one record.

Input:

```ts
type EnvSaveInput =
  | { type: 'environment'; record: Environment }
  | { type: 'service'; record: Service }
  | { type: 'deployment'; record: DeploymentBinding }
  | { type: 'rule-profile'; record: RuleProfile }
  | { type: 'operation-binding'; record: OperationBinding };
```

Behavior:

- Validates the record against its schema and referential integrity (§12 of data-model).
- `createdAt` is preserved on update; `updatedAt` is refreshed.
- Writes atomically.
- Reloads the registry entry on success.

Output:

```ts
interface EnvSaveData {
  type: string;
  id: string;
  created: boolean;
  warnings: Diagnostic[];
}
```

Policy:

- If the record is production-affecting (an environment with `category: production`, or a deployment/binding that resolves to one), the Host requests approval through `ctx.approval` before writing. A denied approval returns `POLICY_DENIED`.
- Non-production writes do not prompt.

### 3.2 `env_delete`

Purpose: delete one record by id.

Input:

```ts
interface EnvDeleteInput {
  type: 'environment' | 'service' | 'deployment' | 'rule-profile' | 'operation-binding';
  id: string;
}
```

Behavior:

- Refuses to delete a record still referenced by another record: `RECORD_IN_USE` with the referencing ids.
- Production-affecting deletion requires approval.
- Deletes the file and reloads.

Output:

```ts
interface EnvDeleteData {
  type: string;
  id: string;
  deleted: boolean;
}
```

### 3.3 `env_validate`

Purpose: validate the whole registry and report problems.

Input:

```ts
interface EnvValidateInput {
  fix?: boolean;         // V1 only accepts false; reserved
}
```

Output:

```ts
interface EnvValidateData {
  records: number;
  valid: number;
  invalid: number;
  diagnostics: Diagnostic[];
}
```

Checks:

- schema validity
- unique ids and matching file names
- referential integrity (data-model §12)
- unreachable rule profiles (defined but never referenced) as `info`
- operation bindings that can never match (empty service/global mismatch) as `warning`
- duplicate host IPs within one environment
- production bindings with `allowProduction: false` as `info` (expected, not an error)

`env_validate` never writes.

---

## 4. Data transfer notes

- `Host`, `Service`, etc. in tool inputs use the same shapes as [data-model.md](./data-model.md); extra fields are rejected.
- Timestamps in inputs are ignored on create and overwritten on update.
- `schemaVersion` is optional in inputs and forced to `1`.
- Ids are validated by pattern; ids are never derived from user text automatically.

---

## 5. Non-goals for V1 tools

- No remote command execution.
- No credential value read.
- No bulk import/export.
- No history or undo.
- No search ranking beyond literal substring.
