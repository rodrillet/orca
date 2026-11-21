// orca-fork: the workspace wiki on this host (orca-fork-wiki.sqlite in the profile folder). Pages keep
// every version, a view log, and mentions from chats and items; deleting moves a page to the trash.
import SyncDatabase from '../../sqlite/sync-database'
import type {
  ForkWikiWorkspaceId,
  WikiActor,
  WikiBacklinkKind,
  WikiPage,
  WikiVersion
} from '../../../shared/orca-fork/wiki/wiki-types'
import { normalizeWikiTags } from '../../../shared/orca-fork/wiki/wiki-links'
import { actorOf, num, tagsOf, text, WikiError } from './wiki-store-rows'
import { WikiStoreWrites } from './wiki-store-writes'

export { WikiError }

export class WikiStore extends WikiStoreWrites {
  static open(path: string): WikiStore {
    const db = new SyncDatabase(path)
    db.pragma('journal_mode = WAL')
    db.pragma('busy_timeout = 5000')
    return new WikiStore(db)
  }

  close(): void {
    this.db.close()
  }

  tag(
    workspaceId: ForkWikiWorkspaceId,
    actor: WikiActor,
    ref: string,
    add: readonly string[],
    remove: readonly string[]
  ): WikiPage {
    const row = this.require(workspaceId, ref)
    const drop = new Set(normalizeWikiTags(remove))
    const tags = [...tagsOf(row.tags), ...normalizeWikiTags(add)].filter((tag) => !drop.has(tag))
    return this.update(workspaceId, actor, text(row.id), { tags, note: 'Tags' })
  }

  mention(
    workspaceId: ForkWikiWorkspaceId,
    ref: string,
    source: { kind: Exclude<WikiBacklinkKind, 'page'>; id: string; title: string },
    actor: WikiActor,
    now = Date.now()
  ): WikiPage {
    const row = this.require(workspaceId, ref)
    this.sql(
      `insert into wiki_mentions (page_id, kind, source_id, title, at, by) values (?, ?, ?, ?, ?, ?)
       on conflict (page_id, kind, source_id) do update set title = excluded.title, at = excluded.at, by = excluded.by`
    ).run(text(row.id), source.kind, source.id, source.title, now, JSON.stringify(actor))
    return this.page(row)
  }

  history(
    workspaceId: ForkWikiWorkspaceId,
    ref: string
  ): { slug: string; title: string; versions: WikiVersion[] } {
    const row = this.find(workspaceId, ref) ?? this.require(workspaceId, ref, true)
    const versions = this.sql('select * from wiki_versions where page_id = ? order by version desc')
      .all(text(row.id))
      .map((version): WikiVersion => ({
        version: num(version.version),
        title: text(version.title),
        folder: text(version.folder),
        body: text(version.body),
        tags: tagsOf(version.tags),
        at: num(version.at),
        by: actorOf(version.by),
        note: text(version.note) || null
      }))
    return { slug: text(row.slug), title: text(row.title), versions }
  }

  restoreVersion(
    workspaceId: ForkWikiWorkspaceId,
    actor: WikiActor,
    ref: string,
    version: number
  ): WikiPage {
    const row = this.require(workspaceId, ref)
    const old = this.sql('select * from wiki_versions where page_id = ? and version = ?').get(
      text(row.id),
      version
    )
    if (!old) {
      throw new WikiError(`Version ${version} is not kept.`)
    }
    return this.update(workspaceId, actor, text(row.id), {
      body: text(old.body),
      title: text(old.title),
      folder: text(old.folder),
      tags: tagsOf(old.tags),
      note: `Restored version ${version}`
    })
  }

  trash(workspaceId: ForkWikiWorkspaceId, actor: WikiActor, ref: string, now = Date.now()) {
    const row = this.require(workspaceId, ref)
    this.sql('update wiki_pages set deleted_at = ?, deleted_by = ? where id = ?').run(
      now,
      JSON.stringify(actor),
      text(row.id)
    )
    return this.summary({ ...row, deleted_at: now, deleted_by: JSON.stringify(actor) })
  }

  restore(workspaceId: ForkWikiWorkspaceId, ref: string): WikiPage {
    const row = this.require(workspaceId, ref, true)
    if (this.find(workspaceId, text(row.slug))) {
      throw new WikiError(
        `A page "${text(row.title)}" exists again; rename it before restoring this one.`
      )
    }
    this.sql('update wiki_pages set deleted_at = null, deleted_by = null where id = ?').run(
      text(row.id)
    )
    return this.show(workspaceId, text(row.id))
  }

  purge(workspaceId: ForkWikiWorkspaceId, ref: string): { id: string; title: string } {
    const row = this.require(workspaceId, ref, true)
    const id = text(row.id)
    this.tx(() => {
      for (const table of ['wiki_versions', 'wiki_views']) {
        this.sql(`delete from ${table} where page_id = ?`).run(id)
      }
      this.sql('delete from wiki_mentions where page_id = ? or (kind = ? and source_id = ?)').run(
        id,
        'page',
        id
      )
      this.sql('delete from wiki_pages where id = ?').run(id)
    })
    return { id, title: text(row.title) }
  }
}
