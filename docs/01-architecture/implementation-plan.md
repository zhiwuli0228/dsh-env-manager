# Implementation Plan (V1)

> Status: ordered, executable plan for the V1 scope defined in
> [`design.md`](design.md) and [`detailed-design.md`](detailed-design.md).
> Every task ends with a build, its tests, and a documentation touch where behavior
> changed. Do not reorder P1–P4: each later phase imports the previous one's types.
>
> Implementation snapshot (2026-11-01): T01, T03–T18 and the Client portion of T19–T22
> are implemented; `npm run build` and 33 Vitest tests pass. T02 runtime probes, profile
> installation, manual panel QA and the final smoke test remain. See
> [`current-state.md`](../00-project/current-state.md).

## 1. Deliverable

A DSH bundle that:

1. registers ten `env_*` tools;
2. stores an environment/service/deployment/rule/binding registry as YAML files;
3. resolves layered rules with provenance;
4. routes operations to Skills without executing them;
5. exposes a same-origin HTTP API and a Web/Desktop management panel;
6. keeps session defaults isolated per session.

## 2. Foundations

### T01 — Build skeleton

Files:

- `package.json`: scripts, dependencies, `files`, `exports`, `dsh`.
- `tsconfig.json`: `target ES2022`, `module NodeNext`, `moduleResolution NodeNext`,
  `strict`, `declaration`, `outDir lib`, `rootDir src`, `sourceMap false`.
- `.gitignore`: add `data/`, `lib/`, `*.tsbuildinfo`.
- `index.js`: `export * from './lib/index.js'`.
- `src/index.ts`: minimal `apply` that logs the resolved data dir.

Scripts:

```json
{
  "build": "tsc -p tsconfig.json",
  "build:watch": "tsc -p tsconfig.json --watch",
  "test": "vitest run",
  "test:watch": "vitest",
  "check:client": "node --check client.js"
}
```

Dependencies:

| Package | Kind | Version |
|---|---|---|
| `@deepseek-ai/dsh-tools` | peer + dev | `0.2.1-rc.5` |
| `@deepseek-ai/dsh-llm` | peer + dev | `0.2.1-rc.5` |
| `@deepseek-ai/cordis` | peer + dev (type-only) | `~4.0.5` |
| `@deepseek-ai/schemastery` | dependency | `^3.18.5` |
| `zod` | dependency | `^4` |
| `yaml` | dependency | `^2` |
| `typescript`, `vitest`, `@types/node` | dev | latest compatible |

Acceptance: `npm install && npm run build && node --check client.js` succeeds; `lib/index.js`
exists; no `data/` is tracked.

Risk: npm publishes `0.2.1-rc.5` under a non-`latest` tag (verify with
`npm view <pkg> versions`). If a peer cannot be resolved, fall back to local ambient
declarations in `src/types/dsh.d.ts` and keep runtime imports unchanged.

### T02 — Runtime probes

Verify `api-verification.md` §4 V1–V8 against a live profile, in this order:

1. `profileContext.dir` and write permission.
2. `slots.register` with `main`/`key`.
3. `fetch('/env-manager/api')` from the panel (after T18).
4. `approval.request` from a tool body.
5. Output schema with `additionalProperties: true`.
6. `CredentialRef` accepting a plain string.
7. Windows directory behavior (no watcher required in V1).
8. `/env-manager/api` prefix not claimed by the shell.

Record the outcome in `api-verification.md` §4 (replace "verify" with the result).
Acceptance: each item has a pass/fail note and, on failure, the fallback is applied.

## 3. Domain and storage

### T03 — Domain model

Files: `src/domain/types.ts`, `src/domain/schemas.ts`, `src/domain/constants.ts`,
`src/domain/errors.ts`.

Include: enums, record interfaces, Zod schemas, `parseRecord`, `ErrorCode` union,
`EnvManagerError`, `normalizeId`, `nowIso`.

Tests (`tests/domain/schemas.test.ts`): valid records from the docs; unknown keys
(rejected on save, preserved on read); bad id; bad timestamp; `location.kind` mismatch;
empty `deployModes`.

Acceptance: every YAML example in `docs/05-domain/*.md` parses.

### T04 — Storage

Files: `src/storage/paths.ts`, `atomic.ts`, `records.ts`, `sessions.ts`, `layout.ts`.

Behavior: data dir resolution (§4.1), id/path guards, atomic write with backup
rotation, read with diagnostics, delete, session read/write, startup `.tmp` cleanup.

Tests (`tests/storage/*.test.ts`): round trip; missing file; invalid YAML; traversal
rejection; backup cap; concurrent writes serialize; session corrupt fallback.

Acceptance: no write leaves a partial file; a killed write leaves only a `.tmp`.

## 4. Registry

### T05 — Loader and snapshot

Files: `src/registry/registry.ts`, `src/registry/aliases.ts`.

Behavior: scan five directories, parse, skip invalid with diagnostics, duplicate id,
alias map, deterministic ordering, in-flight dedupe, reload per request.

Tests: empty dirs; mixed valid/invalid; duplicate id; alias collision; reload after
write.

### T06 — Integrity

Files: `src/registry/integrity.ts`.

Behavior: table in `detailed-design.md` §6.3, diagnostics only.

Tests: each reference kind missing; a completely consistent fixture yields zero
errors.

## 5. Resolver

### T07 — Template engine

Files: `src/resolver/template.ts`, `src/resolver/graph.ts`.

Behavior: scanner (§7.1), ref graph, iterative DFS, cycle path, undefined refs.

Tests: literals; multiple refs; malformed `${`; `}` alone; cycle A→B→A; self-cycle;
undefined; 2048-char cap.

