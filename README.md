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
- **Memory Bridge** — a contract for feeding scoped, redacted operation records into the DSH memory plugin (P1).

## Status

**Phase 1 of the environment/plane model and Phase 1.1 of the K8s node/execution model are
implemented and installed in the `desktop` profile.**

- 47 Vitest tests pass; `npm run build` emits `lib/`.
- Ten `env_*` tools, the same-origin `/env-manager/api` route and the sidebar/main panel
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
  admin user, role, kind, access and cluster.
- The Kubernetes/clusters tab creates and edits cluster metadata (kind, topology, API
  endpoint, namespaces, credential reference) and derives node counts from `clusterRef`.
- Passwords are written to the DSH credential service; YAML keeps only
  `env-manager/<environmentId>/<hostId>-<username>`.
- **环境 (Environments) is the default tab**, and the persistent header **新增环境**
  action is available from every tab. `记录 (Records)` is limited to services,
  deployments, rule profiles and operation bindings.
- Remaining: database primary/replica/sharding topology (Phase 2), row-level delete for
  nodes/accounts/logins, light-theme visual QA, and the live approval/credential probes
  V4 and V6.
- No operation execution: routing returns the bound Skill and policy, it does not run it.

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

A password entered on the add/edit node form is sent once to the Host and stored by the
DSH credential service. It never appears in the registry YAML, tool output or logs. Use
**新建记录** only when you need to paste an advanced YAML template.

Design references:

- [`docs/01-architecture/design.md`](docs/01-architecture/design.md) — scope, algorithms,
  acceptance criteria;
- [`docs/01-architecture/decisions/ADR-0010-environment-plane-model.md`](docs/01-architecture/decisions/ADR-0010-environment-plane-model.md) —
  why one network is one environment and planes are role views;
- [`docs/01-architecture/decisions/ADR-0011-k8s-node-execution-model.md`](docs/01-architecture/decisions/ADR-0011-k8s-node-execution-model.md) —
  why K8s/Pod hosts are machines with command surfaces, not a new plane;
- [`docs/01-architecture/detailed-design.md`](docs/01-architecture/detailed-design.md) —
  module contracts, storage, tools, HTTP;
- [`docs/01-architecture/implementation-plan.md`](docs/01-architecture/implementation-plan.md) —
  ordered tasks and cut line;
- [`docs/01-architecture/api-verification.md`](docs/01-architecture/api-verification.md) —
  runtime facts and remaining probes.

## Installation

Use the Harness `plugin_manager` tool:

```text
action: install_bundle
target: <absolute path to this repository>
```

Then restart DSH if the bundle was already installed.

To remove it, call `plugin_manager` with `action: remove_bundle` and `target: dsh-env-manager`.

Registry data is created on first run under the resolved `dataDir`; it is not part of the repository.

## Project layout

```text
dsh-env-manager/
├── index.js              # Host entry shim over lib/index.js
├── client.js             # Web/Desktop client module
├── cordis.patch.yml      # Cordis bundle patch
├── package.json          # Bundle manifest
├── tsconfig.json         # Host build config (V1)
├── src/                  # TypeScript Host sources (V1)
├── lib/                  # Build output (git-ignored)
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
| [`docs/01-architecture/data-model.md`](docs/01-architecture/data-model.md) | record schemas |
| [`docs/01-architecture/tool-contract.md`](docs/01-architecture/tool-contract.md) | model-facing tool surface |
| [`docs/01-architecture/ui-design.md`](docs/01-architecture/ui-design.md) | panel design and manual QA |
| [`docs/01-architecture/implementation-plan.md`](docs/01-architecture/implementation-plan.md) | implementation order |
| [`docs/01-architecture/security-model.md`](docs/01-architecture/security-model.md) | credential and policy controls |

## Development

```bash
npm install
npm run build
npm test
npm run check
```

`npm run check` runs the typecheck, the Vitest suite and `node --check client.js`.

See [`docs/04-development/development-guide.md`](docs/04-development/development-guide.md).

## License

MIT
