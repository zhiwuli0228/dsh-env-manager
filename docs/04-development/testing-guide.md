# Testing Guide

## Framework

Vitest, with TypeScript sources tested directly (no build required for tests).

## Commands

```bash
npm test             # run once
npm run test:watch   # watch mode
```

## Test Organization

```text
tests/
├── domain/schemas.test.ts
├── storage/records.test.ts
├── storage/atomic.test.ts
├── registry/registry.test.ts
├── resolver/template.test.ts
├── resolver/layers.test.ts
├── resolver/context.test.ts
├── router/match.test.ts
├── router/router.test.ts
├── session/session-context.test.ts
├── tools/read.test.ts
└── tools/manage.test.ts
```

## What to test

### `domain`
- Valid record passes; unknown field fails.
- Id pattern and `schemaVersion` enforcement.
- Discriminated unions reject mismatched `runtimeMode`/`location.kind`.

### `storage`
- Atomic write leaves no temp file.
- Read tolerates missing directory and invalid YAML.
- Backup pruning keeps at most 5.
- Concurrent writes serialize in-process.

### `registry`
- Load, lookup by id and alias.
- Duplicate id detection.
- Referential integrity: missing environment/service/host/cluster/rule profile.
- Invalid file is skipped, not deleted.

### `resolver`
- Layer precedence: service < environment < deployment.
- Field-level merge keeps unrelated fields.
- Provenance: `definedBy`, `inputs`, `shadowed` for the worked example in design §6.9.
- Undefined variable, cycle, path traversal, type mismatch.
- Only the runtime's log source and class location are resolved.

### `router`
- Each match level, in isolation and in combination.
- Highest level wins; lower levels ignored.
- Same-level conflict lists all candidates and selects none.
- Missing skill, source mismatch, digest mismatch.
- Unknown skill registry degrades to `'unknown'` plus warning.
- Production denial and `requiresApproval` defaults.
- Parameter mapping, including failure on unresolved reference.

### `session`
- Set, get, clear.
- Two sessions do not interfere.
- Corrupt file falls back to memory with `persisted: false`.

### `tools`
- Result envelope shape for success and failure.
- No credential value ever appears in output (assert on serialized JSON).
- Invalid id error code.
- `env_validate` does not write.

## Fixtures

- Under `tests/fixtures/`, one directory per scenario.
- Fake values only: `test-a`, `10.0.0.x`, `example.internal`, `cred-test-*`.
- A fixture that needs a secret-like string must use an obvious placeholder and must not be a real credential.

## Coverage expectations

No numeric gate in V1. The resolver, router and storage modules are expected to be near-complete because they are pure and cheap to test. The Client UI is verified manually.
