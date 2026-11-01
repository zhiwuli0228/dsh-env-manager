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

- TypeScript interfaces and type guards for all records, results and diagnostics.
- Zod schemas that mirror the interfaces.
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
- Read, parse, validate and write one record file.
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
- Enforce referential integrity (data-model §12).
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

Owns operation-to-Skill matching.

Responsibilities:

- Classify each binding's match level.
- Filter by eligibility.
- Detect same-level conflicts.
- Verify Skill references through an injected `SkillDirectory` interface.
- Evaluate approval and production policy.
- Map parameters with the resolver's template engine.
- Build `OperationResolution` with diagnostics.

Forbidden:

- Executing Skills.
- Reading files.
- Accessing credentials.
- Choosing a fallback binding.

`SkillDirectory` is an interface, so tests use a fake and the Host adapter uses the real registry when available.

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

- Compose storage, registry, resolver, router and session for a request.
- Apply the record cap, actor policy and dry-run.
- Reload the registry after a successful write.
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
- Map `{ op, payload }` to `app` calls.
- Map `EnvManagerError` codes to status codes.
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
