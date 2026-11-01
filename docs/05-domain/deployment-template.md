# Deployment Binding Template

Copy into `<dataDir>/deployments/<id>.yaml`.

A service may have several bindings in one environment. Use distinct ids and a `name` to tell them apart.

## Kubernetes

```yaml
id: deploy-001
schemaVersion: 1
name: aicoservice-test-a
environmentId: test-a
serviceId: aicoservice
runtimeMode: kubernetes
location:
  kind: kubernetes
  clusterRef: k8s-01
  namespace: dv-sop
  workload:
    kind: Deployment
    name: aicoservice
  container: aicoservice
variables:
  replicaCount: 2
ruleOverrides:
  logSources:
    kubernetes:
      kind: pod-logs
      namespace: dv-sop
      workload: aicoservice
createdAt: 2026-11-01T03:00:00.000Z
updatedAt: 2026-11-01T03:00:00.000Z
```

## Native

```yaml
id: deploy-002
schemaVersion: 1
environmentId: test-a
serviceId: aicoservice
runtimeMode: native
location:
  kind: native
  hostRef: host-001
  installDir: /opt/company/services/aicoservice
  serviceName: aicoservice.service
createdAt: 2026-11-01T03:00:00.000Z
updatedAt: 2026-11-01T03:00:00.000Z
```

## Docker

```yaml
id: deploy-003
schemaVersion: 1
environmentId: test-a
serviceId: aicoservice
runtimeMode: docker
location:
  kind: docker
  hostRef: host-001
  containerName: aicoservice
  image: registry.example.internal/team/aicoservice:latest
createdAt: 2026-11-01T03:00:00.000Z
updatedAt: 2026-11-01T03:00:00.000Z
```

## Notes

- `runtimeMode` must equal `location.kind`.
- `hostRef` and `clusterRef` resolve inside the referenced environment only.
- `variables` are deployment-level user variables; they win over environment-level variables for that field.
- `ruleOverrides` is field-level: overriding `logSources` does not erase `paths`.
- If a service has several bindings and the caller omits `deploymentId`, the resolver fails with `DEPLOYMENT_AMBIGUOUS` rather than guessing.
