// orca-fork: a department's group chat, a bot group made on first open and kept to its bots, like the
// teams' rooms. A group lives on one machine, so it holds the department's bots on the machine most of
// them run on; a bot elsewhere joins once it is moved there.
import { callBotRpc } from '@/lib/bot-hosts'
import { openBotGroup } from '@/lib/bot-group-catalog'
import { refreshBotHostGroups } from '@/lib/bot-group-list'
import { readBotGroups } from '@/lib/bot-group-catalog-snapshot'
import { translate } from '@/i18n/i18n'
import type { Bot } from '../../../../../shared/bot-types'
import type { BotGroup } from '../../../../../shared/bots/bot-group'
import type { BotOrganization } from '../../../../../shared/orca-fork/organization/bot-organization'
import {
  departmentEdits,
  departmentProfileOf
} from '../../../../../shared/orca-fork/departments/department-edits'
import { botOrganizationEdits } from '../../../../../shared/orca-fork/organization/bot-organization'
import { botSidebarEntryKey } from '../../bots/bot-sidebar-entry-keys'
import { editBotOrganization, readBotOrganization } from '../organization/bot-organization-store'

const MAX_GROUP_MEMBERS = 32

export function departmentRoomOf(
  doc: BotOrganization,
  departmentId: string,
  groups: readonly BotGroup[]
): BotGroup | null {
  const key = departmentProfileOf(doc, departmentId).roomKey
  return key ? (groups.find((group) => botSidebarEntryKey(group) === key) ?? null) : null
}

function busiestHost(bots: readonly Bot[]): Bot['hostId'] | null {
  const counts = new Map<Bot['hostId'], number>()
  for (const bot of bots) {
    counts.set(bot.hostId, (counts.get(bot.hostId) ?? 0) + 1)
  }
  let best: Bot['hostId'] | null = null
  for (const [hostId, count] of counts) {
    if (best === null || count > (counts.get(best) ?? 0)) {
      best = hostId
    }
  }
  return best
}

/** Opens the department's group chat, making it (or bringing its members in line) first. */
export async function openDepartmentRoom(
  departmentId: string,
  members: readonly Bot[]
): Promise<void> {
  const doc = readBotOrganization()
  const dept = doc.departments.find((d) => d.id === departmentId)
  if (!dept) {
    return
  }
  const existing = departmentRoomOf(doc, departmentId, readBotGroups())
  const hostId = existing?.hostId ?? busiestHost(members)
  const botIds = members
    .filter((bot) => bot.hostId === hostId)
    .map((bot) => bot.id)
    .slice(0, MAX_GROUP_MEMBERS)
  if (!hostId || botIds.length === 0) {
    throw new Error(
      existing
        ? translate('orcaFork.departments.roomEmpty', 'The department has no bots on that machine.')
        : translate('orcaFork.departments.roomNeedsBots', 'Add a bot to the department first.')
    )
  }
  if (existing) {
    const same =
      existing.members.length === botIds.length &&
      existing.members.every((member) => botIds.includes(member.botId))
    let group = existing
    if (!same || existing.name !== dept.name) {
      ;({ group } = await callBotRpc<{ group: BotGroup }>(existing, 'bots.groups.update', {
        groupId: existing.id,
        revision: existing.revision,
        name: dept.name,
        botIds
      }))
      await refreshBotHostGroups(existing.hostId)
    }
    await openBotGroup(group)
    return
  }
  const { group } = await callBotRpc<{ group: BotGroup }>({ hostId }, 'bots.groups.create', {
    name: dept.name,
    botIds
  })
  await refreshBotHostGroups(hostId)
  const groupKey = botSidebarEntryKey(group)
  editBotOrganization((current) =>
    botOrganizationEdits.place(groupKey, { departmentId, sectionId: null })(
      departmentEdits.setProfile(departmentId, { roomKey: groupKey })(current)
    )
  )
  await openBotGroup(group)
}
