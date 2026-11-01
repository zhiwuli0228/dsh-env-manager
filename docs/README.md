# DSH Environment Manager Docs

This directory is the **project-level Harness Context Hub** for the DSH Environment Manager plugin.

It is used by humans and AI agents to understand project state, architecture, constraints, development standards, and operational procedures.

## Reading Policy

Do not read every document blindly. Read documents based on task type.

### Required for Every Non-trivial Change

1. `AGENTS.md` (if present at repo root)
2. `docs/00-project/project-brief.md`
3. `docs/00-project/current-state.md`
4. `docs/02-harness/harness-standard.md`
5. `docs/04-development/development-guide.md`

### Architecture Changes

Also read:

1. `docs/01-architecture/design.md`
2. `docs/01-architecture/module-boundaries.md`
3. `docs/01-architecture/storage-contract.md`

### OpenSpec Work

Also read:

1. `docs/03-openspec/proposal-rule.md`
2. `docs/03-openspec/design-rule.md`
3. `docs/03-openspec/spec-rule.md`
4. `docs/03-openspec/tasks-rule.md`

### Tool / Skill Router Work

Also read:

1. `docs/01-architecture/module-boundaries.md`
2. `docs/05-domain/operation-binding-template.md`
3. `docs/05-domain/rule-template.md`

### Deployment / Operations Work

Also read:

1. `docs/06-operations/deployment-guide.md`
2. `docs/06-operations/security-policy.md`
3. `docs/06-operations/troubleshooting.md`

## Hard Rules

- Durable knowledge must be stored as Markdown / YAML / JSON files.
- Credentials and secrets must never be stored in plain text in this repository.
- Every change must keep the Host plugin side-effect safe and clean on uninstall.
- Every implementation must include tests for core resolver and router logic.
- Every completed change must update `docs/00-project/current-state.md`.

## Directory Map

```text
docs/
├── 00-project/       # project brief, state, glossary, roadmap
├── 01-architecture/  # design, module boundaries, storage contracts, ADRs
├── 02-harness/       # AI-assisted development harness standards
├── 03-openspec/      # OpenSpec proposal/design/spec/tasks rules
├── 04-development/   # coding, testing, local run, dependency rules
├── 05-domain/        # environment/service/operation domain templates
├── 06-operations/    # deployment and operational guides
├── 07-templates/     # reusable artifact templates
└── 99-archive/       # obsolete or historical docs
```
