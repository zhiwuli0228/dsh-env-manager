import { afterEach, describe, expect, it } from 'vitest'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { cleanup, environment, environmentB, tempDir, writeDrFixture, writeFixture, writeRecord } from '../helpers.js'
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

/** The primary half of the pair: test-a marks test-b as its standby peer. */
function primaryWithDr() {
  return {
    ...structuredClone(environment),
    dr: { role: 'primary', type: 'AS', peer: 'test-b', scope: '同城', rtoMinutes: 15, rpoMinutes: 5 },
  }
}

describe('environment DR schema', () => {
  it('accepts a dr block on an environment', () => {
    const result = parseRecordInput('environment', primaryWithDr())
    expect(result.ok).toBe(true)
    expect(result.record?.dr).toMatchObject({ role: 'primary', type: 'AS', peer: 'test-b' })
  })

  it('accepts environmentB (standby with peer, RTO/RPO, note)', () => {
    const result = parseRecordInput('environment', structuredClone(environmentB))
    expect(result.ok).toBe(true)
    expect(result.record?.dr).toMatchObject({
      role: 'standby',
      type: 'AS',
      peer: 'test-a',
      rtoMinutes: 15,
      rpoMinutes: 5,
    })
  })

  it('accepts AA and custom type codes', () => {
    const aa = primaryWithDr()
    aa.dr.type = 'AA'
    expect(parseRecordInput('environment', aa).ok).toBe(true)

    const custom = primaryWithDr()
    custom.dr.type = '2DC3C'
    custom.dr.scope = '两地三中心'
    expect(parseRecordInput('environment', custom).ok).toBe(true)
  })

  it('rejects a missing role, a bad type token and invalid RTO/RPO', () => {
    const noRole = primaryWithDr()
    delete noRole.dr.role
    expect(parseRecordInput('environment', noRole).ok).toBe(false)

    const badType = primaryWithDr()
    badType.dr.type = 'not a token!'
    expect(parseRecordInput('environment', badType).ok).toBe(false)

    const badRole = primaryWithDr()
    badRole.dr.role = 'witness'
    expect(parseRecordInput('environment', badRole).ok).toBe(false)

    const negative = primaryWithDr()
    negative.dr.rpoMinutes = -1
    expect(parseRecordInput('environment', negative).ok).toBe(false)

    const tooBig = primaryWithDr()
    tooBig.dr.rtoMinutes = 7 * 24 * 60 + 1
    expect(parseRecordInput('environment', tooBig).ok).toBe(false)
  })

  it('rejects an environment that names itself as its own DR peer', () => {
    const selfPeer = primaryWithDr()
    selfPeer.dr.peer = 'test-a'
    expect(parseRecordInput('environment', selfPeer).ok).toBe(false)
  })

  it('accepts an environment without any dr block', () => {
    const result = parseRecordInput('environment', structuredClone(environment))
    expect(result.ok).toBe(true)
    expect(result.record?.dr).toBeUndefined()
  })
})

