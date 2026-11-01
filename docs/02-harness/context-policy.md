# Context Policy

## What to Load Automatically

For any non-trivial change, load:

- `docs/00-project/project-brief.md`
- `docs/00-project/current-state.md`
- `docs/01-architecture/design.md`
- `docs/01-architecture/detailed-design.md`
- `docs/01-architecture/module-boundaries.md`
- `docs/02-harness/harness-standard.md`

## What to Load by Task Type

### Adding or changing a tool

- `docs/01-architecture/tool-contract.md`
- `docs/01-architecture/detailed-design.md` §11
- `docs/04-development/coding-style.md`
- `docs/05-domain/operation-binding-template.md` (if routing related)

### Changing rule resolution

- `docs/01-architecture/design.md` §6
- `docs/01-architecture/module-boundaries.md`
- `docs/05-domain/rule-template.md`

### Changing the HTTP transport or the UI

- `docs/01-architecture/ui-design.md`
- `docs/01-architecture/decisions/ADR-0009-client-host-http-transport.md`
- `docs/01-architecture/security-model.md` §2, §4, §6
- `docs/04-development/coding-style.md`

### Checking a DSH runtime assumption

- `docs/01-architecture/api-verification.md`

### Deployment changes

- `docs/06-operations/deployment-guide.md`
- `docs/06-operations/security-policy.md`
