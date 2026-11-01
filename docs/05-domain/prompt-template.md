# Prompt Template

## Tool Result Prompt

```markdown
# Service Context

Environment: ${environmentId}
Service: ${serviceId}
Deployment: ${deploymentId}
Runtime Mode: ${runtimeMode}

## Source

Git URL: ${source.gitUrl}

## Location

${locationDescription}

## Log Source

${logSourceDescription}

## Rules

Resolved by: ${resolvedBy}
Status: ${status}

## Credentials

${credentials.map(c => `- ${c.credentialRef} (${c.status})`).join('\n')}
```
