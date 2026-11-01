# Architecture Overview

Status: V1.

Related: [design.md](./design.md), [module-boundaries.md](./module-boundaries.md), [data-model.md](./data-model.md).

---

## 1. Layers

```text
DSH Web / Desktop UI
  └── Client module (client.js): configuration panels, context preview
          │
          ▼  tool calls
DSH Host process
  ├── tools        request validation and response shaping
  ├── session      per-session default environment
  ├── router       operation → Skill matching
  ├── resolver     context + rule resolution with provenance
  ├── registry     validated in-memory view
  ├── storage      atomic YAML persistence
  └── memory-bridge (P1 contract, null adapter in V1)
          │
          ▼
Plugin data directory (YAML records + session JSON)
```

---

## 2. Major components

### 2.1 Client module

Runs inside DSH Web/Desktop.

Responsibilities:

- Environment, service, deployment, rule and binding editors.
- Context preview with provenance badges.
- Validation and diagnostics display.
- Locale-aware text.

It calls Host tools and renders the results. It holds no business logic and no durable state.

### 2.2 Tools

The only Agent-facing surface.

Read tools answer questions about the registry. Management tools validate and write records, with approval gates for production.

Tool handlers are thin; they delegate to `registry`, `resolver`, `router` and `session`.

### 2.3 Registry

Loads all record files into memory and validates them.

- Ids are unique per record type.
- References resolve.
- Invalid files are skipped with diagnostics, never deleted.
- Reload happens after every write.

### 2.4 Resolver

Pure functions that combine records into a `ServiceContext`.

- Merges rule layers field by field.
- Resolves `${...}` templates with cycle and undefined-variable detection.
- Rejects path traversal.
- Attaches provenance to every returned field.

### 2.5 Router

Pure functions that map an operation to a bound Skill.

- Groups bindings by match level.
- Fails on same-level conflicts.
- Checks Skill availability through an injected interface.
- Evaluates approval and production policy.
- Maps parameters and returns diagnostics.

The router never executes anything.

### 2.6 Session

Stores the current session's default environment.

- Per-session isolation.
- Durable file fallback; DSH session API preferred when available.
- Never affects other sessions or registry files.

### 2.7 Memory bridge

P1 integration with the memory plugin.

- V1 defines types and a null adapter.
- Emits redacted operation records.
- Proposes rule/skill changes for review.
- Never applies changes.

### 2.8 Storage

Atomic YAML persistence.

- Directory per record type.
- Temp file + rename.
- Rolling backups.
- Bounded and validated.

---

## 3. Request flows

### 3.1 Resolve a service context

```text
env_resolve(environmentId?, serviceId, deploymentId?)
→ tools: validate input, resolve session default if needed
→ registry: fetch env, service, deployments
→ resolver: select deployment, merge rules, resolve templates
→ registry/credentials: credential status
→ tools: format ServiceContext
```

### 3.2 Route an operation

```text
env_resolve_operation(environmentId?, serviceId, operation)
→ resolve context (above)
→ router: classify bindings, detect conflict, check Skill, evaluate policy
→ tools: format OperationResolution
```

### 3.3 Save a record

```text
env_save(type, record)
→ tools: validate schema and referential integrity
→ approval gate when production is affected
→ registry: check referential integrity
→ storage: atomic write + backup
→ registry: reload
→ tools: return id, created flag, warnings
```

### 3.4 Validate the registry

```text
env_validate
→ registry: scan and validate all records
→ tools: summarize counts and diagnostics
```

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

---

## 5. What is deliberately absent

- No network calls.
- No remote execution.
- No database.
- No vector search.
- No background jobs.
- No telemetry.

Each absence is a V1 scope decision, not an oversight.
