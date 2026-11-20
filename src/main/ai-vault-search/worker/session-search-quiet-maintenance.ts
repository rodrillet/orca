import { parentPort } from 'node:worker_threads'
import type SyncDatabase from '../../sqlite/sync-database'
import { SessionSearchCompactCopy } from '../storage/session-search-compact-copy'
import { removeSessionSearchCopies } from '../storage/session-search-copy-files'

// Maintenance waits until indexing has been quiet this long, and pauses when it resumes.
const QUIET_INDEXING_MS = 60_000

/** The writer's work that runs only while indexing is quiet: compacting the index into a copy. */
export class SessionSearchQuietMaintenance {
  private lastWrite = 0
  private timer: NodeJS.Timeout | undefined
  private copy: SessionSearchCompactCopy | null = null

  open(db: SyncDatabase, path: string): void {
    // A copy left by an earlier writer was swapped in or is stale.
    void removeSessionSearchCopies(path).catch(() => undefined)
    this.copy = new SessionSearchCompactCopy(
      db,
      path,
      () => !this.quiet,
      () => parentPort?.postMessage({ id: 0, copied: true })
    )
    this.wrote()
  }

  wrote(): void {
    this.lastWrite = performance.now()
    clearTimeout(this.timer)
    this.timer = setTimeout(() => this.runQuiet(), QUIET_INDEXING_MS)
    this.timer.unref()
  }

  private get quiet(): boolean {
    return performance.now() - this.lastWrite >= QUIET_INDEXING_MS
  }

  private runQuiet(): void {
    // Each step is synchronous; writes between steps are caught up from the change log.
    void this.copy?.run().catch((error: unknown) => {
      console.warn(
        '[ai-vault-search] index copy failed:',
        error instanceof Error ? error.name : 'Error'
      )
    })
  }
}
