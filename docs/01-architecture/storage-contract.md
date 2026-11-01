# Storage Contract

## Location

Registry files live under the plugin workspace directory, resolved through the DSH plugin context.

Default:

```text
<plugin-workspace>/data/
├── environments/
├── services/
├── deployments/
├── rules/
└── operations/
```

## File Formats

All registry files are YAML with a matching JSON schema for validation.

- `.yaml` files for human-editable records
- `.json` files for generated indexes (optional)

## Atomicity

- Writes must be atomic (write temp file + rename).
- Reads must tolerate missing files gracefully.
- Concurrent writes to the same record are last-write-wins.

## Schema Versioning

Each record type has a `schemaVersion` field.

Current schema version is `1`.

## Required Fields

Every record must contain:

- `id`: unique identifier within the record type
- `schemaVersion`: integer
- `createdAt`: ISO 8601 timestamp
- `updatedAt`: ISO 8601 timestamp

## Validation

On write:

- Required fields present
- `id` matches filename (optional but recommended)
- No disallowed keys
- Referenced records exist (best-effort check)

On read:

- Skip records with unknown `schemaVersion` and log warning
- Ignore records that fail schema validation

## Backup

The storage layer may optionally write backups to:

```text
<plugin-workspace>/data/.backups/
```

Backup policy is implementation-defined in V1.
