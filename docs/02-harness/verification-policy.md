# Verification Policy

## Required Verification

Every implementation task must include at least one of:

- Unit tests for new pure functions
- Integration tests for storage or tool functions
- Manual UI verification checklist
- Output file contract validation

## Test Categories

### Resolver Tests

- Context resolution with full data
- Context resolution with missing optional data
- Rule override precedence
- Variable cycle detection
- Undefined variable handling

### Router Tests

- Exact match
- Priority fallback
- Conflict detection
- Skill availability failure
- Approval policy evaluation

### Storage Tests

- Atomic write/read
- Missing file handling
- Schema version mismatch
- Referential integrity (best-effort)

### UI Tests

Manual checklist:

- Configuration panel loads
- Environment/service/deployment CRUD works
- Rule preview updates correctly
- Context preview displays expected values
