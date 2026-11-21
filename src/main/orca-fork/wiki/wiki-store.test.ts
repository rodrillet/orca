import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { closeBotsDbStores, handleBotsDbRequest } from '../../bots/db-worker/bots-db-worker-entry'
import SyncDatabase from '../../sqlite/sync-database'
import { WikiStore } from './wiki-store'

const bot = { kind: 'bot', botId: 'b1', name: 'Nora' } as const
const owner = { kind: 'owner' } as const

function openStore(): WikiStore {
  return new WikiStore(new SyncDatabase(':memory:'))
}

describe('WikiStore', () => {
  it('keeps versions, appends to a section and refuses a stale replace', () => {
    const wiki = openStore()
    wiki.create('w', bot, { title: 'Ops/Deploy Guide', body: '# Deploy\n\n## Steps\n\n- build\n' })
    const appended = wiki.update('w', bot, 'deploy guide', {
      mode: 'append',
      section: 'Steps',
      body: '- ship'
    })
    expect(appended.folder).toBe('Ops')
    expect(appended.version).toBe(2)
    expect(appended.body).toBe('# Deploy\n\n## Steps\n\n- build\n- ship\n')
    expect(() =>
      wiki.update('w', owner, 'deploy-guide', { mode: 'replace', body: 'x', baseVersion: 1 })
    ).toThrow(/changed since version 1/)
    const restored = wiki.restoreVersion('w', owner, 'deploy-guide', 1)
    expect(restored.version).toBe(3)
    expect(restored.body).toBe('# Deploy\n\n## Steps\n\n- build\n')
    expect(wiki.history('w', 'deploy-guide').versions.map((v) => v.version)).toEqual([3, 2, 1])
  })

  it('shows backlinks from pages linked before and after the target exists, and from chats', () => {
    const wiki = openStore()
    wiki.create('w', bot, { title: 'Overview', body: 'See [[Glossary|terms]].' })
    wiki.create('w', bot, { title: 'Glossary', body: 'Words.' })
    wiki.mention('w', 'glossary', { kind: 'chat', id: 's1', title: 'Fix CI' }, bot, 5)
    const glossary = wiki.show('w', 'Glossary')
    expect(glossary.backlinks.map((b) => [b.kind, b.id, b.title])).toEqual([
      ['page', 'overview', 'Overview'],
      ['chat', 's1', 'Fix CI']
    ])
    expect(wiki.show('w', 'overview').links).toEqual([
      { target: 'Glossary', slug: 'glossary', exists: true }
    ])
  })

  it('logs each consultation with its chat and task, per reader and per page', () => {
    const wiki = openStore()
    const page = wiki.create('w', bot, { title: 'Runbook' })
    const other = wiki.create('w', bot, { title: 'Glossary' })
    const now = 1_800_000_000_000
    wiki.recordView(page.id, owner, null, now - 3000)
    wiki.recordView(
      page.id,
      bot,
      { chatId: 's1', chatTitle: 'Fix CI', taskId: 't1', taskTitle: 'Ship it' },
      now - 2000
    )
    wiki.recordView(other.id, bot, { chatId: 's1', chatTitle: 'Fix CI' }, now - 1000)
    expect(wiki.show('w', 'runbook').viewers).toEqual([
      { actor: bot, count: 1, lastAt: now - 2000 },
      { actor: owner, count: 1, lastAt: now - 3000 }
    ])
    const log = wiki.activity('w', { actorKey: 'bot:b1' }, now)
    expect(log.consultations.map((c) => [c.title, c.chatTitle, c.taskTitle])).toEqual([
      ['Glossary', 'Fix CI', null],
      ['Runbook', 'Fix CI', 'Ship it']
    ])
    expect(wiki.activity('w', { page: 'runbook' }, now).consultations).toHaveLength(2)
    expect(log.readers.map((r) => [r.key, r.count, r.pages])).toEqual([
      ['bot:b1', 2, 2],
      ['owner', 1, 1]
    ])
    expect(log.popular.map((p) => [p.title, p.count])).toEqual([
      ['Glossary', 1],
      ['Runbook', 1]
    ])
  })

  it('opens a wiki made before pins and read context, keeping its pages and reads', () => {
    const db = new SyncDatabase(':memory:')
    db.exec(`create table wiki_pages (id text primary key, workspace_id text not null, slug text not null,
      title text not null, folder text not null default '', body text not null default '',
      tags text not null default '[]', version integer not null default 1, created_at integer not null,
      created_by text not null, updated_at integer not null, updated_by text not null,
      view_count integer not null default 0, last_viewed_at integer, deleted_at integer, deleted_by text);
      create table wiki_views (page_id text not null, at integer not null, actor_key text not null,
      by text not null, chat_id text);
      insert into wiki_pages (id, workspace_id, slug, title, created_at, created_by, updated_at, updated_by)
      values ('p1', 'w', 'old', 'Old', 1, '{"kind":"owner"}', 1, '{"kind":"owner"}');
      insert into wiki_views values ('p1', 5, 'owner', '{"kind":"owner"}', null);`)
    const wiki = new WikiStore(db)
    expect(wiki.pin('w', 'old', true).pinned).toBe(true)
    expect(wiki.show('w', 'old').recentViews).toEqual([
      { at: 5, by: owner, chatId: null, chatTitle: null, taskId: null, taskTitle: null }
    ])
  })

  it('trashes, restores and purges, keeping pages of other workspaces apart', () => {
    const wiki = openStore()
    wiki.create('w', bot, { title: 'Notes', tags: ['Infra', 'infra', '#VPS'] })
    wiki.create('other', bot, { title: 'Notes' })
    wiki.trash('w', owner, 'notes')
    expect(wiki.list('w').pages).toEqual([])
    expect(wiki.list('w', { trash: true }).pages.map((p) => p.tags)).toEqual([['infra', 'vps']])
    expect(wiki.list('other').pages).toHaveLength(1)
    wiki.restore('w', 'notes')
    expect(wiki.list('w', { tag: 'vps' }).pages).toHaveLength(1)
    wiki.trash('w', owner, 'notes')
    wiki.purge('w', 'notes')
    expect(wiki.list('w', { trash: true }).pages).toEqual([])
    expect(wiki.list('other').pages).toHaveLength(1)
  })
})

describe('wiki in the bots DB worker', () => {
  it('runs store calls by name and returns refusals as invalid_argument', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'wiki-')), 'wiki.sqlite')
    const ask = (id: number, op: string, args: unknown[]) =>
      handleBotsDbRequest({ id, store: 'orcaForkWiki', path, op, args })
    expect(ask(1, 'create', ['home', bot, { title: 'Runbook', body: 'x' }])).toMatchObject({
      ok: true,
      value: { slug: 'runbook', version: 1 }
    })
    expect(ask(2, 'show', ['home', 'missing'])).toMatchObject({
      ok: false,
      code: 'invalid_argument'
    })
    closeBotsDbStores()
  })
})
