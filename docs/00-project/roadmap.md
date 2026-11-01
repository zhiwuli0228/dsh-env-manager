# Roadmap

## V0.1: Registry and Context Resolution

Goal: Provide a working file-based registry and basic context resolution.

Scope:

- JSON/YAML schemas for environment, service, deployment binding, rule profile, operation binding
- File-based storage layer
- `env_list`, `env_get`, `env_find` tools
- Service catalog read tools
- Deployment binding lookup
- Basic rule resolver with provenance tracking
- Context resolver returning Service Context
- Unit tests for resolver and storage

## V0.2: Operation Skill Router

Scope:

- `env_resolve_operation` tool
- Match priority and conflict detection
- Skill availability check
- Approval policy evaluation
- Parameter mapping to skill inputs
- Unit tests for router and conflict detection

## V0.3: Web/Desktop Configuration UI

Scope:

- Host configuration panel for environments, services, deployments
- Rule profile editor with preview
- Operation binding editor
- Context preview panel
- Basic validation and error display

## V0.4: Memory Bridge and Operation Records

Scope:

- Operation Record schema and emission
- Memory bridge contract with memory plugin
- Historical observation and playbook lookup
- Candidate rule/skill change proposals
- Review queue (non-auto-apply)

## V0.5: Optional Remote Adapters (Future)

Scope:

- SSH/SFTP host adapter
- Kubernetes remote adapter
- Docker remote adapter
- Log and evidence collection helpers
