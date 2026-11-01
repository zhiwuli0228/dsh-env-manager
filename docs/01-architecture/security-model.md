# Security Model (V1)

Status: normative for V1.

The plugin manages internal network topology and may describe production systems. This document defines the security boundaries and the controls required by V1.

Related: [AGENTS.md](../../AGENTS.md) §3, [security-policy.md](../06-operations/security-policy.md), [design.md](./design.md) §12, [data-model.md](./data-model.md).

---

## 1. Assets

| Asset | Sensitivity | Where it lives |
|---|---|---|
| Hostnames, IPs, internal URLs | medium | registry YAML |
| Service Git URLs | low–medium | registry YAML |
| Deployment topology | medium | registry YAML |
| Credential references | low | registry YAML |
| Credential values | high | DSH credential service / external vault — **never here** |
| Operation history | medium | memory plugin (P1) |
| Skill bindings and policies | high (execution routing) | registry YAML |

---

## 2. Trust boundaries

```text
Agent/model  ──tools──▶  Host plugin  ──files──▶  plugin data dir
                              │
                              ├──describe──▶  DSH credential service
                              ├──request───▶  DSH approval service
                              └──lookup────▶  DSH Skill registry
```

The model is untrusted input. Registry content is user-maintained and semi-trusted. The DSH credential service is the only component allowed to hold secret values.

---

## 3. Credential handling

### 3.1 Rules

1. Registry records store only `credentialRef` strings.
2. The Host calls `ctx.credentials.describe(ref)` to obtain status: `configured`, `missing` or `unavailable`.
3. The Host never calls `ctx.credentials.resolve(ref)` and never forwards a resolved value to a tool result, diagnostic or log.
4. Tool outputs contain `{ ref, status }` only.
5. `credentialRef` values are validated against the credential reference pattern if one exists; otherwise a conservative pattern (`^[A-Za-z0-9._:/-]{1,200}$`) is applied.

### 3.2 Threat: exfiltration through tool output

Mitigation: a single formatting layer for tool results strips any field named `value`, `secret`, `password`, `token`, `privateKey` and similar, even if a future module accidentally adds one. This is defense in depth, not a replacement for rule 3.

### 3.3 Threat: credential reference confusion

A user may point a production deployment at a test credential. V1 cannot detect this; the status is reported as `configured` without revealing which secret it is. Operational review is required; this is documented as a residual risk.

---

## 4. Approval and production policy

### 4.1 Operation routing

- `policy.requiresApproval` defaults to `true` for write operations.
- `policy.allowProduction` defaults to `false`.
- When `environmentCategory === 'production'` and `allowProduction !== true`, the router fails with `POLICY_DENIED`.
- The router does not execute anything; it returns the policy for the executing Skill.

### 4.2 Management writes

`env_save` / `env_delete` request approval through `ctx.approval` when the write affects a production environment:

- creating/updating an environment with `category: production`;
- creating/updating a deployment or operation binding whose environment is production;
- deleting any environment, deployment or binding that resolves to production.

Denied approval returns `POLICY_DENIED`; nothing is written.

### 4.3 Threat: approval bypass

A caller could edit YAML files directly, outside the tools. V1 cannot prevent this; file access is governed by the DSH sandbox and OS permissions. The design documents this as a deliberate boundary: the plugin is a context manager, not a policy enforcement point for the filesystem.

---

## 5. Rule template safety

Controls:

1. Interpolation only — no function calls, operators, conditionals or shell.
2. No environment variable access unless a future ADR explicitly allows named variables.
3. Undefined references are errors.
4. Cyclic references are errors with the cycle path.
5. Resolved paths are rejected if any segment is `..`.
6. Resolved values are not executed, only returned.

Threat: a malicious rule profile could point at sensitive directories to make the Agent read them later. Mitigation: the plugin never reads the resolved paths itself in V1; it only returns them. Future adapters that read paths must add their own path allowlist.

---

## 6. Data minimization and redaction

Before emitting diagnostics, logs or P1 operation records:

- Replace values matching common secret patterns: `password=`, `token=`, `Authorization:`, private key blocks, `kubeconfig` blocks.
- Truncate command output and error text to a bounded length.
- Keep only opaque evidence references, not raw evidence.

The redaction function is shared and unit-tested.

---

## 7. Scope isolation

- Registry data is profile-global and read-only for sessions.
- Session default environment is per session; one session cannot change another's.
- Tools accept explicit ids and do not implicitly broaden scope.
- P1 memory queries always carry environment/service/deployment scope; a single-environment result must not be presented as a global rule.

---

## 8. Fail-safe behavior

| Condition | Behavior |
|---|---|
| Two same-level bindings | `BINDING_CONFLICT`, no selection |
| Skill missing or mismatched | `SKILL_UNAVAILABLE`, no fallback |
| Skill registry unreachable | resolve with `available: 'unknown'` + warning |
| Production without `allowProduction` | `POLICY_DENIED` |
| Missing credential | status `missing`, warning; operation still resolves |
| Broken reference | error from `env_validate`, skipped on read |
| Invalid record | skipped on read with diagnostic |
| Approval denied | `POLICY_DENIED`, no write |

---

## 9. Audit

V1 does not maintain an audit log of its own. P1 operation records become the audit trail through the memory bridge.

Requirements for P1:

- every write-class operation record includes `sessionId`, target ids, outcome and evidence refs;
- summaries are redacted;
- records are append-only from the plugin's perspective;
- evidence retention is bounded.

---

## 10. Residual risks

1. YAML editing outside the plugin bypasses approval.
2. Credential reference swaps are undetectable without a vault policy.
3. A correct Skill binding can still be used for an unsafe action; policy is necessary but not sufficient.
4. Internal hostnames/IPs in registry files may leak if the repository or data directory is shared carelessly. Registry data must not be committed to Git.
5. Operation history in P1 may capture sensitive command text if redaction is incomplete.
