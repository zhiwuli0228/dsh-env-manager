# DSH Environment Manager

A [DSH (DeepSeek Harness)](https://www.deepseek.com/) plugin that gives every session a shared, queryable view of enterprise environments, services, deployments and operation-to-Skill bindings.

Works in DSH Web and Desktop.

> 中文简介：这是一个 DSH 插件，让每个会话都能按需读取企业运行环境、服务目录、部署实例、分层规则以及操作与 Skill 的绑定关系。

## What it does

- **Environment Registry** — hosts, clusters, logical roles, access endpoints, host
  accounts and login audit records in one record.
- **Service Catalog** — Git URL, default branch, build tool, artifact and rule profile references.
- **Deployment Binding** — which service runs where, as `native`, `docker` or `kubernetes`, with instance-level variables.
- **Rule Resolver** — layered, field-level overrides with full provenance: every value explains where it came from and what influenced it.
- **Operation Skill Router** — maps an operation (deploy, redeploy, collect-logs, …) to exactly one bound Skill, detecting conflicts and enforcing approval policy.
- **Session Context** — a per-session default environment that never leaks into another session.
- **Discovery Skill** — a profile-wide `dsh-env-manager` Skill registers with the plugin and
  makes the registry discoverable from any workspace in the same profile; its full workflow
  loads only when invoked.
- **Memory Bridge** — a contract for feeding scoped, redacted operation records into the DSH memory plugin (P1).

## Status

**Phase 1 of the environment/plane model and Phase 1.1 of the K8s node/execution model are
implemented and installed in the `desktop` profile.**

- 102 Vitest tests pass; `npm run check` (typecheck + build + tests + client syntax)
  emits the committed `lib/` tree.
- Twelve `env_*` tools, the same-origin `/env-manager/api` route and the sidebar/main panel
  are implemented.
- One environment is one complete network and one configuration page. Management,
  business, database and expansion are **role views** over the same `hosts[]`; a node
  serving two planes is one host with two roles.
- The environment detail page is split into overview, all nodes, one tab per plane, login
  records, Kubernetes/clusters, endpoints and YAML. Plane tabs filter the same node
  collection.
- `New environment` creates only the environment shell and seeds the four standard roles.
  Nodes are added inside the environment, individually or by batch import.
- Add/edit node supports multiple roles, a machine kind (`vm`, `physical`, K8s all-in-one,
  K8s worker, Pod host), command access (`ssh`, `kubectl`, `docker`) and an optional login
  credential. K8s kinds reference a cluster; a Pod host is the machine reached with
  `docker exec`, not one record per Pod. Batch import (`IP,name,roles,port,user`) creates
  generic VM nodes and never accepts passwords. Node search covers id, name, IP, platform,
  admin user, role, kind, access, cluster, account username and web login URL.
- Accounts can carry a web login URL and username for a management or business console.
  `Add web login` opens the account form with protocol `web`; `Edit account` can change the
  URL or rotate the password. A password is written to the DSH credential service, never to
  YAML.
- The Kubernetes/clusters tab creates and edits cluster metadata (kind, topology, API
  endpoint, namespaces, credential reference) and derives node counts from `clusterRef`.
- Passwords are written to the DSH credential service; YAML keeps only
  `DSH_ENV_MANAGER_<ENVIRONMENT>_<ACCOUNT>` refs.
- **环境 (Environments) is the default tab**, and the persistent header **新增环境**
  action is available from every tab. `记录 (Records)` is limited to services,
  deployments, rule profiles and operation bindings.
- Remaining: database primary/replica/sharding topology (Phase 2), row-level delete for
  nodes/accounts/logins, light-theme visual QA, and the live approval/credential probes
  V4 and V6.
- Operation bindings route to a bound Skill **or** an executable target
  (`script` under `<dataDir>/scripts`, a local CLI `command`, or a prepared `remote` ssh
  command). `env_operate` runs local targets behind approval and production gates and
  writes an experience (success → summary, failure → lesson) into a review queue;
  routing surfaces the most relevant experiences so the tool gets smarter with use.
  `remote` targets are prepared as an ssh descriptor, never executed by the plugin.
- **Disaster-recovery marking lives inside each environment record** (`dr` block:
  `role` `primary` 生产 / `standby` 容灾, `type` `AS` 主备 / `AA` 双活 / `AP` 主从 or a
  custom code, optional `peer` environment, `scope` 同城/异地, RTO/RPO minutes and a
  note). The environment detail's 容灾 card both shows and edits it: **关联容灾** opens a
  form whose peer picker lists the other registered environments, so the pair is a link
  between two environments (by id, never a copy); 同时更新对端环境 also writes the mirror
  block on the peer, and 解除容灾 clears both sides. A missing peer is a `DR_PEER_UNKNOWN`
  warning and deleting a referenced peer is blocked (`RECORD_IN_USE`). The marking is
  metadata: there is no failover/switch/promote operation and RTO/RPO are descriptive
  objectives, never enforced.
- **Bundle import/export** (`env_import` / `env_export`, plus the panel's 导入 / 导出
  actions) onboards, backs up or migrates whole sets of environments with their services,
  deployments, rule profiles and operation bindings in one versioned document. DR marking
  travels inside each environment; exporting one half of a DR pair automatically carries
  the peer so the bundle stays self-contained. Bundles are strict (no passwords),
  size-capped, reference-checked and gated by the same approval and production policy as
  single-record writes.
- **DSH compatibility:** the bundle targets DSH `0.2.1-rc.5` through the `0.2.2` line
  (including `0.2.2-rc.x`); `0.3.0` is intentionally excluded until verified. The full
  suite (typecheck + build + tests) passes against both `@deepseek-ai/dsh-tools@0.2.1-rc.5`
  and `@0.2.2-rc.1`; `engines.dsh` and the peer ranges encode that contract and are
  covered by `tests/compat.test.ts`.

## How agents discover the registry

The plugin ships a **discovery Skill** named `dsh-env-manager` as part of the same bundle.
It is not a separate `SKILL.md`, and it is not installed separately.

How it works:

1. `apply()` registers the Skill through `ctx.skills.register()` from the plugin's
   unscoped context. DSH files it into the global Skill layer for the current profile.
2. The Skill catalog carries only the name, description and `whenToUse`. That description
   is the **proactive mention** that lets a new workspace discover the registry.
3. The full workflow body is loaded only when the model or user invokes the Skill. It tells
   the agent to use `env_list` / `env_find` first, then `env_set_context`, `env_resolve`,
   `env_resolve_operation` (which also returns related experiences), and — for explicit
   execution bindings — `env_operate` / `env_experience`; for bulk onboarding, backup or
   migration it also points at `env_import` / `env_export`.
4. The plugin does **not** inject a global system-prompt section. Unrelated coding sessions
   do not receive environment-manager instructions.
5. The registration is created inside the plugin effect, so disabling or uninstalling the
   plugin also removes the Skill.
6. `registerSkill: false` in the plugin config suppresses the entry without affecting the
   tools or panel.

Scope and limits:

- **Same DSH profile:** every workspace, including a new empty one, sees the Skill in its
  catalog; no workspace `AGENTS.md` is required. This was verified from an empty temporary
  workspace.
- **Different profile or machine:** the Skill is not shared; install the bundle there.
- The Skill is **discovery, not execution**. It does not deploy, restart or collect logs.
  Those actions still need an `operationBinding` that points to an execution Skill.
- A catalog entry is a trigger surface, not a hard guarantee. Critical operations must still
  be enforced in the execution Skill or tool layer.
- Because the Skill is registered by the plugin, its content is versioned with the plugin;
  there is no workspace copy to drift.

The plugin's own tools remain registered independently of this Skill. The Skill only makes
the registry discoverable and explains the intended workflow.

> 中文：`dsh-env-manager` 随插件一起注册，**不单独安装**；同一 DSH profile 下的所有工作区
> 都能在 Skill 目录看到它，正文按需加载；**不注入全局系统提示**。它只负责发现和指导，
> 不执行部署/重启；真正的执行仍由 `operationBinding` 指向的执行 Skill 完成。

## Add an environment

1. Open **环境管理器** (Environment Manager); it opens on the **环境 (Environments)** tab.
2. Click **新增环境** (New environment) in the panel header. The same action is available
   from any other tab.
3. Fill in the environment name, optional id, category and description. The four standard
   planes are created automatically. Click **创建环境** (Create environment).
4. Open the new environment. Use **全部节点** (All nodes) or a plane tab, then
   **添加节点** (Add node). A node may carry several roles.
5. To register many nodes, use **批量导入** (Batch import):
   `IP,name,roles,port,user` per line, with `|` or `/` between roles. Batch import creates
   generic VM nodes and optional accounts but no passwords.
6. For Kubernetes or Pod-hosting machines, open **K8s / 集群** (Kubernetes / clusters)
   first and add the cluster. Then select the node kind, cluster and command access in
   **添加节点** (Add node). Choose **K8s 合设** when the control plane and worker share a
   machine; choose **Pod 宿主机** for a machine operated through `docker exec`. A Pod itself
   is not added as a node.
7. For a management or business web console, open the relevant plane tab and find the node
   that hosts it, then click **添加 Web 登录** (Add web login) on the node card. Enter the
   web login URL, username and (optionally) the password. The URL is stored on the account,
   the password is written to the DSH credential service, and the account can later be
   updated with **编辑账号** (Edit account).

A password entered on the node or account form is sent once to the Host and stored by the
DSH credential service. It never appears in the registry YAML, tool output or logs. Use
**新建记录** only when you need to paste an advanced YAML template.

## Disaster-recovery marking and bundles

1. Create both environments first (production site and DR site are independent records).
2. Open the production environment and use **关联容灾** on the **容灾 (DR)** card in the
   right rail: choose `role` `primary` (生产) / `standby` (容灾), `type` (`AS` 主备 /
   `AA` 双活 / `AP` 主从 or a custom code), the **peer environment** from the picker (the
   other registered environment), `scope` (同城/异地), RTO/RPO minutes and a note. Keep
   同时更新对端环境 checked so the peer's own marking is written back with the opposite
   role — or repeat the step on the peer environment. Every environment carries its own
   marking; there is no separate DR module, and the YAML tab edits the same block.
3. Run **校验 (Validate)** from Overview: an environment whose `dr.peer` is missing is
   flagged `DR_PEER_UNKNOWN`, and deleting an environment that is the DR peer of another
   is blocked with `RECORD_IN_USE` until the peer link is edited or removed
   (**解除容灾** removes this side and the peer's back-reference).
4. To onboard or back up a whole set, use **导入 / 导出** in the panel header (or the
   agent tools `env_import` / `env_export`). Export produces a versioned JSON bundle for
   the whole registry or a selected list of environments; DR marking travels inside each
   environment, and exporting one half of a DR pair automatically carries the peer so the
   bundle stays self-contained. Import accepts YAML/JSON bundle text with
   `skip` / `overwrite` / `error` conflict modes, reports per-record failures, and asks
   for confirmation before touching production records.

DR marking is metadata only: it never executes anything, and RTO/RPO values are
objectives, not measured or enforced limits.

### Batch-import walkthrough

A bundle is one YAML (or JSON) document; paste it into **导入** in the panel header, or
hand it to `env_import` with `mode: skip | overwrite | error` and `confirm: true` when the
bundle contains production records. A minimal two-site pair looks like this:

```yaml
version: 1
environments:
  - id: prod-a
    schemaVersion: 1
    name: 生产 A
    aliases: [pa]
    category: production
    dr: { role: primary, type: AS, peer: dr-a, scope: 同城, rtoMinutes: 30, rpoMinutes: 10 }
    roles:
      - { id: app, name: Application }
  - id: dr-a
    schemaVersion: 1
    name: 容灾 A
    aliases: []
    category: production
    dr: { role: standby, type: AS, peer: prod-a, scope: 同城, rtoMinutes: 30, rpoMinutes: 10 }
    roles:
      - { id: app, name: Application }
services: []
deployments: []
ruleProfiles: []
operationBindings: []
```

Behaviour worth knowing:

- The five arrays are optional; unknown top-level keys, a wrong `version`, a non-array
  kind field and any password-like field are rejected (`IMPORT_INVALID` /
  `RECORD_INVALID`) without writing anything.
- Every environment needs at least one logical role (`roles: [{ id, name }]`); `hosts`,
  `clusters`, `endpoints` and `aliases` default to empty.
- Records apply in dependency order (environment → service → deployment → ruleProfile →
  operationBinding) and environment/service/deployment references resolve against the
  existing registry **plus** the ids in the same bundle, so a deployment may point at an
  environment it just created.
- `skip` (default) keeps existing records, `overwrite` replaces them (keeping the original
  `createdAt`), `error` reports the conflict; one bad record never aborts the rest — the
  result lists `imported` / `skipped` / `failed` / `warnings`.
- Both halves of a DR pair should be in the same bundle (or already registered), otherwise
  the peer is reported as `DR_PEER_UNKNOWN`. Exporting one half is safe: the peer
  environment rides along automatically.
- The document is processed in memory and never stored; only `credentialRef` names are
  accepted, never secrets.

Design references:

- [`docs/01-architecture/design.md`](docs/01-architecture/design.md) — scope, algorithms,
  acceptance criteria;
- [`docs/01-architecture/decisions/ADR-0010-environment-plane-model.md`](docs/01-architecture/decisions/ADR-0010-environment-plane-model.md) —
  why one network is one environment and planes are role views;
- [`docs/01-architecture/decisions/ADR-0011-k8s-node-execution-model.md`](docs/01-architecture/decisions/ADR-0011-k8s-node-execution-model.md) —
  why K8s/Pod hosts are machines with command surfaces, not a new plane;
- [`docs/01-architecture/decisions/ADR-0012-dr-marking-and-bundle-import-export.md`](docs/01-architecture/decisions/ADR-0012-dr-marking-and-bundle-import-export.md) —
  why DR marking lives inside each environment record and bundles are versioned and strict;
- [`docs/05-domain/environment-template.md`](docs/05-domain/environment-template.md) —
  environment record template, including the `dr` block;
- [`docs/01-architecture/detailed-design.md`](docs/01-architecture/detailed-design.md) —
  module contracts, storage, tools, HTTP;
- [`docs/01-architecture/implementation-plan.md`](docs/01-architecture/implementation-plan.md) —
  ordered tasks and cut line;
- [`docs/01-architecture/api-verification.md`](docs/01-architecture/api-verification.md) —
  runtime facts and remaining probes.

## Installation

The npm package is `dsh-env-manager-plugin` (the npm name `dsh-env-manager` is already
an unrelated package). Install it as a profile bundle; do not install it with
`npm install -g`.

### From npm

`dsh-env-manager-plugin@0.1.5` is the DSH-0.2.2-rcx compatibility release (supports
`0.2.1-rc.5` through the `0.2.2` line; see the DSH compatibility note in
[Status](#status)); `0.1.4` fixed the credential-store format (`DSH_ENV_MANAGER_*` refs);
`0.1.3` was the client-module fix release (`load` id equals the package name, contract
test, doc hardening); `0.1.2` was the install-hardening patch release; `0.1.0` was the
first published release. Install the bundle through the Harness plugin manager; do
**not** use `dsh plugin add` for activation:

```text
action: install_bundle
target: dsh-env-manager-plugin@0.1.5
```

`plugin_manager` adds the package to the profile exactly once. Do not also add it to
`dsh.profile.bundles` by hand, and do not install both the old local bundle name
(`dsh-env-manager`) and the npm package: duplicate bundle entries load the same plugin
twice and can prevent DSH from starting.

### From a local checkout

The repository includes the compiled `lib/` directory, so an unmodified checkout does not
need a build step. Use the Harness `plugin_manager` tool with the absolute repository
path:

```text
action: install_bundle
target: <absolute path to this repository>
```

If you change `src/`, run `npm run build` before reinstalling. The build output is
committed on purpose so installs from a checkout or a git tarball do not depend on
lifecycle scripts running in the target profile.

Then restart DSH if the bundle was already installed.

The bundle includes the `dsh-env-manager` discovery Skill; there is no separate Skill
installation step. To suppress only the Skill catalog entry, set `config.registerSkill`
to `false` while keeping the tools and panel:

```yaml
config:
  registerSkill: false
```

To remove the whole plugin, call `plugin_manager` with `action: remove_bundle` and
`target: dsh-env-manager-plugin`.

Registry data is created on first run under the resolved `dataDir`; it is not part of the repository.

## Project layout

```text
dsh-env-manager/
├── index.js              # Host entry shim over lib/index.js
├── client.js             # Web/Desktop client module
├── cordis.patch.yml      # Cordis bundle patch
├── package.json          # Bundle manifest
├── tsconfig.json         # Host build config (V1)
├── .github/workflows/    # GitHub Actions release pipeline
├── src/                  # TypeScript Host sources (V1)
│   └── skill.ts          # bundled profile-wide discovery Skill
├── lib/                  # Compiled Host output (committed for installs)
├── locale/               # en.json, zh.json
├── icon.svg
├── docs/                 # Design, harness and operations docs
└── tests/                # Vitest tests (V1)
```

## Documentation

Start at [`docs/README.md`](docs/README.md).

Key documents:

| Document | Content |
|---|---|
| [`docs/00-project/project-brief.md`](docs/00-project/project-brief.md) | positioning and V1 scope |
| [`docs/01-architecture/design.md`](docs/01-architecture/design.md) | design, algorithms, acceptance criteria |
| [`docs/01-architecture/detailed-design.md`](docs/01-architecture/detailed-design.md) | module contracts, tools, HTTP transport |
| [`docs/01-architecture/data-model.md`](docs/01-architecture/data-model.md) | record schemas (including DR marking and bundles, §8–§9) |
| [`docs/01-architecture/tool-contract.md`](docs/01-architecture/tool-contract.md) | model-facing tool surface (14 tools) |
| [`docs/05-domain/environment-template.md`](docs/05-domain/environment-template.md) | environment record template (including the `dr` block) |
| [`docs/01-architecture/ui-design.md`](docs/01-architecture/ui-design.md) | panel design and manual QA |
| [`docs/01-architecture/implementation-plan.md`](docs/01-architecture/implementation-plan.md) | implementation order |
| [`docs/01-architecture/security-model.md`](docs/01-architecture/security-model.md) | credential and policy controls |
| [`docs/06-operations/release.md`](docs/06-operations/release.md) | npm Trusted Publisher and GitHub Release pipeline |

## Release

`v0.1.2` is the latest install-hardening release. `v0.1.0` was the first published
release and was bootstrapped manually so the package name exists; later tags are
published by the workflow through npm Trusted Publisher (OIDC). See
[npm](https://www.npmjs.com/package/dsh-env-manager-plugin) and
[GitHub Releases](https://github.com/zhiwuli0228/dsh-env-manager/releases).

Pushing an annotated `v*` tag triggers `.github/workflows/release.yml`: it verifies the
tag matches `package.json`, runs `npm run check`, packs the npm tarball, publishes with
npm Trusted Publisher (OIDC), and creates a GitHub Release with the tarball attached.
If the npm version already exists, the workflow skips publish and still creates the
Release, so a partial release can be recovered by dispatching the same tag.

```sh
git tag -a v0.1.2 -m "v0.1.2"
git push origin v0.1.2
```

The **first** publish had to be bootstrapped manually so the npm package existed; bind
`zhiwuli0228/dsh-env-manager` + `release.yml` as a Trusted Publisher after that. Full
steps, permissions and failure modes are in
[`docs/06-operations/release.md`](docs/06-operations/release.md).

## Development

```bash
npm install
npm run build
npm test
npm run check
```

`npm run check` runs the typecheck, the build, the Vitest suite and
`node --check client.js`.

See [`docs/04-development/development-guide.md`](docs/04-development/development-guide.md).

## License

MIT
