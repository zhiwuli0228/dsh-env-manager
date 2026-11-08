# Module Boundaries

Status: normative for V1.

Modules are directories under `src/` (Host, TypeScript). The Client half is a single `client.js` module at the repository root.

Related: [design.md](./design.md) §3, [detailed-design.md](./detailed-design.md) §2, [storage-contract.md](./storage-contract.md), [tool-contract.md](./tool-contract.md).

---

## 1. Dependency direction

```text
tools ────────┐
              ├──▶ app ──▶ resolver ──▶ registry ──▶ storage ──▶ fs
transport ────┘      │          │            │
                     │          └──▶ domain ◀┘
                     ├──▶ router ──▶ resolver (context only)
                     ├──▶ executor ──▶ (local child processes; no fs policy logic)
                     ├──▶ session ──▶ storage
                     └──▶ memory-bridge ──▶ (external contract)

client ──▶ transport (HTTP) ──▶ app
```

Rules:

- `domain` has no dependencies.
- `storage` depends on `domain`.
- `registry` depends on `storage` and `domain`.
- `resolver` and `router` depend on `domain` and `registry` types, never on `storage` or `tools`.
- `app` composes storage, registry, resolver, router, session and config; it is the only
  module that knows all of them.
- `tools` and `transport` depend on `app` and `domain`; neither contains business logic
  and neither imports the other.
- No module imports `tools` or `transport` except the Host entry point (`src/index.ts`).
- `client.js` depends on the HTTP API, never on `src/` modules.

Cycles are forbidden. A cycle means the boundary is wrong.

---

## 2. `domain`

Owns the shapes.

Allowed:

- TypeScript interfaces and type guards for all records, results and diagnostics
  (including `EnvironmentDr`, `BundleDocument` and the import/export result shapes).
- Zod schemas that mirror the interfaces, with cross-checks such as `dr.peer` not
  equalling the environment's own id.
- Enums and constants (operation ids, categories, runtime modes).
- Pure helpers that operate on the types.

Forbidden:

- File I/O.
- Tool registration.
- Resolution or routing logic.
- Importing any other project module.

---

## 3. `storage`

Owns bytes on disk.

Responsibilities:

- Resolve `dataDir` and create directories.
- Read, parse, validate and write one record file (all five kinds, including the optional
  `dr` disaster-recovery marking inside `environments/{id}.yaml`).
- Atomic write protocol.
- Rolling backups.
- Session state files.
- Surface storage errors as typed errors with codes.

Forbidden:

- Cross-record validation (registry owns it).
- Template resolution.
- Skill matching.
- Credential access.

---

## 4. `registry`

Owns the in-memory view.

Responsibilities:

- Load all record directories into maps.
- Reload affected entries after writes.
- Enforce id uniqueness and filename/id agreement.
- Enforce referential integrity (data-model §14), including `Environment.dr.peer`
  references, and expose `findReferences` so deleting an in-use environment is blocked.
- Provide lookups: by id, by alias, list by category, deployments by service, deployments by environment.
- Produce load diagnostics.

Forbidden:

- Writing files (uses `storage`).
- Running templates.
- Registering tools.
- Holding mutable session state.

---

## 5. `resolver`

Owns context and rule resolution.

Responsibilities:

- Select the deployment binding (explicit id or unique match).
- Merge rule layers with field-level precedence.
- Resolve templates with cycle detection and undefined-variable detection.
- Validate resolved paths.
- Build `ServiceContext` with provenance.
- Build `ProvenanceEntry[]`.

Forbidden:

- File I/O.
- Tool registration.
- Credential resolution (status is injected by the caller).
- Skill matching.

Purity is required: all inputs are passed in, no globals, no clocks, no randomness.

---

## 6. `router`

Owns operation-to-target matching.

Responsibilities:

- Classify each binding's match level.
- Filter by eligibility.
- Detect same-level conflicts.
- Verify Skill references through an injected `SkillDirectory` interface.
- Resolve the execution target (`script` / `command` / `remote`) with the resolver's
  template engine, given environment hosts (never credential values).
- Evaluate approval and production policy.
- Build `OperationResolution` with diagnostics.

Forbidden:

- Executing targets.
- Reading files.
- Accessing credentials.
- Choosing a fallback binding.

`SkillDirectory` is an interface, so tests use a fake and the Host adapter uses the real registry when available.

---

## 6.1 `executor`

Owns running resolved targets.

Responsibilities:

- Gate: `APPROVAL_REQUIRED` for gated write executions without confirmation;
  `POLICY_DENIED` in production unless `allowProduction`.
- `script`: validate the path stays under `<dataDir>/scripts`, pick the interpreter
  (explicit or by extension), run with bounded output.
