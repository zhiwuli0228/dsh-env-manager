import { afterEach, describe, expect, it } from 'vitest'
import { registerHttpTransport } from '../../src/transport/http.js'
import type { Logger } from '../../src/logger.js'

const quietLogger: Logger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
}

interface FakeRoute {
  kind: string
  path: string
  handler: (req: any, res: any) => Promise<void>
}

function makeWebServer(routes: FakeRoute[]): any {
  return {
    register: (route: FakeRoute) => {
      routes.push(route)
      return () => {
        const at = routes.indexOf(route)
        if (at !== -1) routes.splice(at, 1)
      }
    },
  }
}

function makeReq(init: {
  method?: string
  url?: string
  headers?: Record<string, string | undefined>
  body?: string
}): any {
  const listeners: Record<string, Array<(value?: any) => void>> = {}
  const req: any = {
    method: init.method ?? 'GET',
    url: init.url ?? '/env-manager/api',
    headers: init.headers ?? {},
    on: (event: string, callback: (value?: any) => void) => {
      ;(listeners[event] ??= []).push(callback)
      return req
    },
    destroy: () => undefined,
  }
  queueMicrotask(() => {
    if (init.body !== undefined) for (const cb of listeners.data ?? []) cb(Buffer.from(init.body))
    for (const cb of listeners.end ?? []) cb()
  })
  return req
}

function makeRes(): any {
  const chunks: Buffer[] = []
  const res: any = {
    status: 0,
    headers: {} as Record<string, string>,
    writeHead: (status: number, headers?: Record<string, string>) => {
      res.status = status
      if (headers) Object.assign(res.headers, headers)
      return res
    },
    setHeader: (name: string, value: string) => {
      res.headers[name] = value
    },
    end: (body?: unknown) => {
      if (body !== undefined) chunks.push(Buffer.from(body as string))
    },
    body: () => Buffer.concat(chunks).toString('utf8'),
  }
  return res
}

function fakeApp() {
  return {
    meta: async () => ({ dataDir: '/tmp/env-manager', version: 'test' }),
  }
}

describe('transport', () => {
  const routes: FakeRoute[] = []
  const disposed: string[] = []

  afterEach(() => {
    routes.length = 0
    disposed.length = 0
  })

  it('registers a prefix route at /env-manager/api and disposes it', () => {
    const webServer = makeWebServer(routes)
    const dispose = registerHttpTransport(
      { get: () => webServer },
      fakeApp() as any,
      quietLogger,
    )
    expect(routes).toHaveLength(1)
    expect(routes[0].kind).toBe('prefix')
    expect(routes[0].path).toBe('/env-manager/api')
    dispose()
    expect(routes).toHaveLength(0)
  })

  it('returns a no-op when webServer is unavailable (headless profile)', () => {
    const dispose = registerHttpTransport({ get: () => undefined }, fakeApp() as any, quietLogger)
    expect(dispose).toBeTypeOf('function')
    expect(() => dispose()).not.toThrow()
  })

  it('answers non-POST methods with 405 and allow: POST', async () => {
    const webServer = makeWebServer(routes)
    registerHttpTransport({ get: () => webServer }, fakeApp() as any, quietLogger)
    const res = makeRes()
    await routes[0].handler(makeReq({ method: 'GET' }), res)
    expect(res.status).toBe(405)
    expect(res.headers['allow']).toBe('POST')
    const body = JSON.parse(res.body())
    expect(body.ok).toBe(false)
    expect(body.error.code).toBe('METHOD_NOT_ALLOWED')
  })

  it('rejects a missing JSON content-type with 415', async () => {
    const webServer = makeWebServer(routes)
    registerHttpTransport({ get: () => webServer }, fakeApp() as any, quietLogger)
    const res = makeRes()
    await routes[0].handler(makeReq({ method: 'POST', headers: { 'content-type': 'text/plain' } }), res)
    expect(res.status).toBe(415)
    expect(JSON.parse(res.body()).error.code).toBe('UNSUPPORTED_MEDIA_TYPE')
  })

  it('rejects a missing x-env-manager-request header with 403', async () => {
    const webServer = makeWebServer(routes)
    registerHttpTransport({ get: () => webServer }, fakeApp() as any, quietLogger)
    const res = makeRes()
    await routes[0].handler(
      makeReq({ method: 'POST', headers: { 'content-type': 'application/json' } }),
      res,
    )
    expect(res.status).toBe(403)
    expect(JSON.parse(res.body()).error.code).toBe('FORBIDDEN')
  })

  it('answers a valid meta POST with 200 and the app payload', async () => {
    const webServer = makeWebServer(routes)
    registerHttpTransport({ get: () => webServer }, fakeApp() as any, quietLogger)
    const res = makeRes()
    await routes[0].handler(
      makeReq({
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-env-manager-request': '1' },
        body: '{"op":"meta","payload":{}}',
      }),
      res,
    )
    expect(res.status).toBe(200)
    const body = JSON.parse(res.body())
    expect(body.ok).toBe(true)
    expect(body.data.version).toBe('test')
  })

  it('rejects an unparseable body with 400 INVALID_ARGUMENT', async () => {
    const webServer = makeWebServer(routes)
    registerHttpTransport({ get: () => webServer }, fakeApp() as any, quietLogger)
    const res = makeRes()
    await routes[0].handler(
      makeReq({
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-env-manager-request': '1' },
        body: 'not json',
      }),
      res,
    )
    expect(res.status).toBe(400)
    expect(JSON.parse(res.body()).error.code).toBe('INVALID_ARGUMENT')
  })
})
