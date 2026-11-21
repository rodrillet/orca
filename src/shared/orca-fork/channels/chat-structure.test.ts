import { describe, expect, it } from 'vitest'
import {
  chatStructureEdits as edits,
  emptyChatStructure,
  normalizeChatStructure,
  splitChannelEntries,
  type ChatStructure
} from './chat-structure'

const entries = [
  { id: 'local/bot', kind: 'bot' },
  { id: 'local/launch', kind: 'group' },
  { id: 'local/ops', kind: 'group' },
  { id: 'vps/news', kind: 'group' },
  { id: 'local/team', kind: 'group' }
]

function rows(doc: ChatStructure, workspaceId: string | null = null): string[] {
  return splitChannelEntries(entries, doc, workspaceId, 'Channels').rows.map((row) =>
    'title' in row ? `# ${row.title} ${row.count}` : row.id
  )
}

describe('chat structure', () => {
  it('lists channels under Channels and their categories, and leaves the rest to the Bots list', () => {
    let doc = emptyChatStructure()
    doc = edits.addCategory('work', 'Work', null)(doc)
    doc = edits.placeChannel('local/launch', 'work')(doc)
    doc = edits.placeChannel('vps/news', null)(doc)
    doc = edits.placeChannel('local/ops', 'work', 'local/launch')(doc)
    expect(rows(doc)).toEqual(['# Channels 3', 'vps/news', '# Work 2', 'local/ops', 'local/launch'])
    expect(splitChannelEntries(entries, doc, null, 'Channels').rest.map((e) => e.id)).toEqual([
      'local/bot',
      'local/team'
    ])
  })

  it('keeps a deleted category’s channels as channels with no category', () => {
    let doc = edits.addCategory('work', 'Work', null)(emptyChatStructure())
    doc = edits.placeChannel('local/launch', 'work')(doc)
    doc = edits.removeCategory('work')(doc)
    expect(rows(doc)).toEqual(['# Channels 1', 'local/launch'])
  })

  it('shows another workspace’s category channels with no category', () => {
    let doc = edits.addCategory('work', 'Work', 'ws-a')(emptyChatStructure())
    doc = edits.placeChannel('local/launch', 'work')(doc)
    expect(rows(doc, 'ws-b')).toEqual(['# Channels 1', 'local/launch'])
  })

  it('drops a placement whose category is gone when read back', () => {
    const doc = normalizeChatStructure({
      revision: 3,
      categories: [{ id: 'work', name: 'Work' }],
      channels: { 'local/a': { categoryId: 'gone', order: 2, muted: true } }
    })
    expect(doc.channels['local/a']).toEqual({ categoryId: null, order: 2, muted: true })
  })
})
