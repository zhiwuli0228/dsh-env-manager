# Agent Instructions

This repository contains the `dsh-env-manager` DSH plugin.

## Before Starting Work

1. Read `docs/00-project/project-brief.md`.
2. Read `docs/00-project/current-state.md`.
3. Read `docs/02-harness/harness-standard.md`.
4. Read `docs/04-development/development-guide.md`.

## Common Tasks

### Adding a Tool

- Read `docs/01-architecture/module-boundaries.md`.
- Implement logic in resolver/router modules, not directly in the tool.
- Add tests.
- Update `docs/00-project/current-state.md`.

### Changing the UI

- Read `docs/04-development/coding-style.md`.
- Edit `client.js`.
- Verify in DSH Web/Desktop.

### Changing Storage

- Read `docs/01-architecture/storage-contract.md`.
- Update schemas.
- Add migration notes if needed.

## Constraints

- No plain-text credentials in registry files.
- No arbitrary code execution in rule templates.
- No auto-apply of production changes.
- Keep file-based source of truth intact.