describe('DR marking in the registry', () => {
  it('saves a DR-marked environment and surfaces it in the summary', async () => {
    const dir = await makeDir()
    await writeFixture(dir)
    await writeDrFixture(dir)
    const app = makeApp(dir)
    const listed = await app.list('environment')
    const standby = listed.items.find((item) => item.id === 'test-b')
    expect(standby?.summary).toContain('DR standby AS')
    expect(standby?.summary).toContain('test-a')

    const report = await app.validate()
    expect(report.diagnostics.filter((item) => item.severity === 'error')).toHaveLength(0)
    expect(report.counts.environments).toBe(2)
  })

  it('reports a DR_PEER_UNKNOWN warning when the peer environment is missing', async () => {
    const dir = await makeDir()
    await writeFixture(dir)
    // test-a exists but test-b's peer points at a ghost id.
    const broken = { ...structuredClone(environmentB), dr: { role: 'standby', type: 'AS', peer: 'ghost-env' } }
    await writeRecord(dir, 'environment', broken)
    const app = makeApp(dir)
    const report = await app.validate()
    expect(report.diagnostics.some((item) => item.code === 'DR_PEER_UNKNOWN')).toBe(true)
  })

  it('blocks deleting an environment that is a DR peer of another', async () => {
    const dir = await makeDir()
    await writeFixture(dir)
    await fs.rm(path.join(dir, 'deployments'), { recursive: true, force: true })
    await fs.rm(path.join(dir, 'operations'), { recursive: true, force: true })
    await writeDrFixture(dir)
    const app = makeApp(dir)
    const result = await app.remove('environment', 'test-a', 'agent', { dryRun: true })
    expect(result.deleted).toBe(false)
    expect(result.blockers.some((item) => item.details?.referrer?.field === 'dr.peer')).toBe(true)
    await expect(app.remove('environment', 'test-a', 'agent')).rejects.toThrow(/still referenced/)
  })

  it('deletes an environment once the DR peer link is gone', async () => {
    const dir = await makeDir()
    await writeFixture(dir)
    await fs.rm(path.join(dir, 'deployments'), { recursive: true, force: true })
    await fs.rm(path.join(dir, 'operations'), { recursive: true, force: true })
    const app = makeApp(dir)
    await app.save('environment', { ...structuredClone(environmentB), dr: undefined }, { actor: 'agent' })
    const removed = await app.remove('environment', 'test-a', 'agent')
    expect(removed.deleted).toBe(true)
    expect((await app.list('environment')).items).toHaveLength(1)
  })

  it('round-trips a hand-written environment file with a dr block', async () => {
    const dir = await makeDir()
    await writeFixture(dir)
    await writeRecord(dir, 'environment', environmentB)
    const app = makeApp(dir)
    const record = await app.get('environment', 'test-b')
    expect(record.record.dr).toMatchObject({ role: 'standby', type: 'AS', peer: 'test-a' })
    expect(record.yaml).toContain('type: AS')
  })

  // The panel links a pair by writing this half and then the mirror block on the peer.
  // This is the data contract behind that flow: two ordinary saves, one link per record.
  it('links a pair by writing both halves and keeps the summaries symmetric', async () => {
    const dir = await makeDir()
    await writeFixture(dir)
    const app = makeApp(dir, { writePolicy: { allowUiProductionWrites: true } })

    await app.save(
      'environment',
      {
        ...structuredClone(environment),
        dr: { role: 'primary', type: 'AS', peer: 'test-b', scope: '同城' },
      },
      { actor: 'ui' },
    )
    await app.save(
      'environment',
      { ...structuredClone(environmentB), dr: { role: 'standby', type: 'AS', peer: 'test-a' } },
      { actor: 'ui' },
    )

    const listed = await app.list('environment')
    const primary = listed.items.find((item) => item.id === 'test-a')
    const standby = listed.items.find((item) => item.id === 'test-b')
    expect(primary?.summary).toContain('DR primary AS → test-b')
    expect(standby?.summary).toContain('DR standby AS → test-a')
    const report = await app.validate()
    expect(report.diagnostics.filter((item) => item.severity === 'error')).toHaveLength(0)
    expect(report.diagnostics.some((item) => item.code === 'DR_PEER_UNKNOWN')).toBe(false)
  })
})

describe('DR marking export', () => {
  it('exports a DR pair when one half is selected', async () => {
    const dir = await makeDir()
    await writeFixture(dir)
    await writeDrFixture(dir)
    const app = makeApp(dir)
    const bundle = await app.exportBundle(['test-a'])
    expect(bundle.environments?.map((record) => record.id)).toEqual(['test-a', 'test-b'])
    const standby = bundle.environments?.find((record) => record.id === 'test-b')
    expect(standby?.dr).toMatchObject({ role: 'standby', peer: 'test-a' })
  })
})
