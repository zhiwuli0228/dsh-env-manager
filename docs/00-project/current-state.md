# Current State

This file is the **project continuity snapshot**. Update it after every completed change.

## Current Phase

**Phase 1 of the environment/plane model and Phase 1.1 of the K8s node/execution model
are implemented, tested and live-verified in the `desktop` profile: an environment is one
network, its planes are role views, and hosts also record their machine kind and command
surfaces.**

The V1 Host is implemented in TypeScript under `src/` and compiled to `lib/`. Storage,
registry, resolver, router, executor, session store, application service, fourteen tools
and the same-origin HTTP API are in place, with 135 Vitest tests passing across 14 test
files. The Client panel is
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

**Executable bindings + experience loop (2026-11-08, unreleased):** an operation binding is no longer Skill-only. It declares exactly one target — `skill` (discovery only) **xor**
`execute` — where `execute` is one of:

- `script` — a file under `<dataDir>/scripts` (absolute paths and `..` rejected at save and
  re-checked at execution), interpreter explicit or by extension (`.sh/.ps1/.py/.js`…),
  interpolated args;
- `command` — a local CLI as an `argv` array (spawned with `shell: false`, no shell
  interpolation), optional working directory under `<dataDir>`;
- `remote` — an SSH command **prepared** as a descriptor (address/port/username/
  `credentialRef`); the plugin never reads credential values, so it cannot open the
  connection itself.

New tool `env_operate` routes and executes: it enforces the approval gate
(`APPROVAL_REQUIRED` → native `ctx.approval` prompt → retry with `confirm: true`) and the
production guard (`POLICY_DENIED` unless `allowProduction`), then runs script/command
targets via the new `executor` module with bounded output (64 KiB), a timeout (default
600 s, max 3600 s, `SIGTERM`→`SIGKILL`) and `password=`-style redaction.

