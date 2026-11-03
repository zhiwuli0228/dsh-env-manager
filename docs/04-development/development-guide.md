# Development Guide

> Status: this guide describes the V1 target. The repository currently ships the JavaScript skeleton; `src/`, `lib/`, `tsconfig.json` and the npm scripts are added during V1 implementation. See `docs/00-project/current-state.md`.

## Prerequisites

- Node.js matching the DSH runtime
- npm

## First Run

```bash
npm install
npm run build
npm test
```

## Project Layout

```text
dsh-env-manager/
├── index.js          # Host entry shim over lib/index.js
├── client.js         # Client module (plain JS)
├── cordis.patch.yml  # Cordis patch
├── package.json      # Bundle manifest
├── tsconfig.json     # Host build config
├── src/              # TypeScript host sources
├── lib/              # Build output (git-ignored)
├── locale/           # Display metadata
├── docs/             # Project documentation
├── data/             # Runtime registry data (git-ignored)
└── tests/            # Vitest tests
```

## Build

```bash
npm run build          # tsc -p tsconfig.json
npm run build:watch    # optional watch mode
```

The Host entry `index.js` re-exports `lib/index.js`. Do not edit `lib/` by hand.

## Test

```bash
npm test               # vitest run
npm run test:watch     # vitest
```

## Install in a DSH Profile

In a DSH session, call the `plugin_manager` tool with `action: install_bundle` and the absolute repository path as `target`. Restart DSH if the bundle was already installed.

Do not use `dsh plugin add` for bundle selection; that forwards to pnpm only.

## Development Loop

1. Read the relevant docs (`docs/README.md` decides which).
2. Change `src/` or `client.js`.
3. Build and test.
4. Reinstall the bundle to see Host/Client changes.
5. Update `docs/00-project/current-state.md`.

## Client Changes

`client.js` is plain JavaScript and needs no build. The Host serves it as the bundle's `./client` export.

Keep the module-loader wrapper intact:

```js
window.__ModuleLoader__.load({ id: 'dsh-env-manager-plugin', factory(require) { ... } })
```

The loader `id` must be the full package name (`dsh-env-manager-plugin`): the client module
table keys every entry by package name and materializes the factory under that exact id.
Registering under any other name leaves the module unimportable and the panel never mounts.

## Data Directory

Do not commit `data/`. It is created on first run at the resolved `dataDir`; the startup log reports the path.

## Updating Docs

After every meaningful change update:

- `docs/00-project/current-state.md`
- the matching architecture document when behavior or schemas changed
- OpenSpec artifacts when used
