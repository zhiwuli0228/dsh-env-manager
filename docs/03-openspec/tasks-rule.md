# Tasks Rule

Tasks must be small and verifiable.

## Task Format

```markdown
- [ ] Task name
  - Files:
  - Behavior:
  - Tests:
  - Verification:
```

## Rules

- Do not combine unrelated modules in one task.
- Do not add broad refactoring tasks.
- Every implementation task must include tests or manual verification.
- Docs must be updated when behavior or storage contract changes.
- `docs/00-project/current-state.md` must be updated at the end.

## Good Task Example

```markdown
- [ ] Implement environment registry storage
  - Files: src/storage/environment.js, tests/storage/environment.test.js
  - Behavior: read/write environment records atomically
  - Tests: create, read, update, missing file
  - Verification: npm test tests/storage/environment.test.js
```
