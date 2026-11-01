# Current State

This file is the **project continuity snapshot**. Update it after every completed change.

## Current Phase

**Phase 1 of the environment/plane model and Phase 1.1 of the K8s node/execution model
are implemented, tested and live-verified in the `desktop` profile: an environment is one
network, its planes are role views, and hosts also record their machine kind and command
surfaces.**

The V1 Host is implemented in TypeScript under `src/` and compiled to `lib/`. Storage,
registry, resolver, router, session store, application service, ten tools and the
same-origin HTTP API are in place, with 50 Vitest tests passing. The Client panel is
implemented in `client.js` and its sidebar/main slot registrations are live. The sidebar
glyph follows the host `sidebar.panellist` contract: it honors the owner's
`size`/`active` props and renders monochrome with `currentColor`; the contract is recorded
in [`client-ui-integration.md`](../02-harness/client-ui-integration.md).

The plugin also registers a profile-wide **discovery Skill** named `dsh-env-manager` via
`ctx.skills.register()`. Its catalog entry makes the registry discoverable from any
workspace in the same profile; its full workflow body loads only on invocation. It is a
discovery/usage Skill, not an execution Skill or operation binding, and it is removed
when the plugin is disabled or uninstalled. `config.registerSkill` defaults to `true`.

Release packaging is prepared under the npm name `dsh-env-manager-plugin` because the
unscoped `dsh-env-manager` npm name is an unrelated existing package. Pushing an
annotated `v*` tag runs [`.github/workflows/release.yml`](../../.github/workflows/release.yml)
on `windows-latest`, verifies the tag against `package.json`, runs `npm run check`, packs
the tarball, publishes with npm Trusted Publisher/OIDC, and creates a GitHub Release.
The first publish must be bootstrapped manually before Trusted Publisher can be bound;
the exact steps are in [`release.md`](../06-operations/release.md).

