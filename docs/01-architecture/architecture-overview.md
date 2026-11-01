# Architecture Overview

## Layers

```text
DSH Web/Desktop UI
  ↓
Client plugin (configuration panels, composer decoration)
  ↓
Host plugin (tools, services, storage)
  ↓
File-based registry and rules
```

## Major Components

### Client Layer

Rendered inside the DSH Web/Desktop interface.

Responsibilities:

- Environment / service / deployment configuration UI
- Rule profile editor with live preview
- Operation binding editor
- Context preview panel

### Host Layer

Runs in the DSH Node.js host process.

Responsibilities:

- Register Agent tools (`env_list`, `env_get`, `env_find`, `env_resolve`, `env_resolve_operation`)
- Provide shared services to all sessions in the profile
- Persist registry and rules to disk
- Enforce security and approval policies

### Registry Layer

File-based durable storage for:

- Environment registry
- Service catalog
- Deployment bindings
- Rule profiles
- Operation bindings

### Resolver Layer

Pure functions that combine registry data into structured outputs.

Responsibilities:

- Context resolution
- Rule resolution with provenance
- Operation skill matching and conflict detection

### Memory Bridge

Optional integration with the memory plugin.

Responsibilities:

- Emit operation records
- Query historical observations and playbooks
- Propose rule/skill changes for review

## Cross-cutting Concerns

- Credential references only; no plain-text secrets
- Deterministic, auditable skill routing
- Atomic file writes where practical
- Testable pure functions for resolvers
- File-based contracts
