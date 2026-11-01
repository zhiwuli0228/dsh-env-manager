# Security Policy

## Credentials

- Store only `credentialRef` values in this plugin.
- Actual credentials must live in a separate vault or DSH credential store.
- Never log or return credential values.

## Production Access

- Production-flagged operations require explicit approval.
- Default policy should deny production write operations unless explicitly enabled.

## Rule Templates

- Rule templates must not execute arbitrary JavaScript or shell.
- Detect and reject variable cycles and undefined references.
- Sanitize any interpolated values used in paths or commands.

## Audit

- Operation records must be emitted for write operations.
- Evidence references must be sanitized before persistence.
