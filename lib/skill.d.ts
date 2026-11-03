export declare const ENV_MANAGER_SKILL_NAME = "dsh-env-manager";
export declare const ENV_MANAGER_SKILL_DESCRIPTION = "Use when the user mentions DSH Environment Manager, a registered environment, host, service, deployment, log collection, restart or deploy, or asks where a registered service runs.";
export declare const ENV_MANAGER_SKILL_WHEN_TO_USE = "The user asks which environment to use, where a registered service or host runs, how to find its paths or logs, or wants an operation on a registered environment.";
export declare const ENV_MANAGER_SKILL_CONTENT = "# DSH Environment Manager\n\nUse the environment registry as the source of truth for registered environments, hosts,\nservices, deployments and operation routes. This is not the operating-system or Python\n\"environment\"; it is the DSH Environment Manager registry.\n\n## Workflow\n\n1. Discover before guessing.\n   - Use `env_list` for an inventory.\n   - Use `env_find` with an id, name, alias or category fragment.\n   - If more than one candidate matches, ask which one the user means; do not pick one.\n\n2. Pin the session when the user commits to one environment.\n   - Call `env_set_context` with the environment id.\n   - Use `env_get_context` to confirm it.\n   - Once pinned, later calls may omit `environmentId`.\n\n3. Resolve concrete context.\n   - Use `env_get` when the raw record or YAML is needed.\n   - Use `env_resolve` for the service context, paths, logs, variables and provenance.\n   - The environment is optional: `env_resolve` with only a service returns the\n     service-level context; add the environment when the question is scoped to one.\n   - Prefer the resolver over reconstructing paths from templates.\n\n4. Route an operation before acting.\n   - Before deploy-code / replace, redeploy, restart, rollback, collect-logs or a similar\n     action, call `env_resolve_operation` with the environment and the service (or\n     deployment). Operations always run inside an environment: select one first.\n   - Environment-scoped operations (`deploy-environment`) target the environment itself\n     (management plane, VM scenarios) and need no service.\n   - A missing, ambiguous or conflicting binding is an error; do not invent a skill or\n     fall back to a different environment.\n   - `env_resolve_operation` returns a route; it does not execute the skill.\n\n## Boundaries\n\n- Do not assume the current workspace's files are the registry.\n- Do not print credential values; report only whether a credential is configured.\n- Respect approval and policy results; never bypass them because a route looks obvious.\n- If the user says \"not this environment\", clear or replace the session default with\n  `env_set_context`; do not silently keep the old one.\n";
export interface EnvironmentManagerSkill {
    name: string;
    description: string;
    whenToUse: string;
    content: string;
    source: 'runtime';
    provider: string;
    invocation: {
        modelInvocable: boolean;
        userInvocable: boolean;
    };
}
export declare function createEnvironmentManagerSkill(): EnvironmentManagerSkill;
