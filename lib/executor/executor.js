import { access } from 'node:fs/promises';
import path from 'node:path';
import { EXECUTION_LIMITS, SCRIPTS_DIR } from '../domain/constants.js';
import { EnvManagerError } from '../domain/errors.js';
const SECRET_LINE = /(?:(password|passwd|pwd|secret|token|authorization|api[_-]?key))(\s*[:=]\s*)\S+/gi;
/** Mask obvious `password=...` style values before anything is echoed or stored. */
export function redactOutput(text) {
    return text.replace(SECRET_LINE, (_match, key, separator) => `${key}${separator}***`);
}
function tail(text, max = 4000) {
    if (text.length <= max)
        return text;
    return `…${text.slice(text.length - max)}`;
}
function timeoutMsOf(target) {
    const seconds = target.timeoutSeconds ?? EXECUTION_LIMITS.defaultTimeoutSeconds;
    return Math.min(Math.max(seconds, 1), EXECUTION_LIMITS.maxTimeoutSeconds) * 1000;
}
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
export async function executeTarget(input) {
    const { target } = input;
    const started = Date.now();
    if (input.writeOperation && input.policy.requiresApproval && input.confirm !== true) {
        throw new EnvManagerError('APPROVAL_REQUIRED', `Operation "${target.mode}" execution requires explicit approval (binding policy requiresApproval: true)`, { mode: target.mode });
    }
    if (input.environmentCategory === 'production' && input.policy.allowProduction !== true) {
        throw new EnvManagerError('POLICY_DENIED', 'Execution is not allowed in a production environment by this binding', { mode: target.mode });
    }
    const skillPrepared = () => ({
        status: 'prepared',
        durationMs: Date.now() - started,
        prepared: { kind: 'skill', skill: target.skill },
        diagnostics: [],
    });
    if (target.mode === 'skill')
        return skillPrepared();
    if (target.mode === 'remote') {
        const remote = target.remote;
        if (!remote) {
            throw new EnvManagerError('EXECUTION_TARGET_INVALID', 'Remote target is missing its descriptor');
        }
        return {
            status: 'prepared',
            durationMs: Date.now() - started,
            prepared: { kind: 'remote', remote },
            diagnostics: [
                {
                    code: 'REMOTE_EXECUTION_PREPARED',
                    severity: 'info',
                    message: 'Remote command prepared; the plugin cannot read the credential value, so the caller must run it over ssh',
                    details: { address: remote.address, port: remote.port, username: remote.username },
                },
            ],
        };
    }
    const diagnostics = [];
    const scriptsDir = path.join(input.dataDir, SCRIPTS_DIR);
    let command;
    let args;
    let cwd;
    if (target.mode === 'script') {
        const script = target.script;
        if (!script)
            throw new EnvManagerError('EXECUTION_TARGET_INVALID', 'Script target is missing its descriptor');
        const base = path.resolve(scriptsDir);
        const full = path.resolve(base, script.path);
        if (full !== base && !full.startsWith(`${base}${path.sep}`)) {
            throw new EnvManagerError('SCRIPT_PATH_TRAVERSAL', `Script path "${script.path}" escapes <dataDir>/scripts`, { path: script.path });
        }
        try {
            await access(full);
        }
        catch {
            throw new EnvManagerError('SCRIPT_NOT_FOUND', `Script "${script.path}" does not exist under <dataDir>/scripts`, {
                path: script.path,
            });
        }
        command = script.interpreter;
        args = [full, ...script.args];
        cwd = base;
    }
    else {
        const commandTarget = target.command;
        if (!commandTarget || commandTarget.argv.length === 0) {
            throw new EnvManagerError('EXECUTION_TARGET_INVALID', 'Command target has no argv');
        }
        const base = path.resolve(input.dataDir);
        cwd = commandTarget.workingDirectory
            ? path.resolve(base, commandTarget.workingDirectory)
            : base;
        if (cwd !== base && !cwd.startsWith(`${base}${path.sep}`)) {
            throw new EnvManagerError('SCRIPT_PATH_TRAVERSAL', `Working directory "${commandTarget.workingDirectory}" escapes <dataDir>`, { workingDirectory: commandTarget.workingDirectory });
        }
        command = commandTarget.argv[0];
        args = commandTarget.argv.slice(1);
        diagnostics.push({
            code: 'EXECUTION_PREPARED',
            severity: 'info',
            message: `Running local command ${command} with ${args.length} argument(s)`,
            details: { argv: [command, ...args] },
        });
    }
    input.logger.info(`Executing ${target.mode} target for ${input.dataDir}`);
    const result = await input.runner.run({
        command,
        args,
        cwd,
        timeoutMs: timeoutMsOf(target),
        signal: input.signal,
    });
    const durationMs = Date.now() - started;
    const stdout = redactOutput(result.stdout);
    const stderr = redactOutput(result.stderr);
    if (result.timedOut) {
        diagnostics.push({
            code: 'EXECUTION_TIMEOUT',
            severity: 'error',
            message: `Execution timed out after ${timeoutMsOf(target) / 1000}s`,
            details: { mode: target.mode },
        });
        return {
            status: 'failed',
            stdout: tail(stdout),
            stderr: tail(stderr),
            durationMs,
            diagnostics,
        };
    }
    if (result.aborted) {
        diagnostics.push({
            code: 'EXECUTION_FAILED',
            severity: 'error',
            message: 'Execution was aborted',
            details: { mode: target.mode },
        });
        return { status: 'failed', stdout: tail(stdout), stderr: tail(stderr), durationMs, diagnostics };
    }
    if (result.error) {
        diagnostics.push({
            code: 'EXECUTION_FAILED',
            severity: 'error',
            message: `Could not start execution: ${result.error}`,
            details: { mode: target.mode },
        });
        return { status: 'failed', stdout: tail(stdout), stderr: tail(stderr), durationMs, diagnostics };
    }
    if (result.exitCode === 0) {
        return {
            status: 'completed',
            exitCode: 0,
            stdout: tail(stdout),
            stderr: tail(stderr),
            durationMs,
            diagnostics,
        };
    }
    diagnostics.push({
        code: 'EXECUTION_FAILED',
        severity: 'error',
        message: `Execution exited with code ${result.exitCode ?? 'null'}`,
        details: { mode: target.mode, exitCode: result.exitCode },
    });
    return {
        status: 'failed',
        exitCode: result.exitCode ?? undefined,
        stdout: tail(stdout),
        stderr: tail(stderr),
        durationMs,
        diagnostics,
    };
}
//# sourceMappingURL=executor.js.map