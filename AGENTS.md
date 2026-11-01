# AGENTS.md

This file defines the project-level rules for AI agents working on **DSH Environment Manager** (`dsh-env-manager`).

This project uses a project-level harness. Agents must follow this file and the documentation under `docs/`.

---

## 1. Project Identity

DSH Environment Manager is a DSH (DeepSeek Harness) plugin that gives every session a shared, queryable view of enterprise environments, services, deployments and operation-to-skill bindings.

It helps users:

1. Register environments, hosts, clusters and logical roles.
2. Maintain a service catalog with Git URLs, artifacts and rule references.
3. Describe deployment bindings across `native`, `docker` and `kubernetes` runtimes.
4. Resolve layered path/log/config rules with provenance.
5. Route an operation (deploy, redeploy, restart, collect-logs, ...) to an explicitly bound Skill.
6. Query and emit operation records through an optional memory bridge.

DSH Environment Manager is **not**:

- A CMDB replacement.
- A secret vault or credential manager.
- A remote execution engine by itself.
- An unsupervised self-modifying rule system.
- A mandatory database-backed platform.

---

## 2. Required Reading Order

Before implementing any non-trivial change, read:

1. `AGENTS.md` (this file)
2. `docs/README.md`
3. `docs/00-project/project-brief.md`
4. `docs/00-project/current-state.md`
5. `docs/02-harness/harness-standard.md`
6. `docs/04-development/development-guide.md`

For architecture changes, also read:

1. `docs/01-architecture/design.md`
2. `docs/01-architecture/module-boundaries.md`
3. `docs/01-architecture/storage-contract.md`

For OpenSpec work, also read:

1. `docs/03-openspec/proposal-rule.md`
2. `docs/03-openspec/design-rule.md`
3. `docs/03-openspec/spec-rule.md`
4. `docs/03-openspec/tasks-rule.md`

For resolver / rule work, also read:

1. `docs/01-architecture/module-boundaries.md`
2. `docs/05-domain/rule-template.md`
3. `docs/05-domain/environment-template.md`
4. `docs/05-domain/service-template.md`
5. `docs/05-domain/deployment-template.md`

For router / skill binding work, also read:

1. `docs/05-domain/operation-binding-template.md`
2. `docs/01-architecture/design.md`

For memory bridge work, also read:

1. `docs/05-domain/operation-record-template.md`
2. `docs/06-operations/security-policy.md`

For deployment or operations work, also read:

1. `docs/06-operations/deployment-guide.md`
2. `docs/06-operations/security-policy.md`
3. `docs/06-operations/troubleshooting.md`

---

## 3. Hard Constraints

These constraints take precedence over generated OpenSpec artifacts and any agent preference.

### 3.1 No Mandatory Database

Do not introduce mandatory external databases.

Do not add mandatory dependencies on any required infrastructure service.

Allowed storage formats:

- YAML
- JSON
- JSONL
- Markdown
- plain text
- local rebuildable indexes

Optional local indexes are allowed only when explicitly documented and disabled by default.

### 3.2 File System Is the Source of Truth

Durable registry data must be stored as files under the plugin workspace.

Environment, service, deployment, rule and operation records must be represented as YAML files.

Indexes are rebuildable caches, not durable truth.

### 3.3 Credentials Are References, Never Values

Registry files must contain only `credentialRef` values.

Never store passwords, SSH private keys, kubeconfig tokens or other secrets in this repository or in registry files.

Credential values must live in a separate vault or DSH credential store.

Tool results must never return credential values to the model.

### 3.4 No Arbitrary Code Execution in Rules

Rule templates must not execute arbitrary JavaScript, shell or other code.

Template resolution must:

- support variable interpolation only;
- detect and reject variable cycles;
- reject undefined variables;
- return provenance for every resolved value.

### 3.5 No Auto-Apply of Production Changes

Rule or Skill changes derived from runtime observations must be proposed for review.

They must never be applied automatically, especially for production environments.

The review queue is the only path from a candidate proposal to an accepted change.

### 3.6 Skill Routing Is Deterministic

Operation-to-Skill matching must be explicit and deterministic.

The same context must always resolve to the same Skill.

Same-level conflicts must be reported as errors; they must not be resolved randomly or silently.

A Skill reference is discovery information, not execution authorization.

### 3.7 Safe Defaults

