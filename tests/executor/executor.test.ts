import { afterEach, describe, expect, it } from 'vitest'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { cleanup, tempDir } from '../helpers.js'
import { executeTarget, redactOutput } from '../../src/executor/executor.js'
import type { ProcessRunner, RunSpec } from '../../src/executor/runner.js'
import { silentLogger } from '../../src/logger.js'

const dirs: string[] = []

afterEach(async () => {
  await Promise.all(dirs.splice(0).map(cleanup))
})

async function makeDir(): Promise<string> {
  const dir = await tempDir('dsh-env-manager-exec-')
  dirs.push(dir)
  return dir
}

function fixedRunner(result: Partial<import('../../src/executor/runner.js').RunResult> = {}) {
  const specs: RunSpec[] = []
  const runner: ProcessRunner = {
    async run(spec) {
      specs.push(spec)
      return {
        exitCode: 0,
        stdout: '',
        stderr: '',
        timedOut: false,
        aborted: false,
        ...result,
      }
    },
  }
  return { runner, specs }
}

function baseTarget(mode: 'script' | 'command' | 'remote' | 'skill'): import('../../src/domain/types.js').ResolvedTarget {
  switch (mode) {
    case 'skill':
      return { mode: 'skill', skill: { name: 's', available: true } }
    case 'script':
      return { mode: 'script', script: { path: 'deploy.sh', interpreter: 'bash', args: [] } }
    case 'command':
      return { mode: 'command', command: { argv: ['echo', 'hello'], workingDirectory: undefined } }
    case 'remote':
      return {
        mode: 'remote',
        remote: {
          hostId: 'host-001',
          address: '10.0.1.10',
          port: 22,
          username: 'root',
          command: 'systemctl restart svc',
          credentialRef: 'DSH_ENV_MANAGER_TEST_A_ROOT',
        },
      }
  }
}

