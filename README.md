# DSH Environment Manager

A [DSH (DeepSeek Harness)](https://www.deepseek.com/) plugin that gives every session a shared, queryable view of enterprise environments, services, deployments and operation-to-Skill bindings.

Works in DSH Web and Desktop.

> 中文简介：这是一个 DSH 插件，让每个会话都能按需读取企业运行环境、服务目录、部署实例、分层规则以及操作与 Skill 的绑定关系。

## What it does

- **Environment Registry** — hosts, clusters, logical roles, access endpoints and co-location in one record.
- **Service Catalog** — Git URL, default branch, build tool, artifact and rule profile references.
- **Deployment Binding** — which service runs where, as `native`, `docker` or `kubernetes`, with instance-level variables.
- **Rule Resolver** — layered, field-level overrides with full provenance: every value explains where it came from and what influenced it.
- **Operation Skill Router** — maps an operation (deploy, redeploy, collect-logs, …) to exactly one bound Skill, detecting conflicts and enforcing approval policy.
- **Session Context** — a per-session default environment that never leaks into another session.
- **Memory Bridge** — a contract for feeding scoped, redacted operation records into the DSH memory plugin (P1).

## Status

**V1 implementation in progress — Host, tools, HTTP API, panel and tests are in place.**

- 34 Vitest tests pass; `npm run build` emits `lib/`.
- Ten `env_*` tools, the same-origin `/env-manager/api` route and the sidebar/main panel
  are implemented.
- Remaining: install smoke test in a profile, runtime probes V1–V8, manual panel QA.
- No operation execution: routing returns the bound Skill and policy, it does not run it.

Design references:

- [`docs/01-architecture/design.md`](docs/01-architecture/design.md) — scope, algorithms,
  acceptance criteria;
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
