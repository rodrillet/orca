// orca-fork: writing the wiki: new pages, edits with versions, views and [[link]] backlinks.
import { randomUUID } from 'node:crypto'
import {
  WIKI_LIMITS,
  wikiActorKey,
  type ForkWikiWorkspaceId,
  type WikiActor,
  type WikiPage,
  type WikiReadContext
} from '../../../shared/orca-fork/wiki/wiki-types'
import {
  appendToWikiBody,
  normalizeWikiTags,
  parseWikiLinks,
  wikiSlug
} from '../../../shared/orca-fork/wiki/wiki-links'
import {
  actorOf,
  checkBody,
  checkTitle,
  cleanFolder,
  num,
  text,
  WikiError,
  type Row
} from './wiki-store-rows'
import { WikiStoreReads } from './wiki-store-reads'
import type { WikiCreateInput, WikiUpdateInput } from './wiki-db-contract'

export class WikiStoreWrites extends WikiStoreReads {
  recordView(
    pageId: string,
    actor: WikiActor,
    context: Partial<WikiReadContext> | null,
    now = Date.now()
  ): void {
    this.tx(() => {
      this.sql(
        `insert into wiki_views (page_id, at, actor_key, by, chat_id, chat_title, task_id, task_title)
         values (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        pageId,
        now,
        wikiActorKey(actor),
        JSON.stringify(actor),
        context?.chatId ?? null,
        context?.chatTitle?.slice(0, WIKI_LIMITS.title) ?? null,
        context?.taskId ?? null,
        context?.taskTitle?.slice(0, WIKI_LIMITS.title) ?? null
      )
      this.sql(
        'update wiki_pages set view_count = view_count + 1, last_viewed_at = ? where id = ?'
      ).run(now, pageId)
      this.sql(
        `delete from wiki_views where page_id = ? and rowid not in
         (select rowid from wiki_views where page_id = ? order by at desc limit ?)`
      ).run(pageId, pageId, WIKI_LIMITS.viewsKept)
    })
  }

  /** Re-reads a page's [[links]] into page mentions, after a write. */
  protected relink(
    pageId: string,
    workspaceId: string,
    body: string,
    actor: WikiActor,
    now: number
  ) {
    this.sql(`delete from wiki_mentions where kind = 'page' and source_id = ?`).run(pageId)
    for (const link of parseWikiLinks(body)) {
      const target = this.sql(
        'select id from wiki_pages where workspace_id = ? and slug = ? and deleted_at is null'
      ).get(workspaceId, link.slug)
      if (target && text(target.id) !== pageId) {
        this.sql(
          `insert or replace into wiki_mentions (page_id, kind, source_id, title, at, by)
           values (?, 'page', ?, '', ?, ?)`
        ).run(text(target.id), pageId, now, JSON.stringify(actor))
      }
    }
  }

  /** A new page's slug may already be linked from older pages: they now point at it. */
  protected relinkIncoming(workspaceId: string, slug: string, now: number) {
    const rows = this.sql(
      'select id, body, updated_by from wiki_pages where workspace_id = ? and deleted_at is null and body like ?'
    ).all(workspaceId, '%[[%')
    for (const row of rows) {
      if (parseWikiLinks(text(row.body)).some((link) => link.slug === slug)) {
        this.relink(text(row.id), workspaceId, text(row.body), actorOf(row.updated_by), now)
      }
    }
  }

  protected saveVersion(pageId: string, row: Row, by: WikiActor, at: number, note: string | null) {
    this.sql(
      `insert or replace into wiki_versions (page_id, version, title, folder, body, tags, at, by, note)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      pageId,
      num(row.version),
      text(row.title),
      text(row.folder),
      text(row.body),
      text(row.tags) || '[]',
      at,
      JSON.stringify(by),
      note
    )
    this.sql(
      `delete from wiki_versions where page_id = ? and version <= (
         select max(version) - ? from wiki_versions where page_id = ?)`
    ).run(pageId, WIKI_LIMITS.versionsKept, pageId)
  }

  create(
    workspaceId: ForkWikiWorkspaceId,
    actor: WikiActor,
    input: WikiCreateInput,
    now = Date.now()
  ): WikiPage {
    const titlePath = input.title.trim()
    const parts = titlePath.split('/')
    const title = checkTitle(parts.pop() ?? titlePath)
    const folder = cleanFolder(input.folder ?? parts.join('/'))
    const slug = wikiSlug(title)
    if (this.find(workspaceId, slug)) {
      throw new WikiError(
        `A page "${title}" already exists (slug ${slug}). Read it and update it instead.`
      )
    }
    const body = checkBody(input.body ?? '')
    const id = randomUUID()
    const tags = JSON.stringify(normalizeWikiTags(input.tags ?? []))
    const by = JSON.stringify(actor)
    this.tx(() => {
      this.sql(
        `insert into wiki_pages (id, workspace_id, slug, title, folder, body, tags, version,
           created_at, created_by, updated_at, updated_by) values (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`
      ).run(id, workspaceId, slug, title, folder, body, tags, now, by, now, by)
      const row = this.sql('select * from wiki_pages where id = ?').get(id) ?? {}
      this.saveVersion(id, row, actor, now, input.note ?? null)
      this.relink(id, workspaceId, body, actor, now)
      this.relinkIncoming(workspaceId, slug, now)
    })
    return this.show(workspaceId, id)
  }

  update(
    workspaceId: ForkWikiWorkspaceId,
    actor: WikiActor,
    ref: string,
    input: WikiUpdateInput,
    now = Date.now()
  ): WikiPage {
    return this.tx(() => {
      const row = this.require(workspaceId, ref)
      const id = text(row.id)
      const version = num(row.version)
      const mode = input.mode ?? 'replace'
      if (mode === 'replace' && input.baseVersion !== undefined && input.baseVersion !== version) {
        throw new WikiError(
          `The page changed since version ${input.baseVersion} (now ${version}). Read it again and merge your change.`
        )
      }
      let body = text(row.body)
      if (input.body !== undefined) {
        if (mode === 'replace') {
          body = input.body
        } else {
          if (mode === 'replace_section' && !input.section) {
            throw new WikiError('replace_section needs --section.')
          }
          body = appendToWikiBody(body, input.body, input.section ?? null, mode)
        }
      }
      checkBody(body)
      const title = input.title !== undefined ? checkTitle(input.title) : text(row.title)
      const slug = wikiSlug(title)
      if (slug !== text(row.slug)) {
        const other = this.find(workspaceId, slug)
        if (other && text(other.id) !== id) {
          throw new WikiError(`Another page is already called "${title}".`)
        }
      }
      const folder = input.folder !== undefined ? cleanFolder(input.folder) : text(row.folder)
      const tags =
        input.tags !== undefined
          ? JSON.stringify(normalizeWikiTags(input.tags))
          : text(row.tags) || '[]'
      const unchanged =
        body === text(row.body) &&
        title === text(row.title) &&
        folder === text(row.folder) &&
        tags === (text(row.tags) || '[]')
      if (unchanged) {
        return this.page(row)
      }
      this.sql(
        `update wiki_pages set body = ?, title = ?, slug = ?, folder = ?, tags = ?,
           version = version + 1, updated_at = ?, updated_by = ? where id = ?`
      ).run(body, title, slug, folder, tags, now, JSON.stringify(actor), id)
      const saved = this.sql('select * from wiki_pages where id = ?').get(id) ?? {}
      this.saveVersion(id, saved, actor, now, input.note ?? null)
      this.relink(id, workspaceId, body, actor, now)
      if (slug !== text(row.slug)) {
        this.relinkIncoming(workspaceId, slug, now)
      }
      return this.page(saved)
    })
  }
}
