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
3. `docs/01-architecture/detailed-design.md`
4. `docs/01-architecture/module-boundaries.md`
5. `docs/01-architecture/storage-contract.md`

### Environment Model Questions

Also read:

1. `docs/01-architecture/decisions/ADR-0010-environment-plane-model.md`
2. `docs/01-architecture/decisions/ADR-0011-k8s-node-execution-model.md`
3. `docs/01-architecture/data-model.md` §3
4. `docs/01-architecture/ui-design.md` §6.3

### DR Groups / Bundle Import-Export Questions

Also read:

1. `docs/01-architecture/decisions/ADR-0012-dr-groups-and-bundle-import-export.md`
2. `docs/01-architecture/data-model.md` §8 and §9
3. `docs/05-domain/dr-group-template.md`

### Runtime API Questions

Also read:

1. `docs/01-architecture/api-verification.md`
2. `docs/01-architecture/decisions/ADR-0009-client-host-http-transport.md`

### Implementation Work

Also read:

1. `docs/01-architecture/implementation-plan.md`
2. `docs/01-architecture/ui-design.md` (Client changes only)
3. `docs/02-harness/client-ui-integration.md` (sidebar/main slot changes only)

### Tool Surface Changes

Also read:

1. `docs/01-architecture/tool-contract.md`
2. `docs/01-architecture/data-model.md`
3. `docs/01-architecture/detailed-design.md` §11

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
2. `docs/06-operations/release.md`
3. `docs/06-operations/security-policy.md`
4. `docs/06-operations/troubleshooting.md`

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
├── 05-domain/        # environment/service/deployment/rule/binding/dr-group templates
├── 06-operations/    # deployment, release, security, troubleshooting
├── 07-templates/     # reusable artifact templates
└── 99-archive/       # obsolete or historical docs
```

### Architecture Index

| Document | Purpose |
|---|---|
| `architecture-overview.md` | layers, components, request flows |
| `design.md` | V1 scope, algorithms, acceptance criteria |
| `detailed-design.md` | module contracts, algorithms, tool/HTTP specs, tests |
| `data-model.md` | record schemas and result types |
| `tool-contract.md` | model-facing tool inputs, outputs, errors |
| `storage-contract.md` | files, atomicity, sessions, migration |
| `module-boundaries.md` | module ownership and dependencies |
| `ui-design.md` | panels, transport, states, i18n, QA checklist |
| `security-model.md` | credential, policy and redaction controls |
| `api-verification.md` | verified DSH runtime facts and open probes |
| `implementation-plan.md` | ordered tasks, acceptance, cut line |
| `decisions/ADR-*.md` | accepted decisions (ADR-0009 = UI transport, ADR-0010 = environment/plane model, ADR-0011 = K8s node/access model, ADR-0012 = DR groups + bundle import/export) |
