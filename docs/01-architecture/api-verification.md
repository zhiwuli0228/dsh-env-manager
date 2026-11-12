# API Verification

> Status: verified against the DSH runtime shipped as `DeepSeek Harness 0.2.1-rc.5`.
> Method: `cordis_inspect_*` providers plus package documentation and bundled source
> extracted from the installed `app.asar`. This document records what the V1 design
> may rely on, and what it must verify again at implementation time.

## 1. Purpose

The first design draft left eight open questions about DSH integration. This document
answers them from the runtime itself so that `detailed-design.md`,
`tool-contract.md`, `storage-contract.md` and `ui-design.md` describe APIs that exist,
not APIs that are assumed.

Every finding has an ID (`F1`…`F21`). The design documents reference these IDs.

## 2. Findings

### F1 — Host plugin entry

A Host package is an ES module exporting any of:

```ts
export const name = 'dsh-env-manager'
export const inject = ['tools']
export const Config = z.object({ dataDir: z.string() })
export function apply(ctx, config) { /* ... */ }
```

Evidence: `@deepseek-ai/dsh-shell-env` (`lib/index.js`) and `@deepseek-ai/dsh-tool-todo`.
`Config` is a `@deepseek-ai/schemastery` schema, not Zod. `inject` is a plain string
array. The loader supplies the parsed config as the second `apply` argument.

Design consequence: the Host entry keeps `apply(ctx, config)` and declares `inject`
explicitly; `Config` is authored with schemastery, while record validation uses Zod.

### F2 — Tool registration

`ctx.tools.register(definition)` registers globally or in the calling Agent scope and
returns an exact disposer. Duplicate names within one layer throw.

Tool authors should use `defineTool` from `@deepseek-ai/dsh-tools`:

```ts
ctx.tools.register(defineTool({
  name: 'env_list',
  description: '...',
  parameters: { kind: { type: 'string', enum: [...] } },
  output: { schema: { ... }, render: (args, value) => [{ type: 'text', text: '...' }] },
  async execute(args, exec) { /* ... */ },
}))
```

Evidence: `dsh-tools` README §"Register a tool"; `dsh-tool-todo` source.

Design consequence: all ten V1 tools are `defineTool` definitions, registered inside
`apply` and disposed with the plugin fiber.

### F3 — Parameter schema DSL

`defineTool.parameters` is DSH's own value-schema DSL, not raw JSON Schema. Supported
node types: `string`, `number`, `integer`, `boolean`, `null`, `array`, `object`,
author-only `json`, and exact-one `oneOf`. Object property `required: true` marks
membership; `additionalProperties` must be explicitly `true` or `false`.

Model arguments are validated before `execute` runs; invalid input becomes a normal
error result (`ToolArgsError`).

Design consequence: tool parameter tables in `tool-contract.md` use this DSL verbatim.

### F4 — Tool output contract

`output.schema` is a `JsonSchemaNode` restricted to:
`type`, `oneOf`, `properties`, `required`, `additionalProperties`, `items`, `enum`,
`const`, plus annotations (`description`, `title`, `default`, `examples`).
An **annotation-only schema** (`{ description: '…' }`) is the supported way to declare
unconstrained JSON.

The registry validates the returned value against `output.schema` after execution and
throws `ToolOutputError` on mismatch. `render(args, value)` returns `ContentBlock[]`;
one `{ type: 'text', text }` block is enough for a JSON-shaped tool.

Evidence: `dsh-tools` `assertSupportedJsonSchema`, `checkSchemaNode`,
`validateJsonSchemaValue`, and the output check at dispatch.

Design consequence: every tool output is a precise object schema where practical, and
uses `additionalProperties: true` for open record payloads. `render` emits a short
human summary, because the canonical value is what the model and programmatic callers
receive.

### F5 — Structured tool errors

Only a thrown `HarnessError` produces structured `{ name, code }` failure info;
plain `Error` produces a message only. Constructor:

```ts
new HarnessError(message, code, options?)
```

imported from `@deepseek-ai/dsh-llm`. `name` defaults to the subclass constructor name.

Evidence: `dsh-tools` `errorInfo()` and `@deepseek-ai/dsh-llm` `HarnessError`.

Design consequence: all expected failures throw a single `EnvManagerError extends
HarnessError` carrying a stable code from the diagnostics catalogue. Success values
carry no `ok` flag; failure is the error path.

