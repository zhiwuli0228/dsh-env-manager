export const SCHEMA_VERSION = 1;
export const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,62}$/;
export const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
export const PARAMETER_KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
export const TEMPLATE_REF_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$/;
export const RECORD_KINDS = [
    'environment',
    'service',
    'deployment',
    'ruleProfile',
    'operationBinding',
];
export const KIND_DIRECTORIES = {
    environment: 'environments',
    service: 'services',
    deployment: 'deployments',
    ruleProfile: 'rules',
    operationBinding: 'operations',
};
export const STANDARD_OPERATIONS = [
    'install',
    'deploy',
    'redeploy',
    'replace',
    'restart',
    'upgrade',
    'rollback',
    'uninstall',
    'collect-logs',
    'health-check',
    'inspect',
    'upload',
    'download',
    // Environment-scoped operations: deploying/provisioning the environment itself,
    // management-plane only (VM scenarios). Kept apart from the code operations above.
    'deploy-environment',
];
export const WRITE_OPERATIONS = new Set([
    'install',
    'deploy',
    'redeploy',
    'replace',
    'restart',
    'upgrade',
    'rollback',
    'uninstall',
    'upload',
    'deploy-environment',
]);
// Operations whose target is the environment itself (management plane), not a service.
// Routing them requires an environment and matches environment-level bindings.
export const ENVIRONMENT_SCOPED_OPERATIONS = new Set([
    'deploy-environment',
]);
export const LIMITS = {
    recordBytes: 1024 * 1024,
    sessionBytes: 64 * 1024,
    templateLength: 2048,
    maxParameters: 50,
    maxDiagnostics: 200,
    maxWarnings: 20,
    backupCount: 5,
    maxSnapshotRecords: 5000,
};
// ---------------------------------------------------------------------------
// Bulk import / export and disaster-recovery marking
// ---------------------------------------------------------------------------
export const BUNDLE_LIMITS = {
    /** Maximum records in one import document, across all kinds. */
    maxRecords: 500,
    /** Serialized import document cap. */
    maxBytes: 2 * 1024 * 1024,
    /** Maximum environments in one bundle. */
    maxEnvironments: 100,
};
export const DR_LIMITS = {
    maxTypeLength: 16,
    maxScopeLength: 40,
    maxNoteLength: 2000,
    /** RPO/RTO are minutes; 0..7 days is plenty. */
    maxMinutes: 7 * 24 * 60,
};
/** Human labels for the standard DR patterns; unknown codes render as-is. */
export const DR_TYPE_LABELS = {
    AS: '主备 Active-Standby',
    AA: '双活 Active-Active',
    AP: '主从 Active-Passive',
};
// ---------------------------------------------------------------------------
// Operation execution and the experience loop
// ---------------------------------------------------------------------------
export const EXPERIENCE_DIR = 'experiences';
export const SCRIPTS_DIR = 'scripts';
export const EXECUTION_LIMITS = {
    defaultTimeoutSeconds: 600,
    maxTimeoutSeconds: 3600,
    /** Captured stdout/stderr cap per stream. */
    outputBytes: 64 * 1024,
    maxArgs: 64,
    argBytes: 1024,
    commandBytes: 4096,
};
export const EXPERIENCE_LIMITS = {
    contentBytes: 8000,
    titleLength: 120,
    maxTags: 12,
    maxList: 100,
    /** How many related experiences a resolution embeds for the model. */
    relatedOnRoute: 5,
    contentPreview: 300,
};
/** Default interpreter for a script path when the binding does not name one. */
export const INTERPRETER_BY_EXTENSION = {
    sh: 'bash',
    bash: 'bash',
    ps1: 'pwsh',
    py: 'python',
    js: 'node',
    mjs: 'node',
    cjs: 'node',
};
export function isRecordKind(value) {
    return RECORD_KINDS.includes(value);
}
//# sourceMappingURL=constants.js.map