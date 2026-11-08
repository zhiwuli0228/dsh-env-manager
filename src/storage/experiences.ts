import { promises as fs } from 'node:fs'
import path from 'node:path'
import YAML from 'yaml'
import { EXPERIENCE_DIR, EXPERIENCE_LIMITS } from '../domain/constants.js'
import { EnvManagerError } from '../domain/errors.js'
import { parseExperience } from '../domain/schemas.js'
import type { ExperienceFilter, ExperienceRecord } from '../domain/types.js'
import type { Logger } from '../logger.js'
import { writeTextAtomic } from './atomic.js'

export interface ExperienceStoreOptions {
  dataDir: string
  logger: Logger
}

/**
 * File-system store for operation experiences. Each record is one YAML file under
 * `<dataDir>/experiences/`; invalid files are skipped with a warning (never fatal).
 * Experiences are plugin-owned records, separate from the registry: they do not
 * participate in registry validation or referential integrity.
 */
export class ExperienceStore {
  constructor(private readonly options: ExperienceStoreOptions) {}

  get directory(): string {
    return path.join(this.options.dataDir, EXPERIENCE_DIR)
  }

  private async ensureDir(): Promise<void> {
    await fs.mkdir(this.directory, { recursive: true })
  }

  /** Newest first, filtered by scope/kind/status. */
  async list(filter: ExperienceFilter = {}): Promise<ExperienceRecord[]> {
    const records = await this.readAll()
    const limit = Math.min(Math.max(filter.limit ?? 25, 1), EXPERIENCE_LIMITS.maxList)
    return records
      .filter((record) => {
        if (filter.operation && record.operation !== filter.operation) return false
        if (filter.environmentId && record.environmentId !== filter.environmentId) return false
        if (filter.serviceId && record.serviceId !== filter.serviceId) return false
        if (filter.kind && record.kind !== filter.kind) return false
        if (filter.status && record.status !== filter.status) return false
        return true
      })
      .sort((a, b) => b.executedAt.localeCompare(a.executedAt) || a.id.localeCompare(b.id))
      .slice(0, limit)
  }

  async read(id: string): Promise<ExperienceRecord | null> {
    const found = await this.readAll()
    return found.find((record) => record.id === id) ?? null
  }

  async write(record: ExperienceRecord): Promise<void> {
    await this.ensureDir()
    const target = path.join(this.directory, `${record.id}.yaml`)
    try {
      await writeTextAtomic(target, YAML.stringify(record, { lineWidth: 0, sortMapEntries: false }))
    } catch (error) {
      if (error instanceof EnvManagerError) throw error
      throw new EnvManagerError('STORAGE_UNWRITABLE', `Could not write experience "${record.id}"`, {
        reason: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /** Deterministic id: exp-YYYYMMDD-HHMMSS with a numeric suffix on collision. */
  async nextId(now = new Date()): Promise<string> {
    const pad = (value: number) => String(value).padStart(2, '0')
    const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}-${pad(
      now.getUTCHours(),
    )}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`
    const base = `exp-${stamp}`
    for (let attempt = 1; attempt <= 100; attempt += 1) {
      const id = attempt === 1 ? base : `${base}-${attempt}`
      try {
        await fs.access(path.join(this.directory, `${id}.yaml`))
      } catch {
        return id
      }
    }
    return `${base}-${Date.now()}`
  }

  private async readAll(): Promise<ExperienceRecord[]> {
    await this.ensureDir()
    let entries: string[]
    try {
      entries = await fs.readdir(this.directory)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
      throw error
    }
    const records: ExperienceRecord[] = []
    for (const entry of entries) {
      if (!entry.endsWith('.yaml')) continue
      const file = path.join(this.directory, entry)
      try {
        const text = await fs.readFile(file, 'utf8')
        const parsed = YAML.parseDocument(text, { strict: true, uniqueKeys: true })
        if (parsed.errors.length > 0) throw new Error(parsed.errors[0]?.message ?? 'invalid YAML')
        const result = parseExperience(parsed.toJS())
        if (!result.ok) {
          throw new Error(result.issues.map((issue) => `${issue.path}: ${issue.message}`).join('; '))
        }
        records.push(result.record)
      } catch (error) {
        this.options.logger.warn(
          `Skipping invalid experience record ${entry}: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }
    return records
  }
}
