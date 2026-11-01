# Verification Policy

Every implementation task must include at least one of:

- unit tests for pure logic
- integration tests for storage / registry / tools
- a manual UI checklist
- a contract check against a fixture

## Required by module

### `domain`

- Valid record accepted; unknown field rejected
- Id pattern and `schemaVersion` enforced
- Discriminated union rejects mismatched runtime/location
- `parseRecordInput` accepts omitted timestamps; `finalizeRecord` stamps them

### `storage`

- Atomic write/read round trip
- No temp file left after success or a caught failure
- Missing directory handled
- Invalid YAML skipped with diagnostic, file kept
- Backup pruning (max 5)

### `registry`

- Load and lookup
- Duplicate id detection
- Broken reference detection for every reference kind
- Reload after write reflects the change
- Concurrent loads share one in-flight scan

### `resolver`

- Layer precedence
- Field-level merge
- Provenance for the worked example
- Undefined variable, cycle, path traversal, type mismatch, malformed template
- Only runtime-applicable log source and class location resolved

### `router`

- Every match level
- Highest-level selection
- Same-level conflict
- Skill availability: present, missing, source mismatch, provider mismatch,
  registry unavailable or incomplete
- Production policy and approval defaults
- Parameter mapping failures

### `session`

- Set, get, clear
- Cross-session isolation
- Corrupt state treated as "no default", `persisted: false`

### `app`

- Save→get round trip
- Delete refused while referenced
- Dry-run writes nothing
- UI actor production denial

### `tools`

- Returned value matches the declared `output.schema`
- Expected failures throw `EnvManagerError` with the right code
- No credential value in serialized output
- `env_validate` is read-only
- Approval denial changes nothing on disk

### `transport`

- Header, origin, method and size rejection
- Status mapping for each error class
- Production UI write denied by default
- No stack trace or file path in the response body

### Client UI (manual)

- Panels load with empty and populated registries
- Create/edit/delete round trip through the HTTP API
- Rule preview shows provenance
- Conflict warning appears for same-level bindings
- Production actions are visually distinct and confirmed
- Locale switches between `en` and `zh`
- Full checklist: `docs/01-architecture/ui-design.md` §12

## Evidence to record

For each completed task, `current-state.md` should state what was verified and what remains manual.

## Regression rule

A bugfix must add a test that fails before the fix and passes after it, unless the defect is UI-only.