- Production write operations require explicit approval by default.
- Unknown or missing data must fail safely, not fall back to a risky alternative.
- Do not silently substitute one Skill for another.

---

## 4. Expected Technology Stack

Use:

- Node.js (matching the DSH runtime)
- ES modules (`import` / `export`)
- Plain JavaScript for the current skeleton
- YAML for registry records
- JSON for structured indexes where needed
- DSH plugin bundle format (`package.json` + `cordis.patch.yml`)
- Vitest or the Node.js built-in test runner

Optional, only when justified:

- TypeScript, after a documented migration proposal
- Zod or a similar validator for schema checking

Avoid heavy infrastructure and unnecessary runtime dependencies.

---

## 5. Recommended Project Structure

```text
dsh-env-manager/
├── AGENTS.md
├── docs/
│   ├── README.md
│   ├── 00-project/
│   ├── 01-architecture/
│   ├── 02-harness/
│   ├── 03-openspec/
│   ├── 04-development/
│   ├── 05-domain/
│   ├── 06-operations/
│   ├── 07-templates/
│   └── 99-archive/
├── index.js              # Host plugin entry
├── client.js             # Client plugin entry
├── cordis.patch.yml      # Cordis bundle patch
├── package.json          # Bundle manifest
├── locale/
│   ├── en.json
│   └── zh.json
├── icon.svg
├── data/                 # Runtime registry data (not committed)
└── tests/
```

Do not create alternate structures without documenting the change.

---

## 6. Module Boundaries

### 6.1 `tools`

DSH Tool function layer only.

Allowed:

- Request validation
- Response formatting
- Calling resolver/router functions
- Emitting operation records

Forbidden:

- Direct file I/O
- Rule resolution logic
- Skill matching logic
- Credential resolution

### 6.2 `storage`

Registry persistence.

Responsibilities:

- Read/write environment records
- Read/write service records
- Read/write deployment binding records
- Read/write rule profile records
- Read/write operation binding records
- Atomic writes and schema validation

Must not:

- Interpret rules
- Resolve skill bindings
- Touch credential values

### 6.3 `registry`

In-memory registry built from storage.

Responsibilities:

- Load and cache registry files
- Lookup by id/name
- Validate uniqueness and referential integrity
- Expose query interfaces

Must not:

- Perform I/O directly (use `storage`)
- Run rule templates

### 6.4 `resolver`

Pure functions for context and rule resolution.

Responsibilities:

- Build Service Context
- Resolve layered rules with provenance
- Validate variable definitions and detect cycles
- Return structured, safe output

Must not:

- Read files directly
- Access credentials
- Register tools

### 6.5 `router`

Pure functions for operation-to-Skill routing.

Responsibilities:

- Match operation bindings by scope and priority
- Detect conflicts
- Verify skill references
- Map parameters
- Evaluate approval policies

Must not:

- Execute Skills
- Access credential values
- Write operation records directly

### 6.6 `memory-bridge`

Optional integration with the memory plugin.

Responsibilities:

- Emit Operation Records
- Query observations and playbooks by scope
- Generate candidate proposals

Must not:

- Store environment facts
- Modify registry files
- Auto-apply proposals

### 6.7 `client`

Web/Desktop UI.

Responsibilities:

- Configuration panels
- Rule preview
- Context preview

Must not:

- Contain business logic that belongs in `resolver` or `router`
- Access storage directly

---

## 7. Storage Contracts

### 7.1 Registry Layout

```text
data/
├── environments/{environmentId}.yaml
├── services/{serviceId}.yaml
├── deployments/{deploymentId}.yaml
├── rules/{ruleProfileId}.yaml
└── operations/{bindingId}.yaml
```

### 7.2 Required Fields

Every record must contain:

```yaml
id: string
schemaVersion: 1
createdAt: ISO-8601 timestamp
updatedAt: ISO-8601 timestamp
```

### 7.3 Atomicity

Writes must be atomic (write temp file + rename).

Reads must tolerate missing files and skip invalid records with a warning.

### 7.4 Referential Integrity

- Deployment bindings must reference existing environments and services.
- Operation bindings must reference an existing environment/service scope when specified.
- Broken references must be reported, not silently ignored.

---

## 8. Context Resolution Rules

- Resolution order: deployment-level overrides, then environment-level, then service-level, then global.
- Every resolved field must carry provenance.
- Distinguish:
  - facts declared in configuration;
  - values derived from rules;
  - observations verified at runtime.