### F6 — Tool execution context

`execute(args, exec)` receives `ToolRunContext` extending `ToolExecution`:

| Member | Use |
|---|---|
| `exec.signal` | cooperative cancellation; must be observed |
| `exec.callId`, `exec.rootCallId` | correlation ids |
| `exec.agent` | optional `Agent`; `exec.agent.session.header.id` is the session id |
| `exec.deferContext(msg)` | attach extra model context |
| `exec.concludeTurn()` | end the turn (not used in V1) |

Evidence: Service contract `tools`, referenced type `ToolRunContext`; `dsh-shell-env`
reads `execution.agent.session.header.id`.

Design consequence: session-scoped tools require `exec.agent`; without it they fail
with `SESSION_CONTEXT_UNAVAILABLE` instead of guessing a session.

### F7 — Approval

`ctx.approval.request(req)` returns
`'allowed-once' | 'rejected' | 'cancelled' | 'unavailable'`.
Only `'allowed-once'` is a grant; every other outcome must be treated as denial.
The request needs `agent`, `toolName`, optional `callId`, `reason`, `displayReason`
(localized), and a `signal`. It requires an open turn.

Evidence: Service contract `approval`.

Design consequence: `env_delete` and production `env_save` call
`ctx.approval.request` with a localized `displayReason`, and fail closed on any
non-grant. Approval is per call; nothing is cached.

### F8 — Credentials

`ctx.credentials.describe(ref)` returns `{ configured, source?, writable }` without
the value. `set(ref, value)` writes to a provider-managed writable source and
`unset(ref)` removes it. `resolve(ref)` returns the value and must not be called by this
plugin. `CredentialRef` is a branded string; at runtime an ordinary string is accepted.
Refs this plugin writes are POSIX-style `DSH_ENV_MANAGER_*` names: the file-backed store
rejects any other key inside its `refs:` section at boot.

Evidence: Service contract `credentials`; live `POST /env-manager/api` with
`op: "credential"` returned `{ ref, configured: true }`, and `op: "credentialUnset"`
returned `{ ref, removed: true }`. The panel used the same path to create an environment,
then the record was read back and contained only the ref.

Design consequence: `env_resolve` reports each `credentialRef` with
`configured`/`source` only. Credential values may appear in the request body of
`credential`, but never in a tool result, HTTP response, log line, diagnostic or registry
file.

Availability caveat: `ctx.get('credentials')` is `undefined` until the provider fiber is
`ACTIVE`. The local provider's `Service.init` awaits loading `$DSH_HOME/.credentials.yaml`
(and checking its owner-only mode), so a bundle applied at cold start must bind the service
through `ctx.inject(['credentials'])` as well; otherwise writes fail with
`CREDENTIAL_UNAVAILABLE` even though the service is fine.

### F9 — Filesystem capability gap

`ctx.fs` exposes `resolve`, `stat`, `listDir`, `readText`, `writeText` (atomic),
`editText`, `readBytes`, `readByteRange`, `watch`, `contains` — but **no** `mkdir`,
`unlink`, `rename`, or `copy`. `resolve` follows real paths, so it cannot target a
file whose parent directory does not exist yet.

Evidence: Service contract `fs`.

Design consequence: registry storage uses `node:fs/promises` directly, confined to
the resolved `dataDir`. The plugin is trusted Host code, not a sandboxed tool. Every
path is built from a validated id and checked with `path.resolve` containment; no
model-supplied path reaches the filesystem.

### F10 — Data directory

`ctx.get('profileContext')` exposes at least `name` and `dir` at runtime
(`dsh-shell-env` reads both), although the inspect contract lists only four other
members. `dir` is the profile directory that owns `node_modules`, patches and data.

Evidence: `dsh-shell-env` `collect()`; Service contract `profileContext`.

Design consequence: `dataDir` resolution order:

1. `config.dataDir` (absolute, or relative to the profile directory)
2. `<profileContext.dir>/data/dsh-env-manager`
3. `$DSH_PROFILE_DIR/data/dsh-env-manager`
4. `<cwd>/data`

The resolved path is logged once and exposed read-only through `env_get_context` and
the UI overview. Task T1 verifies `profileContext.dir` on a live profile.

### F11 — Session identity and state

