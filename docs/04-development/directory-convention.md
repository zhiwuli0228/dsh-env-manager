# Directory Convention

> Status: target layout for V1. Directories marked as V1 are created during implementation; see `docs/00-project/current-state.md`.

## Root

| Path | Purpose |
|---|---|
| `index.js` | Host entry shim; re-exports `lib/index.js` |
| `client.js` | Client module (plain JS, module-loader format) |
| `cordis.patch.yml` | Cordis bundle patch |
| `package.json` | Bundle manifest, scripts, dependencies |
| `tsconfig.json` | Host build configuration |
| `lib/` | Build output; git-ignored |
| `src/` | TypeScript Host sources |
| `tests/` | Vitest tests and fixtures |
| `data/` | Runtime registry data; git-ignored |
| `locale/` | `en.json`, `zh.json` |
| `docs/` | Project documentation |
| `icon.svg` | Plugin icon |

## `src/`

```text
src/
├── index.ts            # apply(): wiring, tools, HTTP route
├── config.ts           # schemastery Config
├── logger.ts           # ctx logger wrapper
├── domain/
│   ├── types.ts        # interfaces and enums
│   ├── schemas.ts      # Zod schemas, parseRecord
│   ├── constants.ts    # operation ids, limits, patterns
│   └── errors.ts       # EnvManagerError, codes
├── storage/
│   ├── paths.ts        # dataDir resolution, id/path guards
│   ├── atomic.ts       # temp+fsync+rename write, backups
│   ├── records.ts      # read/write/delete one record
│   ├── sessions.ts     # session state files
│   └── layout.ts       # directory creation, tmp cleanup
├── registry/
│   ├── registry.ts     # load, snapshot, lookup, reload
│   ├── aliases.ts      # alias index
│   └── integrity.ts    # referential integrity diagnostics
├── resolver/
│   ├── template.ts     # ${...} parsing and substitution
│   ├── graph.ts        # reference graph, cycles
│   ├── layers.ts       # build ordered layers
│   ├── merge.ts        # field-level merge
│   ├── context.ts      # ServiceContext assembly
│   └── provenance.ts   # provenance construction
├── router/
│   ├── match.ts        # match level classification
│   ├── router.ts       # selection, conflicts
│   ├── skills.ts       # SkillDirectory adapter
│   ├── policy.ts       # approval and production rules
│   └── parameters.ts   # parameter mapping
├── session/
│   └── session-context.ts
├── app/
│   ├── app.ts          # use cases shared by tools and HTTP
│   └── actor.ts        # 'agent' | 'ui' policy
├── tools/
│   ├── define.ts       # shared schemas and render helpers
│   ├── approval.ts     # ctx.approval wrapper
│   ├── read.ts         # env_list/get/find/get_context
│   ├── resolve.ts      # env_resolve/resolve_operation
│   ├── write.ts        # env_save/delete/set_context
│   └── validate.ts     # env_validate
├── transport/
│   ├── route.ts        # webServer registration, body handling
│   ├── auth.ts         # header, origin, size checks
│   ├── ops.ts          # op table → app calls
│   └── envelope.ts     # { ok, data } / { ok:false, error }
└── memory-bridge/
    ├── contract.ts
    └── null-adapter.ts
```

`logger.ts` sits at the root because every module may log; it must not import them.

## `tests/`

```text
tests/
├── domain/
├── storage/
├── registry/
├── resolver/
├── router/
├── session/
├── app/
├── tools/
├── http/
└── fixtures/
```

- One test file per module: `<module>.test.ts`.
- Fixtures are small YAML files with obviously fake values.
- Never commit real hostnames, IPs, URLs or credentials.

## Adding a module

1. It must fit an existing boundary in `module-boundaries.md`.
2. A new boundary needs an ADR.
3. Update the tree in this document and in `AGENTS.md`.
