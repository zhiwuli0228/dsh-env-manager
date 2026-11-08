import type { RecordKind } from './types.js';
export declare const SCHEMA_VERSION = 1;
export declare const ID_PATTERN: RegExp;
export declare const SESSION_ID_PATTERN: RegExp;
export declare const PARAMETER_KEY_PATTERN: RegExp;
export declare const TEMPLATE_REF_PATTERN: RegExp;
export declare const RECORD_KINDS: readonly RecordKind[];
export declare const KIND_DIRECTORIES: Record<RecordKind, string>;
export declare const STANDARD_OPERATIONS: readonly ["install", "deploy", "redeploy", "replace", "restart", "upgrade", "rollback", "uninstall", "collect-logs", "health-check", "inspect", "upload", "download", "deploy-environment"];
export declare const WRITE_OPERATIONS: ReadonlySet<string>;
export declare const ENVIRONMENT_SCOPED_OPERATIONS: ReadonlySet<string>;
export declare const LIMITS: {
    readonly recordBytes: number;
    readonly sessionBytes: number;
    readonly templateLength: 2048;
    readonly maxParameters: 50;
    readonly maxDiagnostics: 200;
    readonly maxWarnings: 20;
    readonly backupCount: 5;
    readonly maxSnapshotRecords: 5000;
};
export declare const EXPERIENCE_DIR = "experiences";
export declare const SCRIPTS_DIR = "scripts";
export declare const EXECUTION_LIMITS: {
    readonly defaultTimeoutSeconds: 600;
    readonly maxTimeoutSeconds: 3600;
    /** Captured stdout/stderr cap per stream. */
    readonly outputBytes: number;
    readonly maxArgs: 64;
    readonly argBytes: 1024;
    readonly commandBytes: 4096;
};
export declare const EXPERIENCE_LIMITS: {
    readonly contentBytes: 8000;
    readonly titleLength: 120;
    readonly maxTags: 12;
    readonly maxList: 100;
    /** How many related experiences a resolution embeds for the model. */
    readonly relatedOnRoute: 5;
    readonly contentPreview: 300;
};
/** Default interpreter for a script path when the binding does not name one. */
export declare const INTERPRETER_BY_EXTENSION: Readonly<Record<string, string>>;
export declare function isRecordKind(value: string): value is RecordKind;
