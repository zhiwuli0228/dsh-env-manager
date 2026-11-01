# V1 Design

Status: V1 design, derived from
[DSH_Environment_Service_Memory_Skill_Brainstorm.md](./DSH_Environment_Service_Memory_Skill_Brainstorm.md)
and verified against the DSH runtime in [api-verification.md](./api-verification.md).

Scope of this document: **V1 = P0** from the brainstorm, plus the contracts needed to start P1.

Normative companions:

- [detailed-design.md](./detailed-design.md) — module contracts, algorithms, tool and HTTP specs
- [data-model.md](./data-model.md) — record schemas and result types
- [tool-contract.md](./tool-contract.md) — model-facing tool surface
- [storage-contract.md](./storage-contract.md) — persistence rules
- [module-boundaries.md](./module-boundaries.md) — module ownership
- [security-model.md](./security-model.md) — credential, policy and redaction rules
- [ui-design.md](./ui-design.md) — Client panels and transport
- [implementation-plan.md](./implementation-plan.md) — ordered tasks

---

## 1. Goals and non-goals

### 1.1 V1 goal

Give every DSH session a shared, queryable environment context, and make the path from "agent knows the environment and service" to "the right Skill with the right parameters" explicit, deterministic and auditable.

### 1.2 V1 delivers

1. A DSH bundle with a Host half and a Client half.
2. File-based registry storage under the plugin data directory.
3. Manual management of environments, services, deployment bindings, rule profiles and operation bindings.
4. Layered rule resolution with provenance and validation.
5. Deterministic operation-to-Skill routing with conflict detection, availability checks and approval policy evaluation.
6. Read-only Agent tools usable from any session in the profile.
7. Session-scoped default environment.
8. A minimal Web/Desktop configuration UI; file editing remains a supported baseline.

### 1.3 V1 does not deliver

- SSH/SFTP, Docker, Kubernetes or browser execution adapters.
- Automatic deployment, rollback or self-healing.
- Automatic extraction of service facts from Git, Maven, Dockerfile or Helm.
- Automatic rule or Skill modification without review.
- A persistent memory store of its own.
- Guarantees that a derived path exists. Only an online check may mark a value verified.

---

## 2. Design principles

```text
Registry files are the source of truth.
Derived values are labelled as derived.
A Skill reference is discovery, not execution authorization.
Credentials are references; values never enter the registry or tool output.
Conflicts fail loudly; nothing is chosen silently.
Facts, derived values and verified observations are different things.
```

These principles are expanded into module rules in
[module-boundaries.md](./module-boundaries.md) and hard constraints in
[AGENTS.md](../../AGENTS.md) §3.

---

## 3. Architecture

```text
DSH Web / Desktop
  └── Client half (configuration panels, context preview)
          │  POST /env-manager/api
          ▼
DSH Host process
  ├── transport    header/origin checks, op dispatch
  ├── tools        thin request/response layer
  ├── app          shared use cases
  ├── storage      atomic YAML read/write
  ├── registry     validated per-request snapshot of storage
  ├── resolver     pure context + rule resolution
  ├── router       pure operation→Skill matching
  ├── session      per-session default environment
  └── memory-bridge  optional P1 contract
          │
          ▼
Plugin data directory
  ├── environments/  services/  deployments/  rules/  operations/
  └── sessions/
```

### 3.1 Host and Client split

- **Host** owns all business logic, validation and persistence.
- **Client** renders and calls the plugin HTTP API; it never reads registry files directly and never re-implements resolution.
- The Client plugin remains a plain JavaScript module in V1. The Host is TypeScript compiled to ESM (see [ADR-0004](./decisions/ADR-0004-typescript-host-js-client.md)).

### 3.2 Host service dependencies

These DSH services are verified in [api-verification.md](./api-verification.md):