- `command`: spawn without a shell (`argv[0]` executable), optional working directory
  under `<dataDir>`, bounded output, kill on timeout.
- `remote`: build the ssh descriptor only (address/port/user/`credentialRef`); never
  executes and never reads credential values.
- `skill`: return a prepared reference (no execution).
- Redact `password=...`-style output before it is returned or stored.

Forbidden:

- Routing decisions.
- Registry I/O.
- Reading credential values.
- Shell string interpolation of local commands (argv arrays only).

The `ProcessRunner` interface is injectable so tests never spawn real processes.

---

## 7. `session`

Owns per-session default environment.

Responsibilities:

- `get(sessionId)`, `set(sessionId, environmentId | null)`.
- Persist through `storage` (or the DSH session API when available).
- Expose `{ environmentId, persisted }` to tools.

Forbidden:

- Mutating registry records.
- Reading other sessions' state.
- Deciding policy.

---

## 8. `app`

Owns the use cases. One function per tool and per HTTP operation.

Responsibilities:

- Compose storage, registry, resolver, router, executor, experience store and session
  for a request.
- Apply the record cap, actor policy and dry-run.
- Reload the registry after a successful write.
- Route operations with `resolution.experiences` attached (related lessons/summaries).
- `operate`: gate, execute (via `executor`) and write the resulting experience
  (success → summary, failure → lesson) into the review queue.
- `listExperiences` / `reviewExperience` / `addExperience` for the review queue.
- `importBundle`: parse a bundle with the normal record schemas, apply records in
  dependency order, resolve references against the registry union the ids in the same
  bundle, apply `skip`/`overwrite`/`error` conflict modes, and gate production-touching
  bundles with `APPROVAL_REQUIRED` / `FORBIDDEN`.
- `exportBundle`: collect a closed set of records for the whole registry or a selected
  set of environments (deployments, referenced services, matching bindings, referenced
  rule profiles); a selected environment's DR peer rides along in both directions so the
  bundle stays self-contained, sorted by id.
- Return domain results or throw `EnvManagerError`.

Forbidden:

- Tool registration or HTTP parsing.
- Rendering text for the model or the UI.
- Re-implementing resolution, routing or persistence.

`app` is the only module both `tools` and `transport` call, so the two surfaces cannot
drift.

---

## 9. `memory-bridge`

Owns the optional P1 integration.

Responsibilities:

- Define `MemoryBridge`, `MemoryScope`, `OperationRecord`, proposal types.
- Provide a null adapter that reports `MEMORY_BRIDGE_UNAVAILABLE`.
- Redact and bound records before emission.

Forbidden:

- Writing registry files.
- Auto-applying proposals.
- Owning a second copy of environment facts.

---

## 10. `tools`

Owns the Agent-facing surface.

Responsibilities:

- Register `defineTool` definitions with `ctx.tools.register`.
- Declare parameter and output schemas.
- Apply approval gates for management writes.
- Map `app` results to the declared JSON value and `render` text.
- Throw `EnvManagerError` for expected failures.

Forbidden:

- Business logic beyond orchestration.
- Direct file access.
- Re-implementing resolution, routing or persistence.

---

## 11. `transport`

Owns the Client-facing HTTP surface.

Responsibilities:

- Register and dispose the `/env-manager/api` route.
- Enforce method, content type, request header, origin and body limits.
- Map `{ op, payload }` to `app` calls, including the `import` (document or `yaml` text)
  and `export` operations.
- Map `EnvManagerError` codes to status codes (`IMPORT_TOO_LARGE` → 413,
  `IMPORT_INVALID` / `DR_PEER_UNKNOWN` → 400).
- Log writes with actor, op, kind, id and outcome.

Forbidden:

- Business logic.
- Reading credentials.
- CORS headers or cookie handling.
- Serving files or static assets.

---

## 12. `config`

Owns plugin configuration.

Responsibilities:

- Define the config schema (`dataDir`, limits).
- Validate at activation.
- Provide resolved defaults.

Forbidden:

- Reading registry files at config-validation time.
- Network access.

---

## 13. `client.js`

Owns the Web/Desktop surface.

Allowed:

- Render panels and forms.
- Call the plugin HTTP API.
- Use the client locale, slots and theme services.
- Register slots and clean up on unmount.

Forbidden:

- Reading or writing registry files.
- Re-implementing rule resolution or routing.
- Holding durable state outside the Host.
- Global side effects at module load.

---

## 14. Host entry

`src/index.ts` is the only place that wires modules together.

Responsibilities:

- Read config, build storage/registry/resolver/router/session/app.
- Register tools and their cleanup.
- Register the HTTP route and its cleanup.
- Register the Client module metadata.
- Log the resolved data directory once.

Forbidden:

- Business logic.
- Direct tool or transport implementations.
