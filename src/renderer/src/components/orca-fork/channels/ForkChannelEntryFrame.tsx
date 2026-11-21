// orca-fork: a channel's row in the Bots list: drags to reorder or into a category, dims when muted.
import React, { useState } from 'react'
import { cn } from '@/lib/class-names'
import { useChatStructure } from './chat-structure-store'
import {
  acceptChatDrag,
  dropChannel,
  endChatDrag,
  lowerHalf,
  startChatDrag
} from './chat-structure-drag'

export function ForkChannelEntryFrame({
  entryKey,
  categoryId,
  nextKey,
  children
}: {
  entryKey: string
  categoryId: string | null
  nextKey: string | null
  children: React.ReactNode
}): React.JSX.Element {
  const muted = useChatStructure().channels[entryKey]?.muted === true
  const [mark, setMark] = useState<'before' | 'after' | null>(null)
  return (
    <div
      draggable
      data-fork-channel={entryKey}
      className={cn(
        categoryId && 'pl-3',
        muted && 'opacity-55',
        mark === 'before' && 'shadow-[inset_0_2px_0_var(--ring)]',
        mark === 'after' && 'shadow-[inset_0_-2px_0_var(--ring)]'
      )}
      onDragStart={(event) => startChatDrag(event, { kind: 'channel', id: entryKey })}
      onDragEnd={() => {
        endChatDrag()
        setMark(null)
      }}
      onDragOver={(event) => {
        if (acceptChatDrag(event, ['channel'])) {
          setMark(lowerHalf(event) ? 'after' : 'before')
        }
      }}
      onDragLeave={() => setMark(null)}
      onDrop={(event) => {
        const at = mark
        setMark(null)
        if (at) {
          event.preventDefault()
          event.stopPropagation()
          dropChannel(categoryId, at === 'after' ? nextKey : entryKey)
        }
      }}
    >
      {children}
    </div>
  )
}
