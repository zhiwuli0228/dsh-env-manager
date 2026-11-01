import z from '@deepseek-ai/schemastery'

/**
 * Host plugin config (schemastery). See `docs/01-architecture/detailed-design.md` §3.
 */
export const Config = z.object({
  dataDir: z
    .string()
    .default('')
    .description('Registry directory; relative paths resolve against the profile directory.'),
  maxRecords: z.natural().default(2000),
  writePolicy: z
    .object({
      allowUiProductionWrites: z.boolean().default(false),
      requireApprovalForDelete: z.boolean().default(true),
      requireApprovalForProductionSave: z.boolean().default(true),
    })
    .default({}),
  defaults: z
    .object({
      environmentId: z.string().default(''),
    })
    .default({}),
})

export type HostConfig = {
  dataDir: string
  maxRecords: number
  writePolicy: {
    allowUiProductionWrites: boolean
    requireApprovalForDelete: boolean
    requireApprovalForProductionSave: boolean
  }
  defaults: {
    environmentId: string
  }
}

export function normalizeConfig(config: unknown): HostConfig {
  const parsed = Config(config ?? {}) as HostConfig
  return {
    dataDir: parsed.dataDir ?? '',
    maxRecords: parsed.maxRecords ?? 2000,
    writePolicy: {
      allowUiProductionWrites: parsed.writePolicy?.allowUiProductionWrites ?? false,
      requireApprovalForDelete: parsed.writePolicy?.requireApprovalForDelete ?? true,
      requireApprovalForProductionSave:
        parsed.writePolicy?.requireApprovalForProductionSave ?? true,
    },
    defaults: { environmentId: parsed.defaults?.environmentId ?? '' },
  }
}
