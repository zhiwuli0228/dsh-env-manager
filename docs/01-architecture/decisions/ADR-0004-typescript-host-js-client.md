# ADR-0004: TypeScript Host, Plain-JavaScript Client

## Status

Accepted

## Context

The Host half contains the domain logic: schemas, layered rule resolution, provenance, conflict detection and policy evaluation. These benefit from static types and exhaustive checks.

The Client half is a DSH module-loader artifact. It has no build step today and uses `React.createElement` rather than JSX.

The alternative was TypeScript everywhere with a client bundler, or plain JavaScript everywhere.

## Decision

- Host: TypeScript compiled to ESM (`src/` → `lib/`).
- Client: plain JavaScript module at the repository root (`client.js`), no bundler.
- The current JavaScript host skeleton is replaced during V1 implementation; the bundle entry becomes a thin shim over `lib/index.js`.

## Consequences

- Domain invariants are checked at compile time.
- No client build pipeline in V1; UI code is more verbose.
- Two languages in one repository; the boundary is explicit: `src/` is Host-only.
- If the UI later needs TypeScript or JSX, that change gets its own ADR and a bundling step.

## Alternatives Considered

- **TypeScript everywhere now**: a bundler and a module-loader wrapper are needed immediately; delays the core value.
- **JavaScript everywhere**: loses compile-time guarantees exactly where the domain is most intricate.
