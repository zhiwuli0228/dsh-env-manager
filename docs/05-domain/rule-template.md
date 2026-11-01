# Rule Profile Template

Copy into `<dataDir>/rules/<id>.yaml`.

```yaml
id: java-common
schemaVersion: 1
description: Common Java service paths, log sources and class locations

variables:
  installRoot: /opt/company/services
  timezone: Asia/Shanghai

paths:
  serviceHome: ${installRoot}/${service.id}
  jar: ${paths.serviceHome}/lib/${service.artifact.name}
  logDir: ${paths.serviceHome}/logs
  applicationLog: ${paths.logDir}/${service.id}.log
  configDir: ${paths.serviceHome}/config

logSources:
  native:
    kind: file
    path: ${paths.applicationLog}
  docker:
    kind: container-stdout
    container: ${deployment.location.containerName}
  kubernetes:
    kind: pod-logs
    namespace: ${deployment.location.namespace}
    workload: ${deployment.location.workload.name}

classLocations:
  native:
    kind: deployed-dir
    path: ${paths.serviceHome}/classes
  kubernetes:
    kind: jar-entry
    path: ${paths.jar}
    entryPrefix: com/company/aico

createdAt: 2026-11-01T03:00:00.000Z
updatedAt: 2026-11-01T03:00:00.000Z
```

## Template syntax

Allowed:

```text
${installRoot}
${paths.serviceHome}
${service.id}
${deployment.location.namespace}
```

Forbidden:

- function calls, arithmetic, conditionals
- environment variable access
- shell or command substitution
- JavaScript

## Notes

- A path may reference another path; cycles are errors.
- Undefined references are errors, not empty strings.
- Resolved paths containing `..` are rejected.
- `classLocations` distinguishes build output, deployed directories and jar entries.
- Only the deployment's `runtimeMode` entry is resolved by `env_resolve`.
- Overrides: environment `ruleOverrides`, then deployment `variables` and `ruleOverrides`.
