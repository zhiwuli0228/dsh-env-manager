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

## Execute targets

A binding declares **either** `skill` (discovery only — the agent invokes the Skill)
**or** one `execute` target. Both or neither is `RECORD_INVALID`.

Every `${ref}` in `execute` is interpolated like parameters (context refs and resolved
parameters such as `${namespace}` are available).

### Script under `<dataDir>/scripts`

```yaml
id: binding-provision
schemaVersion: 1
operation: deploy-environment
match: { environmentId: test-a }
execute:
  mode: script
  path: provision/provision.sh      # relative; absolute paths and ".." are rejected
  interpreter: bash                 # optional; defaults by extension
  args: ["${env.id}", "${service.name}"]
  timeoutSeconds: 900
policy: { requiresApproval: true, allowProduction: false }
enabled: true
createdAt: 2026-11-01T03:00:00.000Z
updatedAt: 2026-11-01T03:00:00.000Z
```

### Local CLI command (no shell)

```yaml
id: binding-restart
schemaVersion: 1
operation: restart
match: { environmentId: test-a, serviceId: aicoservice }
execute:
  mode: command
  argv: ["kubectl", "rollout", "restart", "deployment/${workload}", "-n", "${namespace}"]
  workingDirectory: null           # optional, relative to <dataDir>
  timeoutSeconds: 300
parameters:
  workload: ${deployment.location.workload.name}
  namespace: ${deployment.location.namespace}
policy: { requiresApproval: true, allowProduction: false }
enabled: true
createdAt: 2026-11-01T03:00:00.000Z
updatedAt: 2026-11-01T03:00:00.000Z
```

### Remote command (prepared ssh descriptor)

```yaml
id: binding-restart-vm
schemaVersion: 1
operation: restart
match: { environmentId: test-a }
execute:
  mode: remote
  hostRef: host-001                # optional; defaults to the first ssh host
  username: root                   # optional; never a secret
  command: "systemctl restart ${service.name}"
  timeoutSeconds: 300
policy: { requiresApproval: true, allowProduction: false }
enabled: true
createdAt: 2026-11-01T03:00:00.000Z
updatedAt: 2026-11-01T03:00:00.000Z
```

`remote` returns `{ address, port, username, command, credentialRef }` for the caller to
run over ssh; the plugin cannot read credential values, so it never opens the connection
itself.

## Approval and production rules

- Write operations default to `requiresApproval: true`.
- `env_operate` refuses a gated write execution without `confirm: true` (`APPROVAL_REQUIRED`);
  the tool turns that into the native approval prompt and retries once approved.
- `allowProduction` defaults to `false`; production execution is denied unless the binding
  sets it to `true`.
- Every completed or failed execution writes an experience (success → summary, failure →
  lesson) into the review queue; nothing auto-applies.

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
- A binding is discovery information. `env_operate` is the only path that runs an
  `execute` target, and it enforces approval + production gates first. Skill targets are
  never executed by the plugin.
