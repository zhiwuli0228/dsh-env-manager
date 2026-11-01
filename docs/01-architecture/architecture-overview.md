# Architecture Overview

Status: V1.

Related: [design.md](./design.md), [detailed-design.md](./detailed-design.md), [module-boundaries.md](./module-boundaries.md), [data-model.md](./data-model.md).

---

## 1. Layers

```text
DSH Web / Desktop UI
  └── Client module (client.js): panels, context preview, YAML editor
          │
          ▼  POST /env-manager/api
DSH Host process
  ├── transport    header/origin/size checks, op dispatch
  ├── tools        Agent-facing schemas, approval gates
  ├── app          use cases shared by tools and transport
  ├── session      per-session default environment
  ├── router       operation → Skill matching
  ├── resolver     context + rule resolution with provenance
  ├── registry     validated in-memory snapshot
  ├── storage      atomic YAML persistence
  └── memory-bridge (P1 contract, null adapter in V1)
          │
          ▼
Plugin data directory (YAML records + session JSON)
```

`tools` and `transport` are sibling adapters over `app`; neither contains business
logic. This is the core boundary that keeps the Agent path and the UI path consistent.

---

## 2. Major components

### 2.1 Client module

Runs inside DSH Web/Desktop as a `sidebar.panellist` entry plus the `main` panel keyed
`env-manager`.

Responsibilities:

- Environment, service, deployment, rule and binding lists and YAML editors.
- Context preview with provenance badges.
- Operation preview with skill availability and conflict display.
- Validation and diagnostics display.
- Locale-aware text (`en`, `zh`).

It calls the plugin HTTP API and renders the results. It holds no business logic and no
durable state.

### 2.2 Tools

The Agent-facing surface: ten `env_*` tools.

Read tools answer questions about the registry. Management tools validate and write
records, with approval gates for production.

Tool handlers are thin; they resolve ids, call `app`, and map results to the declared
JSON value and `render` text. Expected failures throw `EnvManagerError`.

### 2.3 Transport

The Client-facing surface: one same-origin route, `POST /env-manager/api`.

- Requires `x-env-manager-request: 1`, JSON content type and a same-origin `Origin`.
- Body limit 2 MiB; no CORS, no cookies.
- Dispatches `{ op, payload }` to `app` and maps codes to HTTP statuses.

### 2.4 App

The use-case layer shared by both adapters.

- Composes storage, registry, resolver, router and session.
- Applies the record cap, timestamps, actor policy and dry-run.
- Reloads the registry after a write.
- Returns domain results or throws `EnvManagerError`.

### 2.5 Registry

Loads all record files into an in-memory snapshot and validates them.

- Ids are unique per record type.
- References resolve.
- Invalid files are skipped with diagnostics, never deleted.
- V1 loads at the start of every application request; a write triggers a reload before
  returning.

### 2.6 Resolver

Pure functions that combine records into a `ServiceContext`.

- Merges rule layers field by field.
- Resolves `${...}` templates with cycle and undefined-variable detection.
- Rejects path traversal.
- Attaches provenance to every returned field.

### 2.7 Router

Pure functions that map an operation to a bound Skill.

- Groups bindings by match level.
- Fails on same-level conflicts.
- Checks Skill availability through an injected interface (`ctx.skills.snapshot`).
- Evaluates approval and production policy.
- Maps parameters and returns diagnostics.

The router never executes anything.

### 2.8 Session

Stores the current session's default environment.

- Per-session isolation.
- V1 persists `sessions/<sessionId>.json`; a projection is a later refinement.
- Never affects other sessions or registry files.

### 2.9 Memory bridge

P1 integration with the memory plugin.

- V1 defines types and a null adapter.
- Emits redacted operation records.
- Proposes rule/skill changes for review.
- Never applies changes.

### 2.10 Storage

Atomic YAML persistence.

- Directory per record type.
- Temp file + fsync + rename.
- Rolling backups (5 per record).
- Bounded and validated.

---

## 3. Request flows

### 3.1 Resolve a service context

```text
env_resolve(environmentId?, serviceId, deploymentId?)
→ tools: validate input, resolve session default if needed
→ app: fetch env, service, deployments from the registry
→ resolver: select deployment, merge rules, resolve templates
→ app: attach credential status (describe only)
→ tools: return ServiceContext
```

### 3.2 Route an operation

```text
env_resolve_operation(operation, environmentId?, serviceId?, deploymentId?)
→ resolve context (above)
→ router: classify bindings, detect conflict, snapshot skills, evaluate policy
→ app: resolve parameters
→ tools: return OperationResolution
```

### 3.3 Save a record

```text
env_save(kind, record, dryRun?)
→ tools: parse the JSON parameter
→ app: validate with Zod, stamp timestamps, enforce the record cap
→ approval gate when production is affected
→ storage: atomic write + backup
→ app: reload registry, re-run integrity checks
→ tools: return id, created flag, warnings
```

### 3.4 Validate the registry

```text
env_validate
→ app: load snapshot and integrity diagnostics
→ tools: summarize counts and diagnostics
```

### 3.5 UI read and write

```text
client: call('record.get', { kind, id })
→ transport: header + origin + size checks
→ app.get(kind, id)
→ transport: { ok: true, data: { record, yaml } }
→ client: render the editor
```

Writes follow the same path with actor `'ui'` and the production policy in
`writePolicy.allowUiProductionWrites`.

---

## 4. Cross-cutting concerns

| Concern | Approach |
|---|---|
| Credentials | references only; status via `describe` |
| Approval | policy in router; `ctx.approval` for management writes |
| Rule safety | interpolation only, cycle/traversal detection |
| Redaction | shared function before diagnostics and P1 records |
| Persistence | atomic write, bounded backups, no hidden state |
| Performance | small YAML scans; no indexes in V1 |
| Compatibility | `schemaVersion` gate; unknown versions skipped |
| Client security | same-origin route, custom header, no CORS, actor policy |

---

## 5. What is deliberately absent

- No network calls.
- No remote execution.
- No database.
- No vector search.
- No background jobs.
- No telemetry.

Each absence is a V1 scope decision, not an oversight.
