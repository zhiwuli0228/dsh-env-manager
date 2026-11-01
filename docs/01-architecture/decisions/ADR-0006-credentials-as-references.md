# ADR-0006: Credentials Are References

## Status

Accepted

## Context

The registry describes production hosts, clusters and services. Operators will want the Agent to "log in" or "use the credential for test-a".

Storing values in the registry would make the YAML files a secret store, would leak through tool output and Git history, and would duplicate the DSH credential service.

## Decision

1. Registry records store only `credentialRef` strings.
2. Credential status is obtained with `ctx.credentials.describe(ref)` and reduced to
   `{ configured, source? }`.
3. The plugin never calls `ctx.credentials.resolve(ref)` and never forwards a credential value.
4. Tool and HTTP output expose `{ ref, configured, source? }` only.

## Consequences

- Secrets stay in the DSH credential service or an external vault.
- The plugin cannot authenticate anything itself; execution adapters (future) must obtain credentials through the proper service.
- A wrong reference cannot be detected beyond `configured: true/false`; operational review remains necessary.

## Alternatives Considered

- **Store values in YAML**: unacceptable for Git history and tool output.
- **Skip references entirely**: loses the link between a host and its credential, which users need.