Every completed or failed execution writes an **experience** (`<dataDir>/experiences/
<id>.yaml`): success → `success-summary`, failure → `failure-lesson`. Experiences are
plugin-owned, never registry records, and always enter the review queue as `proposed`;
new tool `env_experience` lists/adds/approves/rejects (HTTP ops `experienceList`,
`experienceAdd`, `experienceReview`). Routing now embeds up to 5 related experiences
(failures first, newest second, scope-matched, proposed+accepted, 300-char previews) in
`OperationResolution.experiences`, so the model sees prior lessons before acting — the
tool gets smarter as the queue is reviewed, with no auto-apply path. Tests: 103 passing
(new `tests/executor/`, `tests/experience/`, `tests/router/router.test.ts`; tool count 12).
Live verification on the `desktop` profile surfaced one real bug: tool outputs carrying
`undefined`-valued keys are rejected by DSH's strict JSON tool-output validation (`value
is not lossless JSON`) — fixed by recursively stripping `undefined` at the `app` boundary
(`stripUndefined`), with a regression test; the built `lib/` was verified strict-JSON-safe
via a node smoke run (operate completed, experience written). The profile now installs
`dsh-env-manager-plugin@0.1.6` as a pnpm link to this repository (local verification
build; 12 tools live, route 200, data intact). The running `desktop` process still
executes its cached pre-upgrade module; a DSH restart is required for the fix to go live
and to complete the end-to-end execute → experience → review flow.

**DR marking + bundle import/export (2026-11-08, released in `0.1.7`):** disaster recovery is
embedded in each environment record — there is **no separate module**: no group record
kind, no dedicated directory, no DR tab and no groups bundle key. `Environment` gains
an optional `dr` block (validated by a Zod shape, `o(drFields(mode), mode).optional()`):
`role` `primary`(生产)/`standby`(容灾) required, `type` a short token ≤16
(`^[A-Za-z0-9][A-Za-z0-9_-]{0,15}$`; presets `AS` 主备 Active-Standby, `AA` 双活
Active-Active, `AP` 主从 Active-Passive, custom codes allowed), and optional `peer` (≤128,
the other half of the pair), `scope` (≤40, e.g. 同城/异地), `rtoMinutes`/`rpoMinutes`
(integers 0..10080 = 7 days) and `note` (≤2000); `peer` cannot equal the environment's
own id. A pair is two `dr` blocks pointing at each other. Integrity: an environment whose
`dr.peer` is missing produces a `DR_PEER_UNKNOWN` warning from `env_validate` (warning,
file `environments/{id}.yaml`, path `dr.peer`); deleting an environment that is the DR
peer of another environment is blocked with `RECORD_IN_USE` (referrer
`{ kind: 'environment', id, field: 'dr.peer' }`). The marking is topology metadata only:
no failover/switch/promote operation, no witness/仲裁 role, and RTO/RPO are descriptive
objectives, never enforced.

Batch onboarding and backup/migration use a versioned **bundle** document (`version: 1`,
`exportedAt` plus optional plural-kind arrays `environments`, `services`, `deployments`,
`ruleProfiles`, `operationBindings` — no groups key; DR marking travels inside each
environment record). `env_import` applies records in dependency order (environment →
service → deployment → ruleProfile → operationBinding), resolves references against the
registry union the ids in the same bundle, and supports `skip` / `overwrite` / `error`
conflict modes with per-record failures reported (never aborting the rest); reference
problems use the same codes as single-record validation (`ENV_NOT_FOUND`,
`SERVICE_NOT_FOUND`, `DEPLOYMENT_NOT_FOUND`, `RULE_PROFILE_NOT_FOUND`,
`DR_PEER_UNKNOWN`). A bundle touching production records requires confirmation, and the
strict record schemas reject any password field. `env_export` writes the whole registry
or one environment subset; a selected environment's DR peers ride along **in both
directions** (fixpoint) so the bundle stays self-contained, but deployments, services,
rule profiles and operation bindings are still derived only from the explicitly selected
environment ids. Bundles are transient documents, never stored under `dataDir`. The tools
are fourteen (`env_import` / `env_export` retained); the panel header carries the
导入/导出 bundle actions, the environment detail has a 容灾 (DR) card (role badge, type,
peer, scope, RTO/RPO, note; `drUnset` empty state), and environment list summaries append
`DR <role> <type> → <peer>`. Tests: 133 passing across 14 files (new `tests/dr/`,
`tests/bundle/`; `tests/dr/env-dr.test.ts` holds the DR schema/registry/export tests).
Released as `dsh-env-manager-plugin@0.1.7`; README gained a verified batch-import
walkthrough (two-site bundle example, conflict modes, DR-peer behaviour).

**DR peer linking in the panel (2026-11-09, released in `0.1.8`, client-only):** the 容灾 card was display-only,
so operators could see "未参与容灾配对" but had no way to say which environment the peer
is. The card now has 关联容灾 / 编辑容灾 (`drLink` / `drEdit`): an inline form with role
(生产/容灾), type (`AS` / `AA` / `AP` or 自定义类型码), **peer environment picker limited to
the other registered environments** (`name (id)`, empty option 不对端关联), scope, RTO, RPO
and note. Saving posts the full environment record through the existing `save` op (schema
validation unchanged, client-side checks only for the type token and the 0..10080 minutes
range) and re-reads it. With 同时更新对端环境 (`drSyncPeer`, default on once a peer is
picked) the panel also writes the mirror `dr` block on the peer environment — opposite
role, `peer` = this environment, the peer's own type/scope/RTO/RPO/note preserved, and a
confirm prompt when that peer is already paired elsewhere — through a second `save`; the
peer write keeps the current selection and applies the same production policy gate, with a
failure surfaced in the form. Changing the peer, or 解除容灾 (`drClear`), drops the old
peer's back-reference. DR stays a reference by id (never a copied record), no new record
kind, no new Host op and no failover action. Verified with `node --check client.js` and the
suite (135 tests; new: the two-half pair-link save in `tests/dr/env-dr.test.ts` and a
`tests/client` check that every `t()` key exists in both locales); the panel change needs a
page refresh (Ctrl+F5) in the open GUI.

**DSH 0.2.2-rc.1 panel-route fix (2026-11-08):** after DSH upgraded to `0.2.2-rc.1`, the
panel API broke with `Method Not Allowed`: the web runtime started after this bundle, so
the synchronous `ctx.get('webServer')` in `apply` returned `undefined` and the transport
silently disabled itself — every `/env-manager/api` request fell through to DSH's SPA
resource handler (GET → `404`, POST → `405 allow: GET, HEAD`), never reaching the plugin
handler (which answers `405 allow: POST` with JSON). Root cause confirmed live: tools
registered, plugin active, no route in the webServer prefix table; after a plugin reload
the same code registered successfully, proving a first-load timing race. Fix: register
the route via `ctx.inject(['webServer'], (webCtx) => webCtx.effect(...))` — the pattern
core plugins use — so it mounts when the service is actually provided and stays optional
on headless profiles. Regression coverage: `tests/transport/transport.test.ts` (route
registration/disposal, method/content-type/header gates, meta round-trip) plus the
updated `tests/plugin/plugin.test.ts` asserting the `webServer` injection wiring
(74 tests total). Shipped as `dsh-env-manager-plugin@0.1.6`.

**DSH 0.2.2-rcx compatibility (2026-11-08):** the bundle now declares support for DSH
`0.2.1-rc.5` through the `0.2.2` line, including `0.2.2-rc.x`: `engines.dsh` and the
`dsh-llm`/`dsh-tools` peer ranges use `>=0.2.1-rc.5 <0.3.0-0 || >=0.2.2-0 <0.3.0-0`
(a plain `>=0.2.1-rc.5` does **not** match prereleases of another tuple under node-semver),
the optional `cordis` peer widened to `>=4.0.5 <5.0.0`, and `0.3.0` stays excluded until
verified. Code-level audit against `dsh-tools@0.2.2-rc.1` found no breaking change for our
surface (`defineTool` options shape identical, `ToolDefinition`, `tools/pre-execute`,
`HarnessError(message, code, options?)`, `ContentBlock` all preserved; the plugin passes
`ctx`/`exec` as `any`, so it has no static coupling to cordis). Verified by installing the
full `0.2.2-rc.1` family in a throwaway copy — typecheck, build and all 67 tests pass —
and by a new `tests/compat.test.ts` that pins the version matrix (67 tests total).
The repository's own `@deepseek-ai/*` devDependencies now track the same family
(`0.2.2-rc.1`, cordis `~4.1.0`), so `npm run check` builds and tests directly against the
newest DSH line (no throwaway needed).
Released as `dsh-env-manager-plugin@0.1.5`.

**Release status (2026-11-09):** `dsh-env-manager-plugin@0.1.8` is the `latest` npm tag
and the DR peer-linking release: the 容灾 card on the environment detail edits the marking
in place (role, type incl. a custom code, a peer picker over the other registered
environments, scope, RTO/RPO, note), links the pair by id, optionally writes the mirror
`dr` block on the peer and clears both sides on 解除容灾. It is a client-only change —
`src/`, `lib/`, the schemas, the tools and the HTTP ops are unchanged. Published by the
Release workflow ([run `42647282220`](https://github.com/zhiwuli0228/dsh-env-manager/actions/runs/42647282220),
all steps green); npm `gitHead` is `cad6276` with OIDC provenance, and the Release carries
`dsh-env-manager-plugin-0.1.8.tgz`. `0.1.7` was the
disaster-recovery release: DR marking embedded in each environment record (no separate
module) plus versioned bundle import/export with `skip`/`overwrite`/`error` conflict modes
and both-direction DR-peer export closure. `0.1.6` was the panel-route fix
release (mount the HTTP route through `ctx.inject(['webServer'])`;
[GitHub Release v0.1.6](https://github.com/zhiwuli0228/dsh-env-manager/releases/tag/v0.1.6)).
`v0.1.5` was the DSH-0.2.2-rcx
compatibility release. `v0.1.4` was the credential-store format fix: account/SSH passwords are stored under POSIX-style `DSH_ENV_MANAGER_*` refs,
`setCredential`/`unsetCredential` and the registry schema reject non-conforming refs at
save, and the Client generates the new refs — the DSH file store rejects invalid `refs:`
keys at boot, which had made `.credentials.yaml` unloadable and broken client startup.
`v0.1.3` was the client-module fix release (client.js `__ModuleLoader__.load` id equals
the package name, contract test, `id == package name` rule in `api-verification.md` F13,
`ui-design.md` keys the bundle config page by package name). `v0.1.2` shipped the
install-hardening fixes (committed `lib/`, clear missing-build error,
`plugin_manager`-only install docs, `scripts/repair-profile.mjs`, runtime version reported
from `package.json`). `v0.1.1` shipped the same install fixes; `0.1.0` was bootstrapped
manually before the Trusted Publisher binding, and its workflow
([`41323001406`](https://github.com/zhiwuli0228/dsh-env-manager/actions/runs/41323001406))
skipped npm publish because the version already existed.

**Plugin directory:** submitted to
[`awesome-dsh-plugin/awesome-dsh-plugin`](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)
as PR [#11185](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/11185)
(`data/plugins/zhiwuli0228__dsh-env-manager.yml`, category `dev`). The repository has the
`dsh-plugin` topic; the listing is pending CI/review.

**Installation smoke test (2026-11-02):** removed the old local bundle
`dsh-env-manager` from the `desktop` profile, including its package dependency, bundle
entry, lockfile reference and stale `node_modules/dsh-env-manager` symlink. Reinstalled
the published package as `dsh-env-manager-plugin@0.1.0` from npm. The discovery Skill,
ten tools, sidebar panel and `/env-manager/api` transport all came back; the API reported
the preserved registry data (2 environments, 3 services, 3 deployments, 0 rule profiles,
0 operation bindings) and no warnings. Registry data was intentionally not deleted during
uninstall.

**Install hardening (2026-11-03):** reproduced the reported failure from a clean clone:
`lib/` was git-ignored, so a checkout installed without a build had no `lib/index.js`.
The compiled `lib/` tree is now committed, `index.js` reports a specific missing-build
error, and the install docs use `plugin_manager install_bundle` instead of the
dependency-only `dsh plugin add` command. `scripts/repair-profile.mjs` detects duplicate
or legacy bundle entries and offers an atomic `--fix` with a backup. The published
`0.1.0` npm tarball already contained `lib/`; this fixes checkout and git installs.
`0.1.2` additionally reports the runtime version from `package.json` so the API `meta`
call no longer hardcodes `0.1.0`.

**Client module id fix (2026-11-03):** `client.js` called
`window.__ModuleLoader__.load({ id: 'dsh-env-manager', ... })`, but the client module
table keys every entry by the bundle's **package name** and materializes the factory under
that exact id — the module was unimportable under its graph-row key. The `load` id is now
the full package name (`dsh-env-manager-plugin`) and the factory returns
`name: 'dsh-env-manager-plugin'` per the documented `{ name, inject, apply }` contract
(same shape as the working `dsh-memory-hub`, `dsh-image-router` and
`token-usage-statistic` client halves). `tests/client/client.test.ts` asserts both fields;
all 52 tests pass.

**Credential refs moved to the DSH credential grammar (2026-11-05):** account passwords
(especially SSH passwords) were stored under `env-manager/<environmentId>/<accountId>`
refs, but the DSH credential store (`@deepseek-ai/dsh-credentials-local`) accepts only
POSIX environment-variable-style keys (`^[A-Za-z_][A-Za-z0-9_]*$`) inside its `refs:`
section and **rejects any other key at boot** — the malformed entries made the whole
`.credentials.yaml` unloadable and broke client startup. Fix: every credential the plugin
writes now uses `DSH_ENV_MANAGER_<ENVIRONMENT>_<ACCOUNT>` (uppercase, digits, underscores);
`setCredential`/`unsetCredential` reject refs outside that namespace or grammar; the
registry schema validates every `credentialRef` against the DSH grammar so a bad ref fails
at save instead of at boot; the Client generates the new refs. The live `desktop` profile
was migrated (`.credentials.yaml` keys renamed, `real-test.yaml` refs updated, backup
kept) and verified to parse under the strict DSH rules. Tests grew (grammar rejection,
old-shape rejection); 64 passing.

**Self-check hardening (2026-11-03):** the client unit test was the first place the bug
should have failed — it asserted `loaded.id` against a hardcoded value, i.e. it captured
the implementation (including the wrong id) instead of the contract. It is now a
**contract test**: both `loaded.id` and `mod.name` are asserted against `package.json`'s
`name`, so any divergence between `client.js` and the manifest fails the suite. The
`id == package name` rule is now documented in `api-verification.md` F13 and
`development-guide.md`; install smoke checks should confirm the client module actually
materialized (Slots tree registrant equals the module name, not the shell placeholder
row).

**Service context decoupled from environments; routing environment-mandatory with no
downgrade (2026-11-03):** `env_resolve` is service-first — the environment is an optional
refinement layer, so a bare `serviceId` resolves the service-level context (service +
global rule layers only; no `env.*`/`deployment.*` fields). Operation routing is the
opposite: **operations always run inside an environment** (select environment → pick
operation → route to binding). A route without an environment fails
(`INVALID_ARGUMENT` / `ENVIRONMENT_REQUIRED`) instead of silently falling through to
service/global bindings — if a binding is scoped to an environment, that environment is
where the operation must run. Production policy is therefore always evaluated; the
temporary `PRODUCTION_CHECK_SKIPPED` warning was removed. A deployment remains *current
placement* (still `environmentId`-scoped) and is not a routing prerequisite: machine
binding is resolved at execution time. **Environment deployment is now separate from code
replacement:** the new standard operation `deploy-environment` is environment-scoped
(`match: { environmentId }`, new `environment` match level), generally runs on the
management plane, and is used in VM scenarios; code ops (`deploy`/`replace`/...) stay
service-scoped. `ServiceContext.serviceId` is optional (environment-scoped contexts carry
`environmentId` as their anchor). Schema version stays `1`. Tests grew to 64
(service-only context, environment-layer-without-deployment, no-downgrade routing refusal,
service/global routing within an environment, environment-level binding routing,
env-only match-shape validation, deployment→environment inference). Docs updated:
`design.md` §7, `data-model.md` §2/§7/§10/§13, `detailed-design.md` §8, `tool-contract.md`,
`operation-binding-template.md`, `glossary.md`, client hints.

**Global name sweep (2026-11-03):** a full scan of `dsh-env-manager` vs
`dsh-env-manager-plugin` across the repo and the `desktop` profile found no other runtime
occurrence of the same bug class. All remaining short-name uses are intentional: Host
plugin `name`/row id, the discovery Skill name, the `data/dsh-env-manager` dataDir
default, log prefixes, sidebar/main keys, legacy-install docs and the npm-name conflict
note. The profile holds only `dsh-env-manager-plugin` (no stale `dsh-env-manager`
dependency, symlink or lock entry). One latent doc hazard was corrected in
`ui-design.md`: the bundle config page slot `plugins.bundle.config` is keyed by the
**package name** (`dsh-env-manager-plugin`), not the row id — matching
`api-verification.md` F-sheet. A page refresh (Ctrl+F5) is still required for the
already-open GUI to materialize the fixed client module.

The panel uses a centered 1080 px column, 22 px title with a glyph mark, underline tabs,
compact stat cards and a master/detail environment view. **Environments is the first and
default tab**; a persistent header **New environment** action is available from every tab,
and `Records` is limited to services, deployments, rule profiles and operation bindings.
The panel header also carries 导出/导入 bundle actions; DR marking is set and shown on the
environment detail (容灾 card: role, type, peer environment picker, scope, RTO/RPO) and in
the environment list summaries (`DR <role> <type> → <peer>`), not as its own tab.

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
  - [x] `tool-contract.md` — fourteen model-facing tools with DSL schemas and errors
  - [x] `storage-contract.md` — dataDir resolution, atomicity, sessions, backups
  - [x] `module-boundaries.md` — ownership and dependency direction
  - [x] `ui-design.md` — panel layout, transport, states, i18n, QA checklist
  - [x] `security-model.md` — credentials, approval, HTTP controls, redaction
  - [x] `api-verification.md` — verified runtime facts F1–F21 and probes V1–V8
  - [x] `implementation-plan.md` — ordered tasks T01–T24, acceptance, cut line
  - [x] ADR-0001 … ADR-0012

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
- [x] Optional `dr` marking on each environment (role/type/peer/scope/RTO/RPO), `DR_PEER_UNKNOWN` warning and `RECORD_IN_USE` delete guard
- [x] Versioned bundle import/export (`env_import` / `env_export`, HTTP `import` / `export` ops)
- [x] Panel header import/export modals, environment detail 容灾 (DR) card (editable: role,
      type, peer environment picker, scope, RTO/RPO, note; reciprocal peer link and clear)
      and DR list summaries
- [x] Tests (135 passing, 14 files)
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
- Credential writes/deletes are restricted to `DSH_ENV_MANAGER_<ENVIRONMENT>_<ACCOUNT>`
  refs (uppercase letters, digits and underscores only — the DSH credential grammar); an
  invalid ref would break the whole credentials document at client boot.
- No arbitrary code in rule templates.
- No remote execution in V1.
- No production auto-apply.
- DR marking is topology metadata only: no failover/switch/promote operation exists, and
  RTO/RPO values are descriptive objectives, not enforced limits.
- An environment's `dr.peer` must reference an existing environment (`DR_PEER_UNKNOWN`
  warning otherwise); deleting an environment that is another's `dr.peer` is blocked with
  `RECORD_IN_USE` while the link exists.
- Bundle documents are transient: nothing is written outside `dataDir`, and a bundle never
  accepts passwords (the strict record schemas reject them).
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
- The `dr` role is limited to `primary`/`standby`; a witness/仲裁 role and scheduled
  DR-drill tracking are deferred, and there is no failover orchestration (the marking
  never executes anything).
- DR marking is edited on the environment detail's 容灾 card (role/type/peer/scope/RTO/RPO/
  note) or in the environment YAML. A peer link is stored per environment and the panel
  writes the mirror block when 同时更新对端环境 is checked, but nothing enforces a
  symmetric pair: a one-way `dr.peer` is accepted (only a missing peer triggers
  `DR_PEER_UNKNOWN`), and there is no bulk re-link across many environments.

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
8. DR follow-ups: a witness/仲裁 role, scheduled drill tracking, and (later)
   failover/switch/promote operations behind the existing approval gates — the `dr`
   marking itself stays read-only metadata. Panel `dr` editing (peer picker + reciprocal
   link) is done; a bulk "link these two environments" helper is not.
