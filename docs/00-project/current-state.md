# Current State

This file is the **project continuity snapshot**. Update it after every completed change.

## Current Phase

**V1 is installed in the `desktop` profile and live-verified; guided environment
creation, host accounts and login audit are implemented and visually checked.**

The V1 Host is implemented in TypeScript under `src/` and compiled to `lib/`. The
storage, registry, resolver, router, session store, application service, ten tools and
same-origin HTTP API are in place, with 41 Vitest tests passing. The Client panel is
implemented in `client.js` and its sidebar/main slot registrations are live. The Host
tools answer in this session, the HTTP API returns `200` for `meta`, and a
save/list/remove round-trip through the panel transport succeeded. The sidebar glyph
follows the host `sidebar.panellist` contract: it honors the owner's `size`/`active`
props and renders monochrome with `currentColor`; the contract is recorded in
[`client-ui-integration.md`](../02-harness/client-ui-integration.md).

The panel was rebuilt around the host's visual language: a centered 1080 px column,
22 px title with a glyph mark, underline tabs, compact stat cards, two-column runtime /
warnings cards, an empty-registry onboarding card, and a master/detail Records view.
Environments start with **New environment**, a single form for name, optional id,
category, host IP, SSH port, login username and password. It creates the environment,
its first host, account and SSH endpoint in one save, writes the password through
`ctx.credentials.set`, and keeps only a namespaced `credentialRef` in YAML. The
environment record then opens a read-first detail page modeled on an asset-detail layout:
basic information, access summary, roles, host cards with account tables, newest-first
login records, endpoints and a raw YAML tab. Basic info can be edited; hosts, accounts and
login records have inline create forms that save the structured record. A successful
login record also refreshes the matching account's last-login fields. The guided create
flow, the resulting host/account/credential reference, and the absence of a password in
the record were verified live.

## Implemented

Documentation and repository:

- [x] GitHub repository initialized
- [x] DSH bundle manifest (`package.json`, `cordis.patch.yml`)
- [x] Host plugin entry shim (`index.js` → `lib/index.js`)
- [x] Client panel (`client.js`)
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
- [x] Client configuration UI (slot registration and HTTP round-trip live-verified)
- [x] Environment detail: hosts, accounts, login audit, endpoints, YAML
- [x] Guided **New environment** form (environment + first host + account + SSH endpoint)
- [x] Credential write path (`credential` / `credentialUnset`, namespaced refs)
- [x] Structured forms for basic info, host, account and login records
- [x] Memory bridge contract and null adapter
- [x] Tests (41 passing)
- [x] Installed in the `desktop` profile (`install_bundle`, `application: applied`)

## Current Constraints

- V1 accepts `schemaVersion: 1` only.
- No plain-text credentials in registry files.
- Passwords are accepted only transiently by the guided form and forwarded to
  `ctx.credentials.set`; the record keeps `credentialRef` only.
- Credential writes/deletes are restricted to `env-manager/<environmentId>/<accountId>`.
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

- The detail view supports create/edit for basic info, hosts, accounts and login records,
  but row-level edit/delete for hosts, accounts and logins is still YAML-only.
- Services, deployments, rule profiles and operation bindings are YAML-only; only
  environments have structured forms.
- The `oracle1` environment in the `desktop` profile is demo data created to verify account
  and login rendering; replace or delete it before real use.
- Light theme contrast has not been checked yet.
- The guided form stores a password credential only. Private-key input, key passphrases
  and credential rotation are still outside the UI.
- Deleting an environment does not automatically delete its namespaced credential; the
  `credentialUnset` operation exists, but there is no revoke button in the panel yet.
- Runtime probes V4 (approval from a tool body) and V6 (live credential `describe`)
  in `api-verification.md` §4 are not exercised yet. Live credential `set`/`unset` via
  the panel and HTTP API were verified while building the guided form.
- Memory bridge is a contract and null adapter only; no memory plugin is wired.
- No cross-process write locking.
- No operation execution: routing returns the Skill and policy, it does not run them.
- The panel cannot write production records unless
  `writePolicy.allowUiProductionWrites` is enabled.
- Login/account data is entered manually or imported as YAML; there is no JumpServer/PAM
  API synchronization.

## Next Recommended Work

1. **T23** — complete visual panel QA: sidebar entry, list/get/save/delete, detail tabs,
   host/account/login forms, resolve, route, production denial.
2. Row-level delete/edit for hosts, accounts and login records.
3. **T02** — live probes V4 and V6, then record results in `api-verification.md`.
4. Add a small example registry under `examples/` for first-run demonstration.
5. P1 memory bridge and operation records.
