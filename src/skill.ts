export const ENV_MANAGER_SKILL_NAME = 'dsh-env-manager'

export const ENV_MANAGER_SKILL_DESCRIPTION =
  'Use when the user mentions DSH Environment Manager, a registered environment, host, service, deployment, log collection, restart or deploy, or asks where a registered service runs.'

export const ENV_MANAGER_SKILL_WHEN_TO_USE =
  'The user asks which environment to use, where a registered service or host runs, how to find its paths or logs, or wants an operation on a registered environment.'

export const ENV_MANAGER_SKILL_CONTENT = `# DSH Environment Manager

Use the environment registry as the source of truth for registered environments, hosts,
services, deployments and operation routes. This is not the operating-system or Python
"environment"; it is the DSH Environment Manager registry.

## Workflow

1. Discover before guessing.
   - Use \`env_list\` for an inventory.
   - Use \`env_find\` with an id, name, alias or category fragment.
   - If more than one candidate matches, ask which one the user means; do not pick one.

2. Pin the session when the user commits to one environment.
   - Call \`env_set_context\` with the environment id.
   - Use \`env_get_context\` to confirm it.
   - Once pinned, later calls may omit \`environmentId\`.

3. Resolve concrete context.
   - Use \`env_get\` when the raw record or YAML is needed.
   - Use \`env_resolve\` for the service context, paths, logs, variables and provenance.
   - Prefer the resolver over reconstructing paths from templates.

4. Route an operation before acting.
   - Before deploy, redeploy, restart, rollback, collect-logs or a similar action, call
     \`env_resolve_operation\` with the environment and service or deployment.
   - A missing, ambiguous or conflicting binding is an error; do not invent a skill or
     fall back to a different environment.
   - \`env_resolve_operation\` returns a route; it does not execute the skill.

## Boundaries

- Do not assume the current workspace's files are the registry.
- Do not print credential values; report only whether a credential is configured.
- Respect approval and policy results; never bypass them because a route looks obvious.
- If the user says "not this environment", clear or replace the session default with
  \`env_set_context\`; do not silently keep the old one.
`

export interface EnvironmentManagerSkill {
  name: string
  description: string
  whenToUse: string
  content: string
  source: 'runtime'
  provider: string
  invocation: {
    modelInvocable: boolean
    userInvocable: boolean
  }
}

export function createEnvironmentManagerSkill(): EnvironmentManagerSkill {
  return {
    name: ENV_MANAGER_SKILL_NAME,
    description: ENV_MANAGER_SKILL_DESCRIPTION,
    whenToUse: ENV_MANAGER_SKILL_WHEN_TO_USE,
    content: ENV_MANAGER_SKILL_CONTENT,
    source: 'runtime',
    provider: 'dsh-env-manager',
    invocation: {
      modelInvocable: true,
      userInvocable: true,
    },
  }
}
