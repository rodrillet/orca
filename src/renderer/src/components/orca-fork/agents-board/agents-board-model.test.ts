import { describe, expect, it } from 'vitest'
import { makeTestBotItem } from '../../../../../shared/bots/bot-item.test-fixture'
import type { BotWorkerSummary } from '../../../../../shared/bots/bot-work-list'
import { buildBotBoardCards } from './agents-board-model'

const NOW = 10 * 24 * 60 * 60 * 1000

function worker(id: string, fields: Partial<BotWorkerSummary> = {}): BotWorkerSummary {
  return {
    id,
    title: `Worker ${id}`,
    agent: 'claude',
    state: 'working',
    dispatchId: `ctx_${id}`,
    workspace: 'orca',
    server: null,
    pr: null,
    startedAt: NOW - 1000,
    source: { source: 'app', title: null },
    ...fields
  }
}

describe('buildBotBoardCards', () => {
  it('puts items and unlinked workers in their columns and drops canceled and old done work', () => {
    const cards = buildBotBoardCards(
      'local/bot-a',
      [
        makeTestBotItem(1, { status: 'planned' }),
        makeTestBotItem(2, { status: 'needs_you', question: { eventId: 'e3', text: 'Merge?' } }),
        makeTestBotItem(3, { status: 'canceled' }),
        makeTestBotItem(4, { status: 'done', closedAt: NOW - 1000 }),
        makeTestBotItem(5, { status: 'done', closedAt: 0 })
      ],
      [
        worker('w1', { idle: true }),
        worker('w2', { state: 'failed' }),
        worker('w3', { state: 'completed', startedAt: 0 })
      ],
      NOW
    )
    expect(cards.map((card) => [card.title, card.column, card.detail])).toEqual([
      ['Item 1', 'todo', null],
      ['Item 2', 'needs_you', 'Merge?'],
      ['Item 4', 'done', null],
      ['Worker w1', 'needs_you', null],
      ['Worker w2', 'needs_you', null]
    ])
  })

  it('shows a worker an item links only on the item, with its workspace and PR', () => {
    const pr = {
      number: 41,
      url: 'https://github.com/o/r/pull/41',
      state: 'open' as const,
      checks: 'success' as const,
      review: null,
      headSha: null
    }
    const cards = buildBotBoardCards(
      'local/bot-a',
      [
        makeTestBotItem(7, {
          links: [
            {
              kind: 'dispatch',
              ref: 'ctx_w1',
              latest: null,
              title: null,
              state: 'working',
              host: null,
              startedAt: null,
              settledAt: null,
              report: null,
              pr: null
            }
          ]
        })
      ],
      [worker('w1', { pr })],
      NOW
    )
    expect(cards).toHaveLength(1)
    expect(cards[0]).toMatchObject({
      kind: 'item',
      column: 'doing',
      live: true,
      workspace: 'orca',
      pr: { number: 41, checks: 'success' }
    })
  })

  it('tells what was done and when: the newest worker report or a worker record, its start and end', () => {
    const dispatch = (ref: string, startedAt: number, subject: string) => ({
      kind: 'dispatch' as const,
      ref,
      latest: null,
      title: null,
      state: 'completed' as const,
      host: null,
      startedAt,
      settledAt: startedAt + 500,
      report: { subject, body: null },
      pr: null
    })
    const record = {
      dispatchId: 'ctx_w2',
      taskId: 't',
      runId: 'r',
      title: 'Worker w2',
      agent: 'claude',
      state: 'completed' as const,
      liveness: 'exited' as const,
      host: 'local' as const,
      worktreeId: null,
      paneKey: null,
      chatSessionId: null,
      summary: 'Shipped the drawer',
      startedAt: NOW - 3000,
      settledAt: NOW - 1000
    }
    const cards = buildBotBoardCards(
      'local/bot-a',
      [
        makeTestBotItem(8, {
          status: 'done',
          createdAt: NOW - 9000,
          closedAt: NOW - 100,
          links: [
            dispatch('ctx_a', NOW - 5000, 'First pass'),
            dispatch('ctx_b', NOW - 4000, 'Fixed CI')
          ]
        }),
        makeTestBotItem(9, { status: 'planned', createdAt: NOW - 9000 })
      ],
      [worker('w2', { state: 'completed', dispatchId: 'ctx_w2', startedAt: NOW - 3000 })],
      NOW,
      new Map([['ctx_w2', record]])
    )
    expect(
      cards.map((card) => [card.summary, card.startedAt, card.finishedAt, card.workerCount])
    ).toEqual([
      ['Fixed CI', NOW - 5000, NOW - 100, 2],
      [null, null, null, 0],
      ['Shipped the drawer', NOW - 3000, NOW - 1000, 1]
    ])
  })
})
