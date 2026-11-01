# Current State

This file is the **project continuity snapshot**. Update it after every completed change.

## Current Phase

**V1 design complete; implementation not started.**

The first implementable design has been derived from the brainstorm and written into
`docs/01-architecture/`. The repository still contains the initial JavaScript bundle skeleton; it is replaced during V1 implementation (see ADR-0004).

## Implemented

Documentation and repository:

- [x] GitHub repository initialized
- [x] DSH bundle manifest (`package.json`, `cordis.patch.yml`)
- [x] Host plugin entry stub (`index.js`)
- [x] Client plugin entry stub (`client.js`)
- [x] Locale resources (`locale/en.json`, `locale/zh.json`)
- [x] Plugin icon (`icon.svg`)
- [x] README, LICENSE, `.gitignore`
- [x] Docs Harness Context Hub
- [x] AGENTS.md project rules
- [x] V1 design suite:
  - [x] `design.md` — scope, architecture, flows, acceptance criteria
  - [x] `data-model.md` — record schemas and result types
  - [x] `tool-contract.md` — Agent and management tools
  - [x] `storage-contract.md` — persistence, atomicity, sessions
  - [x] `module-boundaries.md` — ownership and dependency direction
  - [x] `security-model.md` — credentials, approval, redaction
  - [x] ADR-0001 … ADR-0008

Code:

- [ ] TypeScript Host scaffold (`src/`, `tsconfig.json`)
- [ ] Domain schemas and validators
- [ ] Storage layer
- [ ] Registry layer
- [ ] Context resolver
- [ ] Rule resolver with provenance
- [ ] Operation Skill router
- [ ] Session context store
- [ ] Read tools
- [ ] Management tools
- [ ] Client configuration UI
- [ ] Memory bridge contract and null adapter
- [ ] Tests

## Current Constraints

- V1 accepts `schemaVersion: 1` only.
- No plain-text credentials in registry files.
- No arbitrary code in rule templates.
- No remote execution in V1.
- No production auto-apply.
- Registry data is git-ignored.

## Current Directory Plan

```text
dsh-env-manager/
├── AGENTS.md
├── index.js              # host entry shim (V1)
├── client.js             # client module
├── cordis.patch.yml
├── package.json
├── tsconfig.json         # added in V1
├── src/                  # TypeScript host (V1)
├── lib/                  # build output, git-ignored
├── locale/
├── icon.svg
├── docs/
├── data/                 # runtime registry data, git-ignored
└── tests/
```

## Known Gaps

- No TypeScript build yet.
- No persistence yet.
- No resolver, router or tool implementation.
- No UI panels.
- No Skill registry integration; availability is designed but unverified.
- Memory bridge is a contract only.
- Open design questions listed in `design.md` §16 remain unverified.

## Next Recommended Work

Following brainstorm §13.4 and design §16:

1. Verify the open DSH API questions (data directory, Skill registry, session API, client slot).
2. Scaffold TypeScript Host and add `zod`, `yaml`, `vitest`.
3. Implement `domain` schemas and tests.
4. Implement `storage` with atomic writes and tests.
5. Implement `registry` with validation and tests.
6. Implement `resolver` (template engine, layering, provenance) with tests.
7. Implement `router` (match levels, conflicts, policy) with tests.
8. Implement `session` store.
9. Implement tools and register them.
10. Implement the Client UI (list/edit/preview).
11. Define the memory bridge contract and null adapter.
