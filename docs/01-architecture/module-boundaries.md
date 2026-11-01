# Module Boundaries

Status: normative for V1.

Modules are directories under `src/` (Host, TypeScript). The Client half is a single `client.js` module at the repository root.

Related: [design.md](./design.md) §3, [storage-contract.md](./storage-contract.md), [tool-contract.md](./tool-contract.md).

---

## 1. Dependency direction

```text
tools ──▶ resolver ──▶ registry ──▶ storage ──▶ fs
  │           │            │
  │           └──▶ domain ◀┘
  │
  ├──▶ router ──▶ resolver (context only)
  ├──▶ session ──▶ storage
  └──▶ memory-bridge ──▶ (external contract)

client ──▶ host tools only
```

Rules:

- `domain` has no dependencies.
- `storage` depends on `domain`.
- `registry` depends on `storage` and `domain`.
- `resolver` and `router` depend on `domain` and `registry` types, never on `storage` or `tools`.
- `tools` may depend on everything above.
- No module imports `tools` except the Host entry point (`src/index.ts`).
- `client.js` depends on Host tools, never on `src/` modules.

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

## 8. `memory-bridge`

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

## 9. `tools`

Owns the Agent-facing surface.

Responsibilities:

- Register tools with `ctx.tools.register`.
- Validate inputs with Zod.
- Map module results to the tool envelope.
- Apply approval gates for management writes.
- Redact output.

Forbidden:

- Business logic beyond orchestration.
- Direct file access.
- Re-implementing resolution.

---

## 10. `config`

Owns plugin configuration.

Responsibilities:

- Define the config schema (`dataDir`, limits).
- Validate at activation.
- Provide resolved defaults.

Forbidden:

- Reading registry files at config-validation time.
- Network access.

---

## 11. `client.js`

Owns the Web/Desktop surface.

Allowed:

- Render panels and forms.
- Call Host tools.
- Use the client locale service.
- Register slots and clean up on unmount.

Forbidden:

- Reading or writing registry files.
- Re-implementing rule resolution or routing.
- Holding durable state outside Host tools.
- Global side effects at module load.

---

## 12. Host entry

`src/index.ts` is the only place that wires modules together.

Responsibilities:

- Read config, build storage/registry/resolver/router/session.
- Register tools and their cleanup.
- Register the Client module metadata.
- Log the resolved data directory once.

Forbidden:

- Business logic.
- Direct tool implementations.
