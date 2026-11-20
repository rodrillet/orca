import { rm } from 'node:fs/promises'
import { setImmediate as yieldToEventLoop, setTimeout as delay } from 'node:timers/promises'
import type SyncDatabase from '../../sqlite/sync-database'
import type { SqliteRow } from '../../sqlite/sqlite-statement'
import { renameFileWithWindowsRetryAsync } from '../../../shared/file-write/windows-retry-file-operations'
import { openSessionSearchDatabase } from './session-search-schema'
import { readIndexGeneration } from './session-search-index-generation'
import { traceSessionSearch } from '../session-search-trace'
import {
  removeSessionSearchCopies,
  SESSION_SEARCH_COPY_SOURCE_KEY,
  sessionSearchCopiedPath,
  sessionSearchCopyingPath
} from './session-search-copy-files'
import {
  SESSION_SEARCH_FREE_RESERVE_BYTES as FREE_RESERVE_BYTES,
  sessionSearchCopiedSizeRow,
  sessionSearchCopyDue,
  sessionSearchFreeBytes as freeBytes,
  sessionSearchUsedBytes as usedBytes
} from './session-search-copy-budget'

// Deleted rows leave FTS segment data that merges rarely reach; a fresh copy drops it all.
// Steps aim at 25 ms and run at a tenth of the writer thread, so indexing and queries keep their latency.
const STEP_TARGET_MS = 25
const REST_PER_WORK = 9
const FIRST_ROWS = 32
const MAX_ROWS = 1024
// Under this many changed rows, the last catch-up and table copy run in one step.
const FINAL_CHANGES = 256
const RETRY_AFTER_MS = 60 * 60 * 1000

const MESSAGE_COLUMNS = 'id, session_row_id, role, ts, text_truncated'
const TEXT_COLUMNS = 'user_text, assistant_text, tool_text, identifiers'
// Small tables are copied whole in the last step.
const WHOLE_TABLES = ['meta', 'sessions', 'files', 'sqlite_sequence'] as const

type Copy = {
  target: SyncDatabase
  cursor: number
  rows: number
  dataVersion: unknown
  steps: number
  ready: boolean
}

/**
 * Copies the index into a new file next to it in small paced steps, catching up rows the writer
 * changes meanwhile. `onCopied` tells the owner it caught up; the owner then calls `complete` as it
 * closes the writer and swaps the file in while nothing has the index open. The source is never modified; an abandoned copy is deleted.
 */
export class SessionSearchCompactCopy {
  private copy: Copy | null = null
  private running = false
  private retryAt = 0
  private work = 0

  constructor(
    private readonly db: SyncDatabase,
    private readonly path: string,
    /** Pauses the copy between steps; the next `run` continues it. */
    private readonly stop: () => boolean,
    private readonly onCopied: () => void,
    private readonly due: (db: SyncDatabase) => boolean = sessionSearchCopyDue
  ) {}

  /** Starts or continues a due copy; returns when it is paused, finished or abandoned. */
  async run(): Promise<void> {
    if (this.path === ':memory:' || this.running) {
      return
    }
    this.running = true
    try {
      if (!this.copy && !(await this.begin())) {
        return
      }
      while (!this.stop() && this.copy) {
        const copy = this.copy
        if (this.db.isTransaction) {
          // A step never reads another write's uncommitted rows.
          await yieldToEventLoop()
          continue
        }
        if (this.db.pragma('data_version', { simple: true }) !== copy.dataVersion) {
          // Another connection wrote; its changes bypass the change log.
          await this.abandon()
          return
        }
        if (++copy.steps % 64 === 0 && freeBytes(this.path) < FREE_RESERVE_BYTES) {
          await this.abandon()
          return
        }
        if (copy.cursor !== Number.POSITIVE_INFINITY) {
          await this.step(() => this.copyNextRows(copy))
          continue
        }
        const pending = Number(
          this.db.prepare('SELECT COUNT(*) AS n FROM temp.search_copy_changes').get()!.n
        )
        if (pending > FINAL_CHANGES) {
          await this.step(() => this.catchUp(copy, copy.rows))
          continue
        }
        // Caught up: the owner finishes it with `complete` as it closes the writer.
        if (!copy.ready) {
          copy.ready = true
          this.onCopied()
        }
        return
      }
    } catch (error) {
      await this.abandon()
      throw error
    } finally {
      this.running = false
    }
  }

