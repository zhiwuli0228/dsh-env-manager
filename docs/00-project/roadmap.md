# Roadmap

Aligned with the brainstorm (§9) and V1 design.

## V0 — Design (complete)

- [x] Brainstorm captured
- [x] Repository and docs hub initialized
- [x] V1 design suite written
- [x] DSH runtime APIs verified (probes V1–V8 remain, tracked in `api-verification.md`)

## V1 = P0: Registry and Context Resolution

Goal: a working plugin that any session can query, with deterministic routing.

Scope:

1. TypeScript Host scaffold and build.
2. Local shared persistence (YAML files).
3. Manual configuration of environments, hosts, clusters, roles and co-location.
4. Manual service catalog with Git URLs and artifacts.
5. Deployment bindings for native, Docker and Kubernetes.
6. Rule profiles with layered overrides and provenance.
7. Operation bindings with scoped routing, conflict detection and availability checks.
8. Read-only tools for all sessions.
9. Session-scoped default environment.
10. Minimal Web/Desktop configuration UI with context preview.

Acceptance: AC-01 … AC-08 in `docs/01-architecture/design.md` §14.

## P1: Minimal Experience Loop

Goal: turn operations into reusable, reviewed knowledge.

Scope:

1. Stable contract with the memory plugin.
2. Memory queries scoped by environment/service/deployment.
3. Operation Records and sanitized Evidence References.
4. Candidate knowledge generation.
5. Rule and Skill improvement proposals in a review queue.
6. Reliable session-default persistence and recovery.

Acceptance: AC-09, AC-10.

## V1.1 / V2: Continuous Evolution

- SSH/SFTP adapter.
- Docker and Kubernetes remote adapters.
- Log and evidence collection helpers.
- Automatic operation event capture and log redaction.
- Fact extraction from Git, Maven, Dockerfile and Helm.
- Proposal impact analysis, regression checks, publish and rollback.
- Automatic asset discovery and multi-instance sync.
- Multi-user collaboration and richer authorization.

## Explicitly Not Committed

- Fully automatic deployment or self-healing.
- Unreviewed production rule or Skill changes.
- Audit coverage of every external SSH/browser action.
- Configuration inference replacing real checks.
- Building a bastion host, CMDB or scheduling platform.
