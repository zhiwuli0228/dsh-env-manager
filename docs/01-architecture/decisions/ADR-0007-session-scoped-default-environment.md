# ADR-0007: Session-Scoped Default Environment

## Status

Accepted

## Context

Users work in one environment at a time and do not want to repeat "test-a" in every request. A shared global default would let one session silently change another session's target, which is unsafe.

## Decision

- The default environment is stored per session.
- `env_set_context` writes only the current session's value.
- Tools accept an explicit `environmentId` first; the session default is a fallback.
- The default is advisory: it never mutates registry records and never changes routing policy.

## Consequences

- Two sessions can target different environments concurrently (AC-07).
- Storage is a small JSON file per session under `<dataDir>/sessions/`; the DSH
  projection store is not usable from a standalone bundle (`api-verification.md` F11).
- A session without a default must pass `environmentId` explicitly; the error names both options.

## Alternatives Considered

- **Profile-global default**: convenient but violates session isolation.
- **No default at all**: safe but adds friction to every call.
