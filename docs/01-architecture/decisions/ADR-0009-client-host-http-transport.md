# ADR-0009: Client–Host transport via a plugin-owned HTTP route

- Status: accepted
- Date: 2026-11-01
- Supersedes: none
- Related: ADR-0004 (TypeScript Host, plain-JS Client), `api-verification.md` F9–F14

## Context

The V1 panel must list, edit and validate registry records. The data lives in the Host
process; the Client half runs in the browser page. A transport is therefore required.

DSH's native mechanism is the Typert Remote system:

- the Host defines a service extending `TypertRemoteService` and marks methods with
  `@Remote` / `@RemoteScope`;
- a build-time Typert loader emits an `InvocationDescriptor` and a `/remote` artifact;
- the Client imports that artifact, mounts it through `ctx.remote.$mount()`, and calls
  generated methods;
- the Gateway rejects Client-supplied fields that lack a strict generated codec.

That pipeline assumes the DSH monorepo build toolchain and a matching DSH release.
This repository is a standalone bundle compiled with plain `tsc`, and the runtime
provides no API for registering a Remote namespace from plain JavaScript.

## Decision

The plugin registers one same-origin HTTP route and the Client calls it:

```text
POST /env-manager/api
headers: content-type: application/json
         x-env-manager-request: 1
body:    { "op": "...", "payload": { ... } }
```

- The route is registered with `ctx.webServer.register({ kind: 'prefix', ... })` and
  disposed with the plugin fiber.
- The route handler is a thin adapter over the same application service the tools use;
  there is no second business path.
- Authentication is a required custom header plus an `Origin` equality check against
  `ctx.webServer.getOrigin()`. No cookie or credential is read. No CORS headers are
  sent, so a cross-origin page cannot preflight the custom header.
- Every request is validated server-side; the Client's TypeScript-free code is never
  trusted for shape.
- Writes from this route run with actor `'ui'` and are subject to
  `writePolicy.allowUiProductionWrites`; deletes require an explicit `confirm: true`.

## Consequences

Positive:

- No dependency on the Typert codegen toolchain or on a matching DSH release.
- One transport for tools and UI, so behavior cannot drift.
- Simple to test with Node's `http` mocks and `curl`.
- No streaming requirement in V1, so request/response is sufficient.

Negative:

- The Client has no generated type contract; shared shapes are maintained by hand and
  checked by tests.
- A new local HTTP surface exists. It is header-gated, origin-checked, read-only for
  credentials, and cannot be reached cross-origin without a preflight the server
  refuses.
- No streaming or subscriptions; the UI refreshes explicitly.
- Session-scoped operations are not exposed to the UI in V1, because the UI has no
  trustworthy session identity.

## Alternatives

| Alternative | Why rejected |
|---|---|
| Typert Remote namespace | Requires build-time descriptors and DSH monorepo tooling; impossible from plain JS |
| Client reads registry files directly | The browser has no filesystem access, and it would bypass Host validation |
| Agent-mediated UI (buttons insert prompts) | Poor UX; every inspection would consume a turn |
| WebSocket / streaming | V1 has no live-update requirement |
| `window.__DSH_BOOT__` global injection of data | One-shot snapshot, no writes, stale immediately |

## Review trigger

Revisit when either becomes true:

1. DSH exposes a runtime API to register an `InvocationDescriptor` from a bundle, or
2. this repository adopts the DSH build toolchain and can emit `/remote` artifacts.

At that point the HTTP adapter can be replaced without changing the application service
or the tools.
