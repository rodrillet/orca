// orca-fork: reading the wiki: lists, search, a page with its links, backlinks and readers.
import type SyncDatabase from '../../sqlite/sync-database'
import type { SqliteStatement } from '../../sqlite/sync-database'
import {
  WIKI_LIMITS,
  type ForkWikiWorkspaceId,
  type WikiBacklink,
  type WikiListResult,
  type WikiPage,
  type WikiPageSummary,
  type WikiView,
  type WikiViewer
} from '../../../shared/orca-fork/wiki/wiki-types'
import { parseWikiLinks, wikiSlug } from '../../../shared/orca-fork/wiki/wiki-links'
import {
  actorOf,
  excerptOf,
  num,
  optionalNum,
  SCHEMA,
  tagsOf,
  text,
  WikiError,
  type Row
} from './wiki-store-rows'

export class WikiStoreReads {
  private readonly statements = new Map<string, SqliteStatement>()

  constructor(protected readonly db: SyncDatabase) {
    db.exec(SCHEMA)
  }

  protected sql(query: string): SqliteStatement {
    let statement = this.statements.get(query)
    if (!statement) {
      statement = this.db.prepare(query)
      this.statements.set(query, statement)
    }
    return statement
  }

  protected tx<T>(run: () => T): T {
    this.db.exec('begin immediate')
    try {
      const result = run()
      this.db.exec('commit')
      return result
    } catch (error) {
      this.db.exec('rollback')
      throw error
    }
  }

  protected summary(row: Row): WikiPageSummary {
    return {
      id: text(row.id),
      workspaceId: text(row.workspace_id),
      slug: text(row.slug),
      title: text(row.title),
      folder: text(row.folder),
      tags: tagsOf(row.tags),
      excerpt: excerptOf(text(row.body)),
      version: num(row.version),
      createdAt: num(row.created_at),
      createdBy: actorOf(row.created_by),
      updatedAt: num(row.updated_at),
      updatedBy: actorOf(row.updated_by),
      viewCount: num(row.view_count),
      lastViewedAt: optionalNum(row.last_viewed_at),
      deletedAt: optionalNum(row.deleted_at),
      deletedBy: row.deleted_by ? actorOf(row.deleted_by) : null
    }
  }

  /** A live page by id, slug or title (or a trashed one with `trash`). */
  protected find(workspaceId: string, ref: string, trash = false): Row | null {
    const where = trash ? 'deleted_at is not null' : 'deleted_at is null'
    const order = trash ? 'order by deleted_at desc' : ''
    const clean = ref.trim().replace(/^\[\[|\]\]$/g, '')
    const byId = this.sql(
      `select * from wiki_pages where workspace_id = ? and id = ? and ${where}`
    ).get(workspaceId, clean)
    if (byId) {
      return byId
    }
    const slug = wikiSlug(clean.split('|')[0]?.split('#')[0] ?? clean)
    return (
      this.sql(
        `select * from wiki_pages where workspace_id = ? and slug = ? and ${where} ${order} limit 1`
      ).get(workspaceId, slug) ?? null
    )
  }

  protected require(workspaceId: string, ref: string, trash = false): Row {
    const row = this.find(workspaceId, ref, trash)
    if (!row) {
      throw new WikiError(
        trash
          ? `No page "${ref}" in the trash.`
          : `No wiki page "${ref}". Search with \`orca wiki search\`.`
      )
    }
    return row
  }

