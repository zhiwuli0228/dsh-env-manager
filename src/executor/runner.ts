import { spawn } from 'node:child_process'
import { EXECUTION_LIMITS } from '../domain/constants.js'

export interface RunSpec {
  /** Executable path/name. Never a shell string. */
  command: string
  args: string[]
  cwd: string
  timeoutMs: number
  signal?: AbortSignal
}

export interface RunResult {
  exitCode: number | null
  stdout: string
  stderr: string
  timedOut: boolean
  aborted: boolean
  /** Spawn failure (missing executable, bad cwd, ...). */
  error?: string
}

export interface ProcessRunner {
  run(spec: RunSpec): Promise<RunResult>
}

/**
 * Default runner: spawns without a shell, bounds captured output, and kills the
 * child on timeout or abort. Output is truncated at `EXECUTION_LIMITS.outputBytes`
 * per stream to keep experience records bounded.
 */
export const nodeRunner: ProcessRunner = {
  async run(spec): Promise<RunResult> {
    const maxBytes = EXECUTION_LIMITS.outputBytes
    return new Promise<RunResult>((resolve) => {
      let child: ReturnType<typeof spawn>
      try {
        child = spawn(spec.command, spec.args, {
          cwd: spec.cwd,
          shell: false,
          stdio: ['ignore', 'pipe', 'pipe'],
          env: { ...process.env },
        })
      } catch (error) {
        resolve({
          exitCode: null,
          stdout: '',
          stderr: '',
          timedOut: false,
          aborted: false,
          error: error instanceof Error ? error.message : String(error),
        })
        return
      }

      let stdout = ''
      let stderr = ''
      let settled = false
      const finish = (result: RunResult) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve(result)
      }
      const append = (chunk: Buffer, target: 'out' | 'err') => {
        if (settled) return
        const text = chunk.toString('utf8')
        if (target === 'out') {
          if (stdout.length < maxBytes) stdout += text.slice(0, maxBytes - stdout.length)
        } else if (stderr.length < maxBytes) {
          stderr += text.slice(0, maxBytes - stderr.length)
        }
      }
      child.stdout?.on('data', (chunk) => append(chunk, 'out'))
      child.stderr?.on('data', (chunk) => append(chunk, 'err'))

      const kill = (signal: NodeJS.Signals = 'SIGTERM') => {
        try {
          child.kill(signal)
        } catch {
          // The child may already be gone; the close handler settles the result.
        }
        setTimeout(() => {
          try {
            child.kill('SIGKILL')
          } catch {
            // Best effort.
          }
        }, 2000).unref()
      }

      const timer = setTimeout(() => {
        finish({
          exitCode: null,
          stdout,
          stderr,
          timedOut: true,
          aborted: false,
        })
        kill()
      }, spec.timeoutMs)
      timer.unref?.()

      if (spec.signal) {
        if (spec.signal.aborted) {
          finish({ exitCode: null, stdout, stderr, timedOut: false, aborted: true })
          kill()
        } else {
          spec.signal.addEventListener(
            'abort',
            () => {
              finish({ exitCode: null, stdout, stderr, timedOut: false, aborted: true })
              kill()
            },
            { once: true },
          )
        }
      }

      child.on('error', (error) => {
        finish({
          exitCode: null,
          stdout,
          stderr,
          timedOut: false,
          aborted: false,
          error: error.message,
        })
      })
      child.on('close', (code) => {
        finish({ exitCode: code, stdout, stderr, timedOut: false, aborted: false })
      })
    })
  },
}
