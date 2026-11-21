// orca-fork: the groups as the sidebar last read them, from the snapshot alone (no read of its own).
import { useSyncExternalStore } from 'react'
import type { BotGroup } from '../../../../../shared/bots/bot-group'
import { readBotGroups, subscribeToBotGroupChanges } from '@/lib/bot-group-catalog-snapshot'

const NO_GROUPS: readonly BotGroup[] = []
const readNone = (): readonly BotGroup[] => NO_GROUPS
const subscribeToNothing = (): (() => void) => () => {}

export function useForkBotGroups(enabled = true): readonly BotGroup[] {
  const read = enabled ? readBotGroups : readNone
  return useSyncExternalStore(enabled ? subscribeToBotGroupChanges : subscribeToNothing, read, read)
}
