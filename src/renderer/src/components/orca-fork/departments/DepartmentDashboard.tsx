// orca-fork: what a department's bots are doing: one Agents card per bot (now line, open items, workers
// and their PRs), its sections as filters, and its group chat.
import React, { useMemo, useState } from 'react'
import { isHome, useBotHomeWorkspaces } from '@/lib/bot-catalog'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import type { BotGroup } from '../../../../../shared/bots/bot-group'
import { AgentTaskCard } from '../agents-tasks/AgentTaskCard'
import { useHostLabels } from '../agents-board/agents-board-facets'
import { departmentRoomOf } from './department-room'
import { openDepartmentMember } from './DepartmentMemberChip'
import { DepartmentUsagePanel } from './DepartmentUsagePanel'
import type { DepartmentWorld } from './use-department-world'

type Dept = DepartmentWorld['departments'][number]

const NO_GROUPS: readonly BotGroup[] = []
const ALL = '__all__'

export function DepartmentDashboard({
  dept,
  world
}: {
  dept: Dept
  world: DepartmentWorld
}): React.JSX.Element {
  const t = useTranslate()
  const [section, setSection] = useState<string>(ALL)
  const members = world.membersOf(dept.id)
  const bots = useMemo(
    () =>
      members
        .filter((member) => section === ALL || (member.sectionId ?? '') === section)
        .flatMap((member) => (member.kind === 'bot' ? [member.bot] : [])),
    [members, section]
  )
  const homes = useBotHomeWorkspaces(bots, NO_GROUPS)
  const hostIds = useMemo(() => [...new Set(bots.map((bot) => bot.hostId))], [bots])
  const hostLabels = useHostLabels(hostIds)
  const room = departmentRoomOf(world.doc, dept.id, world.groups)
  const groups = members.filter((member) => member.kind === 'group')
  const chips = [
    { id: ALL, label: t('orcaFork.departments.allSections', 'All') },
    { id: '', label: t('orcaFork.departments.directly', 'Directly in the department') },
    ...dept.sections.map((s) => ({ id: s.id, label: s.name }))
  ]

  return (
    <div className="flex flex-col gap-4">
      {dept.sections.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              aria-pressed={section === chip.id}
              onClick={() => setSection(chip.id)}
              className={cn(
                'rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground',
                section === chip.id && 'bg-accent text-foreground'
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      ) : null}
      {groups.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">
            {t('orcaFork.departments.chats', 'Group chats')}:
          </span>
          {groups.map((member) => (
            <button
              key={member.key}
              type="button"
              onClick={() => openDepartmentMember(member)}
              className="rounded-md border border-border px-2 py-0.5 hover:bg-accent"
            >
              {member.kind === 'group' ? member.group.name : null}
              {member.kind === 'group' && member.group.id === room?.id
                ? ` · ${t('orcaFork.departments.roomTag', 'department chat')}`
                : ''}
            </button>
          ))}
        </div>
      ) : null}
      {bots.length > 0 ? <DepartmentUsagePanel bots={bots} /> : null}
      {bots.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
          {t('orcaFork.departments.noBots', 'No bots in this department yet.')}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {bots.map((bot) => (
            <AgentTaskCard
              key={`${bot.hostId}/${bot.id}`}
              bot={bot}
              hostLabel={hostLabels[bot.hostId] ?? bot.hostId}
              home={homes.find((home) => isHome(home, [bot])) ?? null}
            />
          ))}
        </div>
      )}
    </div>
  )
}
