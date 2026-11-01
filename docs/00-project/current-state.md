# Current State

This file is the **project continuity snapshot**. Update it after every completed change.

## Current Phase

**V1 complete design; implementation not started.**

The design is now implementation-ready: runtime APIs were verified against the installed
DSH release, the module contracts, tool schemas, HTTP transport, UI and build plan are
written, and the remaining unknowns are tracked as probes rather than open design
questions. The repository still contains the initial JavaScript bundle skeleton; it is
replaced during V1 implementation (see ADR-0004 and the implementation plan).

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
  - [x] `detailed-design.md` — module contracts, algorithms, storage, tools, HTTP
  - [x] `data-model.md` — record schemas, results, diagnostics catalogue
  - [x] `tool-contract.md` — ten model-facing tools with DSL schemas and errors
  - [x] `storage-contract.md` — dataDir resolution, atomicity, sessions, backups
  - [x] `module-boundaries.md` — ownership and dependency direction
  - [x] `ui-design.md` — panel layout, transport, states, i18n, QA checklist
  - [x] `security-model.md` — credentials, approval, HTTP controls, redaction
  - [x] `api-verification.md` — verified runtime facts F1–F20 and probes V1–V8
  - [x] `implementation-plan.md` — ordered tasks T01–T24, acceptance, cut line
  - [x] ADR-0001 … ADR-0009

Code:

- [ ] TypeScript Host scaffold (`src/`, `tsconfig.json`)
- [ ] Domain schemas and validators
- [ ] Storage layer
- [ ] Registry layer
- [ ] Context resolver
- [ ] Rule resolver with provenance
- [ ] Operation Skill router
- [ ] Session context store
- [ ] Application service (`app`)
- [ ] Read tools
- [ ] Management tools
- [ ] HTTP transport
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
- DSH peer packages are not bundled; they resolve from the profile.

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
- No HTTP route.
- No UI panels.
- Runtime probes V1–V8 in `api-verification.md` §4 are planned, not yet executed
  against this profile.
- Memory bridge is a contract only.
- No cross-process write locking.

## Next Recommended Work

Follow `docs/01-architecture/implementation-plan.md`:

1. **T01** — build skeleton: dependencies, `tsconfig.json`, scripts, `.gitignore`.
2. **T02** — runtime probes V1–V8 and record results in `api-verification.md`.
3. **T03** — domain schemas and tests.
4. **T04** — storage with atomic writes and tests.
5. **T05–T06** — registry and integrity checks.
6. **T07–T08** — template engine, layering and provenance.
7. **T09–T10** — router, Skill adapter, policy.
8. **T11–T12** — session store and application service.
9. **T13–T17** — the ten tools.
10. **T18** — HTTP route.
11. **T19–T22** — Client panel and manual QA.
12. **T23–T24** — docs, install smoke test.
