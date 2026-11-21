// orca-fork: a bot's workers (dispatches) with their PRs and CI, read from the host that runs it.
import { createBotHostRead, useBotHostRead } from '@/components/bots/use-bot-host-read'
import type { Bot } from '../../../../../shared/bot-types'
import type { BotWorkListResult } from '../../../../../shared/bots/bot-work-list'

const WORK_LIST_MIN_READ_GAP_MS = 2000

export const botWorkListRead = createBotHostRead<BotWorkListResult>(
  'bots.work.list',
  (result: BotWorkListResult) => result,
  'Failed to read bot work:',
  ['workers', 'items'],
  WORK_LIST_MIN_READ_GAP_MS,
  true
)

export function useBotWorkList(bot: Bot): BotWorkListResult | null {
  return useBotHostRead(botWorkListRead, bot)
}
