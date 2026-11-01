# ADR-0005: Layered Rule Resolution with Provenance

## Status

Accepted

## Context

Rule profiles define paths, log sources and class locations that differ by service and by environment. Users need to override one field without copying an entire profile, and they need to understand why a resolved value is what it is.

Alternatives: a single flat profile per deployment, whole-object replacement, or embedding script hooks.

## Decision

Resolve rules in four ordered layers:

1. global defaults
2. service `ruleProfileRefs`, in list order
3. environment `ruleOverrides`
4. deployment `variables` and `ruleOverrides`

Merging is field-level. Every returned field carries provenance: the winning layer, the referenced inputs with their own sources, and the shadowed definitions.

Templates support `${...}` interpolation only. No functions, operators or code.

## Consequences

- An environment can override `paths.logDir` without touching `paths.jar`.
- A field defined at the service layer can still change because an input was overridden; provenance makes that visible.
- Validation must detect cycles and undefined references before returning anything.
- Users see derived values as derived; they are not implied to exist.

## Alternatives Considered

- **Whole-object replacement**: simple but forces duplication and hides intent.
- **Script hooks**: powerful but unreviewable in production and outside the safety model.