| Service | Use |
|---|---|
| `ctx.tools` | register Agent tools (F2–F5) |
| `ctx.credentials` | `describe(ref)` for status only; `resolve` is never called (F8) |
| `ctx.approval` | request confirmation for management writes that affect production (F7) |
| `ctx.skills` | `snapshot()` for Skill availability; no digest (F20) |
| `ctx.webServer` | register the plugin HTTP route for the Client (F12) |
| `profileContext` | `dir` for the default data directory (F10) |
| Node `fs` | atomic writes and deletes under `dataDir`; `ctx.fs` lacks mkdir/unlink (F9) |

Skill availability degrades to `available: 'unknown'` with `SKILL_REGISTRY_UNAVAILABLE`
when the catalog is absent or incomplete, rather than silently passing.

---

## 4. Domain model

See [data-model.md](./data-model.md).

Key points that shape the design:

- **Co-location** is expressed with one Host and several roles, not several hosts.
- **Deployment bindings are many**: a service may run several times in one environment, so deployment ids are first-class.
- **Rule profiles are shared**; environment and deployment carry field-level overrides.
- **Operation bindings are predicates**, not a fixed matrix of every combination.

---

## 5. Storage

Full rules in [storage-contract.md](./storage-contract.md). Summary:

```text
<dataDir>/
├── environments/{id}.yaml
├── services/{id}.yaml
├── deployments/{id}.yaml
├── rules/{id}.yaml
├── operations/{id}.yaml
├── sessions/{sessionId}.json
└── .backups/{kind}/{id}/{timestamp}.yaml
```

- `<dataDir>` defaults to `<profile>/data/dsh-env-manager` and is configurable.
- Reads and writes go through the storage module; no other module touches files.
- Writes are atomic (temp file + fsync + rename) with a rolling backup.
- Invalid or unsupported records are skipped with a diagnostic, never deleted.
- V1 has no index files. A snapshot is loaded per application request and reloaded after a write.

---

## 6. Rule resolution

### 6.1 Template language

Only interpolation is supported:

```text
${name}
${name.path}
```

Rules:

- Identifier segments: `[A-Za-z_][A-Za-z0-9_]*`, separated by `.`.
- No function calls, operators, conditionals, environment variables or command substitution.
- No escaping. A lone `$` is literal; a malformed `${…}` (missing `}` or invalid
  identifier) is `RULE_TEMPLATE_INVALID`.
- Interpolation is allowed only in string-valued fields (`paths`, `logSources`, `classLocations`, binding parameters).

### 6.2 Available namespaces

```text
env.id, env.name, env.category
service.id, service.name, service.category
service.artifact.name
deployment.id, deployment.name, deployment.runtimeMode
deployment.location.*            (runtime-specific: see data-model §5)
<user variables from rule profiles and overrides>
paths.*                          (resolved path fields)
```

`env`, `service` and `deployment` are read-only. `paths` is itself resolved, so a path may reference another path.

### 6.3 Layers and precedence

From lowest to highest:

1. Built-in global defaults (empty in V1).
2. Service `ruleProfileRefs`, in list order; later profiles win on field conflicts.
3. Environment `ruleOverrides`.
4. Deployment `variables` (variables only), then deployment `ruleOverrides` (all field kinds; wins over `variables` for the same variable).

Merging is **field-level**, not whole-object replacement: overriding `paths.logDir` leaves `paths.jar` intact.

### 6.4 Resolution algorithm

```text
1. Collect ordered layers.
2. Merge variables, paths, logSources[per runtime], classLocations[per runtime]
   into a raw map, recording the winning source and the shadowed sources per field.
3. Build a dependency graph from ${...} references in raw string values.
4. Detect cycles (DFS with an active stack) and report RULE_CYCLE with the cycle path.
5. Reject references to unknown fields with RULE_UNDEFINED_VARIABLE.
6. Resolve in dependency order; each substitution is recorded as a provenance input.
7. Validate resolved paths: reject any `..` segment (RULE_PATH_TRAVERSAL).
8. Select the log source and class location for the deployment's runtimeMode.
9. Emit provenance for every field that was requested by the caller.
```

Resolution is pure: same inputs, same outputs, no I/O.

### 6.5 Which fields are resolved eagerly

`env_resolve` returns only the fields used by the runtime:

- all `paths` fields defined by any layer (bounded, typically under 20),
- the `logSources[runtimeMode]` entry,
- the `classLocations[runtimeMode]` entry,
- merged `variables`.

Only defined fields are evaluated; the resolver never guesses a missing path. A defined
template that references a name no layer defines is still `RULE_UNDEFINED_VARIABLE`.

### 6.6 Provenance semantics

For each returned field, the response includes:

- `definedBy` — the winning layer and, when applicable, the rule profile id.
- `inputs` — every referenced field with the layer that supplied it.
- `shadowed` — lower-priority definitions that were overridden.

This makes AC-04 explainable: overriding `paths.logDir` at the environment layer changes `paths.applicationLog` while its `definedBy` remains the service rule profile. Both facts are visible.

### 6.7 Log sources

Log sources are structured, not collapsed into a file path:

| Runtime | Source kind | Example fields |
|---|---|---|
| native | `file` | `path` |
| docker | `container-stdout` | `container` |
| kubernetes | `pod-logs` | `namespace`, `workload` |

### 6.8 Class locations

Three distinct kinds are preserved:

- `build-output` — e.g. `target/classes`
- `deployed-dir` — an exploded class directory on the host
- `jar-entry` — a jar path plus the class entry prefix

### 6.9 Worked example

Service `aicoservice` references `java-common`; environment `test-a` overrides `paths.logDir`; deployment `deploy-001` is Kubernetes.

```text
paths.serviceHome   /opt/company/services/aicoservice        service/java-common
paths.jar           /opt/company/services/aicoservice/lib/aicoservice.jar
                                                             (input: serviceHome)
paths.logDir        /data/logs/aicoservice                   environment (shadowed service)
paths.applicationLog /data/logs/aicoservice/aicoservice.log  service/java-common
                                                             (input: logDir → environment)
logSource           pod-logs dv-sop / aicoservice            service/java-common
```

The `applicationLog` value reflects the environment override even though its template was defined at the service layer.

---

## 7. Operation Skill routing

### 7.1 Match levels

Bindings are grouped by how specific their `match` predicate is:

| Level | Predicate | Priority |
|---|---|---|
| `deployment` | `match.deploymentId` set | 1 (highest) |
| `environment-service` | `match.environmentId` + `match.serviceId` | 2 |
| `service` | `match.serviceId` only | 3 |
| `category-mode` | `match.serviceCategory` + `match.deploymentMode` | 4 |
| `global` | empty match object | 5 (lowest) |

A predicate is eligible only if **every** field it declares matches the resolved context. `deploymentMode` compares against `runtimeMode`; `serviceCategory` compares against the service category.

A `match` that is not one of these five shapes (for example `environmentId` alone) is rejected at record validation; it never reaches routing.

### 7.2 Conflict rule

If more than one enabled binding is eligible at the highest level, the result is `BINDING_CONFLICT` listing every candidate id, level and skill name. No binding is selected.

If exactly one binding is eligible at the highest level, lower levels are ignored entirely, even if they also match.

### 7.3 Skill availability

Checks, in order, against `ctx.skills.snapshot({ scope, cwd, signal })`:

1. The catalog is complete; an incomplete snapshot means the check is inconclusive.
2. The Skill name is registered.
3. If `expectedSource` is set, the registered `source` matches.
4. If `expectedProvider` is set, the registered `provider` matches.

Outcomes:

- pass → `available: true`
- fail → `SKILL_UNAVAILABLE`, `ok: false`
- registry absent or incomplete → `available: 'unknown'` plus `SKILL_REGISTRY_UNAVAILABLE` warning, `ok: true` (routing still useful) but the caller is told the check was incomplete

Digest pinning is not supported: the DSH catalog exposes no digest. The router never
substitutes a different Skill.

### 7.4 Approval policy

Evaluation order:

1. Write operation and `policy.requiresApproval !== false` → `requiresApproval: true`.
2. `environmentCategory === 'production'` and `policy.allowProduction !== true` → `POLICY_DENIED`.
3. Otherwise the policy is returned as declared.

