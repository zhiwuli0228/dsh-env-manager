# Coding Style

## TypeScript (Host)

- `strict: true`; do not disable it locally.
- Prefer `interface` for records, `type` for unions and aliases.
- No `any` at module boundaries. Use `unknown` and validate.
- Validate all external input (YAML, tool arguments) with Zod.
- Prefer `readonly` for data that must not be mutated.
- Return discriminated unions instead of throwing for expected failures:

```ts
type ResolveResult =
  | { ok: true; context: ServiceContext }
  | { ok: false; diagnostics: Diagnostic[] };
```

- Throw only for programmer errors or unexpected I/O failure; catch at the tool boundary.
- No floating promises. Await or return them.

## Purity

- `resolver` and `router` are pure: no I/O, no clock, no randomness, no globals.
- Inject dependencies (`SkillDirectory`, `CredentialDirectory`) as parameters.
- Storage and registry may hold state; keep it inside instances, not module scope.

## Naming

| Kind | Style | Example |
|---|---|---|
| files | kebab-case | `service-context.ts` |
| types/interfaces | PascalCase | `DeploymentBinding` |
| functions | camelCase | `resolveContext` |
| constants | UPPER_SNAKE_CASE | `WRITE_OPERATIONS` |
| record ids | kebab-case | `deploy-001` |

## Error handling

- Every failure carries a `code` from the diagnostics catalogue.
- Messages are user-facing and must not include secrets.
- Never swallow an error silently. If it is expected, convert it to a diagnostic.

## JavaScript (Client)

- ES modules; the artifact is the module-loader wrapper.
- `React.createElement` (`h(...)`), no JSX.
- No global side effects at module load beyond `load({...})`.
- Register every slot, listener and style through `ctx.effect` and return cleanup.
- Route visible text through the client locale service.

## Formatting

- 2 spaces
- single quotes
- no semicolons
- trailing commas in multi-line literals
- LF line endings

## Comments

- JSDoc on exported functions and non-obvious invariants.
- Explain why, not what.
- Reference the design section when implementing a non-trivial rule, e.g. `// design §6.4`.
