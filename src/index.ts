import os from 'node:os'
import { App } from './app/app.js'
import { Config, normalizeConfig } from './config.js'
import { consoleLogger } from './logger.js'
import { resolveDataDir } from './storage/paths.js'
import { cleanupTempFiles } from './storage/atomic.js'
import { createEnvironmentManagerSkill } from './skill.js'
import { createToolDefinitions } from './tools/tools.js'
import { registerHttpTransport } from './transport/http.js'

export const name = 'dsh-env-manager'

export const inject = ['tools']

export { Config }

export interface ApplyConfig {
  dataDir?: string
  maxRecords?: number
  registerSkill?: boolean
  writePolicy?: {
    allowUiProductionWrites?: boolean
    requireApprovalForDelete?: boolean
    requireApprovalForProductionSave?: boolean
  }
  defaults?: { environmentId?: string }
}

export function apply(ctx: any, config: ApplyConfig = {}): void {
  const normalized = normalizeConfig(config)
  const profileContext = ctx.get('profileContext') as { dir?: string } | undefined
  const profileDir =
    profileContext?.dir ?? process.env.DSH_PROFILE_DIR ?? process.cwd()
  const dataDir = resolveDataDir(
    normalized.dataDir,
    profileDir,
    process.cwd(),
    os.homedir(),
  )

  const skills = ctx.get('skills')
  const credentials = ctx.get('credentials')

  const app = new App({
    dataDir,
    maxRecords: normalized.maxRecords,
    writePolicy: {
      allowUiProductionWrites: normalized.writePolicy.allowUiProductionWrites,
    },
    skills: skills
      ? {
          snapshot: (options?: { signal?: AbortSignal }) => skills.snapshot(options),
        }
      : null,
    credentials: credentials
      ? {
          async describe(ref: string) {
            const info = await credentials.describe(ref)
            return { configured: info.configured, source: info.source }
          },
          async set(ref: string, value: string) {
            if (typeof credentials.set !== 'function') {
              throw new Error('the credential service is not writable')
            }
            await credentials.set(ref, value)
          },
          async unset(ref: string) {
            if (typeof credentials.unset !== 'function') {
              throw new Error('the credential service is not writable')
            }
            await credentials.unset(ref)
          },
        }
      : null,
    logger: consoleLogger,
    defaults: normalized.defaults,
  })

  void app.init().catch((error) => {
    consoleLogger.error(
      `Could not initialize ${dataDir}: ${error instanceof Error ? error.message : String(error)}`,
    )
  })
  void cleanupTempFiles(dataDir).catch(() => undefined)

  const disposeTools: Array<() => void> = []

  ctx.effect(() => {
    const definitions = createToolDefinitions({
      ctx,
      app,
      defaults: normalized.defaults,
      writePolicy: normalized.writePolicy,
    })
    for (const definition of definitions) {
      disposeTools.push(ctx.tools.register(definition))
    }
    const disposeHttp = registerHttpTransport(ctx, app, consoleLogger)

    let disposeSkill: (() => void) | undefined
    if (normalized.registerSkill && skills && typeof skills.register === 'function') {
      try {
        disposeSkill = skills.register(createEnvironmentManagerSkill())
        consoleLogger.debug('Registered discovery skill dsh-env-manager')
      } catch (error) {
        consoleLogger.warn(
          `Could not register discovery skill: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }

    return () => {
      disposeSkill?.()
      for (const dispose of disposeTools.splice(0)) dispose()
      disposeHttp()
    }
  })

  consoleLogger.info(`Environment registry ready at ${dataDir}`)
}
