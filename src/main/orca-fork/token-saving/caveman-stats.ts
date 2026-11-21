// orca-fork: what this machine's Caveman proxy recorded for Orca's launches, read from its own
// caveman.db (`requests`, one row per model call, tagged by the `/w/<slug>` route Orca gave it).
import { existsSync } from 'node:fs'
import type {
  TokenSavingAgentStats,
  TokenSavingTotals
} from '../../../shared/orca-fork/token-saving/token-saving-rpc'
import SyncDatabase from '../../sqlite/sync-database'
import { cavemanDatabasePath } from './caveman-install'

type Row = {
  slug: string | null
  requests: number
  input: number | null
  output: number | null
  cache_read: number | null
  cache_write: number | null
  saved: number | null
  last_at: string | null
}

// Saved = the proxy's own before/after count of a measured request, never a negative delta.
const QUERY = `
SELECT agent_slug AS slug,
  COUNT(*) AS requests,
  SUM(COALESCE(input_tokens, 0)) AS input,
  SUM(COALESCE(output_tokens, 0)) AS output,
  SUM(COALESCE(cached_input_tokens, 0)) AS cache_read,
  SUM(COALESCE(cache_creation_input_tokens, 0)) AS cache_write,
  SUM(CASE WHEN request_measurement_status = 'measured'
        AND request_tokens_before > request_tokens_after
        THEN request_tokens_before - request_tokens_after ELSE 0 END) AS saved,
  MAX(ts) AS last_at
FROM requests
WHERE ts >= ? AND (agent_slug = 'orca' OR agent_slug LIKE 'orca-%')
GROUP BY agent_slug`

function field(row: unknown, key: string): unknown {
  return typeof row === 'object' && row !== null && key in row
    ? Object.getOwnPropertyDescriptor(row, key)?.value
    : null
}

function readRow(row: unknown): Row {
  const text = (key: string): string | null => {
    const value = field(row, key)
    return typeof value === 'string' ? value : null
  }
  const count = (key: string): number | null => {
    const value = field(row, key)
    return typeof value === 'number' || typeof value === 'bigint' ? Number(value) : null
  }
  return {
    slug: text('slug'),
    requests: count('requests') ?? 0,
    input: count('input'),
    output: count('output'),
    cache_read: count('cache_read'),
    cache_write: count('cache_write'),
    saved: count('saved'),
    last_at: text('last_at')
  }
}

function emptyTotals(): TokenSavingTotals {
  return {
    requests: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    savedTokens: 0
  }
}

function add(into: TokenSavingTotals, from: TokenSavingTotals): void {
  into.requests += from.requests
  into.inputTokens += from.inputTokens
  into.outputTokens += from.outputTokens
  into.cacheReadTokens += from.cacheReadTokens
  into.cacheWriteTokens += from.cacheWriteTokens
  into.savedTokens += from.savedTokens
}

export function readCavemanStats(
  days: number,
  botOfSlug: (slug: string) => string | null
): { days: number; total: TokenSavingTotals; agents: TokenSavingAgentStats[] } | null {
  const path = cavemanDatabasePath()
  if (!existsSync(path)) {
    return null
  }
  let db: SyncDatabase | null = null
  try {
    db = new SyncDatabase(path, { readonly: true, fileMustExist: true, timeout: 1_000 })
    db.pragma('query_only = ON')
    // caveman.db writes `YYYY-MM-DD HH:MM:SS.mmm` (UTC), so the bound uses the same spelling.
    const since = new Date(Date.now() - days * 86_400_000)
      .toISOString()
      .replace('T', ' ')
      .slice(0, 23)
    const rows = db.prepare(QUERY).all(since).map(readRow)
    const total = emptyTotals()
    const agents = rows
      .filter((row): row is Row & { slug: string } => typeof row.slug === 'string')
      .map((row): TokenSavingAgentStats => {
        const totals: TokenSavingTotals = {
          requests: Number(row.requests) || 0,
          inputTokens: Number(row.input) || 0,
          outputTokens: Number(row.output) || 0,
          cacheReadTokens: Number(row.cache_read) || 0,
          cacheWriteTokens: Number(row.cache_write) || 0,
          savedTokens: Number(row.saved) || 0
        }
        add(total, totals)
        return { ...totals, slug: row.slug, botId: botOfSlug(row.slug), lastAt: row.last_at }
      })
      .sort((a, b) => b.requests - a.requests)
    return { days, total, agents }
  } catch (error) {
    console.warn('[token-saving] caveman stats unreadable', error)
    return null
  } finally {
    try {
      db?.close()
    } catch {
      // closing a failed open
    }
  }
}
