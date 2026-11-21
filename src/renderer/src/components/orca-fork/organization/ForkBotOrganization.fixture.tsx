import { defineFixture } from '../../../component-fixtures/component-fixture'
import { stubBots } from '../../../component-fixtures/fixture-bots'
import { makeFolderWorkspace } from '@/store/folder-workspaces/folder-workspace.test-fixture'
import type { Bot } from '../../../../../shared/bot-types'
import { mascotAvatar } from '../../../../../shared/bot-avatar'
import {
  botOrganizationEdits as edits,
  emptyBotOrganization,
  type BotOrganization
} from '../../../../../shared/orca-fork/organization/bot-organization'
import { ConfirmationDialogProvider } from '../../dismiss/confirmation/confirmation-dialog'
import { SidebarBotsSection } from '../../bots/SidebarBotsSection'
import { editBotOrganization } from './bot-organization-store'

function bot(
  id: string,
  name: string,
  sidebarOrder: number,
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
    sidebarOrder,
    createdAt: 1,
    updatedAt: 1
  }
}

const BOTS = [
  bot('closer', 'Closer', 0, 'F1'),
  bot('prospector', 'Prospector', 1, 'G1'),
  bot('writer', 'Writer', 2, 'H1')
]

function fixtureFor(organize: (doc: BotOrganization) => BotOrganization) {
  return defineFixture({
    width: 260,
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
      Reflect.set(window.api, 'orcaForkBotOrganization', {
        read: async () => organize(emptyBotOrganization()),
        write: async (doc: BotOrganization) => doc
      })
      editBotOrganization(() => organize(emptyBotOrganization()))
    },
    render: () => (
      <ConfirmationDialogProvider>
        <div className="flex flex-col bg-sidebar py-2 text-sidebar-foreground">
          <SidebarBotsSection onOpenBot={() => {}} />
        </div>
      </ConfirmationDialogProvider>
    )
  })
}

export const departments = fixtureFor((doc) =>
  [
    edits.addDepartment('sales', 'Sales'),
    edits.addSection('sales', 'leads', 'Leads'),
    edits.place('local/closer', { departmentId: 'sales', sectionId: null }),
    edits.place('local/prospector', { departmentId: 'sales', sectionId: 'leads' }),
    edits.setGroupBy('organization')
  ].reduce((next, edit) => edit(next), doc)
)

export const machine = fixtureFor((doc) => edits.setGroupBy('machine')(doc))
