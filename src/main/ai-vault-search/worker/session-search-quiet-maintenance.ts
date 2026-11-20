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
  private ops = 0

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

  /** Every writer command but a sync counts as indexing and pauses a copy. Only a change to what
   *  the index holds, or a copy to resume, schedules maintenance; periodic purges and state
   *  updates alone do not. */
  observe(op: string): void {
    if (op === 'sync') {
      return
    }
    this.lastWrite = performance.now()
    if (++this.ops % 1024 === 0) {
      void this.copy?.boundChanges().catch(() => undefined)
    }
    if (op === 'finish' || op === 'remove' || this.copy?.active) {
      this.wrote()
    }
  }

  private wrote(): void {
    this.lastWrite = performance.now()
    clearTimeout(this.timer)
    this.timer = setTimeout(() => this.runQuiet(), QUIET_INDEXING_MS)
    this.timer.unref()
  }

  /** Finishes a caught-up copy; true when it is ready to swap in. */
  finishCopy(): Promise<boolean> {
    return this.copy?.complete() ?? Promise.resolve(false)
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
