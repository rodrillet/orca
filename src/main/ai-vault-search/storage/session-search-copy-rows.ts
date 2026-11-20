import type SyncDatabase from '../../sqlite/sync-database'
import type { SqliteRow } from '../../sqlite/sqlite-statement'

const MESSAGE_COLUMNS = 'id, session_row_id, role, ts, text_truncated'
const TEXT_COLUMNS = 'user_text, assistant_text, tool_text, identifiers'

/** A message and its indexed text, by id; the caller adds the WHERE and ORDER BY. */
export const SEARCH_COPY_ROWS = `SELECT m.id, m.session_row_id, m.role, m.ts, m.text_truncated,
    f.user_text, f.assistant_text, f.tool_text, f.identifiers
  FROM messages m JOIN messages_fts f ON f.rowid = m.id`

/** Writes rows into the copy, first removing the `replaced` ids, in one transaction. */
export function writeSearchCopyRows(
  target: SyncDatabase,
  rows: SqliteRow[],
  replaced: number[]
): void {
  target.exec('BEGIN')
  try {
    if (replaced.length) {
      const list = JSON.stringify(replaced)
      target.prepare('DELETE FROM messages WHERE id IN (SELECT value FROM json_each(?))').run(list)
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
    // SQLITE_FULL ends the transaction itself.
    if (target.isTransaction) {
      target.exec('ROLLBACK')
    }
    throw error
  }
}
