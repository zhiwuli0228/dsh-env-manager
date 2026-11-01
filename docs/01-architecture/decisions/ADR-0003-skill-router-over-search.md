# ADR-0003: Explicit Operation-to-Skill Binding over Search

## Status

Accepted

## Context

When an Agent asks to perform an operation (e.g. redeploy a service), the system could either search for a relevant Skill or use an explicit binding.

## Decision

We will use explicit Operation Bindings with deterministic scope-based matching.

## Consequences

- Predictable routing: the same context always resolves to the same Skill.
- Conflicts are explicit and fail safely.
- Parameters are mapped declaratively.
- Approval policies are attached to bindings.

## Alternatives Considered

- **Semantic search over skill descriptions**: Non-deterministic and hard to audit for production operations.
- **Convention-based naming**: Brittle and does not support fine-grained policy.
