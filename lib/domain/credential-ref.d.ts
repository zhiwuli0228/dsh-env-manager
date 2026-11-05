/**
 * Credential reference grammar, mirroring the DSH credential service
 * (`@deepseek-ai/dsh-credentials`): a reference is a POSIX shell identifier
 * (`/^[A-Za-z_][A-Za-z0-9_]*$/`). The DSH file-backed provider
 * (`@deepseek-ai/dsh-credentials-local`) rejects any other key inside the
 * `refs:` section of `.credentials.yaml` **at boot** — an invalid ref written
 * by a plugin makes the whole credentials document unloadable and the client
 * fails to start. Keep every ref the plugin writes inside this grammar.
 */
/** DSH CredentialRef grammar: a POSIX environment-variable-style name. */
export declare const CREDENTIAL_REF_PATTERN: RegExp;
/** Namespace prefix for refs owned by this plugin (protects ambient refs). */
export declare const PLUGIN_CREDENTIAL_PREFIX = "DSH_ENV_MANAGER_";
/** Whether a raw string is a valid DSH CredentialRef. */
export declare function isCredentialRef(value: string): boolean;
/**
 * Normalize one id segment into the `[A-Z0-9_]` alphabet: uppercase, any run
 * of characters outside it collapses to a single `_`, and leading/trailing
 * underscores are trimmed.
 */
export declare function normalizeCredentialSegment(segment: string): string;
/**
 * Build the plugin-owned ref for one environment/account pair, e.g.
 * `DSH_ENV_MANAGER_REAL_TEST_REAL_TEST_01_ROOT`. Both ids must be non-empty;
 * the result always matches {@link CREDENTIAL_REF_PATTERN}.
 */
export declare function credentialRefFor(environmentId: string, accountId: string): string;
