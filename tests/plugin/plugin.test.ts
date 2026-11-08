import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, tempDir, writeFixture } from '../helpers.js'
import { apply } from '../../src/index.js'
import { normalizeConfig } from '../../src/config.js'

const dirs: string[] = []

afterEach(async () => {
  await Promise.all(dirs.splice(0).map(cleanup))
})

describe('plugin apply', () => {
  it('registers the profile-wide discovery skill and disposes it', async () => {
    const dir = await tempDir()
    dirs.push(dir)
    await writeFixture(dir)
    const disposed: string[] = []
    let registered: any
    let effectDisposer: (() => void) | undefined
    const ctx = {
      get: (key: string) => {
        if (key === 'profileContext') return { dir }
        if (key === 'skills') {
          return {
            register: (skill: any) => {
              registered = skill
              return () => disposed.push('skill')
            },
          }
        }
        return undefined
      },
      tools: {
        register: () => () => undefined,
      },
      effect: (callback: () => (() => void) | void) => {
        effectDisposer = callback() ?? undefined
        return () => effectDisposer?.()
      },
      inject: () => undefined,
    }

    await apply(ctx as any, normalizeConfig({ dataDir: dir }))

    expect(registered.name).toBe('dsh-env-manager')
    expect(registered.description).toContain('registered environment')
    expect(registered.content).toContain('env_find')
    expect(registered.source).toBe('runtime')
    expect(registered.invocation).toEqual({ modelInvocable: true, userInvocable: true })

    effectDisposer?.()
    expect(disposed).toContain('skill')
  })

  it('does not register the discovery skill when registerSkill is false', async () => {
    const dir = await tempDir()
    dirs.push(dir)
    await writeFixture(dir)
    let registerCalls = 0
    const ctx = {
      get: (key: string) => {
        if (key === 'profileContext') return { dir }
        if (key === 'skills') {
          return {
            register: () => {
              registerCalls += 1
              return () => undefined
            },
          }
        }
        return undefined
      },
      tools: { register: () => () => undefined },
      effect: (callback: () => (() => void) | void) => {
        callback()
        return () => undefined
      },
      inject: () => undefined,
    }

    await apply(ctx as any, normalizeConfig({ dataDir: dir, registerSkill: false }))
    expect(registerCalls).toBe(0)
  })

  it('registers tools and the HTTP route through webServer injection, then disposes them', async () => {
    const dir = await tempDir()
    dirs.push(dir)
    await writeFixture(dir)
    const tools = new Map<string, unknown>()
    const disposed: string[] = []
    let effectDisposer: (() => void) | undefined
    let transportDisposer: (() => void) | undefined
    const injectDeps: string[][] = []
    const ctx = {
      get: (key: string) => {
        if (key === 'profileContext') return { dir }
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
      inject: (deps: string[], callback: (webCtx: any) => void) => {
        injectDeps.push(deps)
        // The webServer service is already available: run the callback now.
        const webCtx = {
          get: (key: string) => {
            if (key === 'webServer') {
              return {
                register: (route: { kind: string; path: string }) => {
                  expect(route.kind).toBe('prefix')
                  expect(route.path).toBe('/env-manager/api')
                  return () => disposed.push('http')
                },
              }
            }
            return undefined
          },
          effect: (callback2: () => (() => void) | void) => {
            transportDisposer = callback2() ?? undefined
            return () => transportDisposer?.()
          },
        }
        callback(webCtx)
        return undefined
      },
    }
    await apply(ctx as any, normalizeConfig({ dataDir: dir, defaults: { environmentId: 'test-a' } }))
    expect([...tools.keys()]).toHaveLength(10)
    expect(injectDeps.some((deps) => deps.includes('webServer'))).toBe(true)
    expect(disposed).not.toContain('http')
    effectDisposer?.()
    transportDisposer?.()
    expect(disposed).toContain('http')
    expect(disposed).toContain('env_list')
  })
})