`exec.agent.session` is a live `Session` with `header.id`, `append(type, data)` and
`snapshotEvents()`. The session id is available for every agent-initiated tool call.

There is a `sessionProjections` service (used by `todo_write`) for replayable plugin
state, but it is designed around declared session event types and projection schemas;
`SessionEventMap` is a closed TypeScript interface.

Design consequence: V1 stores the default environment in
`<dataDir>/sessions/<sessionId>.json` (small, explicit, testable, no session-log
schema changes). A projection-based implementation is recorded as a P2 alternative.

### F12 — HTTP carrier

`ctx.webServer.register({ kind: 'prefix' | 'exact', path, handler })` registers a
route and returns a disposer; duplicate `(kind, path)` throws.
`getOrigin()` returns the local origin. `tapIndex(transform)` can inject markup.

**Availability:** the `webServer` service is not guaranteed to be provided when a
bundle's `apply` runs — on DSH 0.2.2-rc.1 the web runtime started after this bundle, so
a synchronous `ctx.get('webServer')` returned `undefined` and silently disabled the
panel (GET `/env-manager/api` → SPA 404, POST → `405 allow: GET, HEAD`). Register the
route through `ctx.inject(['webServer'], (webCtx) => webCtx.effect(() => webCtx.webServer.register(...)))`
(core plugins use the same pattern), which mounts the route once the service is
provided and keeps it optional on headless profiles.

Evidence: Service contract `webServer`; live probe on 0.2.2-rc.1; `tests/plugin/plugin.test.ts`.

Design consequence: the Client panel talks to the Host through
`POST /env-manager/api` registered by this plugin, authenticated by a required custom
header plus an `Origin` check. See ADR-0009 and `ui-design.md` §4.

### F13 — Client module

A bundle's `client.js` is served as `dsh.client`'s `./client` export and loaded by
`window.__ModuleLoader__.load({ id, factory(require) { ... } })`. The `id` **must equal
the bundle's package name** (`dsh-env-manager-plugin`): the client module table keys every
entry by package name and materializes the factory under that exact id — a different id
leaves the module unimportable (verified live: the sidebar row stayed a shell placeholder
until the id matched). The factory may `require('react')`. The returned plugin declares
`name` (also the package name), `inject` services (`slots`, `locale`, …) and `apply(ctx)`.

The dynamic-Cordis builtins (`React`, `host.call`, `styles`, `console`) belong to
runtime-defined packages, **not** to installed bundle client halves.

Evidence: `client.js` skeleton; `Slots`/`Service` client catalog; `dsh-cordis-client-runner`.

Design consequence: the Client uses `slots` and `locale` only, plus browser `fetch`
for the plugin's own HTTP route.

### F14 — Client-to-Host Remote is not usable here

DSH's native Client↔Host RPC is the Typert Remote system:
`ctx.remote.$mount()` mounts a **generated** Host-for-Client contribution; strict
descriptors come from `@Remote`/`@RemoteScope` decorators processed by the build-time
Typert loader into `ctx.typert.local` (`/remote` artifacts imported by the Client).
Client-supplied fields without strict generated codecs fail before methods become
callable. SRC mode is a development fallback for endpoints without a strict
definition and does not give a standalone bundle a typed namespace.

Evidence: `dsh-api-gateway` README (Host and Client sections), `dsh-api-remotes`
README ("capability set is fixed by explicit build-time value imports"), client
Service catalog (no `remote` service until the gateway Client face mounts one).

Design consequence: a standalone plugin bundle cannot add a Remote namespace without
adopting DSH's build toolchain. V1 therefore uses the plugin-owned HTTP route
(ADR-0009), which is same-origin, token-free, header-gated, and reuses the exact same
application handlers as the tools.

### F15 — Slots

Live topology confirms:

| Slot | Kind | Registration |
|---|---|---|
| `sidebar.panellist` | list | `{ id, order?, label? }` — one sidebar icon |
| `main` | keyed | `{ key }` — the selected panel body |
| `plugins.bundle.config` | keyed | `{ key: '<package name>' }`, `view: 'page'` only |
| `conversation.composer.dock` | list | `{ id, order?, label? }` — ambient composer entry |

`ctx.slots.inject(slotName, () => ctx.slots.register({ name, ... }, Component))` waits
for the slot to exist and disposes with the fiber.

