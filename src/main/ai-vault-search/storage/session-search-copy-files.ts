import { existsSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import SyncDatabase from '../../sqlite/sync-database'
import { renameFileWithWindowsRetryAsync } from '../../../shared/file-write/windows-retry-file-operations'
import { readIndexGeneration } from './session-search-index-generation'

export const sessionSearchCopyingPath = (path: string): string => `${path}.copying`
export const sessionSearchCopiedPath = (path: string): string => `${path}.copied`
/** The index generation a finished copy was taken at. */
export const SESSION_SEARCH_COPY_SOURCE_KEY = 'copied_from_generation'

export async function removeSessionSearchCopies(path: string): Promise<void> {
  for (const file of [sessionSearchCopyingPath(path), sessionSearchCopiedPath(path)]) {
    for (const suffix of ['', '-wal', '-shm', '-journal']) {
      await rm(`${file}${suffix}`, { force: true })
    }
  }
}

/**
 * Swaps a finished copy in while nothing has the index open. A copy is kept only when the index
 * has not changed since it was taken (an older build may have written to it since).
 */
export async function swapInSessionSearchCopy(path: string): Promise<boolean> {
  const copied = sessionSearchCopiedPath(path)
  if (path === ':memory:' || !existsSync(copied)) {
    return false
  }
  let current = false
  try {
    const source = new SyncDatabase(path, { fileMustExist: true })
    let generation: number
    try {
      generation = readIndexGeneration(source)
      // Folds the WAL in; closing the last connection deletes it.
      source.pragma('wal_checkpoint(TRUNCATE)')
    } finally {
      source.close()
    }
    const copy = new SyncDatabase(copied, { readonly: true, fileMustExist: true })
    try {
      const row = copy
        .prepare('SELECT value FROM meta WHERE key = ?')
        .get(SESSION_SEARCH_COPY_SOURCE_KEY)
      current = Number(row?.value) === generation
    } finally {
      copy.close()
    }
    // A WAL still present means another connection holds the index open.
    current &&= !existsSync(`${path}-wal`)
  } catch {
    current = false
  }
  if (!current) {
    await removeSessionSearchCopies(path)
    return false
  }
  await rm(`${path}-shm`, { force: true })
  await renameFileWithWindowsRetryAsync(copied, path)
  return true
}
