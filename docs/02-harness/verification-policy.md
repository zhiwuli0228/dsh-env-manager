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

### `storage`

- Atomic write/read round trip
- No temp file left after success or failure
- Missing directory handled
- Invalid YAML skipped with diagnostic, file kept
- Backup pruning

### `registry`

- Load and lookup
- Duplicate id detection
- Broken reference detection for every reference kind
- Reload after write reflects the change

### `resolver`

- Layer precedence
- Field-level merge
- Provenance for the worked example
- Undefined variable, cycle, path traversal, type mismatch
- Only runtime-applicable log source and class location resolved

### `router`

- Every match level
- Highest-level selection
- Same-level conflict
- Skill availability: present, missing, source mismatch, digest mismatch, registry unavailable
- Production policy and approval defaults
- Parameter mapping failures

### `session`

- Set, get, clear
- Cross-session isolation
- Corrupt state fallback

### `tools`

- Envelope shape
- Error codes
- No credential value in serialized output
- `env_validate` is read-only

### Client UI (manual)

- Panels load with empty and populated registries
- Create/edit/delete round trip through Host tools
- Rule preview shows provenance
- Conflict warning appears for same-level bindings
- Production actions are visually distinct and confirmed
- Locale switches between `en` and `zh`

## Evidence to record

For each completed task, `current-state.md` should state what was verified and what remains manual.

## Regression rule

A bugfix must add a test that fails before the fix and passes after it, unless the defect is UI-only.
