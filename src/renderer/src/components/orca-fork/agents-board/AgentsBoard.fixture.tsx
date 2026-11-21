import { defineFixture } from '../../../component-fixtures/component-fixture'
import { stubBots } from '../../../component-fixtures/fixture-bots'
import { makeFolderWorkspace } from '@/store/folder-workspaces/folder-workspace.test-fixture'
import type { Bot } from '../../../../../shared/bot-types'
import { mascotAvatar } from '../../../../../shared/bot-avatar'
import { makeTestBotItem } from '../../../../../shared/bots/bot-item.test-fixture'
import type { BotItem } from '../../../../../shared/bots/bot-items'
import type { BotWorkerSummary } from '../../../../../shared/bots/bot-work-list'
import { AgentsBoard } from './AgentsBoard'

const NOW = Date.now()
const MIN = 60_000

function bot(id: string, name: string, mascot: Parameters<typeof mascotAvatar>[0]): Bot {
  return {
    id,
    name,
    hostId: 'local',
    folder: id,
    folderWorkspaceId: `fw-${id}`,
    agent: 'claude',
    avatar: mascotAvatar(mascot),
    paused: false,
    notifications: { needsPermission: true, taskComplete: true, couldNotFinish: true },
    members: [],
    slack: null,
    linear: null,
    github: null,
    chatSessionId: 'home',
    sidebarOrder: 0,
    createdAt: 1,
    updatedAt: 1
  }
}

const BOTS = [
  bot('devzin', 'Devzin', 'F1'),
  bot('closer', 'Closer', 'G1'),
  bot('writer', 'Writer', 'H1')
]

function worker(id: string, fields: Partial<BotWorkerSummary>): BotWorkerSummary {
  return {
    id,
    title: id,
    agent: 'claude',
    state: 'working',
    dispatchId: `ctx_${id}`,
    workspace: 'orca',
    server: null,
    pr: null,
    startedAt: NOW - 12 * MIN,
    source: { source: 'app', title: null },
    ...fields
  }
}

const ITEMS: Record<string, BotItem[]> = {
  devzin: [
    makeTestBotItem(12, {
      title: 'Agents board: drag cards between columns',
      status: 'working',
      lastActivityAt: NOW - 3 * MIN
    }),
    makeTestBotItem(13, {
      title: 'Install the fork orca-server on the VPS',
      status: 'needs_you',
      question: { eventId: 'e4', text: 'Can I restart orca-serve now? Two chats are running.' },
      lastActivityAt: NOW - 8 * MIN
    }),
    makeTestBotItem(9, {
      title: 'Sidebar unread counts',
      status: 'done',
      closedAt: NOW - 90 * MIN,
      lastActivityAt: NOW - 90 * MIN
    })
  ],
  closer: [
    makeTestBotItem(4, {
      title: 'Follow up with the three warm leads from Friday',
      status: 'planned',
      lastActivityAt: NOW - 40 * MIN
    }),
    makeTestBotItem(5, {
      title: 'Weekly pipeline report',
      status: 'planned',
      lastActivityAt: NOW - 120 * MIN
    })
  ],
  writer: [
    makeTestBotItem(21, {
      title: 'Reels script: B2B onboarding in 30s',
      status: 'working',
      lastActivityAt: NOW - 15 * MIN
    })
  ]
}

const WORKERS: Record<string, BotWorkerSummary[]> = {
  devzin: [
    worker('Fix Fork CI lint on organization', {
      workspace: 'orca-fork-ci',
      pr: {
        number: 14,
        url: 'https://github.com/rodrillet/orca/pull/14',
        state: 'open',
        checks: 'success',
        review: 'APPROVED',
        headSha: null
      }
    }),
    worker('Bump orca-server packaging', {
      state: 'failed',
      workspace: 'orca-build',
      pr: {
        number: 15,
        url: 'https://github.com/rodrillet/orca/pull/15',
        state: 'open',
        checks: 'failure',
        review: null,
        headSha: null
      }
    })
  ],
  writer: [
    worker('Landing page copy review', {
      state: 'completed',
      workspace: 'site',
      startedAt: NOW - 200 * MIN,
      pr: {
        number: 3,
        url: 'https://github.com/rodrillet/site/pull/3',
        state: 'merged',
        checks: 'success',
        review: 'APPROVED',
        headSha: null
      }
    })
  ]
}

export const board = defineFixture({
  width: 1200,
  store: {
    folderWorkspaces: BOTS.map((each) =>
      makeFolderWorkspace({
        id: each.folderWorkspaceId,
        projectGroupId: 'bots',
        name: each.name,
        folderPath: `/home/me/.orca/bots/${each.id}`
      })
    )
  },
  setup: () => {
    stubBots(BOTS)
    const runtime: unknown = window.api.runtime
    Reflect.set(window.api, 'runtime', {
      ...(typeof runtime === 'object' ? runtime : {}),
      call: async ({ method, params }: { method: string; params?: { botId?: string } }) => {
        const botId = params?.botId ?? ''
        if (method === 'bots.items.owner.list') {
          return { ok: true, result: { items: ITEMS[botId] ?? [], counts: {}, seenEventId: 'e0' } }
        }
        if (method === 'bots.work.list') {
          return { ok: true, result: { items: WORKERS[botId] ?? [], botName: botId } }
        }
        const quiet: Record<string, unknown> = {
          'bots.list': { bots: BOTS },
          'bots.groups.list': { groups: [] },
          'bots.upNext.unseen': { unseen: {} },
          'bots.chatTree': { chats: [], workspaceChats: {} },
          'bots.activity': {
            activity: {
              workers: [],
              inProgress: [],
              completed: [],
              automations: [],
              waits: [],
              upNext: { state: { running: false, seenAt: 0, lastLookedAt: 0 }, items: [] }
            }
          }
        }
        if (method in quiet) {
          return { ok: true, result: quiet[method] }
        }
        return { ok: false, error: { code: 'runtime_error', message: method } }
      }
    })
  },
  render: () => (
    <div className="h-[620px] bg-worktree-sidebar">
      <AgentsBoard onClose={() => {}} />
    </div>
  )
})
