import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import YAML from 'yaml'
import type { RecordKind } from '../src/domain/types.js'

export async function tempDir(prefix = 'dsh-env-manager-test-'): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix))
}

export async function cleanup(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true })
}

export const environment = {
  id: 'test-a',
  schemaVersion: 1,
  name: 'Test A',
  aliases: ['ta'],
  category: 'test',
  roles: [
    { id: 'management', name: 'Management' },
    { id: 'business', name: 'Business' },
  ],
  hosts: [
    {
      id: 'host-001',
      name: 'test-a-node-01',
      ip: '10.0.1.10',
      roles: ['management', 'business'],
      credentialRef: 'cred-test-a-root',
    },
  ],
  clusters: [
    {
      id: 'k8s-01',
      name: 'test-a-k8s',
      kind: 'kubernetes',
      apiEndpoint: 'https://10.0.1.20:6443',
      namespaces: ['dv-sop'],
      credentialRef: 'cred-test-a-kubeconfig',
    },
  ],
  endpoints: [
    { id: 'ep-ssh-01', kind: 'ssh', hostRef: 'host-001', port: 22 },
    { id: 'ep-web-01', kind: 'web', url: 'https://test-a.example.internal' },
  ],
  createdAt: '2026-11-01T03:00:00.000Z',
  updatedAt: '2026-11-01T03:00:00.000Z',
}

export const service = {
  id: 'aicoservice',
  schemaVersion: 1,
  name: 'Aico Service',
  aliases: ['aico'],
  category: 'backend',
  git: { url: 'https://git.example.internal/team/aicoservice.git', defaultBranch: 'main' },
  build: { tool: 'maven' },
  artifact: { name: 'aicoservice.jar' },
  deployModes: ['native', 'docker', 'kubernetes'],
  ruleProfileRefs: ['java-common'],
  createdAt: '2026-11-01T03:00:00.000Z',
  updatedAt: '2026-11-01T03:00:00.000Z',
}

export const ruleProfile = {
  id: 'java-common',
  schemaVersion: 1,
  description: 'Common Java paths',
  variables: { installRoot: '/opt/company/services' },
  paths: {
    serviceHome: '${installRoot}/${service.id}',
    jar: '${paths.serviceHome}/lib/${service.artifact.name}',
    logDir: '${paths.serviceHome}/logs',
    applicationLog: '${paths.logDir}/${service.id}.log',
  },
  logSources: {
    native: { kind: 'file', path: '${paths.applicationLog}' },
    kubernetes: { kind: 'pod-logs', namespace: 'dv-sop', workload: 'aicoservice' },
  },
  classLocations: {
    native: { kind: 'deployed-dir', path: '${paths.serviceHome}/classes' },
  },
  createdAt: '2026-11-01T03:00:00.000Z',
  updatedAt: '2026-11-01T03:00:00.000Z',
}

export const deployment = {
  id: 'deploy-001',
  schemaVersion: 1,
  name: 'aicoservice-test-a',
  environmentId: 'test-a',
  serviceId: 'aicoservice',
  runtimeMode: 'kubernetes',
  location: {
    kind: 'kubernetes',
    clusterRef: 'k8s-01',
    namespace: 'dv-sop',
    workload: { kind: 'Deployment', name: 'aicoservice' },
    container: 'aicoservice',
  },
  variables: { replicaCount: 2 },
  createdAt: '2026-11-01T03:00:00.000Z',
  updatedAt: '2026-11-01T03:00:00.000Z',
}

export const binding = {
  id: 'binding-001',
  schemaVersion: 1,
  operation: 'redeploy',
  match: { environmentId: 'test-a', serviceId: 'aicoservice' },
  skill: { name: 'redeploy-k8s-service' },
  parameters: {
    namespace: '${deployment.location.namespace}',
    workload: '${deployment.location.workload.name}',
    home: '${paths.serviceHome}',
  },
  policy: { requiresApproval: true, allowProduction: false },
  enabled: true,
  createdAt: '2026-11-01T03:00:00.000Z',
  updatedAt: '2026-11-01T03:00:00.000Z',
}

const DIRECTORIES: Record<RecordKind, string> = {
  environment: 'environments',
  service: 'services',
  deployment: 'deployments',
  ruleProfile: 'rules',
  operationBinding: 'operations',
}

export async function writeRecord(
  dataDir: string,
  kind: RecordKind,
  record: Record<string, unknown>,
): Promise<void> {
  const dir = path.join(dataDir, DIRECTORIES[kind])
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(
    path.join(dir, `${record.id as string}.yaml`),
    YAML.stringify(record),
    'utf8',
  )
}

export async function writeFixture(dataDir: string): Promise<void> {
  await writeRecord(dataDir, 'environment', environment)
  await writeRecord(dataDir, 'service', service)
  await writeRecord(dataDir, 'ruleProfile', ruleProfile)
  await writeRecord(dataDir, 'deployment', deployment)
  await writeRecord(dataDir, 'operationBinding', binding)
}