  /** Ends a caught-up copy with the writer's last changes; no write may follow before the swap. */
  async complete(): Promise<boolean> {
    const copy = this.copy
    if (!copy?.ready || this.running) {
      return false
    }
    if (
      this.db.isTransaction ||
      this.db.pragma('data_version', { simple: true }) !== copy.dataVersion
    ) {
      await this.abandon()
      return false
    }
    try {
      traceSessionSearch('copy', () => this.finish(copy))
      await this.close(copy)
      const copying = sessionSearchCopyingPath(this.path)
      await renameFileWithWindowsRetryAsync(copying, sessionSearchCopiedPath(this.path))
      await rm(`${copying}-shm`, { force: true })
      return true
    } catch (error) {
      await this.abandon()
      throw error
    }
  }

  private async begin(): Promise<boolean> {
    if (Date.now() < this.retryAt || !this.due(this.db)) {
      return false
    }
    if (freeBytes(this.path) < usedBytes(this.db) + FREE_RESERVE_BYTES) {
      this.retryAt = Date.now() + RETRY_AFTER_MS
      return false
    }
    await removeSessionSearchCopies(this.path)
    const target = openSessionSearchDatabase(sessionSearchCopyingPath(this.path))
    // A crash discards this file, so it needs no sync; it can never outgrow its source.
    target.exec('PRAGMA synchronous = OFF')
    target.pragma(`max_page_count = ${Number(this.db.pragma('page_count', { simple: true }))}`)
    // Temp triggers live only on this connection: the file is never changed for other readers.
    this.db.exec(`
      CREATE TEMP TABLE IF NOT EXISTS search_copy_changes(id INTEGER PRIMARY KEY);
      DELETE FROM temp.search_copy_changes;
      CREATE TEMP TRIGGER IF NOT EXISTS search_copy_insert AFTER INSERT ON main.messages BEGIN
        INSERT OR IGNORE INTO search_copy_changes VALUES (NEW.id);
      END;
      CREATE TEMP TRIGGER IF NOT EXISTS search_copy_delete AFTER DELETE ON main.messages BEGIN
        INSERT OR IGNORE INTO search_copy_changes VALUES (OLD.id);
      END;`)
    this.copy = {
      target,
      cursor: 0,
      rows: FIRST_ROWS,
      dataVersion: this.db.pragma('data_version', { simple: true }),
      steps: 0,
      ready: false
    }
    return true
  }

  /** Copies the next rows by id; a change to one already copied is caught up later. */
  private copyNextRows(copy: Copy): number {
    const rows = this.db
      .prepare(`SELECT m.id, m.session_row_id, m.role, m.ts, m.text_truncated,
          f.user_text, f.assistant_text, f.tool_text, f.identifiers
        FROM messages m JOIN messages_fts f ON f.rowid = m.id
        WHERE m.id > ? ORDER BY m.id LIMIT ?`)
      .all(copy.cursor, copy.rows)
    if (rows.length === 0) {
      copy.cursor = Number.POSITIVE_INFINITY
      return 0
    }
    const last = Number(rows.at(-1)!.id)
    // Changes up to here are in the rows just read.
    this.db
      .prepare('DELETE FROM temp.search_copy_changes WHERE id > ? AND id <= ?')
      .run(copy.cursor, last)
    this.write(copy.target, rows, [])
    copy.cursor = last
    return rows.length
  }

  /** Rewrites rows changed since they were copied, from the source as it is now. */
  private catchUp(copy: Copy, limit: number): number {
    const ids = this.db
      .prepare('SELECT id FROM temp.search_copy_changes ORDER BY id LIMIT ?')
      .all(limit)
      .map((row) => Number(row.id))
    if (ids.length === 0) {
      return 0
    }
    const list = JSON.stringify(ids)
    const rows = this.db
      .prepare(`SELECT m.id, m.session_row_id, m.role, m.ts, m.text_truncated,
          f.user_text, f.assistant_text, f.tool_text, f.identifiers
        FROM messages m JOIN messages_fts f ON f.rowid = m.id
        WHERE m.id IN (SELECT value FROM json_each(?)) ORDER BY m.id`)
      .all(list)
    this.db
      .prepare('DELETE FROM temp.search_copy_changes WHERE id IN (SELECT value FROM json_each(?))')
      .run(list)
    this.write(copy.target, rows, ids)
    return ids.length
  }

