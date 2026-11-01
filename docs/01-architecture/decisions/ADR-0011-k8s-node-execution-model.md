# ADR-0011: Model Kubernetes nodes and Pod hosts as machines with command surfaces

- **Status:** Accepted
- **Date:** 2026-11-01
- **Related:** ADR-0010 (environment plane model), ADR-0006 (credentials as references)

## Context

Operators use three Kubernetes-adjacent deployment shapes in the same business:

1. **K8s all-in-one.** The control plane and a worker run on the same machine. Operators
   can run `kubectl` there and, when the runtime is Docker, may also use `docker`.
2. **K8s + Pod hosts.** A Kubernetes cluster exists, but business Pods run on separate
   machines. Our team operates those machines with `docker exec`, not by treating each Pod
   as an inventory node. Other departments use standard worker nodes in the same cluster.
3. **Generic machines.** VMs and physical machines that are not Kubernetes nodes.

The Phase 1 environment model had only generic `Host` records. It could store an IP and a
role, but it could not say whether a node is an all-in-one control plane, a worker, or a
Pod-hosting machine, nor whether operators reach it with SSH, `kubectl`, or `docker`.
Adding a new logical plane was the wrong fix: a node's Kubernetes role is a property of the
machine and its runtime, while planes remain management/business/database/extension views.

## Decision

1. **A node is a machine, not a Pod.** `Host` represents a VM, physical machine, Kubernetes
   node or Pod-hosting machine. A Pod is a workload; it stays in the deployment model
   (`location.kind: kubernetes`) and is not added to `hosts[]`.
2. **Add `Host.kind`.** Allowed values:
   - `vm`
   - `physical`
   - `k8s-all-in-one` — control plane and worker on the same machine
   - `k8s-worker` — worker node in a cluster
   - `pod-host` — machine running Pods, operated through `docker exec`

   The schema defaults a missing value to `vm` so existing environment YAML remains
   readable. The kind is a classification, not a new logical role.
3. **Add `Host.access`.** Allowed values are `ssh`, `kubectl` and `docker`. This records the
   command surfaces that exist on the machine. It is metadata, not an authorization grant
   and not a credential. The registry stores no passwords, kubeconfigs or Docker
   credentials; those remain behind `credentialRef`.
4. **Add `Host.clusterRef`.** Kubernetes nodes and Pod hosts may reference a `Cluster` in
   the same environment. `k8s-all-in-one` and `k8s-worker` require an existing cluster
   reference; `pod-host` may omit it for a Docker-only machine outside the cluster.
5. **Add `Cluster.topology`.** Allowed values are `all-in-one`, `separate` and `external`.
   Topology is a descriptive cluster hint. Per-host `kind` remains authoritative; the schema
   does not force a particular mix of node kinds while an environment is being migrated.
6. **Keep access methods independent of kind.** A worker may have Docker; a VM may have
   `kubectl`; an all-in-one node may have all three. The UI pre-fills defaults but never
   hides an access method based on the kind.
7. **Model the operational entry point, not the Pod.** A `pod-host` tells an operator that
   the machine is reached with `docker exec`; it intentionally has no `podName` or
   `containerName` field in V1. Adding Pod/container inventory is a separate future model.
8. **Expose the model in the panel.** The node form has kind, cluster and access controls;
   node cards show kind/access badges and cluster references; search covers kind, access and
   cluster name/reference; the detail page has a Kubernetes/clusters tab for adding and
   editing cluster metadata. Batch import still creates generic `vm`/`ssh` nodes and never
   accepts secrets.

## Consequences

Positive:

- The three deployment shapes operators actually use are representable without inventing a
  Kubernetes plane or duplicating a machine per Pod.
- The command surface is explicit, so a future execution skill can choose SSH, `kubectl` or
  `docker exec` from declared metadata instead of guessing from the node name.
- Cluster references and topology make the relationship between all-in-one, worker and Pod
  hosts visible in one environment document.
- Existing YAML remains valid: missing `kind` reads as `vm`, missing `access` is unknown,
  and missing topology is displayed as `—`.

Costs / limits:

- `access` states what is available, not whether the current operator is allowed to use it.
  Approval and execution policy remain outside this model.
- The schema does not prove that a host really has `kubectl` or Docker, nor that a cluster's
  topology matches its nodes. The values are operator-maintained facts.
- A Pod host is still one record even when it runs many Pods; per-Pod inventory, container
  ids and restart counts are out of scope for V1.
- Batch import does not yet accept kind/access/cluster columns; those nodes are created as
  generic VMs and must be edited, or imported through YAML.

## Follow-up

- Add a future Pod/container inventory only if operations need per-workload targeting; keep
  it separate from `Host`.
- Add batch-import columns for kind/access/cluster when bulk Kubernetes onboarding becomes a
  real workflow.
- Consider validating cluster topology consistency as a warning, not a hard error.
- Keep `docs/01-architecture/data-model.md` §3.2 and `docs/01-architecture/ui-design.md`
  synchronized with this decision.
