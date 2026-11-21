// orca-fork: the wiki's consultation log: who read which page, when and from which chat or task; who
// reads the wiki most; and the pages agents consult most.
import type { SqliteStatement } from '../../sqlite/sync-database'
import {
  WIKI_LIMITS,
  type ForkWikiWorkspaceId,
  type WikiActivityResult,
  type WikiConsultation,
  type WikiPopularPage,
  type WikiReaderSummary
} from '../../../shared/orca-fork/wiki/wiki-types'
import { wikiSlug } from '../../../shared/orca-fork/wiki/wiki-links'
import { actorOf, num, text, viewOf } from './wiki-store-rows'
import type { WikiActivityOptions } from './wiki-db-contract'

const DAY = 86_400_000

type Sql = (query: string) => SqliteStatement

function pageIdOf(sql: Sql, workspaceId: string, ref: string): string | null {
  const clean = ref.trim().replace(/^\[\[|\]\]$/g, '')
  const row =
    sql('select id from wiki_pages where workspace_id = ? and id = ?').get(workspaceId, clean) ??
    sql(
      'select id from wiki_pages where workspace_id = ? and slug = ? order by deleted_at is not null, updated_at desc limit 1'
    ).get(workspaceId, wikiSlug(clean))
  return row ? text(row.id) : null
}

function consultations(
  sql: Sql,
  workspaceId: string,
  options: WikiActivityOptions
): WikiConsultation[] {
  const pageId = options.page ? pageIdOf(sql, workspaceId, options.page) : null
  if (options.page && !pageId) {
    return []
  }
  const limit = Math.min(options.limit ?? 100, WIKI_LIMITS.activity)
  const rows = sql(
    `select v.*, p.slug, p.title, p.folder, p.deleted_at from wiki_views v
     join wiki_pages p on p.id = v.page_id
     where p.workspace_id = ? and v.at < ?
       and (? is null or v.actor_key = ?) and (? is null or v.page_id = ?)
     order by v.at desc limit ?`
  ).all(
    workspaceId,
    options.before ?? Number.MAX_SAFE_INTEGER,
    options.actorKey ?? null,
    options.actorKey ?? null,
    pageId,
    pageId,
    limit
  )
  return rows.map((row) => ({
    ...viewOf(row),
    pageId: text(row.page_id),
    slug: text(row.slug),
    title: text(row.title),
    folder: text(row.folder),
    trashed: row.deleted_at !== null && row.deleted_at !== undefined
  }))
}

function readers(sql: Sql, workspaceId: string, since: number): WikiReaderSummary[] {
  return sql(
    `select v.actor_key, max(v.by) as by, count(*) as n, count(distinct v.page_id) as pages,
            max(v.at) as last from wiki_views v
     join wiki_pages p on p.id = v.page_id
     where p.workspace_id = ? and v.at >= ?
     group by v.actor_key order by n desc, last desc limit 100`
  )
    .all(workspaceId, since)
    .map((row) => ({
      actor: actorOf(row.by),
      key: text(row.actor_key),
      count: num(row.n),
      pages: num(row.pages),
      lastAt: num(row.last)
    }))
}

/** What agents consult most: the owner opening a page doesn't count, as agentes.chat's. */
function popular(sql: Sql, workspaceId: string, since: number): WikiPopularPage[] {
  const rows = sql(
    `select v.page_id, v.actor_key, max(v.by) as by, count(*) as n, p.slug, p.title, p.folder
     from wiki_views v join wiki_pages p on p.id = v.page_id
     where p.workspace_id = ? and p.deleted_at is null and v.at >= ? and v.actor_key != 'owner'
     group by v.page_id, v.actor_key`
  ).all(workspaceId, since)
  const pages = new Map<string, WikiPopularPage>()
  for (const row of rows) {
    const id = text(row.page_id)
    const page = pages.get(id) ?? {
      pageId: id,
      slug: text(row.slug),
      title: text(row.title),
      folder: text(row.folder),
      count: 0,
      readers: []
    }
    page.count += num(row.n)
    page.readers.push({ actor: actorOf(row.by), count: num(row.n) })
    pages.set(id, page)
  }
  return [...pages.values()]
    .map((page) => ({ ...page, readers: page.readers.sort((a, b) => b.count - a.count) }))
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title))
    .slice(0, WIKI_LIMITS.popular)
}

export function readWikiActivity(
  sql: Sql,
  workspaceId: ForkWikiWorkspaceId,
  options: WikiActivityOptions = {},
  now = Date.now()
): WikiActivityResult {
  return {
    workspaceId,
    consultations: consultations(sql, workspaceId, options),
    readers: readers(sql, workspaceId, now - WIKI_LIMITS.activityDays * DAY),
    popular: popular(sql, workspaceId, now - WIKI_LIMITS.popularDays * DAY),
    windowDays: WIKI_LIMITS.activityDays
  }
}
