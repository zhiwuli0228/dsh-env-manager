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
Browser (Client half) ──HTTP──▶ Host transport ──▶ app ──files──▶ plugin data dir
                                      │
Agent/model ──tools──▶ Host tools ────┤
                                      ├──describe──▶  DSH credential service
                                      ├──request───▶  DSH approval service
                                      └──lookup────▶  DSH Skill registry
```

Two untrusted input paths exist: the model through tools, and the browser page through
the local HTTP route. Registry content is user-maintained and semi-trusted. The DSH
credential service is the only component allowed to hold secret values.

---

## 3. Credential handling

### 3.1 Rules

1. Registry records store only `credentialRef` strings.
2. The Host calls `ctx.credentials.describe(ref)` and keeps only `{ configured, source?, writable }`.
3. The Host never calls `ctx.credentials.resolve(ref)` and never forwards a resolved value to a tool result, diagnostic or log.
4. Tool and HTTP outputs contain `{ ref, configured, source }` only.
5. `credentialRef` values are validated against the credential reference pattern if one exists; otherwise a conservative pattern (`^[A-Za-z0-9._:/-]{1,200}$`) is applied.
6. Host accounts and login records follow the same rule: `Host.accounts[].credentialRef` is a
   reference, and `LoginRecord` stores username, time, source and result only. Password,
   private-key, token and session-recording fields are not part of the schema.
7. The guided environment form may collect a password transiently. It sends the value
   once to `credential`; the Host calls `ctx.credentials.set(ref, value)` and returns only
   `{ ref, configured }`. The value is never written to YAML, never logged and never
   returned. The Host still never calls `resolve`.
8. Credential writes are restricted to refs matching
   `env-manager/<environmentId>/<accountId>` so the form cannot overwrite an ambient
   credential such as `OPENAI_API_KEY`.

### 3.2 Threat: exfiltration through tool output

Mitigation: a single formatting layer for tool results strips any field named `value`, `secret`, `password`, `token`, `privateKey` and similar, even if a future module accidentally adds one. This is defense in depth, not a replacement for rule 3.

### 3.3 Threat: credential reference confusion

A user may point a production deployment at a test credential. V1 cannot detect this; the result reports `configured: true` without revealing which secret it is. Operational review is required; this is documented as a residual risk.

### 3.4 Threat: password exposure during environment creation

The guided form necessarily holds the password in the browser input and sends it in the
same-origin JSON request. Mitigations:

- the route is localhost-only, requires the custom request header, validates origin and
  sends `cache-control: no-store`;
- the Host forwards the value directly to `ctx.credentials.set` and does not log the
  request body or the value;
- the response contains only the ref and `configured`, never the value;
- the generated YAML is checked by tests to contain the ref only.

A compromised same-origin page could still submit a credential write while the user is
present; this is accepted for a local single-user tool and documented as a residual risk.
Credential deletion is restricted to the same `env-manager/` namespace.

---

## 4. Approval and production policy

### 4.1 Operation routing

- `policy.requiresApproval` defaults to `true` for write operations.
- `policy.allowProduction` defaults to `false`.
- When `environmentCategory === 'production'` and `allowProduction !== true`, the router fails with `POLICY_DENIED`.
- The router does not execute anything; it returns the policy for the executing Skill.

### 4.2 Management writes

Tool writes (`env_save` / `env_delete`) request approval through `ctx.approval` when the write affects a production environment:

- creating/updating an environment with `category: production`;
- creating/updating a deployment or operation binding whose environment is production;
- deleting any environment, deployment or binding that resolves to production.

Denied approval returns `POLICY_DENIED`; nothing is written. An approval outcome other
than `allowed-once` (`rejected`, `cancelled`, `unavailable`) denies.

UI writes (`record.save` / `record.remove`) run with actor `'ui'`:

- production saves are denied unless `writePolicy.allowUiProductionWrites` is true;
- delete requires `confirm: true` and a second, explicit confirmation in the panel;
- the UI never sends an approval request (it has no agent); it is policy-gated instead.

### 4.3 Local HTTP route

`POST /env-manager/api` is reachable only with:

- `x-env-manager-request: 1`;
- `Content-Type: application/json`;
- an `Origin` equal to `ctx.webServer.getOrigin()` when the header is present;
- a body no larger than 2 MiB.

No CORS headers are sent, so a cross-origin page cannot preflight the custom header.
The route reads no cookie and no credential. It returns only registry data that a
`env_get`/`env_list` call could also return, plus derived context.

### 4.4 Threat: approval bypass

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
7. Template syntax is restricted to `${identifier(.identifier)*}` with a 2048-character
   cap; anything else is `RULE_TEMPLATE_INVALID`.

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
| Missing credential | `configured: false`, warning; operation still resolves |
| Broken reference | error from `env_validate`, skipped on read |
| Invalid record | skipped on read with diagnostic |
| Approval denied | `POLICY_DENIED`, no write |
| UI production write without `allowUiProductionWrites` | `POLICY_DENIED`, no write |
| Missing transport header or foreign origin | `FORBIDDEN`, no routing |
| Body over 2 MiB | 413, no parsing |
| Record cap exceeded | `RECORD_LIMIT_EXCEEDED`, no write |

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
6. The local HTTP route trusts the page origin and a custom header; a script running in
   the DSH page (extension, devtools) can call it. It can read registry data the user
   can already see, and write only as the `ui` actor under §4.2.
7. `ctx.fs.watch` is not used in V1, so an external edit is picked up on the next
   request rather than immediately; a stale resolve cannot outlive one request.
