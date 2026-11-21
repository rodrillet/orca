// orca-fork: a workspace's photo, or its initials on a quiet square (agentes.chat's OrgMark).
import React from 'react'
import { cn } from '@/lib/class-names'
import type { ForkWorkspace } from '../../../../../shared/orca-fork/workspaces/fork-workspace'

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const letters =
    words.length > 1 ? `${words[0]![0]}${words[1]![0]}` : (words[0] ?? '?').slice(0, 2)
  return letters.toUpperCase()
}

export function ForkWorkspaceMark({
  workspace,
  size,
  className
}: {
  workspace: Pick<ForkWorkspace, 'name' | 'photo'>
  size: number
  className?: string
}): React.JSX.Element {
  const style = { width: size, height: size, fontSize: Math.max(9, Math.round(size * 0.38)) }
  if (workspace.photo) {
    return (
      <img
        src={workspace.photo}
        alt=""
        style={style}
        className={cn('shrink-0 rounded-md object-cover', className)}
      />
    )
  }
  return (
    <span
      aria-hidden="true"
      style={style}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-md font-semibold',
        'bg-foreground/10 text-foreground',
        className
      )}
    >
      {initials(workspace.name)}
    </span>
  )
}
