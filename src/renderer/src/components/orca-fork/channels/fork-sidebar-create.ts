// orca-fork: what "New …" in any sidebar menu creates. The Bots section owns the bot, group and
// channel dialogs and registers them here; categories and departments are made in place.
import { translate } from '@/i18n/i18n'
import type { BotGroup } from '../../../../../shared/bots/bot-group'
import { chatStructureEdits } from '../../../../../shared/orca-fork/channels/chat-structure'
import { botOrganizationEdits } from '../../../../../shared/orca-fork/organization/bot-organization'
import { createNonSecureContextUuid } from '../../../../../shared/identifiers/non-secure-context-uuid'
import { addBotDepartment } from '../organization/ForkBotOrganizationHeaderRow'
import { editBotOrganization, readBotOrganization } from '../organization/bot-organization-store'
import { forkWorkspacesStore } from '../workspaces/fork-workspaces-store'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'
import { editChatStructure } from './chat-structure-store'
import { requestCategoryRename } from './chat-category-rename'

export type ForkSidebarCreateKind = 'bot' | 'group' | 'channel' | 'category' | 'department'

export type ForkSidebarDialogs = {
  newBot: () => void
  /** No group: a new one. */
  editGroup: (group?: BotGroup) => void
  newChannel: (categoryId: string | null) => void
  /** A row opened its chat (the sidebar closes its board). */
  opened: () => void
}

let dialogs: ForkSidebarDialogs | null = null

export function forkSidebarDialogs(): ForkSidebarDialogs | null {
  return dialogs
}

export function registerForkSidebarDialogs(next: ForkSidebarDialogs): () => void {
  dialogs = next
  return () => {
    if (dialogs === next) {
      dialogs = null
    }
  }
}

function activeWorkspaceId(): string | null {
  return FORK_FEATURES.workspaces ? forkWorkspacesStore.get().activeWorkspaceId : null
}

/** A new category, named in place; with `channelKey`, that channel moves into it. */
export function createChatCategory(channelKey?: string, beforeId: string | null = null): void {
  const id = createNonSecureContextUuid()
  requestCategoryRename(id)
  editChatStructure((doc) => {
    const added = chatStructureEdits.addCategory(
      id,
      translate('orcaFork.chatStructure.newCategoryName', 'New category'),
      activeWorkspaceId(),
      beforeId
    )(doc)
    return channelKey ? chatStructureEdits.placeChannel(channelKey, id)(added) : added
  })
}

/** A new department, named in place; the Bots list switches to Departments to show it. */
export function createBotDepartment(): void {
  if (readBotOrganization().view.groupBy !== 'organization') {
    editBotOrganization(botOrganizationEdits.setGroupBy('organization'))
  }
  addBotDepartment(translate('orcaFork.botOrganization.newDepartmentName', 'New department'))
}

export function forkSidebarCreate(
  kind: ForkSidebarCreateKind,
  options: { categoryId?: string | null } = {}
): void {
  switch (kind) {
    case 'category':
      createChatCategory()
      return
    case 'department':
      createBotDepartment()
      return
    case 'bot':
      dialogs?.newBot()
      return
    case 'group':
      dialogs?.editGroup()
      return
    case 'channel':
      dialogs?.newChannel(options.categoryId ?? null)
  }
}
