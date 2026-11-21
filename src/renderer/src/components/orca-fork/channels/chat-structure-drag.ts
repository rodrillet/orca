// orca-fork: dragging a channel onto a channel (before/after it) or a header (into it), and a
// category header onto another (before/after it).
import type React from 'react'
import { chatStructureEdits } from '../../../../../shared/orca-fork/channels/chat-structure'
import { editChatStructure } from './chat-structure-store'

const CHANNEL_TYPE = 'application/x-orca-fork-channel'
const CATEGORY_TYPE = 'application/x-orca-fork-category'

type Dragging = { kind: 'channel' | 'category'; id: string }
let dragging: Dragging | null = null

export function startChatDrag(event: React.DragEvent, what: Dragging): void {
  dragging = what
  event.stopPropagation()
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData(what.kind === 'channel' ? CHANNEL_TYPE : CATEGORY_TYPE, what.id)
}

export function endChatDrag(): void {
  dragging = null
}

export function draggingChat(): Dragging | null {
  return dragging
}

/** Lets this drop target take the drag; false leaves the event to other targets. */
export function acceptChatDrag(
  event: React.DragEvent,
  kinds: readonly Dragging['kind'][]
): boolean {
  if (!dragging || !kinds.includes(dragging.kind)) {
    return false
  }
  event.preventDefault()
  event.stopPropagation()
  event.dataTransfer.dropEffect = 'move'
  return true
}

export function lowerHalf(event: React.DragEvent): boolean {
  const rect = event.currentTarget.getBoundingClientRect()
  return event.clientY > rect.top + rect.height / 2
}

/** A channel dropped into a category (null: none), before `beforeKey` or at the end. */
export function dropChannel(categoryId: string | null, beforeKey: string | null): void {
  const d = dragging
  dragging = null
  if (d?.kind === 'channel' && d.id !== beforeKey) {
    editChatStructure(chatStructureEdits.placeChannel(d.id, categoryId, beforeKey))
  }
}

export function dropCategory(beforeId: string | null): void {
  const d = dragging
  dragging = null
  if (d?.kind === 'category' && d.id !== beforeId) {
    editChatStructure(chatStructureEdits.moveCategory(d.id, beforeId))
  }
}