### T08 — Layers, merge, context

Files: `src/resolver/layers.ts`, `merge.ts`, `context.ts`, `provenance.ts`.

Behavior: ordered layers, field-level merge, shadowed list, eager field selection,
runtime-specific log source and class location, path traversal check, provenance.

Tests: the worked example from `design.md` §6.9; environment override changes a
dependent path while `definedBy` stays at the service layer; deployment variables win;
missing optional deployment.

Acceptance: AC-03 and AC-04 pass.

## 6. Router

### T09 — Matching and selection

Files: `src/router/match.ts`, `src/router/router.ts`.

Behavior: eligibility, level derivation, top-level selection, same-level conflict with
all candidates.

Tests: each level; higher level wins; disabled binding ignored; conflict; no binding.

### T10 — Skills, policy, parameters

Files: `src/router/skills.ts`, `policy.ts`, `parameters.ts`.

Behavior: `SkillDirectory` adapter over `ctx.skills` (`snapshot`, `complete`), source
and provider checks, write-operation approval defaults, production denial, template
parameters.

Tests: fake directory for present/missing/incomplete/source mismatch/provider
mismatch; production denial; parameter failure on unresolved ref; 50-parameter cap.

Acceptance: AC-05…AC-07 pass.

## 7. Session and application

### T11 — Session store

Files: `src/session/session-context.ts`.

Tests: set/get/clear; two sessions isolated; corrupt file; unwritable dir →
`persisted: false`.

### T12 — Application service

Files: `src/app/app.ts`, `src/app/actor.ts`.

Behavior: `meta/list/get/find/save/saveYaml/remove/validate/resolve/route` and context
access, actor policy, dry-run validation, record cap.

Tests: save→get; delete referenced; dry-run writes nothing; UI production denial;
`find` by alias.

Acceptance: AC-01, AC-02, AC-08 pass at this layer.

## 8. Tools

### T13 — Tool scaffolding

Files: `src/tools/define.ts`, `src/tools/envelope.ts`, `src/tools/approval.ts`.

Shared schemas, `render` helpers, `EnvManagerError` mapping, approval helper.

### T14 — Read tools

Files: `src/tools/read.ts` (`env_list`, `env_get`, `env_find`, `env_get_context`).

Tests: output matches schema for each; invalid id code; empty registry; context with
and without a default.

### T15 — Resolve and route tools

Files: `src/tools/resolve.ts` (`env_resolve`, `env_resolve_operation`).

Tests: session default fallback; ambiguous deployment; conflict; skill unavailable;
production denial.

### T16 — Write tools

Files: `src/tools/write.ts` (`env_set_context`, `env_save`, `env_delete`).

Tests: create/update; dry-run; approval grant and denial; production save approval;
delete referenced → `RECORD_IN_USE`; delete approved removes the file.

### T17 — Validate tool

Files: `src/tools/validate.ts`.

Tests: clean fixture → `ok: true`; broken reference appears with file and code.

Acceptance: all ten tools are visible and match `tool-contract.md`.

## 9. HTTP transport

### T18 — Route

Files: `src/transport/route.ts`, `src/transport/auth.ts`, `src/transport/ops.ts`,
`src/transport/envelope.ts`.

Behavior: registration, header and origin checks, body limit, op table, status map,
actor `'ui'`, logging.

Tests (node http mocks): missing header 403; wrong origin 403; GET 405; oversize 413;
unknown op 400; not found 404; conflict 409; production write 403; happy path 200.

Acceptance: `curl` with the header returns `meta`; without it returns 403.

## 10. Client

### T19 — Module shell

Files: `client.js`.

Behavior: module loader wrapper, `inject`, locale registration (`en`/`zh`), sidebar
registration, `main` panel registration, `call()` helper, shared UI atoms.

Acceptance: panel appears; empty state renders; no console error.

### T20 — Lists and editor

Behavior: Overview, record lists with search, YAML editor with validate/save/delete,
dirty guard, production banner.

Acceptance: manual QA items 1–8 in `ui-design.md` §12.

### T21 — Context, operation, diagnostics

Behavior: provenance tables with expansion, binding selection with conflict card,
diagnostics table, bundle config page.

Acceptance: manual QA items 9–12.

### T22 — Manual QA pass

Run the full checklist in `ui-design.md` §12 in Web and Desktop, light and dark, `en`
and `zh`. Record results in `current-state.md`.

## 11. Packaging and release

### T23 — Docs and state

Update `docs/00-project/current-state.md`, `docs/README.md` index if files moved, and
`README.md` status. No architecture change without an ADR.

### T24 — Install smoke test

Install with `plugin_manager` (`install_bundle`, target = repository path), restart
DSH, run:

1. `env_validate` → clean;
2. `env_list` → includes a fixture created by `env_save`;
3. open the panel → Overview counts match;
4. set a session default with `env_set_context`, reopen the session, `env_get_context`
   returns it;
5. remove the fixture with `env_delete` (approval), confirm the file is gone.

## 12. Cut line

If time runs short, ship in this order and stop at a green build:

1. P0–P7 (Host complete, tools work through the agent).
2. T18 + T19–T20 (read/write UI for environments and services).
3. T21 (context/operation preview and diagnostics).
4. T22 full QA.

Never cut: storage atomicity, resolver provenance, router conflict handling, approval
on delete, credential redaction.

## 13. Definition of done

- [ ] `npm run build` clean.
- [ ] `npm test` green with the coverage in `detailed-design.md` §16.
- [ ] Ten tools registered and documented.
- [ ] Manual QA checklist complete.
- [ ] No plain-text credential; no `..` path escape; no auto-apply.
- [ ] `current-state.md` reflects what shipped and what did not.
