import { describe, expect, it } from 'vitest'
import { buildAgentsMap, type MapMessage } from './agents-map-model'

const bots = [
  { id: 'ana', name: 'Ana' },
  { id: 'theo', name: 'Theo' },
  { id: 'iris', name: 'Iris' }
]
const rooms = [{ id: 'launch', name: 'launch', kind: 'channel' as const, botIds: ['ana', 'theo'] }]

describe('agents map', () => {
  it('draws rooms, hand-offs and mentions with their counts and last time', () => {
    const messages: MapMessage[] = [
      { author: { kind: 'owner' }, text: '@Ana draft it', createdAt: 10 },
      { author: { kind: 'bot', id: 'ana' }, text: 'Asking @Theo, not @Anabel', createdAt: 20 },
      {
        author: { kind: 'bot', id: 'theo' },
        text: 'Done',
        createdAt: 30,
        requester: { id: 'ana' }
      },
      { author: { kind: 'bot', id: 'ana' }, text: '@theo thanks', createdAt: 40 }
    ]
    const edges = buildAgentsMap(bots, rooms, new Map([['launch', messages]]))
    expect(edges.map((e) => `${e.kind} ${e.from}>${e.to} ${e.count} ${e.lastAt}`).sort()).toEqual([
      'handoff bot:ana>bot:theo 1 30',
      'member bot:ana>room:launch 2 40',
      'member bot:theo>room:launch 1 30',
      'mention bot:ana>bot:theo 2 40',
      'mention owner>bot:ana 1 10'
    ])
  })
})
