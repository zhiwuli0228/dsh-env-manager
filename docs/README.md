# DSH Environment Manager Docs

This directory is the **project-level Harness Context Hub** for the DSH Environment Manager plugin.

It is used by humans and AI agents to understand project state, architecture, constraints, development standards, and operational procedures.

## Reading Policy

Do not read every document blindly. Read documents based on task type.

### Required for Every Non-trivial Change

1. `AGENTS.md` at the repository root
2. `docs/00-project/project-brief.md`
3. `docs/00-project/current-state.md`
4. `docs/02-harness/harness-standard.md`
5. `docs/04-development/development-guide.md`

### Architecture or Schema Changes

Also read:

1. `docs/01-architecture/design.md`
2. `docs/01-architecture/data-model.md`
3. `docs/01-architecture/module-boundaries.md`
4. `docs/01-architecture/storage-contract.md`

### Tool Surface Changes

Also read:

1. `docs/01-architecture/tool-contract.md`
2. `docs/01-architecture/data-model.md`

### Resolver / Rule Work

Also read:

1. `docs/01-architecture/design.md` §6
2. `docs/05-domain/rule-template.md`
3. `docs/01-architecture/decisions/ADR-0005-layered-rule-resolution.md`

### Router / Skill Binding Work

Also read:

1. `docs/01-architecture/design.md` §7
2. `docs/05-domain/operation-binding-template.md`
3. `docs/01-architecture/decisions/ADR-0003-skill-router-over-search.md`

### Security-Sensitive Work

Also read:

1. `docs/01-architecture/security-model.md`
2. `docs/06-operations/security-policy.md`

### Deployment / Operations Work

Also read:

1. `docs/06-operations/deployment-guide.md`
2. `docs/06-operations/security-policy.md`
3. `docs/06-operations/troubleshooting.md`

### OpenSpec Work

Also read:

1. `docs/03-openspec/proposal-rule.md`
2. `docs/03-openspec/design-rule.md`
3. `docs/03-openspec/spec-rule.md`
4. `docs/03-openspec/tasks-rule.md`

## Hard Rules

- Durable registry data is YAML files under the plugin data directory.
- Registry data is never committed to Git.
- Credentials are references only; values never appear in registry files or tool output.
- Rule templates use interpolation only; no code execution.
- Production write operations and production-affecting management writes require approval.
- Conflicts, missing Skills and broken references fail loudly; nothing is chosen silently.
- Every completed change updates `docs/00-project/current-state.md`.

## Directory Map

```text
docs/
├── 00-project/       # brief, current state, glossary, roadmap
├── 01-architecture/  # design, data model, tools, storage, security, ADRs
├── 02-harness/       # AI-assisted development harness standards
├── 03-openspec/      # proposal/design/spec/tasks rules
├── 04-development/   # coding, testing, local run, dependency rules
├── 05-domain/        # environment/service/deployment/rule/binding templates
├── 06-operations/    # deployment, security, troubleshooting
├── 07-templates/     # reusable artifact templates
└── 99-archive/       # obsolete or historical docs
```

### Architecture Index

| Document | Purpose |
|---|---|
| `architecture-overview.md` | layers, components, request flows |
| `design.md` | V1 scope, algorithms, acceptance criteria |
| `data-model.md` | record schemas and result types |
| `tool-contract.md` | tool inputs, outputs, errors |
| `storage-contract.md` | files, atomicity, sessions, migration |
| `module-boundaries.md` | module ownership and dependencies |
| `security-model.md` | credential, policy and redaction controls |
| `decisions/ADR-*.md` | accepted decisions |
