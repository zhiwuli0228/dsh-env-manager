# Coding Style

## General

- Use ES modules (`import`/`export`).
- Prefer `const` and `let` over `var`.
- Use descriptive names.
- Keep functions small and focused.

## Formatting

- 2 spaces indentation
- Single quotes for strings
- Trailing commas in multi-line objects/arrays
- No semicolons (project preference; update if team differs)

## Naming

- Files: kebab-case
- Functions: camelCase
- Constants: UPPER_SNAKE_CASE
- Classes: PascalCase

## Error Handling

- Use explicit error types where helpful.
- Return structured errors from tools.
- Never expose credential values in error messages.

## Comments

- Document public APIs with JSDoc.
- Explain why, not what.
