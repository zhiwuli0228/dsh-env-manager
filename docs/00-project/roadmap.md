# Roadmap

Aligned with the brainstorm (§9) and V1 design.

## V0 — Design (complete)

- [x] Brainstorm captured
- [x] Repository and docs hub initialized
- [x] V1 design suite written
- [x] DSH runtime APIs verified (probes V1–V8 remain, tracked in `api-verification.md`)

## V1 = P0: Registry and Context Resolution (complete; Phase 1 + 1.1 plane/K8s model live)

Goal: a working plugin that any session can query, with deterministic routing.

Implemented: Host modules, ten tools, HTTP API, panel, 48 tests, profile install. Phase 1
adds the environment/plane model (ADR-0010): shell-only environment creation, role-filtered
plane tabs, multi-role node add/edit, batch import, search and mandatory roles. Phase 1.1
adds K8s/Pod node classification and command surfaces (ADR-0011): `Host.kind`,
`Host.access`, `Host.clusterRef`, `Cluster.topology` and a Kubernetes/clusters tab. Account
web login URLs and password-to-credential account editing are also implemented.
Remaining: probes V4/V6, light-theme QA, row-level delete and private-key rotation.

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

## Phase 1.1: K8s node and execution model (complete)

- `Host.kind`: `vm`, `physical`, `k8s-all-in-one`, `k8s-worker`, `pod-host`.
- `Host.access`: `ssh`, `kubectl`, `docker`; metadata only, not authorization.
- `Host.clusterRef` for Kubernetes and Pod-hosting machines; required for K8s node kinds.
- `Cluster.topology`: `all-in-one`, `separate`, `external`.
- Node form kind/cluster/access controls, node badges/search and a Kubernetes/clusters tab.
- Pods stay in the deployment model; `pod-host` models the machine reached by `docker exec`.
- Account-level web login URL, password-to-credential bridge and in-place account edit.

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

## Phase 2: Topology depth

- Database primary/replica/sharding metadata on top of the `database` role, without
  duplicating `hosts[]`.
- Row-level delete for nodes, accounts and login records.
- Credential rotation and optional key/passphrase input.
- Optional JumpServer/PAM import for accounts and login observations.

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
