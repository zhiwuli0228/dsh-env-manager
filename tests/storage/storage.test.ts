import { afterEach, describe, expect, it } from 'vitest'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import {
  cleanup,
  deployment,
  environment,
  service,
  tempDir,
  writeFixture,
  writeRecord,
} from '../helpers.js'
import { parseRecord, parseRecordInput } from '../../src/domain/schemas.js'
import { loadSnapshot } from '../../src/registry/registry.js'
import { readRecordRaw, writeRecordFile } from '../../src/storage/records.js'

const dirs: string[] = []

afterEach(async () => {
  await Promise.all(dirs.splice(0).map(cleanup))
})

describe('schemas', () => {
  it('accepts a valid environment and rejects duplicate host ip', () => {
    expect(parseRecordInput('environment', structuredClone(environment)).ok).toBe(true)
    const bad = structuredClone(environment)
    bad.hosts.push({ ...bad.hosts[0]!, id: 'host-002' })
    const result = parseRecordInput('environment', bad)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.path.includes('ip'))).toBe(true)
    }
  })

  it('rejects unknown fields on write', () => {
    const bad = { ...structuredClone(environment), extra: true }
    const result = parseRecordInput('environment', bad)
    expect(result.ok).toBe(false)
  })

  it('requires runtimeMode to equal location.kind', () => {
    const bad = { ...structuredClone(deployment), runtimeMode: 'native' }
    expect(parseRecordInput('deployment', bad).ok).toBe(false)
  })
})

describe('storage', () => {
  it('writes, reads and backs up a record', async () => {
    const dir = await tempDir()
    dirs.push(dir)
    const valid = parseRecordInput('environment', structuredClone(environment))
    if (!valid.ok) throw new Error('fixture invalid')
    const record = { ...valid.record, createdAt: '2026-11-01T03:00:00.000Z', updatedAt: '2026-11-01T03:00:00.000Z' }
    await writeRecordFile(dir, 'environment', record as any)
    const first = await readRecordRaw(dir, 'environment', 'test-a')
    expect(first.found).toBe(true)
    await writeRecordFile(dir, 'environment', { ...record, name: 'Renamed' } as any)
    const second = await readRecordRaw(dir, 'environment', 'test-a')
    expect((second.raw as any).name).toBe('Renamed')
    const backups = await fs.readdir(path.join(dir, '.backups', 'environments', 'test-a'))
    expect(backups.length).toBe(1)
  })

  it('returns not found for a missing record', async () => {
    const dir = await tempDir()
    dirs.push(dir)
    expect((await readRecordRaw(dir, 'service', 'missing')).found).toBe(false)
  })

  it('rejects invalid YAML without deleting the file', async () => {
    const dir = await tempDir()
    dirs.push(dir)
    const target = path.join(dir, 'services', 'broken.yaml')
    await fs.mkdir(path.dirname(target), { recursive: true })
    await fs.writeFile(target, 'id: [unclosed\n', 'utf8')
    await expect(readRecordRaw(dir, 'service', 'broken')).rejects.toThrow(/Invalid YAML/)
  })
})

describe('registry', () => {
  it('loads records and reports broken references', async () => {
    const dir = await tempDir()
    dirs.push(dir)
    await writeFixture(dir)
    const snapshot = await loadSnapshot(dir)
    expect(snapshot.environments.size).toBe(1)
    expect(snapshot.services.size).toBe(1)
    expect(snapshot.deployments.size).toBe(1)
    expect(snapshot.ruleProfiles.size).toBe(1)
    expect(snapshot.operationBindings.size).toBe(1)
    expect(snapshot.diagnostics.filter((item) => item.severity === 'error')).toHaveLength(0)
  })

  it('reports a deployment that references a missing service', async () => {
    const dir = await tempDir()
    dirs.push(dir)
    await writeRecord(dir, 'environment', structuredClone(environment))
    await writeRecord(dir, 'deployment', { ...structuredClone(deployment), serviceId: 'ghost' })
    const snapshot = await loadSnapshot(dir)
    expect(
      snapshot.diagnostics.some(
        (item) => item.code === 'SERVICE_NOT_FOUND' && item.severity === 'warning',
      ),
    ).toBe(true)
  })

  it('skips a record whose id does not match its file name', async () => {
    const dir = await tempDir()
    dirs.push(dir)
    await writeRecord(dir, 'service', { ...structuredClone(service), id: 'other' })
    await fs.rename(
      path.join(dir, 'services', 'other.yaml'),
      path.join(dir, 'services', 'aicoservice.yaml'),
    )
    const snapshot = await loadSnapshot(dir)
    expect(snapshot.services.size).toBe(0)
    expect(snapshot.diagnostics.some((item) => item.code === 'RECORD_INVALID')).toBe(true)
  })
})
