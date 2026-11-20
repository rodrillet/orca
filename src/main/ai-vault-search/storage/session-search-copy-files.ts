import { existsSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import SyncDatabase from '../../sqlite/sync-database'
import { renameFileWithWindowsRetryAsync } from '../../../shared/file-write/windows-retry-file-operations'
import { readIndexGeneration } from './session-search-index-generation'

export const sessionSearchCopyingPath = (path: string): string => `${path}.copying`
export const sessionSearchCopiedPath = (path: string): string => `${path}.copied`
const sessionSearchReplacedPath = (path: string): string => `${path}.replaced`
/** The index generation a finished copy was taken at. */
export const SESSION_SEARCH_COPY_SOURCE_KEY = 'copied_from_generation'

export async function removeSessionSearchCopies(path: string): Promise<void> {
  await restoreReplacedIndex(path)
  for (const file of [sessionSearchCopyingPath(path), sessionSearchCopiedPath(path)]) {
    for (const suffix of ['', '-wal', '-shm', '-journal']) {
      await rm(`${file}${suffix}`, { force: true })
    }
  }
}

/** A swap cut short between its renames left the old index aside: it goes back. */
async function restoreReplacedIndex(path: string): Promise<void> {
  const replaced = sessionSearchReplacedPath(path)
  if (path !== ':memory:' && existsSync(replaced)) {
    await (existsSync(path)
      ? rm(replaced, { force: true })
      : renameFileWithWindowsRetryAsync(replaced, path))
  }
}

/** The index's generation once its WAL is folded in; null when another connection holds it open. */
function closedIndexGeneration(path: string): number | null {
  const source = new SyncDatabase(path, { fileMustExist: true })
  let generation: number
  try {
    generation = readIndexGeneration(source)
    source.pragma('wal_checkpoint(TRUNCATE)')
  } finally {
    source.close()
  }
  // Closing the last connection deletes the WAL; one still present means another holds it.
  return existsSync(`${path}-wal`) ? null : generation
}

/**
 * Swaps a finished copy in while nothing has the index open. A copy is kept only when the index
 * has not changed since it was taken (an older build may have written to it since). Any other
 * leftover copy is removed.
 */
export async function swapInSessionSearchCopy(path: string): Promise<boolean> {
  const copied = sessionSearchCopiedPath(path)
  if (path === ':memory:') {
    return false
  }
  await restoreReplacedIndex(path)
  let taken: number | null = null
  try {
    const copy = new SyncDatabase(copied, { readonly: true, fileMustExist: true })
    try {
      taken = Number(
        copy.prepare('SELECT value FROM meta WHERE key = ?').get(SESSION_SEARCH_COPY_SOURCE_KEY)
          ?.value
      )
    } finally {
      copy.close()
    }
  } catch {
    taken = null
  }
  const current = () => {
    try {
      return taken !== null && closedIndexGeneration(path) === taken
    } catch {
      return false
    }
  }
  if (!current()) {
    await removeSessionSearchCopies(path)
    return false
  }
  await rm(`${path}-shm`, { force: true })
  // Checked again right before the renames, so only that instant is open to another writer.
  if (!current()) {
    await removeSessionSearchCopies(path)
    return false
  }
  // Freeing a multi-GB file can take seconds, so the old one is deleted after the index reopens.
  const replaced = sessionSearchReplacedPath(path)
  await renameFileWithWindowsRetryAsync(path, replaced)
  try {
    await renameFileWithWindowsRetryAsync(copied, path)
  } catch (error) {
    await renameFileWithWindowsRetryAsync(replaced, path)
    throw error
  }
  void rm(replaced, { force: true }).catch(() => undefined)
  return true
}