**Release status (2026-11-01):** `dsh-env-manager-plugin@0.1.0` is published and is the
`latest` npm tag (`gitHead` `4d884e7`). The
[GitHub Release v0.1.0](https://github.com/zhiwuli0228/dsh-env-manager/releases/tag/v0.1.0)
contains `dsh-env-manager-plugin-0.1.0.tgz`; workflow run
[`41323001406`](https://github.com/zhiwuli0228/dsh-env-manager/actions/runs/41323001406)
completed successfully. The 0.1.0 publish itself was bootstrapped manually; the workflow
detected the existing version, skipped npm publish, and created the Release. Later versions
use npm Trusted Publisher/OIDC through the same workflow.

The panel uses a centered 1080 px column, 22 px title with a glyph mark, underline tabs,
compact stat cards and a master/detail environment view. **Environments is the first and
default tab**; a persistent header **New environment** action is available from every tab,
and `Records` is limited to services, deployments, rule profiles and operation bindings.

Phase 1 changes the environment workflow:

- `New environment` creates only the shell: name, optional id, category and description.
  It seeds the four standard roles (`management`, `business`, `database`, `extension`) and
  creates no hosts, endpoints or credentials.
- The detail page is grouped by role: Overview, All nodes, one tab per declared plane,
  Login records, Kubernetes/clusters, Endpoints and YAML. Plane tabs are filters over the
  same `hosts[]`; a node serving two planes is one host with two roles and appears in both
  tabs.
- Add/edit node supports multiple roles. Opening the form from a plane preselects that
  role. A node may have zero accounts, or an optional login username + password that
  writes a namespaced credential and keeps only `credentialRef` in YAML. On edit, filling
  both fields adds a new password account and leaves existing accounts untouched.
- Batch import accepts `IP,name,roles,port,user` per line, with `|`/`/` for multiple
  roles. It creates hosts and optional accounts but never passwords, and rejects unknown
  roles/duplicate IPs/invalid ports before saving.
- Node search filters by id, name, IP, platform, admin user, role, node kind, access
  method, cluster name/id, account username or web login URL. Node cards expand to show the
  account table.
- Schema validation now requires at least one environment role and at least one role per
  host. Standard roles are seeded automatically when a node uses a missing standard role.

Phase 1.1 adds the K8s node/execution model (ADR-0011):

- `Host.kind` classifies the machine as `vm`, `physical`, `k8s-all-in-one`, `k8s-worker`
  or `pod-host`. A missing value reads as `vm`.
- `Host.access` records `ssh`, `kubectl` and/or `docker`; it is capability metadata, not
  authorization. `Host.clusterRef` links K8s/Pod machines to a cluster.
- `k8s-all-in-one` and `k8s-worker` require an existing cluster reference; `pod-host` may
  omit it for a Docker-only machine. A Pod is never a Host; `pod-host` is the machine
  reached with `docker exec`.
- `Cluster.topology` is `all-in-one`, `separate` or `external` and is optional.
- The node form has kind/cluster/access controls; node cards and search include kind,
  access and cluster; the detail page has a Kubernetes/clusters tab with add/edit and a
  node count derived from `clusterRef`.
- Batch import remains generic VM (`kind: vm`, `access: [ssh]`) and never accepts secrets.

Web console logins are account-level:

- `HostAccount.loginUrl` stores the management/business console URL; it is a URL, not a
  secret. The account form has `Web login URL`, username and an optional password, and the
  account can be edited in place. The Host schema requires an absolute `http(s)` URL.
- `Add web login` on a node card opens the account form with protocol `web` and auth type
  `password` preselected; the URL renders as a link under the account username.
- A password entered in the account form is written through the DSH credential service;
  YAML keeps only `credentialRef`. Leaving the password blank preserves the existing
  reference when editing.
- Account search covers username, purpose and web login URL.

Live verification covered shell creation, plane tabs, empty-plane state, add node from a
plane, multi-role edit, batch import, search, account creation and credential references.
Phase 1.1 was additionally verified live: add a cluster with topology and API endpoint, add
a K8s all-in-one node with kind/access/cluster, add a Pod host without a cluster, reject a
K8s worker without a cluster, confirm cluster/node counts and search by cluster name.
Web login URL/password and account edit were verified live after the account form change.

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
  - [x] `api-verification.md` — verified runtime facts F1–F21 and probes V1–V8
  - [x] `implementation-plan.md` — ordered tasks T01–T24, acceptance, cut line
  - [x] ADR-0001 … ADR-0011

Code:

- [x] TypeScript Host scaffold (`src/`, `tsconfig.json`, build scripts)
- [x] Domain schemas and validators
- [x] Storage layer with atomic writes, backups and session files
- [x] Registry layer with integrity diagnostics
- [x] Context resolver
- [x] Rule resolver with provenance
- [x] Operation Skill router
- [x] Profile-wide discovery Skill (`dsh-env-manager`) registered through `ctx.skills.register()`
- [x] README documents the bundled Skill lifecycle, scope, opt-out and execution boundary
- [x] GitHub Actions release pipeline (`.github/workflows/release.yml`) for tagged npm publish
- [x] Release runbook (`docs/06-operations/release.md`) with Trusted Publisher bootstrap
- [x] Session context store
- [x] Application service (`app`)
- [x] Read tools
- [x] Management tools
- [x] HTTP transport
- [x] Client configuration UI (slot registration and HTTP round-trip live-verified)
- [x] Environment detail: overview, role/plane views, nodes, accounts, login audit, clusters, endpoints, YAML
- [x] Shell-only **New environment** form with standard role seeding
- [x] Role-filtered plane tabs over one `hosts[]` collection (no per-plane copies)
- [x] Add/edit node with multiple roles and optional credential write
- [x] Node kind (`vm`/`physical`/K8s all-in-one/K8s worker/Pod host), command access and cluster reference
- [x] Kubernetes/clusters tab with cluster add/edit, topology and derived node count
- [x] Batch node import (`IP,name,roles,port,user`; no passwords; generic VM nodes)
- [x] Node search (including kind/access/cluster and account web login) and expandable account cards
- [x] Account-level web login URL, password-to-credential bridge and in-place account edit
- [x] Dedicated default **Environments** tab and persistent header create action
- [x] Records narrowed to services, deployments, rule profiles and operation bindings
- [x] Credential write path (`credential` / `credentialUnset`, namespaced refs)
- [x] Structured forms for basic info, node, account and login records
- [x] Memory bridge contract and null adapter
- [x] Tests (50 passing)
- [x] Installed in the `desktop` profile (`install_bundle`, `application: applied`)

## Current Constraints

- V1 accepts `schemaVersion: 1` only.
- No plain-text credentials in registry files.
- An environment must declare at least one logical role and every node must declare at
  least one declared role; the four standard roles are seeded on shell creation.
- `k8s-all-in-one` and `k8s-worker` nodes require a valid `clusterRef`; `pod-host` may omit
  it for a Docker-only machine. `Host.access` is metadata, not an authorization grant.
- A Pod is not a registry Host. `pod-host` models the machine reached with `docker exec`;
  per-Pod inventory is out of scope.
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
  but deleting a node/account/login from its row is still YAML-only. Clusters can be added
  and edited; deleting a cluster is YAML-only.
- Batch import does not accept kind/access/cluster columns; imported nodes are generic VMs
  and K8s/Pod hosts are edited afterwards.
- Per-Pod/container inventory is not modeled; a `pod-host` is one machine even when it runs
  many Pods.
- Node editing preserves accounts and roles, but there is no bulk edit. Account editing can
  rotate a password, but private-key and passphrase input remain YAML-only.
- Database primary/replica/sharding topology is deliberately not modeled in Phase 1: the
  database plane is a role, and topology detail belongs in node notes until Phase 2.
- Services, deployments, rule profiles and operation bindings are YAML-only; only
  environments have structured forms.
- The `oracle1` environment in the `desktop` profile is demo data created to verify account
  and login rendering; replace or delete it before real use.
- Light theme contrast has not been checked yet.
- Private-key input and key passphrases are still outside the UI; password rotation works
  through `Edit account`.
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
2. Batch-import kind/access/cluster columns, and optional Pod/container inventory if
   operations need per-workload targeting.
3. Row-level delete for nodes, accounts and login records, plus private-key/passphrase
   input.
4. Live probes V4 and V6, then record results in `api-verification.md`.
5. Optional JumpServer/PAM import adapter for accounts and login observations.
6. Add a small example registry under `examples/` for first-run demonstration.
7. P1 memory bridge and operation records.
