# Testing Guide

## Test Framework

Use Vitest or Node.js built-in test runner.

## Test Organization

```text
tests/
├── resolver.test.js
├── router.test.js
├── storage.test.js
└── fixtures/
    └── environments/
```

## Writing Tests

- Test pure functions with in-memory data.
- Use fixture files for storage tests.
- Mock DSH context for tool tests.

## Running Tests

```bash
npm test
```

## Coverage

Aim for high coverage on resolver and router logic.
