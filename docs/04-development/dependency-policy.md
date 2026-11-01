# Dependency Policy

## Allowed Dependencies

- Runtime: only what is necessary and already available in DSH host/client context.
- Development: test framework, linter, formatter.

## Avoid

- Heavy libraries for simple tasks.
- Runtime dependencies that duplicate DSH built-ins.
- Optional native modules unless justified.

## Adding Dependencies

1. Propose in an OpenSpec task.
2. Explain why it is needed.
3. Verify license compatibility.
4. Update `package.json` and lockfile.
