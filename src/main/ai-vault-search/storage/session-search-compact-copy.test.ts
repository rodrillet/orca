import { existsSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it } from 'vitest'
import type SyncDatabase from '../../sqlite/sync-database'
import { deleteSearchMessages, insertSearchMessage } from './session-search-message-rows'
import { SessionSearchCompactCopy } from './session-search-compact-copy'
import { sessionSearchCopiedPath, swapInSessionSearchCopy } from './session-search-copy-files'
import { openSessionSearchDatabase } from './session-search-schema'
import { ensureSessionSearchQuerySchema } from './session-search-query-schema'

const roots: string[] = []
const open: SyncDatabase[] = []
afterEach(() => {
  for (const db of open.splice(0)) {
    try {
      db.close()
    } catch {
      // Closed by the test.
    }
  }
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true })
  }
})

function index(): { path: string; db: SyncDatabase } {
  const root = mkdtempSync(join(tmpdir(), 'search-copy-'))
  roots.push(root)
  const path = join(root, 'index.sqlite')
  const db = openSessionSearchDatabase(path)
  ensureSessionSearchQuerySchema(db)
  open.push(db)
  return { path, db }
}

function session(db: SyncDatabase, name: string, count: number): number {
  const id = Number(
    db
      .prepare(`INSERT INTO sessions(agent, session_id, file_path, title, resume_command)
        VALUES ('claude', ?, ?, ?, 'resume')`)
      .run(name, `/${name}.jsonl`, name).lastInsertRowid
  )
  db.prepare(
    `INSERT INTO files(path, byte_offset, mtime_ms, session_row_id) VALUES (?, 0, 1, ?)`
  ).run(`/${name}.jsonl`, id)
  db.exec('BEGIN')
  for (let index = 0; index < count; index++) {
    insertSearchMessage(db, id, {
      role: index % 2 ? 'assistant' : 'user',
      text: `${name} message ${index} about widget${index % 7} and src/${name}/file${index}.ts`,
      timestamp: null,
      textTruncated: false
    } as never)
  }
  db.exec('COMMIT')
  return id
}

function remove(db: SyncDatabase, id: number): void {
  db.exec('BEGIN')
  deleteSearchMessages(db, id)
  db.prepare('DELETE FROM sessions WHERE id = ?').run(id)
  db.exec('COMMIT')
}

function contents(db: SyncDatabase) {
  return {
    messages: db.prepare('SELECT * FROM messages ORDER BY id').all(),
    text: db.prepare('SELECT rowid, * FROM messages_fts ORDER BY rowid').all(),
    hits: db
      .prepare(`SELECT rowid FROM messages_fts WHERE messages_fts MATCH 'widget3' ORDER BY rowid`)
      .all(),
    sessions: db.prepare('SELECT * FROM sessions ORDER BY id').all(),
    files: db.prepare('SELECT * FROM files ORDER BY path').all(),
    meta: db.prepare(`SELECT * FROM meta WHERE key NOT LIKE 'copied_%' ORDER BY key`).all()
  }
}

it('copies a churned index into a smaller file, catching up writes made while it was paused', async () => {
  const file = index()
  const db = file.db
  const churned = Array.from({ length: 6 }, (_, index) => session(db, `old${index}`, 400))
  const kept = session(db, 'kept', 400)
  for (const id of churned) {
    remove(db, id)
  }
  const pagesBefore = Number(db.prepare('SELECT COUNT(*) AS n FROM messages_fts_data').get()!.n)

  let paused = false
  let steps = 0
  let copied = 0
  const copy = new SessionSearchCompactCopy(
    db,
    file.path,
    () => paused || (++steps === 3 && (paused = true)),
    () => copied++,
    () => true
  )
  await copy.run()
  expect(copied).toBe(0)
  // While paused: new rows, and rows already copied are deleted.
  session(db, 'added', 300)
  remove(db, kept)
  session(db, 'later', 50)
  paused = false
  await copy.run()
  expect(copied).toBe(1)
  // Written after it caught up, before the writer closes for the swap.
  session(db, 'last', 20)
  expect(await copy.complete()).toBe(true)

  const expected = contents(db)
  db.close()
  expect(await swapInSessionSearchCopy(file.path)).toBe(true)
  expect(existsSync(sessionSearchCopiedPath(file.path))).toBe(false)
  const swapped = openSessionSearchDatabase(file.path)
  open.push(swapped)
  expect(contents(swapped)).toEqual(expected)
  expect(expected.hits.length).toBeGreaterThan(0)
  swapped.prepare("INSERT INTO messages_fts(messages_fts) VALUES ('integrity-check')").run()
  expect(
    Number(swapped.prepare('SELECT COUNT(*) AS n FROM messages_fts_data').get()!.n)
  ).toBeLessThan(pagesBefore / 2)
})

it('drops a finished copy when the index changed after it was taken', async () => {
  const file = index()
  session(file.db, 'one', 50)
  let copied = 0
  const copy = new SessionSearchCompactCopy(
    file.db,
    file.path,
    () => false,
    () => copied++,
    () => true
  )
  await copy.run()
  expect(copied).toBe(1)
  expect(await copy.complete()).toBe(true)
  session(file.db, 'two', 5)
  file.db.close()
  expect(await swapInSessionSearchCopy(file.path)).toBe(false)
  expect(existsSync(sessionSearchCopiedPath(file.path))).toBe(false)
})

it('puts the old index back when a swap stopped between its renames', async () => {
  const file = index()
  session(file.db, 'kept', 30)
  file.db.close()
  renameSync(file.path, `${file.path}.replaced`)
  writeFileSync(sessionSearchCopiedPath(file.path), 'not an index')
  expect(await swapInSessionSearchCopy(file.path)).toBe(false)
  const reopened = openSessionSearchDatabase(file.path)
  open.push(reopened)
  expect(Number(reopened.prepare('SELECT COUNT(*) AS n FROM messages').get()!.n)).toBe(30)
  expect(existsSync(sessionSearchCopiedPath(file.path))).toBe(false)
})
