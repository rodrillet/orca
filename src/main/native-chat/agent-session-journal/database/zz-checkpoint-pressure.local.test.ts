// Local measurement harness, not part of the suite: the chat store's writer and checkpoint worker
// under memory pressure. Env: BENCH_MIN (default 12), BENCH_ROW_KB (default 2400), BENCH_ROOT.
import { mkdirSync, rmSync, statSync, appendFileSync } from 'node:fs'
import { join } from 'node:path'
import { it } from 'vitest'
import Database from '../../../sqlite/sync-database'
import { JournalSqlBatch } from '../journal-sql-batch'
import { JournalCheckpointOwner } from './journal-checkpoint-owner'

const minutes = Number(process.env.BENCH_MIN ?? 12)
const rowBytes = Number(process.env.BENCH_ROW_KB ?? 2400) * 1024
const root = process.env.BENCH_ROOT ?? '/tmp/checkpoint-pressure-bench'
const out = join(root, 'result.jsonl')

it('runs the writer and checkpoint worker under pressure', async () => {
  rmSync(root, { recursive: true, force: true })
  mkdirSync(root, { recursive: true })
  const filename = join(root, 'chat.db')
  const writer = new Database(filename)
  writer.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA journal_size_limit=${128 * 1024 * 1024};
    CREATE TABLE writes(id INTEGER PRIMARY KEY, body BLOB);`)
  const warnings: string[] = []
  const warn = console.warn
  console.warn = (...args: unknown[]) => {
    warnings.push(args.map(String).join(' '))
    warn(...args)
  }
  const outages: unknown[] = []
  const owner = new JournalCheckpointOwner(writer, filename, {
    onOutage: (outage: unknown) => outages.push(outage)
  } as never)
  const batch = new JournalSqlBatch(writer, owner)
  const state = owner as unknown as {
    stopped: boolean
    blocked: boolean
    log: number
    truncate?: unknown
    current?: { busySince?: number }
    worker?: unknown
  }
  const snapshot = () => ({
    stopped: state.stopped,
    blocked: state.blocked,
    log: state.log,
    truncating: !!state.truncate,
    late: state.current?.busySince !== undefined
  })
  const started = Date.now()
  const end = started + minutes * 60_000
  const batchMs: number[] = []
  let id = 0
  let downMs = 0
  let lastSample = Date.now()
  let maxWal = 0
  const walBytes = () => {
    try {
      return statSync(`${filename}-wal`).size
    } catch {
      return 0
    }
  }
  const sampler = setInterval(() => {
    const now = Date.now()
    if (state.stopped) downMs += now - lastSample
    lastSample = now
    const wal = walBytes()
    maxWal = Math.max(maxWal, wal)
    appendFileSync(out, JSON.stringify({ t: now - started, wal, rows: id, ...snapshot() }) + '\n')
  }, 1000)
  // Old rows are deleted as new ones land, so the store stays bounded while the WAL churns.
  const body = Buffer.alloc(rowBytes, 7)
  while (Date.now() < end) {
    const t0 = performance.now()
    await batch.run([++id], (row) => {
      writer.prepare('INSERT INTO writes VALUES(?, ?)').run(row, body)
      writer.prepare('DELETE FROM writes WHERE id < ?').run(row - 400)
    })
    const ms = performance.now() - t0
    batchMs.push(ms)
    if (ms > 2000) {
      // Where a long wait came from: the state before it ended is in the per-second samples.
      console.log('BENCH-STALL ' + JSON.stringify({ t: Date.now() - started, ms: Math.round(ms), ...snapshot() }))
    }
    await new Promise((resolve) => setImmediate(resolve))
  }
  clearInterval(sampler)
  const tailStart = Date.now()
  // After the run: does the WAL come back under its limit within 30 s of quiet?
  while (Date.now() - tailStart < 30_000 && walBytes() > 128 * 1024 * 1024) {
    owner.afterCommit()
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  const sorted = batchMs.toSorted((a, b) => a - b)
  const pct = (p: number) => Math.round(sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]!)
  const summary = {
    summary: true,
    minutes,
    rows: id,
    batchP50: pct(0.5),
    batchP99: pct(0.99),
    batchMax: Math.round(sorted.at(-1) ?? 0),
    downMs,
    stoppedAtEnd: state.stopped,
    workerAtEnd: !!(state.current ?? state.worker),
    maxWal,
    finalWal: walBytes(),
    warnings,
    outages
  }
  appendFileSync(out, JSON.stringify(summary) + '\n')
  console.log('BENCH-SUMMARY ' + JSON.stringify(summary))
  await owner.close()
  writer.close()
  console.warn = warn
}, 3 * 60 * 60_000)
