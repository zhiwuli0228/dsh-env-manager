# Glossary

## Environment

A logical target for deployment and operations, such as `dev`, `test-a`, `staging` or `production`.

Contains roles, hosts, clusters and access endpoints in one record.

## Host

A single compute node (VM or physical) inside one environment.

Attributes: hostname, OS, IP, SSH port, roles and a `credentialRef`. A host may carry several roles; that is how co-location is expressed.

## Cluster

A Kubernetes or Docker cluster inside one environment.

Attributes: kind, API endpoint, namespaces and a `credentialRef`.

## Logical Role

A named function a host can serve, such as `management`, `business` or `extension`.

Hosts and roles are many-to-many via `Host.roles`.

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

How specific a binding is: `deployment`, `environment-service`, `service`, `category-mode`, `global`.

Higher levels win; same-level ties are conflicts.

## Skill Reference

A pointer to a DSH Skill: name, optional expected source and digest.

It is discovery information, not execution authorization.

## Approval Policy

The `requiresApproval` and `allowProduction` fields on a binding.

Write operations default to requiring approval; production defaults to denied.

## Credential Reference

A `credentialRef` string stored in a registry record.

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