Design consequence: the manager registers a `sidebar.panellist` icon
(id `env-manager`), a `main` panel keyed `env-manager`, and optionally a bundle
config page. The composer dock is not used for the main UI.

### F16 — Client services

Available to the Client half: `layout`, `locale`, `sessions`, `slots`, `theme`,
`timer`, `uiWorkspace`, `workspaces`.

- `ctx.locale.register(ns, { en, zh })` and `ctx.locale.bind(ns)` provide copy.
- `ctx.theme` owns theme selection; the plugin only consumes CSS variables.
- `ctx.layout.selectPanel(id)` can select the panel programmatically.

Design consequence: UI copy is registered as namespace `envManager`; no string is
hardcoded twice.

### F17 — Theme tokens

The current theme exposes `--dsw-alias-*` tokens:
`bg-base`, `bg-layer-1`, `bg-layer-2`, `bg-overlay`, `border-l1`, `border-l2`,
`brand-primary`, `label-primary`, `label-secondary`, `state-error-primary`,
`state-idle-primary`, `state-success-primary`, `state-warn-primary`, and
`--dsw-specific-sidebar-fill`.

Design consequence: the panel styles itself only with these variables; no hardcoded
palette, including the sidebar icon (except its own brand mark color).

### F18 — Config schema shape

`Config` is `@deepseek-ai/schemastery` (`z.object({...})`), and the loader rejects
invalid config before `apply`. There is no runtime config *write* API for a plugin;
users edit the profile patch. The Client may show the effective config read-only.

Design consequence: the bundle config page is informational; `dataDir` is changed in
the profile patch or `cordis.patch.yml`, not through the UI.

### F19 — Package layout and bundling

The bundle needs `index.js` (Host entry), `client.js` (Client entry),
`cordis.patch.yml`, `package.json` with `dsh.bundle.patch` and `dsh.client`.
DSH itself uses prebuilt ESM in `lib/` and ships no bundler requirement for the Host.
The Client half is a single plain-JS module.

Design consequence: TypeScript Host compiled to `lib/`, `index.js` as a thin
re-export shim, no client bundler. This matches ADR-0004.

### F20 — Skill catalog

The Host exposes a `skills` service:

```ts
ctx.skills.list({ scope?, cwd?, signal? }): Promise<SkillSummary[]>
ctx.skills.snapshot({ scope?, cwd?, signal? }): Promise<{ skills: SkillSummary[]; complete: boolean }>
ctx.skills.get(name, { scope?, cwd? }): Promise<SkillSummary | undefined>
ctx.skills.register(...), ctx.skills.registerProvider(...)
```

`SkillSummary` fields: `name`, `description`, `whenToUse?`, `invocation`, `source`,
`provider`, `path?`, `resourceBase?`. There is **no digest field**, and no API returns
Skill file contents or a content hash.

`snapshot.complete === false` means the catalog is incomplete for the requested scope;
absence of a name then proves nothing.

Design consequence:

- Availability checks use `snapshot`, not a name-only `get`.
- A missing/service-unavailable/incomplete catalog yields `available: 'unknown'` with a
  warning, never a silent pass.
- Digest pinning is unsupported. `SkillReference` uses `expectedSource` and
  `expectedProvider`; `expectedDigest` was removed.

### F21 — Runtime Skill registration from a plugin

`ctx.skills.register(skill)` is the official Host API for a plugin-owned runtime Skill:

```ts
const dispose = ctx.skills.register({
  name: 'dsh-env-manager',
  description: '...',
  whenToUse: '...',
  content: '# ...',
  source: 'runtime',
  invocation: { modelInvocable: true, userInvocable: true },
})
```

Evidence: Service contract `skills` (methods `register`, `registerProvider`, `list`,
`snapshot`, `get`; types `SkillRegistration`, `SkillDefinition`, `SkillSummary`,
`SkillInvocationPolicy`). The service description states that an unscoped registration
files into the **global layer**, while a registration made in a scoped context (for
example an agent preset) files into that scope. The disposer unregisters the provider
and invalidates catalog caches.

A live registration was verified in the `desktop` profile: after rebuilding and
reloading `dsh-env-manager`, the Skill catalog added `dsh-env-manager`, and the `skill`
tool returned the registered content. This is runtime registration, not a filesystem
`SKILL.md`; no workspace file or separate Skill installation is involved.

Design consequence:

