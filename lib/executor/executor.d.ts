import type { EnvironmentCategory, ExecutionOutcome, OperationPolicy, ResolvedTarget } from '../domain/types.js';
import type { Logger } from '../logger.js';
import type { ProcessRunner } from './runner.js';
export interface ExecuteInput {
    target: ResolvedTarget;
    policy: OperationPolicy;
    /** WRITE_OPERATIONS membership; drives the approval gate. */
    writeOperation: boolean;
    environmentCategory?: EnvironmentCategory;
    /** true only after the user approved the execution. */
    confirm: boolean;
    dataDir: string;
    signal?: AbortSignal;
    runner: ProcessRunner;
    logger: Logger;
}
/** Mask obvious `password=...` style values before anything is echoed or stored. */
export declare function redactOutput(text: string): string;
/**
 * Execute a resolved target under the binding policy.
 *
 * - `skill` returns a prepared reference (the agent invokes the Skill).
 * - `script` / `command` spawn a bounded local process.
 * - `remote` returns the prepared ssh descriptor; the plugin never reads the
 *   credential value, so it cannot open the connection itself.
 *
 * Throws `APPROVAL_REQUIRED` / `POLICY_DENIED` before anything runs.
 */
export declare function executeTarget(input: ExecuteInput): Promise<ExecutionOutcome>;
