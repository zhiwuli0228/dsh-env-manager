import { afterEach, describe, expect, it } from 'vitest'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { cleanup, environment, tempDir, writeFixture } from '../helpers.js'
import { SessionStore } from '../../src/session/session.js'
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

describe('session store', () => {
  it('sets, gets and clears the default environment', async () => {
    const dir = await makeDir()
    const store = new SessionStore(dir)
    expect((await store.get('s1')).context).toEqual({
      sessionId: 's1',
      defaultEnvironmentId: null,
      persisted: false,
    })
    const set = await store.set('s1', 'test-a')
    expect(set.context.persisted).toBe(true)
    expect((await store.get('s1')).context.defaultEnvironmentId).toBe('test-a')
    const cleared = await store.set('s1', null)
    expect(cleared.context.defaultEnvironmentId).toBeNull()
    expect((await store.get('s1')).context.defaultEnvironmentId).toBeNull()
  })

  it('isolates two sessions', async () => {
    const dir = await makeDir()
    const store = new SessionStore(dir)
    await store.set('s1', 'test-a')
    await store.set('s2', 'prod-a')
    expect((await store.get('s1')).context.defaultEnvironmentId).toBe('test-a')
    expect((await store.get('s2')).context.defaultEnvironmentId).toBe('prod-a')
  })

  it('treats a corrupt file as no default with persisted false', async () => {
    const dir = await makeDir()
    const file = path.join(dir, 'sessions', 's1.json')
    await fs.mkdir(path.dirname(file), { recursive: true })
    await fs.writeFile(file, '{ broken', 'utf8')
    const store = new SessionStore(dir)
    const result = await store.get('s1')
    expect(result.context.defaultEnvironmentId).toBeNull()
    expect(result.context.persisted).toBe(false)
    expect(result.diagnostics[0]?.code).toBe('SESSION_CONTEXT_UNPERSISTED')
  })
})

