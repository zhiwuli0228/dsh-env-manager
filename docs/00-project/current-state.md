# Current State

This file is the **project continuity snapshot**. Update it after every completed change.

## Current Phase

**V1 implementation in progress — core Host, tools and tests are working; panel and
install smoke test remain.**

The V1 Host is implemented in TypeScript under `src/` and compiled to `lib/`. The
storage, registry, resolver, router, session store, application service, ten tools and
same-origin HTTP API are in place, with 33 Vitest tests passing. The Client panel is
implemented in `client.js`; it still needs manual QA in a live Web/Desktop session.
Runtime probes V1–V8 are still pending because they require installing the bundle in the
current profile.

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

- [x] TypeScript Host scaffold (`src/`, `tsconfig.json`, build scripts)
- [x] Domain schemas and validators
- [x] Storage layer with atomic writes, backups and session files
- [x] Registry layer with integrity diagnostics
- [x] Context resolver
- [x] Rule resolver with provenance
- [x] Operation Skill router
- [x] Session context store
- [x] Application service (`app`)
- [x] Read tools
- [x] Management tools
- [x] HTTP transport
- [x] Client configuration UI (manual QA pending)
- [x] Memory bridge contract and null adapter
- [x] Tests (33 passing)

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

- Runtime probes V1–V8 in `api-verification.md` §4 are still pending; they require
  installing this bundle in the current profile.
- The Client panel has not been exercised in a live Web/Desktop session.
- Memory bridge is a contract and null adapter only; no memory plugin is wired.
- No cross-process write locking.
- No operation execution: routing returns the Skill and policy, it does not run them.
- The panel cannot write production records unless
  `writePolicy.allowUiProductionWrites` is enabled.

## Next Recommended Work

1. **T02** — install the bundle and run probes V1–V8; record results in
   `api-verification.md`.
2. **T23** — manual panel QA: sidebar entry, list/get/save/delete, resolve, route,
   diagnostics, production denial.
3. **T24** — install smoke test and `current-state` update.
4. P1 memory bridge and operation records.
