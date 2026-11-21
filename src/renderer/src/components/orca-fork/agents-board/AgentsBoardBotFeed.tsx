// orca-fork: reads one bot's items and workers (the same shared reads as its Items tab) for the board.
import { useEffect, useMemo } from 'react'
import { useBotItems } from '@/components/bots/items/use-bot-items'
import { botSidebarEntryKey } from '@/components/bots/bot-sidebar-entry-keys'
import { useBotHostOffline } from '@/lib/bot-host-views'
import type { Bot } from '../../../../../shared/bot-types'
import { useBotWorkList } from '../agents-tasks/use-bot-work-list'
import { buildBotBoardCards, type AgentsBoardCard } from './agents-board-model'
import { useBotPresence, type BotPresence } from './use-bot-presence'

export type AgentsBoardBotReport = {
  cards: AgentsBoardCard[]
  presence: BotPresence
  loading: boolean
}

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
  const presence = useBotPresence(bot, needsYouItems)
  const cards = useMemo(
    () => buildBotBoardCards(botKey, read ?? [], work?.items ?? [], now),
    [botKey, read, work, now]
  )
  const loading = !offline && items.state === 'loading'
  const { status, label } = presence
  useEffect(() => {
    onReport(botKey, { cards, presence: { offline, status, label }, loading })
  }, [botKey, cards, offline, status, label, loading, onReport])
  useEffect(() => () => onReport(botKey, null), [botKey, onReport])
  return null
}