describe('executor', () => {
  it('redacts password-like values from output', () => {
    expect(redactOutput('token=abc123 secret: xyz')).toBe('token=*** secret: ***')
    expect(redactOutput('password: hunter2')).toBe('password: ***')
    expect(redactOutput('plain text no secret')).toBe('plain text no secret')
  })

  it('prepares skill targets without running anything', async () => {
    const { runner, specs } = fixedRunner()
    const dir = await makeDir()
    const outcome = await executeTarget({
      target: baseTarget('skill'),
      policy: { requiresApproval: true, allowProduction: false },
      writeOperation: false,
      confirm: false,
      dataDir: dir,
      runner,
      logger: silentLogger,
    })
    expect(outcome.status).toBe('prepared')
    expect(outcome.prepared?.kind).toBe('skill')
    expect(specs).toHaveLength(0)
  })

  it('prepares remote targets as an ssh descriptor and never runs locally', async () => {
    const { runner, specs } = fixedRunner()
    const dir = await makeDir()
    const outcome = await executeTarget({
      target: baseTarget('remote'),
      policy: { requiresApproval: true, allowProduction: false },
      writeOperation: true,
      confirm: true,
      dataDir: dir,
      runner,
      logger: silentLogger,
    })
    expect(outcome.status).toBe('prepared')
    expect(outcome.prepared?.kind).toBe('remote')
    expect(outcome.prepared?.remote).toMatchObject({
      address: '10.0.1.10',
      port: 22,
      username: 'root',
      command: 'systemctl restart svc',
      credentialRef: 'DSH_ENV_MANAGER_TEST_A_ROOT',
    })
    expect(specs).toHaveLength(0)
  })

  it('requires approval before a gated write execution', async () => {
    const { runner } = fixedRunner()
    const dir = await makeDir()
    await expect(
      executeTarget({
        target: baseTarget('command'),
        policy: { requiresApproval: true, allowProduction: false },
        writeOperation: true,
        confirm: false,
        dataDir: dir,
        runner,
        logger: silentLogger,
      }),
    ).rejects.toMatchObject({ code: 'APPROVAL_REQUIRED' })
  })

  it('denies execution in production unless the binding allows it', async () => {
    const { runner } = fixedRunner()
    const dir = await makeDir()
    await expect(
      executeTarget({
        target: baseTarget('command'),
        policy: { requiresApproval: false, allowProduction: false },
        writeOperation: true,
        confirm: true,
        environmentCategory: 'production',
        dataDir: dir,
        runner,
        logger: silentLogger,
      }),
    ).rejects.toMatchObject({ code: 'POLICY_DENIED' })
  })

  it('runs a command target without a shell and reports success', async () => {
    const { runner, specs } = fixedRunner({ exitCode: 0, stdout: 'done' })
    const dir = await makeDir()
    const outcome = await executeTarget({
      target: baseTarget('command'),
      policy: { requiresApproval: false, allowProduction: true },
      writeOperation: false,
      confirm: true,
      dataDir: dir,
      runner,
      logger: silentLogger,
    })
    expect(outcome.status).toBe('completed')
    expect(outcome.exitCode).toBe(0)
    expect(outcome.stdout).toBe('done')
    expect(specs).toHaveLength(1)
    expect(specs[0]!.command).toBe('echo')
    expect(specs[0]!.args).toEqual(['hello'])
    expect(specs[0]!.cwd).toBe(dir)
  })

  it('reports a failing exit code as failed', async () => {
    const { runner } = fixedRunner({ exitCode: 2, stderr: 'boom' })
    const dir = await makeDir()
    const outcome = await executeTarget({
      target: baseTarget('command'),
      policy: { requiresApproval: false, allowProduction: true },
      writeOperation: false,
      confirm: true,
      dataDir: dir,
      runner,
      logger: silentLogger,
    })
    expect(outcome.status).toBe('failed')
    expect(outcome.exitCode).toBe(2)
    expect(outcome.diagnostics.some((item) => item.code === 'EXECUTION_FAILED')).toBe(true)
  })

  it('reports a timeout as failed', async () => {
    const { runner } = fixedRunner({ exitCode: null, timedOut: true })
    const dir = await makeDir()
    const outcome = await executeTarget({
      target: { mode: 'command', command: { argv: ['sleep', '10'] }, timeoutSeconds: 1 },
      policy: { requiresApproval: false, allowProduction: true },
      writeOperation: false,
      confirm: true,
      dataDir: dir,
      runner,
      logger: silentLogger,
    })
    expect(outcome.status).toBe('failed')
    expect(outcome.diagnostics.some((item) => item.code === 'EXECUTION_TIMEOUT')).toBe(true)
  })

  it('rejects script paths that escape <dataDir>/scripts', async () => {
    const { runner } = fixedRunner()
    const dir = await makeDir()
    await expect(
      executeTarget({
        target: { mode: 'script', script: { path: '../escape.sh', interpreter: 'bash', args: [] } },
        policy: { requiresApproval: false, allowProduction: true },
        writeOperation: false,
        confirm: true,
        dataDir: dir,
        runner,
        logger: silentLogger,
      }),
    ).rejects.toMatchObject({ code: 'SCRIPT_PATH_TRAVERSAL' })
  })

  it('fails when the script file is missing', async () => {
    const { runner } = fixedRunner()
    const dir = await makeDir()
    await fs.mkdir(path.join(dir, 'scripts'), { recursive: true })
    await expect(
      executeTarget({
        target: { mode: 'script', script: { path: 'missing.sh', interpreter: 'bash', args: [] } },
        policy: { requiresApproval: false, allowProduction: true },
        writeOperation: false,
        confirm: true,
        dataDir: dir,
        runner,
        logger: silentLogger,
      }),
    ).rejects.toMatchObject({ code: 'SCRIPT_NOT_FOUND' })
  })

  it('runs a script with the resolved interpreter and script path', async () => {
    const { runner, specs } = fixedRunner({ exitCode: 0, stdout: 'ok' })
    const dir = await makeDir()
    await fs.mkdir(path.join(dir, 'scripts'), { recursive: true })
    await fs.writeFile(path.join(dir, 'scripts', 'deploy.sh'), '#!/bin/bash\necho ok', 'utf8')
    const outcome = await executeTarget({
      target: baseTarget('script'),
      policy: { requiresApproval: false, allowProduction: true },
      writeOperation: false,
      confirm: true,
      dataDir: dir,
      runner,
      logger: silentLogger,
    })
    expect(outcome.status).toBe('completed')
    expect(specs[0]!.command).toBe('bash')
    expect(specs[0]!.args[0]).toBe(path.join(dir, 'scripts', 'deploy.sh'))
  })
})
