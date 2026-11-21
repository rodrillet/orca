// orca-fork: native drag & drop of a bot row onto a department, section or another placed bot.
import type React from 'react'
import {
  botOrganizationEdits,
  type BotOrganizationPlacement
} from '../../../../../shared/orca-fork/organization/bot-organization'
import { editBotOrganization } from './bot-organization-store'

const BOT_ORGANIZATION_DRAG_TYPE = 'application/x-orca-fork-bot-entry'

export function startBotOrganizationDrag(event: React.DragEvent, entryKey: string): void {
  event.dataTransfer.setData(BOT_ORGANIZATION_DRAG_TYPE, entryKey)
  event.dataTransfer.effectAllowed = 'move'
}

export function acceptsBotOrganizationDrag(event: React.DragEvent): boolean {
  if (!event.dataTransfer.types.includes(BOT_ORGANIZATION_DRAG_TYPE)) {
    return false
  }
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
  return true
}

/** null takes the dropped entry out of every department. */
export function dropBotOrganizationEntry(
  event: React.DragEvent,
  target: BotOrganizationPlacement | null
): void {
  const entryKey = event.dataTransfer.getData(BOT_ORGANIZATION_DRAG_TYPE)
  if (!entryKey) {
    return
  }
  event.preventDefault()
  editBotOrganization(botOrganizationEdits.place(entryKey, target))
}
