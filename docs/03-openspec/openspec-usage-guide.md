# OpenSpec Usage Guide

Use OpenSpec artifacts to plan and track changes.

## Artifact Types

- **Proposal**: Why and what we will change.
- **Design**: How we will build it.
- **Spec**: Detailed implementation contract.
- **Tasks**: Small, verifiable work items.
- **Bugfix**: Specific defect resolution.

## Workflow

1. Create a proposal in `docs/03-openspec/proposals/` (or similar).
2. Once accepted, write a design in `docs/01-architecture/designs/` (or update `design.md`).
3. Turn the design into a spec.
4. Break into tasks.
5. Implement, verify, archive.

## Naming

- Proposals: `proposal-{short-name}.md`
- Designs: `design-{short-name}.md`
- Specs: `spec-{short-name}.md`
- Tasks: embedded in implementation issue or PR description
- Bugfixes: `bugfix-{short-name}.md`

## Review

Every OpenSpec artifact should be reviewed before implementation.
