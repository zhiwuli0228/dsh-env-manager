# Current State

This file is the **project continuity snapshot**. Update it after every completed change.

## Current Phase

**Phase 1 of the environment/plane model is implemented, tested and live-verified in the
`desktop` profile: an environment is one network, its planes are role views, and nodes are
managed inside the environment.**

The V1 Host is implemented in TypeScript under `src/` and compiled to `lib/`. Storage,
registry, resolver, router, session store, application service, ten tools and the
same-origin HTTP API are in place, with 43 Vitest tests passing. The Client panel is
implemented in `client.js` and its sidebar/main slot registrations are live. The sidebar
glyph follows the host `sidebar.panellist` contract: it honors the owner's
`size`/`active` props and renders monochrome with `currentColor`; the contract is recorded
in [`client-ui-integration.md`](../02-harness/client-ui-integration.md).

The panel uses a centered 1080 px column, 22 px title with a glyph mark, underline tabs,
compact stat cards and a master/detail environment view. **Environments is the first and
default tab**; a persistent header **New environment** action is available from every tab,
and `Records` is limited to services, deployments, rule profiles and operation bindings.

Phase 1 changes the environment workflow:

- `New environment` creates only the shell: name, optional id, category and description.
  It seeds the four standard roles (`management`, `business`, `database`, `extension`) and
  creates no hosts, endpoints or credentials.
- The detail page is grouped by role: Overview, All nodes, one tab per declared plane,
  Login records, Endpoints and YAML. Plane tabs are filters over the same `hosts[]`; a
  node serving two planes is one host with two roles and appears in both tabs.
- Add/edit node supports multiple roles. Opening the form from a plane preselects that
  role. A node may have zero accounts, or an optional login username + password that
  writes a namespaced credential and keeps only `credentialRef` in YAML. On edit, filling
  both fields adds a new password account and leaves existing accounts untouched.
- Batch import accepts `IP,name,roles,port,user` per line, with `|`/`/` for multiple
  roles. It creates hosts and optional accounts but never passwords, and rejects unknown
  roles/duplicate IPs/invalid ports before saving.
- Node search filters by id, name, IP, platform, admin user or role. Node cards expand to
  show the account table.
- Schema validation now requires at least one environment role and at least one role per
  host. Standard roles are seeded automatically when a node uses a missing standard role.

Live verification covered shell creation, plane tabs, empty-plane state, add node from a
plane, multi-role edit, batch import, search, account creation and credential references.

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
- [x] Environment detail: overview, role/plane views, nodes, accounts, login audit, endpoints, YAML
- [x] Shell-only **New environment** form with standard role seeding
- [x] Role-filtered plane tabs over one `hosts[]` collection (no per-plane copies)
- [x] Add/edit node with multiple roles and optional credential write
- [x] Batch node import (`IP,name,roles,port,user`; no passwords)
- [x] Node search and expandable account cards
- [x] Dedicated default **Environments** tab and persistent header create action
- [x] Records narrowed to services, deployments, rule profiles and operation bindings
- [x] Credential write path (`credential` / `credentialUnset`, namespaced refs)
- [x] Structured forms for basic info, node, account and login records
- [x] Memory bridge contract and null adapter
- [x] Tests (43 passing)
- [x] Installed in the `desktop` profile (`install_bundle`, `application: applied`)

## Current Constraints

- V1 accepts `schemaVersion: 1` only.
- No plain-text credentials in registry files.
- An environment must declare at least one logical role and every node must declare at
  least one declared role; the four standard roles are seeded on shell creation.
- Passwords are accepted only transiently by the add/edit node form and forwarded to
  `ctx.credentials.set`; the record keeps `credentialRef` only. Shell creation and batch
  import never accept passwords.
- Credential writes/deletes are restricted to `env-manager/<environmentId>/<accountId>`
  (node-add refs use `<hostId>-<username>` as the account id).
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

- The detail view supports create/edit for basic info, nodes, accounts and login records,
  but deleting a node/account/login from its row is still YAML-only.
- Node editing preserves accounts and roles, but there is no bulk edit and no credential
  rotation button.
- Database primary/replica/sharding topology is deliberately not modeled in Phase 1: the
  database plane is a role, and topology detail belongs in node notes until Phase 2.
- Services, deployments, rule profiles and operation bindings are YAML-only; only
  environments have structured forms.
- The `oracle1` environment in the `desktop` profile is demo data created to verify account
  and login rendering; replace or delete it before real use.
- Light theme contrast has not been checked yet.
- Private-key input, key passphrases and credential rotation are still outside the UI.
- Deleting an environment does not automatically delete its namespaced credentials; the
  `credentialUnset` operation exists, but there is no revoke button in the panel yet.
- Runtime probes V4 (approval from a tool body) and V6 (live credential `describe`)
  in `api-verification.md` §4 are not exercised yet. Live credential `set`/`unset` via
  the node form were verified.
- Memory bridge is a contract and null adapter only; no memory plugin is wired.
- No cross-process write locking.
- No operation execution: routing returns the Skill and policy, it does not run them.
- The panel cannot write production records unless
  `writePolicy.allowUiProductionWrites` is enabled.
- No JumpServer/PAM synchronization; account and login observations remain manual/YAML.

## Next Recommended Work

1. **Phase 2** — database topology (primary/replica/sharding) and richer expansion-node
   modeling, stored without duplicating `hosts[]`.
2. Row-level delete for nodes, accounts and login records, plus credential rotation.
3. Live probes V4 and V6, then record results in `api-verification.md`.
4. Optional JumpServer/PAM import adapter for accounts and login observations.
5. Add a small example registry under `examples/` for first-run demonstration.
6. P1 memory bridge and operation records.