V1 does not execute the operation. The resolved policy is returned to the caller; enforcement happens in the executing Skill or in the future executor.

### 7.5 Parameter mapping

- Binding `parameters` values are templates resolved against the same namespaces as rules, plus `paths.*`.
- Result values must be `string`, `number` or `boolean`; numbers and booleans are stringified.
- Any unresolved reference or non-scalar value fails with `PARAMETER_RESOLUTION_FAILED`.
- Parameters are not a command line. They are structured inputs for the target Skill.

### 7.6 Worked example

```text
operation: redeploy
context:   test-a / aicoservice / deploy-001 (kubernetes)

eligible:
  binding-001  level=environment-service  skill=redeploy-k8s-service
selected: binding-001
parameters: namespace=dv-sop workload=aicoservice cluster=k8s-01
policy: requiresApproval=true allowProduction=false
skill: available=true
```

If `redeploy-k8s-service` is missing, the result is an error with `SKILL_UNAVAILABLE`; it does not fall through to `binding-002`.

---

## 8. Session context

- `env_set_context` writes `sessions/{sessionId}.json` with `defaultEnvironmentId`.
- Passing `null` clears the default.
- `env_get_context` returns the current session's default, if any.
- DSH exposes `sessionProjections`, but it requires declared session event types and a
  closed projection schema, so a standalone bundle cannot use it. V1 writes
  `sessions/{sessionId}.json`; a projection-based store is a later refinement
  (detailed-design §9).
- Session context is isolated: it cannot modify registry files or another session's default.

Tools that need an environment accept an explicit `environmentId`. When omitted, they fall back to the session default and otherwise return a validation error naming both options.

---

## 9. Tool surface

Full schemas in [tool-contract.md](./tool-contract.md); the `defineTool` definitions
are specified in [detailed-design.md](./detailed-design.md) §11.

Every tool is registered with `defineTool`:

```ts
ctx.tools.register(defineTool({
  name: 'env_list',
  description: '...',
  parameters: { kind: { type: 'string', enum: [...] } },
  output: { schema: { ... }, render: (args, value) => [{ type: 'text', text: '...' }] },
  async execute(args, exec) { /* returns the declared JSON value */ },
}))
```

Read tools:

```text
env_list, env_get, env_find, env_resolve, env_resolve_operation,
env_get_context, env_set_context
```

Management tools (state-changing):

```text
env_save, env_delete, env_validate
```

Results:

- Success returns the declared JSON value, validated by DSH against
  `output.schema`.
- Expected failures throw `EnvManagerError extends HarnessError`, which carries a
  stable `code` (`ENV_NOT_FOUND`, `BINDING_CONFLICT`, `POLICY_DENIED`, …) and a
  message safe to show. There is no `{ ok: false }` value.
- `env_delete` and production `env_save` ask `ctx.approval`; any outcome other than
  `allowed-once` denies.
- Errors never include credential values, file contents or stack traces.

---

## 10. Client UI

### 10.1 V1 baseline

Configuration is possible without the UI:

- edit YAML files under `dataDir` directly;
- call `env_validate` to check the registry;
- call `env_resolve` / `env_resolve_operation` to inspect behavior.

### 10.2 V1 UI

A dedicated Environment Manager surface in the DSH Web/Desktop client, registered as a
`sidebar.panellist` entry (id `env-manager`) plus the `main` panel keyed
`env-manager`:

| Section | Content |
|---|---|
| Overview | counts, dataDir, warnings, validate |
| Environments | list, detail (basic info, hosts/accounts, login records, endpoints), create/edit YAML |
| Services | list, create/edit YAML, Git/artifact/rule refs |
| Deployments | list, create/edit YAML, runtime-specific fields |
| Rule profiles | YAML editor |
| Operation bindings | YAML editor with match preview and conflict warning |
| Context preview | pick environment + service (+ deployment) and inspect the Service Context |
| Operation preview | operation → selected binding, skill availability, policy, parameters |

Rules for the UI:

- All reads/writes go through the plugin's same-origin HTTP API
  (`POST /env-manager/api`, ADR-0009); no direct file access and no second business
  path.
