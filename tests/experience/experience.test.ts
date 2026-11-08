import { afterEach, describe, expect, it } from 'vitest'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { cleanup, environment, tempDir, writeFixture, writeRecord } from '../helpers.js'
import { App } from '../../src/app/app.js'
import { silentLogger } from '../../src/logger.js'
import type { ProcessRunner, RunSpec } from '../../src/executor/runner.js'

const dirs: string[] = []

afterEach(async () => {
  await Promise.all(dirs.splice(0).map(cleanup))
})

async function makeDir(): Promise<string> {
  const dir = await tempDir('dsh-env-manager-exp-')
  dirs.push(dir)
  return dir
}

function fakeRunner(exitCode = 0, stdout = 'ok') {
  const specs: RunSpec[] = []
  const runner: ProcessRunner = {
    async run(spec) {
      specs.push(spec)
      return { exitCode, stdout, stderr: '', timedOut: false, aborted: false }
    },
  }
  return { runner, specs }
}

function expectNoUndefined(value: unknown): void {
  if (Array.isArray(value)) {
    for (const item of value) expectNoUndefined(item)
    return
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      expect(item, `key "${key}" must not be undefined`).not.toBeUndefined()
      expectNoUndefined(item)
    }
  }
}

function makeApp(dataDir: string, runner?: ProcessRunner) {
  return new App({
    dataDir,
    maxRecords: 100,
    writePolicy: { allowUiProductionWrites: false },
    skills: null,
    credentials: {
      async describe(ref: string) {
        return { configured: true, source: 'store' }
      },
      async set() {
        return undefined
      },
      async unset() {
        return undefined
      },
    },
    logger: silentLogger,
    ...(runner ? { runner } : {}),
  })
}

function commandBinding(id: string, argv: string[]) {
  return {
    id,
    schemaVersion: 1,
    operation: 'redeploy',
    match: { environmentId: 'test-a', serviceId: 'aicoservice' },
    execute: { mode: 'command' as const, argv, timeoutSeconds: 30 },
    parameters: { ns: '${deployment.location.namespace}' },
    policy: { requiresApproval: true, allowProduction: false },
    enabled: true,
    createdAt: '2026-11-01T03:00:00.000Z',
    updatedAt: '2026-11-01T03:00:00.000Z',
  }
}

async function writeCommandBindingFixture(dataDir: string, argv: string[]) {
  await writeFixture(dataDir)
  // Remove the fixture skill binding so the execute binding is the only
  // same-level candidate for redeploy (no BINDING_CONFLICT).
  await fs.rm(path.join(dataDir, 'operations', 'binding-001.yaml'), { force: true })
  await writeRecord(dataDir, 'operationBinding', commandBinding('binding-exec', argv))
}