  /** The last changes and the small tables, in one step so no write lands in between. */
  private finish(copy: Copy): number {
    while (this.catchUp(copy, MAX_ROWS) > 0) {
      // Under FINAL_CHANGES rows remain.
    }
    const target = copy.target
    target.exec('BEGIN')
    try {
      for (const table of WHOLE_TABLES) {
        const columns = this.db
          .prepare(`SELECT name FROM pragma_table_info(?)`)
          .all(table)
          .map((row) => String(row.name))
        target.exec(`DELETE FROM ${table}`)
        const insert = target.prepare(
          `INSERT INTO ${table}(${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`
        )
        for (const row of this.db.prepare(`SELECT ${columns.join(',')} FROM ${table}`).iterate()) {
          insert.run(...columns.map((column) => row[column]))
        }
      }
      const setMeta = target.prepare('INSERT OR REPLACE INTO meta(key, value) VALUES (?, ?)')
      setMeta.run(SESSION_SEARCH_COPY_SOURCE_KEY, String(readIndexGeneration(this.db)))
      setMeta.run(...sessionSearchCopiedSizeRow(target))
      target.exec('COMMIT')
    } catch (error) {
      target.exec('ROLLBACK')
      throw error
    }
    return 1
  }

  private write(target: SyncDatabase, rows: SqliteRow[], replaced: number[]): void {
    target.exec('BEGIN')
    try {
      if (replaced.length) {
        const list = JSON.stringify(replaced)
        target
          .prepare('DELETE FROM messages WHERE id IN (SELECT value FROM json_each(?))')
          .run(list)
        target
          .prepare('DELETE FROM messages_fts WHERE rowid IN (SELECT value FROM json_each(?))')
          .run(list)
      }
      const message = target.prepare(`INSERT INTO messages(${MESSAGE_COLUMNS}) VALUES (?,?,?,?,?)`)
      const text = target.prepare(
        `INSERT INTO messages_fts(rowid, ${TEXT_COLUMNS}) VALUES (?,?,?,?,?)`
      )
      for (const row of rows) {
        message.run(row.id, row.session_row_id, row.role, row.ts, row.text_truncated)
        text.run(row.id, row.user_text, row.assistant_text, row.tool_text, row.identifiers)
      }
      target.exec('COMMIT')
    } catch (error) {
      target.exec('ROLLBACK')
      throw error
    }
  }

  /** Runs one step, sizing the next to the target and resting nine times its length. */
  private async step(run: () => number): Promise<void> {
    const started = performance.now()
    traceSessionSearch('copy', run)
    const elapsed = performance.now() - started
    const copy = this.copy
    if (copy) {
      copy.rows =
        elapsed > STEP_TARGET_MS
          ? Math.max(8, Math.floor(copy.rows / 2))
          : elapsed < STEP_TARGET_MS / 2
            ? Math.min(MAX_ROWS, copy.rows * 2)
            : copy.rows
    }
    this.work += elapsed
    if (this.work >= STEP_TARGET_MS) {
      await delay(this.work * REST_PER_WORK, undefined, { ref: false })
      this.work = 0
    } else {
      await yieldToEventLoop()
    }
  }

  private async close(copy: Copy): Promise<void> {
    this.copy = null
    this.dropChangeLog()
    copy.target.pragma('wal_checkpoint(TRUNCATE)')
    copy.target.close()
  }

  private async abandon(): Promise<void> {
    const copy = this.copy
    if (!copy) {
      return
    }
    this.copy = null
    this.retryAt = Date.now() + RETRY_AFTER_MS
    try {
      this.dropChangeLog()
    } catch {
      // The connection may already be closed; temp triggers go with it.
    }
    copy.target.close()
    await removeSessionSearchCopies(this.path)
  }

  private dropChangeLog(): void {
    this.db.exec(`DROP TRIGGER IF EXISTS temp.search_copy_insert;
      DROP TRIGGER IF EXISTS temp.search_copy_delete;
      DROP TABLE IF EXISTS temp.search_copy_changes;`)
  }
}