- The UI cannot read or write session context in V1; that stays with the agent tools.
- Records are edited as YAML in V1, validated server-side before writing.
- Text is routed through the client locale service; `en` and `zh` provided.
- The UI must show provenance for derived values, not just the final string.
- Production-category destructive actions are visually distinct and require
  confirmation.

Details: [ui-design.md](./ui-design.md). The implemented `client.js` registers the
sidebar entry and the `main` panel; the panel is the configuration surface described
above.

---

## 11. Memory bridge (P1 boundary)

V1 defines the contract and ships a null adapter:

```ts
interface MemoryBridge {
  emitOperationRecord(record: OperationRecord): Promise<void>;
  queryMemory(scope: MemoryScope): Promise<MemoryQueryResult[]>;
  proposeChange(proposal: RuleOrSkillProposal): Promise<{ id: string }>;
}
```

- Null adapter returns `MEMORY_BRIDGE_UNAVAILABLE` as a warning; it never throws into a tool.
- `EvidenceRef` values are opaque strings, sanitized before emission.
- The bridge never writes registry files and never applies proposals.
- P1 wires the adapter to the memory plugin's public contract once that contract is verified.

---

## 12. Security

Summary; details in [security-model.md](./security-model.md).

- `credentialRef` only; status via `ctx.credentials.describe`, never `resolve`.
- Production write operations denied unless `allowProduction: true`.
- Tool management writes affecting production records require `ctx.approval`.
- UI writes run as actor `'ui'` and are denied for production unless
  `writePolicy.allowUiProductionWrites` is enabled.
- The `/env-manager/api` route requires a custom header and a same-origin `Origin`;
  no CORS headers are sent.
- Rule resolution rejects cycles, undefined variables and path traversal.
- Diagnostics and logs must be redacted before emission.
- Fail closed on conflicts, missing Skills and broken references.

---

## 13. Error handling

- Tool failures throw `EnvManagerError extends HarnessError`; DSH records the stable
  `{ name, code }` and shows the message. A bare string is never thrown.
- HTTP failures return `{ ok: false, error: { code, message, details? } }` with a
  status from [detailed-design.md](./detailed-design.md) §12.2.
- Registry load failures produce diagnostics and keep serving the records that are valid.
- Resolution failures name the field and the offending variable.
- Router failures list candidate bindings.
- All error paths are covered by tests listed in
  [verification-policy.md](../02-harness/verification-policy.md).

---

## 14. Acceptance criteria

| ID | Scenario | V1 | Verification |
|---|---|---|---|
| AC-01 | One host carries management + business roles with no duplicate host entry | yes | `env_save` validation test |
| AC-02 | K8s cluster/workload and Docker instance are queryable through deployment bindings | yes | resolver test |
| AC-03 | Service with Git URL and artifact is visible to a second session | yes | registry reload test |
| AC-04 | Java common rules plus environment override compute paths with provenance | yes | resolver + provenance test |
| AC-05 | `env_resolve_operation` returns the bound Skill and mapped parameters for test-a redeploy | yes | router test |
| AC-06 | Two same-level bindings produce a conflict error | yes | router conflict test |
| AC-07 | Two sessions share data but keep different defaults | yes | session store test |
| AC-08 | Credential query returns ref, configured and source only | yes | tool output test |
| AC-09 | A completed log check stores a sanitized summary and evidence refs | P1 | memory bridge contract test |
| AC-10 | A rule change derived from experience becomes a pending proposal | P1 | proposal queue test |
| AC-11 | Environment detail shows host accounts with protocol/auth/last-login source, without secret values | yes | app test + UI checklist |
| AC-12 | Login records are stored in the environment YAML, reference existing hosts/accounts and render newest-first | yes | app integrity test + UI checklist |

---

## 15. Build and packaging

### 15.1 Host

- TypeScript sources in `src/`.
- `tsconfig.json`: `target ES2022`, `module NodeNext`, `strict`, `outDir lib`.
- `npm run build` → `tsc -p tsconfig.json`.
- `package.json` exports `.` → `./index.js`; `index.js` is a shim that re-exports `./lib/index.js`.

