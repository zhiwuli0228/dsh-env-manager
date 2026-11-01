import { promises as fs } from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { LIMITS } from '../domain/constants.js'

const queues = new Map<string, Promise<void>>()

/**
 * Serialize writes to one absolute path within this process.
 * No cross-process lock exists in V1.
 */
export function serialize<T>(key: string, work: () => Promise<T>): Promise<T> {
  const previous = queues.get(key) ?? Promise.resolve()
  const run = previous.then(work, work)
  const guard = run.then(
    () => undefined,
    () => undefined,
  )
  queues.set(key, guard)
  return run.finally(() => {
    if (queues.get(key) === guard) queues.delete(key)
  })
}

export async function writeTextAtomic(target: string, text: string): Promise<void> {
  await fs.mkdir(path.dirname(target), { recursive: true })
  const temp = path.join(
    path.dirname(target),
    `.${path.basename(target)}.${process.pid}.${randomUUID()}.tmp`,
  )
  const handle = await fs.open(temp, 'w')
  try {
    await handle.writeFile(text, 'utf8')
    await handle.sync()
  } finally {
    await handle.close()
  }
  try {
    await fs.rename(temp, target)
  } catch (error) {
    await fs.rm(temp, { force: true }).catch(() => undefined)
    throw error
  }
}

export async function rotateBackup(
  source: string,
  backupDirectory: string,
  extension: string,
): Promise<void> {
  let text: string
  try {
    text = await fs.readFile(source, 'utf8')
  } catch {
    return
  }
  await fs.mkdir(backupDirectory, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const target = path.join(
    backupDirectory,
    `${stamp}-${process.pid}-${randomUUID().slice(0, 8)}.${extension}`,
  )
  await fs.writeFile(target, text, { encoding: 'utf8', flag: 'wx' })
  const entries = await fs.readdir(backupDirectory)
  const backups = entries
    .filter((entry) => entry.endsWith(`.${extension}`))
    .sort()
    .reverse()
  for (const stale of backups.slice(LIMITS.backupCount)) {
    await fs.rm(path.join(backupDirectory, stale), { force: true }).catch(() => undefined)
  }
}

async function collectTempFiles(dir: string, cutoff: number): Promise<string[]> {
  const found: string[] = []
  let entries
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return found
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === '.backups' || entry.name === 'node_modules') continue
      found.push(...(await collectTempFiles(full, cutoff)))
    } else if (entry.name.endsWith('.tmp')) {
      try {
        const stat = await fs.stat(full)
        if (stat.mtimeMs < cutoff) found.push(full)
      } catch {
        // Ignore a temp file that disappeared during the scan.
      }
    }
  }
  return found
}

/** Remove orphan `.tmp` files older than one hour. */
export async function cleanupTempFiles(dataDir: string): Promise<number> {
  const files = await collectTempFiles(dataDir, Date.now() - 60 * 60 * 1000)
  let removed = 0
  for (const file of files) {
    try {
      await fs.rm(file, { force: true })
      removed += 1
    } catch {
      // Best effort; a locked temp file is retried on the next startup.
    }
  }
  return removed
}

export async function ensureLayout(dataDir: string): Promise<void> {
  await fs.mkdir(dataDir, { recursive: true })
}
