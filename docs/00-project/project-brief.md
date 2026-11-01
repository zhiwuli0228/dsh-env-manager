# Project Brief

## Project Name

DSH Environment Manager (`dsh-env-manager`)

## Positioning

A DSH (DeepSeek Harness) plugin that gives every session a shared, queryable context of enterprise environments, services, deployments, rules and operation-to-Skill bindings.

It is the "where do I work, what am I touching, which rules apply, which Skill runs it, what have we learned" layer for operational Agents.

## Core Value

The project turns:

```text
scattered environment facts + ad-hoc SSH notes + tribal deployment knowledge
```

into:

```text
structured environment registry + service catalog + deployment bindings
+ resolvable rules with provenance + deterministic Skill routing
+ scoped memory references
```

## Primary Users

- Platform and DevOps engineers
- SREs and operations staff
- Backend developers deploying to shared environments
- AI-assisted development users running DSH sessions

## Main Workflows

### Workflow 1: Resolve Environment Context

```text
Agent asks: "Where does aicoservice run in test-a?"
→ look up environment and service
→ match the deployment binding
→ resolve layered rules
→ return a Service Context with provenance
```

### Workflow 2: Route an Operation to a Skill

```text
Agent asks: "Redeploy aicoservice in test-a"
→ resolve the Service Context
→ match operation bindings by scope
→ detect conflicts
→ check Skill availability
→ return the Skill reference and mapped parameters with policy
```

### Workflow 3: Configure the Registry

```text
Engineer adds environment, hosts, clusters and roles
→ adds services with Git URLs and artifacts
→ adds deployment bindings
→ adds rule profiles and overrides
→ previews resolved paths and bindings
```

### Workflow 4: Accumulate Experience (P1)

```text
Operation completes
→ emit a redacted operation record
→ query prior observations for the same scope
→ propose a rule or Skill change for review
→ never auto-apply
```

## Core Principles

- File-based registry is the source of truth.
- Credentials are references; values live elsewhere.
- Skill routing is explicit, deterministic and conflict-aware.
- Derived values are labelled as derived; only checks can mark them verified.
- Conflicting or missing data fails loudly.
- Memory stores the lesson; this plugin stores the context.

## V1 Scope

Delivered:

1. DSH bundle with Host and Client halves.
2. File-based registry for environments, services, deployments, rules and operation bindings.
3. Manual configuration through tools and a minimal Web/Desktop UI.
4. Layered rule resolution with provenance.
5. Deterministic operation-to-Skill routing with availability and policy checks.
6. Read-only tools usable from every session.
7. Session-scoped default environment.

Deferred:

- Remote execution adapters (SSH, Docker, Kubernetes).
- Automatic deployment or rollback.
- Automatic fact extraction from repositories or manifests.
- Memory bridge implementation (contract only in V1).
- Automatic rule or Skill evolution.

## Non-goals

- Not a CMDB replacement.
- Not a secret vault.
- Not a remote execution engine.
- Not an unsupervised self-modifying rule system.
- Not a database-backed platform.