### 15.2 Client

- Plain JavaScript `client.js` at the repository root, in the DSH module-loader format.
- No build step in V1; no JSX. Components use `React.createElement`.
- If the UI later requires TypeScript or JSX, a client bundling step is added with its own ADR.

### 15.3 Bundle layout

```text
dsh-env-manager/
├── index.js              # host entry shim: export * from './lib/index.js'
├── client.js             # client module
├── cordis.patch.yml
├── package.json
├── tsconfig.json
├── src/                  # TypeScript host sources
├── lib/                  # build output (git-ignored)
├── locale/
├── icon.svg
├── docs/
└── tests/
```

`files` in `package.json` includes `index.js`, `lib/`, `client.js`, `cordis.patch.yml`, `locale/`, `icon.svg`, `README.md`, `LICENSE`.

Manifest contract:

- `dsh.bundle.patch: ./cordis.patch.yml` registers the Host plugin.
- `dsh.client: { platform: 'web', immediately: true }` loads the Client half in Web and
  Desktop. It declares no `inject` dependency on a conversation UI package, because the
  panel lives in the shell's sidebar/main slots, not the composer dock.

### 15.4 Dependencies

| Package | Purpose | Scope |
|---|---|---|
| `zod` | record validation | runtime |
| `yaml` | YAML parse/serialize | runtime |
| `@deepseek-ai/schemastery` | `Config` schema | runtime |
| `@deepseek-ai/dsh-tools` | `defineTool`, tool types | peer |
| `@deepseek-ai/dsh-llm` | `HarnessError` | peer |
| `@deepseek-ai/cordis` | `Context` type (type-only) | peer, provided by the Host |
| `typescript` | build | dev |
| `vitest` | tests | dev |

Peer packages are provided by the DSH profile; the plugin must not bundle them.
Version alignment is pinned to the runtime release (`0.2.1-rc.5` at design time) and
checked during T01. Adding any other dependency follows
`docs/04-development/dependency-policy.md`.

---

## 16. Open questions

The eight integration questions from the first draft are resolved in
[api-verification.md](./api-verification.md):

| # | Question | Resolution |
|---|---|---|
| 1 | Plugin data directory | `profileContext.dir` → `<dir>/data/dsh-env-manager` (F10) |
| 2 | `ctx.fs` for data paths | unusable for create/delete; use Node fs under `dataDir` (F9) |
| 3 | Skill registry API | `ctx.skills.snapshot`; source/provider checks, no digest (F20) |
| 4 | Durable session metadata | V1 file store; projection is a later refinement (F11) |
| 5 | Client slot for a panel | `sidebar.panellist` + `main` keyed `env-manager` (F15) |
| 6 | Client→Host calls | plugin-owned HTTP route, ADR-0009 (F14) |
| 7 | Memory plugin contract | still owned by the memory plugin; null adapter until P1 |
| 8 | `credentials.describe` coverage | presence/source/writability, no value (F8) |

Remaining, none blocking V1:

- The memory plugin's public contract (P1).
- Cross-process write locking for a shared `dataDir`.
- A session-event projection instead of the session file.
- Client bundling if the UI outgrows a single plain-JS module.

---

## 17. Traceability to the brainstorm

| Brainstorm | Design section |
|---|---|
| §3.1 environment types and co-location | §4, data-model §3 |
| §3.2 common operations | §7, data-model §7 |
| §3.3 ideal interaction | §7, §9 |
| §4.1 environment registry | data-model §3 |
| §4.2 service catalog | data-model §4 |
| §4.3 deployment binding | data-model §5 |
| §4.4 rule catalog / resolver | §6, data-model §6 |
| §5 operation skill registry | §7, data-model §7 |
| §6 session context | §8 |
| §7 memory bridge | §11 |
| §8 security and governance | §12, security-model |
| §9 P0 scope | §1 |
| §10 module split | module-boundaries |
| §11 acceptance scenarios | §14 |
| §12 open questions | §16 |
