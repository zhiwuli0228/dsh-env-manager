import { afterEach, describe, expect, it } from 'vitest'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import {
  binding,
  cleanup,
  deployment,
  drGroup,
  environment,
  environmentB,
  ruleProfile,
  service,
  tempDir,
  writeFixture,
  writeRecord,
} from '../helpers.js'
import { App } from '../../src/app/app.js'
import { silentLogger } from '../../src/logger.js'

const dirs: string[] = []

afterEach(async () => {
  await Promise.all(dirs.splice(0).map(cleanup))
})

async function makeDir(): Promise<string> {
  const dir = await tempDir()
  dirs.push(dir)
  return dir
}

function makeApp(dataDir: string, overrides: Partial<ConstructorParameters<typeof App>[0]> = {}) {
  return new App({
    dataDir,
    maxRecords: 100,
    writePolicy: { allowUiProductionWrites: false },
    skills: null,
    credentials: { async describe() { return { configured: false } } },
    logger: silentLogger,
    ...overrides,
  })
}

function deploymentFor(envId: string, index: number) {
  if (envId === 'test-b') {
    return {
      ...structuredClone(deployment),
      id: `deploy-b-${index}`,
      environmentId: 'test-b',
      runtimeMode: 'native',
      location: { kind: 'native', hostRef: 'host-b-01' },
      variables: { replicaCount: 1 },
    }
  }
  return { ...structuredClone(deployment), id: `deploy-a-${index}`, environmentId: 'test-a' }
}

function bundleFor() {
  return {
    version: 1,
    environments: [structuredClone(environment), structuredClone(environmentB)],
    services: [structuredClone(service)],
    deployments: [deploymentFor('test-a', 1), deploymentFor('test-b', 1)],
    ruleProfiles: [structuredClone(ruleProfile)],
    operationBindings: [
      {
        ...structuredClone(binding),
        id: 'binding-bundle-a',
        match: { environmentId: 'test-a', serviceId: 'aicoservice' },
      },
      {
        ...structuredClone(binding),
        id: 'binding-bundle-b',
        match: { environmentId: 'test-b', serviceId: 'aicoservice' },
      },
    ],
    drGroups: [structuredClone(drGroup)],
  }
}

