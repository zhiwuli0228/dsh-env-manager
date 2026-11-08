import { afterEach, describe, expect, it } from 'vitest'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { cleanup, drGroup, environment, environmentB, tempDir, writeFixture, writeDrFixture, writeRecord } from '../helpers.js'
import { App } from '../../src/app/app.js'
import { parseRecordInput } from '../../src/domain/schemas.js'
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

describe('drGroup schema', () => {
  it('accepts an AS group with exactly one primary', () => {
    const result = parseRecordInput('drGroup', structuredClone(drGroup))
    expect(result.ok).toBe(true)
  })

  it('rejects AS with two primaries and with no primary', () => {
    const twoPrimaries = structuredClone(drGroup)
    twoPrimaries.members[1].role = 'primary'
    expect(parseRecordInput('drGroup', twoPrimaries).ok).toBe(false)

    const noPrimary = structuredClone(drGroup)
    noPrimary.members[0].role = 'standby'
    expect(parseRecordInput('drGroup', noPrimary).ok).toBe(false)
  })

  it('accepts AA with both members primary', () => {
    const aa = structuredClone(drGroup)
    aa.type = 'AA'
    aa.members[1].role = 'primary'
    expect(parseRecordInput('drGroup', aa).ok).toBe(true)
  })

  it('rejects duplicate members, a bad type and an empty member list', () => {
    const duplicate = structuredClone(drGroup)
    duplicate.members[1].environmentId = 'test-a'
    expect(parseRecordInput('drGroup', duplicate).ok).toBe(false)

    const badType = structuredClone(drGroup)
    badType.type = 'not a token!'
    expect(parseRecordInput('drGroup', badType).ok).toBe(false)

    const empty = structuredClone(drGroup)
    empty.members = []
    expect(parseRecordInput('drGroup', empty).ok).toBe(false)
  })

  it('accepts a custom type code with RTO/RPO', () => {
    const custom = structuredClone(drGroup)
    custom.type = '2DC3C'
    custom.scope = '两地三中心'
    expect(parseRecordInput('drGroup', custom).ok).toBe(true)
  })
})

describe('drGroup registry', () => {
  it('saves, lists and reads a group, and warns about unknown members', async () => {
    const dir = await makeDir()
    await writeFixture(dir)
    const app = makeApp(dir)
    await writeRecord(dir, 'environment', environmentB)
    await app.save('drGroup', structuredClone(drGroup), { actor: 'agent' })
    const listed = await app.list('drGroup')
    expect(listed.items.map((item) => item.id)).toEqual(['drg-test'])
    expect(listed.items[0]!.summary).toContain('AS')
    expect(listed.items[0]!.summary).toContain('2 members')

    const report = await app.validate()
    expect(report.diagnostics.filter((item) => item.severity === 'error')).toHaveLength(0)
    expect(report.counts.drGroups).toBe(1)
  })

  it('reports a DR_GROUP_MEMBER_UNKNOWN warning for a missing environment', async () => {
    const dir = await makeDir()
    await writeFixture(dir)
    const app = makeApp(dir)
    const broken = structuredClone(drGroup)
    broken.members[1]!.environmentId = 'missing-env'
    await app.save('drGroup', broken, { actor: 'agent' })
    const report = await app.validate()
    expect(report.diagnostics.some((item) => item.code === 'DR_GROUP_MEMBER_UNKNOWN')).toBe(true)
  })

  it('blocks deleting an environment that a group references', async () => {
    const dir = await makeDir()
    await writeFixture(dir)
    await fs.rm(path.join(dir, 'deployments'), { recursive: true, force: true })
    await fs.rm(path.join(dir, 'operations'), { recursive: true, force: true })
    await writeRecord(dir, 'environment', environmentB)
    const app = makeApp(dir)
    await app.save('drGroup', structuredClone(drGroup), { actor: 'agent' })
    const result = await app.remove('environment', 'test-a', 'agent', { dryRun: true })
    expect(result.deleted).toBe(false)
    expect(result.blockers.some((item) => item.details?.referrer)).toBe(true)
    await expect(app.remove('environment', 'test-a', 'agent')).rejects.toThrow(/still referenced/)
  })

  it('deletes a group without touching its environments', async () => {
    const dir = await makeDir()
    await writeFixture(dir)
    await writeRecord(dir, 'environment', environmentB)
    const app = makeApp(dir)
    await app.save('drGroup', structuredClone(drGroup), { actor: 'agent' })
    const removed = await app.remove('drGroup', 'drg-test', 'agent')
    expect(removed.deleted).toBe(true)
    expect((await app.list('environment')).items).toHaveLength(2)
  })
})

describe('drGroup export', () => {
  it('exports a group with the exported environments', async () => {
    const dir = await makeDir()
    await writeFixture(dir)
    await writeDrFixture(dir)
    const app = makeApp(dir)
    const bundle = await app.exportBundle(['test-a'])
    expect(bundle.environments?.map((record) => record.id)).toEqual(['test-a'])
    expect(bundle.drGroups?.map((record) => record.id)).toEqual(['drg-test'])
    await expect(app.exportBundle(['nope'])).rejects.toThrow(/not found/)
  })
})

describe('drGroup via environment files', () => {
  it('loads a hand-written group file from drGroups/', async () => {
    const dir = await makeDir()
    await writeFixture(dir)
    await writeRecord(dir, 'environment', environmentB)
    await writeRecord(dir, 'drGroup', drGroup)
    const app = makeApp(dir)
    const group = await app.get('drGroup', 'drg-test')
    expect(group.record.name).toBe('Test DR Group')
    expect(group.yaml).toContain('type: AS')
    expect(environment.id).toBe('test-a')
  })
})
