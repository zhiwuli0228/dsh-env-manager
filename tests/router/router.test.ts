import { describe, expect, it } from 'vitest'
import { resolveOperation } from '../../src/router/router.js'
import type {
  Host,
  OperationBinding,
  ServiceContext,
} from '../../src/domain/types.js'

const context: ServiceContext = {
  environmentId: 'test-a',
  environmentName: 'Test A',
  environmentCategory: 'test',
  serviceId: 'aicoservice',
  serviceName: 'AICO Service',
  runtimeMode: 'kubernetes',
  location: {
    kind: 'kubernetes',
    namespace: 'dv-sop',
    workload: { kind: 'deployment', name: 'aicoservice' },
  } as unknown as ServiceContext['location'],
  source: {},
  variables: {},
  paths: {},
  ruleProfiles: [],
  status: 'configured-not-verified',
  credentials: [],
  diagnostics: [],
}

const hosts: Host[] = [
  {
    id: 'host-001',
    name: 'test-a-node-01',
    ip: '10.0.1.10',
    sshPort: 2222,
    roles: ['management'],
    access: ['ssh'],
    adminUser: 'deploy',
    credentialRef: 'DSH_ENV_MANAGER_TEST_A_ROOT',
  },
  {
    id: 'host-002',
    name: 'test-a-node-02',
    ip: '10.0.1.11',
    roles: ['business'],
    access: ['docker'],
  },
]

function binding(partial: Partial<OperationBinding>): OperationBinding {
  return {
    id: 'binding-x',
    schemaVersion: 1,
    operation: 'redeploy',
    match: { environmentId: 'test-a', serviceId: 'aicoservice' },
    policy: { requiresApproval: true, allowProduction: false },
    enabled: true,
    createdAt: '2026-11-01T03:00:00.000Z',
    updatedAt: '2026-11-01T03:00:00.000Z',
    ...partial,
  }
}

async function route(partial: Partial<OperationBinding>, hostsOverride?: Host[]) {
  return resolveOperation({
    operation: 'redeploy',
    context,
    bindings: [binding(partial)],
    skills: null,
    hosts: hostsOverride ?? hosts,
  })
}

describe('router execution targets', () => {
  it('resolves a script target with interpreter by extension and interpolated args', async () => {
    const result = await route({
      execute: { mode: 'script', path: 'deploy.sh', args: ['${service.name}', '${deployment.location.namespace}'] },
    })
    expect(result.ok).toBe(true)
    expect(result.target).toMatchObject({
      mode: 'script',
      script: { path: 'deploy.sh', interpreter: 'bash', args: ['AICO Service', 'dv-sop'] },
    })
  })

  it('resolves a command target with interpolated argv and parameter refs', async () => {
    const result = await route({
      execute: { mode: 'command', argv: ['kubectl', 'rollout', 'restart', '${workload}', '-n', '${namespace}'] },
      parameters: { workload: '${deployment.location.workload.name}', namespace: '${deployment.location.namespace}' },
    })
    expect(result.ok).toBe(true)
    expect(result.target).toMatchObject({
      mode: 'command',
      command: { argv: ['kubectl', 'rollout', 'restart', 'aicoservice', '-n', 'dv-sop'] },
    })
  })

  it('resolves a remote target to the first ssh host by default', async () => {
    const result = await route({
      execute: { mode: 'remote', command: 'systemctl restart ${service.name}' },
    })
    expect(result.ok).toBe(true)
    expect(result.target).toMatchObject({
      mode: 'remote',
      remote: {
        hostId: 'host-001',
        hostName: 'test-a-node-01',
        address: '10.0.1.10',
        port: 2222,
        username: 'deploy',
        command: 'systemctl restart AICO Service',
        credentialRef: 'DSH_ENV_MANAGER_TEST_A_ROOT',
      },
    })
  })

  it('resolves a remote target by explicit hostRef', async () => {
    const result = await route({
      execute: { mode: 'remote', hostRef: 'host-002', username: 'root', command: 'uptime' },
    })
    expect(result.ok).toBe(true)
    expect(result.target?.remote).toMatchObject({
      hostId: 'host-002',
      address: '10.0.1.11',
      port: 22,
      username: 'root',
    })
  })

  it('fails when an explicit remote host does not exist', async () => {
    const result = await route({
      execute: { mode: 'remote', hostRef: 'missing-host', command: 'uptime' },
    })
    expect(result.ok).toBe(false)
    expect(result.diagnostics.some((item) => item.code === 'HOST_NOT_FOUND')).toBe(true)
  })

  it('fails when a remote target has no ssh host available', async () => {
    const result = await route({ execute: { mode: 'remote', command: 'uptime' } }, [])
    expect(result.ok).toBe(false)
    expect(result.diagnostics.some((item) => item.code === 'HOST_NOT_FOUND')).toBe(true)
  })

  it('fails a binding that declares neither a skill nor an execute target', async () => {
    const result = await route({})
    expect(result.ok).toBe(false)
    expect(result.diagnostics.some((item) => item.code === 'EXECUTION_TARGET_INVALID')).toBe(true)
  })

  it('keeps skill bindings discovery-only', async () => {
    const result = await route({ skill: { name: 'redeploy-k8s-service' } })
    expect(result.ok).toBe(true)
    expect(result.target).toEqual({
      mode: 'skill',
      skill: { name: 'redeploy-k8s-service', available: 'unknown' },
    })
  })
})