  list(
    workspaceId: ForkWikiWorkspaceId,
    options: { query?: string; tag?: string; trash?: boolean; limit?: number } = {}
  ): WikiListResult {
    const where = options.trash ? 'deleted_at is not null' : 'deleted_at is null'
    const rows = this.sql(
      `select * from wiki_pages where workspace_id = ? and ${where} order by updated_at desc`
    ).all(workspaceId)
    let pages = rows.map((row) => ({ row, page: this.summary(row) }))
    const tagCounts = new Map<string, number>()
    if (!options.trash) {
      for (const { page } of pages) {
        for (const tag of page.tags) {
          tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
        }
      }
    }
    if (options.tag) {
      const tag = options.tag.toLowerCase().replace(/^#/, '')
      pages = pages.filter(({ page }) => page.tags.includes(tag))
    }
    const query = options.query?.trim().toLowerCase().slice(0, WIKI_LIMITS.search)
    if (query) {
      const words = query.split(/\s+/).filter(Boolean)
      const scored = pages
        .map((entry) => {
          const title = entry.page.title.toLowerCase()
          const haystack = `${title} ${entry.page.folder.toLowerCase()} ${entry.page.tags.join(' ')} ${text(entry.row.body).toLowerCase()}`
          if (!words.every((word) => haystack.includes(word))) {
            return null
          }
          const score =
            (title === query ? 100 : 0) +
            (title.includes(query) ? 30 : 0) +
            words.filter((word) => title.includes(word)).length * 10 +
            words.filter((word) => entry.page.tags.includes(word)).length * 5
          return { entry, score }
        })
        .filter((value) => value !== null)
      scored.sort((a, b) => b.score - a.score || b.entry.page.updatedAt - a.entry.page.updatedAt)
      pages = scored.map(({ entry }) => entry)
    }
    const trashCount = num(
      this.sql(
        'select count(*) as n from wiki_pages where workspace_id = ? and deleted_at is not null'
      ).get(workspaceId)?.n
    )
    return {
      workspaceId,
      pages: pages.slice(0, options.limit ?? 1000).map(({ page }) => page),
      tags: [...tagCounts.entries()]
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag)),
      trashCount
    }
  }

  show(workspaceId: ForkWikiWorkspaceId, ref: string, trash = false): WikiPage {
    const row =
      this.find(workspaceId, ref) ??
      (trash ? this.find(workspaceId, ref, true) : null) ??
      this.require(workspaceId, ref)
    return this.page(row)
  }

  protected page(row: Row): WikiPage {
    const summary = this.summary(row)
    const body = text(row.body)
    const links = parseWikiLinks(body).map((link) => ({
      target: link.target,
      slug: link.slug,
      exists: Boolean(
        this.sql(
          'select 1 from wiki_pages where workspace_id = ? and slug = ? and deleted_at is null'
        ).get(summary.workspaceId, link.slug)
      )
    }))
    return {
      ...summary,
      body,
      links,
      backlinks: this.backlinks(summary),
      viewers: this.viewers(summary.id),
      recentViews: this.sql(
        'select at, by, chat_id from wiki_views where page_id = ? order by at desc limit ?'
      )
        .all(summary.id, WIKI_LIMITS.recentViews)
        .map((view): WikiView => ({
          at: num(view.at),
          by: actorOf(view.by),
          chatId: text(view.chat_id) || null
        }))
    }
  }

  protected backlinks(page: WikiPageSummary): WikiBacklink[] {
    const fromPages = this.sql(
      `select p.slug, p.title, m.at, m.by from wiki_mentions m
       join wiki_pages p on p.id = m.source_id
       where m.page_id = ? and m.kind = 'page' and p.deleted_at is null`
    )
      .all(page.id)
      .map((row): WikiBacklink => ({
        kind: 'page',
        id: text(row.slug),
        title: text(row.title),
        at: num(row.at),
        by: row.by ? actorOf(row.by) : null
      }))
    const others = this.sql(
      `select kind, source_id, title, at, by from wiki_mentions where page_id = ? and kind != 'page'`
    )
      .all(page.id)
      .map((row): WikiBacklink => ({
        kind: text(row.kind) === 'item' ? 'item' : 'chat',
        id: text(row.source_id),
        title: text(row.title),
        at: num(row.at),
        by: row.by ? actorOf(row.by) : null
      }))
    return [...fromPages, ...others].sort((a, b) => b.at - a.at)
  }

  protected viewers(pageId: string): WikiViewer[] {
    return this.sql(
      `select actor_key, max(by) as by, count(*) as n, max(at) as last from wiki_views
       where page_id = ? group by actor_key order by last desc limit 50`
    )
      .all(pageId)
      .map((row) => ({ actor: actorOf(row.by), count: num(row.n), lastAt: num(row.last) }))
  }
}
