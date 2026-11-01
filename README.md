# DSH Environment Manager

A [DSH (DeepSeek Harness)](https://www.deepseek.com/) plugin that gives every session a shared view of your enterprise environments, services, deployments and operation-to-skill bindings.

> 中文简介：这是一个 DSH 插件，让每个会话都能按需读取企业运行环境、服务目录、部署实例以及操作与 Skill 的绑定关系。

## What it does

- **Environment Registry** – record hosts, clusters, logical roles and access endpoints.
- **Service Catalog** – keep service metadata, Git URLs, artifacts and rule profiles in one place.
- **Deployment Binding** – describe which service runs where, whether native, Docker or Kubernetes.
- **Rule Resolver** – resolve paths, log sources and runtime rules from layered, provenanced templates.
- **Operation Skill Router** – map an operation (deploy, redeploy, collect-logs, …) to the right Skill for a given context.
- **Memory Bridge** – feed structured operation records and evidence references into the DSH memory plugin.

## Status

This repository is in early development. The current skeleton provides a standard DSH bundle with both Host and Client entries; it is installable as a local bundle in DSH Web and Desktop.

## Install

1. Clone the repository:

   ```bash
   git clone https://github.com/<your-org>/dsh-env-manager.git
   cd dsh-env-manager
   ```

2. Install the bundle in your DSH profile (run from the checkout directory):

   ```bash
   dsh plugin_manager install_bundle --target .
   ```

   Or use the Harness GUI / `plugin_manager` tool with `action: install_bundle`.

3. Restart DSH if required.

## File layout

```text
dsh-env-manager/
├── index.js          # Host plugin entry
├── client.js         # Web/Desktop UI client entry
├── cordis.patch.yml  # Cordis bundle patch
├── package.json      # Bundle manifest
├── locale/           # Display metadata
│   ├── en.json
│   └── zh.json
├── icon.svg          # Plugin icon
├── docs/             # Architecture and planning documents
└── README.md
```

## Development

- Edit `index.js` to add Host-side tools, services and storage.
- Edit `client.js` to add UI slots for the Web/Desktop client.
- Update `locale/*.json` when you change display text.
- Keep `cordis.patch.yml` and `package.json` in sync with new exports.

## Roadmap

See [docs/01-architecture/DSH_Environment_Service_Memory_Skill_Brainstorm.md](./docs/01-architecture/DSH_Environment_Service_Memory_Skill_Brainstorm.md) for the full brainstorm and V1 scope.

## License

MIT
