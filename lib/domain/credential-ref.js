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
export const CREDENTIAL_REF_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
/** Namespace prefix for refs owned by this plugin (protects ambient refs). */
export const PLUGIN_CREDENTIAL_PREFIX = 'DSH_ENV_MANAGER_';
/** Whether a raw string is a valid DSH CredentialRef. */
export function isCredentialRef(value) {
    return CREDENTIAL_REF_PATTERN.test(value);
}
/**
 * Normalize one id segment into the `[A-Z0-9_]` alphabet: uppercase, any run
 * of characters outside it collapses to a single `_`, and leading/trailing
 * underscores are trimmed.
 */
export function normalizeCredentialSegment(segment) {
    return segment
        .toUpperCase()
        .replace(/[^A-Z0-9_]+/g, '_')
        .replace(/^_+|_+$/g, '');
}
/**
 * Build the plugin-owned ref for one environment/account pair, e.g.
 * `DSH_ENV_MANAGER_REAL_TEST_REAL_TEST_01_ROOT`. Both ids must be non-empty;
 * the result always matches {@link CREDENTIAL_REF_PATTERN}.
 */
export function credentialRefFor(environmentId, accountId) {
    const environment = normalizeCredentialSegment(environmentId);
    const account = normalizeCredentialSegment(accountId);
    if (environment.length === 0 || account.length === 0) {
        throw new TypeError('Credential refs need a non-empty environmentId and accountId to build a DSH_ENV_MANAGER_ ref');
    }
    return `${PLUGIN_CREDENTIAL_PREFIX}${environment}_${account}`;
}
//# sourceMappingURL=credential-ref.js.map