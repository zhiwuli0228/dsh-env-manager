# ADR-0008: Memory Bridge Instead of a Second Memory Store

## Status

Accepted

## Context

The brainstorm originally considered a standalone memory plugin with structured categories. The project already depends on a memory plugin for durable knowledge, decisions, playbooks and open questions.

Building a second store would duplicate environment facts and split the place where lessons live.

## Decision

- DSH Environment Manager owns environment facts, service catalog, deployment bindings, rules and operation bindings.
- The memory plugin owns durable knowledge: observations, playbooks, decisions and proposals.
- The bridge exchanges scoped references, never copies of registry data.
- V1 ships the contract and a null adapter; P1 implements the adapter.
- Nothing in the bridge auto-applies a change.

## Consequences

- One place for facts, one place for knowledge.
- Memory entries must carry `environmentId`/`serviceId`/`deploymentId` scope.
- A single-environment conclusion cannot silently become a global rule.
- The bridge contract must be versioned when the memory plugin changes.

## Alternatives Considered

- **Own memory store**: duplicates scope, evidence and review logic.
- **No integration**: the improvement loop from the brainstorm cannot close.
