export interface RunSpec {
    /** Executable path/name. Never a shell string. */
    command: string;
    args: string[];
    cwd: string;
    timeoutMs: number;
    signal?: AbortSignal;
}
export interface RunResult {
    exitCode: number | null;
    stdout: string;
    stderr: string;
    timedOut: boolean;
    aborted: boolean;
    /** Spawn failure (missing executable, bad cwd, ...). */
    error?: string;
}
export interface ProcessRunner {
    run(spec: RunSpec): Promise<RunResult>;
}
/**
 * Default runner: spawns without a shell, bounds captured output, and kills the
 * child on timeout or abort. Output is truncated at `EXECUTION_LIMITS.outputBytes`
 * per stream to keep experience records bounded.
 */
export declare const nodeRunner: ProcessRunner;