- The bundled `dsh-env-manager` discovery Skill is registered in `apply()` with
  `ctx.get('skills')`, inside the plugin effect so it is disposed with the fiber.
- The Skill is visible in the same profile's other workspaces; it remains a catalog
  summary until invoked, so it does not put the full workflow in every system prompt.
- `config.registerSkill` defaults to `true`; setting it to `false` suppresses the entry.
- `ctx.skills` is optional. If the service is absent or lacks `register`, the plugin
  keeps its tools and panel and skips the Skill.
- Operation execution still requires an `operationBinding`; the discovery Skill does
  not execute the routed Skill.

## 3. Consequences for the V1 design

1. **Tool contract is concrete.** Ten `defineTool` definitions with a parameter DSL,
   output schema, render function and `HarnessError` codes.
2. **Transport is plugin-owned HTTP.** No Typert codegen; one same-origin route; the
   same application service answers tools and UI.
3. **Storage uses Node fs.** `ctx.fs` cannot create or delete directories/files, so
   the plugin owns `<dataDir>` with `node:fs/promises` and its own atomic writes.
4. **Approval is per tool call.** Delete and production writes ask the human, and any
   outcome other than `allowed-once` denies.
5. **Session context is file-backed.** No session-log schema changes in V1.
6. **UI is a real panel.** Sidebar entry + `main` panel; no composer-dock widget.

## 4. Remaining verification tasks (implementation phase)

| ID | Verify | Fallback | Status |
|---|---|---|---|
| V1 | `profileContext.dir` present and writable | `$DSH_PROFILE_DIR`, then `<cwd>/data` | Verified: live `meta` reports `C:\Users\18811\.dsh\profiles\desktop\data` via the env fallback |
| V2 | `slots.register` accepts `main` with `key` | register under `main.conversation` | Verified live: `sidebar.panellist` occupant `dsh-env-manager` and `main` key `dsh-env-manager` are active |
| V3 | `fetch('/env-manager/api')` works from the bundle | fall back to Remote when DSH exposes runtime descriptors | Verified: live `POST /env-manager/api` returns `200` and a save/list/remove round-trip succeeds |
| V4 | `approval.request` from a tool body resolves | show a UI confirmation and deny without approval | Implemented fail-closed; not exercised live |
| V5 | Output schema accepts `additionalProperties: true` objects | annotation-only schema | Verified locally: all ten schemas pass `assertObjectJsonSchema` |
| V6 | `CredentialRef` accepts a plain string at runtime | import the branded factory | Implemented with string refs; live `describe` not exercised |
| V7 | Directory watcher parity on Windows | reload per request (already the V1 plan) | Verified: each request reloads the registry |
| V8 | `webServer` route prefix does not collide with shell routes | choose a more specific prefix | Verified live: `/env-manager/api` is served beside the GUI |

## 5. Evidence index

| Source | What it proves |
|---|---|
| `cordis_inspect_query(host, Service, tools)` | `register` signature, `ToolDefinition`, `ToolRunContext` |
| `cordis_inspect_query(host, Service, approval)` | approval outcomes, request fields |
| `cordis_inspect_query(host, Service, credentials)` | describe/resolve split |
| `cordis_inspect_query(host, Service, fs)` | capability gap (no mkdir/unlink) |
| `cordis_inspect_query(host, Service, skills)` | `snapshot`/`list`/`get`/`register`, `SkillRegistration`, no digest |
| Live `dsh-env-manager` registration | Skill catalog gained `dsh-env-manager`; `skill` tool loaded its content |
| `cordis_inspect_query(host, Service, webServer)` | route registration, origin |
| `cordis_inspect_query(client, Slots, listSubTree)` | slot topology and registration fields |
| `cordis_inspect_query(client, Builtin, listBuiltins)` | dynamic-half builtins (`host.call`) |
| `cordis_inspect_query(client, Theme, listTokens)` | `--dsw-alias-*` tokens |
| `dsh-tools` README + `lib/index.js` | `defineTool`, schema subset, output validation, `HarnessError` |
| `dsh-shell-env` `lib/index.js` | `Config` schemastery, `profileContext.dir`, session id |
| `dsh-api-gateway` / `dsh-api-remotes` README | Typert Remote requires generated descriptors |
| `dsh-tool-todo` `lib/index.js` | a complete tool definition in practice |