describe('experience loop', () => {
  it('requires approval for a gated write execution', async () => {
    const dir = await makeDir()
    await writeCommandBindingFixture(dir, ['echo', 'hi'])
    const app = makeApp(dir, fakeRunner().runner)
    await expect(
      app.operate({
        operation: 'redeploy',
        environmentId: 'test-a',
        serviceId: 'aicoservice',
        confirm: false,
      }),
    ).rejects.toMatchObject({ code: 'APPROVAL_REQUIRED' })
  })

  it('executes a command target and queues a success summary', async () => {
    const dir = await makeDir()
    await writeCommandBindingFixture(dir, ['echo', '${ns}'])
    const { runner, specs } = fakeRunner(0, 'done-1')
    const app = makeApp(dir, runner)
    const result = await app.operate({
      operation: 'redeploy',
      environmentId: 'test-a',
      serviceId: 'aicoservice',
      confirm: true,
      note: 'smoke check',
    })
    expect(result.execution.status).toBe('completed')
    expect(result.resolution.target?.mode).toBe('command')
    expect(specs).toHaveLength(1)
    // ${ns} references the resolved parameter ns → deployment.location.namespace.
    expect(specs[0]!.args).toEqual(['dv-sop'])
    expect(result.experience).toBeDefined()
    expect(result.experience!.kind).toBe('success-summary')
    expect(result.experience!.status).toBe('proposed')

    const listed = await app.listExperiences({ status: 'proposed' })
    expect(listed.items.map((item) => item.id)).toContain(result.experience!.id)
    expect(listed.items[0]!.content).toContain('done-1')
    expect(listed.items[0]!.content).toContain('note: smoke check')

    const reviewed = await app.reviewExperience(result.experience!.id, 'approve', 'agent')
    expect(reviewed.status).toBe('accepted')
    expect(reviewed.reviewedBy).toBe('agent')
  })

  it('queues a failure lesson when the command fails', async () => {
    const dir = await makeDir()
    await writeCommandBindingFixture(dir, ['false'])
    const { runner } = fakeRunner(3, 'some stdout')
    const app = makeApp(dir, runner)
    const result = await app.operate({
      operation: 'redeploy',
      environmentId: 'test-a',
      serviceId: 'aicoservice',
      confirm: true,
    })
    expect(result.execution.status).toBe('failed')
    expect(result.execution.exitCode).toBe(3)
    expect(result.experience!.kind).toBe('failure-lesson')
    expect(result.experience!.outcome).toBe('failure')
    expect(result.experience!.content).toContain('exit code: 3')
  })

  it('returns strict-JSON-safe operate results (no undefined values)', async () => {
    const dir = await makeDir()
    await writeCommandBindingFixture(dir, ['echo', 'hi'])
    const { runner, specs } = fakeRunner(0, 'done-1')
    const app = makeApp(dir, runner)
    const result = await app.operate({
      operation: 'redeploy',
      environmentId: 'test-a',
      serviceId: 'aicoservice',
      confirm: true,
    })
    expect(specs).toHaveLength(1)
    expect(result.experience).toBeDefined()
    expectNoUndefined(result)
    // Lossless JSON: round-tripping through JSON keeps the object identical.
    expect(JSON.parse(JSON.stringify(result))).toEqual(result)
  })

  it('surfaces related experiences on later routes, failures first', async () => {
    const dir = await makeDir()
    await writeCommandBindingFixture(dir, ['echo', 'hi'])
    const { runner } = fakeRunner(0, 'ok')
    const app = makeApp(dir, runner)
    await app.operate({
      operation: 'redeploy',
      environmentId: 'test-a',
      serviceId: 'aicoservice',
      confirm: true,
    })
    const { runner: failRunner } = fakeRunner(1, '')
    const failingApp = makeApp(dir, failRunner)
    const failed = await failingApp.operate({
      operation: 'redeploy',
      environmentId: 'test-a',
      serviceId: 'aicoservice',
      confirm: true,
    })
    void failed
    const resolution = await app.route({
      operation: 'redeploy',
      environmentId: 'test-a',
      serviceId: 'aicoservice',
    })
    expect(resolution.experiences).toBeDefined()
    expect(resolution.experiences!.length).toBeGreaterThanOrEqual(2)
    const kinds = resolution.experiences!.map((item) => item.kind)
    const firstFailure = kinds.indexOf('failure-lesson')
    const firstSummary = kinds.indexOf('success-summary')
    expect(firstFailure).toBeGreaterThanOrEqual(0)
    expect(firstFailure).toBeLessThan(firstSummary)
  })

  it('adds a hand-written lesson into the review queue and rejects it', async () => {
    const dir = await makeDir()
    const app = makeApp(dir)
    const added = await app.addExperience({
      operation: 'deploy-environment',
      environmentId: 'test-a',
      mode: 'skill',
      outcome: 'failure',
      kind: 'failure-lesson',
      title: 'Kubeconfig drift blocked provisioning',
      content: 'The apiEndpoint TLS cert rotated; re-run after refresh.',
      tags: ['k8s', 'provision'],
    })
    expect(added.status).toBe('proposed')
    const rejected = await app.reviewExperience(added.id, 'reject', 'ui', 'not actionable')
    expect(rejected.status).toBe('rejected')
    expect(rejected.reviewNote).toBe('not actionable')
  })

  it('skips experience recording when the binding is a skill target', async () => {
    const dir = await makeDir()
    await writeFixture(dir)
    const app = makeApp(dir, fakeRunner().runner)
    const result = await app.operate({
      operation: 'redeploy',
      environmentId: 'test-a',
      serviceId: 'aicoservice',
      confirm: true,
    })
    expect(result.execution.status).toBe('prepared')
    expect(result.execution.prepared?.kind).toBe('skill')
    expect(result.experience).toBeUndefined()
  })

  it('dryRun resolves the target and runs nothing', async () => {
    const dir = await makeDir()
    await writeCommandBindingFixture(dir, ['echo', 'hi'])
    const { runner, specs } = fakeRunner(0, 'ok')
    const app = makeApp(dir, runner)
    const result = await app.operate({
      operation: 'redeploy',
      environmentId: 'test-a',
      serviceId: 'aicoservice',
      confirm: true,
      dryRun: true,
    })
    expect(result.execution.status).toBe('prepared')
    expect(specs).toHaveLength(0)
    expect(result.experience).toBeUndefined()
  })

  it('stores experiences as YAML files under dataDir', async () => {
    const dir = await makeDir()
    await writeCommandBindingFixture(dir, ['echo', 'hi'])
    const { runner } = fakeRunner(0, 'ok')
    const app = makeApp(dir, runner)
    const result = await app.operate({
      operation: 'redeploy',
      environmentId: 'test-a',
      serviceId: 'aicoservice',
      confirm: true,
    })
    const file = path.join(dir, 'experiences', `${result.experience!.id}.yaml`)
    const text = await fs.readFile(file, 'utf8')
    expect(text).toContain('success-summary')
    expect(text).toContain('proposed')
    expect(text).not.toContain('DSH_ENV_MANAGER_')
  })

  it('handles a production environment without allowProduction', async () => {
    const dir = await makeDir()
    await writeFixture(dir)
    await writeRecord(dir, 'environment', {
      ...structuredClone(environment),
      id: 'prod-a',
      name: 'Prod A',
      category: 'production',
    })
    await writeRecord(dir, 'operationBinding', {
      ...commandBinding('binding-prod', ['echo', 'hi']),
      match: { environmentId: 'prod-a', serviceId: 'aicoservice' },
    })
    const app = makeApp(dir, fakeRunner().runner)
    await expect(
      app.operate({
        operation: 'redeploy',
        environmentId: 'prod-a',
        serviceId: 'aicoservice',
        confirm: true,
      }),
    ).rejects.toMatchObject({ code: 'POLICY_DENIED' })
  })
})