- Do not claim a derived path exists unless it was verified.

---

## 9. Rule Template Rules

Allowed syntax:

```text
${varName}
${paths.somePath}
${service.name}
${deployment.location.namespace}
```

Forbidden:

- Arbitrary JavaScript or shell snippets.
- Environment variable access unless explicitly whitelisted.
- Command substitution.
- Unbounded recursion.

Validation must detect:

- undefined variables;
- cyclic references;
- dangerous path traversal (`..`) in resolved paths.

---

## 10. Operation Skill Router Rules

Match priority:

1. deployment instance level
2. environment + service level
3. service level
4. service category + deployment mode level
5. global default

Rules:

- Same-level conflicts must raise an explicit error.
- A missing or unavailable Skill must return a clear diagnostic.
- Never silently switch to another Skill that would change the environment.
- `requiresApproval` defaults to `true` for write operations.
- `allowProduction` defaults to `false`.

---

## 11. Memory Bridge Rules

- Operation Records are the durable history of what happened.
- Evidence references must be sanitized before persistence.
- Memory must not store a second copy of environment facts; reference registry ids instead.
- Candidate knowledge or rule changes must enter a review queue.
- Nothing in the memory bridge may auto-modify registry files.

---

## 12. Coding Rules

Use modern JavaScript.

General rules:

- Use ES modules.
- Prefer `const`.
- Keep modules small and focused.
- Prefer explicit data models over loose objects.
- Avoid global mutable state.
- Do not swallow exceptions silently.
- Return safe error messages to the UI.
- Keep resolver and router logic pure and testable.
- Keep tool functions thin.
- Handle unexpected YAML gracefully.
- Do not make network calls unless explicitly required.

---

## 13. Testing Rules

Required tests for relevant changes:

### `storage`

- Atomic write/read
- Missing file handling
- Invalid YAML handling
- Schema version mismatch

### `registry`

- Load and lookup
- Duplicate id detection
- Broken reference detection

### `resolver`

- Full context resolution
- Missing optional data
- Rule override precedence
- Variable cycle detection
- Undefined variable handling
- Path traversal rejection

### `router`

- Exact match
- Priority fallback
- Conflict detection
- Missing Skill failure
- Approval policy evaluation

### `tools`

- Success response
- Invalid id response
- Safe error response

Test fixtures should be small and stored under:

```text
tests/fixtures/
```

---

## 14. OpenSpec Rules

For every OpenSpec change:

1. Read `AGENTS.md`.
2. Read `docs/README.md`.
3. Read `docs/00-project/project-brief.md`.
4. Read `docs/00-project/current-state.md`.
5. Read the relevant rule file under `docs/03-openspec/`.

Project-level constraints take precedence over generated artifacts in this order:

1. `AGENTS.md`
2. `docs/02-harness/*`
3. `docs/01-architecture/*`
4. Generated OpenSpec artifacts

---

## 15. Recommended Development Flow

For non-trivial features:

```text
read context
→ propose small plan
→ review proposal/design/spec/tasks
→ implement
→ tests
→ update docs/00-project/current-state.md
→ archive completed OpenSpec artifacts
```

For small bug fixes:

1. Reproduce.
2. Identify root cause.
3. Fix minimally.
4. Add regression test.
5. Update `current-state.md` if needed.

Do not create oversized OpenSpec changes for trivial bugs.

---

## 16. Standard Commands

Validate JavaScript syntax:

```bash
node --check index.js
node --check client.js
```

Run tests:

```bash
npm test
```

Install as a local DSH bundle:

```bash
dsh plugin_manager install_bundle --target .
```

List installed bundles:

```bash
dsh plugin_manager list_bundles
```

Remove the bundle:

```bash
dsh plugin_manager remove_bundle --target dsh-env-manager
```

---

## 17. Required Finalization for Every Change

Before considering work complete:

- [ ] Code is implemented.
- [ ] Tests are added or updated.
- [ ] Storage contract changes are documented.
- [ ] Relevant docs are updated.
- [ ] `docs/00-project/current-state.md` is updated.
- [ ] No plain-text credentials were introduced.
- [ ] No arbitrary code execution was introduced in rule templates.
- [ ] No production auto-apply path was introduced.
- [ ] File-system-as-source-of-truth remains preserved.