describe('app', () => {
  function makeApp(dataDir: string, overrides: Partial<ConstructorParameters<typeof App>[0]> = {}) {
    return new App({
      dataDir,
      maxRecords: 100,
      writePolicy: { allowUiProductionWrites: false },
      skills: null,
      credentials: {
        async describe(ref: string) {
          return { configured: ref.includes('kubeconfig'), source: 'store' }
        },
        async set() {
          return undefined
        },
        async unset() {
          return undefined
        },
      },
      logger: silentLogger,
      ...overrides,
    })
  }

  it('saves, lists, finds and reads a record', async () => {
    const dir = await makeDir()
    const app = makeApp(dir)
    const saved = await app.save('environment', structuredClone(environment), { actor: 'agent' })
    expect(saved.created).toBe(true)
    const listed = await app.list('environment')
    expect(listed.items.map((item) => item.id)).toEqual(['test-a'])
    const found = await app.find('ta')
    expect(found.hits.some((hit) => hit.id === 'test-a')).toBe(true)
    const got = await app.get('environment', 'test-a')
    expect(got.yaml).toContain('test-a')
    const updated = await app.save('environment', { ...structuredClone(environment), name: 'Renamed' })
    expect(updated.created).toBe(false)
    expect((await app.get('environment', 'test-a')).record).toMatchObject({ name: 'Renamed' })
  })

  it('does not write on dryRun', async () => {
    const dir = await makeDir()
    const app = makeApp(dir)
    const result = await app.save('environment', structuredClone(environment), { dryRun: true })
    expect(result.dryRun).toBe(true)
    expect((await app.list('environment')).items).toHaveLength(0)
  })

  it('blocks deleting a referenced environment', async () => {
    const dir = await makeDir()
    await writeFixture(dir)
    const app = makeApp(dir)
    await expect(app.remove('environment', 'test-a', 'agent')).rejects.toMatchObject({
      code: 'RECORD_IN_USE',
    })
    const dry = await app.remove('environment', 'test-a', 'agent', { dryRun: true })
    expect(dry.deleted).toBe(false)
    expect(dry.blockers.length).toBeGreaterThan(0)
  })

  it('stores host login accounts and login records', async () => {
    const dir = await makeDir()
    const app = makeApp(dir)
    await app.save('environment', structuredClone(environment), { actor: 'agent' })
    const got = await app.get('environment', 'test-a')
    const record = got.record as typeof environment
    expect(record.hosts[0]?.accounts?.[0]).toMatchObject({
      username: 'root',
      authType: 'private-key',
      credentialRef: 'cred-test-a-root',
      lastLoginFrom: '10.0.8.21',
    })
    expect(record.loginRecords).toHaveLength(2)
    expect(record.loginRecords?.[1]?.result).toBe('failure')
  })

  it('rejects an environment without a logical role catalogue', async () => {
    const dir = await makeDir()
    const app = makeApp(dir)
    const broken = structuredClone(environment) as any
    broken.roles = []
    await expect(app.save('environment', broken, { actor: 'agent' })).rejects.toMatchObject({
      code: 'RECORD_INVALID',
    })
  })

  it('rejects a host without at least one role', async () => {
    const dir = await makeDir()
    const app = makeApp(dir)
    const broken = structuredClone(environment) as any
    broken.hosts[0].roles = []
    await expect(app.save('environment', broken, { actor: 'agent' })).rejects.toMatchObject({
      code: 'RECORD_INVALID',
    })
  })

  it('stores K8s node kinds, command access and cluster topology', async () => {
    const dir = await makeDir()
    const app = makeApp(dir)
    const next = structuredClone(environment) as any
    next.clusters = [{
      id: 'k8s-aio',
      name: 'all-in-one',
      kind: 'kubernetes',
      topology: 'all-in-one',
      apiEndpoint: 'https://10.0.1.20:6443',
    }]
    next.hosts[0].kind = 'k8s-all-in-one'
    next.hosts[0].access = ['ssh', 'kubectl', 'docker']
    next.hosts[0].clusterRef = 'k8s-aio'
    await app.save('environment', next, { actor: 'agent' })
    const got = (await app.get('environment', 'test-a')).record as any
    expect(got.hosts[0]).toMatchObject({
      kind: 'k8s-all-in-one',
      access: ['ssh', 'kubectl', 'docker'],
      clusterRef: 'k8s-aio',
    })
    expect(got.clusters[0].topology).toBe('all-in-one')
  })

  it('requires a cluster reference for a K8s node', async () => {
    const dir = await makeDir()
    const app = makeApp(dir)
    const broken = structuredClone(environment) as any
    broken.hosts[0].kind = 'k8s-worker'
    delete broken.hosts[0].clusterRef
    await expect(app.save('environment', broken, { actor: 'agent' })).rejects.toMatchObject({
      code: 'RECORD_INVALID',
    })
  })

  it('rejects unknown node kind, access and cluster topology values', () => {
    const mutations: Array<(value: any) => void> = [
      (value) => { value.hosts[0].kind = 'mainframe' },
      (value) => { value.hosts[0].access = ['ssh', 'telnet'] },
      (value) => { value.clusters[0].topology = 'edge' },
    ]
    for (const mutate of mutations) {
      const value = structuredClone(environment) as any
      mutate(value)
      expect(parseRecordInput('environment', value).ok).toBe(false)
    }
  })

  it('rejects a node that references an unknown cluster', async () => {
    const dir = await makeDir()
    const app = makeApp(dir)
    const broken = structuredClone(environment) as any
    broken.hosts[0].kind = 'pod-host'
    broken.hosts[0].access = ['ssh', 'docker']
    broken.hosts[0].clusterRef = 'missing-cluster'
    await expect(app.save('environment', broken, { actor: 'agent' })).rejects.toMatchObject({
      code: 'RECORD_INVALID',
    })
  })

  it('reports login records that reference a missing host', async () => {
    const dir = await makeDir()
    const app = makeApp(dir)
    const broken = structuredClone(environment)
    broken.id = 'broken-login'
    broken.loginRecords = [
      {
        id: 'login-missing',
        at: '2026-10-31T08:12:00.000Z',
        username: 'root',
        hostRef: 'host-does-not-exist',
        result: 'success',
      },
    ]
    await app.save('environment', broken, { actor: 'agent' })
    const report = await app.validate()
    expect(report.diagnostics.some((item) => item.code === 'HOST_NOT_FOUND')).toBe(true)
  })

  it('reports duplicate account ids within a host', async () => {
    const dir = await makeDir()
    const app = makeApp(dir)
    const broken = structuredClone(environment)
    broken.id = 'duplicate-account'
    broken.hosts[0]?.accounts?.push({
      id: 'root',
      username: 'root-2',
      authType: 'password',
    })
    await app.save('environment', broken, { actor: 'agent' })
    const report = await app.validate()
    expect(report.diagnostics.some((item) => item.code === 'DUPLICATE_ACCOUNT_ID')).toBe(true)
  })

  it('reports login records that reference a missing account', async () => {
    const dir = await makeDir()
    const app = makeApp(dir)
    const broken = structuredClone(environment)
    broken.id = 'broken-account-ref'
    if (broken.loginRecords?.[0]) broken.loginRecords[0].accountId = 'ghost'
    await app.save('environment', broken, { actor: 'agent' })
    const report = await app.validate()
    expect(report.diagnostics.some((item) => item.code === 'ACCOUNT_NOT_FOUND')).toBe(true)
  })

  it('resolves a context and reports credential status', async () => {
    const dir = await makeDir()
    await writeFixture(dir)
    const app = makeApp(dir)
    const { context, warnings } = await app.resolve({
      environmentId: 'test-a',
      serviceId: 'aicoservice',
    })
    expect(context.deploymentId).toBe('deploy-001')
    expect(context.paths.jar?.value).toContain('aicoservice.jar')
    expect(context.credentials.find((item) => item.ref === 'cred-test-a-kubeconfig')?.configured).toBe(true)
    expect(context.credentials.find((item) => item.ref === 'cred-test-a-root')?.configured).toBe(false)
    expect(warnings.some((item) => item.code === 'CREDENTIAL_MISSING')).toBe(true)
  })

  it('fails safely on ambiguous deployments', async () => {
    const dir = await makeDir()
    await writeFixture(dir)
    await fs.mkdir(path.join(dir, 'deployments'), { recursive: true })
    await fs.writeFile(
      path.join(dir, 'deployments', 'deploy-002.yaml'),
      (await fs.readFile(path.join(dir, 'deployments', 'deploy-001.yaml'), 'utf8'))
        .replaceAll('deploy-001', 'deploy-002')
        .replaceAll('aicoservice-test-a', 'aicoservice-test-a-2'),
      'utf8',
    )
    const app = makeApp(dir)
    await expect(
      app.resolve({ environmentId: 'test-a', serviceId: 'aicoservice' }),
    ).rejects.toMatchObject({ code: 'DEPLOYMENT_AMBIGUOUS' })
  })

  it('denies UI production writes by default', async () => {
    const dir = await makeDir()
    const app = makeApp(dir)
    const prod = { ...structuredClone(environment), id: 'prod-a', category: 'production' }
    await expect(app.save('environment', prod, { actor: 'ui' })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
  })

  it('stores a credential value in the credential service and returns only its ref', async () => {
    const dir = await makeDir()
    const writes: Array<{ ref: string; value: string }> = []
    const removals: string[] = []
    const app = makeApp(dir, {
      credentials: {
        async describe() {
          return { configured: true, source: 'store' }
        },
        async set(ref: string, value: string) {
          writes.push({ ref, value })
        },
        async unset(ref: string) {
          removals.push(ref)
        },
      },
    })
    const result = await app.setCredential('env-manager/oracle-prod/root', 's3cret-value')
    expect(result).toEqual({ ref: 'env-manager/oracle-prod/root', configured: true })
    expect(writes).toEqual([{ ref: 'env-manager/oracle-prod/root', value: 's3cret-value' }])
    await app.unsetCredential('env-manager/oracle-prod/root')
    expect(removals).toEqual(['env-manager/oracle-prod/root'])
  })

  it('rejects credentials outside the env-manager namespace and empty values', async () => {
    const dir = await makeDir()
    const app = makeApp(dir)
    await expect(app.setCredential('OTHER_API_KEY', 'x')).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    })
    await expect(app.setCredential('env-manager/oracle-prod/root', '')).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    })
    await expect(app.setCredential('env-manager/oracle-prod/root', 'x'.repeat(8193))).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    })
  })

  it('fails safely when the credential service is unavailable', async () => {
    const dir = await makeDir()
    const app = makeApp(dir, { credentials: null })
    await expect(app.setCredential('env-manager/oracle-prod/root', 'secret')).rejects.toMatchObject({
      code: 'CREDENTIAL_UNAVAILABLE',
    })
  })
})
