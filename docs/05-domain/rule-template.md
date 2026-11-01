# Rule Profile Template

```yaml
id: java-common
schemaVersion: 1
description: Common Java service paths and log sources
variables:
  installRoot: /opt/company/services
paths:
  serviceHome: "${installRoot}/${service.name}"
  jar: "${paths.serviceHome}/lib/${service.artifact.name}"
  logDir: "${paths.serviceHome}/logs"
  applicationLog: "${paths.logDir}/${service.name}.log"
logSources:
  native:
    kind: file
    path: "${paths.applicationLog}"
  docker:
    kind: container-stdout
    container: "${deployment.location.container}"
  kubernetes:
    kind: pod-logs
    namespace: "${deployment.location.namespace}"
    workload: "${deployment.location.workload.name}"
```
