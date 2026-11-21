// orca-fork: reads one bot's items and workers (the same shared reads as its Items tab) for the board.
import { useEffect, useMemo } from 'react'
import { useBotItems } from '@/components/bots/items/use-bot-items'
import { useBotActivity } from '@/components/bots/use-bot-activity'
import { botSidebarEntryKey } from '@/components/bots/bot-sidebar-entry-keys'
import { useBotHostOffline } from '@/lib/bot-host-views'
import type { Bot } from '../../../../../shared/bot-types'
import type { BotItem } from '../../../../../shared/bots/bot-items'
import { useBotWorkList } from '../agents-tasks/use-bot-work-list'
import {
  buildBotBoardCards,
  type AgentsBoardCard,
  type AgentsBoardWorkerRecords
} from './agents-board-model'
import { useBotPresence, type BotPresence } from './use-bot-presence'

export type AgentsBoardBotReport = {
  cards: AgentsBoardCard[]
  presence: BotPresence
  loading: boolean
  /** The read the item cards came from, for the detail drawer. */
  items: readonly BotItem[]
  records: AgentsBoardWorkerRecords
}

const NO_ITEMS: readonly BotItem[] = []

export function AgentsBoardBotFeed({
  bot,
  now,
  onReport
}: {
  bot: Bot
  /** The board's clock, which ages done cards off it. */
  now: number
  onReport: (botKey: string, report: AgentsBoardBotReport | null) => void
}): null {
  const botKey = botSidebarEntryKey(bot)
  const offline = useBotHostOffline(bot.hostId)
  const items = useBotItems(offline ? null : bot)
  const work = useBotWorkList(bot)
  const read = items.read?.items
  const needsYouItems = read?.filter((item) => item.status === 'needs_you').length ?? 0
  const { presence, label } = useBotPresence(bot, needsYouItems)
  // The workers' own records carry their result and when they settled.
  const activity = useBotActivity(offline ? null : bot)
  const records = useMemo((): AgentsBoardWorkerRecords => {
    const map = new Map()
    for (const row of [...activity.workers, ...activity.completed]) {
      if (row.kind === 'worker' && row.worker) {
        map.set(row.dispatchId, row.worker)
      }
    }
    return map
  }, [activity])
  const cards = useMemo(
    () => buildBotBoardCards(botKey, read ?? [], work?.items ?? [], now, records),
    [botKey, read, work, now, records]
  )
  const loading = !offline && items.state === 'loading'
  useEffect(() => {
    onReport(botKey, {
      cards,
      presence: { offline, presence, label },
      loading,
      items: read ?? NO_ITEMS,
      records
    })
  }, [botKey, cards, offline, presence, label, loading, read, records, onReport])
  useEffect(() => () => onReport(botKey, null), [botKey, onReport])
  return null
}
