import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'

// Contract, not implementation: the client module table keys every entry by the
// bundle's package name and materializes the factory under that exact id
// (@deepseek-ai/dsh-client-modules: graph row id = package.json "name"). This test
// asserts against package.json so a divergence between client.js and the manifest
// fails the suite instead of being captured as the expected value.
const pkgName = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')).name as string

describe('client module', () => {
  it('registers a sidebar id and the matching main key', async () => {
    let loaded: any
    const g = globalThis as any
    g.window = {
      __ModuleLoader__: {
        load(definition: any) {
          loaded = definition
        },
      },
    }
    await import('../../client.js')
    expect(loaded?.id).toBe(pkgName)
    const React = {
      createElement: (type: unknown, props: any, ...children: unknown[]) => ({ type, props, children }),
      useState: () => [undefined, () => undefined],
      useEffect: () => undefined,
      useCallback: (fn: unknown) => fn,
      useMemo: (fn: () => unknown) => fn(),
    }
    const mod = loaded.factory((name: string) => {
      if (name === 'react') return React
      throw new Error(`unexpected require ${name}`)
    })
    expect(mod.name).toBe(pkgName)
    const registrations: any[] = []
    const injected: string[] = []
    const ctx = {
      locale: { register: vi.fn() },
      slots: {
        inject(name: string, callback: () => unknown) {
          injected.push(name)
          callback()
        },
        register(options: any, component: unknown) {
          registrations.push({ options, component })
          return () => undefined
        },
      },
    }
    mod.apply(ctx)
    expect(injected).toEqual(['sidebar.panellist', 'main'])
    expect(registrations.map((item) => item.options)).toEqual([
      {
        name: 'sidebar.panellist',
        id: 'dsh-env-manager',
        order: 40,
        label: expect.any(Function),
      },
      { name: 'main', key: 'dsh-env-manager', inject: expect.any(Function) },
    ])
    expect(registrations[0].options.label()).toMatch(/Environment Manager|环境管理器/)
    expect(registrations[1].options.inject()).toEqual({})
    expect(typeof registrations[0].component).toBe('function')
    expect(typeof registrations[1].component).toBe('function')

    const glyph = registrations[0].component({ size: 16, active: false })
    expect(glyph.type).toBe('svg')
    expect(glyph.props).toMatchObject({
      viewBox: '0 0 20 20',
      width: 16,
      height: 16,
      fill: 'none',
      'aria-hidden': true,
    })
    expect(glyph.props.style).toMatchObject({ opacity: 0.72, color: 'currentColor' })
    expect(glyph.props.style).not.toHaveProperty('background')
    expect(glyph.props.style).not.toHaveProperty('backgroundColor')
    expect(registrations[0].component({ size: 18, active: true }).props).toMatchObject({
      width: 18,
      height: 18,
      style: { opacity: 1 },
    })
  })
})
