# Glossary

## Environment

A logical target for deployment and operations, such as `dev`, `test-a`, `staging` or `production`.

Contains hosts, clusters, roles and access endpoints.

## Host

A single compute node (VM or physical) that belongs to an environment.

Attributes include hostname, OS, IP, SSH port and roles.

## Cluster

A Kubernetes or Docker cluster registered in an environment.

Contains an API endpoint, namespace list and node topology.

## Service

A deployable software component described independently of any environment.

Contains service id, name, Git URL, artifact name and rule profile references.

## Deployment Binding

The relationship between a service, an environment and a runtime mode (`native`, `docker`, `kubernetes`).

One service can have multiple deployment bindings in the same environment.

## Rule Profile

A reusable set of variables and templates that resolve paths, log sources and runtime rules.

Supports global, service-level, environment-level and deployment-level overrides.

## Operation Binding

A mapping from an operation (e.g. `redeploy`) in a given context to a specific Skill.

Includes match conditions, parameter mapping and policy (approval, production access).

## Skill Reference

A pointer to a DSH Skill including name, expected source and digest.

The router returns a skill reference; execution is performed by the target Skill itself.

## Service Context

A structured result combining an environment, service, deployment binding and resolved rules.

Used by Agent tools to answer "where is this service and how do I talk to it?"

## Operation Record

A structured event describing a performed operation: who, when, what, outcome and evidence references.

Stored through the memory bridge, not duplicated in this plugin.

## Source of Truth

The durable data representation.

In this project, the source of truth is the file system, especially YAML/JSON registry files.

## Harness

The project-level control system for AI-assisted development.

It includes context rules, constraints, execution policies, verification rules, and continuity practices.
