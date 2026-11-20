import { statfsSync } from 'node:fs'
import { dirname } from 'node:path'
import type SyncDatabase from '../../sqlite/sync-database'

const BYTES_PER_MESSAGE_KEY = 'copied_bytes_per_message'
// Smaller indexes are not worth rewriting; a copy is due again once rows grow to twice their copied size.
const MIN_USED_BYTES = 512 * 1024 * 1024
const GROWTH_BEFORE_COPY = 2
/** A copy never takes the disk below this. */
export const SESSION_SEARCH_FREE_RESERVE_BYTES = 2 * 1024 * 1024 * 1024

/** Due once for an index of 512 MiB or more, then when its rows take twice the space they did after the last copy. */
export function sessionSearchCopyDue(db: SyncDatabase, minUsedBytes = MIN_USED_BYTES): boolean {
  const used = sessionSearchUsedBytes(db)
  if (used < minUsedBytes) {
    return false
  }
  const copied = Number(
    db.prepare('SELECT value FROM meta WHERE key = ?').get(BYTES_PER_MESSAGE_KEY)?.value ?? 0
  )
  if (!(copied > 0)) {
    return true
  }
  return used / liveMessages(db) >= copied * GROWTH_BEFORE_COPY
}

/** The meta row a finished copy records: its bytes per live message. */
export function sessionSearchCopiedSizeRow(db: SyncDatabase): [string, string] {
  return [BYTES_PER_MESSAGE_KEY, String(sessionSearchUsedBytes(db) / liveMessages(db))]
}

function liveMessages(db: SyncDatabase): number {
  return Math.max(1, Number(db.prepare('SELECT COUNT(*) AS n FROM messages').get()!.n))
}

export function sessionSearchUsedBytes(db: SyncDatabase): number {
  const pages =
    Number(db.pragma('page_count', { simple: true })) -
    Number(db.pragma('freelist_count', { simple: true }))
  return pages * Number(db.pragma('page_size', { simple: true }))
}

export function sessionSearchFreeBytes(path: string): number {
  const stats = statfsSync(dirname(path))
  return Number(stats.bavail) * Number(stats.bsize)
}
