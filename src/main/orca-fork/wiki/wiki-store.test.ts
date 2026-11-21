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

  it('counts views per reader', () => {
    const wiki = openStore()
    const page = wiki.create('w', bot, { title: 'Runbook' })
    wiki.recordView(page.id, owner, null, 10)
    wiki.recordView(page.id, bot, 's1', 20)
    wiki.recordView(page.id, bot, 's1', 30)
    const shown = wiki.show('w', 'runbook')
    expect(shown.viewCount).toBe(3)
    expect(shown.viewers).toEqual([
      { actor: bot, count: 2, lastAt: 30 },
      { actor: owner, count: 1, lastAt: 10 }
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
