# Prompt Template

Templates for presenting tool results to an Agent. Keep them compact; do not dump the whole registry.

## Service Context

```markdown
# Service Context

Environment: {environmentId} ({environmentName}, {environmentCategory})
Service:     {serviceId} ({serviceName})
Deployment:  {deploymentId} ({runtimeMode})
Status:      {status}

## Source

- Git: {source.gitUrl} ({source.defaultBranch})
- Module: {source.modulePath}

## Location

{locationSummary}

## Log source

{logSourceSummary}

## Resolved paths

| Field | Value | Defined by | Inputs |
|---|---|---|---|
{pathRows}

## Class location

{classLocationSummary}

## Credentials

- {ref} — {status}

## Diagnostics

{diagnostics}
```

Rules:

- Mark derived values as derived; do not imply they exist.
- Show provenance for every path, because that is how users debug overrides.
- Never include credential values.

## Operation Resolution

```markdown
# Operation Resolution

Operation: {operation}
Context:   {environmentId} / {serviceId} / {deploymentId}
Binding:   {matchedBindingId} (level: {matchLevel})
Skill:     {skill.name} (available: {skill.available})
Policy:    requiresApproval={policy.requiresApproval}, allowProduction={policy.allowProduction}

## Parameters

- {key}: {value}

## Diagnostics

{diagnostics}
```

Rules:

- If the result is a conflict, list every candidate binding and its level.
- If the Skill is unavailable, state why and do not suggest an alternative Skill.
- Never present a routing result as permission to execute.

## Environment Summary

```markdown
# Environments

| Environment | Category | Hosts | Clusters | Services |
|---|---|---|---|---|
{rows}
```

Keep list output under 50 rows; point the reader at `env_get` for detail.
