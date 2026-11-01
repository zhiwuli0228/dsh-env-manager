# Dependency Policy

## Runtime dependencies

Keep the set minimal and justified:

| Package | Why |
|---|---|
| `zod` | schema validation for records and tool inputs |
| `yaml` | YAML parse/serialize with typed results |
| `@deepseek-ai/schemastery` | `Config` schema for the Host plugin |

Anything else needs a proposal that explains why the standard library and the three
packages above are insufficient.

DSH-provided packages (`@deepseek-ai/dsh-tools`, `@deepseek-ai/dsh-llm`, `cordis`) are
peers, supplied by the profile; never bundle them.

## Development dependencies

| Package | Why |
|---|---|
| `typescript` | Host build |
| `vitest` | tests |

Optional, with justification: `@types/node`, a linter, a formatter.

## Rules

1. No dependency that duplicates DSH-provided services (fs, credentials, approval, storage).
2. No database driver.
3. No client bundler unless a new ADR accepts it.
4. No native modules unless there is no alternative.
5. Check the license before adding.
6. Prefer a small maintained package over a large framework.

## Adding a dependency

1. Write an OpenSpec proposal or a task entry.
2. State the capability gap.
3. State alternatives considered.
4. Add it to `package.json` and the lockfile.
5. Mention it in `docs/01-architecture/design.md` §15.4 if it changes the build.
