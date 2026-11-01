# ADR-0001: Distribute as a DSH Bundle

## Status

Accepted

## Context

The Environment Manager must be installable into DSH and share state across sessions in the same profile. We considered several distribution models:

1. Standalone Node.js service
2. DSH plugin bundle
3. External CLI tool

## Decision

We will distribute Environment Manager as a DSH bundle with both Host and Client entries.

## Consequences

- Users install the bundle through DSH's `plugin_manager`.
- Host-side code runs in the DSH host process and can register tools and services.
- Client-side code runs in the Web/Desktop UI and can provide configuration panels.
- State is scoped to a DSH profile; all sessions in the profile share the registry.

## Alternatives Considered

- **Standalone service**: Adds operational overhead and is not idiomatic for DSH.
- **External CLI tool**: Loses integration with DSH session context and UI.
