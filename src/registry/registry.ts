import { readRecordRaw, listRecordIds } from '../storage/records.js'
import { parseRecordLoose, unknownTopLevelKeys } from '../domain/schemas.js'
import type {
  AnyRecord,
  Diagnostic,
  RecordByKind,
  RecordKind,
  RegistrySnapshot,
} from '../domain/types.js'
import { KIND_DIRECTORIES, RECORD_KINDS, isRecordKind } from '../domain/constants.js'
import { checkIntegrity } from './integrity.js'

function warning(code: string, message: string, file?: string, path?: string): Diagnostic {
  return { code, severity: 'warning', message, file, path }
}

function emptySnapshot(): RegistrySnapshot {
  return {
    environments: new Map(),
    services: new Map(),
    deployments: new Map(),
    ruleProfiles: new Map(),
    operationBindings: new Map(),
    byAlias: new Map(),
    diagnostics: [],
    loadedAt: new Date().toISOString(),
  }
}

function mapFor(snapshot: RegistrySnapshot, kind: RecordKind): Map<string, AnyRecord> {
  switch (kind) {
    case 'environment':
      return snapshot.environments
    case 'service':
      return snapshot.services
    case 'deployment':
      return snapshot.deployments
    case 'ruleProfile':
      return snapshot.ruleProfiles
    case 'operationBinding':
      return snapshot.operationBindings
  }
}

export async function loadSnapshot(dataDir: string): Promise<RegistrySnapshot> {
  const snapshot = emptySnapshot()
  for (const kind of RECORD_KINDS) {
    const ids = await listRecordIds(dataDir, kind)
    for (const id of ids) {
      const file = `${kindDirectoryName(kind)}/${id}.yaml`
      let raw
      try {
        raw = await readRecordRaw(dataDir, kind, id)
      } catch (error) {
        snapshot.diagnostics.push({
          code: 'RECORD_INVALID',
          severity: 'error',
          message: error instanceof Error ? error.message : String(error),
          file,
        })
        continue
      }
      if (!raw.found || raw.raw === undefined) continue
      const document = raw.raw as Record<string, unknown>
      if (document.schemaVersion !== 1) {
        snapshot.diagnostics.push({
          code: 'SCHEMA_UNSUPPORTED',
          severity: 'warning',
          message: `Unsupported schemaVersion ${String(document.schemaVersion)}; record skipped`,
          file,
        })
        continue
      }
      const parsed = parseRecordLoose(kind, document)
      if (!parsed.ok) {
        snapshot.diagnostics.push({
          code: 'RECORD_INVALID',
          severity: 'error',
          message: `Invalid ${kind} record: ${parsed.issues.map((issue) => `${issue.path}: ${issue.message}`).join('; ')}`,
          file,
          details: { issues: parsed.issues },
        })
        continue
      }
      const record = parsed.record
      if (record.id !== id) {
        snapshot.diagnostics.push({
          code: 'RECORD_INVALID',
          severity: 'error',
          message: `Record id "${record.id}" does not match its file name "${id}"`,
          file,
        })
        continue
      }
      const target = mapFor(snapshot, kind)
      if (target.has(record.id)) {
        snapshot.diagnostics.push({
          code: 'DUPLICATE_ID',
          severity: 'error',
          message: `Duplicate ${kind} id "${record.id}"`,
          file,
        })
        continue
      }
      for (const key of unknownTopLevelKeys(kind, document)) {
        snapshot.diagnostics.push(
          warning('UNKNOWN_FIELD', `Unknown field "${key}" is preserved but not interpreted`, file, key),
        )
      }
      target.set(record.id, record)
      const names = new Set<string>([record.id])
      const maybeNamed = record as { name?: string; aliases?: string[] }
      if (maybeNamed.name) names.add(maybeNamed.name)
      for (const alias of maybeNamed.aliases ?? []) names.add(alias)
      for (const name of names) {
        const key = `${kind}:${name.toLowerCase()}`
        if (!snapshot.byAlias.has(key)) snapshot.byAlias.set(key, record.id)
      }
    }
  }
  snapshot.diagnostics.push(...checkIntegrity(snapshot))
  return snapshot
}

function kindDirectoryName(kind: RecordKind): string {
  return KIND_DIRECTORIES[kind]
}

export function lookup<T extends RecordKind>(
  snapshot: RegistrySnapshot,
  kind: T,
  id: string,
): RecordByKind[T] | undefined {
  return mapFor(snapshot, kind).get(id) as RecordByKind[T] | undefined
}

/** Lookup an id that may be an id, a name, or an alias. */
export function lookupByRef<T extends RecordKind>(
  snapshot: RegistrySnapshot,
  kind: T,
  ref: string,
): RecordByKind[T] | undefined {
  return (
    lookup(snapshot, kind, ref) ??
    (snapshot.byAlias.get(`${kind}:${ref.toLowerCase()}`) as
      | RecordByKind[T]
      | undefined)
  )
}

export class RegistryLoader {
  private last: RegistrySnapshot | undefined
  private inflight: Promise<RegistrySnapshot> | undefined

  constructor(private readonly dataDir: string) {}

  get lastSnapshot(): RegistrySnapshot | undefined {
    return this.last
  }

  async load(): Promise<RegistrySnapshot> {
    if (this.inflight) return this.inflight
    const run = loadSnapshot(this.dataDir)
      .then((snapshot) => {
        this.last = snapshot
        return snapshot
      })
      .catch((error) => {
        if (this.last) {
          const diagnostics = [
            ...this.last.diagnostics,
            {
              code: 'INTERNAL_ERROR',
              severity: 'error' as const,
              message: `Registry reload failed; serving the previous snapshot: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ]
          return { ...this.last, diagnostics }
        }
        throw error
      })
      .finally(() => {
        this.inflight = undefined
      })
    this.inflight = run
    return run
  }
}

export function requireKind(value: string): RecordKind {
  if (!isRecordKind(value)) throw new Error(`Unknown record kind: ${value}`)
  return value
}
