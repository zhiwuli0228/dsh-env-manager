# Service Template

Copy into `<dataDir>/services/<id>.yaml` and replace the example values.

```yaml
id: aicoservice
schemaVersion: 1
name: Aico Service
aliases: [aicoservice]
category: backend
description: Core AI coordination service

git:
  url: https://git.example.internal/team/aicoservice.git
  defaultBranch: main
  modulePath: /            # monorepo subpath, omit when not needed

build:
  tool: maven              # maven | gradle | npm | custom
  command: mvn -DskipTests package

artifact:
  name: aicoservice.jar
  path: ${paths.serviceHome}/lib/${artifact.name}

deployModes: [native, docker, kubernetes]
ruleProfileRefs: [java-common, company-default]   # order matters; later wins

createdAt: 2026-11-01T03:00:00.000Z
updatedAt: 2026-11-01T03:00:00.000Z
```

## Notes

- Services are environment-independent. Placement belongs in a deployment binding.
- `ruleProfileRefs` are applied in order; when two profiles define the same field, the later one wins.
- `deployModes` must include every runtime mode used by its deployment bindings.
- `artifact.name` is commonly interpolated by rule profiles as `${service.artifact.name}`.
- No credentials here. A service-level credential is not modelled in V1.
