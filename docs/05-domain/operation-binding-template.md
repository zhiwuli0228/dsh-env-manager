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
| `environment` | `environmentId` only (environment-scoped ops) |
| `service` | `serviceId` |
| `category-mode` | `serviceCategory` + `deploymentMode` |
| `global` | none (empty `match: {}`) |

Every declared selector must match. The highest eligible level wins. Two eligible bindings at the same level are a conflict, never a coin flip.

A `match` must be exactly one of these six shapes. For example `environmentId` +
`deploymentMode`, or `deploymentMode` alone, is invalid (`RECORD_INVALID`).

**Operations always run inside an environment; routing never downgrades.** Invoking an
operation without an environment is `ENVIRONMENT_REQUIRED` — routing never falls through
to `service`/`global` bindings. If you bind to an environment, that is where the operation
must run. The flow is: select the environment → pick the operation → route to its binding.
`service`-level and `global` bindings still apply, within whichever environment is
selected.

**Environment deployment is separate from code replacement.** Code operations
(`deploy`, `replace`, `redeploy`, ...) are service-scoped: use `environment-service` /
`service` / `deployment` matches. `deploy-environment` provisions the environment itself:
use the `environment` level (`match: { environmentId }`), no service; it generally runs on
the management plane and is used in VM scenarios.

## Standard operations

```text
install, deploy, redeploy, replace, restart, upgrade, rollback, uninstall,
collect-logs, health-check, inspect, upload, download,
deploy-environment        # environment-scoped; management plane, VM scenarios
```

Custom operations are allowed but must be bound explicitly.

## Policy

- Write operations default to `requiresApproval: true`.
- `allowProduction` defaults to `false`.
- A binding is discovery information. It does not execute anything.
