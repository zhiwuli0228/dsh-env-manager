# Development Guide

## Getting Started

1. Clone the repository.
2. Open the project in your editor.
3. Make changes.
4. Run tests.
5. Update docs.

## Project Layout

```text
dsh-env-manager/
├── index.js          # Host plugin entry
├── client.js         # Client plugin entry
├── cordis.patch.yml  # Cordis patch
├── package.json      # Bundle manifest
├── locale/           # Display metadata
├── docs/             # Project documentation
└── tests/            # Tests (to be added)
```

## Running Locally

Install as a local DSH bundle:

```bash
dsh plugin_manager install_bundle --target .
```

Then restart DSH.

## Testing

Run tests with:

```bash
npm test
```

## Code Style

See `coding-style.md`.

## Updating Docs

After every meaningful change, update:

- `docs/00-project/current-state.md`
- Any relevant architecture or development doc
- OpenSpec artifacts if applicable
