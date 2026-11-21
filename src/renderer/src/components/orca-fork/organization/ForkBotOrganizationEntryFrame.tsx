// orca-fork: lets a bot row be dragged into a department or section, and take drops for its own.
import React, { useState } from 'react'
import { cn } from '@/lib/class-names'
import { useBotOrganization } from './bot-organization-store'
import {
  acceptsBotOrganizationDrag,
  dropBotOrganizationEntry,
  startBotOrganizationDrag
} from './bot-organization-drag'

export function ForkBotOrganizationEntryFrame({
  entryKey,
  children
}: {
  entryKey: string
  children: React.ReactNode
}): React.JSX.Element {
  const doc = useBotOrganization()
  const [dropping, setDropping] = useState(false)
  if (doc.view.groupBy !== 'organization') {
    return <>{children}</>
  }
  const placement = doc.placements[entryKey] ?? null
  return (
    <div
      draggable
      className={cn(placement?.sectionId && 'pl-4', dropping && 'rounded-md ring-1 ring-ring')}
      onDragStart={(event) => startBotOrganizationDrag(event, entryKey)}
      onDragOver={(event) => {
        if (acceptsBotOrganizationDrag(event)) {
          setDropping(true)
        }
      }}
      onDragLeave={() => setDropping(false)}
      onDrop={(event) => {
        setDropping(false)
        dropBotOrganizationEntry(event, placement)
      }}
    >
      {children}
    </div>
  )
}
