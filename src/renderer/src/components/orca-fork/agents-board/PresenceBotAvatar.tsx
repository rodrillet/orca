// orca-fork: a bot's picture with the presence the Agents views computed (items waiting on the owner and
// workers count there), instead of the sidebar's own dot.
import React from 'react'
import { BotAvatarTile } from '@/components/bots/BotAvatar'
import { useBotAvatarSrc } from '@/components/bots/bot-avatar-image'
import type { Bot } from '../../../../../shared/bot-types'
import { botFallback } from '../../../../../shared/bots/bot-avatar-fallback'
import type { BotPresence } from '../../../../../shared/orca-fork/presence/bot-presence'
import { PresenceDot } from '../presence/ForkBotPresenceDot'

export function PresenceBotAvatar({
  bot,
  presence,
  className
}: {
  bot: Bot
  presence: BotPresence | null
  className?: string
}): React.JSX.Element {
  return (
    <BotAvatarTile
      src={useBotAvatarSrc(bot)}
      fallback={botFallback(bot)}
      className={className}
      overlay={presence ? <PresenceDot presence={presence} /> : undefined}
    />
  )
}
