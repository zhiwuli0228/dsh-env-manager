import { afterEach, describe, expect, it } from 'vitest'
import http from 'node:http'
import { AddressInfo } from 'node:net'
import { cleanup, tempDir, writeFixture } from '../helpers.js'
import { App } from '../../src/app/app.js'
import { createToolDefinitions } from '../../src/tools/tools.js'
import { assertObjectJsonSchema, parameterSchemaSpecToJsonSchema } from '@deepseek-ai/dsh-tools'
import { registerHttpTransport } from '../../src/transport/http.js'
import { silentLogger } from '../../src/logger.js'

const dirs: string[] = []

afterEach(async () => {
  await Promise.all(dirs.splice(0).map(cleanup))
})

function makeApp(dataDir: string) {
  return new App({
    dataDir,
    maxRecords: 100,
    writePolicy: { allowUiProductionWrites: false },
    skills: {
      async snapshot() {
        return {
          complete: true,
          skills: [{ name: 'redeploy-k8s-service', source: 'project-dsh', provider: 'bundled' }],
        }
      },
    },
    credentials: { async describe() { return { configured: true } } },
    logger: silentLogger,
  })
}

describe('tools', () => {
  it('builds ten valid definitions and executes env_list', async () => {
    const dir = await tempDir()
    dirs.push(dir)
    await writeFixture(dir)
    const app = makeApp(dir)
    const definitions = createToolDefinitions({
      ctx: { get: () => undefined },
      app,
      defaults: { environmentId: 'test-a' },
      writePolicy: { requireApprovalForDelete: true, requireApprovalForProductionSave: true },
    })
    expect(definitions.map((definition) => definition.name)).toEqual([
      'env_list',
      'env_get',
      'env_find',
      'env_resolve',
      'env_resolve_operation',
      'env_get_context',
      'env_set_context',
      'env_save',
      'env_delete',
      'env_validate',
    ])
    for (const definition of definitions) {
      expect(() => assertObjectJsonSchema(definition.output.schema as any)).not.toThrow()
      expect(() => assertObjectJsonSchema(definition.parameters as any)).not.toThrow()
    }
    const exec = { agent: { id: 's1' }, callId: 'c1', signal: new AbortController().signal }
    const list = definitions[0]!
    const value = (await list.execute({ kind: 'environment' }, exec as any)) as any
    expect(value.items).toHaveLength(1)
    expect(value.items[0].id).toBe('test-a')

    const resolve = definitions[3]!
    const resolved = (await resolve.execute(
      { serviceId: 'aicoservice', environmentId: 'test-a' },
      exec as any,
    )) as any
    expect(resolved.context.paths['jar'].value).toContain('aicoservice.jar')

    const route = definitions[4]!
    const routed = (await route.execute(
      { operation: 'redeploy', serviceId: 'aicoservice', environmentId: 'test-a' },
      exec as any,
    )) as any
    expect(routed.resolution.ok).toBe(true)
    expect(routed.resolution.matchedBindingId).toBe('binding-001')
  })
})

describe('http transport', () => {
  it('enforces headers and serves the API', async () => {
    const dir = await tempDir()
    dirs.push(dir)
    await writeFixture(dir)
    const app = makeApp(dir)
    let handler: any
    const ctx = {
      get: (key: string) =>
        key === 'webServer'
          ? {
              register: (route: any) => {
                handler = route.handler
                return () => undefined
              },
            }
          : undefined,
    }
    registerHttpTransport(ctx, app, silentLogger)
    const server = http.createServer((req, res) => handler(req, res))
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const port = (server.address() as AddressInfo).port
    const url = `http://127.0.0.1:${port}/env-manager/api`
    try {
      const noHeader = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ op: 'meta' }),
      })
      expect(noHeader.status).toBe(403)

      const meta = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-env-manager-request': '1' },
        body: JSON.stringify({ op: 'meta' }),
      })
      expect(meta.status).toBe(200)
      const body = (await meta.json()) as any
      expect(body.ok).toBe(true)
      expect(body.data.counts.environments).toBe(1)

      const crossOrigin = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-env-manager-request': '1',
          origin: 'http://evil.example',
        },
        body: JSON.stringify({ op: 'meta' }),
      })
      expect(crossOrigin.status).toBe(403)
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  })
})
