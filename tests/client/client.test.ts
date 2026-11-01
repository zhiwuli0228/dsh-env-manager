import { describe, expect, it, vi } from 'vitest'

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
    expect(loaded?.id).toBe('dsh-env-manager')
    const React = {
      createElement: () => null,
      useState: () => [undefined, () => undefined],
      useEffect: () => undefined,
      useCallback: (fn: unknown) => fn,
      useMemo: (fn: () => unknown) => fn(),
    }
    const mod = loaded.factory((name: string) => {
      if (name === 'react') return React
      throw new Error(`unexpected require ${name}`)
    })
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
  })
})
