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
├── index.ts            # apply(): wiring and tool registration
├── config.ts           # plugin config schema
├── domain/
│   ├── types.ts        # interfaces and enums
│   ├── schemas.ts      # Zod schemas
│   └── constants.ts    # operation ids, limits
├── storage/
│   ├── paths.ts        # dataDir resolution
│   ├── atomic.ts       # temp+rename write
│   ├── records.ts      # read/write one record
│   └── sessions.ts     # session state files
├── registry/
│   ├── registry.ts     # load, lookup, reload
│   └── validation.ts   # referential integrity
├── resolver/
│   ├── template.ts     # ${...} parsing and resolution
│   ├── layers.ts       # merge with precedence
│   ├── provenance.ts   # provenance construction
│   └── context.ts      # ServiceContext assembly
├── router/
│   ├── match.ts        # match level classification
│   ├── router.ts       # selection, conflicts
│   ├── policy.ts       # approval and production rules
│   └── parameters.ts   # parameter mapping
├── session/
│   └── session-context.ts
├── memory-bridge/
│   ├── contract.ts
│   └── null-adapter.ts
├── tools/
│   ├── read.ts         # env_list/get/find/resolve/... 
│   ├── manage.ts       # env_save/env_delete/env_validate
│   └── envelope.ts     # result envelope + redaction
└── logger.ts
```

## `tests/`

```text
tests/
├── domain/
├── storage/
├── registry/
├── resolver/
├── router/
├── session/
├── tools/
└── fixtures/
```

- One test file per module: `<module>.test.ts`.
- Fixtures are small YAML files with obviously fake values.
- Never commit real hostnames, IPs, URLs or credentials.

## Adding a module

1. It must fit an existing boundary in `module-boundaries.md`.
2. A new boundary needs an ADR.
3. Update the tree in this document and in `AGENTS.md`.
