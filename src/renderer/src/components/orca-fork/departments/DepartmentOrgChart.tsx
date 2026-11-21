// orca-fork: every department as a card (mark, mission, leader, bots), like agentes.chat's Setores; bots
// drag between cards, and a card opens its department.
import React, { useState } from 'react'
import { Crown, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import type { BotOrganizationPlacement } from '../../../../../shared/orca-fork/organization/bot-organization'
import { botSidebarEntryKey } from '../../bots/bot-sidebar-entry-keys'
import {
  acceptsBotOrganizationDrag,
  dropBotOrganizationEntry
} from '../organization/bot-organization-drag'
import { openDepartmentPage } from './department-page-state'
import { DepartmentMark } from './DepartmentMark'
import { DepartmentMemberChip } from './DepartmentMemberChip'
import type { DepartmentWorld } from './use-department-world'

function DropCard({
  target,
  className,
  children,
  onClick,
  label
}: {
  target: BotOrganizationPlacement | null
  className?: string
  children: React.ReactNode
  onClick?: () => void
  label: string
}): React.JSX.Element {
  const [over, setOver] = useState(false)
  return (
    <section
      aria-label={label}
      onDragOver={(event) => setOver(acceptsBotOrganizationDrag(event))}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        setOver(false)
        dropBotOrganizationEntry(event, target)
      }}
      onClick={onClick}
      className={cn(
        'flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-xs',
        onClick && 'cursor-pointer hover:border-ring/60',
        over && 'border-ring ring-1 ring-ring',
        className
      )}
    >
      {children}
    </section>
  )
}

export function DepartmentOrgChart({
  world,
  onCreate
}: {
  world: DepartmentWorld
  onCreate: () => void
}): React.JSX.Element {
  const t = useTranslate()
  const active = world.departments.filter((dept) => !dept.profile.archived)
  const botsByKey = new Map(world.bots.map((bot) => [botSidebarEntryKey(bot), bot]))
  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t('orcaFork.departments.orgChart', 'Org chart')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t(
              'orcaFork.departments.orgChartHint',
              'Each department with its leader and bots. Drag a bot onto a department to move it; open one to manage it.'
            )}
          </p>
        </div>
        <Button onClick={onCreate}>
          <Plus className="size-4" />
          {t('orcaFork.botOrganization.newDepartment', 'New department')}
        </Button>
      </header>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {active.map((dept) => {
          const members = world.membersOf(dept.id)
          const leader = dept.profile.leaderKey ? botsByKey.get(dept.profile.leaderKey) : undefined
          return (
            <DropCard
              key={dept.id}
              label={dept.name}
              target={{ departmentId: dept.id, sectionId: null }}
              onClick={() => openDepartmentPage(dept.id)}
            >
              <div className="flex min-w-0 items-center gap-3">
                <DepartmentMark profile={dept.profile} className="size-9" />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-base font-semibold">{dept.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {t('orcaFork.departments.memberCount', 'Members: {{count}}', {
                      count: members.length
                    })}
                    {dept.sections.length > 0
                      ? ` · ${t('orcaFork.departments.sectionCount', 'Sections: {{count}}', {
                          count: dept.sections.length
                        })}`
                      : ''}
                  </p>
                </div>
              </div>
              {dept.profile.description ? (
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {dept.profile.description}
                </p>
              ) : null}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Crown className="size-3.5" />
                {leader ? (
                  <span className="truncate text-foreground">{leader.name}</span>
                ) : (
                  <span>{t('orcaFork.departments.noLeader', 'No leader')}</span>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {members.length > 0 ? (
                  members.map((member) => <DepartmentMemberChip key={member.key} member={member} />)
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {t('orcaFork.departments.dropHere', 'Drag bots here')}
                  </span>
                )}
              </div>
            </DropCard>
          )
        })}
        <DropCard
          label={t('orcaFork.botOrganization.unassigned', 'No department')}
          target={null}
          className="border-dashed bg-transparent shadow-none"
        >
          <h2 className="text-base font-semibold">
            {t('orcaFork.botOrganization.unassigned', 'No department')}
          </h2>
          <div className="flex flex-wrap gap-1">
            {world.unplacedBots.length > 0 ? (
              world.unplacedBots.map((bot) => (
                <DepartmentMemberChip
                  key={bot.id + bot.hostId}
                  member={{ key: botSidebarEntryKey(bot), kind: 'bot', bot, sectionId: null }}
                />
              ))
            ) : (
              <span className="text-xs text-muted-foreground">
                {t('orcaFork.departments.allPlaced', 'Every bot is in a department.')}
              </span>
            )}
          </div>
        </DropCard>
      </div>
    </div>
  )
}
