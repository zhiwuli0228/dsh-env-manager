# ADR-0002: File-based Storage as Source of Truth

## Status

Accepted

## Context

We need durable storage for registry records. Options include a local JSON/YAML file tree, SQLite, or a database.

## Decision

Registry data is stored as YAML files in a directory tree under the plugin workspace.

## Consequences

- Human-readable and version-control friendly.
- Easy to inspect and edit.
- No external database dependency.
- Concurrent writes are last-write-wins; higher-level locking may be added later.

## Alternatives Considered

- **SQLite**: Adds complexity and a binary artifact; not necessary for V1 scale.
- **DSH memory plugin**: Memory plugin is for historical knowledge, not authoritative configuration.
