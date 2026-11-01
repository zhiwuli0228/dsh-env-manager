import path from 'node:path'
import { createHash } from 'node:crypto'
import { ID_PATTERN, KIND_DIRECTORIES, SESSION_ID_PATTERN } from '../domain/constants.js'
import type { RecordKind } from '../domain/types.js'

export function resolveDataDir(configured: string, profileDir: string, cwd: string, home: string) {
  const value = configured.trim()
  if (!value) return path.join(profileDir, 'data')
  if (value.startsWith('~')) return path.join(home, value.slice(1))
  return path.isAbsolute(value) ? value : path.resolve(profileDir || cwd, value)
}

export function kindDir(dataDir: string, kind: RecordKind): string {
  return path.join(dataDir, KIND_DIRECTORIES[kind])
}

export function isValidId(id: string): boolean {
  return ID_PATTERN.test(id)
}

export function resolveRecordPath(dataDir: string, kind: RecordKind, id: string): string {
  if (!isValidId(id)) {
    throw new Error(`Invalid record id: ${JSON.stringify(id)}`)
  }
  const dir = kindDir(dataDir, kind)
  const target = path.resolve(dir, `${id}.yaml`)
  const root = path.resolve(dir) + path.sep
  if (!target.startsWith(root)) throw new Error(`Record path escapes ${dir}`)
  return target
}

export function sessionFileName(sessionId: string): string {
  if (SESSION_ID_PATTERN.test(sessionId)) return `${sessionId}.json`
  const digest = createHash('sha256').update(sessionId).digest('hex')
  return `s-${digest}.json`
}

export function sessionPath(dataDir: string, sessionId: string): string {
  return path.join(dataDir, 'sessions', sessionFileName(sessionId))
}

export function backupsDir(dataDir: string): string {
  return path.join(dataDir, '.backups')
}

export function backupDir(dataDir: string, kind: RecordKind, id: string): string {
  return path.join(backupsDir(dataDir), KIND_DIRECTORIES[kind], id)
}

export function sessionBackupDir(dataDir: string, sessionId: string): string {
  const name = SESSION_ID_PATTERN.test(sessionId)
    ? sessionId
    : createHash('sha256').update(sessionId).digest('hex')
  return path.join(backupsDir(dataDir), 'sessions', name)
}
