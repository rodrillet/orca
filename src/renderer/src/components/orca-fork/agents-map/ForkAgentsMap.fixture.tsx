import { defineFixture } from '../../../component-fixtures/component-fixture'
import { makeFolderWorkspace } from '@/store/folder-workspaces/folder-workspace.test-fixture'
import { publishBots } from '@/lib/bot-catalog-snapshot'
import type { Bot } from '../../../../../shared/bot-types'
import type { BotGroup, BotGroupMessage } from '../../../../../shared/bots/bot-group'
import { mascotAvatar } from '../../../../../shared/bot-avatar'
import { useBotGroups } from '@/lib/bot-group-list'
import { ForkAgentsMapHost } from './ForkAgentsMapDialog'
import { openAgentsMap } from './open-agents-map'

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
    createdAt: 1,
    updatedAt: 1
  }
}

const BOTS = [
  bot('lead', 'Lead', 'F1'),
  bot('writer', 'Writer', 'H1'),
  bot('ops', 'Ops', 'G1'),
  bot('research', 'Research', 'F1'),
  bot('closer', 'Closer', 'H1')
]

function group(id: string, name: string, botIds: string[]): BotGroup {
  return {
    id,
    name,
    hostId: 'local',
    revision: 1,
    folder: id,
    folderWorkspaceId: `fw-${id}`,
    createdAt: 1,
    members: botIds.map((botId) => ({ botId, sessionId: `${id}-${botId}` })),
    replyMode: { kind: 'mentions' }
  }
}

const GROUPS = [
  group('launch', 'launch-plan', ['lead', 'writer', 'research']),
  group('ops', 'incidents', ['ops', 'lead']),
  group('sales', 'Sales team', ['closer', 'writer'])
]

function message(
  groupId: string,
  sequence: number,
  author: string | null,
  text: string,
  agoMs: number,
  requester?: string
): BotGroupMessage {
  return {
    id: `${groupId}-${sequence}`,
    groupId,
    sequence,
    author: author ? { kind: 'bot', id: author, name: author } : { kind: 'owner' },
    text,
    createdAt: Date.now() - agoMs,
    ...(requester ? { requester: { id: requester, name: requester } } : {}),
    turns: []
  }
}

const MESSAGES: Record<string, BotGroupMessage[]> = {
  launch: [
    message('launch', 1, null, '@Lead plan the launch', 3_600_000),
    message(
      'launch',
      2,
      'lead',
      '@Research find three competitors, @Writer draft the post',
      600_000
    ),
    message('launch', 3, 'research', 'Found them', 30_000, 'lead'),
    message('launch', 4, 'writer', 'Draft is ready', 20_000, 'lead')
  ],
  ops: [message('ops', 1, 'ops', '@Lead disk at 91%', 7_200_000)],
  sales: [message('sales', 1, 'closer', '@Writer need a one-pager', 90_000)]
}

function Groups(): null {
  useBotGroups()
  return null
}

export const map = defineFixture({
  width: 1000,
  store: {
    folderWorkspaces: [...BOTS, ...GROUPS].map((each) =>
      makeFolderWorkspace({
        id: each.folderWorkspaceId,
        projectGroupId: 'bots',
        name: each.name,
        folderPath: `/home/me/.orca/bots/${each.id}`
      })
    )
  },
  setup: () => {
    publishBots(BOTS)
    Reflect.set(window.api, 'runtime', {
      ...(window.api.runtime as object),
      call: async ({ method, params }: { method: string; params?: { groupId?: string } }) => {
        const results: Record<string, unknown> = {
          'bots.list': { bots: BOTS },
          'bots.groups.list': { groups: GROUPS },
          'bots.groups.read': { messages: MESSAGES[params?.groupId ?? ''] ?? [] },
          'bots.upNext.unseen': { unseen: {} },
          'bots.chatTree': { chats: [], workspaceChats: {} }
        }
        return method in results
          ? { ok: true, result: results[method] }
          : { ok: false, error: { code: 'runtime_error', message: method } }
      }
    })
  },
  interact: async () => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    openAgentsMap()
    await new Promise((resolve) => setTimeout(resolve, 1200))
  },
  render: () => (
    <div className="h-[700px]">
      <Groups />
      <ForkAgentsMapHost />
    </div>
  )
})
