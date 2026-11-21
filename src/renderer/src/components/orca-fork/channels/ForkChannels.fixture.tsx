import { defineFixture } from '../../../component-fixtures/component-fixture'
import { makeFolderWorkspace } from '@/store/folder-workspaces/folder-workspace.test-fixture'
import { publishBots } from '@/lib/bot-catalog-snapshot'
import type { Bot } from '../../../../../shared/bot-types'
import type { BotGroup } from '../../../../../shared/bots/bot-group'
import { mascotAvatar } from '../../../../../shared/bot-avatar'
import {
  chatStructureEdits as edits,
  emptyChatStructure,
  type ChatStructure
} from '../../../../../shared/orca-fork/channels/chat-structure'
import { ConfirmationDialogProvider } from '../../dismiss/confirmation/confirmation-dialog'
import { SidebarBotsSection } from '../../bots/SidebarBotsSection'
import { editChatStructure } from './chat-structure-store'

function bot(
  id: string,
  name: string,
  order: number,
  mascot: Parameters<typeof mascotAvatar>[0]
): Bot {
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
    sidebarOrder: order,
    createdAt: 1,
    updatedAt: 1
  }
}

function group(id: string, name: string, botIds: string[], latest: string): BotGroup {
  return {
    id,
    name,
    hostId: 'local',
    revision: 1,
    folder: id,
    folderWorkspaceId: `fw-${id}`,
    createdAt: 1,
    members: botIds.map((botId) => ({ botId, sessionId: `${id}-${botId}` })),
    replyMode: { kind: 'mentions' },
    latest: { authorName: null, text: latest, at: Date.now() - 120_000 }
  }
}

const BOTS = [
  bot('closer', 'Closer', 0, 'F1'),
  bot('writer', 'Writer', 1, 'H1'),
  bot('ops', 'Ops', 2, 'G1')
]
const GROUPS = [
  group('launch', 'launch-plan', ['closer', 'writer'], 'Draft the announcement for Friday'),
  group('incidents', 'incidents', ['ops', 'writer'], 'Disk at 91% on the VPS'),
  group('ideas', 'ideas', ['closer', 'ops'], 'What if we bundle the plans?'),
  group('team', 'Sales team', ['closer', 'writer'], 'Status?')
]

function fixtureFor(
  structure: (doc: ChatStructure) => ChatStructure,
  interact?: (frame: HTMLElement) => Promise<void>
) {
  return defineFixture({
    width: 280,
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
      const results: Record<string, unknown> = {
        'bots.list': { bots: BOTS },
        'bots.groups.list': { groups: GROUPS },
        'bots.upNext.unseen': { unseen: {} },
        'bots.chatTree': { chats: [], workspaceChats: {} }
      }
      const runtime: unknown = window.api.runtime
      Reflect.set(window.api, 'runtime', {
        ...(typeof runtime === 'object' ? runtime : {}),
        call: async ({ method }: { method: string }) =>
          method in results
            ? { ok: true, result: results[method] }
            : { ok: false, error: { code: 'runtime_error', message: method } }
      })
      const doc = structure(emptyChatStructure())
      Reflect.set(window.api, 'orcaForkChatStructure', {
        read: async () => doc,
        write: async (next: ChatStructure) => next
      })
      editChatStructure(() => doc)
    },
    interact,
    render: () => (
      <ConfirmationDialogProvider>
        <div className="flex h-[520px] flex-col bg-sidebar py-2 text-sidebar-foreground">
          <SidebarBotsSection onOpenBot={() => {}} />
        </div>
      </ConfirmationDialogProvider>
    )
  })
}

const organized = (doc: ChatStructure): ChatStructure =>
  [
    edits.addCategory('product', 'Product', null),
    edits.addCategory('ops', 'Operations', null),
    edits.placeChannel('local/ideas', null),
    edits.placeChannel('local/launch', 'product'),
    edits.placeChannel('local/incidents', 'ops'),
    edits.setMuted('local/ideas', true)
  ].reduce((next, edit) => edit(next), doc)

export const channels = fixtureFor(organized)

/** Right click on a category: what agentes.chat's category menu offers. */
export const categoryMenu = fixtureFor(organized, async (frame) => {
  const until = Date.now() + 5000
  let header: Element | null = null
  while (!header && Date.now() < until) {
    await new Promise((resolve) => setTimeout(resolve, 50))
    header = frame.querySelector('[data-fork-chat-header^="fork-chat-category:"]')
  }
  const box = header?.getBoundingClientRect()
  header?.dispatchEvent(
    new MouseEvent('contextmenu', {
      bubbles: true,
      clientX: (box?.left ?? 0) + 60,
      clientY: (box?.top ?? 0) + 10
    })
  )
  await new Promise((resolve) => setTimeout(resolve, 300))
})
