import { promises as fs } from 'node:fs'
import path from 'node:path'
import YAML from 'yaml'
import { LIMITS } from '../domain/constants.js'
import { EnvManagerError } from '../domain/errors.js'
import type { AnyRecord, RecordKind } from '../domain/types.js'
import { backupDir, kindDir, resolveRecordPath } from './paths.js'
import { rotateBackup, serialize, writeTextAtomic } from './atomic.js'

export interface RawRecord {
  found: boolean
  text?: string
  raw?: unknown
  bytes?: number
}

export function parseYamlText(text: string, file?: string): unknown {
  let document
  try {
    document = YAML.parseDocument(text, { strict: true, uniqueKeys: true })
  } catch (error) {
    throw new EnvManagerError('RECORD_INVALID', `Invalid YAML${file ? ` in ${file}` : ''}`, {
      file,
      reason: error instanceof Error ? error.message : String(error),
    })
  }
  if (document.errors.length > 0) {
    throw new EnvManagerError('RECORD_INVALID', `Invalid YAML${file ? ` in ${file}` : ''}`, {
      file,
      issues: document.errors.map((issue) => issue.message),
    })
  }
  let value: unknown
  try {
    value = document.toJS({ maxAliasCount: 100 })
  } catch (error) {
    throw new EnvManagerError('RECORD_INVALID', `Invalid YAML${file ? ` in ${file}` : ''}`, {
      file,
      reason: error instanceof Error ? error.message : String(error),
    })
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new EnvManagerError('RECORD_INVALID', 'Record document must be an object', { file })
  }
  return value
}

export function stringifyRecord(record: AnyRecord): string {
  return YAML.stringify(record, { lineWidth: 0, sortMapEntries: false })
}

export async function readRecordRaw(
  dataDir: string,
  kind: RecordKind,
  id: string,
): Promise<RawRecord> {
  const target = resolveRecordPath(dataDir, kind, id)
  let text: string
  try {
    text = await fs.readFile(target, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { found: false }
    throw error
  }
  return { found: true, text, raw: parseYamlText(text, target), bytes: Buffer.byteLength(text) }
}

export async function writeRecordFile(
  dataDir: string,
  kind: RecordKind,
  record: AnyRecord,
): Promise<void> {
  const target = resolveRecordPath(dataDir, kind, record.id)
  const text = stringifyRecord(record)
  const bytes = Buffer.byteLength(text, 'utf8')
  if (bytes > LIMITS.recordBytes) {
    throw new EnvManagerError(
      'RECORD_TOO_LARGE',
      `Record ${record.id} is ${bytes} bytes; the limit is ${LIMITS.recordBytes}`,
      { kind, id: record.id, bytes },
    )
  }
  await serialize(target, async () => {
    await rotateBackup(target, backupDir(dataDir, kind, record.id), 'yaml')
    await writeTextAtomic(target, text)
  })
}

export async function deleteRecordFile(
  dataDir: string,
  kind: RecordKind,
  id: string,
): Promise<void> {
  const target = resolveRecordPath(dataDir, kind, id)
  await serialize(target, async () => {
    await rotateBackup(target, backupDir(dataDir, kind, id), 'yaml')
    try {
      await fs.unlink(target)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
  })
}

export async function listRecordIds(dataDir: string, kind: RecordKind): Promise<string[]> {
  let entries: string[]
  try {
    entries = await fs.readdir(kindDir(dataDir, kind))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
  return entries
    .filter((entry) => entry.endsWith('.yaml'))
    .map((entry) => entry.slice(0, -'.yaml'.length))
    .filter((id) => /^[a-z0-9][a-z0-9-]{0,62}$/.test(id))
    .sort()
}

export function fileForRecord(dataDir: string, kind: RecordKind, id: string): string {
  return resolveRecordPath(dataDir, kind, id)
}

export async function recordExists(
  dataDir: string,
  kind: RecordKind,
  id: string,
): Promise<boolean> {
  try {
    await fs.access(resolveRecordPath(dataDir, kind, id))
    return true
  } catch {
    return false
  }
}

export function relativeFile(dataDir: string, target: string): string {
  return path.relative(dataDir, target).replaceAll(path.sep, '/')
}
