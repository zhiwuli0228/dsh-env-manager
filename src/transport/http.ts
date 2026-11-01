import type { IncomingMessage, ServerResponse } from 'node:http'
import { App } from '../app/app.js'
import { EnvManagerError } from '../domain/errors.js'
import { isRecordKind } from '../domain/constants.js'
import type { Logger } from '../logger.js'

const MAX_BODY = 2 * 1024 * 1024

function statusFor(code: string): number {
  switch (code) {
    case 'FORBIDDEN':
      return 403
    case 'ENV_NOT_FOUND':
    case 'SERVICE_NOT_FOUND':
    case 'DEPLOYMENT_NOT_FOUND':
    case 'RULE_PROFILE_NOT_FOUND':
    case 'BINDING_NOT_FOUND':
    case 'HOST_NOT_FOUND':
    case 'CLUSTER_NOT_FOUND':
      return 404
    case 'RECORD_IN_USE':
    case 'BINDING_CONFLICT':
    case 'DEPLOYMENT_AMBIGUOUS':
    case 'DUPLICATE_ID':
      return 409
    case 'RECORD_TOO_LARGE':
      return 413
    case 'POLICY_DENIED':
      return 403
    case 'CREDENTIAL_UNAVAILABLE':
      return 503
    case 'INVALID_ARGUMENT':
    case 'RECORD_INVALID':
    case 'RULE_TEMPLATE_INVALID':
    case 'RULE_UNDEFINED_VARIABLE':
    case 'RULE_CYCLE':
    case 'RULE_PATH_TRAVERSAL':
    case 'PARAMETER_RESOLUTION_FAILED':
    case 'SKILL_UNAVAILABLE':
      return 400
    case 'INTERNAL_ERROR':
    case 'STORAGE_UNWRITABLE':
      return 500
    default:
      return 500
  }
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  return await new Promise((resolve, reject) => {
    let size = 0
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BODY) {
        reject(new EnvManagerError('RECORD_TOO_LARGE', 'Request body exceeds 2 MiB'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8')
        resolve(text ? JSON.parse(text) : {})
      } catch {
        reject(new EnvManagerError('INVALID_ARGUMENT', 'Request body must be valid JSON'))
      }
    })
    req.on('error', reject)
  })
}

function send(res: ServerResponse, status: number, value: unknown) {
  const body = JSON.stringify(value)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  })
  res.end(body)
}

export function registerHttpTransport(ctx: any, app: App, logger: Logger): () => void {
  const webServer = ctx.get('webServer')
  if (!webServer) {
    logger.warn('webServer is unavailable; the panel transport is disabled')
    return () => undefined
  }

  const disposer = webServer.register({
    kind: 'prefix',
    path: '/env-manager/api',
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      try {
        const url = new URL(req.url ?? '/', 'http://localhost')
        if (url.pathname !== '/env-manager/api') {
          send(res, 404, { ok: false, error: { code: 'NOT_FOUND', message: 'Unknown endpoint' } })
          return
        }
        if (req.method !== 'POST') {
          res.setHeader('allow', 'POST')
          send(res, 405, { ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST' } })
          return
        }
        const contentType = req.headers['content-type'] ?? ''
        if (!String(contentType).toLowerCase().includes('application/json')) {
          send(res, 415, {
            ok: false,
            error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Content-Type must be application/json' },
          })
          return
        }
        if (req.headers['x-env-manager-request'] !== '1') {
          send(res, 403, {
            ok: false,
            error: { code: 'FORBIDDEN', message: 'Missing x-env-manager-request header' },
          })
          return
        }
        const origin = req.headers.origin
        if (origin) {
          let sameOrigin = false
          try {
            sameOrigin = new URL(origin).host === req.headers.host
          } catch {
            sameOrigin = false
          }
          if (!sameOrigin) {
            send(res, 403, { ok: false, error: { code: 'FORBIDDEN', message: 'Cross-origin request rejected' } })
            return
          }
        }

        const body = (await readBody(req)) as { op?: unknown; payload?: unknown }
        if (typeof body.op !== 'string') {
          throw new EnvManagerError('INVALID_ARGUMENT', 'Body must contain a string op')
        }
        const payload = (body.payload ?? {}) as Record<string, any>
        const data = await dispatch(body.op, payload)
        send(res, 200, { ok: true, data })
      } catch (error) {
        const envError =
          error instanceof EnvManagerError
            ? error
            : new EnvManagerError(
                'INTERNAL_ERROR',
                error instanceof Error ? error.message : String(error),
              )
        logger.warn(`HTTP ${envError.code}: ${envError.message}`)
        send(res, statusFor(envError.code), {
          ok: false,
          error: {
            code: envError.code,
            message: envError.message,
            details: envError.details,
          },
        })
      }
    },
  })

  async function dispatch(op: string, payload: Record<string, any>): Promise<unknown> {
    switch (op) {
      case 'meta':
        return app.meta()
      case 'list': {
        if (!isRecordKind(payload.kind)) {
          throw new EnvManagerError('INVALID_ARGUMENT', `Unknown record kind "${payload.kind}"`)
        }
        return app.list(payload.kind)
      }
      case 'get':
        if (!isRecordKind(payload.kind)) {
          throw new EnvManagerError('INVALID_ARGUMENT', `Unknown record kind "${payload.kind}"`)
        }
        return app.get(payload.kind, String(payload.id ?? ''))
      case 'find':
        return app.find(String(payload.query ?? ''))
      case 'save': {
        if (!isRecordKind(payload.kind)) {
          throw new EnvManagerError('INVALID_ARGUMENT', `Unknown record kind "${payload.kind}"`)
        }
        if (typeof payload.yaml === 'string') {
          return app.saveYaml(payload.kind, payload.yaml, {
            dryRun: Boolean(payload.dryRun),
            actor: 'ui',
          })
        }
        return app.save(payload.kind, payload.record, {
          dryRun: Boolean(payload.dryRun),
          actor: 'ui',
        })
      }
      case 'remove':
        if (!isRecordKind(payload.kind)) {
          throw new EnvManagerError('INVALID_ARGUMENT', `Unknown record kind "${payload.kind}"`)
        }
        return app.remove(payload.kind, String(payload.id ?? ''), 'ui', {
          dryRun: Boolean(payload.dryRun),
        })
      case 'validate':
      case 'diagnostics':
        return app.validate()
      case 'credential':
        return app.setCredential(String(payload.ref ?? ''), typeof payload.value === 'string' ? payload.value : '')
      case 'credentialUnset':
        return app.unsetCredential(String(payload.ref ?? ''))
      case 'resolve':
        return app.resolve({
          environmentId: String(payload.environmentId ?? ''),
          serviceId: String(payload.serviceId ?? ''),
          deploymentId: payload.deploymentId ? String(payload.deploymentId) : undefined,
        })
      case 'route':
        return app.route({
          operation: String(payload.operation ?? ''),
          environmentId: String(payload.environmentId ?? ''),
          serviceId: payload.serviceId ? String(payload.serviceId) : undefined,
          deploymentId: payload.deploymentId ? String(payload.deploymentId) : undefined,
        })
      default:
        throw new EnvManagerError('INVALID_ARGUMENT', `Unknown operation "${op}"`)
    }
  }

  return disposer
}
