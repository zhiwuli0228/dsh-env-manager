# Proposal Rule

A proposal must explain why the change is needed and what it changes.

## Required Sections

### 1. Problem

Describe the user-visible or engineering problem.

### 2. Goal

Describe the intended outcome.

### 3. Scope

List what is included.

### 4. Out of Scope

List what is explicitly excluded.

### 5. Affected Modules

Choose from:

- tools
- domain
- config
- storage
- registry
- resolver
- router
- session
- memory-bridge
- client
- docs

### 6. Storage Impact

State whether the change affects:

- `data/environments/*.yaml`
- `data/services/*.yaml`
- `data/deployments/*.yaml`
- `data/rules/*.yaml`
- `data/operations/*.yaml`
- `data/sessions/*.json`
- `schemaVersion` (record compatibility)

### 7. Constraints

Must confirm:

- No plain-text credentials introduced.
- No arbitrary code execution in rule templates.
- No auto-apply of production changes.
- File-based source of truth remains unchanged.

### 8. Risks

List implementation risks.

### 9. Verification

Describe how to verify.

## Proposal Quality Bar

A good proposal is small enough to implement and test in one focused change.
