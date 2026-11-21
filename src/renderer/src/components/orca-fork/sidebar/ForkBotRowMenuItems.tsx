// orca-fork: the fork's entries in a bot row's right-click menu (Change photo…, New ▸), one mount
// so BotRow stays under its line limit.
import React from 'react'
import type { Bot } from '../../../../../shared/bot-types'
import { ForkChangePhotoMenuItem } from './ForkChangePhotoMenuItem'
import { ForkSidebarNewSubmenu } from '../channels/ForkChannelMenuItems'

export function ForkBotRowMenuItems({
  bot,
  offline
}: {
  bot: Bot
  offline: boolean
}): React.JSX.Element {
  return (
    <>
      <ForkChangePhotoMenuItem bot={bot} disabled={offline} />
      <ForkSidebarNewSubmenu />
    </>
  )
}
