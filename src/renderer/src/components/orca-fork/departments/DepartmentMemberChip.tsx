// orca-fork: a bot or bot group as a chip (photo with presence, name), draggable onto a department.
import React from 'react'
import { Users } from 'lucide-react'
import { BotAvatar } from '@/components/bots/BotAvatar'
import { openBotHomeTab } from '@/lib/bot-catalog'
import { openBotGroup } from '@/lib/bot-group-catalog'
import { cn } from '@/lib/class-names'
import { ForkGroupPicture } from '../group-photos/ForkGroupPicture'
import { startBotOrganizationDrag } from '../organization/bot-organization-drag'
import type { DepartmentMember } from './use-department-world'

export function DepartmentMemberFace({
  member,
  className
}: {
  member: DepartmentMember
  className?: string
}): React.JSX.Element {
  return member.kind === 'bot' ? (
    <BotAvatar bot={member.bot} className={cn('size-5 rounded-full text-[10px]', className)} />
  ) : (
    <ForkGroupPicture groupId={member.group.id} className={cn('size-5', className)}>
      <span
        className={cn(
          'inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground',
          className
        )}
      >
        <Users className="size-3" />
      </span>
    </ForkGroupPicture>
  )
}

export function openDepartmentMember(member: DepartmentMember): void {
  if (member.kind === 'bot') {
    void openBotHomeTab(member.bot)
  } else {
    void openBotGroup(member.group)
  }
}

export function DepartmentMemberChip({
  member,
  draggable = true
}: {
  member: DepartmentMember
  draggable?: boolean
}): React.JSX.Element {
  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={(event) => startBotOrganizationDrag(event, member.key)}
      onClick={(event) => {
        event.stopPropagation()
        openDepartmentMember(member)
      }}
      className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-background py-0.5 pr-2 pl-0.5 text-xs hover:bg-accent"
    >
      <DepartmentMemberFace member={member} />
      <span className="truncate">
        {member.kind === 'bot' ? member.bot.name : member.group.name}
      </span>
    </button>
  )
}