describe('bundle import', () => {
  it('imports a whole bundle in one call and the registry validates', async () => {
    const dir = await makeDir()
    const app = makeApp(dir)
    const result = await app.importBundle({ document: bundleFor(), confirm: true })
    expect(result.failed).toEqual([])
    expect(result.imported).toHaveLength(9)
    expect(result.skipped).toEqual([])

    const report = await app.validate()
    expect(report.diagnostics.filter((item) => item.severity === 'error')).toHaveLength(0)
    expect(report.counts).toMatchObject({
      environments: 2,
      services: 1,
      deployments: 2,
      ruleProfiles: 1,
      operationBindings: 2,
      drGroups: 1,
    })
  })

  it('keeps existing records with mode skip', async () => {
    const dir = await makeDir()
    await writeFixture(dir)
    const app = makeApp(dir)
    const result = await app.importBundle({ document: bundleFor(), mode: 'skip', confirm: true })
    expect(result.skipped.map((item) => item.id)).toContain('test-a')
    expect(result.imported.map((item) => item.id)).toContain('test-b')
  })

  it('replaces existing records with mode overwrite', async () => {
    const dir = await makeDir()
    await writeFixture(dir)
    const app = makeApp(dir)
    const doc = bundleFor()
    const before = (await app.get('environment', 'test-a')).record.name
    doc.environments![0] = { ...structuredClone(environment), name: 'Test A Overwritten' }
    const result = await app.importBundle({ document: doc, mode: 'overwrite', confirm: true })
    expect(result.skipped).toEqual([])
    expect(result.imported.map((item) => item.id)).toContain('test-a')
    const after = (await app.get('environment', 'test-a')).record.name
    expect(before).toBe('Test A')
    expect(after).toBe('Test A Overwritten')
  })

  it('fails conflicting records with mode error', async () => {
    const dir = await makeDir()
    await writeFixture(dir)
    const app = makeApp(dir)
    const result = await app.importBundle({ document: bundleFor(), mode: 'error', confirm: true })
    expect(result.failed.some((item) => item.code === 'RECORD_EXISTS' && item.id === 'test-a')).toBe(true)
    expect(result.imported.map((item) => item.id)).toContain('test-b')
  })

  it('rejects invalid records with RECORD_INVALID and imports the rest', async () => {
    const dir = await makeDir()
    const app = makeApp(dir)
    const doc = bundleFor()
    doc.environments![1] = { ...structuredClone(environmentB), id: 'Bad ID!' }
    const result = await app.importBundle({ document: doc, confirm: true })
    expect(result.failed.some((item) => item.code === 'RECORD_INVALID')).toBe(true)
    expect(result.imported.map((item) => item.id)).toContain('test-a')
    expect(result.imported.map((item) => item.id)).not.toContain('test-b')
  })

  it('fails records whose references do not resolve in the bundle or registry', async () => {
    const dir = await makeDir()
    const app = makeApp(dir)
    const doc = bundleFor()
    doc.deployments![0] = { ...structuredClone(deployment), id: 'deploy-orphan', environmentId: 'missing-env' }
    const result = await app.importBundle({ document: doc, confirm: true })
    expect(result.failed.some((item) => item.code === 'ENV_NOT_FOUND' && item.id === 'deploy-orphan')).toBe(true)
    expect(result.imported.map((item) => item.id)).not.toContain('deploy-orphan')
  })

  it('fails a drGroup whose member environment is missing', async () => {
    const dir = await makeDir()
    const app = makeApp(dir)
    const doc = bundleFor()
    doc.drGroups![0] = {
      ...structuredClone(drGroup),
      members: [
        { environmentId: 'test-a', role: 'primary' },
        { environmentId: 'ghost-env', role: 'standby' },
      ],
    }
    const result = await app.importBundle({ document: doc, confirm: true })
    expect(result.failed.some((item) => item.code === 'DR_GROUP_MEMBER_UNKNOWN')).toBe(true)
  })

  it('never accepts passwords: a secret field fails validation', async () => {
    const dir = await makeDir()
    const app = makeApp(dir)
    const doc = bundleFor()
    doc.environments![1] = { ...structuredClone(environmentB), sshPassword: 'hunter2' }
    const result = await app.importBundle({ document: doc, confirm: true })
    expect(result.failed.some((item) => item.code === 'RECORD_INVALID')).toBe(true)
  })

  it('rejects unknown bundle fields and oversized bundles', async () => {
    const dir = await makeDir()
    const app = makeApp(dir)
    await expect(
      app.importBundle({ document: { version: 1, envs: [] } }),
    ).rejects.toThrow(/Unknown bundle field/)
    await expect(
      app.importBundle({ document: { version: 2, environments: [] } }),
    ).rejects.toThrow(/Unsupported bundle version/)

    const many = { version: 1, environments: Array.from({ length: 501 }, (_, i) => ({ ...structuredClone(environment), id: `env-${i}` })) }
    await expect(app.importBundle({ document: many })).rejects.toThrow(/exceeds/)
  })

  it('gates production imports behind confirmation', async () => {
    const dir = await makeDir()
    const app = makeApp(dir)
    await expect(app.importBundle({ document: bundleFor() })).rejects.toMatchObject({
      code: 'APPROVAL_REQUIRED',
    })
    const ok = await app.importBundle({ document: bundleFor(), confirm: true })
    expect(ok.failed).toEqual([])
  })

  it('blocks the panel (actor ui) from importing production records by policy', async () => {
    const dir = await makeDir()
    const app = makeApp(dir)
    await expect(
      app.importBundle({ document: bundleFor(), confirm: true }, 'ui'),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
    const open = makeApp(dir, { writePolicy: { allowUiProductionWrites: true } })
    const ok = await open.importBundle({ document: bundleFor(), confirm: true }, 'ui')
    expect(ok.failed).toEqual([])
  })

  it('preserves the createdAt of an overwritten record', async () => {
    const dir = await makeDir()
    await writeFixture(dir)
    const app = makeApp(dir)
    const doc = bundleFor()
    doc.environments![0] = { ...structuredClone(environment), name: 'Kept Created At' }
    await app.importBundle({ document: doc, mode: 'overwrite', confirm: true })
    const record = (await app.get('environment', 'test-a')).record
    expect(record.createdAt).toBe('2026-11-01T03:00:00.000Z')
    expect(record.updatedAt).not.toBe(record.createdAt)
  })
})

describe('bundle export', () => {
  it('exports the whole registry', async () => {
    const dir = await makeDir()
    await writeFixture(dir)
    const app = makeApp(dir)
    const bundle = await app.exportBundle()
    expect(bundle.version).toBe(1)
    expect(bundle.environments?.map((record) => record.id)).toEqual(['test-a'])
    expect(bundle.services?.map((record) => record.id)).toEqual(['aicoservice'])
    expect(bundle.operationBindings?.map((record) => record.id)).toEqual(['binding-001'])
  })

  it('exports a selected environment plus everything that references it', async () => {
    const dir = await makeDir()
    await writeFixture(dir)
    await writeRecord(dir, 'environment', environmentB)
    const app = makeApp(dir)
    const bundle = await app.exportBundle(['test-b'])
    expect(bundle.environments?.map((record) => record.id)).toEqual(['test-b'])
    expect(bundle.deployments).toEqual([])
    expect(bundle.services).toEqual([])
    // A service binding for test-a must not leak into the test-b bundle.
    expect(bundle.operationBindings).toEqual([])
    expect(bundle.drGroups).toEqual([])
  })

  it('exports the DR group with its environments', async () => {
    const dir = await makeDir()
    await writeFixture(dir)
    await writeRecord(dir, 'environment', environmentB)
    await writeRecord(dir, 'drGroup', drGroup)
    const app = makeApp(dir)
    const bundle = await app.exportBundle(['test-a', 'test-b'])
    expect(bundle.environments).toHaveLength(2)
    expect(bundle.drGroups?.map((record) => record.id)).toEqual(['drg-test'])
  })
})
