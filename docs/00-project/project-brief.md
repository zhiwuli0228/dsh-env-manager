# Project Brief

## Project Name

DSH Environment Manager (`dsh-env-manager`)

## Positioning

A DSH (DeepSeek Harness) plugin that gives every session a shared, queryable view of enterprise environments, services, deployments and operation-to-skill bindings.

It turns scattered environment facts, service metadata and deployment knowledge into a structured context that Agent tools and UI components can consume.

## Core Value

The project turns:

```text
scattered environment facts + ad-hoc SSH notes + tribal deployment knowledge
```

into:

```text
structured environment registry + service catalog + deployment bindings
+ resolvable rules + deterministic skill routing + reusable operation memory
```

## Primary Users

- Platform / DevOps engineers
- SREs and operations staff
- Backend developers deploying to shared environments
- AI-assisted development users running DSH sessions

## Main Workflows

### Workflow 1: Resolve Environment Context

```text
Agent asks: "Where does aicoservice run in test-a?"
→ Query environment registry
→ Query service catalog
→ Match deployment binding
→ Resolve layered rules
→ Return structured Service Context
```

### Workflow 2: Route Operation to Skill

```text
Agent asks: "Redeploy aicoservice in test-a"
→ Resolve service context
→ Match operation binding by scope
→ Verify skill availability and approval policy
→ Return skill reference and mapped parameters
```

### Workflow 3: Query Historical Memory

```text
Agent asks: "Have we seen this failure in test-a before?"
→ Build memory scope from environment/service/deployment
→ Query memory bridge for observations and playbooks
→ Return relevant, scoped historical knowledge
```

### Workflow 4: Record Operation Event

```text
Operation completes
→ Record structured Operation Record
→ Capture evidence references (sanitized)
→ Generate candidate knowledge or rule change proposal
→ Push to review queue (do not auto-apply)
```

## Core Principles

- **File-based source of truth**: registry, rules and bindings live in durable files.
- **Credentials are references, not values**: secrets are stored outside this plugin.
- **Deterministic routing**: operation-to-skill matching is explicit, conflict-aware and auditable.
- **Safe defaults**: write operations and production access require explicit approval.
- **Memory bridge, not memory owner**: historical knowledge stays in the memory plugin; this plugin provides scoped references.

## Non-goals

- Not a CMDB replacement.
- Not a secret vault or credential manager.
- Not a remote execution engine by itself.
- Not an unsupervised self-modifying rule system.
