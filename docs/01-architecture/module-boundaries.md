# Module Boundaries

## api / tools

DSH Tool function layer only.

Allowed:

- Request validation
- Response formatting
- Calling resolver/router functions
- Emitting operation records

Forbidden:

- Direct file I/O
- Rule resolution logic
- Skill matching logic
- Credential resolution

## storage

Responsible for registry persistence.

Responsibilities:

- Read/write environment records
- Read/write service records
- Read/write deployment binding records
- Read/write rule profile records
- Read/write operation binding records
- Atomic writes and basic validation

Must not:

- Interpret rules
- Resolve skill bindings
- Touch credential values

## registry

In-memory registry built from storage.

Responsibilities:

- Load and cache registry files
- Provide lookup by id/name
- Validate uniqueness and referential integrity
- Expose query interfaces

Must not:

- Perform I/O directly (uses storage)
- Run rule templates

## resolver

Pure functions for context and rule resolution.

Responsibilities:

- Build Service Context from registry records
- Resolve layered rules with provenance
- Validate variable definitions and detect cycles
- Return structured, safe output

Must not:

- Read files directly
- Access credentials
- Register tools

## router

Pure functions for operation-to-skill routing.

Responsibilities:

- Match operation bindings by scope and priority
- Detect conflicts
- Verify skill references
- Map parameters
- Evaluate approval policies

Must not:

- Execute skills
- Access credential values
- Write operation records directly

## memory-bridge

Optional integration with the memory plugin.

Responsibilities:

- Emit Operation Records
- Query observations and playbooks by scope
- Generate candidate proposals

Must not:

- Store environment facts
- Modify registry files
- Auto-apply proposals
