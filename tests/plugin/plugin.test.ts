import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, tempDir, writeFixture } from '../helpers.js'
import { apply } from '../../src/index.js'
import { normalizeConfig } from '../../src/config.js'
import { silentLogger } from '../../src/logger.js'

const dirs: string[] = []

afterEach(async () => {
  await Promise.all(dirs.splice(0).map(cleanup))
})

describe('plugin apply', () => {
  it('registers tools and the HTTP route, then disposes them', async () => {
    const dir = await tempDir()
    dirs.push(dir)
    await writeFixture(dir)
    const tools = new Map<string, unknown>()
    const disposed: string[] = []
    let effectDisposer: (() => void) | undefined
    const ctx = {
      get: (key: string) => {
        if (key === 'profileContext') return { dir }
        if (key === 'webServer') {
          return {
            register: (route: { path: string }) => {
              expect(route.path).toBe('/env-manager/api')
              return () => disposed.push('http')
            },
          }
        }
        return undefined
      },
      tools: {
        register: (definition: { name: string }) => {
          tools.set(definition.name, definition)
          return () => disposed.push(definition.name)
        },
      },
      effect: (callback: () => (() => void) | void) => {
        effectDisposer = callback() ?? undefined
        return () => effectDisposer?.()
      },
    }
    await apply(ctx as any, normalizeConfig({ dataDir: dir, defaults: { environmentId: 'test-a' } }))
    expect([...tools.keys()]).toHaveLength(10)
    expect(disposed).not.toContain('http')
    effectDisposer?.()
    expect(disposed).toContain('http')
    expect(disposed).toContain('env_list')
  })
})
