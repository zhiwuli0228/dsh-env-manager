# Operation Binding Template

Copy into `<dataDir>/operations/<id>.yaml`.

```yaml
id: binding-001
schemaVersion: 1
operation: redeploy          # standard id or custom id
match:
  environmentId: test-a
  serviceId: aicoservice
skill:
  name: redeploy-k8s-service
  expectedSource: null       # optional SkillSummary.source constraint
  expectedProvider: null     # optional SkillSummary.provider constraint
parameters:
  namespace: ${deployment.location.namespace}
  workload: ${deployment.location.workload.name}
  cluster: ${deployment.location.clusterRef}
policy:
  requiresApproval: true
  allowProduction: false
enabled: true
createdAt: 2026-11-01T03:00:00.000Z
updatedAt: 2026-11-01T03:00:00.000Z
```

## Match levels

| Level | Selectors present |
|---|---|
| `deployment` | `deploymentId` |
| `environment-service` | `environmentId` + `serviceId` |
| `service` | `serviceId` |
| `category-mode` | `serviceCategory` + `deploymentMode` |
| `global` | none (empty `match: {}`) |

Every declared selector must match. The highest eligible level wins. Two eligible bindings at the same level are a conflict, never a coin flip.

A `match` must be exactly one of these five shapes. For example `environmentId` alone, or `environmentId` + `deploymentMode`, is invalid (`RECORD_INVALID`).

## Standard operations

```text
install, deploy, redeploy, replace, restart, upgrade, rollback, uninstall,
collect-logs, health-check, inspect, upload, download
```

Custom operations are allowed but must be bound explicitly.

## Policy

- Write operations default to `requiresApproval: true`.
- `allowProduction` defaults to `false`.
- A binding is discovery information. It does not execute anything.
