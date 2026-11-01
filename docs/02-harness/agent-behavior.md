# Agent Behavior

## Required Behavior

Agents working on this project must:

- preserve the file-system-first architecture
- keep changes small and reviewable
- write tests for core logic
- update current-state.md after completion
- avoid introducing infrastructure not requested by the user
- keep tool functions thin
- keep business logic in resolver/router modules
- treat skill references as discovery, not execution authorization

## Forbidden Behavior

Agents must not:

- introduce plain-text credentials into registry files
- execute arbitrary JavaScript or shell in rule templates
- auto-apply rule or skill changes without review
- write hidden durable state outside documented directories
- silently discard resolver/router failures
- treat skill reference resolution as execution approval
- perform unrelated refactoring
- change storage contracts without documentation

## When Unclear

If the task is unclear:

1. inspect relevant docs
2. inspect source files
3. propose a small plan
4. avoid broad implementation
