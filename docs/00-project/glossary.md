# Glossary

## Environment

One complete network and one configuration page, such as `dev`, `test-a`, `staging` or
`production`.

Contains the role catalogue, hosts, clusters and access endpoints in one record. An
environment must declare at least one logical role; the panel seeds management, business,
database and expansion by default.

## Plane

A role view over an environment's nodes: management, business, database or expansion.

A plane is **not** a separate environment and has no node copies. Opening a plane tab
filters the environment's single `hosts[]` collection. A node that serves two planes is one
host with two roles.

## Node

The user-facing name for a host inside an environment. See **Host**.

## Host

A single compute machine inside one environment: a VM, physical machine, Kubernetes node or
Pod-hosting machine. A Pod is not a Host.

Attributes: hostname, kind, OS, IP, SSH port, roles, command access and a `credentialRef`. A
host must declare at least one role; it may carry several roles, which is how co-location is
expressed. It may have zero accounts, or accounts that each carry their own `credentialRef`.

## Node Kind

The machine classification on `Host.kind`: `vm`, `physical`, `k8s-all-in-one`, `k8s-worker`
or `pod-host`. It describes how the machine participates in the deployment, not which
logical plane it serves. A missing kind reads as `vm`.

## Command Surface

The command entry points available on a host, recorded in `Host.access`: `ssh`, `kubectl`
or `docker`. This is capability metadata, not an authorization grant and not a credential.

## Pod Host

A machine running Pods that operators reach with `docker exec`, recorded as
`Host.kind: pod-host`. It is one Host even when it runs many Pods; individual Pods belong to
the deployment model, not `hosts[]`.

## Web Login

A management or business console login recorded on `HostAccount`: `loginUrl` is the console
entry URL, `username` is the login name and `credentialRef` points to the password in the
DSH credential service. The URL is configuration, never a secret; the password is never
stored in the environment YAML.

## Cluster

A Kubernetes or Docker cluster inside one environment.

Attributes: kind, optional topology (`all-in-one`, `separate` or `external`), API endpoint,
namespaces and a `credentialRef`. Kubernetes and Pod-host nodes reference it through
`Host.clusterRef`.

## Cluster Topology

A descriptive label on `Cluster.topology`:

- `all-in-one` — control plane and worker on the same machine;
- `separate` — dedicated control plane and worker machines;
- `external` — a cluster managed outside this environment.

Per-host `Host.kind` is authoritative; topology does not replace it.

## Logical Role

A named function a host can serve, such as `management`, `business`, `database` or
`extension`.

Hosts and roles are many-to-many via `Host.roles`. Standard role ids are seeded on
environment creation; custom ids are allowed but must be declared before use.

## Service

A deployable software component described independently of any environment.

Attributes: id, name, aliases, category, Git URL and branch, build tool, artifact name, supported deploy modes and ordered rule profile references.

## Deployment Binding

The relationship "this service runs here, in this runtime mode".

One service may have several bindings in one environment, so `(environmentId, serviceId)` is not unique.

## Runtime Mode

`native`, `docker` or `kubernetes`. Determines which location fields and which log source apply.

## Rule Profile

A reusable set of variables, paths, log sources and class locations.

Referenced by services in order; later profiles win on field conflicts.

## Rule Override

A field-level override carried by an environment or a deployment.

Overriding one field leaves the other fields of the profile intact.

## Rule Layer

One of `global`, `service`, `environment`, `deployment`, in ascending priority.

## Template

A string containing `${...}` references, resolved by interpolation only.

No functions, operators, conditionals or shell execution.

## Provenance

The explanation attached to a resolved value:

- `definedBy` — the layer and profile that supplied the winning template;
- `inputs` — referenced fields and the layer that supplied each;
- `shadowed` — lower-priority definitions that lost.

## Derived Value

A value produced by rule resolution. It is not evidence that a file or endpoint exists.

## Verified Value

A value confirmed by an online check. V1 does not produce verified values.

## Service Context

The structured result of resolving an environment, service, deployment, rules and credential status.

Returned by `env_resolve`.

## Operation Binding

A predicate mapping an operation in a given context to a specific Skill, with parameter templates and policy.

## Match Level

How specific a binding is: `deployment`, `environment-service`, `environment`, `service`, `category-mode`, `global`.

Higher levels win; same-level ties are conflicts.

## Skill Reference

A pointer to a DSH Skill: name, optional expected source and provider.

It is discovery information, not execution authorization.

## Approval Policy

The `requiresApproval` and `allowProduction` fields on a binding.

Write operations default to requiring approval; production defaults to denied.

## Credential Reference

A `credentialRef` string stored in a registry record.

It must match the DSH credential grammar `^[A-Za-z_][A-Za-z0-9_]*$` (a POSIX
environment-variable-style name). The plugin's own refs use the
`DSH_ENV_MANAGER_<ENVIRONMENT>_<ACCOUNT>` shape; the DSH file store rejects other key
shapes inside `refs:` at boot.

The value behind it lives in the DSH credential service or an external vault and is never returned by this plugin.

## Credential Status

`configured`, `missing` or `unavailable`, obtained from the credential service without reading the value.

## Session Context

The per-session default environment.

Advisory only; it never changes registry records or another session's state.

## Operation Record

A structured, redacted description of a performed operation: scope, operation, Skill reference, timing, outcome, evidence references and summary.

Owned by the memory plugin from P1 onward.

## Evidence Reference

An opaque, sanitized pointer to evidence produced during an operation.

Not the evidence itself.

## Memory Scope

The environment/service/deployment scope attached to a memory query or record.

Prevents a single-environment conclusion from becoming a global rule.

## Memory Bridge

The optional adapter between this plugin and the memory plugin.

Introduces no second store of environment facts and applies nothing automatically.

## Review Queue

The place where candidate rule or Skill changes wait for a human decision.

## Source of Truth

The durable data representation. Here: YAML registry files under the plugin data directory.

## Harness

The project-level control system for AI-assisted development: context rules, constraints, execution and verification policies, and continuity practices.
